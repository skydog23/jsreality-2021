// JavaScript port of jReality's DefaultGeometryShader interface
// Top-level geometry shader that manages point, line, and polygon shaders

import { INHERITED } from '../scene/Appearance.js';
import * as CommonAttributes from './CommonAttributes.js';
import { DefaultPointShader } from './DefaultPointShader.js';
import { DefaultLineShader } from './DefaultLineShader.js';
import { DefaultPolygonShader } from './DefaultPolygonShader.js';

/**
 * The default geometry shader for jReality.
 * 
 * This is the top-level shader that manages rendering of all three primitive types:
 * - Points/vertices
 * - Lines/edges
 * - Polygons/faces
 * 
 * ## Structure
 * 
 * The DefaultGeometryShader is instantiated by the renderer using an EffectiveAppearance.
 * It:
 * 1. Controls whether each primitive type is drawn (via show flags)
 * 2. Contains three sub-shader instances with resolved attribute values
 * 
 * ## Show Flags
 * 
 * Three boolean flags control what is rendered:
 * - `showPoints` / `vertexDraw` - Whether to draw vertices as points
 * - `showLines` / `edgeDraw` - Whether to draw edges as lines
 * - `showFaces` / `faceDraw` - Whether to draw faces as polygons
 * 
 * ## Sub-Shaders
 * 
 * Three sub-shader instances control HOW each primitive type is rendered:
 * - `PointShader` - Point appearance (color, size, spheres, etc.)
 * - `LineShader` - Line appearance (color, width, tubes, stippling, etc.)
 * - `PolygonShader` - Polygon appearance (lighting, materials, transparency, etc.)
 * 
 * ## Creation from EffectiveAppearance
 * 
 * ```javascript
 * const geometryShader = DefaultGeometryShader.createFromEffectiveAppearance(effectiveAppearance);
 * 
 * // Access show flags
 * const showPoints = geometryShader.getShowPoints();
 * 
 * // Access sub-shaders with resolved values
 * const pointShader = geometryShader.getPointShader();
 * const diffuseColor = pointShader.diffuseColor; // Actual value or INHERITED
 * ```
 * 
 * ## Inspector Integration
 * 
 * In the inspector, a DefaultGeometryShader instance appears as a node with:
 * - Its own properties (show flags)
 * - Three "children" (sub-shader instances) that can be expanded
 * - Each attribute shows actual value or INHERITED symbol
 * 
 * @module DefaultGeometryShader
 */

/**
 * DefaultGeometryShader class - instances hold resolved shader attribute values
 */
export class DefaultGeometryShader {
  /** @type {boolean|Symbol} */
  #showPoints;
  
  /** @type {boolean|Symbol} */
  #showLines;
  
  /** @type {boolean|Symbol} */
  #showFaces;
  
  /** @type {PointShaderInstance} */
  #pointShader;
  
  /** @type {LineShaderInstance} */
  #lineShader;
  
  /** @type {PolygonShaderInstance} */
  #polygonShader;
  
  /**
   * Create a DefaultGeometryShader (typically via createFromEffectiveAppearance)
   * @param {Object} options - Configuration
   * @param {boolean|Symbol} options.showPoints - Show points flag
   * @param {boolean|Symbol} options.showLines - Show lines flag
   * @param {boolean|Symbol} options.showFaces - Show faces flag
   * @param {PointShaderInstance} options.pointShader - Point shader instance
   * @param {LineShaderInstance} options.lineShader - Line shader instance
   * @param {PolygonShaderInstance} options.polygonShader - Polygon shader instance
   */
  constructor({ showPoints, showLines, showFaces, pointShader, lineShader, polygonShader }) {
    this.#showPoints = showPoints;
    this.#showLines = showLines;
    this.#showFaces = showFaces;
    this.#pointShader = pointShader;
    this.#lineShader = lineShader;
    this.#polygonShader = polygonShader;
  }
  
  /**
   * Get show points flag
   * @returns {boolean|Symbol} True, false, or INHERITED
   */
  getShowPoints() {
    return this.#showPoints;
  }
  
  /**
   * Get show lines flag
   * @returns {boolean|Symbol} True, false, or INHERITED
   */
  getShowLines() {
    return this.#showLines;
  }
  
  /**
   * Get show faces flag
   * @returns {boolean|Symbol} True, false, or INHERITED
   */
  getShowFaces() {
    return this.#showFaces;
  }
  
  /**
   * Get point shader instance
   * @returns {PointShaderInstance}
   */
  getPointShader() {
    return this.#pointShader;
  }
  
  /**
   * Get line shader instance
   * @returns {LineShaderInstance}
   */
  getLineShader() {
    return this.#lineShader;
  }
  
  /**
   * Get polygon shader instance
   * @returns {PolygonShaderInstance}
   */
  getPolygonShader() {
    return this.#polygonShader;
  }
  
  /**
   * Get a human-readable name for inspector display
   * @returns {string}
   */
  getName() {
    return 'Geometry Shader';
  }
  
  /**
   * Get all attributes as a map (for inspector display)
   * @returns {Object} Attribute map with showPoints, showLines, showFaces
   */
  getAllAttributes() {
    return {
      showPoints: this.#showPoints,
      showLines: this.#showLines,
      showFaces: this.#showFaces
    };
  }
  
  /**
   * Create a DefaultGeometryShader from an EffectiveAppearance
   * 
   * Queries the EffectiveAppearance for all shader attributes and creates
   * instances with either explicit values or INHERITED symbols.
   * 
   * @param {EffectiveAppearance} effectiveAppearance - The effective appearance
   * @returns {DefaultGeometryShader} New geometry shader instance
   */
  static createFromEffectiveAppearance(effectiveAppearance) {
    // Query show flags
    const showPoints = effectiveAppearance.getAttribute(
      CommonAttributes.VERTEX_DRAW, 
      INHERITED
    );
    const showLines = effectiveAppearance.getAttribute(
      CommonAttributes.EDGE_DRAW,
      INHERITED
    );
    const showFaces = effectiveAppearance.getAttribute(
      CommonAttributes.FACE_DRAW,
      INHERITED
    );
    
    // Create sub-shader instances
    const pointShader = PointShaderInstance.createFromEffectiveAppearance(effectiveAppearance);
    const lineShader = LineShaderInstance.createFromEffectiveAppearance(effectiveAppearance);
    const polygonShader = PolygonShaderInstance.createFromEffectiveAppearance(effectiveAppearance);
    
    return new DefaultGeometryShader({
      showPoints,
      showLines,
      showFaces,
      pointShader,
      lineShader,
      polygonShader
    });
  }
}

// ============================================================================
// SUB-SHADER INSTANCE CLASSES
// ============================================================================

/**
 * Generic Shader Instance - base class for all shader instances
 * Holds resolved shader attribute values (either explicit values or INHERITED symbol)
 */
class ShaderInstance {
  #attributes;
  #type;
  #name;
  
  /**
   * @param {Object} attributes - Map of attribute names to values
   * @param {string} type - Shader type ('point', 'line', 'polygon')
   * @param {string} name - Human-readable name
   */
  constructor(attributes, type, name) {
    this.#attributes = attributes;
    this.#type = type;
    this.#name = name;
  }
  
  /**
   * Get an attribute value
   * @param {string} key - Attribute name
   * @returns {*|Symbol} Value or INHERITED
   */
  getAttribute(key) {
    return this.#attributes[key];
  }
  
  /**
   * Get all attributes as a map
   * @returns {Object} Attribute map
   */
  getAllAttributes() {
    return { ...this.#attributes };
  }
  
  /**
   * Get shader type for inspector
   * @returns {string}
   */
  getType() {
    return this.#type;
  }
  
  /**
   * Get human-readable name
   * @returns {string}
   */
  getName() {
    return this.#name;
  }
}

/**
 * Factory function to create a shader instance from an EffectiveAppearance
 * 
 * This generic factory eliminates code duplication by using a single parameterized
 * method to create all three shader instance types.
 * 
 * @param {EffectiveAppearance} ea - The effective appearance
 * @param {Object} schema - Shader schema object (e.g., DefaultPointShader)
 * @param {string} prefix - Attribute prefix ('point', 'line', 'polygon')
 * @param {string} type - Shader type for identification
 * @param {string} name - Human-readable shader name
 * @returns {ShaderInstance} New shader instance with resolved attributes
 */
function createShaderInstance(ea, schema, prefix, type, name) {
  const attributes = {};
  
  // Query each attribute with the prefix
  for (const attr of schema.ATTRIBUTES) {
    const fullKey = `${prefix}.${attr}`;
    attributes[attr] = ea.getAttribute(fullKey, INHERITED);
  }
  
  return new ShaderInstance(attributes, type, name);
}

/**
 * Point Shader Instance - holds resolved point attribute values
 */
export class PointShaderInstance extends ShaderInstance {
  /**
   * Create from EffectiveAppearance
   * @param {EffectiveAppearance} ea - Effective appearance
   * @returns {PointShaderInstance}
   */
  static createFromEffectiveAppearance(ea) {
    return createShaderInstance(
      ea,
      DefaultPointShader,
      'point',
      'point',
      'Point Shader'
    );
  }
}

/**
 * Line Shader Instance - holds resolved line attribute values
 */
export class LineShaderInstance extends ShaderInstance {
  /**
   * Create from EffectiveAppearance
   * @param {EffectiveAppearance} ea - Effective appearance
   * @returns {LineShaderInstance}
   */
  static createFromEffectiveAppearance(ea) {
    return createShaderInstance(
      ea,
      DefaultLineShader,
      'line',
      'line',
      'Line Shader'
    );
  }
}

/**
 * Polygon Shader Instance - holds resolved polygon attribute values
 */
export class PolygonShaderInstance extends ShaderInstance {
  /**
   * Create from EffectiveAppearance
   * @param {EffectiveAppearance} ea - Effective appearance
   * @returns {PolygonShaderInstance}
   */
  static createFromEffectiveAppearance(ea) {
    return createShaderInstance(
      ea,
      DefaultPolygonShader,
      'polygon',
      'polygon',
      'Polygon Shader'
    );
  }
}
