/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Shader-related classes and constants for jReality JavaScript translation
 */

export * from './CommonAttributes.js';
export { EffectiveAppearance } from './EffectiveAppearance.js';
export { ShaderUtility } from './ShaderUtility.js';
export { ShaderRegistry } from './ShaderRegistry.js';

// Register default shaders (side effect import)
import './registerDefaultShaders.js';

// Base shader interfaces
export { PointShader } from './PointShader.js';
export { LineShader } from './LineShader.js';
export { PolygonShader } from './PolygonShader.js';
export { RenderingHintsShader } from './RenderingHintsShader.js';

// Default shader implementations
export { 
  DefaultGeometryShader,
  PointShaderInstance,
  LineShaderInstance,
  PolygonShaderInstance
} from './DefaultGeometryShader.js';
export { DefaultPointShader } from './DefaultPointShader.js';
export { DefaultLineShader } from './DefaultLineShader.js';
export { DefaultPolygonShader } from './DefaultPolygonShader.js';
export { DefaultRenderingHintsShader } from './DefaultRenderingHintsShader.js';
export { ImplodePolygonShader } from './ImplodePolygonShader.js';