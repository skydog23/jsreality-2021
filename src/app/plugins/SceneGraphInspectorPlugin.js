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
  /** @type {import('../../core/inspect/SceneGraphInspector.js').SceneGraphInspector|null} */
  #inspector = null;

  /** @type {Function|null} */
  #unsubscribeSceneChanged = null;

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

    this.#inspector = viewer.enableInspector();

    const refreshInspector = () => {
      const newRoot = context.getSceneRoot();
      if (this.#inspector && newRoot) {
        this.#inspector.setRoot(newRoot);
        this.#inspector.refresh();
      }
    };

    this.#unsubscribeSceneChanged = this.on('scene:changed', () => {
      logger.fine('Scene changed, refreshing inspector');
      refreshInspector();
    });

    refreshInspector();

    logger.info('SceneGraphInspector enabled via viewer');
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

    this.#inspector = null;

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
   * Refresh the inspector display.
   */
  refresh() {
    this.#inspector?.refresh();
  }

  /**
   * Get the underlying SceneGraphInspector instance.
   * Useful for advanced use cases that need direct access.
   * 
   * @returns {SceneGraphInspector|null}
   */
  getInspector() {
    return this.#inspector;
  }

  /**
   * Set the root scene graph component to inspect.
   * 
   * @param {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent} root
   */
  setRoot(root) {
    if (this.#inspector && root) {
      this.#inspector.setRoot(root);
      this.#inspector.refresh();
    }
  }
}

