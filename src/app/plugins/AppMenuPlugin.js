/**
 * AppMenuPlugin - Adds an application-specific menu and About panel.
 *
 * Creates a top-level menu whose title is the current JSRApp subclass name
 * (e.g. "TestToolApp") and a single menu item "About <AppName>" that shows
 * an information panel in the shrink panel aggregator.
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { createCollapsiblePanel } from '../ui/CollapsiblePanel.js';
import { getLogger, DEBUG } from '../../core/util/LoggingSystem.js';

const logger = getLogger('AppMenuPlugin');

export class AppMenuPlugin extends JSRPlugin {
  /** @type {string} */
  #appName = 'Application';

  /** @type {HTMLElement|null} */
  #aboutPanel = null;

  /**
   * Get plugin metadata.
   * @returns {import('../plugin/JSRPlugin.js').PluginInfo}
   */
  getInfo() {
    return {
      id: 'app-menu',
      name: 'Application Menu',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Adds an application-specific menu and About panel',
      dependencies: ['menubar', 'shrink-panel-aggregator', 'jsrapp']
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

    // Determine current app name from the jsrapp plugin
    const appPlugin = context.getPlugin('jsrapp');
    if (appPlugin) {
      try {
        const info = typeof appPlugin.getInfo === 'function' ? appPlugin.getInfo() : null;
        this.#appName = (info && info.name) || appPlugin.constructor.name || 'Application';
      } catch (error) {
        logger.warn(DEBUG.GENERAL, `Failed to read app name from jsrapp: ${error.message}`);
      }
    } else {
      logger.warn(DEBUG.GENERAL, 'JSRApp plugin (id: jsrapp) not found; using generic application name');
    }

    // Create About panel content and register it with the ShrinkPanelAggregator
    const aggregator = context.getPlugin('shrink-panel-aggregator');
    if (!aggregator || typeof aggregator.registerInspectorPanel !== 'function') {
      logger.warn(DEBUG.GENERAL, 'ShrinkPanelAggregator not available; About panel will not be shown');
      return;
    }

    const aboutContent = this.#createAboutContent(appPlugin);
    const panel = createCollapsiblePanel({
      title: `About ${this.#appName}`,
      icon: 'ℹ️',
      collapsed: false,
      content: aboutContent
    });

    this.#aboutPanel = panel;
    aggregator.registerInspectorPanel('jsrapp-about', panel);

    logger.info(DEBUG.GENERAL, `AppMenuPlugin installed for app "${this.#appName}"`);
  }

  /**
   * Get menu items to add to the menubar.
   * @returns {Array<import('../plugin/JSRPlugin.js').MenuItem>}
   */
  getMenuItems() {
    const label = `About ${this.#appName}`;

    return [
      {
        menu: this.#appName,
        leftmost: true,
        label,
        action: () => {
          // Ensure About panel is visible and expanded when the menu item is chosen
          if (this.#aboutPanel && typeof this.#aboutPanel.setCollapsed === 'function') {
            this.#aboutPanel.setCollapsed(false);
            try {
              this.#aboutPanel.scrollIntoView({ block: 'nearest' });
            } catch {
              // scrollIntoView may not be available in some environments; ignore
            }
          }
        },
        priority: 10
      }
    ];
  }

  /**
   * Create the content element for the About panel.
   *
   * @param {import('../plugin/JSRPlugin.js').JSRPlugin|null} appPlugin - The jsrapp plugin instance
   * @returns {HTMLElement}
   * @private
   */
  #createAboutContent(appPlugin) {
    // Allow the app to provide custom about content if desired
    if (appPlugin && typeof appPlugin.getAboutContent === 'function') {
      const custom = appPlugin.getAboutContent();
      if (custom instanceof HTMLElement) {
        return custom;
      }
      if (typeof custom === 'string') {
        const wrapper = document.createElement('div');
        wrapper.textContent = custom;
        wrapper.style.fontSize = '12px';
        wrapper.style.color = '#cccccc';
        return wrapper;
      }
    }

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    container.style.fontSize = '12px';
    container.style.color = '#cccccc';

    const title = document.createElement('div');
    title.textContent = this.#appName;
    title.style.fontWeight = '600';
    title.style.fontSize = '13px';
    container.appendChild(title);

    const infoLine = document.createElement('div');
    const info = appPlugin && typeof appPlugin.getInfo === 'function' ? appPlugin.getInfo() : null;
    const description = info && info.description
      ? info.description
      : 'jsReality application.';
    infoLine.textContent = description;
    container.appendChild(infoLine);

    if (info) {
      const meta = document.createElement('div');
      meta.textContent = `Vendor: ${info.vendor || 'jsReality'} · Version: ${info.version || '1.0.0'}`;
      meta.style.opacity = '0.8';
      container.appendChild(meta);
    }

    return container;
  }
}


