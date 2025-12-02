/**
 * PluginContext - Context provided to plugins during installation.
 * 
 * Provides access to viewer services, other plugins, and event system.
 * This is the primary interface through which plugins interact with
 * the viewer and each other.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Context provided to plugins during installation.
 * Provides access to viewer services and other plugins.
 */
export class PluginContext {
  /** @type {import('../JSRViewer.js').JSRViewer} */
  #viewer;

  /** @type {Map<string, import('./JSRPlugin.js').JSRPlugin>} */
  #plugins;

  /** @type {import('./EventBus.js').EventBus} */
  #eventBus;

  /** @type {import('./PluginLayoutManager.js').PluginLayoutManager} */
  #layoutManager;

  /**
   * Create a new plugin context.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {Map<string, import('./JSRPlugin.js').JSRPlugin>} plugins - Map of registered plugins
   * @param {import('./EventBus.js').EventBus} eventBus - The event bus instance
   * @param {import('./PluginLayoutManager.js').PluginLayoutManager} layoutManager - Layout manager
   */
  constructor(viewer, plugins, eventBus, layoutManager) {
    this.#viewer = viewer;
    this.#plugins = plugins;
    this.#eventBus = eventBus;
    this.#layoutManager = layoutManager;
  }

  /**
   * Get another plugin by ID.
   * This allows plugins to access functionality from other plugins.
   * 
   * @param {string} pluginId - The plugin ID to look up
   * @returns {import('./JSRPlugin.js').JSRPlugin|null} The plugin instance or null if not found
   */
  getPlugin(pluginId) {
    return this.#plugins.get(pluginId) || null;
  }

  /**
   * Check if a plugin is registered.
   * 
   * @param {string} pluginId - The plugin ID to check
   * @returns {boolean} True if plugin is registered
   */
  hasPlugin(pluginId) {
    return this.#plugins.has(pluginId);
  }

  /**
   * Get all registered plugin IDs.
   * 
   * @returns {string[]} Array of plugin IDs
   */
  getPluginIds() {
    return Array.from(this.#plugins.keys());
  }

  /**
   * Emit an event to other plugins.
   * 
   * @param {string} eventType - Type of event to emit
   * @param {*} data - Event data
   */
  emit(eventType, data) {
    this.#eventBus.emit(eventType, data);
  }

  /**
   * Subscribe to events.
   * 
   * @param {string} eventType - Type of event to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback) {
    return this.#eventBus.on(eventType, callback);
  }

  /**
   * Subscribe to an event for one emission only.
   * 
   * @param {string} eventType - Type of event to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(eventType, callback) {
    return this.#eventBus.once(eventType, callback);
  }

  /**
   * Get the viewer instance.
   * Provides access to viewer methods and properties.
   * 
   * @returns {import('../JSRViewer.js').JSRViewer} The viewer instance
   */
  getViewer() {
    return this.#viewer;
  }

  /**
   * Get the centralized layout manager.
   * @returns {import('./PluginLayoutManager.js').PluginLayoutManager}
   */
  getLayoutManager() {
    return this.#layoutManager;
  }

  /**
   * Request a layout region (top bar, left panel, etc.) for UI mounting.
   * Convenience wrapper around PluginLayoutManager.
   *
   * @param {string} regionName
   * @param {Object} [options]
   * @returns {HTMLElement}
   */
  requestRegion(regionName, options = {}) {
    if (!this.#layoutManager) {
      throw new Error('Layout manager is not available in this context');
    }
    return this.#layoutManager.requestRegion(regionName, options);
  }

  /**
   * Get the MenubarPlugin instance.
   * Returns the menubar plugin if registered, null otherwise.
   * 
   * @returns {import('../plugins/MenubarPlugin.js').MenubarPlugin|null} The menubar plugin or null
   */
  getMenubarPlugin() {
    return this.getPlugin('menubar') || null;
  }

  /**
   * Add a menu item via the MenubarPlugin.
   * Convenience method that delegates to MenubarPlugin if available.
   * 
   * @param {string} menuName - Name of the menu (e.g., 'File', 'View')
   * @param {Object} item - Menu item configuration
   * @param {number} [priority=50] - Priority for ordering
   */
  addMenuItem(menuName, item, priority = 50) {
    const menubarPlugin = this.getMenubarPlugin();
    if (menubarPlugin) {
      menubarPlugin.addMenuItem(menuName, item, priority);
    }
  }

  /**
   * Add a menu separator via the MenubarPlugin.
   * Convenience method that delegates to MenubarPlugin if available.
   * 
   * @param {string} menuName - Name of the menu
   * @param {number} [priority=50] - Priority for ordering
   */
  addMenuSeparator(menuName, priority = 50) {
    const menubarPlugin = this.getMenubarPlugin();
    if (menubarPlugin) {
      menubarPlugin.addMenuSeparator(menuName, priority);
    }
  }

  /**
   * Get the viewer's scene root.
   * 
   * @returns {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent} The scene root
   */
  getSceneRoot() {
    return this.#viewer.getSceneRoot();
  }

  /**
   * Get the viewer's tool system.
   * 
   * @returns {import('../../core/scene/tool/ToolSystem.js').ToolSystem|null} The tool system
   */
  getToolSystem() {
    return this.#viewer.getToolSystem();
  }

  /**
   * Render the viewer.
   * Convenience method for triggering a re-render.
   */
  render() {
    this.#viewer.render();
  }
}

