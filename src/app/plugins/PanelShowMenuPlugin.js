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
import { PluginIds } from '../plugin/PluginIds.js';

const logger = getLogger('jsreality.app.plugins.PanelShowMenuPlugin');

/**
 * Plugin that adds panel visibility checkboxes to the View menu.
 */
export class PanelShowMenuPlugin extends JSRPlugin {
  /** @type {import('../plugin/PluginController.js').PluginController|null} */
  #controller = null;

  /** @type {import('../plugin/PluginContext.js').PluginContext|null} */
  #context = null;

  /** @type {Function|null} */
  #unsubscribeVisibility = null;

  /**
   * Get plugin metadata.
   * @returns {import('../plugin/JSRPlugin.js').PluginInfo}
   */
  getInfo() {
    return {
      id: PluginIds.PANEL_SHOW_MENU,
      name: 'Panel Show Menu',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Adds checkboxes to View menu for showing/hiding panels',
      dependencies: [PluginIds.MENUBAR]  // Requires MenubarPlugin
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
    
    this.#context = context;
    this.#controller = context.getController();
    if (!this.#controller) {
      logger.warn('PluginController not available, panel menu items will not be added');
      return;
    }

    // Keep menu checkmarks in sync with programmatic visibility changes (e.g. JSRApp startup).
    this.#unsubscribeVisibility = this.on('panels:visibility', (data) => {
      const visibility = data?.visibility ?? {};
      for (const pos of ['left', 'right', 'top', 'bottom']) {
        if (this.#hasPanel(pos)) {
          this.#updateMenuCheckmark(pos, Boolean(visibility[pos]));
        }
      }
    });

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
    const hasTop = this.#hasPanel('top');
    const hasBottom = this.#hasPanel('bottom');

    let priority = 41;

    // Add checkbox for left panel if it exists
    if (hasLeft) {
      menuItems.push({
        menu: 'View',
        label: 'Left Panel',
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
        label: 'Right Panel',
        type: 'checkbox',
        checked: panelSlots.right ?? false,
        action: () => this.#togglePanel('right'),
        priority: priority++
      });
    }

    // Add checkbox for top panel if it exists
    if (hasTop) {
      menuItems.push({
        menu: 'View',
        label: 'Top Panel',
        type: 'checkbox',
        checked: panelSlots.top ?? false,
        action: () => this.#togglePanel('top'),
        priority: priority++
      });
    }

    // Add checkbox for bottom panel if it exists
    if (hasBottom) {
      menuItems.push({
        menu: 'View',
        label: 'Bottom Panel',
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
    
    // Update checkmark in menu to reflect new state
    this.#updateMenuCheckmark(position, newVisibility[position]);
    
    logger.info(`Toggled ${position} panel visibility to ${newVisibility[position]}`);
  }

  /**
   * Update the checkmark state in the menu for a specific panel.
   * @param {string} position - Panel position
   * @param {boolean} visible - Whether panel is visible
   * @private
   */
  #updateMenuCheckmark(position, visible) {
    if (!this.#context) return;
    
    const menubarPlugin = this.#context.getMenubarPlugin();
    if (!menubarPlugin || !menubarPlugin.getMenubar) return;
    
    const menubar = menubarPlugin.getMenubar();
    if (!menubar || !menubar.getMenuItems) return;
    
    // Find the menu item for this panel and update its checkmark
    const menuItems = menubar.getMenuItems('View');
    if (!menuItems) return;
    
    const panelLabel = `${position.charAt(0).toUpperCase() + position.slice(1)} Panel`;
    menuItems.forEach(({ element, item }) => {
      if (item.label === panelLabel && element._checkmark !== undefined) {
        element._checked = visible;
        element._checkmark.style.display = visible ? 'inline-block' : 'none';
      }
    });
  }

  async uninstall() {
    if (this.#unsubscribeVisibility) {
      this.#unsubscribeVisibility();
      this.#unsubscribeVisibility = null;
    }
    await super.uninstall();
  }
}

