// JavaScript port of jReality's PolygonShader interface
// Base interface for polygon shader attributes

/**
 * Base interface for polygon shaders.
 * Defines the contract for polygon/face rendering attributes.
 * 
 * In the JavaScript implementation, this is a simple marker object.
 * Actual attributes are defined in DefaultPolygonShader.
 * 
 * @module PolygonShader
 */

/**
 * PolygonShader base - marker for polygon shader types
 */
export const PolygonShader = {
  // Marker property to identify this as a PolygonShader
  type: 'PolygonShader',
  
  // Default implementation class reference
  DEFAULT_ENTITY: 'DefaultPolygonShader'
};

