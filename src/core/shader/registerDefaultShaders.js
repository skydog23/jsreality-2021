/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Register default shaders in the ShaderRegistry
// This should be called once at module initialization

import { ShaderRegistry } from './ShaderRegistry.js';
import { DefaultPointShader } from './DefaultPointShader.js';
import { DefaultLineShader } from './DefaultLineShader.js';
import { DefaultPolygonShader } from './DefaultPolygonShader.js';
import { ImplodePolygonShader } from './ImplodePolygonShader.js';

/**
 * Register all default shaders in the ShaderRegistry.
 * This should be called once when the shader system is initialized.
 */
export function registerDefaultShaders() {
  // Register default shaders
  ShaderRegistry.registerPointShader('default', DefaultPointShader);
  ShaderRegistry.registerLineShader('default', DefaultLineShader);
  ShaderRegistry.registerPolygonShader('default', DefaultPolygonShader);
  
  // Register non-default polygon shaders
  ShaderRegistry.registerPolygonShader('implode', ImplodePolygonShader);
  
  // Future: register other shaders here
  // ShaderRegistry.registerPolygonShader('twoSide', TwoSidePolygonShader);
}

// Auto-register on module load
registerDefaultShaders();

