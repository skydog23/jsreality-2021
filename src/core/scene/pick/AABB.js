/**
 * JavaScript port/translation of jReality's AABB (Axis-Aligned Bounding Box) class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as Rn from '../../math/Rn.js';

/**
 * An Axis Aligned Bounding Box.
 * 
 * @author Steffen Weissmann
 */
export class AABB {
  /**
   * @type {number[]} Center of the bounding box
   */
  center = [0, 0, 0];
  
  /**
   * @type {number[]} Extents of the box along the x,y,z axis
   */
  extent = [0, 0, 0];
  
  /**
   * @type {number[]} Temporary vector for intersection calculations
   */
  #tmpVec1 = new Array(3);
  
  /**
   * @type {number[]} Temporary vector for intersection calculations
   */
  #tmpVec2 = new Array(3);
  
  /**
   * Compute bounding box from array of triangles
   * @param {TreePolygon[]} tris - Array of tree polygons
   * @param {number} start - Start index (inclusive)
   * @param {number} end - End index (inclusive)
   */
  compute(tris, start, end) {
    const min = [...tris[start].getVertices()[0]];
    const max = [...min];
    let point;
    
    for (let i = start; i <= end; i++) {
      const points = tris[i].getVertices();
      for (let j = 0; j < points.length; j++) {
        point = points[j];
        if (point[0] < min[0]) {
          min[0] = point[0];
        } else if (point[0] > max[0]) {
          max[0] = point[0];
        }
        if (point[1] < min[1]) {
          min[1] = point[1];
        } else if (point[1] > max[1]) {
          max[1] = point[1];
        }
        if (point[2] < min[2]) {
          min[2] = point[2];
        } else if (point[2] > max[2]) {
          max[2] = point[2];
        }
      }
    }
    
    Rn.times(this.center, 0.5, Rn.add(null, min, max));
    this.extent[0] = max[0] - this.center[0];
    this.extent[1] = max[1] - this.center[1];
    this.extent[2] = max[2] - this.center[2];
  }
  
  /**
   * Check if ray intersects this bounding box
   * @param {number[]} from - Ray start point
   * @param {number[]} dir - Ray direction vector
   * @returns {boolean} True if ray intersects bounding box
   */
  intersects(from, dir) {
    const X = [1, 0, 0, 0];
    const Y = [0, 1, 0, 0];
    const Z = [0, 0, 1, 0];
    
    const diff = Rn.subtract(null, from, this.center);
    
    if (Math.abs(diff[0]) > this.extent[0] && diff[0] * dir[0] >= 0.0) return false;
    if (Math.abs(diff[1]) > this.extent[1] && diff[1] * dir[1] >= 0.0) return false;
    if (Math.abs(diff[2]) > this.extent[2] && diff[2] * dir[2] >= 0.0) return false;
    
    this.#tmpVec1[0] = Math.abs(dir[0]);
    this.#tmpVec1[1] = Math.abs(dir[1]);
    this.#tmpVec1[2] = Math.abs(dir[2]);
    
    const wCrossD = Rn.crossProduct(null, dir, diff);
    this.#tmpVec2[0] = Math.abs(Rn.innerProduct(wCrossD, X));
    let rhs = this.extent[1] * this.#tmpVec1[2] + this.extent[2] * this.#tmpVec1[1];
    if (this.#tmpVec2[0] > rhs) return false;
    
    this.#tmpVec2[1] = Math.abs(Rn.innerProduct(wCrossD, Y));
    rhs = this.extent[0] * this.#tmpVec1[2] + this.extent[2] * this.#tmpVec1[0];
    if (this.#tmpVec2[1] > rhs) return false;
    
    this.#tmpVec2[2] = Math.abs(Rn.innerProduct(wCrossD, Z));
    rhs = this.extent[0] * this.#tmpVec1[1] + this.extent[1] * this.#tmpVec1[0];
    if (this.#tmpVec2[2] > rhs) return false;
    
    return true;
  }
}

