/**
 * Abstract base class for 2D viewers.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Abstract base class for 2D viewers
// Handles device-independent scene graph and camera management
// Subclasses implement device-specific rendering

import { Viewer, Dimension } from '../scene/Viewer.js';
import * as P3 from '../math/P3.js';
import { Rectangle2D } from '../scene/Camera.js';
import * as CameraUtility from '../util/CameraUtility.js';

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */
/** @typedef {import('../scene/Camera.js').Camera} Camera */

/**
 * Abstract base class for 2D rendering viewers.
 * Handles scene graph management, camera setup, and projection computation.
 * Subclasses implement device-specific rendering methods.
 */
export class Abstract2DViewer extends Viewer {

  /** @type {SceneGraphComponent|null} */
  #sceneRoot = null;

  /** @type {SceneGraphPath|null} */
  #cameraPath = null;

  /**
   * Create a new Abstract2DViewer
   */
  constructor() {
    super();
  }

  // Viewer interface implementation

  getSceneRoot() {
    return this.#sceneRoot;
  }

  setSceneRoot(root) {
    this.#sceneRoot = root;
  }

  getCameraPath() {
    return this.#cameraPath;
  }

  setCameraPath(cameraPath) {
    this.#cameraPath = cameraPath;
  }

  /**
   * Render the scene
   * Subclasses should override to create their specific renderer
   */
  render() {
    throw new Error('Abstract method render() must be implemented by subclass');
  }

  hasViewingComponent() {
    return true;
  }

  /**
   * Get the viewing component (device-specific)
   * @returns {*} The viewing component (canvas, SVG, etc.)
   */
  getViewingComponent() {
    throw new Error('Abstract method getViewingComponent() must be implemented by subclass');
  }

  /**
   * Get the viewing component size (device-specific)
   * @returns {Dimension}
   */
  getViewingComponentSize() {
    throw new Error('Abstract method getViewingComponentSize() must be implemented by subclass');
  }

  canRenderAsync() {
    return true;
  }

  renderAsync() {
    requestAnimationFrame(() => this.render());
  }

  // Protected helper methods for subclasses

  /**
   * Get camera from camera path
   * Uses CameraUtility.getCamera()
   * @protected
   * @returns {Camera|null}
   */
  _getCamera() {
    try {
      return CameraUtility.getCamera(this);
    } catch (e) {
      // CameraUtility throws if no camera is found
      return null;
    }
  }

  /**
   * Compute projection matrix for the camera
   * @protected
   * @param {Camera} camera
   * @param {number} aspect - Aspect ratio (width/height)
   * @returns {number[]} 4x4 projection matrix
   */
  _computeCam2NDCMatrix(camera, aspect) {
    const projMatrix = new Array(16);
    
    if (camera.isPerspective()) {
      // Perspective projection
      const fov = camera.getFieldOfView() * Math.PI / 180; // Convert to radians
      const near = camera.getNear();
      const far = camera.getFar();
      
      P3.makePerspectiveProjectionMatrix(projMatrix, fov, aspect, near, far);
    } else {
      // Orthographic projection
      const size = 5;
      const left = -size * aspect;
      const right = size * aspect;
      const bottom = -size;
      const top = size;
      const near = camera.getNear();
      const far = camera.getFar();
      const vp = new Rectangle2D(left, bottom, right - left, top - bottom);
      P3.makeOrthographicProjectionMatrix(projMatrix, vp, near, far);
    }

    return projMatrix;
  }
}

