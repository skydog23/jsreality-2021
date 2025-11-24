/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's DefaultPointShader interface
// Default point shader attributes and default values

import { Color } from '../util/Color.js';
import * as CommonAttributes from './CommonAttributes.js';

/**
 * The default point shader for jReality.
 * 
 * This shader controls the appearance of points/vertices in the scene.
 * It supports two rendering modes:
 * 1. **Spheres**: Points rendered as 3D spheres with radius (spheresDraw=true)
 * 2. **Simple points**: Points rendered as 2D screen-space pixels (spheresDraw=false)
 * 
 * ## Attribute Schema
 * 
 * The following attributes can be set on an Appearance:
 * - `point.diffuseColor` - Color of the points
 * - `point.spheresDraw` - Whether to draw points as 3D spheres
 * - `point.pointRadius` - Radius of spheres (in object or world coordinates)
 * - `point.pointSize` - Size of 2D points (in pixels)
 * - `point.attenuatePointSize` - Whether point size diminishes with distance
 * - `point.radiiWorldCoordinates` - Whether radius is in world vs object coordinates
 * 
 * ## Inheritance
 * 
 * When an attribute is not explicitly set (returns INHERITED), the system
 * falls back to:
 * 1. Parent appearance's value
 * 2. Default value from this shader (if at root)
 * 
 * @module DefaultPointShader
 */

/**
 * DefaultPointShader - default point rendering attributes
 * 
 * This object serves as both a schema definition and default value repository.
 * Use it to:
 * 1. Query what attributes are available for points
 * 2. Get default values when attributes are inherited
 * 3. Build UI for editing point appearance
 */
export const DefaultPointShader = {
  // Marker for type identification
  type: 'DefaultPointShader',
  extends: 'PointShader',
  
  // ============================================================================
  // ATTRIBUTE SCHEMA
  // List of all attributes that can be set on point shaders
  // ============================================================================
  
  ATTRIBUTES: [
    'diffuseColor',
    'spheresDraw',
    'pointRadius',
    'pointSize',
    'attenuatePointSize',
    'radiiWorldCoordinates'
  ],
  
  // ============================================================================
  // DEFAULT VALUES
  // Used when attributes are inherited (not explicitly set)
  // ============================================================================
  
  /**
   * Default diffuse color for points
   * @type {Color}
   */
  DIFFUSE_COLOR_DEFAULT: new Color(255, 0, 0), // Red
  
  /**
   * Whether to draw points as 3D spheres (true) or 2D pixels (false)
   * @type {boolean}
   */
  SPHERES_DRAW_DEFAULT: true,
  
  /**
   * Radius of point spheres (when spheresDraw is true)
   * In object or world coordinates depending on radiiWorldCoordinates
   * @type {number}
   */
  POINT_RADIUS_DEFAULT: 0.025,
  
  /**
   * Size of 2D points in pixels (when spheresDraw is false)
   * @type {number}
   */
  POINT_SIZE_DEFAULT: 3.0,
  
  /**
   * Whether point size diminishes with distance from camera
   * @type {boolean}
   */
  ATTENUATE_POINT_SIZE_DEFAULT: true,
  
  /**
   * Whether radii are in world coordinates (true) or object coordinates (false)
   * Inherited from CommonAttributes
   * @type {boolean}
   */
  RADII_WORLD_COORDINATES_DEFAULT: CommonAttributes.RADII_WORLD_COORDINATES_DEFAULT,
  
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
      spheresDraw: this.SPHERES_DRAW_DEFAULT,
      pointRadius: this.POINT_RADIUS_DEFAULT,
      pointSize: this.POINT_SIZE_DEFAULT,
      attenuatePointSize: this.ATTENUATE_POINT_SIZE_DEFAULT,
      radiiWorldCoordinates: this.RADII_WORLD_COORDINATES_DEFAULT
    };
  }
};

/**
 * Marker object for creating default instances
 * In Java, this triggers factory methods. In JavaScript, it's informational.
 */
export const CREATE_DEFAULT = Symbol('CREATE_DEFAULT');

