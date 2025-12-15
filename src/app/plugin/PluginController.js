/**
 * PluginController - Central controller for plugin lifecycle and services.
 * 
 * Modeled on JRViewer's Controller, this class provides a unified interface
 * for plugins to access viewer services, register UI, and interact with
 * each other. It wraps the lower-level PluginManager and PluginLayoutManager.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('jsreality.app.plugin.PluginController');

/**
 * @typedef {Object} PanelSlotConfig
 * @property {string} [id] - Stable identifier to reuse a slot
 * @property {number} [initialSize=300] - Initial size in pixels
 * @property {number} [minSize=180] - Minimum size in pixels
 * @property {boolean} [fill=true] - Whether to fill available space
 * @property {string} [overflow='auto'] - CSS overflow policy
 * @property {string} [title] - Optional title for the panel
 */

/**
 * @typedef {Object} PanelSlotsVisibility
 * @property {boolean} [left] - Show left panel slot
 * @property {boolean} [right] - Show right panel slot (future)
 * @property {boolean} [top] - Show top panel slot
 * @property {boolean} [bottom] - Show bottom panel slot (future)
 */

/**
 * Central controller for plugin lifecycle and services.
 * Provides a JRViewer-like API for plugin registration, UI slots, and events.
 */
export class PluginController {
  /** @type {import('../JSRViewer.js').JSRViewer} */
  #viewer;

  /** @type {import('./PluginManager.js').PluginManager} */
  #pluginManager;

  /** @type {import('./PluginLayoutManager.js').PluginLayoutManager} */
  #layoutManager;

  /** @type {import('./EventBus.js').EventBus} */
  #eventBus;

  /** @type {Map<string, HTMLElement>} */
  #panelSlots = new Map();

  /** @type {PanelSlotsVisibility} */
  #panelVisibility = {
    left: false,
    right: false,
    top: false,
    bottom: false
  };

  /**
   * Create a new PluginController.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {import('./PluginManager.js').PluginManager} pluginManager - Plugin manager
   * @param {import('./PluginLayoutManager.js').PluginLayoutManager} layoutManager - Layout manager
   * @param {import('./EventBus.js').EventBus} eventBus - Event bus
   */
  constructor(viewer, pluginManager, layoutManager, eventBus) {
    this.#viewer = viewer;
    this.#pluginManager = pluginManager;
    this.#layoutManager = layoutManager;
    this.#eventBus = eventBus;
  }

  // ========================================================================
  // Plugin Registration (mirrors JRViewer.registerPlugin)
  // ========================================================================

  /**
   * Register and install a plugin.
   * 
   * @param {import('./JSRPlugin.js').JSRPlugin} plugin - The plugin to register
   * @returns {Promise<void>}
   */
  async registerPlugin(plugin) {
    return this.#pluginManager.registerPlugin(plugin);
  }

  /**
   * Uninstall a plugin by ID.
   * 
   * @param {string} pluginId - ID of the plugin to uninstall
   * @returns {Promise<void>}
   */
  async uninstallPlugin(pluginId) {
    return this.#pluginManager.uninstallPlugin(pluginId);
  }

  /**
   * Get a plugin by ID.
   * 
   * @template {import('./JSRPlugin.js').JSRPlugin} T
   * @param {string} pluginId - The plugin ID
   * @returns {T|null} The plugin instance or null
   */
  getPlugin(pluginId) {
    return this.#pluginManager.getPlugin(pluginId);
  }

  /**
   * Check if a plugin is registered.
   * 
   * @param {string} pluginId - The plugin ID
   * @returns {boolean}
   */
  hasPlugin(pluginId) {
    return this.#pluginManager.hasPlugin(pluginId);
  }

  /**
   * Get all registered plugins.
   * 
   * @returns {import('./JSRPlugin.js').JSRPlugin[]}
   */
  getAllPlugins() {
    return this.#pluginManager.getAllPlugins();
  }

  /**
   * Get plugin info for all registered plugins.
   * 
   * @returns {Array<import('./JSRPlugin.js').PluginInfo>}
   */
  getAllPluginInfo() {
    return this.#pluginManager.getAllPluginInfo();
  }

  // ========================================================================
  // Panel Slot Management (mirrors JRViewer.setShowPanelSlots)
  // ========================================================================

  /**
   * Request a left side panel slot.
   * 
   * @param {PanelSlotConfig} [config={}] - Panel configuration
   * @returns {HTMLElement} The panel container element
   */
  requestLeftPanel(config = {}) {
    const slotId = config.id || 'default';
    const cacheKey = `left:${slotId}`;
    
    if (this.#panelSlots.has(cacheKey)) {
      return this.#panelSlots.get(cacheKey);
    }

    const slot = this.#layoutManager.requestRegion('left', {
      id: slotId,
      initialSize: config.initialSize ?? 300,
      minSize: config.minSize ?? 180,
      fill: config.fill ?? true,
      overflow: config.overflow ?? 'auto'
    });

    this.#panelSlots.set(cacheKey, slot);
    this.#panelVisibility.left = true;

    logger.fine(`Left panel slot created: ${slotId}`);
    return slot;
  }

  /**
   * Request a top panel slot (e.g., for toolbars, menubars).
   * 
   * @param {PanelSlotConfig} [config={}] - Panel configuration
   * @returns {HTMLElement} The panel container element
   */
  requestTopPanel(config = {}) {
    const slotId = config.id || 'default';
    const cacheKey = `top:${slotId}`;
    
    if (this.#panelSlots.has(cacheKey)) {
      return this.#panelSlots.get(cacheKey);
    }

    const slot = this.#layoutManager.requestRegion('top', {
      id: slotId,
      padding: config.padding
    });

    this.#panelSlots.set(cacheKey, slot);
    this.#panelVisibility.top = true;

    logger.fine(`Top panel slot created: ${slotId}`);
    return slot;
  }

  /**
   * Request a right side panel slot.
   * 
   * @param {PanelSlotConfig} [config={}] - Panel configuration
   * @returns {HTMLElement} The panel container element
   */
  requestRightPanel(config = {}) {
    const slotId = config.id || 'default';
    const cacheKey = `right:${slotId}`;
    
    if (this.#panelSlots.has(cacheKey)) {
      return this.#panelSlots.get(cacheKey);
    }

    const slot = this.#layoutManager.requestRegion('right', {
      id: slotId,
      initialSize: config.initialSize ?? 300,
      minSize: config.minSize ?? 180,
      fill: config.fill ?? true,
      overflow: config.overflow ?? 'auto'
    });

    this.#panelSlots.set(cacheKey, slot);
    this.#panelVisibility.right = true;

    logger.fine(`Right panel slot created: ${slotId}`);
    return slot;
  }

  /**
   * Configure visibility of panel slots (similar to JRViewer.setShowPanelSlots).
   * 
   * @param {PanelSlotsVisibility} visibility - Visibility settings
   */
  setShowPanelSlots(visibility) {
    // Store the requested visibility, but only update explicitly provided values
    // This prevents accidentally hiding panels (like top/menubar) that weren't meant to be changed
    if (visibility.left !== undefined) {
      this.#panelVisibility.left = visibility.left;
    }
    if (visibility.right !== undefined) {
      this.#panelVisibility.right = visibility.right;
    }
    if (visibility.top !== undefined) {
      this.#panelVisibility.top = visibility.top;
    }
    if (visibility.bottom !== undefined) {
      this.#panelVisibility.bottom = visibility.bottom;
    }
    
    // Actually hide/show panels via PluginLayoutManager
    // Only pass the explicitly provided values, not the entire visibility object
    this.#layoutManager.setPanelVisibility(visibility);
    
    logger.fine(`Panel visibility updated: ${JSON.stringify(visibility)}`);
  }

  /**
   * Get current panel slot visibility settings.
   * 
   * @returns {PanelSlotsVisibility}
   */
  getPanelSlotsVisibility() {
    return { ...this.#panelVisibility };
  }

  /**
   * Check if a specific panel slot is visible/active.
   * 
   * @param {string} position - Panel position ('left', 'right', 'top', 'bottom')
   * @returns {boolean}
   */
  isPanelVisible(position) {
    return this.#panelVisibility[position] ?? false;
  }

  /**
   * Check if a panel slot exists (has been requested).
   * 
   * @param {string} position - Panel position ('left', 'right', 'top', 'bottom')
   * @returns {boolean}
   */
  hasPanel(position) {
    // Check if panel has been requested by checking if it's in the panel slots map
    // or if visibility has been explicitly set
    const prefix = `${position}:`;
    for (const key of this.#panelSlots.keys()) {
      if (key.startsWith(prefix)) {
        return true;
      }
    }
    // Also check if visibility has been set (panels set visibility when created)
    return this.#panelVisibility[position] !== undefined;
  }

  // ========================================================================
  // Event System
  // ========================================================================

  /**
   * Emit an event.
   * 
   * @param {string} eventType - Event type
   * @param {*} data - Event data
   */
  emit(eventType, data) {
    this.#eventBus.emit(eventType, data);
  }

  /**
   * Subscribe to an event.
   * 
   * @param {string} eventType - Event type
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback) {
    return this.#eventBus.on(eventType, callback);
  }

  /**
   * Subscribe to an event for one emission only.
   * 
   * @param {string} eventType - Event type
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(eventType, callback) {
    return this.#eventBus.once(eventType, callback);
  }

  // ========================================================================
  // Viewer Access
  // ========================================================================

  /**
   * Get the viewer instance.
   * 
   * @returns {import('../JSRViewer.js').JSRViewer}
   */
  getViewer() {
    return this.#viewer;
  }

  /**
   * Get the scene root.
   * 
   * @returns {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent}
   */
  getSceneRoot() {
    return this.#viewer.getSceneRoot();
  }

  /**
   * Get the tool system.
   * 
   * @returns {import('../../core/scene/tool/ToolSystem.js').ToolSystem|null}
   */
  getToolSystem() {
    return this.#viewer.getToolSystem();
  }

  /**
   * Trigger a render.
   */
  render() {
    this.#viewer.render();
  }

  /**
   * Get the layout manager.
   * 
   * @returns {import('./PluginLayoutManager.js').PluginLayoutManager}
   */
  getLayoutManager() {
    return this.#layoutManager;
  }

  // ========================================================================
  // Convenience Methods (mirrors JRViewer helpers)
  // ========================================================================

  /**
   * Encompass the content in view.
   */
  encompassEuclidean() {
    this.#viewer.encompassEuclidean();
  }

  /**
   * Reset the camera to default position.
   */
  resetCamera() {
    this.#viewer.resetCamera();
  }
}

