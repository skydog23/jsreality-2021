/**
 * BackgroundColorPlugin - Plugin for controlling scene background color.
 * 
 * Provides menu items for changing the background color of the scene root.
 * Demonstrates basic plugin structure and menu integration.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { Color } from '../../core/util/Color.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';

/**
 * Plugin for controlling scene background color.
 */
export class BackgroundColorPlugin extends JSRPlugin {
  /** @type {Object<string, Color>} */
  #colors = {
    'White': new Color(255, 255, 255),
    'Light Gray': new Color(225, 225, 225),
    'Gray': new Color(128, 128, 128),
    'Dark Gray': new Color(64, 64, 64),
    'Black': new Color(0, 0, 0),
    'Transparent': new Color(0, 0, 0, 0)
  };

  /** @type {string} */
  #currentColor = 'Light Gray';

  /**
   * Get plugin metadata.
   * @returns {import('../plugin/JSRPlugin.js').PluginInfo}
   */
  getInfo() {
    return {
      id: 'background-color',
      name: 'Background Color',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Control scene background color',
      dependencies: []
    };
  }

  /**
   * Install plugin.
   * @param {import('../JSRViewer.js').JSRViewer} viewer
   * @param {import('../plugin/PluginContext.js').PluginContext} context
   */
  async install(viewer, context) {
    await super.install(viewer, context);
    
    // Set initial background color
    this.setBackgroundColor(this.#currentColor);
  }

  /**
   * Get menu items.
   * @returns {Array<import('../plugin/JSRPlugin.js').MenuItem>}
   */
  getMenuItems() {
    const menuItems = [];
    
    // Add menu separator
    menuItems.push({
      menu: 'View',
      type: 'separator',
      priority: 25
    });

    // Create radio buttons for each color
    let priority = 26;
    for (const [name, color] of Object.entries(this.#colors)) {
      menuItems.push({
        menu: 'View',
        label: name,
        type: 'radio',
        groupName: 'background-color',
        checked: name === this.#currentColor,
        action: () => this.setBackgroundColor(name),
        priority: priority++
      });
    }

    return menuItems;
  }

  /**
   * Set the background color.
   * @param {string} colorName - Name of the color from the colors map
   */
  setBackgroundColor(colorName) {
    if (!this.#colors[colorName]) {
      console.error(`Unknown color: ${colorName}`);
      return;
    }

    this.#currentColor = colorName;
    const color = this.#colors[colorName];

    // Set background color on scene root
    const sceneRoot = this.context.getSceneRoot();
    if (sceneRoot) {
      let appearance = sceneRoot.getAppearance();
      if (!appearance) {
        appearance = new (await import('../../core/scene/Appearance.js')).Appearance('root-appearance');
        sceneRoot.setAppearance(appearance);
      }
      
      appearance.setAttribute(CommonAttributes.BACKGROUND_COLOR, color);
      this.context.render();
      
      // Emit event
      this.emit('background-color:changed', { colorName, color });
    }
  }

  /**
   * Get the current background color name.
   * @returns {string}
   */
  getCurrentColor() {
    return this.#currentColor;
  }
}

