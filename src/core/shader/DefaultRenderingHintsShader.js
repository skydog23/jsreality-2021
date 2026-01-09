/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's DefaultRenderingHintsShader interface
// Default rendering hints shader attributes and default values

import { EUCLIDEAN } from '../math/Pn.js';
import * as CommonAttributes from './CommonAttributes.js';

/**
 * The default rendering hints shader for jReality.
 * 
 * This shader controls various rendering pipeline settings that affect
 * how geometry is rendered, including lighting, transparency, depth buffering,
 * and other rendering optimizations.
 * 
 * ## Attribute Schema
 * 
 * The following attributes can be set on an Appearance:
 * 
 * ### Metric
 * - `metric` - The metric space (EUCLIDEAN, HYPERBOLIC, ELLIPTIC, PROJECTIVE)
 * 
 * ### Lighting
 * - `lightingEnabled` - Whether to apply lighting calculations
 * - `localLightModel` - Whether to use local lighting model
 * - `separateSpecularColor` - Whether to use separate specular color
 * 
 * ### Transparency and Blending
 * - `transparencyEnabled` - Whether transparency is enabled
 * - `additiveBlendingEnabled` - Whether to use additive blending
 * - `ignoreAlpha0` - Whether to ignore alpha=0 (pseudo-transparency)
 * 
 * ### Depth Buffering
 * - `zBufferEnabled` - Whether depth buffering is enabled
 * - `depthFudgeFactor` - Factor for depth buffer adjustments
 * 
 * ### Face Culling
 * - `backFaceCulling` - Whether to cull back faces
 * - `flipNormals` - Whether to flip face normals
 * 
 * ### Display Lists
 * - `anyDisplayLists` - Whether to use display lists at all
 * 
 * ### Other Hints
 * - `opaqueTubesAndSpheres` - Whether tubes and spheres are opaque
 * - `levelOfDetail` - Level of detail factor (0.0 = full detail)
 * 
 * @module DefaultRenderingHintsShader
 */

/**
 * DefaultRenderingHintsShader - default rendering hints attributes
 * 
 * This object serves as both a schema definition and default value repository.
 * Use it to:
 * 1. Query what attributes are available for rendering hints
 * 2. Get default values when attributes are inherited
 * 3. Build UI for editing rendering hints
 */
export const DefaultRenderingHintsShader = {
  // Marker for type identification
  type: 'DefaultRenderingHintsShader',
  extends: 'RenderingHintsShader',
  
  // ============================================================================
  // ATTRIBUTE SCHEMA
  // List of all attributes that can be set on rendering hints shaders
  // ============================================================================
  
  ATTRIBUTES: [
    'metric',
    'lightingEnabled',
    'transparencyEnabled',
    'additiveBlendingEnabled',
    'zBufferEnabled',
    'ignoreAlpha0',
    'localLightModel',
    'separateSpecularColor',
    'anyDisplayLists',
    'backFaceCulling',
    'flipNormals',
    'opaqueTubesAndSpheres',
    'levelOfDetail',
    'depthFudgeFactor'
  ],
  
  // ============================================================================
  // DEFAULT VALUES
  // Used when attributes are inherited (not explicitly set)
  // ============================================================================
  
  /**
   * Default metric (EUCLIDEAN = 0)
   * @type {integer}
   */
  METRIC_DEFAULT: EUCLIDEAN,
  
  /**
   * Default lighting enabled flag
   * @type {boolean}
   */
  LIGHTING_ENABLED_DEFAULT: true,
  
  /**
   * Default transparency enabled flag
   * @type {boolean}
   */
  TRANSPARENCY_ENABLED_DEFAULT: false,
  
  /**
   * Default additive blending enabled flag
   * @type {boolean}
   */
  ADDITIVE_BLENDING_ENABLED_DEFAULT: false,
  
  /**
   * Default z-buffer enabled flag
   * @type {boolean}
   */
  Z_BUFFER_ENABLED_DEFAULT: false,
  
  /**
   * Default ignore alpha 0 flag (pseudo-transparency)
   * @type {boolean}
   */
  IGNORE_ALPHA0_DEFAULT: true,
  
  /**
   * Default local light model flag
   * @type {boolean}
   */
  LOCAL_LIGHT_MODEL_DEFAULT: true,
  
  /**
   * Default separate specular color flag
   * @type {boolean}
   */
  SEPARATE_SPECULAR_COLOR_DEFAULT: false,
  
  /**
   * Default any display lists flag
   * @type {boolean}
   */
  ANY_DISPLAY_LISTS_DEFAULT: true,
  
  /**
   * Default back face culling flag
   * @type {boolean}
   */
  BACK_FACE_CULLING_DEFAULT: false,
  
  /**
   * Default flip normals flag
   * @type {boolean}
   */
  FLIP_NORMALS_DEFAULT: false,
  
  /**
   * Default opaque tubes and spheres flag
   * @type {boolean}
   */
  OPAQUE_TUBES_AND_SPHERES_DEFAULT: true,
  
  /**
   * Default level of detail (0.0 = full detail)
   * @type {number}
   */
  LEVEL_OF_DETAIL_DEFAULT: 0.0,
  
  /**
   * Default depth fudge factor
   * @type {number}
   */
  DEPTH_FUDGE_FACTOR_DEFAULT: 1.0,
  
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
      metric: this.METRIC_DEFAULT,
      lightingEnabled: this.LIGHTING_ENABLED_DEFAULT,
      transparencyEnabled: this.TRANSPARENCY_ENABLED_DEFAULT,
      additiveBlendingEnabled: this.ADDITIVE_BLENDING_ENABLED_DEFAULT,
      zBufferEnabled: this.Z_BUFFER_ENABLED_DEFAULT,
      ignoreAlpha0: this.IGNORE_ALPHA0_DEFAULT,
      localLightModel: this.LOCAL_LIGHT_MODEL_DEFAULT,
      separateSpecularColor: this.SEPARATE_SPECULAR_COLOR_DEFAULT,
      anyDisplayLists: this.ANY_DISPLAY_LISTS_DEFAULT,
      backFaceCulling: this.BACK_FACE_CULLING_DEFAULT,
      flipNormals: this.FLIP_NORMALS_DEFAULT,
      opaqueTubesAndSpheres: this.OPAQUE_TUBES_AND_SPHERES_DEFAULT,
      levelOfDetail: this.LEVEL_OF_DETAIL_DEFAULT,
      depthFudgeFactor: this.DEPTH_FUDGE_FACTOR_DEFAULT
    };
  }
};

