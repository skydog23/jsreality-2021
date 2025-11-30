/**
 * JSRPlugin - Base class for all JSRViewer plugins.
 * 
 * Plugins extend this class and override lifecycle methods to integrate
 * functionality into JSRViewer in a structured way.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('JSRPlugin');

/**
 * Base class for all JSRViewer plugins.
 * Plugins extend this class and override lifecycle methods.
 */
export class JSRPlugin {
  /** @type {import('../JSRViewer.js').JSRViewer|null} */
  viewer = null;

  /** @type {import('./PluginContext.js').PluginContext|null} */
  context = null;

  /**
   * Get plugin metadata.
   * Subclasses should override this to provide plugin information.
   * 
   * @returns {PluginInfo}
   */
  getInfo() {
    return {
      id: 'base-plugin',
      name: 'Base Plugin',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Base plugin class',
      dependencies: []
    };
  }

  /**
   * Called when plugin is installed into JSRViewer.
   * Subclasses should override this to initialize the plugin.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {import('./PluginContext.js').PluginContext} context - Plugin context with services
   * @returns {Promise<void>}
   */
  async install(viewer, context) {
    this.viewer = viewer;
    this.context = context;
    
    const info = this.getInfo();
    logger.info(`Installing plugin: ${info.name} (${info.id})`);
  }

  /**
   * Called when plugin is being uninstalled.
   * Subclasses should override this to clean up resources.
   * 
   * @returns {Promise<void>}
   */
  async uninstall() {
    const info = this.getInfo();
    logger.info(`Uninstalling plugin: ${info.name} (${info.id})`);
    
    this.viewer = null;
    this.context = null;
  }

  /**
   * Optional: Get UI components to add to viewer.
   * Subclasses can override this to provide UI integration.
   * 
   * @returns {PluginUI|null}
   */
  getUI() {
    return null;
  }

  /**
   * Optional: Get menu items to add to menubar.
   * Subclasses can override this to contribute menu items.
   * 
   * @returns {MenuItem[]|null}
   */
  getMenuItems() {
    return null;
  }

  /**
   * Optional: Handle events from the viewer or other plugins.
   * Subclasses can override this to respond to events.
   * 
   * @param {string} eventType - Type of event
   * @param {*} data - Event data
   */
  onEvent(eventType, data) {
    // Override in subclass to handle events
  }

  /**
   * Helper: Emit an event to other plugins.
   * 
   * @param {string} eventType - Type of event to emit
   * @param {*} data - Event data
   */
  emit(eventType, data) {
    if (this.context) {
      this.context.emit(eventType, data);
    }
  }

  /**
   * Helper: Subscribe to events.
   * 
   * @param {string} eventType - Type of event to listen for
   * @param {Function} callback - Callback function
   * @returns {Function|null} Unsubscribe function
   */
  on(eventType, callback) {
    if (this.context) {
      return this.context.on(eventType, callback);
    }
    return null;
  }
}

/**
 * @typedef {Object} PluginInfo
 * @property {string} id - Unique plugin identifier
 * @property {string} name - Human-readable plugin name
 * @property {string} vendor - Plugin vendor/author
 * @property {string} version - Plugin version
 * @property {string} [description] - Plugin description
 * @property {string[]} [dependencies] - Array of plugin IDs this depends on
 */

/**
 * @typedef {Object} PluginUI
 * @property {SidePanelConfig} [sidePanel] - Side panel configuration
 * @property {HTMLElement} [overlay] - Overlay element
 * @property {HTMLElement} [toolbar] - Toolbar element
 */

/**
 * @typedef {Object} SidePanelConfig
 * @property {HTMLElement} container - Container element for panel content
 * @property {string} position - Panel position ('left', 'right', 'bottom')
 * @property {string} title - Panel title
 * @property {string} [icon] - Panel icon (emoji or icon name)
 * @property {number} [width] - Panel width in pixels
 * @property {number} [height] - Panel height in pixels
 */

/**
 * @typedef {Object} MenuItem
 * @property {string} menu - Menu name (e.g., 'File', 'View')
 * @property {string} label - Menu item label
 * @property {string} [type] - Item type ('normal', 'radio', 'checkbox', 'separator')
 * @property {string} [groupName] - Radio button group name
 * @property {boolean} [checked] - Initial checked state for radio/checkbox
 * @property {Function} [action] - Callback when item is clicked
 * @property {number} [priority] - Menu item priority (lower = earlier)
 * @property {string} [shortcut] - Keyboard shortcut display
 * @property {boolean} [disabled] - Whether item is disabled
 */

