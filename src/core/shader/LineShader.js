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

