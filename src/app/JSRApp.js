/**
 * JavaScript port/translation of jReality's JSRApp class.
 * 
 * Simplified application base class that uses JSRViewer internally.
 * Provides animation support and a simplified API for quick prototyping.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRViewer } from './JSRViewer.js';
import { Canvas2DViewer } from '../core/viewers/Canvas2DViewer.js';
import { Animated } from '../core/anim/core/Animated.js';
import { ToolSystem } from '../core/scene/tool/ToolSystem.js';
import { InputSlot } from '../core/scene/tool/InputSlot.js';
import { ToolEvent } from '../core/scene/tool/ToolEvent.js';
import { AxisState } from '../core/scene/tool/AxisState.js';
import * as CommonAttributes from '../core/shader/CommonAttributes.js';
import { Color } from '../core/util/Color.js';

/** @typedef {import('../core/scene/Viewer.js').Viewer} Viewer */
/** @typedef {import('../core/scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */

/**
 * Abstract base class for jsReality applications.
 * Subclasses must implement getContent() to provide the scene graph content.
 * 
 * This class provides a simplified API for quick prototyping while using
 * JSRViewer internally for core functionality. It adds animation support
 * via the Animated base class and system time updates for tool system.
 * 
 * @abstract
 */
export class JSRApp extends Animated {
  /**
   * @type {JSRViewer} The JSRViewer instance (private)
   */
  #jsrViewer;

  /**
   * @type {Viewer} The viewer instance (protected - accessible to subclasses)
   * This is the current viewer from ViewerSwitch for backward compatibility.
   */
  _viewer;

  /**
   * @type {ToolSystem|null} The tool system instance (protected)
   */
  _toolSystem = null;

  /**
   * Create a new JSRApp instance.
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   */
  constructor(canvas) {
    super(); // Call super constructor first
    
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('JSRApp requires an HTMLCanvasElement');
    }

    // Create a container div for JSRViewer
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    
    // If canvas has a parent, insert container before canvas and move canvas into it
    // Otherwise, just use canvas's parent or create a new parent
    if (canvas.parentElement) {
      canvas.parentElement.insertBefore(container, canvas);
      container.appendChild(canvas);
    } else {
      // Canvas has no parent - create container and append canvas
      container.appendChild(canvas);
    }

    // Create JSRViewer with Canvas2DViewer
    const canvasViewer = new Canvas2DViewer(canvas);
    this.#jsrViewer = new JSRViewer({
      container: container,
      viewers: [canvasViewer],
      viewerNames: ['Canvas2D']
    });

    // Get content from subclass and set it
    const content = this.getContent();
    if (!content) {
      throw new Error('getContent() must return a SceneGraphComponent');
    }
    this.#jsrViewer.setContent(content);

    // Set up protected accessors for backward compatibility
    this._viewer = this.#jsrViewer.getViewer().getCurrentViewer();
    this._toolSystem = this.#jsrViewer.getToolSystem();

    // Set up system time updates (unique to JSRApp for animation support)
    this._setupSystemTimeUpdates();

    // Set default appearance (transparent background, no vertex drawing)
    const sceneRoot = this.#jsrViewer.getSceneRoot();
    if (sceneRoot) {
      const ap = sceneRoot.getAppearance();
      if (ap) {
        ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
        ap.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(0, 0, 0, 0));
      }
    }
  }

  /**
   * Set up periodic system time updates.
   * System time events trigger implicit device updates (camera transformations).
   * This is unique to JSRApp and provides animation support.
   * @private
   */
  _setupSystemTimeUpdates() {
    const updateSystemTime = () => {
      if (this._toolSystem) {
        const now = Date.now();
        // Process system time event - this will trigger implicit device updates
        // and update camera transformations
        const event = new ToolEvent(this, now, InputSlot.SYSTEM_TIME, AxisState.ORIGIN);
        this._toolSystem.processToolEvent(event);
      }
      requestAnimationFrame(updateSystemTime);
    };
    requestAnimationFrame(updateSystemTime);
  }

  /**
   * Get the viewer instance.
   * Returns the current viewer from ViewerSwitch for backward compatibility.
   * @returns {Viewer} The viewer
   */
  getViewer() {
    return this._viewer;
  }

  /**
   * Get the JSRViewer instance.
   * @returns {JSRViewer} The JSRViewer instance
   */
  getJSRViewer() {
    return this.#jsrViewer;
  }

  /**
   * Get the tool system instance.
   * @returns {ToolSystem|null} The tool system
   */
  getToolSystem() {
    return this._toolSystem;
  }

  /**
   * Get the scene graph content. This method must be implemented by subclasses.
   * @abstract
   * @returns {SceneGraphComponent} The scene graph root component
   */
  getContent() {
    throw new Error(`${this.constructor.name} must implement getContent()`);
  }

  /**
   * Called after initialization and before rendering to set up application
   * specific attributes.
   */
  display() {
    this.#jsrViewer.render();
  }

  /**
   * Set value at time (for animation).
   * Override in subclasses to implement animation behavior.
   * @param {number} t - Time value
   */
  setValueAtTime(t) {
    // Override in subclasses
  }

  /**
   * Start animation.
   * Override in subclasses to implement animation start behavior.
   */
  startAnimation() {
    // Override in subclasses
  }

  /**
   * End animation.
   * Override in subclasses to implement animation end behavior.
   */
  endAnimation() {
    // Override in subclasses
  }

  /**
   * Print current state (for debugging).
   */
  printState() {
    console.log(this.#jsrViewer.getSceneRoot());
  }

  /**
   * Dispose of resources.
   */
  dispose() {
    if (this.#jsrViewer) {
      this.#jsrViewer.dispose();
      this.#jsrViewer = null;
    }
    this._viewer = null;
    this._toolSystem = null;
  }
}
