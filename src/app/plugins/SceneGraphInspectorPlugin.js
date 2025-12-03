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
import { SceneGraphInspector } from '../../core/inspect/SceneGraphInspector.js';
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

  /** @type {'left'|'right'} */
  #panelSide;

  /** @type {number} */
  #initialSize;

  /** @type {number} */
  #minSize;

  /**
   * Create a new SceneGraphInspectorPlugin.
   * 
   * @param {Object} [options] - Plugin options
   * @param {'left'|'right'} [options.panelSide='left'] - Which side to place the inspector panel
   * @param {number} [options.initialSize=300] - Initial panel size in pixels
   * @param {number} [options.minSize=200] - Minimum panel size in pixels
   */
  constructor(options = {}) {
    super();
    this.#panelSide = options.panelSide || 'left';
    this.#initialSize = options.initialSize ?? 300;
    this.#minSize = options.minSize ?? 200;
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

    logger.info('SceneGraphInspectorPlugin installing...');
    
    // Get the controller for cleaner API access
    const controller = context.getController();
    if (!controller) {
      logger.severe('Controller not available in context!');
      throw new Error('PluginController not available');
    }

    // Request a panel for the inspector using the controller API
    // Use the configured side (left or right)
    const inspectorContainer = this.#panelSide === 'right'
      ? controller.requestRightPanel({
          id: 'scene-graph-inspector',
          initialSize: this.#initialSize,
          minSize: this.#minSize,
          fill: true,
          overflow: 'auto'
        })
      : controller.requestLeftPanel({
          id: 'scene-graph-inspector',
          initialSize: this.#initialSize,
          minSize: this.#minSize,
          fill: true,
          overflow: 'auto'
        });

    if (!inspectorContainer) {
      logger.severe('Failed to get inspector container!');
      throw new Error('Failed to create inspector container');
    }

    logger.info(`Inspector container obtained: ${inspectorContainer ? 'yes' : 'no'}`);

    // Get scene root
    const sceneRoot = controller.getSceneRoot();
    if (!sceneRoot) {
      logger.severe('Scene root not available!');
      throw new Error('Scene root not available');
    }

    logger.info(`Scene root obtained: ${sceneRoot ? 'yes' : 'no'}`);

    // Create the inspector
    const renderCallback = () => {
      controller.render();
    };

    this.#inspector = new SceneGraphInspector(inspectorContainer, sceneRoot, {
      onRender: renderCallback
    });

    if (!this.#inspector) {
      logger.severe('Failed to create SceneGraphInspector instance!');
      throw new Error('Failed to create SceneGraphInspector');
    }

    logger.info('SceneGraphInspector instance created');

    // Set up refresh handler
    const refreshInspector = () => {
      const newRoot = controller.getSceneRoot();
      if (this.#inspector && newRoot) {
        logger.fine(`Refreshing inspector with root: ${newRoot}`);
        this.#inspector.setRoot(newRoot);
        this.#inspector.refresh();
      } else {
        logger.warn(`Cannot refresh inspector: inspector=${!!this.#inspector}, root=${!!newRoot}`);
      }
    };

    // Subscribe to scene changes
    this.#unsubscribeSceneChanged = controller.on('scene:changed', () => {
      logger.fine('Scene changed, refreshing inspector');
      refreshInspector();
    });

    // Initial refresh
    refreshInspector();

    logger.info('SceneGraphInspectorPlugin installed successfully');
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

