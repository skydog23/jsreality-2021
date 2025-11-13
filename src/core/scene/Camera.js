// JavaScript port of jReality's Camera class (from Camera.java)
// Simplified by removing AWT dependencies and Java-specific logging

import { SceneGraphNode } from './SceneGraphNode.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * Simple rectangle for viewport (replaces java.awt.geom.Rectangle2D)
 */
export class Rectangle2D {
  /**
   * @param {number} x - X coordinate (default 0)
   * @param {number} y - Y coordinate (default 0)
   * @param {number} width - Width (default 0)
   * @param {number} height - Height (default 0)
   */
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /**
   * Get the minimum X coordinate
   * @returns {number}
   */
  getMinX() {
    return this.x;
  }

  /**
   * Get the minimum Y coordinate
   * @returns {number}
   */
  getMinY() {
    return this.y;
  }

  /**
   * Get the maximum X coordinate
   * @returns {number}
   */
  getMaxX() {
    return this.x + this.width;
  }

  /**
   * Get the maximum Y coordinate
   * @returns {number}
   */
  getMaxY() {
    return this.y + this.height;
  }

  /**
   * Get the width
   * @returns {number}
   */
  getWidth() {
    return this.width;
  }

  /**
   * Get the height
   * @returns {number}
   */
  getHeight() {
    return this.height;
  }

  /**
   * Set the rectangle from diagonal corners
   * @param {number} x1 - First corner X
   * @param {number} y1 - First corner Y
   * @param {number} x2 - Second corner X
   * @param {number} y2 - Second corner Y
   */
  setFrameFromDiagonal(x1, y1, x2, y2) {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);
    
    this.x = minX;
    this.y = minY;
    this.width = maxX - minX;
    this.height = maxY - minY;
  }

  /**
   * Create a copy of this rectangle
   * @returns {Rectangle2D}
   */
  clone() {
    return new Rectangle2D(this.x, this.y, this.width, this.height);
  }

  /**
   * Convert to string for debugging
   * @returns {string}
   */
  toString() {
    return `Rectangle2D[x=${this.x}, y=${this.y}, width=${this.width}, height=${this.height}]`;
  }
}

/**
 * Event fired when camera parameters change
 */
export class CameraEvent extends Event {
  /**
   * @param {Camera} source - The camera that changed
   */
  constructor(source) {
    super('cameraChanged');
    this.source = source;
  }
}

/**
 * The camera represents essentially a projection from three dimensions into two, that is
 * a specification of a viewing frustum. The camera coordinate system is assumed to
 * point down the positive z-axis.
 * 
 * All instances of Camera require specifying the near and far clipping planes.
 * 
 * The camera can be either perspective or orthographic. If it is perspective, then
 * its viewing frustum can be specified by giving the field of view. This implies that 
 * the camera is on-axis, that is, the viewing frustum is centered on the z-axis.
 * 
 * There is also support for off-axis cameras. Use the setViewPort method to
 * specify the desired viewport, which is assumed to lie in the z=1 plane.
 * In this case the field of view is ignored.
 * 
 * The camera also supports stereo viewing. For most desktop environments
 * the only other required parameters are:
 * - eye separation, a horizontal displacement in camera coordinates, and
 * - focus, the z-depth where the two images are identical.
 */
export class Camera extends SceneGraphNode {
  
  /**
   * @type {number} Near clipping plane
   */
  #near = 0.5;
  
  /**
   * @type {number} Far clipping plane
   */
  #far = 50.0;
  
  /**
   * @type {number} Field of view in radians
   */
  #fieldOfView = Math.toRadians(60.0);
  
  /**
   * @type {number} Aspect ratio
   */
  #aspectRatio = 1.0;
  
  /**
   * @type {number} Focus distance for stereo
   */
  #focus = 3.0;
  
  /**
   * @type {number} F-stop for depth of field (-1 = disabled)
   */
  #fstop = -1;
  
  /**
   * @type {number} Focal length
   */
  #focalLength = 0.1;
  
  /**
   * @type {Rectangle2D|null} Viewport for off-axis cameras
   */
  #viewPort = null;
  
  /**
   * @type {boolean} Whether camera is on-axis
   */
  #isOnAxis = true;
  
  /**
   * @type {boolean} Whether camera is perspective
   */
  #isPerspective = true;
  
  /**
   * @type {boolean} Whether stereo is enabled
   */
  #isStereo = false;
  
  /**
   * @type {boolean} Whether this is left eye view
   */
  #isLeftEye = false;
  
  /**
   * @type {boolean} Whether this is right eye view
   */
  #isRightEye = false;
  
  /**
   * @type {number} Eye separation for stereo
   */
  #eyeSeparation = 0.07;
  
  /**
   * @type {number[]|null} Orientation matrix for stereo
   */
  #orientationMatrix = null;

  /**
   * @type {number} Counter for unnamed cameras
   */
  static #UNNAMED_ID = 0;

  /**
   * Create a new Camera
   * @param {string} [name] - Name for the camera
   */
  constructor(name) {
    super(name || `camera ${Camera.#UNNAMED_ID++}`);
  }

  /**
   * Get near clipping plane distance
   * @returns {number}
   */
  getNear() {
    return this.#near;
  }

  /**
   * Set near clipping plane distance
   * @param {number} d - The near distance
   */
  setNear(d) {
    if (this.#near !== d) {
      this.#near = d;
      this.#fireCameraChanged();
    }
  }

  /**
   * Get far clipping plane distance
   * @returns {number}
   */
  getFar() {
    return this.#far;
  }

  /**
   * Set far clipping plane distance
   * @param {number} d - The far distance
   */
  setFar(d) {
    if (this.#far !== d) {
      this.#far = d;
      this.#fireCameraChanged();
    }
  }

  /**
   * Get field of view in degrees
   * @returns {number}
   */
  getFieldOfView() {
    return Math.toDegrees(this.#fieldOfView);
  }

  /**
   * Set field of view in degrees
   * @param {number} d - The field of view in degrees
   */
  setFieldOfView(d) {
    const f = Math.toRadians(d);
    if (f !== this.#fieldOfView) {
      this.#fieldOfView = f;
      this.#fireCameraChanged();
    }
  }

  /**
   * Get focus distance for stereo
   * @returns {number}
   */
  getFocus() {
    return this.#focus;
  }

  /**
   * Set focus distance for stereo
   * @param {number} d - The focus distance
   */
  setFocus(d) {
    if (this.#focus !== d) {
      this.#focus = d;
      this.#fireCameraChanged();
    }
  }

  /**
   * Get viewport for off-axis cameras
   * @returns {Rectangle2D|null}
   */
  getViewPort() {
    return this.#viewPort;
  }

  /**
   * Set viewport for off-axis cameras
   * @param {Rectangle2D} rectangle2D - The viewport rectangle
   */
  setViewPort(rectangle2D) {
    if (this.#isOnAxis) {
      throw new Error("Can't set viewport for an on-axis camera");
    }
    this.#viewPort = rectangle2D;
    this.#fireCameraChanged();
  }

  /**
   * Check if camera is on-axis
   * @returns {boolean}
   */
  isOnAxis() {
    return this.#isOnAxis;
  }

  /**
   * Set whether camera is on-axis
   * @param {boolean} b - Whether camera should be on-axis
   */
  setOnAxis(b) {
    if (this.#isOnAxis !== b) {
      this.#isOnAxis = b;
      this.#fireCameraChanged();
    }
  }

  /**
   * Check if camera is perspective
   * @returns {boolean}
   */
  isPerspective() {
    return this.#isPerspective;
  }

  /**
   * Set whether camera is perspective
   * @param {boolean} b - Whether camera should be perspective
   */
  setPerspective(b) {
    if (this.#isPerspective !== b) {
      this.#isPerspective = b;
      this.#fireCameraChanged();
    }
  }

  /**
   * Get eye separation for stereo
   * @returns {number}
   */
  getEyeSeparation() {
    return this.#eyeSeparation;
  }

  /**
   * Set eye separation for stereo
   * @param {number} eyeSeparation - The eye separation distance
   */
  setEyeSeparation(eyeSeparation) {
    if (this.#eyeSeparation !== eyeSeparation) {
      this.#eyeSeparation = eyeSeparation;
      this.#fireCameraChanged();
    }
  }

  /**
   * Get orientation matrix for stereo
   * @returns {number[]|null}
   */
  getOrientationMatrix() {
    return this.#orientationMatrix;
  }

  /**
   * Set orientation matrix for stereo
   * @param {number[]|null} orientationMatrix - The 4x4 orientation matrix
   */
  setOrientationMatrix(orientationMatrix) {
    this.#orientationMatrix = orientationMatrix;
    this.#fireCameraChanged();
  }

  /**
   * Check if stereo is enabled
   * @returns {boolean}
   */
  isStereo() {
    return this.#isStereo;
  }

  /**
   * Check if this is left eye view
   * @returns {boolean}
   */
  isLeftEye() {
    return this.#isLeftEye;
  }

  /**
   * Check if this is right eye view
   * @returns {boolean}
   */
  isRightEye() {
    return this.#isRightEye;
  }

  /**
   * Set whether stereo is enabled
   * @param {boolean} isStereo - Whether to enable stereo
   */
  setStereo(isStereo) {
    if (this.#isStereo !== isStereo) {
      this.#isStereo = isStereo;
      if (!this.#isPerspective) {
        console.warn('Stereo camera must be perspective, setting it so.');
        this.#isPerspective = true;
      }
      this.#fireCameraChanged();
    }
  }

  /**
   * Set whether this is left eye view
   * @param {boolean} isLeftEye - Whether this is left eye
   */
  setLeftEye(isLeftEye) {
    if (this.#isLeftEye !== isLeftEye) {
      this.#isLeftEye = isLeftEye;
      if (!this.#isPerspective) {
        console.warn('Stereo camera must be perspective, setting it so.');
        this.#isPerspective = true;
      }
      this.#fireCameraChanged();
    }
  }

  /**
   * Set whether this is right eye view
   * @param {boolean} isRightEye - Whether this is right eye
   */
  setRightEye(isRightEye) {
    if (this.#isRightEye !== isRightEye) {
      this.#isRightEye = isRightEye;
      if (!this.#isPerspective) {
        console.warn('Stereo camera must be perspective, setting it so.');
        this.#isPerspective = true;
      }
      this.#fireCameraChanged();
    }
  }

  /**
   * Get focal length (for Renderman backend)
   * @returns {number}
   */
  getFocalLength() {
    return this.#focalLength;
  }

  /**
   * Set focal length (for Renderman backend)
   * @param {number} focalLength - The focal length
   */
  setFocalLength(focalLength) {
    this.#focalLength = focalLength;
  }

  /**
   * Get f-stop for depth of field (for Renderman backend)
   * @returns {number}
   */
  getFStop() {
    return this.#fstop;
  }

  /**
   * Set f-stop for depth of field (for Renderman backend)
   * @param {number} fstop - The f-stop value (-1 to disable)
   */
  setFStop(fstop) {
    this.#fstop = fstop;
  }

  /**
   * Add a camera listener
   * @param {function(CameraEvent): void} listener - The listener function
   */
  addCameraListener(listener) {
    this.addEventListener('cameraChanged', listener);
  }

  /**
   * Remove a camera listener
   * @param {function(CameraEvent): void} listener - The listener function
   */
  removeCameraListener(listener) {
    this.removeEventListener('cameraChanged', listener);
  }

  /**
   * Fire camera changed event
   * @protected
   */
  #fireCameraChanged() {
    this.dispatchEvent(new CameraEvent(this));
  }

  /**
   * Accept a visitor
   * @param {SceneGraphVisitor} visitor - The visitor
   */
  accept(visitor) {
    visitor.visitCamera?.(this) || visitor.visit(this);
  }
}

/**
 * Helper functions for angle conversion (since Math doesn't have these)
 */
Math.toRadians = Math.toRadians || function(degrees) {
  return degrees * (Math.PI / 180);
};

Math.toDegrees = Math.toDegrees || function(radians) {
  return radians * (180 / Math.PI);
};

