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
import { createVertexList } from './GeometryUtility.js';
import { EUCLIDEAN } from '../math/Pn.js';

export class PointSetFactory {
    
    #pointSet;
    #vertexCount = 0;
    #metric = EUCLIDEAN;
    #generateVertexLabels = false;
    #dirty = new Set(); // Track which attributes need updating
    
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
     * - DataList
     * - Flat array: [r0,g0,b0,a0, r1,g1,b1,a1, ...]
     * - 2D array: [[r0,g0,b0,a0], [r1,g1,b1,a1], ...]
     * - Array of {r,g,b,a} objects
     * 
     * @param {DataList|number[]|number[][]|Object[]} data - Color data
     * @param {number} [fiberLength=null] - Components per color (3 or 4), auto-detected if null
     */
    setVertexColors(data, fiberLength = null) {
        // Handle color objects {r,g,b,a}
        if (Array.isArray(data) && data.length > 0 && 
            typeof data[0] === 'object' && data[0] !== null && 
            'r' in data[0]) {
            data = data.map(c => [c.r, c.g, c.b, c.a ?? 1.0]);
        }
        this._setVertexAttribute(GeometryAttribute.COLORS, data, fiberLength);
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
        // Update vertex count if changed
        if (this.#dirty.has('vertexCount')) {
            this.#pointSet.setNumPoints(this.#vertexCount);
            this.#dirty.delete('vertexCount');
        }
        
        // Update metric if changed
        if (this.#dirty.has('metric')) {
            this.#pointSet.setGeometryAttribute('metric', this.#metric);
            this.#dirty.delete('metric');
        }
        
        // Generate vertex labels if requested
        if (this.#generateVertexLabels && this.#dirty.has('vertexLabels')) {
            const labels = this._generateIndexLabels(this.#vertexCount);
            this.#pointSet.setVertexAttribute(GeometryAttribute.LABELS, labels);
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
     * @private
     */
    _setVertexAttribute(attribute, data, fiberLength = null) {
        if (data === null || data === undefined) {
            this.#pointSet.setVertexAttribute(attribute, null);
            return;
        }
        
        // If it's already a DataList, use it directly
        if (data instanceof DataList) {
            this.#pointSet.setVertexAttribute(attribute, data);
            return;
        }
        
        // Otherwise, convert to DataList
        let dataList;
        
        if (Array.isArray(data)) {
            // Check if it's a 2D array or flat array
            const is2D = Array.isArray(data[0]);
            
            if (is2D) {
                // 2D array: [[x,y,z], [x,y,z], ...]
                dataList = createVertexList(data, fiberLength);
            } else {
                // Flat array: [x,y,z, x,y,z, ...]
                // Determine fiber length if not provided
                if (fiberLength === null) {
                    // Default to 4 for coordinates, 3 for normals, 4 for colors, 2 for texcoords
                    if (attribute === GeometryAttribute.COORDINATES) {
                        fiberLength = 4;
                    } else if (attribute === GeometryAttribute.NORMALS) {
                        fiberLength = 3;
                    } else if (attribute === GeometryAttribute.COLORS) {
                        fiberLength = 4;
                    } else if (attribute === GeometryAttribute.TEXTURE_COORDINATES) {
                        fiberLength = 2;
                    } else {
                        // Try to infer from data length
                        if (this.#vertexCount > 0) {
                            fiberLength = Math.floor(data.length / this.#vertexCount);
                        } else {
                            throw new Error('Cannot infer fiber length without vertex count');
                        }
                    }
                }
                
                dataList = createVertexList(data, fiberLength);
            }
            
            this.#pointSet.setVertexAttribute(attribute, dataList);
        } else {
            throw new Error('Data must be a DataList, array, or 2D array');
        }
    }
    
    /**
     * Set a vertex attribute directly (for string arrays, etc.).
     * @private
     */
    _setVertexAttributeRaw(attribute, data) {
        this.#pointSet.setVertexAttribute(attribute, data);
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

