/**
 * MenubarPlugin - Plugin that creates and manages the application menubar.
 * 
 * Based on jReality's ViewMenuBar pattern, this plugin:
 * 1. Creates the Menubar instance and default menu structure
 * 2. Aggregates menu items from other plugins via getMenuItems()
 * 3. Listens for new plugin installations to add their menu items
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { Menubar } from '../ui/Menubar.js';
import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('MenubarPlugin');

/**
 * Plugin that creates and manages the application menubar.
 * 
 * This plugin creates the menubar structure and aggregates menu items
 * from all registered plugins. Other plugins contribute menu items via
 * their getMenuItems() method.
 */
export class MenubarPlugin extends JSRPlugin {
  /** @type {Menubar|null} */
  #menubar = null;

  /** @type {HTMLElement|null} */
  #container = null;

  /** @type {boolean} */
  #containerProvided = false;

  /** @type {Function|null} */
  #unsubscribePluginInstalled = null;

  /**
   * Create a new MenubarPlugin.
   * 
   * @param {HTMLElement} [container] - Optional container element for the menubar.
   *                                    If not provided, one will be created and inserted
   *                                    above the viewer.
   */
  constructor(container = null) {
    super();
    this.#container = container;
    this.#containerProvided = container !== null;
  }

  /**
   * Get plugin metadata.
   * @returns {import('../plugin/JSRPlugin.js').PluginInfo}
   */
  getInfo() {
    return {
      id: 'menubar',
      name: 'Menubar',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Creates and manages the application menubar',
      dependencies: []
    };
  }

  /**
   * Install the plugin.
   * Creates the menubar and sets up menu aggregation.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {import('../plugin/PluginContext.js').PluginContext} context - Plugin context
   */
  async install(viewer, context) {
    await super.install(viewer, context);

    // Create container if not provided
    if (!this.#container) {
      this.#container = document.createElement('div');
      this.#container.id = 'menubar-plugin-container';
      this.#container.style.width = '100%';
      this.#container.style.height = 'auto';
      this.#container.style.flexShrink = '0';

      // Insert above the viewer
      const viewerSwitch = viewer.getViewer();
      if (viewerSwitch) {
        const viewerComponent = viewerSwitch.getViewingComponent();
        if (viewerComponent && viewerComponent.parentElement) {
          viewerComponent.parentElement.insertBefore(this.#container, viewerComponent);
        }
      }
    }

    // Create the menubar
    this.#menubar = new Menubar(this.#container);

    // Create default menu structure (like jReality's ViewMenuBar)
    this.#createDefaultMenus(viewer, context);

    // Collect menu items from already-registered plugins
    this.#aggregateExistingPlugins(context);

    // Listen for future plugin installations
    this.#unsubscribePluginInstalled = this.on('plugin:installed', (data) => {
      this.#addPluginMenuItems(data.plugin);
    });

    logger.info('Menubar created and menu aggregation enabled');
  }

  /**
   * Uninstall the plugin.
   */
  async uninstall() {
    // Unsubscribe from events
    if (this.#unsubscribePluginInstalled) {
      this.#unsubscribePluginInstalled();
      this.#unsubscribePluginInstalled = null;
    }

    // Remove container if we created it
    if (!this.#containerProvided && this.#container && this.#container.parentElement) {
      this.#container.parentElement.removeChild(this.#container);
    }

    this.#menubar = null;
    this.#container = null;

    await super.uninstall();
    logger.info('Menubar removed');
  }

  /**
   * Create the default menu structure.
   * Based on jReality's ViewMenuBar which creates File, Viewer, Window menus.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer
   * @param {import('../plugin/PluginContext.js').PluginContext} context
   * @private
   */
  #createDefaultMenus(viewer, context) {
    // File menu - will be populated by ExportMenuPlugin or other plugins
    // Just ensure the menu exists with a placeholder that will be replaced
    // (Menubar creates menus on first addMenuItem call)

    // Viewer menu - add viewer selection if multiple viewers
    const viewerSwitch = viewer.getViewer();
    if (viewerSwitch && viewerSwitch.getNumViewers && viewerSwitch.getNumViewers() > 1) {
      const viewerNames = viewerSwitch.getViewerNames();
      const currentIndex = viewerSwitch.getViewers().indexOf(viewerSwitch.getCurrentViewer());

      viewerNames.forEach((name, index) => {
        this.#menubar.addMenuItem('Viewer', {
          label: name,
          type: 'radio',
          groupName: 'viewer-select',
          checked: index === currentIndex,
          action: () => {
            viewerSwitch.selectViewer(index);
          }
        }, 10 + index);
      });
    }
  }

  /**
   * Aggregate menu items from all already-registered plugins.
   * 
   * @param {import('../plugin/PluginContext.js').PluginContext} context
   * @private
   */
  #aggregateExistingPlugins(context) {
    const pluginIds = context.getPluginIds();
    for (const pluginId of pluginIds) {
      // Skip ourselves
      if (pluginId === this.getInfo().id) continue;

      const plugin = context.getPlugin(pluginId);
      if (plugin) {
        this.#addPluginMenuItems(plugin);
      }
    }
  }

  /**
   * Add menu items from a plugin.
   * 
   * @param {import('../plugin/JSRPlugin.js').JSRPlugin} plugin
   * @private
   */
  #addPluginMenuItems(plugin) {
    const menuItems = plugin.getMenuItems();
    if (!menuItems || menuItems.length === 0) return;

    const info = plugin.getInfo();
    logger.fine(`Adding ${menuItems.length} menu item(s) from plugin: ${info.id}`);

    for (const item of menuItems) {
      try {
        if (item.type === 'separator') {
          this.#menubar.addMenuSeparator(item.menu, item.priority || 50);
        } else {
          this.#menubar.addMenuItem(item.menu, item, item.priority || 50);
        }
      } catch (error) {
        logger.warn(`Failed to add menu item from plugin ${info.id}: ${error.message}`);
      }
    }
  }

  /**
   * Add a menu item.
   * Public API for plugins that need to add items dynamically.
   * 
   * @param {string} menuName - Name of the menu (e.g., 'File', 'View')
   * @param {Object} item - Menu item configuration
   * @param {number} [priority=50] - Priority for ordering
   */
  addMenuItem(menuName, item, priority = 50) {
    if (this.#menubar) {
      this.#menubar.addMenuItem(menuName, item, priority);
    } else {
      logger.warn('Cannot add menu item: menubar not initialized');
    }
  }

  /**
   * Add a menu separator.
   * 
   * @param {string} menuName - Name of the menu
   * @param {number} [priority=50] - Priority for ordering
   */
  addMenuSeparator(menuName, priority = 50) {
    if (this.#menubar) {
      this.#menubar.addMenuSeparator(menuName, priority);
    }
  }

  /**
   * Update radio button selection.
   * 
   * @param {string} menuName - Name of the menu
   * @param {string} groupName - Name of the radio group
   * @param {number} selectedIndex - Index of the selected item
   */
  updateRadioSelection(menuName, groupName, selectedIndex) {
    if (this.#menubar) {
      this.#menubar.updateRadioSelection(menuName, groupName, selectedIndex);
    }
  }

  /**
   * Get the underlying Menubar instance.
   * 
   * @returns {Menubar|null}
   */
  getMenubar() {
    return this.#menubar;
  }
}

