// JavaScript port of jReality's RenderingHintsShader interface
// Base interface for rendering hints shader attributes

/**
 * Base interface for rendering hints shaders.
 * Defines the contract for rendering hint attributes that control
 * various aspects of the rendering pipeline.
 * 
 * In the JavaScript implementation, this is a simple marker object.
 * Actual attributes are defined in DefaultRenderingHintsShader.
 * 
 * @module RenderingHintsShader
 */

/**
 * RenderingHintsShader base - marker for rendering hints shader types
 */
export const RenderingHintsShader = {
  // Marker property to identify this as a RenderingHintsShader
  type: 'RenderingHintsShader',
  
  // Default implementation class reference
  DEFAULT_ENTITY: 'DefaultRenderingHintsShader'
};

