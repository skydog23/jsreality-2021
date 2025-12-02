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

import { JSRViewer, ViewerTypes } from './JSRViewer.js';
import { Animated } from '../core/anim/core/Animated.js';
import { ToolSystem } from '../core/scene/tool/ToolSystem.js';
import { InputSlot } from '../core/scene/tool/InputSlot.js';
import { ToolEvent } from '../core/scene/tool/ToolEvent.js';
import { AxisState } from '../core/scene/tool/AxisState.js';
import * as CommonAttributes from '../core/shader/CommonAttributes.js';
import { Color } from '../core/util/Color.js';
import { SceneGraphInspector } from '../core/inspect/SceneGraphInspector.js';
import { MenubarPlugin } from './plugins/MenubarPlugin.js';
import { ExportMenuPlugin } from './plugins/ExportMenuPlugin.js';

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
   * @type {SceneGraphInspector|null} The scene graph inspector instance (private)
   */
  #inspector = null;

  /**
   * @type {HTMLElement|null} Cached inspector container supplied by layout manager
   */
  #inspectorContainer = null;

  /**
   * Create a new JSRApp instance.
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {Object} [options] - Optional configuration
   * @param {string[]} [options.viewerTypes] - Array of viewer types to create (default: all three)
   */
  constructor(canvas, options = {}) {
    super(); // Call super constructor first
    
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('JSRApp requires an HTMLCanvasElement');
    }

    const { viewerTypes =  [ViewerTypes.CANVAS2D, ViewerTypes.WEBGL2D, ViewerTypes.SVG] } = options;

    // Save reference to canvas's parent before we modify the DOM
    const originalParent = canvas.parentElement;

    // Create a container div for JSRViewer
    // JSRViewer will create the viewer DOM elements and ViewerSwitch wrapper
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    
    // Replace canvas with container in the DOM
    if (originalParent) {
      // Configure parent as flex column so the layout manager can stack regions
      originalParent.style.display = 'flex';
      originalParent.style.flexDirection = 'column';
      
      // Replace canvas with viewer container
      originalParent.replaceChild(container, canvas);
      
      // Make viewer container fill remaining space
      container.style.flex = '1';
      container.style.minHeight = '0';
      
      // Remove the original canvas - JSRViewer will create its own DOM elements
      // (The canvas was just used to find the parent element)
    } else {
      throw new Error('JSRApp requires the canvas to have a parent element');
    }

    // Create JSRViewer with viewerTypes - it will create the viewer instances
    // Note: MenubarPlugin now uses the layout manager to place itself, so no container wiring is needed here.
    this.#jsrViewer = new JSRViewer({
      container: container,
      viewerTypes: viewerTypes
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

    // Re-discover scene tools after content is set
    // This ensures tools added in getContent() are discovered and registered
    // Use rediscoverSceneTools() instead of initializeSceneTools() to avoid
    // restarting the event queue which was already started during JSRViewer initialization
    if (this._toolSystem) {
      this._toolSystem.rediscoverSceneTools();
    }

    // Set up system time updates (unique to JSRApp for animation support)
    this._setupSystemTimeUpdates();

    // Register plugins asynchronously
    // We use an IIFE to handle async plugin registration
    this.#initializePlugins();
  }

  /**
   * Initialize plugins asynchronously.
   * @private
   */
  async #initializePlugins() {
    try {
      // Register MenubarPlugin first (creates the menubar structure)
      await this.#jsrViewer.registerPlugin(new MenubarPlugin());
      
      // Register ExportMenuPlugin (adds export menu items)
      await this.#jsrViewer.registerPlugin(new ExportMenuPlugin());
    } catch (error) {
      console.error('Failed to initialize plugins:', error);
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
    const ap = this.#jsrViewer.getViewer().getSceneRoot().getAppearance();
    ap.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(200, 175, 150));
    this.enableInspector();
  
    this.#jsrViewer.getViewer().render();
    // Refresh inspector if enabled
    if (this.#inspector) {
      this.#inspector.refresh();
    }
  }

  /**
   * Enable the scene graph inspector.
   * Creates a SceneGraphInspector instance and sets it up to refresh on renders.
   * Creates a split pane to allow resizing between viewer and inspector.
   * @param {HTMLElement} [container] - Optional container element for the inspector.
   *                                    If not provided, a split pane will be created.
   * @param {Object} [options] - Inspector options
   * @param {string} [options.position='right'] - Position of inspector ('left' | 'right' | 'top' | 'bottom')
   * @param {number} [options.initialSize=300] - Initial size of inspector panel in pixels
   * @returns {SceneGraphInspector} The inspector instance
   */
  enableInspector(container = null, options = {}) {
    if (this.#inspector) {
      return this.#inspector; // Already enabled
    }

    const { position = 'left', initialSize = 300 } = options;

    let inspectorContainer = container;
    if (!inspectorContainer && this.#inspectorContainer) {
      inspectorContainer = this.#inspectorContainer;
      inspectorContainer.innerHTML = '';
    }

    if (!inspectorContainer) {
      if (position !== 'left') {
        console.warn(`[JSRApp] enableInspector currently supports 'left' layout only. Requested "${position}" will be treated as 'left'.`);
      }
      const layoutManager = this.#jsrViewer.getLayoutManager();
      if (!layoutManager) {
        throw new Error('Cannot enable inspector: layout manager is not available');
      }
      inspectorContainer = layoutManager.requestRegion('left', {
        id: 'jsrapp-inspector',
        initialSize,
        minSize: 200,
        fill: true,
        overflow: 'auto'
      });
      inspectorContainer.id = 'jsrapp-inspector-container';
      this.#inspectorContainer = inspectorContainer;
    }

    inspectorContainer.style.display = 'flex';
    inspectorContainer.style.flexDirection = 'column';
    inspectorContainer.style.width = '100%';
    inspectorContainer.style.height = '100%';
    inspectorContainer.style.overflow = 'auto';
    inspectorContainer.style.minHeight = '0';

    // Get scene root
    const sceneRoot = this.#jsrViewer.getSceneRoot();
    if (!sceneRoot) {
      throw new Error('Cannot enable inspector: scene root is not available');
    }

    // Create inspector with render callback - no global variable needed
    // The inspector will call this callback when properties change
    const renderCallback = () => {
      this.#jsrViewer.render();
    };
    
    this.#inspector = new SceneGraphInspector(inspectorContainer, sceneRoot, {
      onRender: renderCallback
    });

    // Initial refresh
    this.#inspector.refresh();

    return this.#inspector;
  }

  /**
   * Get the scene graph inspector instance.
   * @returns {SceneGraphInspector|null} The inspector instance, or null if not enabled
   */
  getInspector() {
    return this.#inspector;
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
    if (this.#inspector) {
      // Inspector doesn't have a dispose method, but we can clear the reference
      this.#inspector = null;
    }
    if (this.#jsrViewer) {
      this.#jsrViewer.dispose();
      this.#jsrViewer = null;
    }
    this._viewer = null;
    this._toolSystem = null;
  }
}
