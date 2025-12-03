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

  /** @type {Map<string, Set<HTMLElement>>} Radio button groups */
  #radioGroups = new Map();

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
   * @param {string} [item.type] - Item type ('radio' for radio buttons, 'checkbox' for checkboxes)
   * @param {string} [item.radioGroup] - Radio button group name (for type='radio')
   * @param {boolean} [item.checked] - Initial checked state (for type='radio' or type='checkbox')
   * @param {number} [priority=50] - Priority (lower = earlier)
   */
  addMenuItem(menuName, item, priority = 50) {
    if (!this.#items.has(menuName)) {
      this.#items.set(menuName, []);
      this.#createMenu(menuName);
    }

    const items = this.#items.get(menuName);
    const element = this.#createMenuItemElement(item, menuName);
    
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
   * @param {string} menuName - Name of the menu this item belongs to
   * @returns {HTMLElement} Menu item element
   * @private
   */
  #createMenuItemElement(item, menuName) {
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
    itemElement.style.padding = '6px 12px';
    itemElement.style.cursor = 'pointer';
    itemElement.style.color = '#cccccc';
    itemElement.style.fontSize = '13px';
    itemElement.style.userSelect = 'none';

    // Handle radio button items
    if (item.type === 'radio') {
      const radioGroup = item.radioGroup || 'default';
      const groupKey = `${menuName}:${radioGroup}`;
      
      // Initialize radio group if it doesn't exist
      if (!this.#radioGroups.has(groupKey)) {
        this.#radioGroups.set(groupKey, new Set());
      }
      this.#radioGroups.get(groupKey).add(itemElement);
      
      // Create radio button UI
      const radioContainer = document.createElement('label');
      radioContainer.style.display = 'flex';
      radioContainer.style.alignItems = 'center';
      radioContainer.style.width = '100%';
      radioContainer.style.cursor = 'pointer';
      radioContainer.style.margin = '0';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = groupKey;
      radio.checked = item.checked || false;
      radio.style.marginRight = '8px';
      radio.style.cursor = 'pointer';
      
      const label = document.createElement('span');
      label.textContent = item.label;
      
      radioContainer.appendChild(radio);
      radioContainer.appendChild(label);
      itemElement.appendChild(radioContainer);
      
      // Store radio input for later access
      itemElement._radioInput = radio;
      itemElement._radioGroup = groupKey;
      
      // Click handler
      itemElement.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Uncheck all other radios in group
        const group = this.#radioGroups.get(groupKey);
        if (group) {
          group.forEach(elem => {
            if (elem._radioInput) {
              elem._radioInput.checked = false;
            }
          });
        }
        
        // Check this radio
        radio.checked = true;
        
        // Close dropdown
        this.#closeAllDropdowns();
        
        // Execute action
        if (item.action) {
          try {
            item.action();
          } catch (error) {
            logger.severe(`Error executing menu action for "${item.label}": ${error.message}`);
          }
        }
      });
    } else if (item.type === 'checkbox') {
      // Handle checkbox items
      const checkboxContainer = document.createElement('label');
      checkboxContainer.style.display = 'flex';
      checkboxContainer.style.alignItems = 'center';
      checkboxContainer.style.width = '100%';
      checkboxContainer.style.cursor = 'pointer';
      checkboxContainer.style.margin = '0';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.checked || false;
      checkbox.style.marginRight = '8px';
      checkbox.style.cursor = 'pointer';
      
      const label = document.createElement('span');
      label.textContent = item.label;
      
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
      itemElement.appendChild(checkboxContainer);
      
      // Store checkbox input for later access
      itemElement._checkboxInput = checkbox;
      
      // Click handler
      itemElement.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Toggle checkbox
        checkbox.checked = !checkbox.checked;
        
        // Close dropdown
        this.#closeAllDropdowns();
        
        // Execute action
        if (item.action) {
          try {
            item.action();
          } catch (error) {
            logger.severe(`Error executing menu action for "${item.label}": ${error.message}`);
          }
        }
      });
    } else {
      // Regular menu item (non-radio)
      itemElement.textContent = item.label;
      
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
          const subItemElement = this.#createMenuItemElement(subItem, menuName);
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

  /**
   * Update radio button selection programmatically.
   * @param {string} menuName - Name of the menu
   * @param {string} radioGroup - Radio button group name
   * @param {number} selectedIndex - Index of the item to select (0-based, within the radio group)
   */
  updateRadioSelection(menuName, radioGroup, selectedIndex) {
    const groupKey = `${menuName}:${radioGroup}`;
    const group = this.#radioGroups.get(groupKey);
    
    if (!group) {
      logger.warn(`Radio group "${groupKey}" not found`);
      return;
    }
    
    // Convert Set to Array for indexing
    const groupArray = Array.from(group);
    
    if (selectedIndex < 0 || selectedIndex >= groupArray.length) {
      logger.warn(`Radio index ${selectedIndex} out of range for group "${groupKey}"`);
      return;
    }
    
    // Uncheck all radios in group
    groupArray.forEach(elem => {
      if (elem._radioInput) {
        elem._radioInput.checked = false;
      }
    });
    
    // Check the selected radio
    const selectedElem = groupArray[selectedIndex];
    if (selectedElem && selectedElem._radioInput) {
      selectedElem._radioInput.checked = true;
    }
  }
}

// Close dropdowns when clicking outside
if (typeof document !== 'undefined') {
  document.addEventListener('click', () => {
    // This will be handled by individual Menubar instances
  });
}

