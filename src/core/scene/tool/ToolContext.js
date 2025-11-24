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
 * @typedef {import('../Viewer.js').Viewer} Viewer
 * @typedef {import('../SceneGraphPath.js').SceneGraphPath} SceneGraphPath
 * @typedef {import('../pick/PickResult.js').PickResult} PickResult
 * @typedef {import('../pick/PickSystem.js').PickSystem} PickSystem
 * @typedef {import('./InputSlot.js').InputSlot} InputSlot
 * @typedef {import('./AxisState.js').AxisState} AxisState
 */

/**
 * Interface providing context during tool execution.
 * Provides access to viewer, input states, scene graph paths, pick results, etc.
 * 
 * @interface
 */
export class ToolContext {
  /**
   * Get the viewer associated with this tool context
   * @returns {Viewer} The viewer
   */
  getViewer() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the source InputSlot that triggers activation/perform/deactivate
   * @returns {InputSlot} The source input slot
   */
  getSource() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the transformation matrix for the given InputSlot.
   * Returns a 4x4 matrix as an array of 16 numbers (column-major order).
   * @param {InputSlot} slot - The input slot
   * @returns {number[]|null} 4x4 transformation matrix (16 numbers) or null if not available
   */
  getTransformationMatrix(slot) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the AxisState for the given InputSlot
   * @param {InputSlot} slot - The input slot
   * @returns {AxisState|null} The axis state or null if not available
   */
  getAxisState(slot) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the time stamp of the event that's currently being processed
   * @returns {number} Time stamp in milliseconds
   */
  getTime() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the path to the current tool if tool is not activated by picking,
   * path to pick otherwise.
   * @returns {SceneGraphPath} The path from root to local
   */
  getRootToLocal() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the path to the component where the current tool is attached
   * @returns {SceneGraphPath} The path from root to tool component
   */
  getRootToToolComponent() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the current pick result (first pick if multiple)
   * @returns {PickResult|null} The current pick result or null if no pick
   */
  getCurrentPick() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get all current pick results
   * @returns {PickResult[]} List of pick results
   */
  getCurrentPicks() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the avatar path (for immersive environments)
   * @returns {SceneGraphPath|null} The avatar path or null
   */
  getAvatarPath() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the pick system used for picking
   * @returns {PickSystem} The pick system
   */
  getPickSystem() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Reject activation. A tool calls this method during activation if the context
   * is insufficient for activation. That means the tool is not in activated state
   * after the activate call. Calling this method at any other time than activation,
   * it has absolutely no effect.
   */
  reject() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get a key object for this tool context (used for tool instance management)
   * @returns {*} The key object
   */
  getKey() {
    throw new Error('Method not implemented');
  }
}
