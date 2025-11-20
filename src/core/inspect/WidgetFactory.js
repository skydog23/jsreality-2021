// Factory for creating UI widgets for editing property values

import { ColorPickerWidget, VectorWidget, NumberWidget } from './widgets/index.js';
import { Color } from '../util/Color.js';
import { formatValue } from './PropertyFormatters.js';

/**
 * Factory for creating UI widgets for editing property values
 */
export class WidgetFactory {
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
      const widget = new NumberWidget('', value, onChange);
      return {
        label,
        value: widget.getElement(),
        editable: true
      };
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

