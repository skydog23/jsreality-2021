// JavaScript port of jReality's PointShader interface
// Base interface for point shader attributes

/**
 * Base interface for point shaders.
 * Defines the contract for point rendering attributes.
 * 
 * In the JavaScript implementation, this is a simple marker object.
 * Actual attributes are defined in DefaultPointShader.
 * 
 * @module PointShader
 */

/**
 * PointShader base - marker for point shader types
 */
export const PointShader = {
  // Marker property to identify this as a PointShader
  type: 'PointShader',
  
  // Default implementation class reference
  DEFAULT_ENTITY: 'DefaultPointShader'
};

