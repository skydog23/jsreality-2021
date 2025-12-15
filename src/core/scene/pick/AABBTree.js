/**
 * JavaScript port/translation of jReality's AABBTree class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Matrix } from '../../math/Matrix.js';
import * as P3 from '../../math/P3.js';
import * as Pn from '../../math/Pn.js';
import * as Rn from '../../math/Rn.js';
import { IndexedFaceSet } from '../IndexedFaceSet.js';
import { SceneGraphPath } from '../SceneGraphPath.js';
import { GeometryAttribute } from '../GeometryAttribute.js';
import { fromDataList } from '../data/DataUtility.js';
import { AABB } from './AABB.js';
import { Hit } from './Hit.js';
import { PickResult } from './PickResult.js';
import * as BruteForcePicking from './BruteForcePicking.js';
import { getLogger, Category } from '../../util/LoggingSystem.js';

// Module-level logger shared by AABBTree instances
const logger = getLogger('jsreality.core.scene.pick.AABBTree');
/**
 * An AABB tree for IndexedFaceSets.
 * 
 * TODO: the pick algorithm assumes that polygons are convex...
 * this is easy to change, steal code from tims triangulate non convex poly...
 * 
 * @author Steffen Weissmann
 */
export class AABBTree {
  /**
   * Default number of polygons per leaf
   * @type {number}
   */
  static DEFAULT_POLYS_PER_LEAF = 5;
  
  /**
   * More or less a hack to indicate that a geometry has no pick tree.
   * AABB pick system uses it to avoid processing.
   * @type {AABBTree}
   */
  static nullTree = new AABBTree(null, 0, 1, 0);
  
  /**
   * @type {number} The max number of triangles in a leaf
   */
  #maxPerLeaf;
  
  /**
   * @type {AABBTree|null} Left tree
   */
  #left = null;
  
  /**
   * @type {AABBTree|null} Right tree
   */
  #right = null;
  
  /**
   * @type {AABB|null} Untransformed bounds of this tree
   */
  #bounds = null;
  
  /**
   * @type {TreePolygon[]|null} Array of triangles this tree is indexing
   */
  #tris = null;
  
  /**
   * @type {number} Start triangle index that this node contains
   */
  #myStart;
  
  /**
   * @type {number} End triangle index that this node contains
   */
  #myEnd;
  
  /**
   * Private constructor
   * @param {TreePolygon[]|null} polygons - Array of polygons
   * @param {number} maxPolysPerLeaf - Maximum polygons per leaf
   * @param {number} start - Start index
   * @param {number} end - End index
   */
  constructor(polygons, maxPolysPerLeaf, start, end) {
    this.#maxPerLeaf = maxPolysPerLeaf;
    this.#tris = polygons;
    this.#createTree(start, end);
  }
  
  /**
   * Construct AABB tree from coordinate and face arrays.
   * Can be called with 2 or 3 arguments:
   * - construct(coords, faces) - Uses default maxPolysPerLeaf
   * - construct(coords, faces, maxPolysPerLeaf) - Custom maxPolysPerLeaf
   * - construct(faceSet) - From IndexedFaceSet with default maxPolysPerLeaf
   * - construct(faceSet, maxPolysPerLeaf) - From IndexedFaceSet with custom maxPolysPerLeaf
   * 
   * @param {number[][]|IndexedFaceSet} arg1 - Coordinates array or IndexedFaceSet
   * @param {number[][]|number} [arg2] - Face indices array or maxPolysPerLeaf
   * @param {number} [arg3] - maxPolysPerLeaf (if arg1 is coords)
   * @returns {AABBTree}
   */
  static construct(arg1, arg2, arg3) {
    let polygons, maxPolysPerLeaf;
    
    if (arg1 instanceof IndexedFaceSet) {
      // Called as construct(faceSet) or construct(faceSet, maxPolysPerLeaf)
      polygons = AABBTree.#getMeshAsPolygonsFromFaceSet(arg1);
      maxPolysPerLeaf = (typeof arg2 === 'number') ? arg2 : AABBTree.DEFAULT_POLYS_PER_LEAF;
    } else if (Array.isArray(arg1) && Array.isArray(arg2)) {
      // Called as construct(coords, faces) or construct(coords, faces, maxPolysPerLeaf)
      polygons = AABBTree.#getMeshAsPolygons(arg1, arg2);
      maxPolysPerLeaf = (typeof arg3 === 'number') ? arg3 : AABBTree.DEFAULT_POLYS_PER_LEAF;
    } else {
      throw new Error('AABBTree.construct: invalid arguments');
    }
    
    return AABBTree.#construct(maxPolysPerLeaf, polygons);
  }
  
  /**
   * Internal construct method
   * @private
   * @param {number} maxPolysPerLeaf - Maximum polygons per leaf
   * @param {number[][][]} polygons - Array of polygons
   * @returns {AABBTree}
   */
  static #construct(maxPolysPerLeaf, polygons) {
    const tris = new Array(polygons.length);
    for (let i = 0; i < tris.length; i++) {
      tris[i] = new TreePolygon(polygons[i], i);
    }
    const ret = new AABBTree(tris, maxPolysPerLeaf, 0, tris.length - 1);
    for (let i = 0; i < tris.length; i++) {
      tris[i].disposeCenter();
    }
    return ret;
  }
  
  /**
   * Get mesh as polygons from IndexedFaceSet
   * @private
   * @param {IndexedFaceSet} faceSet - Face set
   * @returns {number[][][]} Array of polygons
   */
  static #getMeshAsPolygonsFromFaceSet(faceSet) {
    const numFaces = faceSet.getNumFaces();
    const ret = new Array(numFaces);
    const faces = fromDataList(faceSet.getFaceAttribute(GeometryAttribute.INDICES));
    const verts = fromDataList(faceSet.getVertexAttribute(GeometryAttribute.COORDINATES));
    
    for (let i = 0; i < numFaces; i++) {
      const face = faces[i];
      const faceLength = face.length;
      ret[i] = new Array(faceLength);
      for (let j = 0; j < faceLength; j++) {
        const vertex = verts[face[j]];
        ret[i][j] = [...vertex]; // Copy vertex
      }
    }
    return ret;
  }
  
  /**
   * Get mesh as polygons from coordinate and face arrays
   * @private
   * @param {number[][]} coords - Vertex coordinates
   * @param {number[][]} faces - Face indices
   * @returns {number[][][]} Array of polygons
   */
  static #getMeshAsPolygons(coords, faces) {
    const numFaces = faces.length;
    const ret = new Array(numFaces);
    for (let i = 0; i < numFaces; i++) {
      const face = faces[i];
      const faceLength = face.length;
      ret[i] = new Array(faceLength);
      for (let j = 0; j < faceLength; j++) {
        ret[i][j] = [...coords[face[j]]]; // Copy coordinate
      }
    }
    return ret;
  }
  
  /**
   * Creates an AABB tree recursively from the tris array
   * @private
   * @param {number} start - Start index (inclusive)
   * @param {number} end - End index (inclusive)
   */
  #createTree(start, end) {
    if (start > end) return;
    this.#myStart = start;
    this.#myEnd = end;
    this.#bounds = new AABB();
    this.#bounds.compute(this.#tris, start, end);
    if (end - start < this.#maxPerLeaf) return;
    
    this.#splitTris(start, end);
    const half = Math.floor((start + end) / 2);
    this.#left = new AABBTree(this.#tris, this.#maxPerLeaf, start, half);
    if (half < end) {
      this.#right = new AABBTree(this.#tris, this.#maxPerLeaf, half + 1, end);
    }
  }
  
  /**
   * Intersect ray with this tree
   * @param {IndexedFaceSet} ifs - Face set
   * @param {number} metric - Metric type
   * @param {SceneGraphPath} path - Path to geometry
   * @param {Matrix} m - Object to world transformation matrix
   * @param {Matrix} mInv - World to object transformation matrix
   * @param {number[]} from - Ray start in world coordinates
   * @param {number[]} to - Ray end in world coordinates
   * @param {Hit[]} hits - Array to append hits to
   */
  intersect(ifs, metric, path, m, mInv, from, to, hits) {
    logger.fine(Category.ALL, `AABBTree.intersect: ${from} ${to}`);
    logger.fine(Category.ALL, `AABBTree.intersect: ${m.toString()}`);
    const fromLocal = mInv.multiplyVector(from);
    const toLocal = mInv.multiplyVector(to);
    const dir = (toLocal.length === 3 || toLocal[3] === 0) ? toLocal : Rn.subtract(null, toLocal, fromLocal);
    
    if (!this.#bounds.intersects(fromLocal, dir)) {
      return;
    }
    
    if (this.#left !== null) {
      this.#left.intersect(ifs, metric, path, m, mInv, from, to, hits);
    }
    
    if (this.#right !== null) {
      this.#right.intersect(ifs, metric, path, m, mInv, from, to, hits);
    } else if (this.#left === null) {
      // Leaf node - test all triangles
      const p1 = [0, 0, 0, 1];
      const p2 = [0, 0, 0, 1];
      const p3 = [0, 0, 0, 1];
      const pobj = [0, 0, 0, 1];
      
      for (let i = this.#myStart; i <= this.#myEnd; i++) {
        const tempt = this.#tris[i];
        for (let j = 0; j < tempt.getNumTriangles(); j++) {
          tempt.getTriangle(j, p1, p2, p3);
          if (BruteForcePicking.intersects(pobj, fromLocal, toLocal, p1, p2, p3, null)) {
            const pw = m.multiplyVector(pobj);
            hits.push(new Hit(path.pushNew(ifs), pw, Pn.distanceBetween(from, pw, metric),
              P3.affineCoordinate(from, to, pw), null, PickResult.PICK_TYPE_FACE, tempt.getIndex(), j));
          }
        }
      }
    }
  }
  
  /**
   * Split triangles according to the largest bounds extent
   * @private
   * @param {number} start - Start index (inclusive)
   * @param {number} end - End index (inclusive)
   */
  #splitTris(start, end) {
    if (this.#bounds.extent[0] > this.#bounds.extent[1]) {
      if (this.#bounds.extent[0] > this.#bounds.extent[2]) {
        this.#sort(start, end, 0);
      } else {
        this.#sort(start, end, 2);
      }
    } else {
      if (this.#bounds.extent[1] > this.#bounds.extent[2]) {
        this.#sort(start, end, 1);
      } else {
        this.#sort(start, end, 2);
      }
    }
  }
  
  /**
   * Sort triangles by projection onto axis
   * @private
   * @param {number} start - Start index
   * @param {number} end - End index
   * @param {number} index - Axis index (0=x, 1=y, 2=z)
   */
  #sort(start, end, index) {
    let tmp = null;
    for (let i = start; i < end; i++) {
      tmp = Rn.subtract(tmp, this.#tris[i].centroid, this.#bounds.center);
      this.#tris[i].projection = tmp[index];
    }
    // Sort by projection (in-place sort of the slice)
    const slice = this.#tris.slice(start, end);
    slice.sort((a, b) => {
      if (a.projection < b.projection) return -1;
      if (a.projection > b.projection) return 1;
      return 0;
    });
    // Copy sorted slice back
    for (let i = 0; i < slice.length; i++) {
      this.#tris[start + i] = slice[i];
    }
  }
}

/**
 * Container for a polygon (triangle fan)
 */
class TreePolygon {
  /**
   * @type {number[][]} Vertices of the polygon
   */
  #verts;
  
  /**
   * @type {number} Projection value for sorting
   */
  projection = 0;
  
  /**
   * @type {number} Original index of this polygon
   */
  #index;
  
  /**
   * @type {number[]|null} Centroid (disposed after tree construction)
   */
  centroid = null;
  
  /**
   * Create a new TreePolygon
   * @param {number[][]} verts - Polygon vertices
   * @param {number} index - Original index
   */
  constructor(verts, index) {
    this.#verts = verts;
    // Handle 4-vectors: dehomogenize each vertex
    if (verts[0].length === 4) {
      this.#verts = new Array(verts.length);
      for (let i = 0; i < verts.length; i++) {
        this.#verts[i] = Pn.dehomogenize(null, verts[i]);
      }
    }
    this.#index = index;
    const count = this.#verts.length;
    this.centroid = [...this.#verts[0]];
    for (let i = 1; i < count; i++) {
      Rn.add(this.centroid, this.centroid, this.#verts[i]);
    }
    Rn.times(this.centroid, 1.0 / count, this.centroid);
  }
  
  /**
   * Dispose centroid (free memory after tree construction)
   */
  disposeCenter() {
    this.centroid = null;
  }
  
  /**
   * Get number of triangles in this polygon (fan triangulation)
   * @returns {number}
   */
  getNumTriangles() {
    return this.#verts.length - 2;
  }
  
  /**
   * Get triangle vertices
   * @param {number} i - Triangle index within polygon
   * @param {number[]} p1 - Output: first vertex
   * @param {number[]} p2 - Output: second vertex
   * @param {number[]} p3 - Output: third vertex
   */
  getTriangle(i, p1, p2, p3) {
    const v0 = this.#verts[0];
    const v1 = this.#verts[i + 1];
    const v2 = this.#verts[i + 2];
    for (let j = 0; j < 3; j++) {
      p1[j] = v0[j];
      p2[j] = v1[j];
      p3[j] = v2[j];
    }
    p1[3] = 1;
    p2[3] = 1;
    p3[3] = 1;
  }
  
  /**
   * Get vertices
   * @returns {number[][]}
   */
  getVertices() {
    return this.#verts;
  }
  
  /**
   * Get original index
   * @returns {number}
   */
  getIndex() {
    return this.#index;
  }
}

