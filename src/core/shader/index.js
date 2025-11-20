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