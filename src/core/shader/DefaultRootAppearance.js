/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// JavaScript port of jReality's DefaultRootAppearance interface
// Default root appearance shader attributes and default values

import * as CommonAttributes from './CommonAttributes.js';

/**
 * The default root appearance shader for jReality.
 * 
 * This shader controls scene-wide rendering settings that are typically
 * set on the root Appearance node, including:
 * - Background color and textures
 * - Fog effects
 * - Rendering optimizations (S3, GLSL)
 * 
 * ## Attribute Schema
 * 
 * The following attributes can be set on the root Appearance:
 * 
 * ### Background
 * - `backgroundColor` - Single background color
 * - `backgroundColors` - Array of background colors (for gradients)
 * - `backgroundTexture2D` - Background texture (Texture2D object)
 * 
 * ### Fog
 * - `fogShader` - Name of the fog shader implementation (e.g. 'default')
 *   Individual fog parameters are managed by the fog shader schema
 *   (see DefaultFogShader) and stored under the `fogShader.*` namespace.
 * 
 * ### Rendering Options
 * - `renderS3` - Whether to render S3 (stereoscopic) mode
 * - `useGLSL` - Whether to use GLSL shaders
 * 
 * ## Root Appearance
 * 
 * These attributes are typically set on the root Appearance node
 * of the scene graph, as they affect the entire scene.
 * 
 * @module DefaultRootAppearance
 */

/**
 * DefaultRootAppearance - default root appearance attributes
 * 
 * This object serves as both a schema definition and default value repository.
 * Use it to:
 * 1. Query what attributes are available for root appearance
 * 2. Get default values when attributes are inherited
 * 3. Build UI for editing root appearance settings
 */
export const DefaultRootAppearance = {
  // Marker for type identification
  type: 'DefaultRootAppearance',
  extends: 'RootAppearance',
  
  // ============================================================================
  // ATTRIBUTE SCHEMA
  // List of all attributes that can be set on root appearance shaders
  // ============================================================================
  
  ATTRIBUTES: [
    'backgroundColor',
    'backgroundColors',
    'backgroundTexture2D',
    'renderS3',
    'useGLSL'
  ],
  
  // ============================================================================
  // DEFAULT VALUES
  // Used when attributes are inherited (not explicitly set)
  // ============================================================================
  
  /**
   * Default background color (light gray)
   * @type {Color}
   */
  BACKGROUND_COLOR_DEFAULT: CommonAttributes.BACKGROUND_COLOR_DEFAULT,
  
  /**
   * Default background colors array (null = no gradient)
   * @type {null}
   */
  BACKGROUND_COLORS_DEFAULT: null,
  
  /**
   * Default fog shader name
   * @type {string}
   */
  FOG_SHADER_DEFAULT: 'default',
  
  /**
   * Default render S3 (stereoscopic) flag
   * @type {boolean}
   */
  RENDER_S3_DEFAULT: false,
  
  /**
   * Default use GLSL flag
   * @type {boolean}
   */
  USE_GLSL_DEFAULT: false,
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Check if an attribute name is valid for this shader
   * @param {string} attribute - Attribute name to check
   * @returns {boolean} True if attribute is valid
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
      backgroundColor: this.BACKGROUND_COLOR_DEFAULT,
      backgroundColors: this.BACKGROUND_COLORS_DEFAULT,
      backgroundTexture2D: null,
      fogShader: this.FOG_SHADER_DEFAULT,
      renderS3: this.RENDER_S3_DEFAULT,
      useGLSL: this.USE_GLSL_DEFAULT
    };
  }
};

