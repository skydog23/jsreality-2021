/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// VectorWidget - A horizontal array of labeled number inputs
// Handles vectors of any length (2D, 3D, 4D, etc.)

import { NumberWidget } from './NumberWidget.js';

/**
 * A vector input widget composed of multiple NumberWidgets
 * Displays vectors horizontally with individual labels
 */
export class VectorWidget {
  /**
   * @type {boolean}
   * @static
   * @private
   */
  static #stylesInjected = false;
  /**
   * @type {HTMLElement}
   */
  #element;

  /**
   * @type {Function}
   */
  #onChange;

  /**
   * @type {number[]}
   */
  #currentValue;

  /**
   * @type {NumberWidget[]}
   */
  #numberWidgets;

  /**
   * @type {string|null}
   */
  #groupLabel;

  /**
   * Create a vector widget
   * @param {number[]} initialValue - Initial vector values
   * @param {string[]} labels - Labels for each component (e.g., ["X", "Y", "Z"])
   * @param {Function} onChange - Callback when vector changes: (newVector: number[]) => void
   * @param {string|null} [groupLabel=null] - Optional label for the entire vector (e.g., "Position")
   */
  constructor(initialValue, labels, onChange, groupLabel = null) {
    if (!Array.isArray(initialValue)) {
      throw new Error('VectorWidget: initialValue must be an array');
    }
    if (!Array.isArray(labels)) {
      throw new Error('VectorWidget: labels must be an array');
    }
    if (initialValue.length !== labels.length) {
      throw new Error('VectorWidget: initialValue and labels must have the same length');
    }

    this.#currentValue = [...initialValue]; // Clone array
    this.#onChange = onChange;
    this.#groupLabel = groupLabel;
    this.#numberWidgets = [];
    VectorWidget.#injectStyles();
    this.#element = this.#createElement(initialValue, labels);
  }

  /**
   * Inject CSS styles for VectorWidget (only once)
   * @static
   * @private
   */
  static #injectStyles() {
    if (VectorWidget.#stylesInjected) return;
    VectorWidget.#stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      /* VectorWidget styles - single horizontal row in bordered container */
      .sg-vector-widget {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: nowrap;
        gap: 0;
        padding: 6px 8px;
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 4px;
        box-sizing: border-box;
        white-space: nowrap;
      }
      
      .sg-vector-widget-label {
        color: #4ec9b0;
        font-size: 11px;
        font-weight: 600;
        margin-right: 10px;
        flex-shrink: 0;
      }
      
      /* Add spacing between number widgets in a vector */
      .sg-vector-widget .sg-number-widget {
        margin-right: 8px;
      }
      
      .sg-vector-widget .sg-number-widget:last-child {
        margin-right: 0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get the DOM element for this widget
   * @returns {HTMLElement}
   */
  getElement() {
    return this.#element;
  }

  /**
   * Get the current vector value
   * @returns {number[]}
   */
  getValue() {
    return [...this.#currentValue]; // Return a copy
  }

  /**
   * Set the vector value (updates all number widgets)
   * @param {number[]} value - New vector value
   */
  setValue(value) {
    if (!Array.isArray(value) || value.length !== this.#currentValue.length) {
      throw new Error('VectorWidget: setValue requires array of same length');
    }

    this.#currentValue = [...value];
    
    // Update each number widget
    for (let i = 0; i < this.#numberWidgets.length; i++) {
      this.#numberWidgets[i].setValue(value[i]);
    }
  }

  /**
   * Create the widget DOM element
   * @param {number[]} values - Initial values
   * @param {string[]} labels - Labels for each component
   * @returns {HTMLElement}
   * @private
   */
  #createElement(values, labels) {
    const container = document.createElement('div');
    container.className = 'sg-vector-widget';

    // Add group label if provided
    if (this.#groupLabel) {
      const groupLabelEl = document.createElement('span');
      groupLabelEl.className = 'sg-vector-widget-label';
      groupLabelEl.textContent = this.#groupLabel + ':';
      container.appendChild(groupLabelEl);
    }

    // Create a NumberWidget for each component
    for (let i = 0; i < values.length; i++) {
      const numberWidget = new NumberWidget(
        labels[i],
        values[i],
        (newValue) => this.#handleComponentChange(i, newValue)
      );
      
      this.#numberWidgets.push(numberWidget);
      container.appendChild(numberWidget.getElement());
    }

    return container;
  }

  /**
   * Handle change in a single component
   * @param {number} index - Index of the component that changed
   * @param {number} newValue - New value for that component
   * @private
   */
  #handleComponentChange(index, newValue) {
    // Update the current value array
    this.#currentValue[index] = newValue;
    
    // Call the onChange callback with the complete updated vector
    this.#onChange([...this.#currentValue]); // Pass a copy
  }

  /**
   * Static helper to create common vector widgets
   */
  
  /**
   * Create a 2D vector widget (X, Y)
   * @param {number[]} initialValue - [x, y]
   * @param {Function} onChange - Change callback
   * @returns {VectorWidget}
   * @static
   */
  static create2D(initialValue, onChange) {
    return new VectorWidget(initialValue, ['X', 'Y'], onChange);
  }

  /**
   * Create a 3D vector widget (X, Y, Z)
   * @param {number[]} initialValue - [x, y, z]
   * @param {Function} onChange - Change callback
   * @returns {VectorWidget}
   * @static
   */
  static create3D(initialValue, onChange) {
    return new VectorWidget(initialValue, ['X', 'Y', 'Z'], onChange);
  }

  /**
   * Create a 4D vector widget (X, Y, Z, W)
   * @param {number[]} initialValue - [x, y, z, w]
   * @param {Function} onChange - Change callback
   * @returns {VectorWidget}
   * @static
   */
  static create4D(initialValue, onChange) {
    return new VectorWidget(initialValue, ['X', 'Y', 'Z', 'W'], onChange);
  }
}

