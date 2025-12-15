/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's DefaultLineShader interface
// Default line/edge shader attributes and default values

import { Color } from '../util/Color.js';
import * as CommonAttributes from './CommonAttributes.js';

/**
 * The default line shader for jReality.
 * 
 * This shader controls the appearance of lines/edges in the scene.
 * It supports two rendering modes:
 * 1. **Tubes**: Lines rendered as 3D cylindrical tubes (tubeDraw=true)
 * 2. **Simple lines**: Lines rendered as 1D screen-space lines (tubeDraw=false)
 * 
 * ## Attribute Schema
 * 
 * The following attributes can be set on an Appearance:
 * 
 * ### General Attributes
 * - `line.diffuseColor` - Color of the lines
 * - `line.tubeDraw` - Whether to draw lines as 3D tubes
 * 
 * ### Tube-Related Attributes (when tubeDraw=true)
 * - `line.tubeRadius` - Radius of tubes (in object or world coordinates)
 * - `line.radiiWorldCoordinates` - Whether radius is in world vs object coordinates
 * 
 * ### Non-Tube Attributes (when tubeDraw=false)
 * - `line.lineWidth` - Width of 2D lines (in pixels)
 * - `line.lineStipple` - Whether to use dashed/stippled lines
 * - `line.lineStipplePattern` - Bit pattern for stippling
 * - `line.lineFactor` - Scaling factor for stipple pattern
 * - `line.vertexColors` - Whether to use vertex colors (interpolated)
 * - `line.lineLighting` - Whether to apply lighting to lines
 * 
 * ## Color Handling
 * 
 * When tubes are NOT drawn:
 * - If vertexColors is true: use and interpolate vertex colors from geometry
 * - Else if edge colors exist: use constant edge colors
 * - Else: use diffuseColor
 * 
 * When tubes ARE drawn:
 * - Vertex colors are ignored
 * - Edge colors are used if present
 * - Otherwise use diffuseColor
 * 
 * ## Backend Differences
 * 
 * Different renderers may implement this shader differently:
 * - Software renderer: Always draws tubes, radius in world coordinates
 * - JOGL renderer: Can draw Bresenham edges or tubes, radius in object coordinates
 * - Canvas2D/SVG: Simple 2D lines only, no tubes
 * 
 * @module DefaultLineShader
 */

/**
 * DefaultLineShader - default line rendering attributes
 * 
 * This object serves as both a schema definition and default value repository.
 */
export const DefaultLineShader = {
  // Marker for type identification
  type: 'DefaultLineShader',
  extends: 'LineShader',
  
  // ============================================================================
  // ATTRIBUTE SCHEMA
  // List of all attributes that can be set on line shaders
  // ============================================================================
  
  ATTRIBUTES: [
    'diffuseColor',
    'tubeDraw',
    // Tube-related
    'tubeRadius',
    'radiiWorldCoordinates',
    // Non-tube related
    'lineWidth',
    'lineStipple',
    'lineStipplePattern',
    'lineFactor',
    'edgeFade',      // Fade percentage for edge smoothing
    'vertexColors',
    'lineLighting'
  ],
  
  // ============================================================================
  // DEFAULT VALUES
  // Used when attributes are inherited (not explicitly set)
  // ============================================================================
  
  // General attributes
  
  /**
   * Default diffuse color for lines
   * @type {Color}
   */
  DIFFUSE_COLOR_DEFAULT: new Color(0, 0, 0), // Black
  
  /**
   * Whether to draw lines as 3D tubes (true) or 2D lines (false)
   * @type {boolean}
   */
  TUBE_DRAW_DEFAULT: true,
  
  // Tube-related attributes
  
  /**
   * Radius of tube lines (when tubeDraw is true)
   * In object or world coordinates depending on radiiWorldCoordinates
   * @type {number}
   */
  TUBE_RADIUS_DEFAULT: 0.025,
  
  /**
   * Whether radii are in world coordinates (true) or object coordinates (false)
   * Inherited from CommonAttributes
   * @type {boolean}
   */
  RADII_WORLD_COORDINATES_DEFAULT: CommonAttributes.RADII_WORLD_COORDINATES_DEFAULT,
  
  // Non-tube style attributes
  
  /**
   * Width of 2D lines in pixels (when tubeDraw is false)
   * @type {number}
   */
  LINE_WIDTH_DEFAULT: 1.0,
  
  /**
   * Whether to use stippled (dashed) line rendering
   * @type {boolean}
   */
  LINE_STIPPLE_DEFAULT: false,
  
  /**
   * Bit pattern for line stippling (16-bit value)
   * Default pattern creates a dashed effect
   * @type {number}
   */
  LINE_STIPPLE_PATTERN_DEFAULT: 0x7e7e,
  
  /**
   * Scaling factor for stipple pattern
   * Higher values create longer dashes/gaps
   * @type {number}
   */
  LINE_FACTOR_DEFAULT: 1,

  /**
   * Fade percentage for edge smoothing
   * @type {number}
   */
  LINE_EDGE_FADE_DEFAULT: 0.1,
  
  /**
   * Whether to use and interpolate vertex colors from geometry
   * If false, use edge colors (constant per edge) or diffuseColor
   * @type {boolean}
   */
  VERTEX_COLORS_DEFAULT: false,
  
  /**
   * Whether to enable smooth shading (color interpolation) for lines
   * @type {boolean}
   */
  SMOOTH_LINE_SHADING_DEFAULT: false,
  
  /**
   * Whether lighting calculations are applied to lines
   * Typically false for 2D lines
   * @type {boolean}
   */
  LIGHTING_ENABLED_DEFAULT: false,
  
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
      diffuseColor: this.DIFFUSE_COLOR_DEFAULT,
      tubeDraw: this.TUBE_DRAW_DEFAULT,
      tubeRadius: this.TUBE_RADIUS_DEFAULT,
      radiiWorldCoordinates: this.RADII_WORLD_COORDINATES_DEFAULT,
      lineWidth: this.LINE_WIDTH_DEFAULT,
      lineStipple: this.LINE_STIPPLE_DEFAULT,
      lineStipplePattern: this.LINE_STIPPLE_PATTERN_DEFAULT,
      lineFactor: this.LINE_FACTOR_DEFAULT,
      edgeFade: this.LINE_EDGE_FADE_DEFAULT,
      vertexColors: this.VERTEX_COLORS_DEFAULT,
      lineLighting: this.LIGHTING_ENABLED_DEFAULT
    };
  }
};

/**
 * Marker object for creating default instances
 */
export const CREATE_DEFAULT = Symbol('CREATE_DEFAULT');

