/**
 * PanelShowMenuPlugin - Plugin that adds checkboxes to View menu for showing/hiding panels.
 * 
 * Adds menu items to the View menu that allow users to toggle visibility of
 * left, right, top, and bottom panel slots (if they exist).
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('PanelShowMenuPlugin');

/**
 * Plugin that adds panel visibility checkboxes to the View menu.
 */
export class PanelShowMenuPlugin extends JSRPlugin {
  /** @type {import('../plugin/PluginController.js').PluginController|null} */
  #controller = null;

  /**
   * Get plugin metadata.
   * @returns {import('../plugin/JSRPlugin.js').PluginInfo}
   */
  getInfo() {
    return {
      id: 'panel-show-menu',
      name: 'Panel Show Menu',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Adds checkboxes to View menu for showing/hiding panels',
      dependencies: ['menubar']  // Requires MenubarPlugin
    };
  }

  /**
   * Install the plugin.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {import('../plugin/PluginContext.js').PluginContext} context - Plugin context
   */
  async install(viewer, context) {
    await super.install(viewer, context);
    
    this.#controller = context.getController();
    if (!this.#controller) {
      logger.warn('PluginController not available, panel menu items will not be added');
      return;
    }

    logger.info('PanelShowMenuPlugin installed');
  }

  /**
   * Get menu items to add to the menubar.
   * @returns {Array<import('../plugin/JSRPlugin.js').MenuItem>}
   */
  getMenuItems() {
    if (!this.#controller) {
      return [];
    }

    const menuItems = [];
    
    // Add separator before panel visibility items
    menuItems.push({
      menu: 'View',
      type: 'separator',
      priority: 40
    });

    // Check which panels exist (have been requested)
    const panelSlots = this.#controller.getPanelSlotsVisibility();
    const hasLeft = this.#hasPanel('left');
    const hasRight = this.#hasPanel('right');
    // Don't include top panel - it contains the menubar and should always be visible
    // const hasTop = this.#hasPanel('top');
    const hasBottom = this.#hasPanel('bottom');

    let priority = 41;

    // Add checkbox for left panel if it exists
    if (hasLeft) {
      menuItems.push({
        menu: 'View',
        label: 'Show Left Panel',
        type: 'checkbox',
        checked: panelSlots.left ?? false,
        action: () => this.#togglePanel('left'),
        priority: priority++
      });
    }

    // Add checkbox for right panel if it exists
    if (hasRight) {
      menuItems.push({
        menu: 'View',
        label: 'Show Right Panel',
        type: 'checkbox',
        checked: panelSlots.right ?? false,
        action: () => this.#togglePanel('right'),
        priority: priority++
      });
    }

    // Don't add checkbox for top panel - it contains the menubar and should always be visible
    // Users shouldn't be able to hide it via the menu

    // Add checkbox for bottom panel if it exists
    if (hasBottom) {
      menuItems.push({
        menu: 'View',
        label: 'Show Bottom Panel',
        type: 'checkbox',
        checked: panelSlots.bottom ?? false,
        action: () => this.#togglePanel('bottom'),
        priority: priority++
      });
    }

    return menuItems;
  }

  /**
   * Check if a panel exists (has been requested).
   * @param {string} position - Panel position ('left', 'right', 'top', 'bottom')
   * @returns {boolean}
   * @private
   */
  #hasPanel(position) {
    if (!this.#controller) return false;
    return this.#controller.hasPanel(position);
  }

  /**
   * Toggle panel visibility.
   * @param {string} position - Panel position ('left', 'right', 'top', 'bottom')
   * @private
   */
  #togglePanel(position) {
    if (!this.#controller) return;
    
    const currentVisibility = this.#controller.getPanelSlotsVisibility();
    const newVisibility = {
      ...currentVisibility,
      [position]: !(currentVisibility[position] ?? false)
    };
    
    this.#controller.setShowPanelSlots(newVisibility);
    logger.info(`Toggled ${position} panel visibility to ${newVisibility[position]}`);
  }
}

