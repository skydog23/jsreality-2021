/**
 * JavaScript port/translation of jReality's Graphics3D class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as Rn from '../../math/Rn.js';
import { Camera } from '../Camera.js';
import { SceneGraphComponent } from '../SceneGraphComponent.js';
import { SceneGraphPath } from '../SceneGraphPath.js';
import { Viewer } from '../Viewer.js';
import * as CameraUtility from '../../util/CameraUtility.js';

/**
 * Graphics context for coordinate transformations.
 * Provides methods to convert between object, world, camera, NDC, and screen coordinates.
 * 
 * @author gunn
 */
export class Graphics3D {
  /**
   * @type {Viewer|null}
   */
  #viewer = null;
  
  /**
   * @type {number}
   */
  #aspectRatio = 1.0;
  
  /**
   * @type {SceneGraphComponent|null}
   */
  #theRoot = null;
  
  /**
   * @type {SceneGraphPath|null}
   */
  #cameraPath = null;
  
  /**
   * @type {Camera|null}
   */
  #camera = null;
  
  /**
   * @type {number[]|null}
   */
  #objectToWorld = null;
  
  /**
   * @type {boolean}
   */
  #fastAndDirty = false;
  
  /**
   * @type {SceneGraphPath|null}
   */
  #currentPath = null;
  
  /**
   * Create a new Graphics3D context.
   * 
   * Can be called with:
   * - Graphics3D(viewer) - From viewer only
   * - Graphics3D(viewer, sceneGraphPath) - From viewer and scene graph path
   * - Graphics3D(cameraPath, sceneGraphPath, aspectRatio) - Full constructor
   * 
   * @param {Viewer|SceneGraphPath} arg1 - Viewer or camera path
   * @param {SceneGraphPath|number|null} [arg2] - Scene graph path or aspect ratio
   * @param {number} [arg3] - Aspect ratio (if arg1 is SceneGraphPath)
   */
  constructor(arg1, arg2 = null, arg3 = undefined) {
    let cp, sgp, ar;
    
    if (arg1 instanceof Viewer) {
      // Called as Graphics3D(viewer) or Graphics3D(viewer, sceneGraphPath)
      this.#viewer = arg1;
      cp = arg1.getCameraPath();
      sgp = arg2;
      ar = CameraUtility.getAspectRatio(arg1);
    } else if (arg1 instanceof SceneGraphPath) {
      // Called as Graphics3D(cameraPath, sceneGraphPath, aspectRatio)
      cp = arg1;
      sgp = arg2;
      ar = arg3 !== undefined ? arg3 : 1.0;
    } else {
      throw new Error('Graphics3D constructor: first argument must be Viewer or SceneGraphPath');
    }
    
    if (sgp !== null && sgp.getLength() > 0) {
      const firstElement = sgp.get(0);
      if (firstElement instanceof SceneGraphComponent) {
        this.#setRoot(firstElement);
      }
    }
    this.#setCameraPath(cp);
    this.#setCurrentPath(sgp);
    this.setAspectRatio(ar);
  }
  
  /**
   * Set aspect ratio
   * @param {number} ar - Aspect ratio
   */
  setAspectRatio(ar) {
    this.#aspectRatio = ar;
  }
  
  /**
   * Set camera path
   * @private
   * @param {SceneGraphPath} cameraPath - Camera path
   */
  #setCameraPath(cameraPath) {
    this.#cameraPath = cameraPath;
    if (this.#cameraPath === null) return;
    const obj = this.#cameraPath.getLastElement();
    if (obj !== null && obj instanceof Camera) {
      this.#camera = obj;
    } else {
      throw new Error('Not a camera path');
    }
  }
  
  /**
   * Set root scene graph component
   * @private
   * @param {SceneGraphComponent} sceneRoot - Scene root
   */
  #setRoot(sceneRoot) {
    if (sceneRoot === null) throw new Error("Root can't be null");
    this.#theRoot = sceneRoot;
  }
  
  /**
   * Get camera path
   * @returns {SceneGraphPath|null}
   */
  getCameraPath() {
    return this.#cameraPath;
  }
  
  /**
   * Get root
   * @returns {SceneGraphComponent|null}
   */
  getRoot() {
    return this.#theRoot;
  }
  
  /**
   * Get camera to NDC transformation matrix
   * @returns {number[]} 4x4 transformation matrix
   */
  getCameraToNDC() {
    if (this.#cameraPath === null) {
      throw new Error('No camera path set for this context');
    }
    return CameraUtility.getCameraToNDC(this.#camera, this.#getAspectRatio());
  }
  
  /**
   * Get aspect ratio (from viewer if available, otherwise stored value)
   * @private
   * @returns {number}
   */
  #getAspectRatio() {
    return this.#viewer === null ? this.#aspectRatio : CameraUtility.getAspectRatio(this.#viewer);
  }
  
  /**
   * Get object to world transformation matrix.
   * If the path is set, then it overrides the object2World matrix value.
   * @returns {number[]} 4x4 transformation matrix
   */
  getObjectToWorld() {
    if (this.#objectToWorld !== null) {
      return this.#objectToWorld;
    }
    if (this.#currentPath !== null) {
      return this.#currentPath.getMatrix();
    }
    return Rn.identityMatrix(4);
  }
  
  /**
   * Get world to object transformation matrix
   * @returns {number[]} 4x4 transformation matrix
   */
  getWorldToObject() {
    return Rn.inverse(null, this.getObjectToWorld());
  }
  
  /**
   * Get world to camera transformation matrix
   * @returns {number[]} 4x4 transformation matrix
   */
  getWorldToCamera() {
    if (this.#cameraPath === null) {
      throw new Error('No camera path');
    }
    return this.#cameraPath.getInverseMatrix();
  }
  
  /**
   * Get camera to world transformation matrix
   * @returns {number[]} 4x4 transformation matrix
   */
  getCameraToWorld() {
    if (this.#cameraPath === null) {
      throw new Error('No camera path');
    }
    return this.#cameraPath.getMatrix();
  }
  
  /**
   * Get world to NDC transformation matrix
   * @returns {number[]} 4x4 transformation matrix
   */
  getWorldToNDC() {
    return Rn.times(null, this.getCameraToNDC(), this.getWorldToCamera());
  }
  
  /**
   * Set object to world transformation matrix
   * @param {number[]} ds - 4x4 transformation matrix
   */
  setObjectToWorld(ds) {
    this.#objectToWorld = [...ds];
  }
  
  /**
   * Get object to camera transformation matrix
   * @returns {number[]} 4x4 transformation matrix
   */
  getObjectToCamera() {
    return Rn.times(null, this.getWorldToCamera(), this.getObjectToWorld());
  }
  
  /**
   * Get camera to object transformation matrix
   * @returns {number[]} 4x4 transformation matrix
   */
  getCameraToObject() {
    return Rn.inverse(null, this.getObjectToCamera());
  }
  
  /**
   * Get object to NDC transformation matrix
   * @returns {number[]} 4x4 transformation matrix
   */
  getObjectToNDC() {
    if (this.#camera === null) {
      throw new Error('No camera for this context');
    }
    return Rn.times(null, CameraUtility.getCameraToNDC(this.#camera, this.#getAspectRatio()), this.getObjectToCamera());
  }
  
  /**
   * Get NDC to object transformation matrix
   * @returns {number[]} 4x4 transformation matrix
   */
  getNDCToObject() {
    if (this.#camera === null) {
      throw new Error('No camera for this context');
    }
    return Rn.inverse(null, Rn.times(null, CameraUtility.getCameraToNDC(this.#camera, this.#getAspectRatio()), this.getObjectToCamera()));
  }
  
  /**
   * Get object to screen transformation matrix
   * @param {HTMLElement} element - Canvas or SVG element
   * @returns {number[]} 4x4 transformation matrix
   */
  getObjectToScreen(element) {
    return Rn.times(null, Graphics3D.getNDCToScreen(element), this.getObjectToNDC());
  }
  
  /**
   * Get NDC to screen transformation matrix.
   * Adapted for browser environment: uses clientWidth/clientHeight instead of Component.getWidth/getHeight.
   * 
   * @param {HTMLElement} element - Canvas or SVG element
   * @returns {number[]} 4x4 transformation matrix
   */
  static getNDCToScreen(element) {
    const NDCToScreen = Rn.identityMatrix(4);
    
    // Get display dimensions (CSS size, not bitmap size)
    const width = element.clientWidth || element.width || 800;
    const height = element.clientHeight || element.height || 600;
    
    NDCToScreen[0] = 0.5 * width;   // X scale
    NDCToScreen[5] = 0.5 * height;  // Y scale
    NDCToScreen[3] = 0.5 * width;   // X translation
    NDCToScreen[7] = 0.5 * height;  // Y translation
    
    // Note: If we need element position relative to viewport:
    // const rect = element.getBoundingClientRect();
    // NDCToScreen[3] += rect.left;
    // NDCToScreen[7] += rect.top;
    
    return NDCToScreen;
  }
  
  /**
   * Get current path
   * @returns {SceneGraphPath|null}
   */
  getCurrentPath() {
    return this.#currentPath;
  }
  
  /**
   * Set current path
   * @param {SceneGraphPath|null} path - Scene graph path
   */
  setCurrentPath(path) {
    this.#currentPath = path;
  }
  
  /**
   * Get NDC to world transformation matrix
   * @returns {number[]} 4x4 transformation matrix
   */
  getNDCToWorld() {
    return Rn.inverse(null, this.getWorldToNDC());
  }
}

