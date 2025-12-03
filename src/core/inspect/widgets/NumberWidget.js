/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// NumberWidget - A labeled number input with formatted display
// Compact widget for editing numeric values

/**
 * A compact number input widget with label
 * Displays numbers with 4 decimal places
 */
export class NumberWidget {
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
   * @type {number}
   */
  #currentValue;

  /**
   * @type {string}
   */
  #label;

  /**
   * @type {HTMLInputElement}
   */
  #input;

  /**
   * Create a number widget
   * @param {string} label - Label text (e.g., "X", "Y", "Z")
   * @param {number} initialValue - Initial numeric value
   * @param {Function} onChange - Callback when value changes: (newValue: number) => void
   */
  constructor(label, initialValue, onChange) {
    this.#label = label;
    this.#currentValue = initialValue;
    this.#onChange = onChange;
    NumberWidget.#injectStyles();
    this.#element = this.#createElement();
  }

  /**
   * Inject CSS styles for NumberWidget (only once)
   * @static
   * @private
   */
  static #injectStyles() {
    if (NumberWidget.#stylesInjected) return;
    NumberWidget.#stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
      /* NumberWidget styles - compact inline display */
      .sg-number-widget {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
        white-space: nowrap;
      }
      
      .sg-number-widget-label {
        color: #9cdcfe;
        font-size: 11px;
        font-weight: 600;
        flex-shrink: 0;
        margin-right: 2px;
      }
      
      .sg-number-widget-input {
        width: 50px;
        height: 18px;
        padding: 2px 3px;
        background: #3c3c3c;
        border: 1px solid #555;
        border-radius: 2px;
        color:rgb(63, 187, 232);
        font-size: 10px;
        font-family: 'Monaco', 'Courier New', monospace;
        text-align: right;
      }
      
      .sg-number-widget-input:focus {
        outline: none;
        border-color: #007acc;
        background: #2d2d2d;
      }
      
      .sg-number-widget-input:hover {
        border-color: #666;
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
   * Get the current value
   * @returns {number}
   */
  getValue() {
    return this.#currentValue;
  }

  /**
   * Set the value (updates the display)
   * @param {number} value - New value
   */
  setValue(value) {
    this.#currentValue = value;
    if (this.#input) {
      this.#input.value = this.#formatNumber(value);
    }
  }

  /**
   * Create the widget DOM element
   * @returns {HTMLElement}
   * @private
   */
  #createElement() {
    const container = document.createElement('div');
    container.className = 'sg-number-widget';

    // Label with colon (only add if label is not empty)
    if (this.#label) {
      const label = document.createElement('span');
      label.className = 'sg-number-widget-label';
      label.textContent = this.#label + ':';
      container.appendChild(label);
    }

    // Input field
    this.#input = document.createElement('input');
    this.#input.type = 'text';
    this.#input.className = 'sg-number-widget-input';
    this.#input.value = this.#formatNumber(this.#currentValue);

    // Handle changes on blur
    this.#input.addEventListener('blur', () => {
      this.#handleChange();
    });

    // Handle Enter key
    this.#input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.#input.blur(); // Trigger blur event
      }
    });

    // Select all on focus for easy editing
    this.#input.addEventListener('focus', () => {
      this.#input.select();
    });

    container.appendChild(this.#input);

    return container;
  }

  /**
   * Handle value change
   * @private
   */
  #handleChange() {
    const inputValue = this.#input.value.trim();
    const normalizedValue = inputValue.replace(',', '.');
    const newValue = parseFloat(normalizedValue);

    if (!isNaN(newValue)) {
      this.#currentValue = newValue;
      this.#input.value = this.#formatNumber(newValue);
      this.#onChange(newValue);
    } else {
      // Invalid input, reset to current value
      this.#input.value = this.#formatNumber(this.#currentValue);
    }
  }

  /**
   * Format number with 4 decimal places
   * @param {number} value - Number to format
   * @returns {string}
   * @private
   */
  #formatNumber(value) {
    return value.toFixed(4);
  }
}

