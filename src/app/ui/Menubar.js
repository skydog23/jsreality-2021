/**
 * Menubar - Manages menu structure with priority-based ordering.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('Menubar');

/**
 * Menubar manages a menu bar with multiple menus and menu items.
 * Items are ordered by priority (lower numbers appear first).
 */
export class Menubar {

  /** @type {HTMLElement} */
  #container;

  /** @type {Map<string, HTMLElement>} */
  #menus = new Map();

  /** @type {Map<string, Array<{item: Object, priority: number, element: HTMLElement}>>} */
  #items = new Map();

  /** @type {Function[]} Callbacks to register default menu items */
  #defaultMenuProviders = [];

  /**
   * Create a new Menubar.
   * @param {HTMLElement} container - Container element for the menu bar
   * @param {Object} [options] - Configuration options
   * @param {Function[]} [options.defaultMenuProviders] - Array of functions that register default menu items
   */
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('Menubar requires a container element');
    }
    this.#container = container;
    this.#container.className = 'jsr-menubar';
    this.#container.style.display = 'flex';
    this.#container.style.flexDirection = 'row';
    this.#container.style.backgroundColor = '#2d2d2d';
    this.#container.style.borderBottom = '1px solid #3e3e3e';

    // Store default menu providers
    if (options.defaultMenuProviders) {
      this.#defaultMenuProviders = options.defaultMenuProviders;
    }

    // Register default menu items if providers are available
    if (this.#defaultMenuProviders.length > 0) {
      this.#registerDefaultMenus();
    }
  }

  /**
   * Register default menu items from providers.
   * @private
   */
  #registerDefaultMenus() {
    this.#defaultMenuProviders.forEach(provider => {
      try {
        provider(this);
      } catch (error) {
        logger.error(`Error registering default menu items: ${error.message}`);
      }
    });
  }

  /**
   * Add a default menu provider function.
   * The function will be called with this Menubar instance as an argument.
   * @param {Function} provider - Function that registers menu items (receives Menubar instance)
   */
  addDefaultMenuProvider(provider) {
    if (typeof provider !== 'function') {
      throw new Error('Menu provider must be a function');
    }
    this.#defaultMenuProviders.push(provider);
    // Immediately register menu items from this provider
    try {
      provider(this);
    } catch (error) {
      logger.error(`Error registering menu items from provider: ${error.message}`);
    }
  }

  /**
   * Add a menu item to a menu.
   * @param {string} menuName - Name of the menu
   * @param {Object} item - Menu item definition
   * @param {string} item.label - Item label
   * @param {Function} [item.action] - Action callback
   * @param {Object[]} [item.submenu] - Submenu items
   * @param {number} [priority=50] - Priority (lower = earlier)
   */
  addMenuItem(menuName, item, priority = 50) {
    if (!this.#items.has(menuName)) {
      this.#items.set(menuName, []);
      this.#createMenu(menuName);
    }

    const items = this.#items.get(menuName);
    const element = this.#createMenuItemElement(item);
    
    items.push({ item, priority, element });
    items.sort((a, b) => a.priority - b.priority);

    this.#rebuildMenu(menuName);
  }

  /**
   * Add a separator to a menu.
   * @param {string} menuName - Name of the menu
   * @param {number} [priority=50] - Priority
   */
  addMenuSeparator(menuName, priority = 50) {
    this.addMenuItem(menuName, { label: '---', separator: true }, priority);
  }

  /**
   * Create a menu element.
   * @param {string} menuName - Name of the menu
   * @private
   */
  #createMenu(menuName) {
    const menuElement = document.createElement('div');
    menuElement.className = 'jsr-menu';
    menuElement.textContent = menuName;
    menuElement.style.position = 'relative';
    menuElement.style.padding = '8px 12px';
    menuElement.style.cursor = 'pointer';
    menuElement.style.userSelect = 'none';
    menuElement.style.color = '#cccccc';
    menuElement.style.fontSize = '13px';

    // Hover effect
    menuElement.addEventListener('mouseenter', () => {
      menuElement.style.backgroundColor = '#3e3e3e';
    });
    menuElement.addEventListener('mouseleave', () => {
      menuElement.style.backgroundColor = 'transparent';
    });

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'jsr-menu-dropdown';
    dropdown.style.display = 'none';
    dropdown.style.position = 'absolute';
    dropdown.style.top = '100%';
    dropdown.style.left = '0';
    dropdown.style.backgroundColor = '#2d2d2d';
    dropdown.style.border = '1px solid #3e3e3e';
    dropdown.style.borderTop = 'none';
    dropdown.style.minWidth = '150px';
    dropdown.style.zIndex = '1000';
    dropdown.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';

    menuElement.appendChild(dropdown);

    // Toggle dropdown on click
    menuElement.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display !== 'none';
      this.#closeAllDropdowns();
      if (!isOpen) {
        dropdown.style.display = 'block';
      }
    });

    this.#menus.set(menuName, menuElement);
    this.#container.appendChild(menuElement);
  }

  /**
   * Create a menu item element.
   * @param {Object} item - Menu item definition
   * @returns {HTMLElement} Menu item element
   * @private
   */
  #createMenuItemElement(item) {
    if (item.separator) {
      const separator = document.createElement('div');
      separator.className = 'jsr-menu-separator';
      separator.style.height = '1px';
      separator.style.backgroundColor = '#3e3e3e';
      separator.style.margin = '4px 0';
      return separator;
    }

    const itemElement = document.createElement('div');
    itemElement.className = 'jsr-menu-item';
    itemElement.textContent = item.label;
    itemElement.style.padding = '6px 12px';
    itemElement.style.cursor = 'pointer';
    itemElement.style.color = '#cccccc';
    itemElement.style.fontSize = '13px';
    itemElement.style.userSelect = 'none';

    // Hover effect
    itemElement.addEventListener('mouseenter', () => {
      itemElement.style.backgroundColor = '#007acc';
    });
    itemElement.addEventListener('mouseleave', () => {
      itemElement.style.backgroundColor = 'transparent';
    });

    if (item.submenu) {
      // Has submenu - create nested dropdown
      itemElement.style.position = 'relative';
      const submenu = document.createElement('div');
      submenu.className = 'jsr-menu-submenu';
      submenu.style.display = 'none';
      submenu.style.position = 'absolute';
      submenu.style.left = '100%';
      submenu.style.top = '0';
      submenu.style.backgroundColor = '#2d2d2d';
      submenu.style.border = '1px solid #3e3e3e';
      submenu.style.minWidth = '150px';
      submenu.style.zIndex = '1001';
      submenu.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';

      // Add submenu items
      item.submenu.forEach(subItem => {
        const subItemElement = this.#createMenuItemElement(subItem);
        submenu.appendChild(subItemElement);
      });

      itemElement.appendChild(submenu);

      // Toggle submenu on hover
      itemElement.addEventListener('mouseenter', () => {
        submenu.style.display = 'block';
      });
      itemElement.addEventListener('mouseleave', () => {
        submenu.style.display = 'none';
      });
    } else if (item.action) {
      // Regular menu item with action
      itemElement.addEventListener('click', (e) => {
        e.stopPropagation();
        this.#closeAllDropdowns();
        try {
          item.action();
        } catch (error) {
          logger.error(`Error executing menu action for "${item.label}": ${error.message}`);
        }
      });
    }

    return itemElement;
  }

  /**
   * Rebuild a menu's dropdown with current items.
   * @param {string} menuName - Name of the menu
   * @private
   */
  #rebuildMenu(menuName) {
    const menuElement = this.#menus.get(menuName);
    if (!menuElement) {
      return;
    }

    const dropdown = menuElement.querySelector('.jsr-menu-dropdown');
    if (!dropdown) {
      return;
    }

    // Clear dropdown
    dropdown.innerHTML = '';

    // Add items in priority order
    const items = this.#items.get(menuName);
    if (items) {
      items.forEach(({ element }) => {
        dropdown.appendChild(element);
      });
    }
  }

  /**
   * Close all dropdown menus.
   * @private
   */
  #closeAllDropdowns() {
    this.#menus.forEach(menuElement => {
      const dropdown = menuElement.querySelector('.jsr-menu-dropdown');
      if (dropdown) {
        dropdown.style.display = 'none';
      }
      // Also close submenus
      const submenus = menuElement.querySelectorAll('.jsr-menu-submenu');
      submenus.forEach(submenu => {
        submenu.style.display = 'none';
      });
    });
  }

  /**
   * Remove all menu items from a menu.
   * @param {string} menuName - Name of the menu
   */
  clearMenu(menuName) {
    this.#items.delete(menuName);
    const menuElement = this.#menus.get(menuName);
    if (menuElement) {
      const dropdown = menuElement.querySelector('.jsr-menu-dropdown');
      if (dropdown) {
        dropdown.innerHTML = '';
      }
    }
  }

  /**
   * Remove a menu entirely.
   * @param {string} menuName - Name of the menu
   */
  removeMenu(menuName) {
    const menuElement = this.#menus.get(menuName);
    if (menuElement && menuElement.parentElement) {
      menuElement.parentElement.removeChild(menuElement);
    }
    this.#menus.delete(menuName);
    this.#items.delete(menuName);
  }
}

// Close dropdowns when clicking outside
if (typeof document !== 'undefined') {
  document.addEventListener('click', () => {
    // This will be handled by individual Menubar instances
  });
}

