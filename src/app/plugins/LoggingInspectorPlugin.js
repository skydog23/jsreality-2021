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
 * LoggingInspectorPlugin - Plugin that integrates LoggingInspector with JSRViewer.
 * 
 * Creates a side panel that shows all known loggers in a tree view and
 * allows the user to inspect and change their log levels.
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { LoggingInspector } from '../../core/inspect/LoggingInspector.js';
import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('jsreality.app.plugins.LoggingInspectorPlugin');

export class LoggingInspectorPlugin extends JSRPlugin {
  /** @type {LoggingInspector|null} */
  #inspector = null;

  /** @type {'left'|'right'} */
  #panelSide;

  /** @type {number} */
  #initialSize;

  /** @type {number} */
  #minSize;

  /**
   * @param {Object} [options]
   * @param {'left'|'right'} [options.panelSide='right'] - Which side to place the logging inspector panel
   * @param {number} [options.initialSize=260] - Initial panel size in pixels
   * @param {number} [options.minSize=200] - Minimum panel size in pixels
   */
  constructor(options = {}) {
    super();
    this.#panelSide = options.panelSide || 'right';
    this.#initialSize = options.initialSize ?? 260;
    this.#minSize = options.minSize ?? 200;
  }

  /**
   * Get plugin metadata.
   * @returns {import('../plugin/JSRPlugin.js').PluginInfo}
   */
  getInfo() {
    return {
      id: 'logging-inspector',
      name: 'Logging Inspector',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Control panel for inspecting and configuring loggers',
      dependencies: []
    };
  }

  /**
   * Install the plugin.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer
   * @param {import('../plugin/PluginContext.js').PluginContext} context
   */
  async install(viewer, context) {
    await super.install(viewer, context);

    logger.info(-1, 'LoggingInspectorPlugin installing...');

    const controller = context.getController();
    if (!controller) {
      logger.severe(-1, 'Controller not available in context!');
      throw new Error('PluginController not available');
    }

    const container = this.#panelSide === 'left'
      ? controller.requestLeftPanel({
          id: 'logging-inspector',
          initialSize: this.#initialSize,
          minSize: this.#minSize,
          fill: true,
          overflow: 'auto'
        })
      : controller.requestRightPanel({
          id: 'logging-inspector',
          initialSize: this.#initialSize,
          minSize: this.#minSize,
          fill: true,
          overflow: 'auto'
        });

    if (!container) {
      logger.severe(-1, 'Failed to get logging inspector container!');
      throw new Error('Failed to create logging inspector container');
    }

    this.#inspector = new LoggingInspector(container);
    logger.info(-1, 'LoggingInspectorPlugin installed successfully');
  }

  /**
   * Uninstall the plugin.
   */
  async uninstall() {
    if (this.#inspector) {
      this.#inspector.dispose();
      this.#inspector = null;
    }

    await super.uninstall();
    logger.info(-1, 'LoggingInspectorPlugin cleaned up');
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
        priority: 40
      },
      {
        menu: 'View',
        label: 'Refresh Logging Inspector',
        action: () => this.refresh(),
        priority: 41
      }
    ];
  }

  /**
   * Refresh the logging inspector view.
   */
  refresh() {
    this.#inspector?.refresh();
  }
}

