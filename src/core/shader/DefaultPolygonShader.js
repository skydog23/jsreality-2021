/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's DefaultPolygonShader interface
// Default polygon/face shader attributes and default values

import { Color } from '../util/Color.js';

/**
 * The default polygon shader for jReality.
 * 
 * This shader implements a standard plastic-like surface shader using
 * a Phong/Blinn-Phong lighting model.
 * 
 * ## Lighting Formula
 * 
 * The shaded color at a point P on the surface with normal vector N,
 * eye vector I, and light vector L is given by:
 * 
 * ```
 * Cs = Ka*ambient + Kd*(N·L)*diffuse + Ks*pow((L·R), Kexp)*specular
 * ```
 * 
 * Where:
 * - R is the reflected eye vector
 * - Ka, Kd, Ks are the ambient, diffuse, and specular coefficients
 * - Kexp is the specular exponent (shininess)
 * - ambient, diffuse, specular are colors
 * 
 * ## Attribute Schema
 * 
 * The following attributes can be set on an Appearance:
 * 
 * ### Lighting Coefficients
 * - `polygon.ambientCoefficient` - Weight of ambient term (Ka)
 * - `polygon.diffuseCoefficient` - Weight of diffuse term (Kd)
 * - `polygon.specularCoefficient` - Weight of specular term (Ks)
 * - `polygon.specularExponent` - Shininess/specular exponent (Kexp)
 * 
 * ### Colors
 * - `polygon.ambientColor` - Ambient light color
 * - `polygon.diffuseColor` - Base surface color
 * - `polygon.specularColor` - Highlight color
 * 
 * ### Shading Mode
 * - `polygon.smoothShading` - Smooth (vertex) vs flat (face) shading
 * 
 * ### Transparency
 * - `polygon.transparency` - How much light passes through (0=opaque, 1=transparent)
 * 
 * ## Smooth vs Flat Shading
 * 
 * When `smoothShading` is true:
 * - Uses vertex normals and vertex colors (if present in geometry)
 * - Interpolates across faces for smooth appearance
 * 
 * When `smoothShading` is false:
 * - Uses face normals and face colors (if present in geometry)
 * - Constant color per face for faceted appearance
 * 
 * ## Diffuse Color Resolution
 * 
 * The diffuse color can come from three sources (in priority order):
 * 1. Vertex colors (if smoothShading=true and vertex colors present)
 * 2. Face colors (if smoothShading=false and face colors present)
 * 3. The `diffuseColor` attribute
 * 
 * ## Transparency
 * 
 * Transparency is handled via the RenderingHintsShader.
 * A transparency value of 0 is opaque; values approaching 1 are more transparent.
 * Requires transparencyEnabled=true in RenderingHintsShader.
 * 
 * @module DefaultPolygonShader
 * @see RenderingHintsShader for transparency and other rendering hints
 * @see IndexedFaceSet for how to set vertex and face attributes
 */

/**
 * DefaultPolygonShader - default polygon rendering attributes
 * 
 * This object serves as both a schema definition and default value repository.
 */
export const DefaultPolygonShader = {
  // Marker for type identification
  type: 'DefaultPolygonShader',
  extends: 'PolygonShader',
  
  // ============================================================================
  // ATTRIBUTE SCHEMA
  // List of all attributes that can be set on polygon shaders
  // ============================================================================
  
  ATTRIBUTES: [
    // Lighting coefficients
    'ambientCoefficient',
    'diffuseCoefficient',
    'specularCoefficient',
    'specularExponent',
    // Colors
    'ambientColor',
    'diffuseColor',
    'specularColor',
    // Shading mode
    'smoothShading',
    // Transparency
    'transparency',
    // Texture maps (Texture2D instances)
    'texture2d',
    'texture2d[1]',
    'texture2d[2]',
    'texture2d[3]',
  ],
  
  // ============================================================================
  // DEFAULT VALUES
  // Used when attributes are inherited (not explicitly set)
  // ============================================================================
  
  // Lighting coefficients
  
  /**
   * Default ambient coefficient (Ka)
   * Weight of ambient light contribution
   * @type {number}
   */
  AMBIENT_COEFFICIENT_DEFAULT: 0.0,
  
  /**
   * Default diffuse coefficient (Kd)
   * Weight of diffuse (Lambertian) reflection
   * @type {number}
   */
  DIFFUSE_COEFFICIENT_DEFAULT: 1.0,
  
  /**
   * Default specular coefficient (Ks)
   * Weight of specular (highlight) reflection
   * @type {number}
   */
  SPECULAR_COEFFICIENT_DEFAULT: 0.7,
  
  /**
   * Default specular exponent (shininess)
   * Higher values create tighter, shinier highlights
   * @type {number}
   */
  SPECULAR_EXPONENT_DEFAULT: 60.0,
  
  // Colors
  
  /**
   * Default ambient color
   * Used for ambient light reflection
   * @type {Color}
   */
  AMBIENT_COLOR_DEFAULT: new Color(255, 255, 255), // White
  
  /**
   * Default diffuse color
   * Base surface color for Lambertian reflection
   * @type {Color}
   */
  DIFFUSE_COLOR_DEFAULT: new Color(0, 0, 255), // Blue
  
  /**
   * Default specular color
   * Color of specular highlights
   * @type {Color}
   */
  SPECULAR_COLOR_DEFAULT: new Color(255, 255, 255), // White
  
  // Shading mode
  
  /**
   * Default smooth shading mode
   * If true, use vertex normals/colors and interpolate (smooth)
   * If false, use face normals/colors (flat/faceted)
   * @type {boolean}
   */
  SMOOTH_SHADING_DEFAULT: true,
  
  // Transparency
  
  /**
   * Default transparency value
   * 0.0 = fully opaque, 1.0 = fully transparent
   * Requires RenderingHintsShader.transparencyEnabled=true to take effect
   * @type {number}
   */
  TRANSPARENCY_DEFAULT: 0.0,
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Get the default value for a given attribute
   * @param {string} attribute - Attribute name (e.g., 'diffuseColor')
   * @returns {*} Default value, or undefined if attribute doesn't exist
   */
  getDefault(attribute) {
    const key = attribute.toUpperCase().replace(/([A-Z])/g, '_$1') + '_DEFAULT';
    return this[key];
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
      ambientCoefficient: this.AMBIENT_COEFFICIENT_DEFAULT,
      diffuseCoefficient: this.DIFFUSE_COEFFICIENT_DEFAULT,
      specularCoefficient: this.SPECULAR_COEFFICIENT_DEFAULT,
      specularExponent: this.SPECULAR_EXPONENT_DEFAULT,
      ambientColor: this.AMBIENT_COLOR_DEFAULT,
      diffuseColor: this.DIFFUSE_COLOR_DEFAULT,
      specularColor: this.SPECULAR_COLOR_DEFAULT,
      smoothShading: this.SMOOTH_SHADING_DEFAULT,
      transparency: this.TRANSPARENCY_DEFAULT
    };
  }
};

/**
 * Marker object for creating default instances
 */
export const CREATE_DEFAULT = Symbol('CREATE_DEFAULT');

