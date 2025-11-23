/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's LineShader interface
// Base interface for line shader attributes

/**
 * Base interface for line shaders.
 * Defines the contract for line/edge rendering attributes.
 * 
 * In the JavaScript implementation, this is a simple marker object.
 * Actual attributes are defined in DefaultLineShader.
 * 
 * @module LineShader
 */

/**
 * LineShader base - marker for line shader types
 */
export const LineShader = {
  // Marker property to identify this as a LineShader
  type: 'LineShader',
  
  // Default implementation class reference
  DEFAULT_ENTITY: 'DefaultLineShader'
};

