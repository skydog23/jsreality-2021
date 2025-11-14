// JavaScript port of jReality's ShaderUtility class
// Helper methods for shader and appearance attribute handling

import { Color } from '../util/Color.js';

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
}

