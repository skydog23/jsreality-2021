// JavaScript port of jReality's ImplodePolygonShader interface
// Implode polygon shader - extends DefaultPolygonShader with implode effect

import { DefaultPolygonShader } from './DefaultPolygonShader.js';

/**
 * The implode polygon shader for jReality.
 * 
 * This shader extends DefaultPolygonShader with an implode effect that
 * displaces vertices toward or away from the face center.
 * 
 * ## Implode Effect
 * 
 * The implode factor controls how much vertices are displaced:
 * - Negative values: vertices move toward face center (implode/inward)
 * - Positive values: vertices move away from face center (explode/outward)
 * - Zero: no displacement (normal rendering)
 * 
 * ## Attribute Schema
 * 
 * Inherits all attributes from DefaultPolygonShader, plus:
 * - `polygon.implodeFactor` - Displacement factor (default: -0.6)
 * 
 * ## Usage
 * 
 * ```javascript
 * const dgs = DefaultGeometryShader.createFromEffectiveAppearance(ea);
 * const implodeShader = dgs.createPolygonShader('implode');
 * 
 * // Set implode factor via appearance
 * appearance.setAttribute('polygonShader.implodeFactor', 0.5);
 * ```
 * 
 * @module ImplodePolygonShader
 */

/**
 * ImplodePolygonShader - implode polygon rendering attributes
 * 
 * Extends DefaultPolygonShader with implode effect.
 * This is a schema object that defines the additional attributes.
 */
export const ImplodePolygonShader = {
  // Marker for type identification
  type: 'ImplodePolygonShader',
  extends: 'DefaultPolygonShader',
  
  // Inherit all attributes from DefaultPolygonShader
  ATTRIBUTES: [
    ...DefaultPolygonShader.ATTRIBUTES,
    'implodeFactor'
  ],
  
  // ============================================================================
  // DEFAULT VALUES
  // ============================================================================
  
  /**
   * Default implode factor
   * Negative values implode (inward), positive values explode (outward)
   * @type {number}
   */
  IMPLODE_FACTOR_DEFAULT: -0.6,
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Get the default value for a given attribute
   * @param {string} attribute - Attribute name
   * @returns {*} Default value, or undefined if attribute doesn't exist
   */
  getDefault(attribute) {
    // Check implode-specific defaults first
    if (attribute === 'implodeFactor') {
      return this.IMPLODE_FACTOR_DEFAULT;
    }
    // Fall back to DefaultPolygonShader defaults
    return DefaultPolygonShader.getDefault(attribute);
  },
  
  /**
   * Check if an attribute is valid for this shader
   * @param {string} attribute - Attribute name
   * @returns {boolean} True if attribute exists in schema
   */
  hasAttribute(attribute) {
    return this.ATTRIBUTES.includes(attribute);
  },
  
  /**
   * Get all attributes with their default values
   * @returns {Object} Map of attribute names to default values
   */
  getAllDefaults() {
    return {
      ...DefaultPolygonShader.getAllDefaults(),
      implodeFactor: this.IMPLODE_FACTOR_DEFAULT
    };
  }
};

