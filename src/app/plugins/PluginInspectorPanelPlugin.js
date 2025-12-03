/**
 * PluginInspectorPanelPlugin - Plugin that creates a panel for plugin/app parameter inspectors.
 * 
 * This plugin creates a collapsible panel system where plugins (like JSRApp instances)
 * can register their inspector descriptors. Each plugin gets its own collapsible panel
 * that can be minimized/expanded.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { createCollapsiblePanel } from '../ui/CollapsiblePanel.js';
import { DescriptorRenderer } from '../../core/inspect/descriptors/DescriptorRenderer.js';
import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('PluginInspectorPanelPlugin');

/**
 * Plugin that creates a panel for plugin/app parameter inspectors.
 */
export class PluginInspectorPanelPlugin extends JSRPlugin {
  /** @type {HTMLElement|null} */
  #container = null;

  /** @type {HTMLElement|null} */
  #panelContainer = null;

  /** @type {Map<string, HTMLElement>} */
  #pluginPanels = new Map();

  /** @type {'left'|'right'} */
  #panelSide;

  /** @type {number} */
  #initialSize;

  /** @type {number} */
  #minSize;

  /** @type {Function|null} */
  #unsubscribePluginInstalled = null;

  /**
   * Create a new PluginInspectorPanelPlugin.
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
      id: 'plugin-inspector-panel',
      name: 'Plugin Inspector Panel',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Panel for plugin and application parameter inspectors',
      dependencies: []
    };
  }

  /**
   * Install the plugin.
   * Creates the panel container and sets up plugin discovery.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {import('../plugin/PluginContext.js').PluginContext} context - Plugin context
   */
  async install(viewer, context) {
    await super.install(viewer, context);

    logger.info('PluginInspectorPanelPlugin installing...');

    // Get the controller for cleaner API access
    const controller = context.getController();
    if (!controller) {
      logger.severe('Controller not available in context!');
      throw new Error('PluginController not available');
    }

    // Request a panel for plugin inspectors using the controller API
    const inspectorContainer = this.#panelSide === 'right'
      ? controller.requestRightPanel({
          id: 'plugin-inspector-panel',
          initialSize: this.#initialSize,
          minSize: this.#minSize,
          fill: true,
          overflow: 'hidden' // We'll handle scrolling in individual panels
        })
      : controller.requestLeftPanel({
          id: 'plugin-inspector-panel',
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
    this.#panelContainer.className = 'jsr-plugin-inspector-panels';
    this.#panelContainer.style.display = 'flex';
    this.#panelContainer.style.flexDirection = 'column';
    this.#panelContainer.style.flex = '1 1 auto';
    this.#panelContainer.style.minHeight = '0';
    this.#panelContainer.style.overflowY = 'auto';
    this.#panelContainer.style.width = '100%';

    this.#container.appendChild(this.#panelContainer);

    // Discover existing plugins with inspector descriptors
    this.#discoverPlugins(context);

    // Listen for new plugin installations
    this.#unsubscribePluginInstalled = controller.on('plugin:installed', (data) => {
      this.#addPluginInspector(data.plugin, context);
    });

    logger.info('PluginInspectorPanelPlugin installed successfully');
  }

  /**
   * Uninstall the plugin.
   */
  async uninstall() {
    if (this.#unsubscribePluginInstalled) {
      this.#unsubscribePluginInstalled();
      this.#unsubscribePluginInstalled = null;
    }

    this.#pluginPanels.clear();
    this.#panelContainer = null;
    this.#container = null;

    await super.uninstall();
    logger.info('PluginInspectorPanelPlugin uninstalled');
  }

  /**
   * Discover plugins that have inspector descriptors.
   * @param {import('../plugin/PluginContext.js').PluginContext} context
   * @private
   */
  #discoverPlugins(context) {
    const plugins = context.getAllPlugins();
    for (const plugin of plugins) {
      this.#addPluginInspector(plugin, context);
    }
  }

  /**
   * Add inspector panel for a plugin if it has getInspectorDescriptors().
   * @param {import('../plugin/JSRPlugin.js').JSRPlugin} plugin
   * @param {import('../plugin/PluginContext.js').PluginContext} context
   * @private
   */
  #addPluginInspector(plugin, context) {
    if (!plugin || typeof plugin.getInspectorDescriptors !== 'function') {
      return;
    }

    const pluginId = plugin.getInfo?.()?.id || 'unknown';
    
    // Skip if already added
    if (this.#pluginPanels.has(pluginId)) {
      return;
    }

    try {
      const descriptors = plugin.getInspectorDescriptors();
      if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
        return;
      }

      const pluginInfo = plugin.getInfo();
      const title = pluginInfo?.name || plugin.constructor?.name || 'Plugin';
      const icon = '⚙️';

      // Create collapsible panel
      const panel = createCollapsiblePanel({
        title: title,
        icon: icon,
        collapsed: false
      });

      // Create content container for descriptors
      const content = document.createElement('div');
      content.style.width = '100%';
      content.style.display = 'flex';
      content.style.flexDirection = 'column';

      // Render descriptors
      const descriptorRenderer = new DescriptorRenderer(content);
      
      // Set up render callback for property changes
      const onPropertyChange = () => {
        if (context.getController) {
          const controller = context.getController();
          if (controller) {
            controller.render();
          }
        }
      };

      // Wrap descriptors with render callback
      const wrappedDescriptors = descriptors.map(group => ({
        ...group,
        items: group.items.map(item => {
          const originalSetValue = item.setValue;
          if (originalSetValue) {
            return {
              ...item,
              setValue: (value) => {
                originalSetValue(value);
                onPropertyChange();
              }
            };
          }
          return item;
        })
      }));

      descriptorRenderer.render(wrappedDescriptors);
      panel.setContent(content);

      // Add to panel container
      this.#panelContainer.appendChild(panel);
      this.#pluginPanels.set(pluginId, panel);

      logger.info(`Added inspector panel for plugin: ${title} (${pluginId})`);
    } catch (error) {
      logger.warn(`Failed to add inspector panel for plugin ${pluginId}: ${error.message}`);
    }
  }
}

