/**
 * Shader-related classes and constants for jReality JavaScript translation
 */

export * from './CommonAttributes.js';
export { EffectiveAppearance } from './EffectiveAppearance.js';
export { ShaderUtility } from './ShaderUtility.js';

// Base shader interfaces
export { PointShader } from './PointShader.js';
export { LineShader } from './LineShader.js';
export { PolygonShader } from './PolygonShader.js';

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