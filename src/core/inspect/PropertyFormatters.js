/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Utility functions for formatting property values for display

/**
 * Format a value for display in the property panel
 * @param {*} value - The value to format
 * @returns {string} Formatted string representation
 */
export function formatValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length <= 4) return `[${value.map(v => v.toFixed?.(2) || v).join(', ')}]`;
      return `Array(${value.length})`;
    }
    return value.toString();
  }
  if (typeof value === 'number') {
    return value.toFixed(3);
  }
  return String(value);
}

/**
 * Format an attribute name for display
 * Converts camelCase or snake_case to Title Case
 * @param {string} key - Attribute key (e.g., 'diffuseColor', 'point_size')
 * @returns {string} Formatted name (e.g., 'Diffuse Color', 'Point Size')
 */
export function formatAttributeName(key) {
  // Handle namespaced keys (e.g., 'point.diffuseColor' -> 'Diffuse Color')
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Convert camelCase to Title Case
  // Insert space before capital letters, then capitalize first letter
  const formatted = lastPart
    .replace(/([A-Z])/g, ' $1')  // Add space before capitals
    .replace(/^./, str => str.toUpperCase())  // Capitalize first letter
    .trim();
  
  return formatted;
}

