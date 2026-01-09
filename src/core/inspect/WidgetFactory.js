/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Factory for creating UI widgets for editing property values

import { ColorPickerWidget, VectorWidget, NumberWidget } from './widgets/index.js';
import { Color } from '../util/Color.js';
import { formatValue } from './PropertyFormatters.js';
import { EUCLIDEAN, HYPERBOLIC, ELLIPTIC, PROJECTIVE } from '../math/Pn.js';

/**
 * Factory for creating UI widgets for editing property values
 */
export class WidgetFactory {
  /**
   * Create a metric dropdown widget (Pn metric constants).
   * @param {number} value
   * @param {(newValue: number) => void} onChange
   * @returns {HTMLElement}
   * @private
   */
  #createMetricDropdown(value, onChange) {
    const select = document.createElement('select');
    select.className = 'inspector-input inspector-input--select';

    /** @type {Array<{label: string, value: number}>} */
    const options = [
      { label: 'Euclidean', value: EUCLIDEAN },
      { label: 'Hyperbolic', value: HYPERBOLIC },
      { label: 'Elliptic', value: ELLIPTIC },
      { label: 'Projective', value: PROJECTIVE }
    ];

    for (const opt of options) {
      const el = document.createElement('option');
      el.value = String(opt.value);
      el.textContent = opt.label;
      if (Number(value) === opt.value) el.selected = true;
      select.appendChild(el);
    }

    // If the current value isn't one of the known constants, show it explicitly.
    if (!options.some((o) => o.value === Number(value))) {
      const el = document.createElement('option');
      el.value = String(Number(value));
      el.textContent = `Custom (${Number(value)})`;
      el.selected = true;
      select.appendChild(el);
    }

    select.addEventListener('change', () => {
      const raw = parseInt(select.value, 10);
      if (!Number.isNaN(raw)) onChange(raw);
    });

    return select;
  }

  /**
   * Create appropriate widget for a value based on its type
   * @param {string} key - Attribute key
   * @param {*} value - The value
   * @param {Function} onChange - Change callback
   * @returns {HTMLElement} The widget element
   */
  createWidgetForValue(key, value, onChange) {
    // Check if value is a valid color
    if (ColorPickerWidget.isColorValue(value)) {
      const widget = new ColorPickerWidget(value, onChange);
      return widget.getElement();
    }
    
    // Check for boolean
    if (typeof value === 'boolean') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = value;
      checkbox.onchange = () => onChange(checkbox.checked);
      return checkbox;
    }
    
    // Check for number
    if (typeof value === 'number') {
      // Rendering hints `metric` should be an enum dropdown, not a float input.
      // The shader property panel does not use the descriptor system; it selects widgets
      // based on runtime values, so we special-case this key.
      const isMetric = key === 'metric' || key.endsWith('.metric');
      if (isMetric) {
        return this.#createMetricDropdown(value, onChange);
      }
      const widget = new NumberWidget('', value, onChange);
      return widget.getElement();
    }
    
    // Check for string
    if (typeof value === 'string') {
      return this.createTextInput(value, onChange);
    }
    
    // Check for array
    if (Array.isArray(value)) {
      const widget = new VectorWidget(value, null, onChange);
      return widget.getElement();
    }
    
    // Default: non-editable text
    const span = document.createElement('span');
    span.textContent = this.formatValue(value);
    span.style.color = '#858585';
    return span;
  }
  
  /**
   * Create an editable property definition based on value type
   * @param {string} label - Property label
   * @param {*} value - Property value
   * @param {Function} onChange - Change handler
   * @returns {Object} Property definition
   */
  createEditableProperty(label, value, onChange) {
    // Check if value is a valid color (Color object or color array)
    if (ColorPickerWidget.isColorValue(value)) {
      const widget = new ColorPickerWidget(value, onChange);
      return {
        label,
        value: widget.getElement(),
        editable: true
      };
    }
    
    // Check for boolean
    if (typeof value === 'boolean') {
      return {
        label,
        value,
        editable: true,
        onChange
      };
    }
    
    // Check for number
    if (typeof value === 'number') {
      // Use empty label since the property group already displays the label in the left column
      const isMetric = label === 'metric' || label.endsWith('.metric');
      if (isMetric) {
        return {
          label,
          value: this.#createMetricDropdown(value, onChange),
          editable: true
        };
      }
      const widget = new NumberWidget('', value, onChange);
      return { label, value: widget.getElement(), editable: true };
    }
    
    // Check for string
    if (typeof value === 'string') {
      return {
        label,
        value: this.createTextInput(value, onChange),
        editable: true
      };
    }
    
    // Default: non-editable formatted value
    return {
      label,
      value: this.formatValue(value),
      editable: false
    };
  }
  
  /**
   * Create a number input widget
   * @param {number} value - Number value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement}
   */
  createNumberInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.className = 'sg-number-input';
    
    // Determine if integer or float
    if (Number.isInteger(value)) {
      input.step = '1';
    } else {
      input.step = 'any';
    }
    
    input.addEventListener('change', () => {
      const newValue = Number.isInteger(value) 
        ? parseInt(input.value, 10)
        : parseFloat(input.value);
      
      if (!isNaN(newValue)) {
        onChange(newValue);
      }
    });
    
    // Also update on blur for better UX
    input.addEventListener('blur', () => {
      input.dispatchEvent(new Event('change'));
    });
    
    return input;
  }
  
  /**
   * Create a text input widget
   * @param {string} value - String value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement}
   */
  createTextInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.className = 'sg-text-input';
    
    input.addEventListener('change', () => {
      onChange(input.value);
    });
    
    input.addEventListener('blur', () => {
      input.dispatchEvent(new Event('change'));
    });
    
    return input;
  }
  
  /**
   * Format a value for display (delegates to PropertyFormatters)
   * @param {*} value - The value
   * @returns {string}
   */
  formatValue(value) {
    return formatValue(value);
  }
}

