/**
 * JavaScript port/translation of jReality's PickResult interface.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/** @typedef {import('../SceneGraphPath.js').SceneGraphPath} SceneGraphPath */

/**
 * Interface for pick results.
 * 
 * TODO: document PickResult
 * TODO: add support for picking vertices, edges, faces, etc.
 * 
 * @interface
 */
export class PickResult {
  /**
   * Pick type constant: object
   * @type {number}
   */
  static PICK_TYPE_OBJECT = 0;
  
  /**
   * Pick type constant: face
   * @type {number}
   */
  static PICK_TYPE_FACE = 1;
  
  /**
   * Pick type constant: line/edge
   * @type {number}
   */
  static PICK_TYPE_LINE = 2;
  
  /**
   * Pick type constant: point
   * @type {number}
   */
  static PICK_TYPE_POINT = 4;
  
  /**
   * Get the scene graph path to the picked object
   * @returns {SceneGraphPath}
   */
  getPickPath() {
    throw new Error('getPickPath() must be implemented');
  }
  
  /**
   * Get pick point in world coordinates
   * @returns {number[]} Point coordinates [x, y, z, w]
   */
  getWorldCoordinates() {
    throw new Error('getWorldCoordinates() must be implemented');
  }
  
  /**
   * Get pick point in object coordinates
   * @returns {number[]} Point coordinates [x, y, z, w]
   */
  getObjectCoordinates() {
    throw new Error('getObjectCoordinates() must be implemented');
  }
  
  /**
   * Get the index of the picked face/edge/point
   * @returns {number} The index or -1 if not available
   */
  getIndex() {
    throw new Error('getIndex() must be implemented');
  }
  
  /**
   * Get the secondary index (e.g., triangle index within a face)
   * @returns {number} The secondary index or -1 if not available
   */
  getSecondaryIndex() {
    throw new Error('getSecondaryIndex() must be implemented');
  }
  
  /**
   * Get the type of the pick:
   * - PICK_TYPE_OBJECT
   * - PICK_TYPE_FACE
   * - PICK_TYPE_LINE
   * - PICK_TYPE_POINT
   * @returns {number}
   */
  getPickType() {
    throw new Error('getPickType() must be implemented');
  }
  
  /**
   * Get texture coordinates if available
   * @returns {number[]|null} The texture coordinates or null
   */
  getTextureCoordinates() {
    throw new Error('getTextureCoordinates() must be implemented');
  }
}

