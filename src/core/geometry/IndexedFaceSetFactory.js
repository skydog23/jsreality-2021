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

import { IndexedFaceSet } from '../scene/IndexedFaceSet.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { DataList } from '../scene/data/DataList.js';
import { VariableDataList } from '../scene/data/VariableDataList.js';
import { createVertexList, createMixedFaceList } from './GeometryUtility.js';
import { EUCLIDEAN, polarizePlane, setToLength, normalize as PnNormalize } from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import * as P3 from '../math/P3.js';

export class IndexedFaceSetFactory {
    
    #indexedFaceSet;
    #vertexCount = 0;
    #edgeCount = 0;
    #faceCount = 0;
    #metric = EUCLIDEAN;
    #generateVertexLabels = false;
    #generateEdgeLabels = false;
    #generateFaceLabels = false;
    #generateEdgesFromFaces = false;
    #generateVertexNormals = false;
    #generateFaceNormals = false;
    #dirty = new Set();
    
    /**
     * Create a new IndexedFaceSetFactory.
     * @param {IndexedFaceSet} [existingFaceSet] - Optional existing IndexedFaceSet to modify
     * @param {number} [metric=EUCLIDEAN] - Metric for the geometry
     */
    constructor(existingFaceSet = null, metric = EUCLIDEAN) {
        this.#indexedFaceSet = existingFaceSet || new IndexedFaceSet();
        this.#metric = metric;
        this.#indexedFaceSet.setGeometryAttribute('metric', metric);
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
    
    getVertexCount() {
        return this.#vertexCount;
    }
    
    getEdgeCount() {
        return this.#edgeCount;
    }
    
    getFaceCount() {
        return this.#faceCount;
    }
    
    getMetric() {
        return this.#metric;
    }
    
    isGenerateVertexLabels() {
        return this.#generateVertexLabels;
    }
    
    isGenerateEdgeLabels() {
        return this.#generateEdgeLabels;
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
    
    setVertexCount(count) {
        if (count < 0) throw new Error('Vertex count must be non-negative');
        this.#vertexCount = count;
        this.#dirty.add('vertexCount');
    }
    
    setEdgeCount(count) {
        if (count < 0) throw new Error('Edge count must be non-negative');
        this.#edgeCount = count;
        this.#dirty.add('edgeCount');
    }
    
    setFaceCount(count) {
        if (count < 0) throw new Error('Face count must be non-negative');
        this.#faceCount = count;
        this.#dirty.add('faceCount');
    }
    
    setMetric(metric) {
        this.#metric = metric;
        this.#dirty.add('metric');
    }
    
    setGenerateVertexLabels(generate) {
        this.#generateVertexLabels = generate;
        this.#dirty.add('vertexLabels');
    }
    
    setGenerateEdgeLabels(generate) {
        this.#generateEdgeLabels = generate;
        this.#dirty.add('edgeLabels');
    }
    
    setGenerateFaceLabels(generate) {
        this.#generateFaceLabels = generate;
        this.#dirty.add('faceLabels');
    }
    
    /**
     * Enable/disable automatic generation of edges from faces.
     * When enabled, edge indices are automatically computed from face indices.
     * @param {boolean} generate - Whether to generate edges
     */
    setGenerateEdgesFromFaces(generate) {
        this.#generateEdgesFromFaces = generate;
        this.#dirty.add('edgesFromFaces');
    }
    
    /**
     * Enable/disable automatic generation of vertex normals.
     * @param {boolean} generate - Whether to generate normals
     */
    setGenerateVertexNormals(generate) {
        this.#generateVertexNormals = generate;
        this.#dirty.add('vertexNormals');
    }
    
    /**
     * Enable/disable automatic generation of face normals.
     * @param {boolean} generate - Whether to generate normals
     */
    setGenerateFaceNormals(generate) {
        this.#generateFaceNormals = generate;
        this.#dirty.add('faceNormals');
    }
    
    // ============================================================================
    // Public API - Vertex Attributes
    // ============================================================================
    
    setVertexCoordinates(data, fiberLength = null) {
        this._setVertexAttribute(GeometryAttribute.COORDINATES, data, fiberLength);
    }
    
    setVertexNormals(data, fiberLength = null) {
        this._setVertexAttribute(GeometryAttribute.NORMALS, data, fiberLength);
    }
    
    setVertexColors(data, fiberLength = null) {
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
        this._setVertexAttributeRaw(GeometryAttribute.LABELS, labels);
    }
    
    setVertexRelativeRadii(radii) {
        if (!Array.isArray(radii)) {
            throw new Error('Radii must be an array of numbers');
        }
        this._setVertexAttributeRaw(GeometryAttribute.RELATIVE_RADII, radii);
    }
    
    setVertexAttribute(attribute, data, fiberLength = null) {
        this._setVertexAttribute(attribute, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Edge Attributes
    // ============================================================================
    
    setEdgeIndices(data, pointsPerEdge = null) {
        if (data === null || data === undefined) {
            this.#indexedFaceSet.setEdgeIndices(null);
            return;
        }
        
        if (data instanceof DataList || data instanceof VariableDataList) {
            this.#indexedFaceSet.setEdgeIndices(data);
            return;
        }
        
        if (Array.isArray(data)) {
            const is2D = Array.isArray(data[0]);
            
            if (is2D) {
                const polylines = createMixedFaceList(data); // Reuse for edges
                this.#indexedFaceSet.setEdgeIndices(polylines);
            } else if (pointsPerEdge !== null) {
                const dataList = new DataList(data, [Math.floor(data.length / pointsPerEdge), pointsPerEdge], 'int32');
                this.#indexedFaceSet.setEdgeIndices(dataList);
            } else {
                throw new Error('For flat arrays, pointsPerEdge must be specified');
            }
        }
    }
    
    setEdgeColors(data, fiberLength = null) {
        if (Array.isArray(data) && data.length > 0 && 
            typeof data[0] === 'object' && data[0] !== null && 
            'r' in data[0]) {
            data = data.map(c => [c.r, c.g, c.b, c.a ?? 1.0]);
        }
        this._setEdgeAttribute(GeometryAttribute.COLORS, data, fiberLength);
    }
    
    setEdgeNormals(data, fiberLength = null) {
        this._setEdgeAttribute(GeometryAttribute.NORMALS, data, fiberLength);
    }
    
    setEdgeLabels(labels) {
        if (!Array.isArray(labels)) {
            throw new Error('Labels must be an array of strings');
        }
        this._setEdgeAttributeRaw(GeometryAttribute.LABELS, labels);
    }
    
    setEdgeRelativeRadii(radii) {
        if (!Array.isArray(radii)) {
            throw new Error('Radii must be an array of numbers');
        }
        this._setEdgeAttributeRaw(GeometryAttribute.RELATIVE_RADII, radii);
    }
    
    setEdgeAttribute(attribute, data, fiberLength = null) {
        this._setEdgeAttribute(attribute, data, fiberLength);
    }
    
    // ============================================================================
    // Public API - Face Attributes
    // ============================================================================
    
    /**
     * Set face indices. Accepts multiple formats:
     * - DataList or VariableDataList
     * - 2D array: [[v0,v1,v2], [v3,v4,v5,v6], ...] (variable length faces)
     * - Flat array with fixed pointsPerFace: [v0,v1,v2, v3,v4,v5, ...] (e.g., pointsPerFace=3 for triangles)
     * 
     * @param {DataList|VariableDataList|number[]|number[][]} data - Face index data
     * @param {number} [pointsPerFace=null] - Points per face for flat arrays (e.g., 3 for triangles)
     */
    setFaceIndices(data, pointsPerFace = null) {
        if (data === null || data === undefined) {
            this.#indexedFaceSet.setFaceIndices(null);
            return;
        }
        
        if (data instanceof DataList || data instanceof VariableDataList) {
            this.#indexedFaceSet.setFaceIndices(data);
            return;
        }
        
        if (Array.isArray(data)) {
            const is2D = Array.isArray(data[0]);
            
            if (is2D) {
                // 2D array: [[v0,v1,v2], [v3,v4,v5,v6], ...]
                const faceList = createMixedFaceList(data);
                this.#indexedFaceSet.setFaceIndices(faceList);
            } else if (pointsPerFace !== null) {
                // Flat array with fixed points per face: [v0,v1,v2, v3,v4,v5, ...]
                if (data.length % pointsPerFace !== 0) {
                    throw new Error(`Face indices length (${data.length}) must be divisible by pointsPerFace (${pointsPerFace})`);
                }
                const numFaces = data.length / pointsPerFace;
                const dataList = new DataList(data, [numFaces, pointsPerFace], 'int32');
                this.#indexedFaceSet.setFaceIndices(dataList);
            } else {
                throw new Error('For flat arrays, pointsPerFace must be specified');
            }
        } else {
            throw new Error('Data must be a DataList, VariableDataList, array, or 2D array');
        }
    }
    
    setFaceColors(data, fiberLength = null) {
        if (Array.isArray(data) && data.length > 0 && 
            typeof data[0] === 'object' && data[0] !== null && 
            'r' in data[0]) {
            data = data.map(c => [c.r, c.g, c.b, c.a ?? 1.0]);
        }
        this._setFaceAttribute(GeometryAttribute.COLORS, data, fiberLength);
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
        // Update counts
        if (this.#dirty.has('vertexCount')) {
            this.#indexedFaceSet.setNumPoints(this.#vertexCount);
            this.#dirty.delete('vertexCount');
        }
        
        if (this.#dirty.has('edgeCount')) {
            this.#indexedFaceSet.setNumEdges(this.#edgeCount);
            this.#dirty.delete('edgeCount');
        }
        
        if (this.#dirty.has('faceCount')) {
            this.#indexedFaceSet.setNumFaces(this.#faceCount);
            this.#dirty.delete('faceCount');
        }
        
        if (this.#dirty.has('metric')) {
            this.#indexedFaceSet.setGeometryAttribute('metric', this.#metric);
            this.#dirty.delete('metric');
        }
        
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
        
        // Generate labels if requested
        if (this.#generateVertexLabels && this.#dirty.has('vertexLabels')) {
            const labels = this._generateIndexLabels(this.#vertexCount);
            this.#indexedFaceSet.setVertexAttribute(GeometryAttribute.LABELS, labels);
            this.#dirty.delete('vertexLabels');
        }
        
        if (this.#generateEdgeLabels && this.#dirty.has('edgeLabels')) {
            const labels = this._generateIndexLabels(this.#edgeCount);
            this.#indexedFaceSet.setEdgeAttribute(GeometryAttribute.LABELS, labels);
            this.#dirty.delete('edgeLabels');
        }
        
        if (this.#generateFaceLabels && this.#dirty.has('faceLabels')) {
            const labels = this._generateIndexLabels(this.#faceCount);
            this.#indexedFaceSet.setFaceAttribute(GeometryAttribute.LABELS, labels);
            this.#dirty.delete('faceLabels');
        }
        
        // Clear all dirty flags
        this.#dirty.clear();
    }
    
    // ============================================================================
    // Protected/Internal Methods
    // ============================================================================
    
    _setVertexAttribute(attribute, data, fiberLength = null) {
        if (data === null || data === undefined) {
            this.#indexedFaceSet.setVertexAttribute(attribute, null);
            return;
        }
        
        if (data instanceof DataList) {
            this.#indexedFaceSet.setVertexAttribute(attribute, data);
            return;
        }
        
        if (Array.isArray(data)) {
            const is2D = Array.isArray(data[0]);
            const dataList = is2D 
                ? createVertexList(data, fiberLength)
                : createVertexList(data, fiberLength || this._inferFiberLength(attribute));
            this.#indexedFaceSet.setVertexAttribute(attribute, dataList);
        }
    }
    
    _setVertexAttributeRaw(attribute, data) {
        this.#indexedFaceSet.setVertexAttribute(attribute, data);
    }
    
    _setEdgeAttribute(attribute, data, fiberLength = null) {
        if (data === null || data === undefined) {
            this.#indexedFaceSet.setEdgeAttribute(attribute, null);
            return;
        }
        
        if (data instanceof DataList) {
            this.#indexedFaceSet.setEdgeAttribute(attribute, data);
            return;
        }
        
        if (Array.isArray(data)) {
            const is2D = Array.isArray(data[0]);
            const dataList = is2D 
                ? createVertexList(data, fiberLength)
                : createVertexList(data, fiberLength || this._inferFiberLength(attribute));
            this.#indexedFaceSet.setEdgeAttribute(attribute, dataList);
        }
    }
    
    _setEdgeAttributeRaw(attribute, data) {
        this.#indexedFaceSet.setEdgeAttribute(attribute, data);
    }
    
    _setFaceAttribute(attribute, data, fiberLength = null) {
        if (data === null || data === undefined) {
            this.#indexedFaceSet.setFaceAttribute(attribute, null);
            return;
        }
        
        if (data instanceof DataList) {
            this.#indexedFaceSet.setFaceAttribute(attribute, data);
            return;
        }
        
        if (Array.isArray(data)) {
            const is2D = Array.isArray(data[0]);
            const dataList = is2D 
                ? createVertexList(data, fiberLength)
                : createVertexList(data, fiberLength || this._inferFiberLength(attribute));
            this.#indexedFaceSet.setFaceAttribute(attribute, dataList);
        }
    }
    
    _setFaceAttributeRaw(attribute, data) {
        this.#indexedFaceSet.setFaceAttribute(attribute, data);
    }
    
    _inferFiberLength(attribute) {
        if (attribute === GeometryAttribute.COORDINATES) return 4;
        if (attribute === GeometryAttribute.NORMALS) return 3;
        if (attribute === GeometryAttribute.COLORS) return 4;
        if (attribute === GeometryAttribute.TEXTURE_COORDINATES) return 2;
        throw new Error('Cannot infer fiber length for attribute: ' + attribute);
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
            const face = faceIndices.getItem(faceIdx);
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
        this.#edgeCount = edgeList.length;
        this.#indexedFaceSet.setNumEdges(this.#edgeCount);
        const edgeIndices = createMixedFaceList(edgeList);
        this.#indexedFaceSet.setEdgeIndices(edgeIndices);
    }
    
    /**
     * Generate face normals from vertex coordinates and face indices.
     * @private
     */
    _generateFaceNormals() {
        const faceIndices = this.#indexedFaceSet.getFaceIndices();
        const vertexCoords = this.#indexedFaceSet.getVertexAttribute(GeometryAttribute.COORDINATES);
        
        if (!faceIndices || !vertexCoords) return;
        
        const normalLength = this.#metric === EUCLIDEAN ? 3 : 4;
        const faceNormals = [];
        
        // Get vertex data as 2D array
        const verts = [];
        for (let i = 0; i < vertexCoords.length; i++) {
            verts.push(vertexCoords.getItem(i));
        }
        
        // Calculate normal for each face
        for (let faceIdx = 0; faceIdx < faceIndices.length; faceIdx++) {
            const face = faceIndices.getItem(faceIdx);
            
            if (face.length < 3) {
                // Degenerate face, use zero normal
                faceNormals.push(new Array(normalLength).fill(0));
                continue;
            }
            
            if (this.#metric === EUCLIDEAN) {
                // Euclidean: use cross product of first two edges
                const v0 = verts[face[0]].slice(0, 3);
                const v1 = verts[face[1]].slice(0, 3);
                const v2 = verts[face[2]].slice(0, 3);
                
                const e1 = Rn.subtract(null, v1, v0);
                const e2 = Rn.subtract(null, v2, v0);
                const normal = Rn.crossProduct(null, e1, e2);
                Rn.normalize(normal, normal);
                faceNormals.push(normal);
            } else {
                // Non-euclidean: use plane from three points
                const p0 = verts[face[0]];
                const p1 = verts[face[1]];
                const p2 = verts[face[2]];
                
                const plane = P3.planeFromPoints(null, p0, p1, p2);
                const normal = polarizePlane(null, plane, this.#metric);
                setToLength(normal, normal, -1.0, this.#metric);
                faceNormals.push(normal);
            }
        }
        
        // Set the face normals
        const normalDataList = createVertexList(faceNormals, null);
        this.#indexedFaceSet.setFaceAttribute(GeometryAttribute.NORMALS, normalDataList);
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
        const normalLength = this.#metric === EUCLIDEAN ? 3 : 4;
        const vertexNormals = new Array(this.#vertexCount);
        for (let i = 0; i < this.#vertexCount; i++) {
            vertexNormals[i] = new Array(normalLength).fill(0);
        }
        
        // Accumulate face normals at each vertex
        for (let faceIdx = 0; faceIdx < faceIndices.length; faceIdx++) {
            const face = faceIndices.getItem(faceIdx);
            const faceNormal = faceNormals.getItem(faceIdx);
            
            for (let i = 0; i < face.length; i++) {
                const vertexIdx = face[i];
                Rn.add(vertexNormals[vertexIdx], vertexNormals[vertexIdx], faceNormal);
            }
        }
        
        // Normalize
        if (this.#metric === EUCLIDEAN && normalLength === 3) {
            Rn.normalize(vertexNormals, vertexNormals);
        } else {
            PnNormalize(vertexNormals, vertexNormals, this.#metric);
        }
        
        // Set the vertex normals
        const normalDataList = createVertexList(vertexNormals, null);
        this.#indexedFaceSet.setVertexAttribute(GeometryAttribute.NORMALS, normalDataList);
    }
}

