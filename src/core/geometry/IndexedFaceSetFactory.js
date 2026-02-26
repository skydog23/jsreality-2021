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
 * Factory class for creating and updating IndexedFaceSets.
 * 
 * Extends IndexedLineSetFactory to add face management and normal generation.
 * 
 * Example usage:
 * ```javascript
 * const factory = new IndexedFaceSetFactory();
 * factory.setVertexCount(4);
 * factory.setVertexCoordinates([[0,0,0], [1,0,0], [1,1,0], [0,1,0]]);
 * factory.setFaceCount(2);
 * factory.setFaceIndices([[0,1,2], [0,2,3]]);
 * factory.setGenerateEdgesFromFaces(true);
 * factory.setGenerateFaceNormals(true);
 * factory.update();
 * const faceSet = factory.getIndexedFaceSet();
 * ```
 */

import { IndexedLineSetFactory } from './IndexedLineSetFactory.js';
import { IndexedFaceSet } from '../scene/IndexedFaceSet.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { DataList } from '../scene/data/DataList.js';
import { RegularDataList } from '../scene/data/RegularDataList.js';
import { VariableDataList } from '../scene/data/VariableDataList.js';
import { toDataList, toColorDataList, fromDataList } from '../scene/data/DataUtility.js';
import { EUCLIDEAN, polarizePlane, setToLength, normalize as PnNormalize, dehomogenize } from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import * as P3 from '../math/P3.js';

export class IndexedFaceSetFactory extends IndexedLineSetFactory {
    
    #indexedFaceSet;
    #faceCount = 0;
    #generateFaceLabels = false;
    #generateEdgesFromFaces = false;
    #generateVertexNormals = false;
    #generateFaceNormals = false;
    #pendingFaceAttributes = new Map(); // Store face attributes to be applied during update()
    
    /**
     * Create a new IndexedFaceSetFactory.
     * @param {IndexedFaceSet} [existingFaceSet] - Optional existing IndexedFaceSet to modify
     * @param {number} [metric=EUCLIDEAN] - Metric for the geometry
     */
    constructor(existingFaceSet = null, metric = EUCLIDEAN) {
        // Pass IndexedFaceSet to parent constructor (IndexedFaceSet extends IndexedLineSet)
        const faceSet = existingFaceSet || new IndexedFaceSet();
        super(faceSet, metric);
        this.#indexedFaceSet = faceSet;
    }
    
    // ============================================================================
    // Public API - Getters
    // ============================================================================
    
    /**
     * Get the IndexedFaceSet being constructed.
     * @returns {IndexedFaceSet}
     */
    getIndexedFaceSet() {
        return this.#indexedFaceSet;
    }
    
    /**
     * Override to return IndexedFaceSet instead of IndexedLineSet.
     * @returns {IndexedFaceSet}
     */
    getIndexedLineSet() {
        return this.#indexedFaceSet;
    }
    
    /**
     * Override to return IndexedFaceSet instead of PointSet.
     * @returns {IndexedFaceSet}
     */
    getPointSet() {
        return this.#indexedFaceSet;
    }
    
    /**
     * Protected getter for the geometry (overrides parent).
     * @protected
     * @returns {IndexedFaceSet}
     */
    _getGeometry() {
        return this.#indexedFaceSet;
    }
    
    /**
     * Get the current face count.
     * @returns {number}
     */
    getFaceCount() {
        return this.#faceCount;
    }
    
    isGenerateFaceLabels() {
        return this.#generateFaceLabels;
    }
    
    isGenerateEdgesFromFaces() {
        return this.#generateEdgesFromFaces;
    }
    
    isGenerateVertexNormals() {
        return this.#generateVertexNormals;
    }
    
    isGenerateFaceNormals() {
        return this.#generateFaceNormals;
    }
    
    // ============================================================================
    // Public API - Configuration
    // ============================================================================
    
    /**
     * Set the number of faces.
     * @param {number} count - Number of faces
     */
    setFaceCount(count) {
        if (count < 0) throw new Error('Face count must be non-negative');
        this.#faceCount = count;
        this._getDirty().add('faceCount');
    }
    
    /**
     * Enable/disable automatic generation of face labels.
     * @param {boolean} generate - Whether to generate labels
     */
    setGenerateFaceLabels(generate) {
        this.#generateFaceLabels = generate;
        this._getDirty().add('faceLabels');
    }
    
    /**
     * Enable/disable automatic generation of edges from faces.
     * When enabled, edge indices are automatically computed from face indices.
     * @param {boolean} generate - Whether to generate edges
     */
    setGenerateEdgesFromFaces(generate) {
        this.#generateEdgesFromFaces = generate;
        this._getDirty().add('edgesFromFaces');
    }
    
    /**
     * Enable/disable automatic generation of vertex normals.
     * @param {boolean} generate - Whether to generate normals
     */
    setGenerateVertexNormals(generate) {
        this.#generateVertexNormals = generate;
        this._getDirty().add('vertexNormals');
    }
    
    /**
     * Enable/disable automatic generation of face normals.
     * @param {boolean} generate - Whether to generate normals
     */
    setGenerateFaceNormals(generate) {
        this.#generateFaceNormals = generate;
        this._getDirty().add('faceNormals');
    }
    
    // ============================================================================
    // Public API - Face Attributes
    // ============================================================================
    
    /**
     * Set face indices. Accepts multiple formats:
     * - DataList (RegularDataList or VariableDataList) - must be INT32 type
     * - 2D array: [[v0,v1,v2], [v3,v4,v5,v6], ...] (variable length faces) → VariableDataList
     * - Flat array with fixed pointsPerFace: [v0,v1,v2, v3,v4,v5, ...] → RegularDataList
     * 
     * Face indices are stored as INT32 and can be variable-length (VariableDataList) for mixed face sizes.
     * 
     * @param {DataList|number[]|number[][]} data - Face index data
     * @param {number} [pointsPerFace=null] - Points per face for flat arrays (e.g., 3 for triangles)
     */
    setFaceIndices(data, pointsPerFace = null) {
        if (data === null || data === undefined) {
            // Handle null/undefined - set directly (not stored in pending attributes)
            this.#indexedFaceSet.setFaceIndices(null);
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
            // For flat arrays, pointsPerFace is used as fiberLength
            dataList = toDataList(data, pointsPerFace, 'int32');
        }
        
        // Store for later application during update() (after setNumFaces clears attributes)
        this.#pendingFaceAttributes.set(GeometryAttribute.INDICES, dataList);
    }
    
    /**
     * Set face colors. Accepts Color[], float[3][], float[4][], or {r,g,b,a}[].
     * Always stored as RGBA float32 in [0,1] via toColorDataList().
     *
     * @param {DataList|number[]|number[][]|Color[]|Object[]} data
     */
    setFaceColors(data) {
        this._setFaceAttribute(GeometryAttribute.COLORS, toColorDataList(data));
    }
    
    setFaceNormals(data, fiberLength = null) {
        this._setFaceAttribute(GeometryAttribute.NORMALS, data, fiberLength);
    }
    
    setFaceLabels(labels) {
        if (!Array.isArray(labels)) {
            throw new Error('Labels must be an array of strings');
        }
        this._setFaceAttributeRaw(GeometryAttribute.LABELS, labels);
    }
    
    setFaceAttribute(attribute, data, fiberLength = null) {
        this._setFaceAttribute(attribute, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Update
    // ============================================================================
    
    /**
     * Apply all pending changes to the IndexedFaceSet.
     * This method should be called after setting all desired attributes.
     */
    update() {
        // Call parent update() to handle vertex and edge attributes
        super.update();
        
        // Update face count FIRST (this clears all face attributes)
        if (this._getDirty().has('faceCount')) {
            this.#indexedFaceSet.setNumFaces(this.#faceCount);
            this._getDirty().delete('faceCount');
        } else {
            // If face count wasn't explicitly set, infer it from pending face attributes
            // Validate that all face attributes have consistent counts
            let inferredCount = null;
            const inconsistentAttributes = [];
            
            for (const [attribute, dataList] of this.#pendingFaceAttributes.entries()) {
                if (!dataList) continue;
                
                let count = 0;
                if (dataList instanceof VariableDataList) {
                    count = dataList.length;
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
                    `Inconsistent face attribute counts: expected ${inferredCount} faces, but found ` +
                    inconsistentAttributes.join(', ')
                );
            }
            
            if (inferredCount !== null && inferredCount > 0) {
                this.#faceCount = inferredCount;
                this.#indexedFaceSet.setNumFaces(inferredCount);
            }
        }
        
        // Apply all pending face attributes (after face count is set)
        for (const [attribute, dataList] of this.#pendingFaceAttributes.entries()) {
            this.#indexedFaceSet.setFaceAttribute(attribute, dataList);
        }
        this.#pendingFaceAttributes.clear();
        
        // Generate edges from faces if requested
        if (this.#generateEdgesFromFaces) {
            this._generateEdgesFromFaces();
        }
        
        // Generate face normals if requested
        if (this.#generateFaceNormals) {
            this._generateFaceNormals();
        }
        
        // Generate vertex normals if requested
        if (this.#generateVertexNormals) {
            this._generateVertexNormals();
        }
        
        // Generate face labels if requested
        if (this.#generateFaceLabels && this._getDirty().has('faceLabels')) {
            const labels = this._generateIndexLabels(this.#faceCount);
            this.#indexedFaceSet.setFaceAttribute(GeometryAttribute.LABELS, labels);
            this._getDirty().delete('faceLabels');
        }
    }
    
    // ============================================================================
    // Protected/Internal Methods
    // ============================================================================
    
    /**
     * Set a face attribute, handling multiple input formats.
     * Stores the attribute to be applied during update() to avoid clearing by setNumFaces().
     * 
     * If fiberLength is null, toDataList() will automatically detect it from the data structure.
     * 
     * @private
     */
    _setFaceAttribute(attribute, data, fiberLength = null) {
        const dataList = toDataList(data, fiberLength);
        // Store for later application during update() (after setNumFaces clears attributes)
        this.#pendingFaceAttributes.set(attribute, dataList);
    }
    
    /**
     * Set a face attribute directly (for string arrays, etc.).
     * @private
     */
    _setFaceAttributeRaw(attribute, data) {
        this.#indexedFaceSet.setFaceAttribute(attribute, data);
    }
    
    _generateIndexLabels(count) {
        const labels = new Array(count);
        for (let i = 0; i < count; i++) {
            labels[i] = String(i);
        }
        return labels;
    }
    
    /**
     * Generate edge indices from face indices.
     * @private
     */
    _generateEdgesFromFaces() {
        const faceIndices = this.#indexedFaceSet.getFaceIndices();
        if (!faceIndices) return;
        // Build a set of unique edges
        const edgeSet = new Set();
        const edgeList = [];
        
        // Iterate over all faces
        for (let faceIdx = 0; faceIdx < faceIndices.length; faceIdx++) {
            const face = faceIndices.item(faceIdx);
            const faceLength = face.length;
            
            // For each edge in the face
            for (let i = 0; i < faceLength; i++) {
                const v0 = face[i];
                const v1 = face[(i + 1) % faceLength];
                
                // Create a canonical edge key (smaller index first)
                const key = v0 < v1 ? `${v0},${v1}` : `${v1},${v0}`;
                if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    edgeList.push([v0, v1]);
                }
            }
        }
        
        // Set the edge indices
        this._setEdgeCount(edgeList.length);
        this.#indexedFaceSet.setNumEdges(this._getEdgeCount());
        // Convert edgeList (2D array) to DataList using toDataList
        // All edges have length 2, so this will create a RegularDataList with shape [numEdges, 2]
        const edgeIndices = toDataList(edgeList, null, 'int32');
        this.#indexedFaceSet.setEdgeIndices(edgeIndices);
    }
    
    /**
     * Generate face normals from vertex coordinates and face indices.
     * @private
     */
    _generateFaceNormals() {
        const faceIndicesData = this.#indexedFaceSet.getFaceIndices();
        const vertexCoordsData = this.#indexedFaceSet.getVertexAttribute(GeometryAttribute.COORDINATES);
        
        if (!faceIndicesData || !vertexCoordsData) return;
        
        // Convert DataLists to arrays
        const faceIndices = fromDataList(faceIndicesData);
        const vertexCoords = fromDataList(vertexCoordsData);
        
        const metric = this.getMetric();
        const normalLength = metric === EUCLIDEAN ? 3 : 4;
        const faceNormals = [];
        
        // Copy vertices for dehomogenization (modify in place)
        const verts = vertexCoords.map(v => [...v]);
        
        // Dehomogenize vertices if they're 4D and metric is Euclidean (matches Java implementation)
        // if (metric === EUCLIDEAN && verts.length > 0 && verts[0].length === 4) {
        //     for (let i = 0; i < verts.length; i++) {
        //         verts[i] = dehomogenize(null, verts[i]);
        //     }
        // }
        
        // Calculate normal for each face
        for (let faceIdx = 0; faceIdx < faceIndices.length; faceIdx++) {
            const face = faceIndices[faceIdx];
            const n = face.length;
            
            if (n < 3) {
                // Degenerate face, skip (matches Java: continue)
                faceNormals.push([0,0,0,0]);
                continue;
            }
        
            const plane = this.#getPlaneThroughFace(verts, face);
            let normal = polarizePlane(null, plane, metric);
            setToLength(normal, normal, -1.0, metric);
            if (metric === EUCLIDEAN) normal = normal.slice(0, 3);
            faceNormals.push(normal);
        }
        
        // Set the face normals
        // faceNormals is a 2D array, so toDataList will auto-detect fiber length
        const normalDataList = toDataList(faceNormals);
        this.#indexedFaceSet.setFaceAttribute(GeometryAttribute.NORMALS, normalDataList);
    }
    /**
     * TODO: the check for degenerate vertices shouldn't use euclidean norm.
     * @param {number[][]} verts 
     * @param {number[]} indices 
     * @returns 
     */
    #getPlaneThroughFace(verts, indices, tol = 1e-16) {
        // find non-degenerate set of 3 vertices (matches Java implementation)
        let count = 1;
        let v1 = null;
        
        // // Find first non-degenerate edge
        // do {
        //     v1 = Rn.subtract(null, verts[indices[count++]], verts[indices[0]]);
        // } while (Rn.euclideanNorm(v1) < tol && count < (indices.length  - 1));
        
        // // Find second non-degenerate edge
        // let v2 = null;
        // do {
        //     v2 = Rn.subtract(null, verts[indices[count++]], verts[indices[0]]);
        // } while (Rn.euclideanNorm(v2) < tol && count < indices.length);
        
        // if (count > indices.length) {
        //     // Couldn't find non-degenerate edges, skip this face
        //     return [0,0,0,0];
        // }
        const p0 = verts[indices[0]];
        const p1 = verts[indices[1]];
        const p2 = verts[indices[2]];
        return P3.planeFromPoints(null, p0, p1, p2);
    }
    /**
     * Generate vertex normals by averaging face normals.
     * @private
     */
    _generateVertexNormals() {
        const faceIndices = this.#indexedFaceSet.getFaceIndices();
        let faceNormals = this.#indexedFaceSet.getFaceAttribute(GeometryAttribute.NORMALS);
        
        if (!faceIndices) return;
        
        // Generate face normals if not present
        if (!faceNormals) {
            this._generateFaceNormals();
            faceNormals = this.#indexedFaceSet.getFaceAttribute(GeometryAttribute.NORMALS);
        }
        
        if (!faceNormals) return;
        
        // Initialize vertex normals to zero
        const metric = this.getMetric();
        const normalLength = metric === EUCLIDEAN ? 3 : 4;
        const vertexCount = this.getVertexCount();
        const vertexNormals = new Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) {
            vertexNormals[i] = new Array(normalLength).fill(0);
        }
        
        // Accumulate face normals at each vertex
        for (let faceIdx = 0; faceIdx < faceIndices.length; faceIdx++) {
            const face = faceIndices.item(faceIdx);
            const faceNormal = faceNormals.item(faceIdx);
             for (let i = 0; i < face.length; i++) {
                const vertexIdx = face[i];
                Rn.add(vertexNormals[vertexIdx], vertexNormals[vertexIdx], faceNormal);
            }
        }
        
        // Normalize
        if (metric === EUCLIDEAN && normalLength === 3) {
            Rn.normalize(vertexNormals, vertexNormals);
        } else {
            Pn.normalize(vertexNormals, vertexNormals, metric);
        }
        // Set the vertex normals
        // vertexNormals is a 2D array, so toDataList will auto-detect fiber length
        const normalDataList = toDataList(vertexNormals);
        this.#indexedFaceSet.setVertexAttribute(GeometryAttribute.NORMALS, normalDataList);
    }
}
