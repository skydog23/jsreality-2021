/**
 * AppMenuPlugin - Adds an application-specific menu and About panel.
 *
 * Creates a top-level menu whose title is the current JSRApp subclass name
 * (e.g. "TestToolApp") and a single menu item "About <AppName>" that shows
 * a floating information panel the user can dismiss.
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { getLogger, Category } from '../../core/util/LoggingSystem.js';
import { PluginIds } from '../plugin/PluginIds.js';

const logger = getLogger('jsreality.app.plugins.AppMenuPlugin');

export class AppMenuPlugin extends JSRPlugin {
  /** @type {string} */
  #appName = 'Application';

  /** @type {HTMLElement|null} */
  #overlay = null;

  /** @type {HTMLElement|null} */
  #viewerContainer = null;

  /** @type {import('../plugin/JSRPlugin.js').JSRPlugin|null} */
  #appPlugin = null;

  /**
   * Get plugin metadata.
   * @returns {import('../plugin/JSRPlugin.js').PluginInfo}
   */
  getInfo() {
    return {
      id: PluginIds.APP_MENU,
      name: 'Application Menu',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Adds an application-specific menu and About panel',
      dependencies: [PluginIds.MENUBAR, PluginIds.JSRAPP]
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
    const appPlugin = context.getPlugin(PluginIds.JSRAPP);
    this.#appPlugin = appPlugin;
    if (appPlugin) {
      try {
        const info = typeof appPlugin.getInfo === 'function' ? appPlugin.getInfo() : null;
        this.#appName = (info && info.name) || appPlugin.constructor.name || 'Application';
      } catch (error) {
        logger.warn(Category.ALL, `Failed to read app name from jsrapp: ${error.message}`);
      }
    } else {
      logger.warn(Category.ALL, 'JSRApp plugin (id: jsrapp) not found; using generic application name');
    }

    // Cache viewer container for positioning the floating panel (fallback to document.body)
    try {
      this.#viewerContainer = viewer.getContainer?.() || null;
    } catch (error) {
      logger.warn(Category.ALL, `Unable to get viewer container: ${error.message}`);
      this.#viewerContainer = null;
    }

    logger.info(Category.ALL, `AppMenuPlugin installed for app "${this.#appName}"`);
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
          this.#showAboutDialog();
        },
        priority: 10
      }
    ];
  }

  /**
   * Show the floating About dialog.
   * Creates the overlay on first use and reuses it subsequently.
   * @private
   */
  #showAboutDialog() {
    if (!this.#overlay) {
      this.#overlay = this.#createOverlay();
    }

    this.#overlay.style.display = 'flex';
  }

  /**
   * Create the floating overlay and dialog elements.
   * @returns {HTMLElement} The overlay element
   * @private
   */
  #createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'jsr-app-about-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.45)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '2000';

    // Close when clicking outside the dialog
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });

    // Dialog container
    const dialog = document.createElement('div');
    dialog.className = 'jsr-app-about-dialog';
    dialog.style.backgroundColor = '#252526';
    dialog.style.border = '1px solid #3e3e3e';
    dialog.style.borderRadius = '4px';
    dialog.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.6)';
    dialog.style.minWidth = '260px';
    dialog.style.maxWidth = '420px';
    dialog.style.maxHeight = '70vh';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.overflow = 'hidden';

    // Header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '8px 12px';
    header.style.backgroundColor = '#2d2d2d';
    header.style.borderBottom = '1px solid #3e3e3e';

    const titleEl = document.createElement('div');
    titleEl.textContent = `About ${this.#appName}`;
    titleEl.style.fontSize = '13px';
    titleEl.style.fontWeight = '500';
    titleEl.style.color = '#ffffff';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.title = 'Close';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#cccccc';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.padding = '0 4px';

    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#ffffff';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#cccccc';
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.style.display = 'none';
    });

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement('div');
    body.style.padding = '10px 12px 12px';
    body.style.overflowY = 'auto';

    const content = this.#createAboutContent(this.#appPlugin);
    body.appendChild(content);

    dialog.appendChild(header);
    dialog.appendChild(body);
    overlay.appendChild(dialog);

    const parent =
      this.#viewerContainer && this.#viewerContainer.ownerDocument
        ? this.#viewerContainer.ownerDocument.body
        : document.body;
    parent.appendChild(overlay);

    return overlay;
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


