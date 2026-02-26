/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Register default shaders in the ShaderRegistry
// This should be called once at module initialization

import { ShaderRegistry } from './ShaderRegistry.js';
import { DefaultPointShader } from './DefaultPointShader.js';
import { DefaultLineShader } from './DefaultLineShader.js';
import { DefaultPolygonShader } from './DefaultPolygonShader.js';
import { ImplodePolygonShader } from './ImplodePolygonShader.js';
import { DefaultFogShader } from './DefaultFogShader.js';

/**
 * Register all default shaders in the ShaderRegistry.
 * This should be called once when the shader system is initialized.
 */
export function registerDefaultShaders() {
  ShaderRegistry.registerPointShader('default', DefaultPointShader);
  ShaderRegistry.registerLineShader('default', DefaultLineShader);
  ShaderRegistry.registerPolygonShader('default', DefaultPolygonShader);
  ShaderRegistry.registerPolygonShader('implode', ImplodePolygonShader);
  ShaderRegistry.registerFogShader('default', DefaultFogShader);
}

// Auto-register on module load
registerDefaultShaders();

