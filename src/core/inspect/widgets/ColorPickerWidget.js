/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// ColorPickerWidget - Reusable color picker with RGB+Alpha support
// Handles Color objects and color arrays (RGB/RGBA, normalized/unnormalized)

import { Color } from '../../util/Color.js';

/**
 * A reusable color picker widget with integrated RGB + Alpha slider
 * 
 * Supports:
 * - Color objects (from Color.js)
 * - Color arrays: [r, g, b] or [r, g, b, a]
 * - Normalized values (0-1) or unnormalized (0-255)
 * - Live updates via onChange callback
 */
export class ColorPickerWidget {
  /**
   * @type {HTMLElement}
   */
  #element;

  /**
   * @type {Function}
   */
  #onChange;

  /**
   * @type {Color|number[]|null}
   */
  #currentValue;

  /**
   * @type {boolean}
   */
  #isColorObject;

  /**
   * @type {boolean}
   */
  #hasAlpha;

  /**
   * @type {boolean}
   */
  #isNormalized;

  /**
   * Create a color picker widget
   * @param {Color|number[]} initialValue - Initial color (Color object or array)
   * @param {Function} onChange - Callback when color changes: (newValue) => void
   */
  constructor(initialValue, onChange) {
    this.#onChange = onChange;
    this.#currentValue = initialValue;
    
    // Determine the type and format of the color
    this.#isColorObject = initialValue instanceof Color;
    
    if (this.#isColorObject) {
      this.#hasAlpha = true; // Color objects always have alpha
      this.#isNormalized = false; // Color objects use 0-255 range
    } else if (Array.isArray(initialValue)) {
      this.#hasAlpha = initialValue.length === 4;
      this.#isNormalized = initialValue[0] <= 1; // Detect if normalized
    } else {
      throw new Error('ColorPickerWidget: initialValue must be a Color object or array');
    }
    
    this.#element = this.#createElement();
  }

  /**
   * Get the DOM element for this widget
   * @returns {HTMLElement}
   */
  getElement() {
    return this.#element;
  }

  /**
   * Create the color picker DOM element
   * @returns {HTMLElement}
   * @private
   */
  #createElement() {
    const container = document.createElement('div');
    container.className = this.#hasAlpha 
      ? 'sg-color-picker-container-horizontal' 
      : 'sg-color-picker-container-simple';
    
    // Create the color input (RGB only)
    const colorInput = this.#createColorInput();
    container.appendChild(colorInput);
    
    // Create alpha button and collapsible slider if needed
    if (this.#hasAlpha) {
      const { button, slider } = this.#createAlphaControl();
      container.appendChild(button);
      container.appendChild(slider);
    }
    
    return container;
  }

  /**
   * Create the RGB color input element
   * @returns {HTMLElement}
   * @private
   */
  #createColorInput() {
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'sg-color-input';
    
    // Set initial color value as hex
    if (this.#isColorObject) {
      colorInput.value = this.#currentValue.toHexString();
    } else {
      const [r, g, b] = this.#getRGB255(this.#currentValue);
      colorInput.value = this.#rgbToHex(r, g, b);
    }
    
    // Handle color changes
    colorInput.addEventListener('change', () => {
      this.#handleColorChange(colorInput.value);
    });
    
    return colorInput;
  }

  /**
   * Create the alpha button and collapsible slider
   * @returns {{button: HTMLElement, slider: HTMLElement}}
   * @private
   */
  #createAlphaControl() {
    // Button that shows the slider on hover
    const button = document.createElement('button');
    button.className = 'sg-alpha-button';
    button.textContent = 'α';
    button.type = 'button';
    
    // Tooltip-style slider popup
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'sg-alpha-slider-popup';
    
    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.className = 'sg-alpha-slider';
    
    // Value display
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'sg-alpha-value';
    
    // Configure based on format
    if (this.#isColorObject) {
      slider.max = '255';
      slider.step = '1';
      slider.value = this.#currentValue.a;
      valueDisplay.textContent = this.#currentValue.a;
    } else if (this.#isNormalized) {
      slider.max = '100';
      slider.step = '1';
      const alpha = this.#currentValue[3];
      slider.value = Math.round(alpha * 100);
      valueDisplay.textContent = alpha.toFixed(2);
    } else {
      slider.max = '255';
      slider.step = '1';
      slider.value = Math.round(this.#currentValue[3]);
      valueDisplay.textContent = Math.round(this.#currentValue[3]);
    }
    
    // Handle slider input (for live preview)
    slider.addEventListener('input', () => {
      if (this.#isNormalized) {
        const alpha = parseInt(slider.value, 10) / 100;
        valueDisplay.textContent = alpha.toFixed(2);
      } else {
        valueDisplay.textContent = slider.value;
      }
    });
    
    // Handle slider change (commit the change)
    slider.addEventListener('change', () => {
      this.#handleAlphaChange(slider.value);
    });
    
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);
    
    return { button, slider: sliderContainer };
  }

  /**
   * Handle color (RGB) change
   * @param {string} hexValue - Hex color value from color input
   * @private
   */
  #handleColorChange(hexValue) {
    const r = parseInt(hexValue.substr(1, 2), 16);
    const g = parseInt(hexValue.substr(3, 2), 16);
    const b = parseInt(hexValue.substr(5, 2), 16);
    
    let newValue;
    
    if (this.#isColorObject) {
      const alpha = this.#currentValue.a;
      newValue = new Color(r, g, b, alpha);
    } else if (this.#hasAlpha) {
      const alpha = this.#currentValue[3];
      newValue = this.#isNormalized 
        ? [r / 255, g / 255, b / 255, alpha]
        : [r, g, b, alpha];
    } else {
      newValue = this.#isNormalized 
        ? [r / 255, g / 255, b / 255]
        : [r, g, b];
    }
    
    this.#currentValue = newValue;
    this.#onChange(newValue);
  }

  /**
   * Handle alpha change
   * @param {string} sliderValue - Value from alpha slider
   * @private
   */
  #handleAlphaChange(sliderValue) {
    // Get current RGB values from the color input
    const colorInput = this.#element.querySelector('.sg-color-input');
    const hex = colorInput.value;
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    
    let newValue;
    
    if (this.#isColorObject) {
      const alpha = parseInt(sliderValue, 10);
      newValue = new Color(r, g, b, alpha);
    } else if (this.#isNormalized) {
      const alpha = parseInt(sliderValue, 10) / 100;
      newValue = [r / 255, g / 255, b / 255, alpha];
    } else {
      const alpha = parseInt(sliderValue, 10);
      newValue = [r, g, b, alpha];
    }
    
    this.#currentValue = newValue;
    this.#onChange(newValue);
  }

  /**
   * Get RGB values in 0-255 range
   * @param {Color|number[]} value
   * @returns {number[]} [r, g, b] in 0-255 range
   * @private
   */
  #getRGB255(value) {
    if (value instanceof Color) {
      return [value.r, value.g, value.b];
    }
    
    // Array
    if (this.#isNormalized) {
      return [
        Math.min(255, Math.max(0, Math.round(value[0] * 255))),
        Math.min(255, Math.max(0, Math.round(value[1] * 255))),
        Math.min(255, Math.max(0, Math.round(value[2] * 255)))
      ];
    } else {
      return [
        Math.min(255, Math.max(0, Math.round(value[0]))),
        Math.min(255, Math.max(0, Math.round(value[1]))),
        Math.min(255, Math.max(0, Math.round(value[2])))
      ];
    }
  }

  /**
   * Convert RGB to hex string
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {string} Hex color string (#RRGGBB)
   * @private
   */
  #rgbToHex(r, g, b) {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Check if a value is a valid color input
   * @param {*} value - Value to check
   * @returns {boolean}
   * @static
   */
  static isColorValue(value) {
    if (value instanceof Color) {
      return true;
    }
    if (Array.isArray(value)) {
      if (value.length !== 3 && value.length !== 4) {
        return false;
      }
      return value.every(v => typeof v === 'number');
    }
    return false;
  }
}

