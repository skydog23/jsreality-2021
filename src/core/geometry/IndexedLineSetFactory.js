/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Factory class for creating and updating IndexedLineSets.
 * 
 * Extends PointSetFactory to add edge (line) management.
 * 
 * Example usage:
 * ```javascript
 * const factory = new IndexedLineSetFactory();
 * factory.setVertexCount(4);
 * factory.setVertexCoordinates([[0,0,0], [1,0,0], [1,1,0], [0,1,0]]);
 * factory.setEdgeCount(4);
 * factory.setEdgeIndices([[0,1], [1,2], [2,3], [3,0]]);
 * factory.update();
 * const lineSet = factory.getIndexedLineSet();
 * ```
 */

import { PointSetFactory } from './PointSetFactory.js';
import { IndexedLineSet } from '../scene/IndexedLineSet.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { DataList } from '../scene/data/DataList.js';
import { RegularDataList } from '../scene/data/RegularDataList.js';
import { VariableDataList } from '../scene/data/VariableDataList.js';
import { toDataList } from '../scene/data/DataUtility.js';
import { EUCLIDEAN } from '../math/Pn.js';

export class IndexedLineSetFactory extends PointSetFactory {
    
    #indexedLineSet;
    #edgeCount = 0;
    #generateEdgeLabels = false;
    #pendingEdgeAttributes = new Map(); // Store edge attributes to be applied during update()
    
    /**
     * Create a new IndexedLineSetFactory.
     * @param {IndexedLineSet} [existingLineSet] - Optional existing IndexedLineSet to modify
     * @param {number} [metric=EUCLIDEAN] - Metric for the geometry
     */
    constructor(existingLineSet = null, metric = EUCLIDEAN) {
        // Pass IndexedLineSet to parent constructor (IndexedLineSet extends PointSet)
        const lineSet = existingLineSet || new IndexedLineSet();
        super(lineSet, metric);
        this.#indexedLineSet = lineSet;
    }
    
    // ============================================================================
    // Public API - Getters
    // ============================================================================
    
    /**
     * Get the IndexedLineSet being constructed.
     * @returns {IndexedLineSet}
     */
    getIndexedLineSet() {
        return this.#indexedLineSet;
    }
    
    /**
     * Override to return IndexedLineSet instead of PointSet.
     * @returns {IndexedLineSet}
     */
    getPointSet() {
        return this.#indexedLineSet;
    }
    
    /**
     * Protected getter for the geometry (overrides parent).
     * @protected
     * @returns {IndexedLineSet}
     */
    _getGeometry() {
        return this.#indexedLineSet;
    }
    
    /**
     * Get the current edge count.
     * @returns {number}
     */
    getEdgeCount() {
        return this.#edgeCount;
    }
    
    /**
     * Protected accessor for edge count (for subclasses).
     * @protected
     * @returns {number}
     */
    _getEdgeCount() {
        return this.#edgeCount;
    }
    
    /**
     * Protected setter for edge count (for subclasses).
     * @protected
     * @param {number} count - Edge count
     */
    _setEdgeCount(count) {
        this.#edgeCount = count;
    }
    
    /**
     * Protected accessor for pending edge attributes (for subclasses).
     * @protected
     * @returns {Map}
     */
    _getPendingEdgeAttributes() {
        return this.#pendingEdgeAttributes;
    }
    
    /**
     * Protected accessor for generateEdgeLabels flag (for subclasses).
     * @protected
     * @returns {boolean}
     */
    _isGenerateEdgeLabels() {
        return this.#generateEdgeLabels;
    }
    
    /**
     * Check if edge labels are being auto-generated.
     * @returns {boolean}
     */
    isGenerateEdgeLabels() {
        return this.#generateEdgeLabels;
    }
    
    // ============================================================================
    // Public API - Configuration
    // ============================================================================
    
    /**
     * Set the number of edges.
     * @param {number} count - Number of edges
     */
    setEdgeCount(count) {
        if (count < 0) {
            throw new Error('Edge count must be non-negative');
        }
        this.#edgeCount = count;
        // Use parent's dirty tracking
        this._getDirty().add('edgeCount');
    }
    
    /**
     * Enable/disable automatic generation of edge labels.
     * @param {boolean} generate - Whether to generate labels
     */
    setGenerateEdgeLabels(generate) {
        this.#generateEdgeLabels = generate;
        this._getDirty().add('edgeLabels');
    }
    
    // ============================================================================
    // Public API - Edge Indices
    // ============================================================================
    
    /**
     * Set edge indices. Accepts multiple formats:
     * - DataList (RegularDataList or VariableDataList) - must be INT32 type
     * - 2D array: [[v0,v1], [v2,v3,v4], ...] (variable length polylines) → VariableDataList
     * - Flat array with fixed pointsPerEdge: [v0,v1, v2,v3, ...] → RegularDataList
     * 
     * Edge indices are stored as INT32 and can be variable-length (VariableDataList) for polylines.
     * 
     * @param {DataList|number[]|number[][]} data - Edge index data
     * @param {number} [pointsPerEdge=null] - Points per edge for flat arrays (e.g., 2 for segments)
     */
    setEdgeIndices(data, pointsPerEdge = null) {
        if (data === null || data === undefined) {
            // Handle null/undefined - set directly (not stored in pending attributes)
            this.#indexedLineSet.setEdgeIndices(null);
            return;
        }
        
        let dataList;
        
        // If it's already a DataList (RegularDataList or VariableDataList), use it directly
        // Note: We assume it's already INT32 - if not, the user should convert it
        if (data instanceof DataList) {
            dataList = data;
        } else {
            // Convert array to DataList using toDataList with INT32 type
            // toDataList automatically detects variable-length arrays and creates VariableDataList
            // For flat arrays, pointsPerEdge is used as fiberLength
            dataList = toDataList(data, pointsPerEdge, 'int32');
        }
        
        // Store for later application during update() (after setNumEdges clears attributes)
        this.#pendingEdgeAttributes.set(GeometryAttribute.INDICES, dataList);
    }
    
    // ============================================================================
    // Public API - Edge Colors
    // ============================================================================
    
    /**
     * Set edge colors. Accepts multiple formats:
     * - DataList
     * - Flat array: [r0,g0,b0,a0, r1,g1,b1,a1, ...]
     * - 2D array: [[r0,g0,b0,a0], [r1,g1,b1,a1], ...]
     * - Array of {r,g,b,a} objects
     * 
     * @param {DataList|number[]|number[][]|Object[]} data - Color data
     * @param {number} [fiberLength=null] - Components per color (3 or 4), auto-detected if null
     */
    setEdgeColors(data, fiberLength = null) {
        // Handle color objects {r,g,b,a}
        if (Array.isArray(data) && data.length > 0 && 
            typeof data[0] === 'object' && data[0] !== null && 
            'r' in data[0]) {
            data = data.map(c => [c.r, c.g, c.b, c.a ?? 1.0]);
        }
        this._setEdgeAttribute(GeometryAttribute.COLORS, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Edge Normals
    // ============================================================================
    
    /**
     * Set edge normals.
     * @param {DataList|number[]|number[][]} data - Normal data
     * @param {number} [fiberLength=null] - Components per normal (3 or 4), auto-detected if null
     */
    setEdgeNormals(data, fiberLength = null) {
        this._setEdgeAttribute(GeometryAttribute.NORMALS, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Edge Labels
    // ============================================================================
    
    /**
     * Set edge labels.
     * @param {string[]} labels - Array of label strings
     */
    setEdgeLabels(labels) {
        if (!Array.isArray(labels)) {
            throw new Error('Labels must be an array of strings');
        }
        if (labels.length !== this.#edgeCount) {
            throw new Error(`Label array length (${labels.length}) must match edge count (${this.#edgeCount})`);
        }
        this._setEdgeAttributeRaw(GeometryAttribute.LABELS, labels);
    }
    
    // ============================================================================
    // Public API - Edge Relative Radii
    // ============================================================================
    
    /**
     * Set relative radii for edges (for tube rendering).
     * @param {number[]} radii - Array of radius values
     */
    setEdgeRelativeRadii(radii) {
        if (!Array.isArray(radii)) {
            throw new Error('Radii must be an array of numbers');
        }
        if (radii.length !== this.#edgeCount) {
            throw new Error(`Radii array length (${radii.length}) must match edge count (${this.#edgeCount})`);
        }
        this._setEdgeAttributeRaw(GeometryAttribute.RELATIVE_RADII, radii);
    }
    
    // ============================================================================
    // Public API - Generic Edge Attributes
    // ============================================================================
    
    /**
     * Set a generic edge attribute.
     * @param {string} attribute - Attribute name (use GeometryAttribute constants)
     * @param {DataList|number[]|number[][]} data - Attribute data
     * @param {number} [fiberLength=null] - Components per edge, auto-detected if null
     */
    setEdgeAttribute(attribute, data, fiberLength = null) {
        this._setEdgeAttribute(attribute, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Update
    // ============================================================================
    
    /**
     * Apply all pending changes to the IndexedLineSet.
     * This method should be called after setting all desired attributes.
     */
    update() {
        // Call parent update() to handle vertex attributes
        super.update();
        
        // Update edge count FIRST (this clears all edge attributes)
        if (this._getDirty().has('edgeCount')) {
            this.#indexedLineSet.setNumEdges(this.#edgeCount);
            this._getDirty().delete('edgeCount');
        } else {
            // If edge count wasn't explicitly set, infer it from pending edge attributes
            // Validate that all edge attributes have consistent counts
            let inferredCount = null;
            const inconsistentAttributes = [];
            
            for (const [attribute, dataList] of this.#pendingEdgeAttributes.entries()) {
                if (!dataList) continue;
                
                let count = 0;
                if (dataList instanceof VariableDataList) {
                    count = dataList.length();
                } else if (dataList instanceof RegularDataList && dataList.shape.length >= 1) {
                    count = dataList.shape[0];
                }
                
                if (count > 0) {
                    if (inferredCount === null) {
                        inferredCount = count;
                    } else if (count !== inferredCount) {
                        inconsistentAttributes.push(`${attribute}: ${count} entries`);
                    }
                }
            }
            
            if (inconsistentAttributes.length > 0) {
                throw new Error(
                    `Inconsistent edge attribute counts: expected ${inferredCount} edges, but found ` +
                    inconsistentAttributes.join(', ')
                );
            }
            
            if (inferredCount !== null && inferredCount > 0) {
                this.#edgeCount = inferredCount;
                this.#indexedLineSet.setNumEdges(inferredCount);
            }
        }
        
        // Apply all pending edge attributes (after edge count is set)
        for (const [attribute, dataList] of this.#pendingEdgeAttributes.entries()) {
            this.#indexedLineSet.setEdgeAttribute(attribute, dataList);
        }
        this.#pendingEdgeAttributes.clear();
        
        // Generate edge labels if requested
        if (this.#generateEdgeLabels && this._getDirty().has('edgeLabels')) {
            const labels = this._generateIndexLabels(this.#edgeCount);
            this.#indexedLineSet.setEdgeAttribute(GeometryAttribute.LABELS, labels);
            this._getDirty().delete('edgeLabels');
        }
    }
    
    // ============================================================================
    // Protected/Internal Methods
    // ============================================================================
    
    /**
     * Set an edge attribute, handling multiple input formats.
     * Stores the attribute to be applied during update() to avoid clearing by setNumEdges().
     * 
     * If fiberLength is null, toDataList() will automatically detect it from the data structure.
     * 
     * @private
     */
    _setEdgeAttribute(attribute, data, fiberLength = null, dataType = 'float64') {
        const dataList = toDataList(data, fiberLength, dataType);
        // Store for later application during update() (after setNumEdges clears attributes)
        this.#pendingEdgeAttributes.set(attribute, dataList);
    }
    
    /**
     * Set an edge attribute directly (for string arrays, etc.).
     * @private
     */
    _setEdgeAttributeRaw(attribute, data) {
        this.#indexedLineSet.setEdgeAttribute(attribute, data);
    }
    
}
