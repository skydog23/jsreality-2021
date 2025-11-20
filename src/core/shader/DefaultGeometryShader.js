// JavaScript port of jReality's DefaultGeometryShader interface
// Top-level geometry shader that manages point, line, and polygon shaders

import { INHERITED } from '../scene/Appearance.js';
import * as CommonAttributes from './CommonAttributes.js';
import { DefaultPointShader } from './DefaultPointShader.js';
import { DefaultLineShader } from './DefaultLineShader.js';
import { DefaultPolygonShader } from './DefaultPolygonShader.js';
import { ImplodePolygonShader } from './ImplodePolygonShader.js';
import { ShaderUtility } from './ShaderUtility.js';
import { IndexedFaceSetUtility } from '../geometry/IndexedFaceSetUtility.js';

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
  
  /** @type {EffectiveAppearance} */
  #effectiveAppearance;
  
  /**
   * Create a DefaultGeometryShader (typically via createFromEffectiveAppearance)
   * @param {Object} options - Configuration
   * @param {boolean|Symbol} options.showPoints - Show points flag
   * @param {boolean|Symbol} options.showLines - Show lines flag
   * @param {boolean|Symbol} options.showFaces - Show faces flag
   * @param {PointShaderInstance} options.pointShader - Point shader instance
   * @param {LineShaderInstance} options.lineShader - Line shader instance
   * @param {PolygonShaderInstance} options.polygonShader - Polygon shader instance
   * @param {EffectiveAppearance} options.effectiveAppearance - The effective appearance
   */
  constructor({ showPoints, showLines, showFaces, pointShader, lineShader, polygonShader, effectiveAppearance }) {
    this.#showPoints = showPoints;
    this.#showLines = showLines;
    this.#showFaces = showFaces;
    this.#pointShader = pointShader;
    this.#lineShader = lineShader;
    this.#polygonShader = polygonShader;
    this.#effectiveAppearance = effectiveAppearance;
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
      polygonShader,
      effectiveAppearance
    });
  }
  
  /**
   * Create a polygon shader instance with the given name.
   * This allows creating non-default shaders like "implode", "twoSide", etc.
   * 
   * Note: In the Java version, calling this also stores the shader name in Appearance.
   * In JavaScript, the name should be set via Appearance.setAttribute("polygonShader", name)
   * before calling getPolygonShader().
   * 
   * @param {string} name - Shader name (e.g., 'default', 'implode')
   * @returns {PolygonShaderInstance} New polygon shader instance
   */
  createPolygonShader(name) {
    return PolygonShaderInstance.createFromEffectiveAppearance(
      this.#effectiveAppearance,
      name
    );
  }
  
  /**
   * Get the current polygon shader instance.
   * Looks up the shader name from EffectiveAppearance and creates the appropriate instance.
   * 
   * This matches the Java ShaderLookup.getShaderAttr() logic:
   * 1. Try "polygonShader" attribute (base + attr)
   * 2. Try "polygonShadername" attribute (base + attr + "name")
   * 3. Try "polygonShader.name" attribute (base + attr + ".name")
   * 4. Default to "default"
   * 
   * @returns {PolygonShaderInstance} Current polygon shader instance
   */
  getPolygonShader() {
    // Look up shader name from EffectiveAppearance
    // Matching Java ShaderLookup.getShaderAttr() logic exactly
    const base = CommonAttributes.POLYGON_SHADER;
    let shaderName = this.#effectiveAppearance.getAttribute(
      base,
      'default'
    );
    
    // If not found or is 'default', try alternative keys
    if (shaderName === 'default' || shaderName === INHERITED) {
      shaderName = this.#effectiveAppearance.getAttribute(
        base + 'name',
        'default'
      );
    }
    
    if (shaderName === 'default' || shaderName === INHERITED) {
      shaderName = this.#effectiveAppearance.getAttribute(
        ShaderUtility.nameSpace(base, 'name'),
        'default'
      );
    }
    
    // Default to 'default' if still not found or is INHERITED
    if (shaderName === INHERITED || !shaderName || shaderName === 'default') {
      shaderName = 'default';
    }
    
    return this.createPolygonShader(shaderName);
  }
  
  /**
   * Get the effective appearance used by this geometry shader
   * @protected
   * @returns {EffectiveAppearance}
   */
  getEffectiveAppearance() {
    return this.#effectiveAppearance;
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
  
  /**
   * Check if this shader provides proxy geometry.
   * Proxy geometry replaces the original geometry during rendering.
   * 
   * @returns {boolean} True if this shader provides proxy geometry
   */
  providesProxyGeometry() {
    return false;
  }
  
  /**
   * Get proxy geometry to replace the original geometry.
   * Only called if providesProxyGeometry() returns true.
   * 
   * @param {Geometry} originalGeometry - The original geometry from the scene graph
   * @returns {Geometry|null} Proxy geometry, or null if no proxy should be used
   */
  getProxyGeometry(originalGeometry) {
    return null;
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
 * Factory function to create a polygon shader instance with optional shader name.
 * Supports non-default shaders via ShaderRegistry.
 * 
 * @param {EffectiveAppearance} ea - The effective appearance
 * @param {string} [shaderName] - Optional shader name (defaults to 'default')
 * @returns {PolygonShaderInstance} New polygon shader instance
 */
function createPolygonShaderInstance(ea, shaderName = 'default') {
  // Resolve shader schema from registry
  const schema = ShaderUtility.resolveShader('polygon', shaderName);
  
  // Create instance using the resolved schema
  return createShaderInstance(
    ea,
    schema,
    CommonAttributes.POLYGON_SHADER,
    'polygon',
    shaderName === 'default' ? 'Polygon Shader' : `${shaderName} Polygon Shader`
  );
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
      CommonAttributes.POINT_SHADER,
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
      CommonAttributes.LINE_SHADER,
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
   * Supports non-default shaders by looking up shader name from EffectiveAppearance.
   * 
   * @param {EffectiveAppearance} ea - Effective appearance
   * @param {string} [shaderName] - Optional shader name (if not provided, looks it up from EA)
   * @returns {PolygonShaderInstance}
   */
  static createFromEffectiveAppearance(ea, shaderName = null) {
    // If shader name not provided, look it up from EffectiveAppearance
    if (!shaderName) {
      // Try multiple attribute keys (for compatibility)
      shaderName = ea.getAttribute(CommonAttributes.POLYGON_SHADER, 'default');
      
      if (shaderName === 'default' || shaderName === INHERITED) {
        shaderName = ea.getAttribute(
          ShaderUtility.nameSpace(CommonAttributes.POLYGON_SHADER, 'name'),
          'default'
        );
      }
      
      if (shaderName === 'default' || shaderName === INHERITED) {
        shaderName = ea.getAttribute(
          CommonAttributes.POLYGON_SHADER + 'name',
          'default'
        );
      }
      
      // Default to 'default' if still not found
      if (shaderName === INHERITED || !shaderName || shaderName === 'default') {
        shaderName = 'default';
      }
    }
    
    // Special handling for implode shader
    if (shaderName === 'implode') {
      return ImplodePolygonShaderInstance.createFromEffectiveAppearance(ea);
    }
    
    return createPolygonShaderInstance(ea, shaderName);
  }
}

/**
 * Implode Polygon Shader Instance - provides imploded geometry as proxy
 */
export class ImplodePolygonShaderInstance extends PolygonShaderInstance {
  #implodeFactor;
  
  /**
   * Create from EffectiveAppearance
   * @param {EffectiveAppearance} ea - Effective appearance
   * @returns {ImplodePolygonShaderInstance}
   */
  static createFromEffectiveAppearance(ea) {
    // Get implode factor from appearance
    const implodeFactor = ea.getAttribute(
      ShaderUtility.nameSpace(CommonAttributes.POLYGON_SHADER, 'implodeFactor'),
      ImplodePolygonShader.IMPLODE_FACTOR_DEFAULT
    );
    
    // Create base polygon shader instance with all attributes
    const baseInstance = createPolygonShaderInstance(ea, 'default');
    const attributes = baseInstance.getAllAttributes();
    attributes.implodeFactor = implodeFactor;
    
    const instance = new ImplodePolygonShaderInstance(
      attributes,
      'polygon',
      'Implode Polygon Shader'
    );
    instance.#implodeFactor = implodeFactor === INHERITED 
      ? ImplodePolygonShader.IMPLODE_FACTOR_DEFAULT 
      : implodeFactor;
    
    return instance;
  }
  
  /**
   * @param {Object} attributes - Map of attribute names to values
   * @param {string} type - Shader type
   * @param {string} name - Human-readable name
   */
  constructor(attributes, type, name) {
    super(attributes, type, name);
  }
  
  /**
   * Get implode factor
   * @returns {number} Implode factor
   */
  getImplodeFactor() {
    return this.#implodeFactor;
  }
  
  /**
   * Implode shader always provides proxy geometry
   * @returns {boolean} Always true
   */
  providesProxyGeometry() {
    return true;
  }
  
  /**
   * Get imploded geometry as proxy
   * @param {Geometry} originalGeometry - Original geometry
   * @returns {IndexedFaceSet|null} Imploded geometry, or null if not IndexedFaceSet
   */
  getProxyGeometry(originalGeometry) {
    // Check if it's an IndexedFaceSet by checking for required methods
    if (!originalGeometry || typeof originalGeometry.getFaceAttribute !== 'function') {
      return null;
    }
    
    return IndexedFaceSetUtility.implode(originalGeometry, this.#implodeFactor);
  }
}
