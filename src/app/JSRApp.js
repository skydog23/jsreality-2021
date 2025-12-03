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
import { ToolSystem } from '../core/scene/tool/ToolSystem.js';
import * as CommonAttributes from '../core/shader/CommonAttributes.js';
import { Color } from '../core/util/Color.js';
import { MenubarPlugin } from './plugins/MenubarPlugin.js';
import { ExportMenuPlugin } from './plugins/ExportMenuPlugin.js';
import { SceneGraphInspectorPlugin } from './plugins/SceneGraphInspectorPlugin.js';
import { PluginInspectorPanelPlugin } from './plugins/PluginInspectorPanelPlugin.js';
import { JSRPlugin } from './plugin/JSRPlugin.js';
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
export class JSRApp extends JSRPlugin {
  /**
   * @type {JSRViewer} The JSRViewer instance (private)
   */
  #jsrViewer;

   /**
   * @type {ToolSystem|null} The tool system instance (protected)
   */
  _toolSystem = null;

  /**
   * Create a new JSRApp instance.
   * Constructor only stores options - actual initialization happens in install().
   * @param {Object} [options] - Configuration options
   * @param {HTMLElement} options.container - DOM element that will host the viewer layout
   * @param {string[]} [options.viewerTypes] - Array of viewer types to create (default: all three)
   * @param {Object} [options.inspector] - Scene graph inspector plugin configuration
   * @param {'left'|'right'} [options.inspector.panelSide='left'] - Which side to place the scene graph inspector panel
   * @param {number} [options.inspector.initialSize=300] - Initial scene graph inspector panel size in pixels
   * @param {number} [options.inspector.minSize=200] - Minimum scene graph inspector panel size in pixels
   * @param {Object} [options.pluginInspector] - Plugin/app inspector panel configuration
   * @param {'left'|'right'} [options.pluginInspector.panelSide='right'] - Which side to place the plugin inspector panel
   * @param {number} [options.pluginInspector.initialSize=300] - Initial plugin inspector panel size in pixels
   * @param {number} [options.pluginInspector.minSize=200] - Minimum plugin inspector panel size in pixels
   */
  constructor(options = {}) {
    super(); // Call super constructor first
    
    const {
      container,
      viewerTypes = [ViewerTypes.CANVAS2D, ViewerTypes.WEBGL2D, ViewerTypes.SVG],
      inspector = {},
      pluginInspector = {}
    } = options;

    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('JSRApp requires a container HTMLElement (options.container)');
    }

    // Store options for use in install()
    this.#container = container;
    this.#viewerTypes = viewerTypes;
    this.#inspectorConfig = inspector;
    this.#pluginInspectorConfig = pluginInspector;
    
    // Create JSRViewer immediately (JSRApp owns it)
    // But defer getContent() call to install() method
    this.#jsrViewer = new JSRViewer({
      container,
      viewerTypes
    });
    
    // Register ourselves as a plugin with the viewer we just created
    // This will call install() asynchronously, where getContent() will be called
    Promise.resolve().then(async () => {
      try {
        await this.#jsrViewer.registerPlugin(this);
      } catch (error) {
        console.error('Failed to register JSRApp as plugin:', error);
      }
    });
  }

  /** @type {HTMLElement} */
  #container;

  /** @type {string[]} */
  #viewerTypes;

  /** @type {Object} */
  #inspectorConfig = {};

  /** @type {Object} */
  #pluginInspectorConfig = {};

  /**
   * Plugin metadata.
   */
  getInfo() {
    return {
      id: 'jsrapp',
      name: this.constructor.name,
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Application instance',
      dependencies: []
    };
  }

  /**
   * Install the plugin (called when registered with JSRViewer).
   * This is where the actual initialization happens.
   * 
   * Note: JSRApp is special - it creates and owns its own JSRViewer.
   * When install() is called, the viewer parameter will be the viewer we created.
   * 
   * @param {import('./JSRViewer.js').JSRViewer} viewer - The viewer instance (should be our own viewer)
   * @param {import('./plugin/PluginContext.js').PluginContext} context - Plugin context
   */
  async install(viewer, context) {
    await super.install(viewer, context);

    // Ensure we have a viewer (should be the one we created)
    if (!this.#jsrViewer) {
      // Create JSRViewer with stored options
      this.#jsrViewer = new JSRViewer({
        container: this.#container,
        viewerTypes: this.#viewerTypes
      });
    }

    // Get content from subclass and set it
    // Now safe to call getContent() because install() runs after constructor completes
    const content = this.getContent();
    if (!content) {
      throw new Error('getContent() must return a SceneGraphComponent');
    }
    this.#jsrViewer.setContent(content);

    // Register other plugins asynchronously
    this.#initializePlugins();
  }

  /**
   * Initialize other plugins (menubar, export menu, inspectors).
   * @private
   */
  #initializePlugins() {
    Promise.resolve().then(async () => {
      try {
        await this.#jsrViewer.registerPlugin(new MenubarPlugin());
        await this.#jsrViewer.registerPlugin(new ExportMenuPlugin());
        await this.#jsrViewer.registerPlugin(new SceneGraphInspectorPlugin(this.#inspectorConfig));
        await this.#jsrViewer.registerPlugin(new PluginInspectorPanelPlugin(this.#pluginInspectorConfig));
        // Note: JSRApp itself is registered by the caller, not here
        // PluginInspectorPanelPlugin will discover JSRApp when it installs
      } catch (error) {
        console.error('Failed to initialize plugins:', error);
      }
    });
  }

 // In JSRApp
/**
 * Get inspector descriptors for application parameters.
 * Subclasses can override this to expose editable parameters.
 * 
 * @returns {Array<import('../../core/inspect/descriptors/DescriptorTypes.js').DescriptorGroup>}
 */
getInspectorDescriptors() {
  return [
    {
      id: 'app-params',
      title: 'Application Parameters',
      items: [
        // Subclasses add their parameters here
      ]
    }
  ];
}
  /**
   * Get the JSRViewer instance.
   * @returns {JSRViewer} The JSRViewer instance
   */
  getJSRViewer() {
    return this.#jsrViewer;
  }

  getViewer() {
    return this.#jsrViewer.getViewer();
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
    
    // Note: Inspector is now handled by SceneGraphInspectorPlugin, so we don't
    // call enableInspector() here. The plugin will create it during installation.
    // If display() is called before the plugin installs, we'll refresh it after render.
  
    this.#jsrViewer.getViewer().render();
    
    // Refresh inspector if it exists (plugin may have created it)
    const inspector = this.#jsrViewer.getInspector();
    if (inspector) {
      inspector.refresh();
    }
  }

  /**
   * Get the scene graph inspector instance.
   * @returns {SceneGraphInspector|null} The inspector instance, or null if not enabled
   */
  getInspector() {
    return this.#jsrViewer.getInspector();
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
    this._toolSystem = null;
  }
}
