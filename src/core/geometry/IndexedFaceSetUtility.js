/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's IndexedFaceSetUtility class (from IndexedFaceSetUtility.java)
// Large utility class - translating incrementally

import { IndexedFaceSet } from '../scene/IndexedFaceSet.js';
import { IndexedFaceSetFactory } from './IndexedFaceSetFactory.js';
import { IndexedLineSetUtility } from './IndexedLineSetUtility.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { GeometryUtility } from './GeometryUtility.js';
import { SceneGraphUtility } from '../util/SceneGraphUtility.js';
import { Rectangle3D } from '../util/Rectangle3D.js';
import { fromDataList, toDataList } from '../scene/data/DataUtility.js';
import * as Rn from '../math/Rn.js';
import * as Pn from '../math/Pn.js';
import * as P3 from '../math/P3.js';
import { EUCLIDEAN } from '../math/Pn.js';
import { getLogger, Category } from '../util/LoggingSystem.js';

const logger = getLogger('jsreality.core.geometry.IndexedFaceSetUtility');

/**
 * Static methods for editing and processing instances of {@link IndexedFaceSet}.
 */
export class IndexedFaceSetUtility {
  
  /**
   * Private constructor - all methods are static
   */
  constructor() {
    throw new Error('IndexedFaceSetUtility is a static utility class');
  }
  
  /**
   * Epsilon value for floating point comparisons
   * @private
   */
  static #EPS = 1e-8;
  
  /**
   * Box indices for unit cube
   * @private
   */
  static #BOX_INDICES = [
    [0, 1, 3, 2],
    [1, 0, 4, 5],
    [3, 1, 5, 7],
    [5, 4, 6, 7],
    [2, 3, 7, 6],
    [0, 2, 6, 4]
  ];
  
  /**
   * Calculate and set edges from faces for an IndexedFaceSet
   * @param {IndexedFaceSet} ifs - Face set to process
   */
  static calculateAndSetEdgesFromFaces(ifs) {
    const facesData = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    const edgesDataList = IndexedFaceSetUtility.edgesFromFaces(facesData);
    
    const edgeAttrs = new Map();
    edgeAttrs.set(GeometryAttribute.INDICES, edgesDataList);
    ifs.setEdgeCountAndAttributes(edgeAttrs);
  }
  
  /**
   * Generate edges from face indices (DataList version)
   * @param {DataList} facesData - Face indices as DataList
   * @returns {DataList} Edge indices as DataList
   */
  static edgesFromFaces(facesData) {
    // Convert to array if needed
    const faces = fromDataList(facesData);
    
    // Use Set with string keys to represent pairs (since JS doesn't have value-based Set)
    const edgeSet = new Set();
    
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      for (let j = 0; j < face.length - 1; j++) {
        const v1 = face[j];
        const v2 = face[j + 1];
        // Create canonical edge representation (smaller index first)
        const edgeKey = v1 <= v2 ? `${v1},${v2}` : `${v2},${v1}`;
        edgeSet.add(edgeKey);
      }
      // Close the face
      const v1 = face[face.length - 1];
      const v2 = face[0];
      const edgeKey = v1 <= v2 ? `${v1},${v2}` : `${v2},${v1}`;
      edgeSet.add(edgeKey);
    }
    
    // Convert set to array of [v1, v2] pairs
    const edges = Array.from(edgeSet).map(key => {
      const [v1, v2] = key.split(',').map(Number);
      return [v1, v2];
    });
    
    // Convert to DataList with int32 type
    return toDataList(edges, null, 'int32');
  }
  
  /**
   * Construct a polygon IndexedFaceSet from points
   * @param {number[][]} points - Array of vertex coordinates
   * @returns {IndexedFaceSet}
   */
  static constructPolygon(points) {
    return IndexedFaceSetUtility.constructPolygonWithFactory(null, points);
  }
  
  /**
   * Construct a polygon IndexedFaceSet from points with optional factory
   * @param {IndexedFaceSetFactory} [ifsf] - Optional existing factory
   * @param {number[][]} points - Array of vertex coordinates
   * @returns {IndexedFaceSet}
   */
  static constructPolygonWithFactory(ifsf, points) {
    return IndexedFaceSetUtility.constructPolygonFactory(ifsf, points, EUCLIDEAN).getIndexedFaceSet();
  }
  
  /**
   * Construct a polygon IndexedFaceSet from points with metric
   * @param {IndexedFaceSetFactory} [ifsf] - Optional existing factory
   * @param {number[][]} points - Array of vertex coordinates
   * @param {number} sig - Metric (EUCLIDEAN, HYPERBOLIC, etc.)
   * @returns {IndexedFaceSet}
   */
  static constructPolygonWithMetric(ifsf, points, sig) {
    return IndexedFaceSetUtility.constructPolygonFactory(ifsf, points, sig).getIndexedFaceSet();
  }
  
  /**
   * Construct a polygon factory from points
   * @param {IndexedFaceSetFactory} [ifsf] - Optional existing factory
   * @param {number[][]} points - Array of vertex coordinates
   * @param {number} sig - Metric (EUCLIDEAN, HYPERBOLIC, etc.)
   * @returns {IndexedFaceSetFactory}
   */
  static constructPolygonFactory(ifsf, points, sig) {
    if (ifsf == null) ifsf = new IndexedFaceSetFactory();
    ifsf.setMetric(sig);
    ifsf.setGenerateFaceNormals(false);
    ifsf.setVertexCount(points.length);
    ifsf.setVertexCoordinates(points);
    ifsf.setFaceCount(1);
    
    const find = [Array(points.length)];
    for (let i = 0; i < points.length; ++i) {
      find[0][i] = i;
    }
    ifsf.setFaceIndices(find);
    
    const ind = Array(points.length);
    for (let i = 0; i < points.length; ++i) {
      ind[i] = [i, (i + 1) % points.length];
    }
    ifsf.setEdgeCount(ind.length);
    ifsf.setEdgeIndices(ind);
    ifsf.update();
    
    return ifsf;
  }
  
  /**
   * Extract a face from an IndexedFaceSet
   * @param {IndexedFaceSet} ifs - Face set to extract from
   * @param {number} which - Face index to extract
   * @returns {IndexedFaceSet}
   */
  static extractFace(ifs, which) {
    const ifs2 = SceneGraphUtility.copy(ifs);
    ifs2.setName(ifs.getName() + "ExtractFace" + which);
    
    const indicesData = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    const indices = fromDataList(indicesData);
    const newIndices = [indices[which]];
    
    const edgeAttrs = new Map();
    const indicesDataList = toDataList(newIndices, null, 'int32');
    edgeAttrs.set(GeometryAttribute.INDICES, indicesDataList);
    ifs2.setFaceCountAndAttributes(edgeAttrs);
    
    const colors = ifs.getFaceAttribute(GeometryAttribute.COLORS);
    if (colors != null) {
      const cc = fromDataList(colors);
      const newc = [cc[which]];
      const colorDataList = toDataList(newc);
      const faceAttrs = new Map();
      faceAttrs.set(GeometryAttribute.COLORS, colorDataList);
      ifs2.setFaceAttributes(faceAttrs);
    }
    
    // Avoid rendering vertices not contained in the selected face
    const pointindices = new Set();
    for (let i = 0; i < indices[which].length; ++i) {
      pointindices.add(indices[which][i]);
    }
    
    const pointindicesArray = Array.from(pointindices);
    const vertexAttrs = new Map();
    const pointIndicesDataList = toDataList([pointindicesArray], null, 'int32');
    vertexAttrs.set(GeometryAttribute.INDICES, pointIndicesDataList);
    ifs2.setVertexCountAndAttributes(vertexAttrs);
    
    return ifs2;
  }
  
  /**
   * Extract vertices for a specific face
   * @param {IndexedFaceSet} ifs - Face set to extract from
   * @param {number} which - Face index
   * @returns {number[][]} Array of vertex coordinates
   */
  static extractVerticesForFace(ifs, which) {
    const indicesData = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    const indices = fromDataList(indicesData);
    const vertsData = ifs.getVertexAttribute(GeometryAttribute.COORDINATES);
    const verts = fromDataList(vertsData);
    
    const faceIndices = indices[which];
    const result = Array(faceIndices.length);
    for (let i = 0; i < faceIndices.length; ++i) {
      result[i] = [...verts[faceIndices[i]]];
    }
    return result;
  }
  
  /**
   * Calculate and set face normals for an IndexedFaceSet
   * @param {IndexedFaceSet} ifs - Face set to process
   */
  static calculateAndSetFaceNormals(ifs) {
    const sigO = ifs.getGeometryAttribute(GeometryUtility.METRIC);
    let sig = EUCLIDEAN;
    if (sigO != null && typeof sigO === 'number') {
      sig = sigO;
      logger.finer(Category.ALL, 'Calculating normals with metric ' + sig);
    }
    IndexedFaceSetUtility.calculateAndSetFaceNormalsWithMetric(ifs, sig);
  }
  
  /**
   * Calculate and set face normals with specific metric
   * @param {IndexedFaceSet} ifs - Face set to process
   * @param {number} metric - Metric to use
   */
  static calculateAndSetFaceNormalsWithMetric(ifs, metric) {
    if (ifs.getNumFaces() === 0) return;
    const fn = IndexedFaceSetUtility.calculateFaceNormals(ifs, metric);
    //ifs.setFaceAttribute(GeometryAttribute.NORMALS, null);
    const normalDataList = toDataList(fn);
    ifs.setFaceAttribute(GeometryAttribute.NORMALS, normalDataList);
  }
  
  /**
   * Calculate and set all normals (face and vertex)
   * @param {IndexedFaceSet} ifs - Face set to process
   */
  static calculateAndSetNormals(ifs) {
    IndexedFaceSetUtility.calculateAndSetFaceNormals(ifs);
    IndexedFaceSetUtility.calculateAndSetVertexNormals(ifs);
  }
  
  /**
   * Calculate and set vertex normals for an IndexedFaceSet
   * @param {IndexedFaceSet} ifs - Face set to process
   */
  static calculateAndSetVertexNormals(ifs) {
    if (ifs.getNumFaces() === 0) return;
    const vn = IndexedFaceSetUtility.calculateVertexNormals(ifs);
    const normalDataList = toDataList(vn);
    ifs.setVertexAttribute(GeometryAttribute.NORMALS, normalDataList);
  }
  
  /**
   * Calculate face normals for an IndexedFaceSet
   * @param {IndexedFaceSet} ifs - Face set to process
   * @returns {number[][]} Array of face normals
   */
  static calculateFaceNormals(ifs) {
    const sigO = ifs.getGeometryAttribute(GeometryUtility.METRIC);
    let sig = EUCLIDEAN;
    if (sigO != null && typeof sigO === 'number') {
      sig = sigO;
      logger.finer(Category.ALL, 'Calculating normals with metric ' + sig);
    }
    return IndexedFaceSetUtility.calculateFaceNormalsWithMetric(ifs, sig);
  }
  
  /**
   * Calculate face normals with specific metric
   * @param {IndexedFaceSet} ifs - Face set to process
   * @param {number} metric - Metric to use
   * @returns {number[][]} Array of face normals
   */
  static calculateFaceNormalsWithMetric(ifs, metric) {
    const indicesData = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    const indices = fromDataList(indicesData);
    const vertsData = ifs.getVertexAttribute(GeometryAttribute.COORDINATES);
    const verts = fromDataList(vertsData);
    return IndexedFaceSetUtility.calculateFaceNormalsFromArrays(indices, verts, metric);
  }
  
  /**
   * Calculate face normals from index and vertex arrays
   * @param {number[][]} indices - Face indices
   * @param {number[][]} verts - Vertex coordinates
   * @param {number} metric - Metric to use
   * @returns {number[][]} Array of face normals
   */
  static calculateFaceNormalsFromArrays(indices, verts, metric) {
    if (indices == null) return null;
    let normalLength = 4;
    if (metric === EUCLIDEAN) normalLength = 3;
    
    const fn = Array(indices.length);
    const vertsCopy = verts.map(v => [...v]); // Copy for dehomogenization
    
    if (metric === EUCLIDEAN && vertsCopy[0].length === 4) {
      // Dehomogenize in place
      for (let i = 0; i < vertsCopy.length; i++) {
        Pn.dehomogenize(vertsCopy[i], vertsCopy[i]);
      }
    }
    
    for (let i = 0; i < indices.length; ++i) {
      const n = indices[i].length;
      if (n < 3) continue;
      
      fn[i] = new Array(normalLength);
      
      if (metric === EUCLIDEAN) {
        // Find non-degenerate set of 3 vertices
        let count = 1;
        let v1 = null;
        do {
          v1 = Rn.subtract(null, vertsCopy[indices[i][count++]], vertsCopy[indices[i][0]]);
        } while (Rn.euclideanNorm(v1) < 1e-16 && count < (n - 1));
        
        let v2 = null;
        do {
          v2 = Rn.subtract(null, vertsCopy[indices[i][count++]], vertsCopy[indices[i][0]]);
        } while (Rn.euclideanNorm(v2) < 1e-16 && count < n);
        
        if (count > n) continue;
        
        Rn.crossProduct(fn[i], v1, v2);
        Rn.normalize(fn[i], fn[i]);
      } else {
        // Non-Euclidean case
        const osculatingPlane = P3.planeFromPoints(null, vertsCopy[indices[i][0]], vertsCopy[indices[i][1]], vertsCopy[indices[i][2]]);
        const normal = Pn.polarizePlane(null, osculatingPlane, metric);
        Pn.setToLength(normal, normal, -1.0, metric);
        for (let j = 0; j < normalLength; ++j) {
          fn[i][j] = normal[j];
        }
      }
    }
    
    return fn;
  }
  
  /**
   * Calculate vertex normals for an IndexedFaceSet
   * @param {IndexedFaceSet} ifs - Face set to process
   * @returns {number[][]} Array of vertex normals
   */
  static calculateVertexNormals(ifs) {
    const sigO = ifs.getGeometryAttribute(GeometryUtility.METRIC);
    let sig = EUCLIDEAN;
    if (sigO != null && typeof sigO === 'number') {
      sig = sigO;
    }
    return IndexedFaceSetUtility.calculateVertexNormalsWithMetric(ifs, sig);
  }
  
  /**
   * Calculate vertex normals with specific metric
   * @param {IndexedFaceSet} ifs - Face set to process
   * @param {number} metric - Metric to use
   * @returns {number[][]} Array of vertex normals
   */
  static calculateVertexNormalsWithMetric(ifs, metric) {
    const indicesData = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    const indices = fromDataList(indicesData);
    if (indices == null) return null;
    
    let fn = null;
    const faceNormalsData = ifs.getFaceAttribute(GeometryAttribute.NORMALS);
    if (faceNormalsData == null) {
      fn = IndexedFaceSetUtility.calculateFaceNormalsWithMetric(ifs, metric);
    } else {
      fn = fromDataList(faceNormalsData);
    }
    
    const vertsData = ifs.getVertexAttribute(GeometryAttribute.COORDINATES);
    const vertsAs2D = fromDataList(vertsData);
    
    return IndexedFaceSetUtility.calculateVertexNormalsFromArrays(indices, vertsAs2D, fn, metric);
  }
  
  /**
   * Calculate vertex normals from arrays
   * @param {number[][]} indices - Face indices
   * @param {number[][]} vertsAs2D - Vertex coordinates
   * @param {number[][]} fn - Face normals
   * @param {number} metric - Metric to use
   * @returns {number[][]} Array of vertex normals
   */
  static calculateVertexNormalsFromArrays(indices, vertsAs2D, fn, metric) {
    const n = fn[0].length;
    const nvn = Array(vertsAs2D.length);
    for (let i = 0; i < vertsAs2D.length; i++) {
      nvn[i] = new Array(n).fill(0);
    }
    
    // Accumulate face normals at each vertex
    for (let j = 0; j < indices.length; ++j) {
      for (let k = 0; k < indices[j].length; ++k) {
        const m = indices[j][k];
        Rn.add(nvn[m], fn[j], nvn[m]);
      }
    }
    
    // Normalize
    if (n === 3 && metric === EUCLIDEAN) {
      Rn.normalize(nvn, nvn);
    } else {
      Pn.normalize(nvn, nvn, metric);
    }
    
    return nvn;
  }
  
  /**
   * Traverse a scene graph, calculating (and setting) face normals for all IndexedFaceSets
   * @param {SceneGraphComponent} c - Root component to traverse
   */
  static calculateFaceNormalsForSceneGraph(c) {
    const map = new Map();
    
    const visitor = new class extends SceneGraphVisitor {
      visitIndexedFaceSet(i) {
        if (i.getFaceAttribute(GeometryAttribute.NORMALS) == null) {
          const n = IndexedFaceSetUtility.calculateFaceNormals(i);
          map.set(i, n);
        }
        super.visitIndexedFaceSet(i);
      }
      
      visitComponent(c) {
        c.childrenAccept(this);
      }
    };
    
    visitor.visitComponent(c);
    
    // Set normals after traversal (due to locking)
    for (const [ifs, n] of map) {
      const nLength = n[0].length;
      const normalDataList = toDataList(n);
      ifs.setFaceAttribute(GeometryAttribute.NORMALS, normalDataList);
    }
  }
  
  /**
   * Traverse a scene graph, calculating (and setting) vertex normals for all IndexedFaceSets
   * @param {SceneGraphComponent} c - Root component to traverse
   */
  static calculateVertexNormalsForSceneGraph(c) {
    const map = new Map();
    
    const visitor = new class extends SceneGraphVisitor {
      visitIndexedFaceSet(i) {
        if (i.getVertexAttribute(GeometryAttribute.NORMALS) == null) {
          const n = IndexedFaceSetUtility.calculateVertexNormals(i);
          map.set(i, n);
        }
        super.visitIndexedFaceSet(i);
      }
      
      visitComponent(c) {
        c.childrenAccept(this);
      }
    };
    
    visitor.visitComponent(c);
    
    // Set normals after traversal (due to locking)
    for (const [ifs, n] of map) {
      const nLength = n[0].length;
      const normalDataList = toDataList(n);
      ifs.setVertexAttribute(GeometryAttribute.NORMALS, normalDataList);
    }
  }
  
  /**
   * Get the vector length (dimension) from a DataList
   * @param {DataList} dl - DataList to check
   * @returns {number} Vector length
   * @private
   */
  static #getVectorLength(dl) {
    if (dl == null) return 0;
    const shape = dl.shape;
    if (shape.length === 0) return 0;
    
    // The last dimension is the vector length
    let vl = shape[shape.length - 1];
    
    // If not set (shouldn't happen with our DataList, but handle it)
    if (vl === -1 || vl === undefined) {
      // Assume uniform - get first item and check its size
      const firstItem = dl.item(0);
      if (Array.isArray(firstItem)) {
        vl = firstItem.length;
      } else {
        vl = 1; // Scalar
      }
    }
    
    return vl;
  }
  
  /**
   * Get the vector length from a PointSet
   * @param {PointSet} ps - Point set to check
   * @returns {number} Vector length
   * @private
   */
  static #getVectorLengthFromPointSet(ps) {
    const vv = ps.getVertexAttribute(GeometryAttribute.COORDINATES);
    return IndexedFaceSetUtility.#getVectorLength(vv);
  }
  
  /**
   * Binary refine an IndexedFaceSet (subdivide each triangle into 4 triangles)
   * Only applicable for IndexedFaceSets all of whose faces are triangles.
   * @param {IndexedFaceSet} ifs - Face set to refine
   * @returns {IndexedFaceSet}
   */
  static binaryRefine(ifs) {
    const indicesData = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    const indices = fromDataList(indicesData);
    
    for (let i = 0; i < indices.length; ++i) {
      if (indices[i].length !== 3) {
        throw new Error("Indexed face set must consist of triangles");
      }
    }
    
    const eindicesData = ifs.getEdgeAttribute(GeometryAttribute.INDICES);
    const eindices = fromDataList(eindicesData);
    
    for (let i = 0; i < eindices.length; ++i) {
      if (eindices[i].length !== 2) {
        throw new Error("Indexed face set edges must all be line segments (no curves)");
      }
    }
    
    const edgeVals = new Map();
    
    // The new triangulation will have:
    //   vertices: V + E
    //   edges: 2E + 3F
    //   faces: 4F
    const numVerts = ifs.getNumPoints();
    const numFaces = ifs.getNumFaces();
    const numEdges = ifs.getNumEdges();
    const vLength = IndexedFaceSetUtility.#getVectorLengthFromPointSet(ifs);
    const newSize = numVerts + numEdges;
    
    const nvd = Array(newSize).fill(null).map(() => new Array(vLength));
    const oldpptr = fromDataList(ifs.getVertexAttribute(GeometryAttribute.COORDINATES));
    
    // Copy over the existing vertices
    for (let i = 0; i < numVerts; ++i) {
      nvd[i] = [...oldpptr[i]];
    }
    
    const newIndices = Array(4 * numFaces).fill(null).map(() => new Array(3));
    const index = new Array(3);
    let nV = numVerts;
    let nF = 0;
    
    for (let i = 0; i < numFaces; ++i) {
      // Create the new points
      for (let j = 0; j < 3; ++j) {
        const v1 = indices[i][(j + 1) % 3];
        const v2 = indices[i][(j + 2) % 3];
        const kk = (v1 > v2) ? (v1 << 15) + v2 : (v2 << 15) + v1; // Same for either order!
        const key = kk;
        const value = edgeVals.get(key);
        
        if (value != null) {
          // Reuse old vertex
          index[j] = value;
        } else {
          // New vertex creation
          index[j] = nV;
          Rn.add(nvd[nV], oldpptr[v1], oldpptr[v2]);
          Rn.times(nvd[nV], 0.5, nvd[nV]);
          edgeVals.set(key, nV);
          nV++;
          if (nV > newSize) {
            // TODO indicate error!
            return null;
          }
        }
      }
      
      // The internal new face
      for (let k = 0; k < 3; ++k) {
        newIndices[nF][k] = index[k];
      }
      // The other three new faces
      nF++;
      newIndices[nF][0] = indices[i][0];
      newIndices[nF][1] = index[2];
      newIndices[nF][2] = index[1];
      nF++;
      newIndices[nF][0] = indices[i][1];
      newIndices[nF][1] = index[0];
      newIndices[nF][2] = index[2];
      nF++;
      newIndices[nF][0] = indices[i][2];
      newIndices[nF][1] = index[1];
      newIndices[nF][2] = index[0];
      nF++;
    }
    
    const ifsf = new IndexedFaceSetFactory();
    ifsf.setVertexCount(nvd.length);
    ifsf.setVertexCoordinates(nvd);
    ifsf.setFaceCount(newIndices.length);
    ifsf.setFaceIndices(newIndices);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.update();
    console.log("binaryRefine: "+nvd.length+' '+ifsf.getEdgeCount()+' '+newIndices.length);
    return ifsf.getIndexedFaceSet();
  }
  
  /**
   * Simple triangulation - fan triangulation from first vertex
   * Edits the input IFS in place
   * @param {IndexedFaceSet} ifs - Face set to triangulate
   */
  static simpleTriangulate(ifs) {
    let triCount = 0;
    const n = ifs.getNumFaces();
    const indicesData = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    const oldIndices = fromDataList(indicesData);
    
    for (let i = 0; i < n; ++i) {
      if (oldIndices[i].length < 3) continue;
      triCount += oldIndices[i].length - 2;
    }
    
    const newIndices = Array(triCount).fill(null).map(() => new Array(3));
    triCount = 0;
    
    for (let i = 0; i < n; ++i) {
      const oldFace = oldIndices[i];
      if (oldFace.length < 3) continue;
      for (let j = 0; j < oldFace.length - 2; ++j) {
        newIndices[triCount][0] = oldFace[0];
        newIndices[triCount][1] = oldFace[j + 1];
        newIndices[triCount][2] = oldFace[j + 2];
        triCount++;
      }
    }
    
    const indicesDataList = toDataList(newIndices, null, 'int32');
    const faceAttrs = new Map();
    faceAttrs.set(GeometryAttribute.INDICES, indicesDataList);
    ifs.setFaceCountAndAttributes(faceAttrs);
    
    if (ifs.getEdgeAttribute(GeometryAttribute.INDICES) != null) {
      IndexedFaceSetUtility.calculateAndSetEdgesFromFaces(ifs);
    }
  }
  
  /**
   * Triangulate an IndexedFaceSet (ear-clipping algorithm)
   * Note: This method has known issues with infinite loops in degenerate cases
   * @param {IndexedFaceSet} fs - Face set to triangulate
   * @returns {IndexedFaceSet} New triangulated face set
   */
  static triangulate(fs) {
    const ts = new IndexedFaceSet();
    
    // Copy vertex and edge attributes
    const vertexAttrs = fs.getVertexAttributes();
    ts.setVertexCountAndAttributes(vertexAttrs);
    
    const edgeAttrs = fs.getEdgeAttributes();
    ts.setEdgeCountAndAttributes(edgeAttrs);
    
    const n = fs.getNumFaces();
    const faceDL = fs.getFaceAttribute(GeometryAttribute.INDICES);
    const pointDL = fs.getVertexAttribute(GeometryAttribute.COORDINATES);
    let fNormalDL = fs.getFaceAttribute(GeometryAttribute.NORMALS);
    
    if (fNormalDL == null) {
      const fn = IndexedFaceSetUtility.calculateFaceNormals(fs);
      fNormalDL = toDataList(fn);
    }
    
    const faces = fromDataList(faceDL);
    const points = fromDataList(pointDL);
    const faceNormals = fromDataList(fNormalDL);
    
    // Place the new triangles here
    const triangles = [];
    
    // Iterate over all polygons
    for (let i = 0; i < n; i++) {
      const faceIndices = faces[i];
      
      // Pack the points for this polygon into a list
      const pts = Array(faceIndices.length);
      for (let j = 0; j < faceIndices.length; j++) {
        pts[j] = [...points[faceIndices[j]]];
      }
      
      let normal = [...faceNormals[i]];
      normal = Rn.normalize(null, normal);
      const rotationIdx = IndexedFaceSetUtility.#rotationIndex(normal, pts);
      if (rotationIdx < 0) {
        Rn.times(normal, -1, normal);
      }
      
      // Iterate over triplets of successive points
      const numPts = faceIndices.length;
      let remainingPts = numPts;
      let first = 0, second = 0, third = 0;
      
      while (remainingPts > 3) {
        first = first % numPts;
        // Find three successive points
        while (pts[first] == null) first = (first + 1) % numPts;
        second = (first + 1) % numPts;
        while (pts[second] == null) second = (second + 1) % numPts;
        third = (second + 1) % numPts;
        while (pts[third] == null) third = (third + 1) % numPts;
        
        // Check triangle for degeneracy and test whether any other point is inside
        const p1 = pts[first];
        const p2 = pts[second];
        const p3 = pts[third];
        const e1 = Rn.subtract(null, p2, p1);
        const e2 = Rn.subtract(null, p3, p2);
        const e3 = Rn.subtract(null, p1, p3);
        
        const cnormal = Rn.crossProduct(null, e2, e1);
        const d = Rn.innerProduct(normal, cnormal);
        
        if (Math.abs(d) < IndexedFaceSetUtility.#EPS) {
          console.warn("Warning degenerate triangle in triangulate... dropping " + second);
          console.warn(" ->" + first + " " + second + " " + third);
          pts[second] = null;
          remainingPts--;
          first = second;
          continue;
        }
        
        if (d < 0) {
          first++;
          continue;
        }
        
        let allOutside = true;
        for (let k = 0; k < numPts; k++) {
          if (pts[k] == null || k === first || k === second || k === third) continue;
          const p4 = pts[k];
          let dir = Rn.subtract(null, p4, p1);
          const s1 = Rn.innerProduct(normal, Rn.crossProduct(null, e1, dir));
          dir = Rn.subtract(null, p4, p2);
          const s2 = Rn.innerProduct(normal, Rn.crossProduct(null, e2, dir));
          dir = Rn.subtract(null, p4, p3);
          const s3 = Rn.innerProduct(normal, Rn.crossProduct(null, e3, dir));
          
          if (s1 < 0 && s2 < 0 && s3 < 0) {
            allOutside = false;
            break;
          }
        }
        
        if (!allOutside) {
          first++;
          continue;
        }
        
        // Add the triangle to the list and remove the middle point
        triangles.push([faceIndices[first], faceIndices[second], faceIndices[third]]);
        pts[second] = null;
        remainingPts--;
        first++;
      }
      
      // Add final triangle
      while (pts[first] == null) first = (first + 1) % numPts;
      second = (first + 1) % numPts;
      while (pts[second] == null) second = (second + 1) % numPts;
      third = (second + 1) % numPts;
      while (pts[third] == null) third = (third + 1) % numPts;
      triangles.push([faceIndices[first], faceIndices[second], faceIndices[third]]);
    }
    
    const faceIndicesDataList = toDataList(triangles, null, 'int32');
    const faceAttrs = new Map();
    faceAttrs.set(GeometryAttribute.INDICES, faceIndicesDataList);
    ts.setFaceCountAndAttributes(faceAttrs);
    
    IndexedFaceSetUtility.calculateAndSetNormals(ts);
    return ts;
  }
  
  /**
   * Calculate rotation index for a polygon
   * @param {number[]} normal - Face normal
   * @param {number[][]} pts - Points of the polygon
   * @returns {number} Rotation index
   * @private
   */
  static #rotationIndex(normal, pts) {
    // Simplified implementation - returns 1 for counter-clockwise, -1 for clockwise
    // Full implementation would calculate the actual rotation index
    if (pts.length < 3) return 0;
    
    // Calculate signed area
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      area += p1[0] * p2[1] - p2[0] * p1[1];
    }
    
    return area > 0 ? 1 : -1;
  }
  
  /**
   * For each face of ifs, replace it with a face gotten by:
   * - if factor > 0: a shrunken version of the face (factor == 1 gives original face), or
   * - if factor < 0: a hole is cut out of the face, corresponding to the shrunken version with the
   *   same absolute value.
   * 
   * @param {IndexedFaceSet} ifs - Face set to implode
   * @param {number} factor - Implode factor (positive = shrink, negative = hole)
   * @returns {IndexedFaceSet} New imploded face set
   */
  static implode(ifs, factor) {
    // Get metric from geometry attributes
    let metric = EUCLIDEAN;
    const metricAttr = ifs.getGeometryAttribute(GeometryUtility.METRIC);
    if (metricAttr != null && typeof metricAttr === 'number') {
      metric = metricAttr;
    }
    
    // Check if edges should be created (only if original had edges)
    const makeEdges = ifs.getEdgeAttribute(GeometryAttribute.INDICES) != null;
    
    // Count total vertices needed
    const indicesData = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    const indices = fromDataList(indicesData);
    let vertcount = 0;
    for (let i = 0; i < indices.length; ++i) {
      vertcount += indices[i].length;
    }
    
    // Get vertex coordinates
    const vertsData = ifs.getVertexAttribute(GeometryAttribute.COORDINATES);
    let oldverts = fromDataList(vertsData);
    const vectorLength = oldverts[0].length;
    const fiber = vectorLength;
    
    // Dehomogenize if needed (convert 4D to 3D)
    if (vectorLength !== 3) {
      const oldverts2 = Array(oldverts.length);
      for (let i = 0; i < oldverts.length; i++) {
        oldverts2[i] = new Array(3);
        Pn.dehomogenize(oldverts2[i], oldverts[i]);
      }
      oldverts = oldverts2;
    }
    
    const implode = -factor; // Invert factor for calculation
    let newind, newverts, imploded;
    
    if (implode > 0.0) {
      // Positive implode: shrink faces toward center
      newind = Array(indices.length);
      newverts = Array(vertcount).fill(null).map(() => new Array(3));
      
      for (let i = 0, count = 0; i < indices.length; ++i) {
        const thisf = indices[i];
        newind[i] = new Array(thisf.length);
        
        // Calculate face center
        const center = new Array(3).fill(0);
        for (let j = 0; j < thisf.length; ++j) {
          Rn.add(center, oldverts[thisf[j]], center);
          newind[i][j] = count + j;
        }
        Rn.times(center, 1.0 / thisf.length, center);
        
        // Move vertices toward center
        const diff = new Array(3);
        for (let j = 0; j < thisf.length; ++j) {
          Rn.subtract(diff, oldverts[thisf[j]], center);
          Rn.times(diff, implode, diff);
          Rn.add(newverts[count + j], center, diff);
        }
        count += thisf.length;
      }
      
      // Get face normals and colors if present
      let fn = null;
      const faceNormalsData = ifs.getFaceAttribute(GeometryAttribute.NORMALS);
      if (faceNormalsData != null) {
        fn = fromDataList(faceNormalsData);
      } else {
        fn = IndexedFaceSetUtility.calculateFaceNormalsWithMetric(ifs, metric);
      }
      
      let fc = null;
      const faceColorsData = ifs.getFaceAttribute(GeometryAttribute.COLORS);
      if (faceColorsData != null) {
        fc = fromDataList(faceColorsData);
      }
      
      // Create new IndexedFaceSet
      const ifsf = new IndexedFaceSetFactory();
      ifsf.setVertexCount(vertcount);
      ifsf.setFaceCount(indices.length);
      
      // Homogenize if original was 4D
      if (fiber === 4) {
        const newverts4 = Array(newverts.length);
        for (let i = 0; i < newverts.length; i++) {
          newverts4[i] = new Array(4);
          Pn.homogenize(newverts4[i], newverts[i]);
        }
        newverts = newverts4;
      }
      
      ifsf.setVertexCoordinates(newverts);
      ifsf.setFaceIndices(newind);
      ifsf.setMetric(metric);
      if (fn != null) {
        ifsf.setFaceNormals(fn);
      } else {
        ifsf.setGenerateFaceNormals(true);
      }
      if (fc != null) {
        ifsf.setFaceColors(fc);
      }
      ifsf.setGenerateEdgesFromFaces(makeEdges);
      ifsf.update();
      imploded = ifsf.getIndexedFaceSet();
      
    } else {
      // Negative implode: create holes (quad faces)
      const oldcount = oldverts.length;
      newind = Array(vertcount).fill(null).map(() => new Array(4));
      newverts = Array(vertcount + oldcount).fill(null).map(() => new Array(3));
      
      // Copy original vertices
      for (let i = 0; i < oldcount; ++i) {
        newverts[i] = [...oldverts[i]];
      }
      
      let fcd = null, nfcd = null;
      const faceColorsData = ifs.getFaceAttribute(GeometryAttribute.COLORS);
      if (faceColorsData != null) {
        fcd = fromDataList(faceColorsData);
        nfcd = Array(vertcount);
      }
      
      for (let i = 0, count = 0; i < indices.length; ++i) {
        const thisf = indices[i];
        const center = new Array(3).fill(0);
        
        for (let j = 0; j < thisf.length; ++j) {
          Rn.add(center, oldverts[thisf[j]], center);
          // Create quad face indices
          newind[count + j][0] = thisf[j];
          newind[count + j][1] = thisf[(j + 1) % thisf.length];
          newind[count + j][2] = oldcount + count + ((j + 1) % thisf.length);
          newind[count + j][3] = oldcount + count + j;
          if (fcd != null) {
            nfcd[count + j] = fcd[i];
          }
        }
        Rn.times(center, 1.0 / thisf.length, center);
        
        // Move vertices away from center (opposite direction)
        const diff = new Array(3);
        for (let j = 0; j < thisf.length; ++j) {
          Rn.subtract(diff, center, oldverts[thisf[j]]);
          Rn.times(diff, -implode, diff);
          Rn.add(newverts[oldcount + count + j], oldverts[thisf[j]], diff);
        }
        count += thisf.length;
      }
      
      // Create new IndexedFaceSet
      const ifsf = new IndexedFaceSetFactory();
      ifsf.setMetric(metric);
      ifsf.setVertexCount(vertcount + oldcount);
      ifsf.setFaceCount(vertcount);
      
      // Homogenize if original was 4D
      if (fiber === 4) {
        const newverts4 = Array(newverts.length);
        for (let i = 0; i < newverts.length; i++) {
          newverts4[i] = new Array(4);
          Pn.homogenize(newverts4[i], newverts[i]);
        }
        newverts = newverts4;
      }
      
      ifsf.setVertexCoordinates(newverts);
      ifsf.setFaceIndices(newind);
      if (nfcd != null) {
        ifsf.setFaceColors(nfcd);
      }
      ifsf.setGenerateFaceNormals(true);
      ifsf.setGenerateEdgesFromFaces(makeEdges);
      ifsf.update();
      imploded = ifsf.getIndexedFaceSet();
    }
    
    return imploded;
  }
}
