/**
 * InspectorPlugin - Plugin that provides scene graph inspection capabilities.
 * 
 * Wraps the SceneGraphInspector and integrates it with JSRViewer's event system.
 * Automatically triggers renders when properties are changed in the inspector.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { SceneGraphInspector } from '../../core/inspect/SceneGraphInspector.js';

/**
 * Plugin that provides scene graph inspection capabilities.
 */
export class InspectorPlugin extends JSRPlugin {
  /** @type {SceneGraphInspector|null} */
  #inspector = null;

  /** @type {HTMLElement|null} */
  #container = null;

  /**
   * Create a new InspectorPlugin.
   * @param {HTMLElement} container - Container element for the inspector
   */
  constructor(container) {
    super();
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
      description: 'Interactive scene graph inspector with property editing',
      dependencies: []
    };
  }

  /**
   * Install plugin.
   * @param {import('../JSRViewer.js').JSRViewer} viewer
   * @param {import('../plugin/PluginContext.js').PluginContext} context
   */
  async install(viewer, context) {
    await super.install(viewer, context);

    const sceneRoot = context.getSceneRoot();
    if (!sceneRoot) {
      throw new Error('InspectorPlugin requires a scene root');
    }

    // Create the inspector
    this.#inspector = new SceneGraphInspector(this.#container, sceneRoot);

    // Hook up the inspector's render callback to the viewer
    // The inspector will emit 'property-changed' events
    this.on('inspector:property-changed', () => {
      context.render();
    });

    // Set up the global callback that the inspector uses
    // This is a bridge until we refactor SceneGraphInspector to use events
    if (typeof window !== 'undefined') {
      window._viewerInstance = {
        render: () => {
          this.emit('inspector:property-changed');
        }
      };
    }

    // Listen for scene changes from other plugins
    this.on('scene:changed', () => {
      if (this.#inspector) {
        this.#inspector.refresh();
      }
    });

    // Auto-expand root node
    this.#inspector.refresh();
  }

  /**
   * Uninstall plugin.
   */
  async uninstall() {
    // Clean up inspector
    this.#inspector = null;

    // Clean up global
    if (typeof window !== 'undefined' && window._viewerInstance) {
      delete window._viewerInstance;
    }

    await super.uninstall();
  }

  /**
   * Get the inspector instance.
   * @returns {SceneGraphInspector|null}
   */
  getInspector() {
    return this.#inspector;
  }

  /**
   * Refresh the inspector display.
   */
  refresh() {
    if (this.#inspector) {
      this.#inspector.refresh();
    }
  }
}

