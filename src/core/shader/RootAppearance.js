/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's RootAppearance interface
// Base interface for root appearance shader attributes

/**
 * Base interface for root appearance shaders.
 * Defines the contract for root-level appearance attributes that control
 * background, fog, and other scene-wide rendering settings.
 * 
 * In the JavaScript implementation, this is a simple marker object.
 * Actual attributes are defined in DefaultRootAppearance.
 * 
 * @module RootAppearance
 */

/**
 * RootAppearance base - marker for root appearance shader types
 */
export const RootAppearance = {
  // Marker property to identify this as a RootAppearance
  type: 'RootAppearance',
  
  // Default implementation class reference
  DEFAULT_ENTITY: 'DefaultRootAppearance'
};

