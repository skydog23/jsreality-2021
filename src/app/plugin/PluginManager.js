/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * PluginManager - Manages plugin lifecycle and dependencies.
 * 
 * Handles plugin registration, installation, uninstallation, and
 * dependency checking. Integrates plugin UI into the viewer.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { getLogger } from '../../core/util/LoggingSystem.js';
import { PluginContext } from './PluginContext.js';

const logger = getLogger('jsreality.app.plugin.PluginManager');

/**
 * Manages plugin lifecycle and dependencies.
 */
export class PluginManager {
  /** @type {Map<string, import('./JSRPlugin.js').JSRPlugin>} */
  #plugins = new Map();

  /** @type {import('../JSRViewer.js').JSRViewer} */
  #viewer;

  /** @type {import('./EventBus.js').EventBus} */
  #eventBus;

  /** @type {Set<Function>} */
  #unsubscribeFunctions = new Set();

  /** @type {import('./PluginLayoutManager.js').PluginLayoutManager|null} */
  #layoutManager = null;

  /**
   * Create a new plugin manager.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {import('./EventBus.js').EventBus} eventBus - The event bus instance
   * @param {import('./PluginLayoutManager.js').PluginLayoutManager|null} [layoutManager=null] - Layout manager
   */
  constructor(viewer, eventBus, layoutManager = null) {
    this.#viewer = viewer;
    this.#eventBus = eventBus;
    this.#layoutManager = layoutManager;
  }

  /**
   * Register and install a plugin.
   * 
   * @param {import('./JSRPlugin.js').JSRPlugin} plugin - The plugin to register
   * @returns {Promise<void>}
   * @throws {Error} If plugin is already registered or dependencies are missing
   */
  async registerPlugin(plugin) {
    const info = plugin.getInfo();
    
    logger.info(`Registering plugin: ${info.name} (${info.id})`);

    // Check if already registered
    if (this.#plugins.has(info.id)) {
      throw new Error(`Plugin ${info.id} is already registered`);
    }

    // Check dependencies
    if (info.dependencies && info.dependencies.length > 0) {
      for (const depId of info.dependencies) {
        if (!this.#plugins.has(depId)) {
          throw new Error(
            `Plugin ${info.id} depends on ${depId} which is not registered. ` +
            `Please register ${depId} before ${info.id}.`
          );
        }
      }
      logger.fine(`Dependencies satisfied for ${info.id}: ${info.dependencies.join(', ')}`);
    }

    // Create context
    const context = new PluginContext(
      this.#viewer,
      this.#plugins,
      this.#eventBus,
      this.#layoutManager
    );

    try {
      // Install plugin
      await plugin.install(this.#viewer, context);
      
      // Register
      this.#plugins.set(info.id, plugin);

      // Integrate UI
      await this.#integrateUI(plugin);

      // Subscribe plugin to events if it has onEvent method
      if (typeof plugin.onEvent === 'function') {
        const unsubscribe = this.#eventBus.on('*', (data) => {
          plugin.onEvent(data.eventType, data.data);
        });
        this.#unsubscribeFunctions.add(unsubscribe);
      }

      // Emit event
      this.#eventBus.emit('plugin:installed', { plugin, info });

      logger.info(`Plugin registered successfully: ${info.name} (${info.id})`);
    } catch (error) {
      logger.severe(`Failed to install plugin ${info.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Uninstall a plugin.
   * 
   * @param {string} pluginId - ID of the plugin to uninstall
   * @returns {Promise<void>}
   * @throws {Error} If plugin has dependents or doesn't exist
   */
  async uninstallPlugin(pluginId) {
    const plugin = this.#plugins.get(pluginId);
    if (!plugin) {
      logger.warn(`Attempted to uninstall non-existent plugin: ${pluginId}`);
      return;
    }

    const info = plugin.getInfo();
    logger.info(`Uninstalling plugin: ${info.name} (${info.id})`);

    // Check if other plugins depend on this
    for (const [id, p] of this.#plugins) {
      const pInfo = p.getInfo();
      if (pInfo.dependencies && pInfo.dependencies.includes(pluginId)) {
        throw new Error(
          `Cannot uninstall ${pluginId}: plugin ${id} depends on it. ` +
          `Please uninstall ${id} first.`
        );
      }
    }

    try {
      // Uninstall plugin
      await plugin.uninstall();
      
      // Remove from registry
      this.#plugins.delete(pluginId);

      // Emit event
      this.#eventBus.emit('plugin:uninstalled', { pluginId, info });

      logger.info(`Plugin uninstalled successfully: ${info.name} (${info.id})`);
    } catch (error) {
      logger.severe(`Failed to uninstall plugin ${pluginId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a plugin by ID.
   * 
   * @param {string} pluginId - The plugin ID
   * @returns {import('./JSRPlugin.js').JSRPlugin|null} The plugin instance or null
   */
  getPlugin(pluginId) {
    return this.#plugins.get(pluginId) || null;
  }

  /**
   * Check if a plugin is registered.
   * 
   * @param {string} pluginId - The plugin ID
   * @returns {boolean} True if registered
   */
  hasPlugin(pluginId) {
    return this.#plugins.has(pluginId);
  }

  /**
   * Get all registered plugins.
   * 
   * @returns {import('./JSRPlugin.js').JSRPlugin[]} Array of plugin instances
   */
  getAllPlugins() {
    return Array.from(this.#plugins.values());
  }

  /**
   * Get plugin information for all registered plugins.
   * 
   * @returns {Array<import('./JSRPlugin.js').PluginInfo>} Array of plugin info
   */
  getAllPluginInfo() {
    return this.getAllPlugins().map(p => p.getInfo());
  }

  /**
   * Uninstall all plugins.
   * Plugins are uninstalled in reverse order of registration.
   * 
   * @returns {Promise<void>}
   */
  async uninstallAll() {
    logger.info('Uninstalling all plugins');
    
    const pluginIds = Array.from(this.#plugins.keys()).reverse();
    for (const pluginId of pluginIds) {
      try {
        await this.uninstallPlugin(pluginId);
      } catch (error) {
        logger.severe(`Error uninstalling plugin ${pluginId}: ${error.message}`);
      }
    }

    // Clean up event subscriptions
    for (const unsubscribe of this.#unsubscribeFunctions) {
      unsubscribe();
    }
    this.#unsubscribeFunctions.clear();

    logger.info('All plugins uninstalled');
  }

  /**
   * Integrate plugin UI into viewer.
   * 
   * Note: Menu items are now handled by MenubarPlugin via the 'plugin:installed' event.
   * This method only handles other UI integration (side panels, toolbars, overlays).
   * 
   * @param {import('./JSRPlugin.js').JSRPlugin} plugin - The plugin
   * @returns {Promise<void>}
   * @private
   */
  async #integrateUI(plugin) {
    const info = plugin.getInfo();

    // Note: Menu items are handled by MenubarPlugin via 'plugin:installed' event
    // MenubarPlugin listens for this event and calls plugin.getMenuItems()

    // Integrate other UI (side panels, toolbars, overlays)
    // TODO: Implement side panel system when needed
    const ui = plugin.getUI();
    if (ui) {
      if (ui.sidePanel) {
        logger.fine(`Plugin ${info.id} provides side panel (deferred: side panel system not yet implemented)`);
        // TODO: Integrate with side panel system
      }
      if (ui.toolbar) {
        logger.fine(`Plugin ${info.id} provides toolbar (deferred: toolbar system not yet implemented)`);
        // TODO: Integrate with toolbar system
      }
      if (ui.overlay) {
        logger.fine(`Plugin ${info.id} provides overlay (deferred: overlay system not yet implemented)`);
        // TODO: Integrate with overlay system
      }
    }
  }
}

