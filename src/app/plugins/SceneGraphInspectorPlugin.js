/**
 * SceneGraphInspectorPlugin - Plugin that integrates SceneGraphInspector with JSRViewer.
 * 
 * This plugin wraps the SceneGraphInspector component and integrates it with
 * the JSRViewer plugin system, providing proper render callbacks and event handling.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { InspectorHost } from '../../core/inspect/InspectorHost.js';
import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('SceneGraphInspectorPlugin');

/**
 * Plugin that integrates SceneGraphInspector with JSRViewer.
 * 
 * The plugin:
 * 1. Creates and manages a SceneGraphInspector instance
 * 2. Provides the render callback so the inspector can trigger re-renders
 * 3. Listens for scene changes and refreshes the inspector
 * 4. Adds menu items for inspector controls
 */
export class SceneGraphInspectorPlugin extends JSRPlugin {
  /** @type {InspectorHost|null} */
  #host = null;

  /** @type {HTMLElement} */
  #container;

  /** @type {Function|null} */
  #unsubscribeSceneChanged = null;

  /**
   * Create a new SceneGraphInspectorPlugin.
   * 
   * @param {HTMLElement} container - Container element for the inspector UI
   */
  constructor(container) {
    super();
    if (!(container instanceof HTMLElement)) {
      throw new Error('SceneGraphInspectorPlugin requires an HTMLElement container');
    }
    this.#container = container;
  }

  /**
   * Get plugin metadata.
   * @returns {import('../plugin/JSRPlugin.js').PluginInfo}
   */
  getInfo() {
    return {
      id: 'scene-graph-inspector',
      name: 'Scene Graph Inspector',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Interactive inspector for exploring and editing scene graphs',
      dependencies: []
    };
  }

  /**
   * Install the plugin.
   * Creates the SceneGraphInspector and sets up event listeners.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {import('../plugin/PluginContext.js').PluginContext} context - Plugin context
   */
  async install(viewer, context) {
    await super.install(viewer, context);

    // Get scene root from viewer
    const sceneRoot = context.getSceneRoot();

    // Create inspector with render callback that uses the plugin context
    // This is the key integration point - the inspector calls context.render()
    // which goes through JSRViewer -> ViewerSwitch -> current viewer
    this.#host = new InspectorHost({
      container: this.#container,
      root: sceneRoot,
      renderCallback: () => {
        logger.fine('Inspector triggered render via plugin context');
        context.render();
      }
    });
    const inspector = this.#host.mount();

    // Listen for scene changes to refresh inspector
    this.#unsubscribeSceneChanged = this.on('scene:changed', (data) => {
      logger.fine('Scene changed, refreshing inspector');
      const newRoot = context.getSceneRoot();
      if (this.#host) {
        this.#host.setRoot(newRoot);
      }
      this.refresh();
    });

    // Initial refresh
    inspector?.refresh();

    logger.info('SceneGraphInspector created and integrated with viewer');
  }

  /**
   * Uninstall the plugin.
   * Cleans up the inspector and event listeners.
   */
  async uninstall() {
    // Unsubscribe from events
    if (this.#unsubscribeSceneChanged) {
      this.#unsubscribeSceneChanged();
      this.#unsubscribeSceneChanged = null;
    }

    // Clean up inspector
    if (this.#host) {
      this.#host.dispose();
      this.#host = null;
    }
    if (this.#container) {
      this.#container.innerHTML = '';
    }

    await super.uninstall();
    logger.info('SceneGraphInspector cleaned up');
  }

  /**
   * Get menu items to add to the menubar.
   * @returns {Array<import('../plugin/JSRPlugin.js').MenuItem>}
   */
  getMenuItems() {
    return [
      {
        menu: 'View',
        type: 'separator',
        priority: 35
      },
      {
        menu: 'View',
        label: 'Refresh Inspector',
        action: () => this.refresh(),
        priority: 36
      }
    ];
  }

  /**
   * Get UI configuration for the plugin.
   * @returns {import('../plugin/JSRPlugin.js').PluginUI}
   */
  getUI() {
    return {
      sidePanel: {
        container: this.#container,
        position: 'right',
        title: 'Inspector',
        icon: '🔍'
      }
    };
  }

  /**
   * Refresh the inspector display.
   */
  refresh() {
    if (this.#host?.getInspector()) {
      this.#host.getInspector().refresh();
    }
  }

  /**
   * Get the underlying SceneGraphInspector instance.
   * Useful for advanced use cases that need direct access.
   * 
   * @returns {SceneGraphInspector|null}
   */
  getInspector() {
    return this.#host ? this.#host.getInspector() : null;
  }

  /**
   * Set the root scene graph component to inspect.
   * 
   * @param {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent} root
   */
  setRoot(root) {
    if (this.#host) {
      this.#host.setRoot(root);
      this.refresh();
    }
  }
}

