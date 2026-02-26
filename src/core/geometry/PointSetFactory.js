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
 * Factory class for creating and updating PointSets.
 * 
 * This class provides a convenient API for building PointSet geometry by setting
 * vertex counts, coordinates, normals, colors, texture coordinates, labels, etc.
 * 
 * The factory maintains an internal PointSet instance that is modified through
 * the various setter methods. Call update() to finalize changes.
 * 
 * Example usage:
 * ```javascript
 * const factory = new PointSetFactory();
 * factory.setVertexCount(3);
 * factory.setVertexCoordinates([[0,0,0], [1,0,0], [0,1,0]]);
 * factory.setVertexColors([[1,0,0,1], [0,1,0,1], [0,0,1,1]]);
 * factory.update();
 * const pointSet = factory.getPointSet();
 * ```
 */

import { PointSet } from '../scene/PointSet.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { DataList } from '../scene/data/DataList.js';
import { toDataList, toColorDataList, detectFiberLength } from '../scene/data/DataUtility.js';
import { EUCLIDEAN } from '../math/Pn.js';

export class PointSetFactory {
    
    #pointSet;
    #vertexCount = 0;
    #metric = EUCLIDEAN;
    #generateVertexLabels = false;
    #dirty = new Set(); // Track which attributes need updating
    #pendingAttributes = new Map(); // Store attributes to be applied during update()
    
    /**
     * Create a new PointSetFactory.
     * @param {PointSet} [existingPointSet] - Optional existing PointSet to modify
     * @param {number} [metric=EUCLIDEAN] - Metric for the geometry (EUCLIDEAN, HYPERBOLIC, etc.)
     */
    constructor(existingPointSet = null, metric = EUCLIDEAN) {
        this.#pointSet = existingPointSet || new PointSet();
        this.#metric = metric;
        this.#pointSet.setGeometryAttribute('metric', metric);
    }
    
    // ============================================================================
    // Public API - Getters
    // ============================================================================
    
    /**
     * Get the PointSet being constructed.
     * @returns {PointSet}
     */
    getPointSet() {
        return this.#pointSet;
    }
    
    /**
     * Protected getter for the geometry (for subclasses).
     * Subclasses can override this to return their specific geometry type.
     * @protected
     * @returns {PointSet}
     */
    _getGeometry() {
        return this.#pointSet;
    }
    
    /**
     * Protected accessor for dirty set (for subclasses).
     * @protected
     * @returns {Set}
     */
    _getDirty() {
        return this.#dirty;
    }
    
    /**
     * Protected accessor for pending attributes (for subclasses).
     * @protected
     * @returns {Map}
     */
    _getPendingAttributes() {
        return this.#pendingAttributes;
    }
    
    /**
     * Get the current vertex count.
     * @returns {number}
     */
    getVertexCount() {
        return this.#vertexCount;
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
    
    // ============================================================================
    // Public API - Vertex Coordinates
    // ============================================================================
    
    /**
     * Set vertex coordinates. Accepts multiple formats:
     * - DataList
     * - Flat array: [x0,y0,z0,w0, x1,y1,z1,w1, ...]
     * - 2D array: [[x0,y0,z0,w0], [x1,y1,z1,w1], ...]
     * 
     * @param {DataList|number[]|number[][]} data - Coordinate data
     * @param {number} [fiberLength=null] - Coordinates per vertex (3 or 4), auto-detected if null
     */
    setVertexCoordinates(data, fiberLength = null) {
        this._setVertexAttribute(GeometryAttribute.COORDINATES, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Vertex Normals
    // ============================================================================
    
    /**
     * Set vertex normals. Accepts multiple formats:
     * - DataList
     * - Flat array: [nx0,ny0,nz0, nx1,ny1,nz1, ...]
     * - 2D array: [[nx0,ny0,nz0], [nx1,ny1,nz1], ...]
     * 
     * @param {DataList|number[]|number[][]} data - Normal data
     * @param {number} [fiberLength=null] - Components per normal (3 or 4), auto-detected if null
     */
    setVertexNormals(data, fiberLength = null) {
        this._setVertexAttribute(GeometryAttribute.NORMALS, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Vertex Colors
    // ============================================================================
    
    /**
     * Set vertex colors. Accepts multiple formats:
     * Accepts Color[], float[3][], float[4][], or {r,g,b,a}[] objects.
     * Always stored as RGBA float32 in [0,1] via toColorDataList().
     *
     * @param {DataList|number[]|number[][]|Color[]|Object[]} data
     */
    setVertexColors(data) {
        this._setVertexAttribute(GeometryAttribute.COLORS, toColorDataList(data));
    }
    
    // ============================================================================
    // Public API - Vertex Texture Coordinates
    // ============================================================================
    
    /**
     * Set vertex texture coordinates. Accepts multiple formats:
     * - DataList
     * - Flat array: [u0,v0, u1,v1, ...]
     * - 2D array: [[u0,v0], [u1,v1], ...]
     * 
     * @param {DataList|number[]|number[][]} data - Texture coordinate data
     * @param {number} [fiberLength=null] - Components per texcoord (2, 3, or 4), auto-detected if null
     */
    setVertexTextureCoordinates(data, fiberLength = null) {
        this._setVertexAttribute(GeometryAttribute.TEXTURE_COORDINATES, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Vertex Labels
    // ============================================================================
    
    /**
     * Set vertex labels.
     * @param {string[]} labels - Array of label strings
     */
    setVertexLabels(labels) {
        if (!Array.isArray(labels)) {
            throw new Error('Labels must be an array of strings');
        }
        if (labels.length !== this.#vertexCount) {
            throw new Error(`Label array length (${labels.length}) must match vertex count (${this.#vertexCount})`);
        }
        this._setVertexAttributeRaw(GeometryAttribute.LABELS, labels);
    }
    
    // ============================================================================
    // Public API - Vertex Relative Radii
    // ============================================================================
    
    /**
     * Set relative radii for vertices (for sphere rendering).
     * @param {number[]} radii - Array of radius values
     */
    setVertexRelativeRadii(radii) {
        if (!Array.isArray(radii)) {
            throw new Error('Radii must be an array of numbers');
        }
        if (radii.length !== this.#vertexCount) {
            throw new Error(`Radii array length (${radii.length}) must match vertex count (${this.#vertexCount})`);
        }
        this._setVertexAttributeRaw(GeometryAttribute.RELATIVE_RADII, radii);
    }
    
    // ============================================================================
    // Public API - Generic Vertex Attributes
    // ============================================================================
    
    /**
     * Set a generic vertex attribute. Accepts multiple formats:
     * - DataList
     * - Flat array
     * - 2D array
     * 
     * @param {string} attribute - Attribute name (use GeometryAttribute constants)
     * @param {DataList|number[]|number[][]} data - Attribute data
     * @param {number} [fiberLength=null] - Components per vertex, auto-detected if null
     */
    setVertexAttribute(attribute, data, fiberLength = null) {
        this._setVertexAttribute(attribute, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Update
    // ============================================================================
    
    /**
     * Apply all pending changes to the PointSet.
     * This method should be called after setting all desired attributes.
     */
    update() {
        const geometry = this._getGeometry();
        
        // Update vertex count FIRST (this clears all attributes, so must be done before setting them)
        if (this.#dirty.has('vertexCount')) {
            geometry.setNumPoints(this.#vertexCount);
            this.#dirty.delete('vertexCount');
        }
        
        // Apply all pending attributes (after vertex count is set)
        for (const [attribute, dataList] of this.#pendingAttributes.entries()) {
            geometry.setVertexAttribute(attribute, dataList);
        }
        this.#pendingAttributes.clear();
        
        // Update metric if changed
        if (this.#dirty.has('metric')) {
            geometry.setGeometryAttribute('metric', this.#metric);
            this.#dirty.delete('metric');
        }
        
        // Generate vertex labels if requested
        if (this.#generateVertexLabels && this.#dirty.has('vertexLabels')) {
            const labels = this._generateIndexLabels(this.#vertexCount);
            // Convert string array to DataList using toDataList (handles string arrays specially)
            const labelDataList = toDataList(labels, null, 'string');
            geometry.setVertexAttribute(GeometryAttribute.LABELS, labelDataList);
            this.#dirty.delete('vertexLabels');
        }
        
        // Clear all dirty flags
        this.#dirty.clear();
    }
    
    // ============================================================================
    // Protected/Internal Methods
    // ============================================================================
    
    /**
     * Set a vertex attribute, handling multiple input formats.
     * Stores the attribute to be applied during update() to avoid clearing by setNumPoints().
     * @private
     */
    _setVertexAttribute(attribute, data, fiberLength = null) {
        // Infer fiber length if not provided
        if (fiberLength === null) {
            // First, try to detect from array structure
            if (Array.isArray(data) && data.length > 0) {
                const detected = detectFiberLength(data);
                if (detected !== null) {
                    fiberLength = detected;
                }
            }
            
            // If still null, try to infer from vertex count for flat arrays
            if (fiberLength === null) {
                if (this.#vertexCount > 0 && Array.isArray(data) && !Array.isArray(data[0])) {
                    // Flat array - try to infer from vertex count
                    fiberLength = Math.floor(data.length / this.#vertexCount);
                    if (fiberLength === 0) {
                        throw new Error(`Cannot infer fiber length: data length ${data.length} is less than vertex count ${this.#vertexCount}`);
                    }
                } else {
                    // Cannot determine fiber length - throw error
                    throw new Error(`Cannot determine fiber length for attribute '${attribute}'. ` +
                        `Please provide fiberLength parameter or use nested array format (e.g., [[x,y,z], ...])`);
                }
            }
        }
        const dataList = toDataList(data, fiberLength);
        // Store for later application during update() (after setNumPoints clears attributes)
        this.#pendingAttributes.set(attribute, dataList);
    }
    
    /**
     * Set a vertex attribute directly (for string arrays, etc.).
     * @private
     */
    _setVertexAttributeRaw(attribute, data) {
        this._getGeometry().setVertexAttribute(attribute, data);
    }
    
    /**
     * Generate index labels for vertices.
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

