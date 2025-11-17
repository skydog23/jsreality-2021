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

import { IndexedLineSet } from '../scene/IndexedLineSet.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { DataList } from '../scene/data/DataList.js';
import { VariableDataList } from '../scene/data/VariableDataList.js';
import { createVertexList, createPolylineList } from './GeometryUtility.js';
import { EUCLIDEAN } from '../math/Pn.js';

export class IndexedLineSetFactory {
    
    #indexedLineSet;
    #vertexCount = 0;
    #edgeCount = 0;
    #metric = EUCLIDEAN;
    #generateVertexLabels = false;
    #generateEdgeLabels = false;
    #dirty = new Set();
    
    /**
     * Create a new IndexedLineSetFactory.
     * @param {IndexedLineSet} [existingLineSet] - Optional existing IndexedLineSet to modify
     * @param {number} [metric=EUCLIDEAN] - Metric for the geometry
     */
    constructor(existingLineSet = null, metric = EUCLIDEAN) {
        this.#indexedLineSet = existingLineSet || new IndexedLineSet();
        this.#metric = metric;
        this.#indexedLineSet.setGeometryAttribute('metric', metric);
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
     * Get the current vertex count.
     * @returns {number}
     */
    getVertexCount() {
        return this.#vertexCount;
    }
    
    /**
     * Get the current edge count.
     * @returns {number}
     */
    getEdgeCount() {
        return this.#edgeCount;
    }
    
    /**
     * Get the current metric.
     * @returns {number}
     */
    getMetric() {
        return this.#metric;
    }
    
    /**
     * Check if vertex labels are being auto-generated.
     * @returns {boolean}
     */
    isGenerateVertexLabels() {
        return this.#generateVertexLabels;
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
     * Set the number of vertices.
     * @param {number} count - Number of vertices
     */
    setVertexCount(count) {
        if (count < 0) {
            throw new Error('Vertex count must be non-negative');
        }
        this.#vertexCount = count;
        this.#dirty.add('vertexCount');
    }
    
    /**
     * Set the number of edges.
     * @param {number} count - Number of edges
     */
    setEdgeCount(count) {
        if (count < 0) {
            throw new Error('Edge count must be non-negative');
        }
        this.#edgeCount = count;
        this.#dirty.add('edgeCount');
    }
    
    /**
     * Set the metric for the geometry.
     * @param {number} metric - Metric constant (EUCLIDEAN, HYPERBOLIC, etc.)
     */
    setMetric(metric) {
        this.#metric = metric;
        this.#dirty.add('metric');
    }
    
    /**
     * Enable/disable automatic generation of vertex labels.
     * @param {boolean} generate - Whether to generate labels
     */
    setGenerateVertexLabels(generate) {
        this.#generateVertexLabels = generate;
        this.#dirty.add('vertexLabels');
    }
    
    /**
     * Enable/disable automatic generation of edge labels.
     * @param {boolean} generate - Whether to generate labels
     */
    setGenerateEdgeLabels(generate) {
        this.#generateEdgeLabels = generate;
        this.#dirty.add('edgeLabels');
    }
    
    // ============================================================================
    // Public API - Vertex Attributes (same as PointSetFactory)
    // ============================================================================
    
    setVertexCoordinates(data, fiberLength = null) {
        this._setVertexAttribute(GeometryAttribute.COORDINATES, data, fiberLength);
    }
    
    setVertexNormals(data, fiberLength = null) {
        this._setVertexAttribute(GeometryAttribute.NORMALS, data, fiberLength);
    }
    
    setVertexColors(data, fiberLength = null) {
        // Handle color objects {r,g,b,a}
        if (Array.isArray(data) && data.length > 0 && 
            typeof data[0] === 'object' && data[0] !== null && 
            'r' in data[0]) {
            data = data.map(c => [c.r, c.g, c.b, c.a ?? 1.0]);
        }
        this._setVertexAttribute(GeometryAttribute.COLORS, data, fiberLength);
    }
    
    setVertexTextureCoordinates(data, fiberLength = null) {
        this._setVertexAttribute(GeometryAttribute.TEXTURE_COORDINATES, data, fiberLength);
    }
    
    setVertexLabels(labels) {
        if (!Array.isArray(labels)) {
            throw new Error('Labels must be an array of strings');
        }
        if (labels.length !== this.#vertexCount) {
            throw new Error(`Label array length (${labels.length}) must match vertex count (${this.#vertexCount})`);
        }
        this._setVertexAttributeRaw(GeometryAttribute.LABELS, labels);
    }
    
    setVertexRelativeRadii(radii) {
        if (!Array.isArray(radii)) {
            throw new Error('Radii must be an array of numbers');
        }
        if (radii.length !== this.#vertexCount) {
            throw new Error(`Radii array length (${radii.length}) must match vertex count (${this.#vertexCount})`);
        }
        this._setVertexAttributeRaw(GeometryAttribute.RELATIVE_RADII, radii);
    }
    
    setVertexAttribute(attribute, data, fiberLength = null) {
        this._setVertexAttribute(attribute, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Edge Indices
    // ============================================================================
    
    /**
     * Set edge indices. Accepts multiple formats:
     * - DataList or VariableDataList
     * - 2D array: [[v0,v1], [v2,v3,v4], ...] (variable length polylines)
     * - Flat array with fixed pointsPerEdge: [v0,v1, v2,v3, ...] (e.g., pointsPerEdge=2 for line segments)
     * 
     * @param {DataList|VariableDataList|number[]|number[][]} data - Edge index data
     * @param {number} [pointsPerEdge=null] - Points per edge for flat arrays (e.g., 2 for segments)
     */
    setEdgeIndices(data, pointsPerEdge = null) {
        if (data === null || data === undefined) {
            this.#indexedLineSet.setEdgeIndices(null);
            return;
        }
        
        // If it's already a DataList or VariableDataList, use it directly
        if (data instanceof DataList || data instanceof VariableDataList) {
            this.#indexedLineSet.setEdgeIndices(data);
            return;
        }
        
        if (Array.isArray(data)) {
            const is2D = Array.isArray(data[0]);
            
            if (is2D) {
                // 2D array: [[v0,v1], [v2,v3,v4], ...]
                // Use VariableDataList for polylines
                const polylines = createPolylineList(data);
                this.#indexedLineSet.setEdgeIndices(polylines);
            } else if (pointsPerEdge !== null) {
                // Flat array with fixed points per edge: [v0,v1, v2,v3, ...]
                if (data.length % pointsPerEdge !== 0) {
                    throw new Error(`Edge indices length (${data.length}) must be divisible by pointsPerEdge (${pointsPerEdge})`);
                }
                const numEdges = data.length / pointsPerEdge;
                const dataList = new DataList(data, [numEdges, pointsPerEdge], 'int32');
                this.#indexedLineSet.setEdgeIndices(dataList);
            } else {
                throw new Error('For flat arrays, pointsPerEdge must be specified');
            }
        } else {
            throw new Error('Data must be a DataList, VariableDataList, array, or 2D array');
        }
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
        // Update vertex count if changed
        if (this.#dirty.has('vertexCount')) {
            this.#indexedLineSet.setNumPoints(this.#vertexCount);
            this.#dirty.delete('vertexCount');
        }
        
        // Update edge count if changed
        if (this.#dirty.has('edgeCount')) {
            this.#indexedLineSet.setNumEdges(this.#edgeCount);
            this.#dirty.delete('edgeCount');
        }
        
        // Update metric if changed
        if (this.#dirty.has('metric')) {
            this.#indexedLineSet.setGeometryAttribute('metric', this.#metric);
            this.#dirty.delete('metric');
        }
        
        // Generate vertex labels if requested
        if (this.#generateVertexLabels && this.#dirty.has('vertexLabels')) {
            const labels = this._generateIndexLabels(this.#vertexCount);
            this.#indexedLineSet.setVertexAttribute(GeometryAttribute.LABELS, labels);
            this.#dirty.delete('vertexLabels');
        }
        
        // Generate edge labels if requested
        if (this.#generateEdgeLabels && this.#dirty.has('edgeLabels')) {
            const labels = this._generateIndexLabels(this.#edgeCount);
            this.#indexedLineSet.setEdgeAttribute(GeometryAttribute.LABELS, labels);
            this.#dirty.delete('edgeLabels');
        }
        
        // Clear all dirty flags
        this.#dirty.clear();
    }
    
    // ============================================================================
    // Protected/Internal Methods
    // ============================================================================
    
    /**
     * Set a vertex attribute, handling multiple input formats.
     * @private
     */
    _setVertexAttribute(attribute, data, fiberLength = null) {
        if (data === null || data === undefined) {
            this.#indexedLineSet.setVertexAttribute(attribute, null);
            return;
        }
        
        if (data instanceof DataList) {
            this.#indexedLineSet.setVertexAttribute(attribute, data);
            return;
        }
        
        if (Array.isArray(data)) {
            const is2D = Array.isArray(data[0]);
            
            if (is2D) {
                const dataList = createVertexList(data, fiberLength);
                this.#indexedLineSet.setVertexAttribute(attribute, dataList);
            } else {
                if (fiberLength === null) {
                    fiberLength = this._inferFiberLength(attribute);
                }
                const dataList = createVertexList(data, fiberLength);
                this.#indexedLineSet.setVertexAttribute(attribute, dataList);
            }
        } else {
            throw new Error('Data must be a DataList, array, or 2D array');
        }
    }
    
    /**
     * Set a vertex attribute directly (for string arrays, etc.).
     * @private
     */
    _setVertexAttributeRaw(attribute, data) {
        this.#indexedLineSet.setVertexAttribute(attribute, data);
    }
    
    /**
     * Set an edge attribute, handling multiple input formats.
     * @private
     */
    _setEdgeAttribute(attribute, data, fiberLength = null) {
        if (data === null || data === undefined) {
            this.#indexedLineSet.setEdgeAttribute(attribute, null);
            return;
        }
        
        if (data instanceof DataList) {
            this.#indexedLineSet.setEdgeAttribute(attribute, data);
            return;
        }
        
        if (Array.isArray(data)) {
            const is2D = Array.isArray(data[0]);
            
            if (is2D) {
                const dataList = createVertexList(data, fiberLength);
                this.#indexedLineSet.setEdgeAttribute(attribute, dataList);
            } else {
                if (fiberLength === null) {
                    fiberLength = this._inferFiberLength(attribute);
                }
                const dataList = createVertexList(data, fiberLength);
                this.#indexedLineSet.setEdgeAttribute(attribute, dataList);
            }
        } else {
            throw new Error('Data must be a DataList, array, or 2D array');
        }
    }
    
    /**
     * Set an edge attribute directly (for string arrays, etc.).
     * @private
     */
    _setEdgeAttributeRaw(attribute, data) {
        this.#indexedLineSet.setEdgeAttribute(attribute, data);
    }
    
    /**
     * Infer fiber length based on attribute type.
     * @private
     */
    _inferFiberLength(attribute) {
        if (attribute === GeometryAttribute.COORDINATES) {
            return 4;
        } else if (attribute === GeometryAttribute.NORMALS) {
            return 3;
        } else if (attribute === GeometryAttribute.COLORS) {
            return 4;
        } else if (attribute === GeometryAttribute.TEXTURE_COORDINATES) {
            return 2;
        } else {
            throw new Error('Cannot infer fiber length for attribute: ' + attribute);
        }
    }
    
    /**
     * Generate index labels.
     * @private
     */
    _generateIndexLabels(count) {
        const labels = new Array(count);
        for (let i = 0; i < count; i++) {
            labels[i] = String(i);
        }
        return labels;
    }
}

