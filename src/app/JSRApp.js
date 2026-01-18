/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { JSRViewer, ViewerTypes } from './JSRViewer.js';
import * as CameraUtility from '../core/util/CameraUtility.js';
import { MatrixBuilder } from '../core/math/MatrixBuilder.js';  
import { ToolSystem } from '../core/scene/tool/ToolSystem.js';
import * as CommonAttributes from '../core/shader/CommonAttributes.js';
import { Color } from '../core/util/Color.js';
import { MenubarPlugin } from './plugins/MenubarPlugin.js';
import { ExportMenuPlugin } from './plugins/ExportMenuPlugin.js';
import { SceneGraphInspectorPlugin } from './plugins/SceneGraphInspectorPlugin.js';
import { ShrinkPanelAggregator } from './plugins/ShrinkPanelAggregator.js';
import { PanelShowMenuPlugin } from './plugins/PanelShowMenuPlugin.js';
import { AppMenuPlugin } from './plugins/AppMenuPlugin.js';
import { DescriptorUtility } from '../core/inspect/descriptors/DescriptorUtility.js';
import { JSRPlugin } from './plugin/JSRPlugin.js';
import { AnimationPlugin } from './plugins/AnimationPlugin.js';
import { PluginIds } from './plugin/PluginIds.js';
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
  /** @type {boolean} */
  #isAnimating = false;

  /** @type {string} */
  #name = '';

  /** @type {AnimationPlugin|null} */
  _animationPlugin = null;

  /** @type {import('../anim/gui/AnimationPanel.js').AnimationPanel|null} */
  _animationPanel = null;

  /**
   * @type {JSRViewer} The JSRViewer instance (private)
   */
  #jsrViewer = null;

   /**
   * @type {ToolSystem|null} The tool system instance (protected)
   */
  _toolSystem = null;

  getShowPanels() {
    return [true, true, false, false];
  }

  /**
   * Hook for subclasses to supply additional plugins to register, without
   * manually calling registerPlugin() themselves (mirrors Assignment.java).
   *
   * Subclasses can override and typically do:
   *   const plugins = super.getPluginsToRegister();
   *   plugins.push(new MyPlugin());
   *   return plugins;
   *
   * @returns {Array<import('./plugin/JSRPlugin.js').JSRPlugin>}
   */
  getPluginsToRegister() {
    // NOTE: Ordering matters for layout + menu aggregation:
    // - SceneGraphInspectorPlugin should come first (claims the left panel slot)
    // - ShrinkPanelAggregator comes next (claims right panel slot)
    // - MenubarPlugin should come before menu-contributing plugins
    const appMenu = new AppMenuPlugin();
    // Remove AppMenuPlugin's dependency on a JSRApp plugin: provide info up-front.
    appMenu.setAppInfo(this.getInfo());

    return [
      new SceneGraphInspectorPlugin(this.#inspectorConfig),
      new ShrinkPanelAggregator(this.#shrinkPanelConfig),
      new AnimationPlugin(),
      new MenubarPlugin(),
      new PanelShowMenuPlugin(),
      appMenu,
      new ExportMenuPlugin()
    ];
  }

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
    this.#name = this.constructor.name;
    
    const {
      container,
      viewerTypes = [ViewerTypes.WEBGL2D, ViewerTypes.CANVAS2D, ViewerTypes.SVG],
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
    
    // Register plugins (mirrors Assignment.java: subclasses can override the list).
    // NOTE: This is asynchronous. Callers that need plugins installed (e.g. before
    // calling display()) should await `whenReady()`.
    this.#readyPromise = Promise.resolve().then(async () => {
      try {
        for (const plugin of this.getPluginsToRegister()) {
          await this.#jsrViewer.registerPlugin(plugin);
        }
        // Finally register ourselves.
        await this.#jsrViewer.registerPlugin(this);
      } catch (error) {
        console.error('Failed to register plugins:', error);
        throw error;
      }
    });

  }

  /** @type {Promise<void>|null} */
  #readyPromise = null;

  /**
   * Promise that resolves once all default plugins (and this app) are installed.
   * Consumers like `test/test-jsrapp-example.html` should await this before
   * calling `display()` if the app relies on installed plugins.
   *
   * @returns {Promise<void>}
   */
  whenReady() {
    return this.#readyPromise ?? Promise.resolve();
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
      id: PluginIds.JSRAPP,
      name: this.constructor.name,
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Application instance',
      dependencies: []
    };
  }

  // ---------------------------------------------------------------------------
  // Documentation / gallery hooks (inspired by Assignment.java)
  // ---------------------------------------------------------------------------

  /**
   * Human-readable title for this application.
   * Subclasses can override to provide a nicer title for UIs and galleries.
   *
   * @returns {string}
   */
  getHelpTitle() {
    return this.constructor.name;
  }

  /**
   * Short description of what this application demonstrates.
   * Subclasses can override; default is an empty string.
   *
   * @returns {string}
   */
  getHelpSummary() {
    return '';
  }

  /**
   * Link to documentation for this application.
   * May be:
   * - a full URL (e.g. "https://example.com/foo.html"), or
   * - a relative path that the hosting environment knows how to serve, or
   * - null/empty if no documentation is available.
   *
   * This is the JSRApp analogue of Assignment.getDocumentationFile().
   *
   * @returns {string|null}
   */
  getDocumentationLink() {
    return null;
  }

  /**
   * Optional thumbnail image path for use in galleries.
   * May be:
   * - a relative path from the HTML page (e.g. "resources/gallery/MyApp.png"), or
   * - null/empty if no thumbnail is defined.
   *
   * @returns {string|null}
   */
  getThumbnailPath() {
    return null;
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
    console.log('JSRApp install');

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
    console.log(this.getShowPanels());
    
    this.#jsrViewer.setShowPanelSlots(this.getShowPanels());

    // Get content from subclass and set it
    // Now safe to call getContent() because install() runs after constructor completes
    const content = this.getContent();
    if (!content) {
      throw new Error('getContent() must return a SceneGraphComponent');
    }
    this.#jsrViewer.setContent(content);

    // Ensure the tool system discovers tools in the newly set content.
    // Content (and its tools) may be created after the ToolSystem was initialized,
    // so we trigger a rediscovery pass here.
    const toolSystem = this.#jsrViewer.getToolSystem();
    if (toolSystem && typeof toolSystem.rediscoverSceneTools === 'function') {
      toolSystem.rediscoverSceneTools();
    }

    // Register inspector panel with aggregator (like Assignment.java pattern)
    this.#registerInspectorPanel(context);

    const animationPlugin = context.getPlugin(PluginIds.ANIMATION);
    if (!animationPlugin) throw new Error('AnimationPlugin not found');

    this._animationPlugin = animationPlugin;
    this._animationPanel = animationPlugin.getAnimationPanel?.() ?? null;

    this._animationPlugin.getAnimated?.().add?.(this);
    console.log('JSRApp install done, added to animated');
  }

  /**
   * Attempt to wire the app into AnimationPlugin (Assignment.java parity).
   * @param {import('./plugin/PluginContext.js').PluginContext} context
   * @returns {boolean} true if wiring succeeded, else false
   */
  #wireAnimationSupport(context) {
    const animationPlugin = context.getPlugin(PluginIds.ANIMATION);
    if (!animationPlugin) return false;

    this._animationPlugin = animationPlugin;
    this._animationPanel = animationPlugin.getAnimationPanel?.() ?? null;

    // Match Assignment.java behavior: default to animating this app instance,
    // not the whole scene graph, unless a subclass/plugin opts in.
    this._animationPlugin.setAnimateSceneGraph?.(false);

    // Match Assignment.java: add the app itself to the Animated list so it
    // receives startAnimation/endAnimation/setValueAtTime callbacks via
    // AnimationPanelListenerImpl (installed by AnimationPlugin).
    const animated = this._animationPlugin.getAnimated?.();
    animated?.add?.(this);
    return true;
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
    const aggregator = context.getPlugin(PluginIds.SHRINK_PANEL_AGGREGATOR);
    if (!aggregator || typeof aggregator.registerInspectorPanel !== 'function') {
      // Aggregator not yet registered - this shouldn't happen since we register it first
      // But handle it gracefully by waiting for it
      const unsubscribe = context.on('plugin:installed', (data) => {
        if (data.plugin && data.plugin.getInfo && data.plugin.getInfo().id === PluginIds.SHRINK_PANEL_AGGREGATOR) {
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
   * Get inspector descriptors for application parameters.
   * Subclasses can override this to expose editable parameters.
   *
   * The panel title is automatically set to the subclass name. Subclasses should
   * return a flat array of descriptors (no grouping required).
   *
   * @returns {Array<import('../core/inspect/descriptors/DescriptorTypes.js').InspectorDescriptor>}
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
   * Java parity: return the AnimationPlugin instance (if present).
   * @returns {AnimationPlugin|null}
   */
  getAnimationPlugin() {
    return this._animationPlugin;
  }

  /**
   * Java parity: return the AnimationPanel instance (if present).
   * @returns {import('../anim/gui/AnimationPanel.js').AnimationPanel|null}
   */
  getAnimationPanel() {
    return this._animationPanel;
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
    
    this.#jsrViewer.getViewer().render();
    
    // // Refresh inspector if it exists (plugin may have created it)
    // const controller = this.#jsrViewer.getController?.();
    // const inspectorPlugin = controller?.getPlugin?.(PluginIds.SCENE_GRAPH_INSPECTOR) || null;
    // const inspector = inspectorPlugin?.getInspector?.() || null;
    // inspector?.refresh?.();
  }

  setup3DCamera() {
    const camera = CameraUtility.getCamera(this.getViewer());
     camera.setFieldOfView(30);
    camera.setPerspective(true);
    camera.setNear(0.1);
    camera.setFar(100);
    CameraUtility.getCameraNode(this.getViewer()).getTransformation().setMatrix(
      MatrixBuilder.euclidean().translate(0, 0, 4).getArray());
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
    this.#isAnimating = true;
  }

  /**
   * End animation.
   * Override in subclasses to implement animation end behavior.
   */
  endAnimation() {
    this.#isAnimating = false;
  }

  /**
   * @returns {boolean}
   */
  isAnimating() {
    return this.#isAnimating;
  }

  /**
   * Named interface (used by anim core types).
   * @returns {string}
   */
  getName() {
    return this.#name;
  }

  /**
   * Named interface (used by anim core types).
   * @param {string} name
   */
  setName(name) {
    this.#name = String(name ?? '');
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
    if (this._animationPlugin) {
      const animated = this._animationPlugin.getAnimated?.();
      if (Array.isArray(animated)) {
        const idx = animated.indexOf(this);
        if (idx >= 0) animated.splice(idx, 1);
      }
    }
    this._animationPlugin = null;
    this._animationPanel = null;
    this._toolSystem = null;
  }
}
