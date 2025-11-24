/**
 * JavaScript port/translation of jReality's Hit class (PickResult implementation).
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Matrix } from '../../math/Matrix.js';
import { IndexedFaceSet } from '../IndexedFaceSet.js';
import { GeometryAttribute } from '../GeometryAttribute.js';
import { PickResult } from './PickResult.js';
import { fromDataList } from '../data/DataUtility.js';
import * as Rn from '../../math/Rn.js';
import * as Pn from '../../math/Pn.js';

/** @typedef {import('../SceneGraphPath.js').SceneGraphPath} SceneGraphPath */

/**
 * Implementation of PickResult with detailed hit information.
 * 
 * @implements {PickResult}
 */
export class Hit extends PickResult {
  /**
   * @type {SceneGraphPath}
   */
  #path;
  
  /**
   * @type {number[]}
   */
  #pointWorld;
  
  /**
   * @type {number[]}
   */
  #pointObject;
  
  /**
   * @type {number[]|null}
   */
  #barycentric;
  
  /**
   * @type {number[]|null}
   */
  #texCoords = null;
  
  /**
   * @type {number}
   */
  #pickType;
  
  /**
   * @type {number}
   */
  #index;
  
  /**
   * @type {number}
   */
  #triIndex;
  
  /**
   * @type {number}
   */
  #dist;
  
  /**
   * @type {number}
   */
  #affineCoordinate; // pointWorld = lambda(from + affineCoord*to)
  
  /**
   * Create a new Hit
   * @param {SceneGraphPath} path - Path to the hit geometry
   * @param {number[]} pointWorld - Hit point in world coordinates
   * @param {number} dist - Distance from ray origin
   * @param {number} affineCoord - Affine coordinate along ray
   * @param {number[]|null} [bary=null] - Barycentric coordinates [u, v, w] or null
   * @param {number} pickType - Pick type (PICK_TYPE_*)
   * @param {number} index - Primary index (face/edge/point index)
   * @param {number} triIndex - Secondary index (triangle index within face)
   */
  constructor(path, pointWorld, dist, affineCoord, bary, pickType, index, triIndex) {
    super();
    this.#path = path;
    const invMatrix = path.getInverseMatrix();
    const m = new Matrix(invMatrix);
    this.#pointWorld = pointWorld;
    this.#pointObject = m.multiplyVector(pointWorld);
    this.#barycentric = bary ? [...bary] : null;
    this.#dist = dist;
    this.#affineCoordinate = affineCoord;
    this.#pickType = pickType;
    this.#index = index;
    this.#triIndex = triIndex;
  }
  
  /**
   * Create a new Hit (convenience constructor without barycentric coordinates)
   * @param {SceneGraphPath} path - Path to the hit geometry
   * @param {number[]} pointWorld - Hit point in world coordinates
   * @param {number} dist - Distance from ray origin
   * @param {number} affineCoord - Affine coordinate along ray
   * @param {number} pickType - Pick type (PICK_TYPE_*)
   * @param {number} index - Primary index (face/edge/point index)
   * @param {number} triIndex - Secondary index (triangle index within face)
   * @returns {Hit}
   */
  static create(path, pointWorld, dist, affineCoord, pickType, index, triIndex) {
    return new Hit(path, pointWorld, dist, affineCoord, null, pickType, index, triIndex);
  }
  
  /**
   * Get the pick path
   * @returns {SceneGraphPath}
   */
  getPickPath() {
    return this.#path;
  }
  
  /**
   * Get world coordinates
   * @returns {number[]}
   */
  getWorldCoordinates() {
    return this.#pointWorld;
  }
  
  /**
   * Get object coordinates
   * @returns {number[]}
   */
  getObjectCoordinates() {
    return this.#pointObject;
  }
  
  /**
   * Get distance from ray origin
   * @returns {number}
   */
  getDist() {
    return this.#dist;
  }
  
  /**
   * Get primary index
   * @returns {number}
   */
  getIndex() {
    return this.#index;
  }
  
  /**
   * Get secondary index (triangle index)
   * @returns {number}
   */
  getSecondaryIndex() {
    return this.#triIndex;
  }
  
  /**
   * Get pick type
   * @returns {number}
   */
  getPickType() {
    return this.#pickType;
  }
  
  /**
   * Get affine coordinate
   * @returns {number}
   */
  getAffineCoordinate() {
    return this.#affineCoordinate;
  }
  
  /**
   * Get barycentric coordinates
   * @returns {number[]|null}
   */
  getBarycentric() {
    return this.#barycentric;
  }
  
  /**
   * Get texture coordinates (lazy evaluation)
   * @returns {number[]|null}
   */
  getTextureCoordinates() {
    this.#hasTextureCoordinates();
    return this.#texCoords;
  }
  
  /**
   * Check and compute texture coordinates if needed
   * @private
   * @returns {number} Length of texture coordinates array
   */
  #hasTextureCoordinates() {
    if (this.#texCoords === null) {
      if (this.#triIndex > -1) {
        const end = this.#path.getLastElement();
        if (end instanceof IndexedFaceSet) {
          const ifs = end;
          const txc = ifs.getVertexAttribute(GeometryAttribute.TEXTURE_COORDINATES);
          if (txc !== null) {
            const indices = ifs.getFaceAttribute(GeometryAttribute.INDICES);
            if (indices !== null) {
              const points = fromDataList(ifs.getVertexAttribute(GeometryAttribute.COORDINATES));
              const faceIndices = fromDataList(indices)[this.#index];
              const l = faceIndices.length;
              const ptIndex0 = faceIndices[0];
              const ptIndex1 = faceIndices[(this.#triIndex + 1) % l];
              const ptIndex2 = faceIndices[(this.#triIndex + 2) % l];
              const tc0 = fromDataList(txc)[ptIndex0];
              const tc1 = fromDataList(txc)[ptIndex1];
              const tc2 = fromDataList(txc)[ptIndex2];
              const textureLength = tc0.length;
              this.#texCoords = new Array(textureLength);
              
              // Get the points
              const a = new Array(3);
              let pt = points[ptIndex0];
              a[0] = pt[0];
              a[1] = pt[1];
              a[2] = pt[2];
              if (pt.length === 4) {
                const w = pt[3];
                a[0] /= w;
                a[1] /= w;
                a[2] /= w;
              }
              
              const b = new Array(3);
              pt = points[ptIndex1];
              b[0] = pt[0];
              b[1] = pt[1];
              b[2] = pt[2];
              if (pt.length === 4) {
                const w = pt[3];
                b[0] /= w;
                b[1] /= w;
                b[2] /= w;
              }
              
              const c = new Array(3);
              pt = points[ptIndex2];
              c[0] = pt[0];
              c[1] = pt[1];
              c[2] = pt[2];
              if (pt.length === 4) {
                const w = pt[3];
                c[0] /= w;
                c[1] /= w;
                c[2] /= w;
              }
              
              const bc = new Array(3);
              Hit.convertToBary(bc, a, b, c, this.#pointObject);
              for (let j = 0; j < textureLength; j++) {
                this.#texCoords[j] = bc[0] * tc0[j] + bc[1] * tc1[j] + bc[2] * tc2[j];
              }
              return this.#texCoords.length;
            }
          }
        }
      }
      this.#texCoords = [];
    }
    return this.#texCoords.length;
  }
  
  /**
   * Calculate barycentric coordinates for a point in a triangle.
   * 
   * Calculates barycentric coordinates bary for point x in triangle defined by x0, x1, x2.
   * Note: bary[i] are not necessarily in range [0, 1].
   * 
   * @param {number[]} bary - Output array for barycentric coordinates [u, v, w]
   * @param {number[]} x0 - First vertex of triangle
   * @param {number[]} x1 - Second vertex of triangle
   * @param {number[]} x2 - Third vertex of triangle
   * @param {number[]} x - Point to compute barycentric coordinates for
   * @returns {boolean} True if successful, false if triangle is degenerate
   */
  static convertToBary(bary, x0, x1, x2, x) {
    const EPS = 0.00001;
    let i0 = 0, i1 = 1, i2 = 2;
    let det;
    
    // Find two linear independent rows
    for (;;) {
      det =
        x1[i0] * x2[i1] -
        x1[i1] * x2[i0] -
        (x0[i0] * x2[i1] - x0[i1] * x2[i0]) +
        x0[i0] * x1[i1] -
        x0[i1] * x1[i0];
      
      if (Math.abs(det) > EPS) {
        break;
      }
      
      if (i1 === 1) {
        i1 = 2;
        i2 = 1;
      } else if (i0 === 0) {
        i0 = 1;
        i2 = 0;
      } else {
        // Triangle is degenerate
        return false;
      }
    }
    
    // Calculate barycentric coordinates
    bary[0] =
      (x1[i0] * x2[i1] - x1[i1] * x2[i0] -
       (x[i0] * x2[i1] - x[i1] * x2[i0]) +
       x[i0] * x1[i1] - x[i1] * x1[i0]) /
      det;
    bary[1] =
      (x[i0] * x2[i1] -
       x[i1] * x2[i0] -
       (x0[i0] * x2[i1] - x0[i1] * x2[i0]) +
       x0[i0] * x[i1] -
       x0[i1] * x[i0]) /
      det;
    bary[2] = 1.0 - bary[0] - bary[1];
    
    // Test third row
    if (Math.abs(x0[i2] * bary[0] + x1[i2] * bary[1] + x2[i2] * bary[2] - x[i2]) > 1e-3) {
      return false;
    }
    
    Hit.#correct(bary);
    return true;
  }
  
  /**
   * Correct barycentric coordinates (normalize and handle zeros)
   * @private
   * @param {number[]} bary - Barycentric coordinates to correct
   */
  static #correct(bary) {
    const EPS = 0.00001;
    let sum = 0;
    let j, k, i = 0;
    
    for (i = 0; i < 3; i++) {
      if (Math.abs(bary[i]) < EPS) {
        bary[i] = 0;
      }
      sum += bary[i];
    }
    
    for (i = 0; bary[i] === 0 && i < 3; i++);
    
    j = (i + 1) % 3;
    k = (i + 2) % 3;
    bary[j] /= sum;
    bary[k] /= sum;
    bary[i] = 1.0 - bary[j] - bary[k];
  }
  
  /**
   * Get name for pick type
   * @private
   * @param {number} pickType - Pick type constant
   * @returns {string}
   */
  #nameForType(pickType) {
    if (pickType === PickResult.PICK_TYPE_FACE) return 'face';
    if (pickType === PickResult.PICK_TYPE_LINE) return 'edge';
    if (pickType === PickResult.PICK_TYPE_POINT) return 'point';
    return 'object';
  }
  
  /**
   * String representation
   * @returns {string}
   */
  toString() {
    const parts = [];
    parts.push('AABB-Pick:');
    parts.push(` dist=${this.#dist}`);
    parts.push(` type=${this.#nameForType(this.#pickType)}`);
    parts.push(` index=${this.#index}`);
    parts.push(` tc=${JSON.stringify(this.getTextureCoordinates())}`);
    parts.push(` world=${JSON.stringify(this.#pointWorld)}`);
    parts.push(` path=${this.#path.toString()}`);
    parts.push(` affine coordinate=${this.#affineCoordinate}`);
    return parts.join(' ');
  }
  
  /**
   * Comparator for sorting hits by distance
   */
  static HitComparator = class {
    /**
     * Compare two hits by affine coordinate (distance along ray)
     * @param {Hit} hit1 - First hit
     * @param {Hit} hit2 - Second hit
     * @returns {number} Negative if hit1 < hit2, positive if hit1 > hit2, 0 if equal
     */
    compare(hit1, hit2) {
      const a = hit1.getAffineCoordinate();
      const b = hit2.getAffineCoordinate();
      return a > b ? 1 : b > a ? -1 : 0;
    }
  };
}

