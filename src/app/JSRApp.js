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
import { ShrinkPanelAggregator } from './plugins/ShrinkPanelAggregator.js';
import { DescriptorUtility } from '../core/inspect/descriptors/DescriptorUtility.js';
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
   * @param {Object} [options.shrinkPanel] - Shrink panel aggregator configuration
   * @param {'left'|'right'} [options.shrinkPanel.panelSide='right'] - Which side to place the shrink panel
   * @param {number} [options.shrinkPanel.initialSize=300] - Initial shrink panel size in pixels
   * @param {number} [options.shrinkPanel.minSize=200] - Minimum shrink panel size in pixels
   */
  constructor(options = {}) {
    super(); // Call super constructor first
    
    const {
      container,
      viewerTypes = [ViewerTypes.CANVAS2D, ViewerTypes.WEBGL2D, ViewerTypes.SVG],
      inspector = {},
      shrinkPanel = {}
    } = options;

    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('JSRApp requires a container HTMLElement (options.container)');
    }

    // Store options for use in install()
    this.#container = container;
    this.#viewerTypes = viewerTypes;
    this.#inspectorConfig = inspector;
    this.#shrinkPanelConfig = shrinkPanel;
    
    // Create JSRViewer immediately (JSRApp owns it)
    // But defer getContent() call to install() method
    this.#jsrViewer = new JSRViewer({
      container,
      viewerTypes
    });
    
    // Register plugins in order: SceneGraphInspectorPlugin first (needs left panel),
    // then ShrinkPanelAggregator (needs right panel), then ourselves
    // This ensures panel slots are created in the right order
    Promise.resolve().then(async () => {
      try {
        // Register SceneGraphInspectorPlugin first so left panel split pane is created
        await this.#jsrViewer.registerPlugin(new SceneGraphInspectorPlugin(this.#inspectorConfig));
        // Register aggregator second (right panel)
        await this.#jsrViewer.registerPlugin(new ShrinkPanelAggregator(this.#shrinkPanelConfig));
        // Then register ourselves (so we can use aggregator in install())
        await this.#jsrViewer.registerPlugin(this);
      } catch (error) {
        console.error('Failed to register plugins:', error);
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
  #shrinkPanelConfig = {};

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

    // Enable panel slots (left for inspector, right for shrink panels)
    // Similar to JRViewer.setShowPanelSlots(true, false, false, false)
    this.#jsrViewer.setShowPanelSlots(true, true, false, false);

    // Get content from subclass and set it
    // Now safe to call getContent() because install() runs after constructor completes
    const content = this.getContent();
    if (!content) {
      throw new Error('getContent() must return a SceneGraphComponent');
    }
    this.#jsrViewer.setContent(content);

    // Register inspector panel with aggregator (like Assignment.java pattern)
    this.#registerInspectorPanel(context);

    // Register other plugins asynchronously
    this.#initializePlugins();
  }

  /**
   * Register this app's inspector panel with the ShrinkPanelAggregator.
   * Similar to Assignment.java's install() method where it adds inspector to shrinkPanel.
   * 
   * @param {import('./plugin/PluginContext.js').PluginContext} context
   * @private
   */
  #registerInspectorPanel(context) {
    // Check if we have inspector descriptors
    if (typeof this.getInspectorDescriptors !== 'function') {
      return; // No inspector to register
    }

    const descriptors = this.getInspectorDescriptors();
    if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
      return; // No descriptors to show
    }

    // Get the aggregator plugin
    const aggregator = context.getPlugin('shrink-panel-aggregator');
    if (!aggregator || typeof aggregator.registerInspectorPanel !== 'function') {
      // Aggregator not yet registered - this shouldn't happen since we register it first
      // But handle it gracefully by waiting for it
      const unsubscribe = context.on('plugin:installed', (data) => {
        if (data.plugin && data.plugin.getInfo && data.plugin.getInfo().id === 'shrink-panel-aggregator') {
          this.#registerInspectorPanel(context);
          unsubscribe();
        }
      });
      return;
    }

    // Create inspector panel using utility method
    // Use the subclass name as the panel title
    const pluginInfo = this.getInfo();
    const title = this.constructor.name;

    const panel = DescriptorUtility.createDefaultInspectorPanel(
      title,
      descriptors,
      {
        id: pluginInfo.id,
        icon: '⚙️',
        collapsed: false,
        onPropertyChange: () => this.getViewer().render()
      }
    );

    // Register with aggregator
    aggregator.registerInspectorPanel(pluginInfo.id, panel);
  }

  /**
   * Initialize other plugins (menubar, export menu, scene graph inspector).
   * Note: ShrinkPanelAggregator is registered in constructor before JSRApp.
   * @private
   */
  #initializePlugins() {
    Promise.resolve().then(async () => {
      try {
        await this.#jsrViewer.registerPlugin(new MenubarPlugin());
        await this.#jsrViewer.registerPlugin(new ExportMenuPlugin());
        // SceneGraphInspectorPlugin and ShrinkPanelAggregator are already registered in constructor
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
 * The panel title is automatically set to the subclass name. Subclasses should
 * return a flat array of descriptors (no grouping required).
 * 
 * @returns {Array<import('../../core/inspect/descriptors/DescriptorTypes.js').InspectorDescriptor>}
 */
getInspectorDescriptors() {
  return [
    // Subclasses add their parameter descriptors here
    // Example:
    // {
    //   type: DescriptorType.INT,
    //   label: 'My Parameter',
    //   getValue: () => this._value,
    //   setValue: (val) => { this._value = val; }
    // }
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
