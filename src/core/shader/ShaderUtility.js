/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's ShaderUtility class
// Helper methods for shader and appearance attribute handling

import { Color } from '../util/Color.js';
import { ShaderRegistry } from './ShaderRegistry.js';

/**
 * Utility methods for shader and appearance management.
 * Provides helper functions for attribute namespacing and shader creation.
 */
export class ShaderUtility {

  /**
   * Combine two strings with a dot separator to create a namespaced attribute key.
   * If the first string is empty, just returns the second string.
   * 
   * Examples:
   *   nameSpace("point", "diffuseColor") => "point.diffuseColor"
   *   nameSpace("", "diffuseColor") => "diffuseColor"
   * 
   * @param {string} prefix - The namespace prefix (e.g., "point", "line", "polygon")
   * @param {string} attribute - The attribute name (e.g., "diffuseColor", "lineWidth")
   * @returns {string} The namespaced attribute key
   */
  static nameSpace(prefix, attribute) {
    return prefix.length === 0 ? attribute : prefix + '.' + attribute;
  }

  /**
   * Combine diffuse color with transparency value.
   * Used to compute final color with alpha channel from separate color and transparency attributes.
   * 
   * @param {Color} diffuseColor - The base diffuse color
   * @param {number} transparency - Transparency value (0 = opaque, 1 = fully transparent)
   * @param {boolean} useOldTransparency - If true, multiply color's alpha with transparency
   * @returns {Color} New color with combined alpha
   */
  static combineDiffuseColorWithTransparency(diffuseColor, transparency, useOldTransparency = false) {
    let alpha = 1.0 - transparency;
    
    if (useOldTransparency) {
      const alpha2 = diffuseColor.getAlpha() / 255.0;
      alpha = alpha * alpha2;
      alpha = Math.max(0.0, Math.min(1.0, alpha));
    }
    
    const r = diffuseColor.getRed();
    const g = diffuseColor.getGreen();
    const b = diffuseColor.getBlue();
    
    return new Color(r, g, b, Math.round(alpha * 255));
  }
  
  /**
   * Resolve a shader name to its schema implementation.
   * Maps shader names (like "default", "implode", "twoSide") to schema objects.
   * 
   * This is the JavaScript equivalent of Java's ShaderUtility.resolveEntity().
   * 
   * @param {string} type - Shader type: 'point', 'line', or 'polygon'
   * @param {string} name - Shader name (e.g., 'default', 'implode')
   * @returns {Object} Shader schema object
   * @throws {Error} If shader type or name is not found
   */
  static resolveShader(type, name) {
    return ShaderRegistry.resolveShader(type, name);
  }
}

