/**
 * ShrinkPanelAggregator - Aggregates inspector panels from multiple plugins.
 * 
 * Similar to jReality's ShrinkPanelAggregator, this plugin provides a container
 * where plugins can register their inspector panels. Panels are stacked vertically
 * and can be individually collapsed/expanded.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('ShrinkPanelAggregator');

/**
 * Aggregates inspector panels from multiple plugins.
 * Plugins register their inspector panels during install().
 */
export class ShrinkPanelAggregator extends JSRPlugin {
  /** @type {HTMLElement|null} */
  #container = null;

  /** @type {HTMLElement|null} */
  #panelContainer = null;

  /** @type {Map<string, HTMLElement>} */
  #registeredPanels = new Map();

  /** @type {'left'|'right'} */
  #panelSide;

  /** @type {number} */
  #initialSize;

  /** @type {number} */
  #minSize;

  /**
   * Create a new ShrinkPanelAggregator.
   * 
   * @param {Object} [options] - Plugin options
   * @param {'left'|'right'} [options.panelSide='right'] - Which side to place the panel
   * @param {number} [options.initialSize=300] - Initial panel size in pixels
   * @param {number} [options.minSize=200] - Minimum panel size in pixels
   */
  constructor(options = {}) {
    super();
    this.#panelSide = options.panelSide || 'right';
    this.#initialSize = options.initialSize ?? 300;
    this.#minSize = options.minSize ?? 200;
  }

  /**
   * Get plugin metadata.
   * @returns {import('../plugin/JSRPlugin.js').PluginInfo}
   */
  getInfo() {
    return {
      id: 'shrink-panel-aggregator',
      name: 'Shrink Panel Aggregator',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Aggregates inspector panels from multiple plugins',
      dependencies: []
    };
  }

  /**
   * Install the plugin.
   * Creates the container panel where plugins can register their inspectors.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {import('../plugin/PluginContext.js').PluginContext} context - Plugin context
   */
  async install(viewer, context) {
    await super.install(viewer, context);

    logger.info('ShrinkPanelAggregator installing...');

    // Get the controller for cleaner API access
    const controller = context.getController();
    if (!controller) {
      logger.severe('Controller not available in context!');
      throw new Error('PluginController not available');
    }

    // Request a panel for plugin inspectors using the controller API
    const inspectorContainer = this.#panelSide === 'right'
      ? controller.requestRightPanel({
          id: 'shrink-panel-aggregator',
          initialSize: this.#initialSize,
          minSize: this.#minSize,
          fill: true,
          overflow: 'hidden' // We'll handle scrolling in individual panels
        })
      : controller.requestLeftPanel({
          id: 'shrink-panel-aggregator',
          initialSize: this.#initialSize,
          minSize: this.#minSize,
          fill: true,
          overflow: 'hidden'
        });

    if (!inspectorContainer) {
      logger.severe('Failed to get inspector container!');
      throw new Error('Failed to create inspector container');
    }

    this.#container = inspectorContainer;
    this.#container.style.display = 'flex';
    this.#container.style.flexDirection = 'column';
    this.#container.style.width = '100%';
    this.#container.style.height = '100%';

    // Create panel container for stacking collapsible panels
    this.#panelContainer = document.createElement('div');
    this.#panelContainer.className = 'jsr-shrink-panel-container';
    this.#panelContainer.style.display = 'flex';
    this.#panelContainer.style.flexDirection = 'column';
    this.#panelContainer.style.flex = '1 1 auto';
    this.#panelContainer.style.minHeight = '0';
    this.#panelContainer.style.overflowY = 'auto';
    this.#panelContainer.style.width = '100%';

    this.#container.appendChild(this.#panelContainer);

    logger.info('ShrinkPanelAggregator installed successfully');
  }

  /**
   * Uninstall the plugin.
   */
  async uninstall() {
    this.#registeredPanels.clear();
    this.#panelContainer = null;
    this.#container = null;

    await super.uninstall();
    logger.info('ShrinkPanelAggregator uninstalled');
  }

  /**
   * Register an inspector panel from a plugin.
   * Called by plugins during their install() method.
   * 
   * @param {string} pluginId - Unique identifier for the plugin
   * @param {HTMLElement} panel - The collapsible panel element (created with createCollapsiblePanel)
   */
  registerInspectorPanel(pluginId, panel) {
    if (!panel || !(panel instanceof HTMLElement)) {
      logger.warn(`Invalid panel provided by plugin ${pluginId}`);
      return;
    }

    // Remove if already registered
    if (this.#registeredPanels.has(pluginId)) {
      const oldPanel = this.#registeredPanels.get(pluginId);
      if (oldPanel && oldPanel.parentElement === this.#panelContainer) {
        this.#panelContainer.removeChild(oldPanel);
      }
    }

    // Add to container
    this.#panelContainer.appendChild(panel);
    this.#registeredPanels.set(pluginId, panel);

    logger.info(`Registered inspector panel for plugin: ${pluginId}`);
  }

  /**
   * Unregister an inspector panel.
   * Called when a plugin uninstalls.
   * 
   * @param {string} pluginId - Plugin identifier
   */
  unregisterInspectorPanel(pluginId) {
    const panel = this.#registeredPanels.get(pluginId);
    if (panel && panel.parentElement === this.#panelContainer) {
      this.#panelContainer.removeChild(panel);
    }
    this.#registeredPanels.delete(pluginId);

    logger.info(`Unregistered inspector panel for plugin: ${pluginId}`);
  }
}

