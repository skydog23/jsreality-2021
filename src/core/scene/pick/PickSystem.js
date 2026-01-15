/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/** @typedef {import('../SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('./PickResult.js').PickResult} PickResult */

/**
 * Interface for picking system implementations.
 * 
 * TODO: document PickSystem
 * 
 * @interface
 */
export class PickSystem {
  /**
   * Set the root of the scene graph to pick from
   * @param {SceneGraphComponent} root - The scene root
   */
  setSceneRoot(root) {
    throw new Error('setSceneRoot() must be implemented');
  }
  
  /**
   * Compute pick results for a ray.
   * 
   * The parameters need to be homogeneous coordinates.
   * 
   * @param {number[]} from - Foot point of ray in world coordinates (x,y,z,1)
   * @param {number[]} to - End point of ray in world coordinates (x,y,z,1) (can be at infinity)
   * Valid pick points are of the form p = a*from+b*to where a*b >= 0
   * That is, the affine coordinate (b/a) of p on the line with basis (from,to) is non-negative
   * @returns {PickResult[]} List of PickResults sorted by distance from foot point
   */
  computePick(from, to) {
    throw new Error('computePick() must be implemented');
  }
}

