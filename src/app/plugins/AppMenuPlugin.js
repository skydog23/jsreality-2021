/**
 * AppMenuPlugin - Adds an application-specific menu and About panel.
 *
 * Creates a top-level menu whose title is the current JSRApp subclass name
 * (e.g. "TestToolApp") and a single menu item "About <AppName>" that shows
 * a modal information panel the user can dismiss.
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { getLogger } from '../../core/util/LoggingSystem.js';
import { PluginIds } from '../plugin/PluginIds.js';
import { ModalOverlay } from '../ui/ModalOverlay.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import { DescriptorUtility } from '../../core/inspect/descriptors/DescriptorUtility.js';

const logger = getLogger('jsreality.app.plugins.AppMenuPlugin');

export class AppMenuPlugin extends JSRPlugin {
  /**
   * @typedef {Object} AppInfo
   * @property {string} [name]
   * @property {string} [vendor]
   * @property {string} [version]
   * @property {string} [description]
   */

  /** @type {string} */
  #appName = 'Application';

  /** @type {AppInfo|null} */
  #appInfo = null;

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
      dependencies: [PluginIds.MENUBAR]
    };
  }

  /**
   * Provide application info for menu labeling and About dialog content.
   *
   * This removes the hard dependency on a `JSRApp` plugin instance: the app
   * can set its metadata on the menu plugin before registration (preferred),
   * or at any time before the About dialog is shown.
   *
   * @param {AppInfo} info
   */
  setAppInfo(info) {
    if (!info || typeof info !== 'object') {
      return;
    }
    this.#appInfo = info;
    const name = info.name;
    if (typeof name === 'string' && name.trim().length > 0) {
      this.#appName = name.trim();
    }
  }

  /**
   * Install the plugin.
   *
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {import('../plugin/PluginContext.js').PluginContext} context - Plugin context
   */
  async install(viewer, context) {
    await super.install(viewer, context);

    logger.info(`AppMenuPlugin installed for app "${this.#appName}"`);
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
   * Show the About dialog using ModalOverlay + descriptors.
   * @private
   */
  #showAboutDialog() {
    const modal = new ModalOverlay({
      minWidth: 320,
      maxWidth: 520,
      closeOnBackdrop: true,
      closeOnEscape: true,
      backgroundColor: 'rgba(0, 0, 0, 0.45)'
    });

    // Theme the modal card to match the app.
    const dialog = modal.getDialogElement();
    dialog.style.backgroundColor = '#1e1e1e';
    dialog.style.border = '1px solid #3e3e3e';
    dialog.style.padding = '0';
    dialog.style.overflow = 'hidden';

    const info = this.#appInfo || {};
    const title = `About ${this.#appName}`;

    const descriptors = [
      {
        type: DescriptorType.LABEL,
        label: 'Name',
        getValue: () => this.#appName
      },
      {
        type: DescriptorType.LABEL,
        label: 'Description',
        getValue: () => info.description || 'jsReality application.'
      },
      {
        type: DescriptorType.LABEL,
        label: 'Vendor',
        getValue: () => info.vendor || 'jsReality'
      },
      {
        type: DescriptorType.LABEL,
        label: 'Version',
        getValue: () => info.version || '1.0.0'
      },
      {
        type: DescriptorType.CONTAINER,
        label: '',
        direction: 'row',
        justify: 'flex-end',
        items: [
          {
            type: DescriptorType.BUTTON,
            label: 'Close',
            variant: 'primary',
            action: () => modal.close()
          }
        ]
      }
    ];

    const panel = DescriptorUtility.createDefaultInspectorPanel(title, descriptors, {
      id: 'app-about',
      icon: 'ℹ️',
      collapsed: false
    });

    modal.setContent(panel);
  }
}


