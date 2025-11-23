/**
 * JavaScript port of jReality's Viewer interface.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's Viewer interface (from Viewer.java)
// Implemented as an abstract base class

/** @typedef {import('./SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('./SceneGraphPath.js').SceneGraphPath} SceneGraphPath */

/**
 * Simple dimension object for viewing component size (replaces java.awt.Dimension)
 */
export class Dimension {
  /**
   * @param {number} width - Width in pixels
   * @param {number} height - Height in pixels
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
}

/**
 * The Viewer interface represents a renderable 3D scene.
 * It consists of specifying a SceneGraphComponent (the scene root) and a path 
 * in the scene graph to a Camera. Each implementation of this interface 
 * represents a different "backend".
 * 
 * This is implemented as an abstract base class in JavaScript since JS doesn't 
 * have native interface support. Subclasses must implement all abstract methods.
 * 
 * @abstract
 */
export class Viewer {

  /**
   * Create a new Viewer
   * @throws {Error} If called directly on Viewer class (abstract class)
   */
  constructor() {
    if (this.constructor === Viewer) {
      throw new Error('Viewer is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Get the scene root
   * @abstract
   * @returns {SceneGraphComponent} The scene root component
   */
  getSceneRoot() {
    throw new Error(`${this.constructor.name} must implement getSceneRoot()`);
  }

  /**
   * Set the scene root
   * @abstract
   * @param {SceneGraphComponent} root - The scene root component
   */
  setSceneRoot(root) {
    throw new Error(`${this.constructor.name} must implement setSceneRoot(root)`);
  }

  /**
   * Get the camera path
   * @abstract
   * @returns {SceneGraphPath} The path to the camera in the scene graph
   */
  getCameraPath() {
    throw new Error(`${this.constructor.name} must implement getCameraPath()`);
  }

  /**
   * Set the camera path. Some backends assume that this is a valid (existing) 
   * path starting at the scene root. This implies that one first needs to set 
   * the scene root.
   * 
   * A camera path must have a Camera as the last element.
   * @abstract
   * @param {SceneGraphPath} cameraPath - The camera path
   */
  setCameraPath(cameraPath) {
    throw new Error(`${this.constructor.name} must implement setCameraPath(cameraPath)`);
  }

  /**
   * This method triggers rendering of the viewer. The method returns
   * as soon as the rendering is finished.
   * @abstract
   */
  render() {
    throw new Error(`${this.constructor.name} must implement render()`);
  }

  /**
   * Has this viewer a viewing component?
   * @abstract
   * @returns {boolean} true if the viewer has a viewing component, false otherwise
   */
  hasViewingComponent() {
    throw new Error(`${this.constructor.name} must implement hasViewingComponent()`);
  }

  /**
   * Get the viewing component. This could be a canvas element for a WebGL viewer,
   * or a div element for a CSS3D viewer, etc.
   * @abstract
   * @returns {Object|null} The viewing component (e.g., HTMLElement) or null if none
   */
  getViewingComponent() {
    throw new Error(`${this.constructor.name} must implement getViewingComponent()`);
  }

  /**
   * Get the dimension of the viewing component in pixels
   * @abstract
   * @returns {Dimension|null} The dimension of the viewing component when 
   *   hasViewingComponent() returns true - null otherwise
   */
  getViewingComponentSize() {
    throw new Error(`${this.constructor.name} must implement getViewingComponentSize()`);
  }

  /**
   * Check if this viewer supports asynchronous rendering
   * @abstract
   * @returns {boolean} true if the viewer supports renderAsync(), false otherwise
   */
  canRenderAsync() {
    throw new Error(`${this.constructor.name} must implement canRenderAsync()`);
  }

  /**
   * Trigger asynchronous rendering. When this method is called, it returns 
   * immediately and the viewer renders again as soon as possible: either right 
   * now or when the current rendering has finished. Multiple calls of this method 
   * while the viewer is rendering trigger one single rendering after the current 
   * one (optional operation).
   * @abstract
   */
  renderAsync() {
    throw new Error(`${this.constructor.name} must implement renderAsync()`);
  }

  /**
   * Validate that an instance properly implements the Viewer interface
   * @param {Object} instance - The instance to validate
   * @throws {Error} If the instance doesn't implement required methods
   * @static
   */
  static validateImplementation(instance) {
    const requiredMethods = [
      'getSceneRoot',
      'setSceneRoot', 
      'getCameraPath',
      'setCameraPath',
      'render',
      'hasViewingComponent',
      'getViewingComponent',
      'getViewingComponentSize',
      'canRenderAsync',
      'renderAsync'
    ];

    for (const methodName of requiredMethods) {
      if (typeof instance[methodName] !== 'function') {
        throw new Error(
          `${instance.constructor.name} must implement ${methodName}() method`
        );
      }
    }

    // Additional validation: check that methods don't just throw the default error
    try {
      // Test non-destructive methods by calling them and catching the abstract error
      const testMethods = ['getSceneRoot', 'getCameraPath', 'hasViewingComponent', 'canRenderAsync'];
      for (const methodName of testMethods) {
        try {
          instance[methodName]();
        } catch (error) {
          if (error.message.includes('must implement')) {
            throw new Error(
              `${instance.constructor.name}.${methodName}() appears to not be implemented ` +
              `(still throws abstract method error)`
            );
          }
          // Other errors are fine - the method is implemented, just might fail for other reasons
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a simple mock viewer for testing purposes
   * @param {Object} [options] - Configuration options
   * @param {SceneGraphComponent} [options.sceneRoot] - Initial scene root
   * @param {SceneGraphPath} [options.cameraPath] - Initial camera path
   * @param {Object} [options.viewingComponent] - Mock viewing component
   * @param {Dimension} [options.componentSize] - Mock component size
   * @param {boolean} [options.supportsAsync=false] - Whether to support async rendering
   * @returns {Viewer} A mock viewer implementation
   * @static
   */
  static createMockViewer(options = {}) {
    return new MockViewer(options);
  }
}

/**
 * A simple mock implementation of Viewer for testing purposes
 * @private
 */
class MockViewer extends Viewer {
  /**
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super();
    this.#sceneRoot = options.sceneRoot || null;
    this.#cameraPath = options.cameraPath || null;
    this.#viewingComponent = options.viewingComponent || null;
    this.#componentSize = options.componentSize || new Dimension(800, 600);
    this.#supportsAsync = options.supportsAsync || false;
    this.#renderCount = 0;
    this.#asyncRenderCount = 0;
  }

  /** @type {SceneGraphComponent|null} */
  #sceneRoot;
  
  /** @type {SceneGraphPath|null} */
  #cameraPath;
  
  /** @type {Object|null} */
  #viewingComponent;
  
  /** @type {Dimension} */
  #componentSize;
  
  /** @type {boolean} */
  #supportsAsync;
  
  /** @type {number} */
  #renderCount;
  
  /** @type {number} */
  #asyncRenderCount;

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

  render() {
    this.#renderCount++;
    // Mock rendering - in a real implementation this would trigger actual rendering
  }

  hasViewingComponent() {
    return this.#viewingComponent !== null;
  }

  getViewingComponent() {
    return this.#viewingComponent;
  }

  getViewingComponentSize() {
    return this.hasViewingComponent() ? this.#componentSize : null;
  }

  canRenderAsync() {
    return this.#supportsAsync;
  }

  renderAsync() {
    if (!this.canRenderAsync()) {
      throw new Error('This viewer does not support asynchronous rendering');
    }
    this.#asyncRenderCount++;
    // Mock async rendering - in a real implementation this would schedule rendering
  }

  /**
   * Get render statistics (for testing)
   * @returns {{renderCount: number, asyncRenderCount: number}}
   */
  getRenderStats() {
    return {
      renderCount: this.#renderCount,
      asyncRenderCount: this.#asyncRenderCount
    };
  }
}
