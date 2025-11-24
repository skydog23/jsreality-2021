/**
 * JavaScript port/translation of jReality's JSRApp class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Canvas2DViewer } from './Canvas2DViewer.js';
import { SceneGraphUtility } from '../util/SceneGraphUtility.js';
import { Camera } from '../scene/Camera.js';
import { SceneGraphPath } from '../scene/SceneGraphPath.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { Color } from '../util/Color.js';
import { Animated } from '../anim/core/Animated.js';
import { ToolSystem } from '../scene/tool/ToolSystem.js';
import { InputSlot } from '../scene/tool/InputSlot.js';
import { ToolEvent } from '../scene/tool/ToolEvent.js';
import { AxisState } from '../scene/tool/AxisState.js';

/** @typedef {import('../scene/Viewer.js').Viewer} Viewer */
/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */

/**
 * Abstract base class for jsReality applications.
 * Subclasses must implement getContent() to provide the scene graph content.
 * 
 * @abstract
 */
export class JSRApp extends Animated {
  /**
   * @type {Viewer} The viewer instance (protected - accessible to subclasses)
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

    this._viewer = new Canvas2DViewer(canvas);
    const sceneroot = SceneGraphUtility.createFullSceneGraphComponent("root");
    this._viewer.setSceneRoot(sceneroot);
    
    const content = this.getContent();
    if (!content) {
      throw new Error('getContent() must return a SceneGraphComponent');
    }
    this._viewer.getSceneRoot().addChild(content);

    const cameraNode = SceneGraphUtility.createFullSceneGraphComponent("cam node");
    const camera = new Camera();
    camera.setName('camera');
    camera.setFieldOfView(60);
    camera.setNear(-5);
    camera.setFar(5);
    camera.setPerspective(false);
    cameraNode.setCamera(camera);
    this._viewer.getSceneRoot().addChild(cameraNode);

    const cameraPath = new SceneGraphPath();
    cameraPath.push(this._viewer.getSceneRoot());
    cameraPath.push(cameraNode);
    cameraPath.push(camera);
    this._viewer.setCameraPath(cameraPath);

    const ap = this._viewer.getSceneRoot().getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    // ap.setAttribute(CommonAttributes.BACKGROUND_COLORS, CommonAttributes.INHERITED);
    ap.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(0,0,0,0));

    // Initialize tool system
    this._initializeToolSystem();
  }

  /**
   * Initialize the tool system with default configuration.
   * @private
   */
  _initializeToolSystem() {
    // Create tool system with default configuration (config=null uses defaults)
    this._toolSystem = new ToolSystem(this._viewer, null, null);
    ToolSystem.setToolSystemForViewer(this._viewer, this._toolSystem);

    // Initialize scene tools (this registers tools from scene graph)
    this._toolSystem.initializeSceneTools();

    // Set up system time updates
    this._setupSystemTimeUpdates();
  }

  /**
   * Set up periodic system time updates.
   * System time events trigger implicit device updates (camera transformations).
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
   * @returns {Viewer} The viewer
   */
  getViewer() {
    return this._viewer;
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
    this._viewer.render();
  }

  setValueAtTime(t) {
  }

  startAnimation() {
  }

  endAnimation() {
  }

  printState() {
    console.log(this._viewer.getSceneRoot());
  }
}
