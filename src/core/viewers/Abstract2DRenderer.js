// Abstract base class for 2D renderers
// Handles device-independent scene graph traversal and state management
// Subclasses implement device-specific drawing operations

import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import * as Rn from '../math/Rn.js';
import { INHERITED } from '../scene/Appearance.js';
import * as CameraUtility from '../util/CameraUtility.js';
import { Color } from '../util/Color.js';

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/Appearance.js').Appearance} Appearance */
/** @typedef {import('../scene/Transformation.js').Transformation} Transformation */
/** @typedef {import('../scene/Camera.js').Camera} Camera */
/** @typedef {import('./Abstract2DViewer.js').Abstract2DViewer} Abstract2DViewer */

/**
 * Abstract base class for 2D rendering visitors.
 * Handles scene graph traversal, appearance stack, and transformation stack.
 * Subclasses implement device-specific drawing operations.
 */
export class Abstract2DRenderer extends SceneGraphVisitor {

  /** @type {Abstract2DViewer} */
  #viewer;

  /** @type {Camera} */
  #camera;

  /** @type {Appearance[]} Stack of appearances for hierarchical attribute resolution */
  #appearanceStack = [];

  /** @type {number[][]} Stack of transformation matrices for hierarchical transformations */
  #transformationStack = [];

  /** @type {number[]} Combined world-to-NDC transformation matrix */
  #world2ndc;

  /**
   * Create a new Abstract2DRenderer
   * @param {Abstract2DViewer} viewer - The viewer
   */
  constructor(viewer) {
    super();
    this.#viewer = viewer;
    this.#camera = viewer._getCamera();
    this.#world2ndc = new Array(16);
  }

  /**
   * Get the viewer
   * @protected
   * @returns {Abstract2DViewer}
   */
  _getViewer() {
    return this.#viewer;
  }

  /**
   * Get the camera
   * @protected
   * @returns {Camera}
   */
  _getCamera() {
    return this.#camera;
  }

  /**
   * Get the world-to-NDC transformation matrix
   * @protected
   * @returns {number[]}
   */
  _getWorld2NDC() {
    return this.#world2ndc;
  }

  /**
   * Get the appearance stack
   * @protected
   * @returns {Appearance[]}
   */
  _getAppearanceStack() {
    return this.#appearanceStack;
  }

  /**
   * Get the transformation stack
   * @protected
   * @returns {number[][]}
   */
  _getTransformationStack() {
    return this.#transformationStack;
  }

  /**
   * Render the scene (device-independent orchestration)
   */
  render() {
    const cameraPath = this.#viewer.getCameraPath();
    const sceneRoot = this.#viewer.getSceneRoot();

    if (!cameraPath || !sceneRoot) {
      return;
    }

    // Get world-to-camera transformation
    const world2Cam = cameraPath.getInverseMatrix();
    const cam2ndc = CameraUtility.getCameraToNDC(this.#viewer);
    Rn.timesMatrix(this.#world2ndc, cam2ndc, world2Cam);
    this.#transformationStack = [this.#world2ndc.slice()]; // Clone the matrix

    // Device-specific setup
    this._setupRendering();

    // Clear and render background
    this._clearSurface();

    // Render the scene
    try {
      console.log('Calling sceneRoot.accept(this)');
      sceneRoot.accept(this);
      console.log('sceneRoot.accept(this) completed');
    } catch (error) {
      console.error('Rendering error:', error);
    }
  }

  /**
   * Setup device-specific rendering context
   * @protected
   * @abstract
   */
  _setupRendering() {
    throw new Error('Abstract method _setupRendering() must be implemented by subclass');
  }

  /**
   * Clear the rendering surface and draw background
   * @protected
   * @abstract
   */
  _clearSurface() {
    throw new Error('Abstract method _clearSurface() must be implemented by subclass');
  }

  /**
   * Get the current transformation matrix from the top of the stack
   * @returns {number[]} The current transformation matrix
   */
  getCurrentTransformation() {
    return this.#transformationStack[this.#transformationStack.length - 1];
  }

  /**
   * Visit a SceneGraphComponent - device-independent traversal
   * @param {SceneGraphComponent} component
   */
  visitComponent(component) {
    if (!component.isVisible()) {
      return;
    }

    // Push this component onto the path for transformation calculations
    this.pushPath(component);
    
    let hasTransformation = false;
    let hasAppearance = false;
    
    try {
      // Check if we need to save state for transformation
      const transformation = component.getTransformation();
      if (transformation) {
        hasTransformation = true;
        this._pushTransformState(); // Device-specific
      }
      
      // Check if we need to track appearance for cleanup
      const appearance = component.getAppearance();
      if (appearance) {
        hasAppearance = true;
      }
       
      // Let childrenAccept handle the actual visiting of transformation, appearance, and children
      component.childrenAccept(this);
    } finally {
      // Pop appearance from stack if it was pushed by visitAppearance
      if (hasAppearance) {
        this.#appearanceStack.pop();
      }

      // Restore transformation state and pop our tracking stack
      if (hasTransformation) {
        this._popTransformState(); // Device-specific
        this.#transformationStack.pop(); // Keep our stack in sync
      }
      
      // Pop the component from the path
      this.popPath();
    }
  }

  /**
   * Push transformation state (device-specific)
   * @protected
   * @abstract
   */
  _pushTransformState() {
    throw new Error('Abstract method _pushTransformState() must be implemented by subclass');
  }

  /**
   * Pop transformation state (device-specific)
   * @protected
   * @abstract
   */
  _popTransformState() {
    throw new Error('Abstract method _popTransformState() must be implemented by subclass');
  }

  /**
   * Visit a Transformation node - update transformation stack
   * @param {Transformation} transformation
   */
  visitTransformation(transformation) {
    // Get the transformation matrix from the transformation object
    const transformMatrix = transformation.getMatrix();
    
    // Apply the transformation (device-specific)
    this._applyTransform(transformMatrix);
    
    // Keep our own stack for compatibility (but device may handle accumulation differently)
    const currentMatrix = this.#transformationStack[this.#transformationStack.length - 1];
    const newMatrix = new Array(16);
    Rn.timesMatrix(newMatrix, currentMatrix, transformMatrix);
    this.#transformationStack.push(newMatrix);
  }

  /**
   * Apply a transformation matrix (device-specific)
   * @protected
   * @abstract
   * @param {number[]} matrix - 4x4 transformation matrix
   */
  _applyTransform(matrix) {
    throw new Error('Abstract method _applyTransform() must be implemented by subclass');
  }

  /**
   * Visit an Appearance node - push it onto the appearance stack
   * @param {Appearance} appearance
   */
  visitAppearance(appearance) {
    this.#appearanceStack.push(appearance);
  }

  /**
   * Get an attribute value from the appearance stack with namespace support
   * @param {string} prefix - Namespace prefix (e.g., "point", "line", "polygon")
   * @param {string} attribute - Base attribute name (e.g., "diffuseColor")
   * @param {*} defaultValue - Default value if not found
   * @returns {*} The attribute value
   */
  getAppearanceAttribute(prefix, attribute, defaultValue) {
    // Search from top of stack (most specific) to bottom (most general)
    for (let i = this.#appearanceStack.length - 1; i >= 0; i--) {
      const appearance = this.#appearanceStack[i];
      
      // First try namespaced attribute (e.g., "point.diffuseColor")
      if (prefix) {
        const namespacedKey = prefix + '.' + attribute;
        const namespacedValue = appearance.getAttribute(namespacedKey);
        if (namespacedValue !== INHERITED) {
          return namespacedValue;
        }
      }
      
      // Then try base attribute (e.g., "diffuseColor")
      const baseValue = appearance.getAttribute(attribute);
      if (baseValue !== INHERITED) {
        return baseValue;
      }
    }
    
    // Return default if not found in any appearance
    return defaultValue;
  }

  /**
   * Convert a Color object to CSS string, or return string as-is
   * Delegates to Color.toCSSColor() static method
   * @param {*} colorValue - Color object or string
   * @returns {string} CSS color string
   */
  toCSSColor(colorValue) {
    return Color.toCSSColor(colorValue);
  }

  /**
   * Get a boolean appearance attribute with fallback
   * @param {string} attribute - Attribute name
   * @param {boolean} defaultValue - Default value
   * @returns {boolean}
   */
  getBooleanAttribute(attribute, defaultValue) {
    return Boolean(this.getAppearanceAttribute(null, attribute, defaultValue));
  }

  /**
   * Get a numeric appearance attribute with fallback
   * @param {string} attribute - Attribute name
   * @param {number} defaultValue - Default value
   * @returns {number}
   */
  getNumericAttribute(attribute, defaultValue) {
    const ret = this.getAppearanceAttribute(null, attribute, defaultValue);
    return Number(ret);
  }

  // Geometry visit methods - subclasses should implement rendering logic
  // These provide the hooks for device-specific drawing

  visitPointSet(pointSet) {
    // Subclass should implement
  }

  visitIndexedLineSet(lineSet) {
    // Subclass should implement
  }

  visitIndexedFaceSet(faceSet) {
    // Subclass should implement
  }
}

