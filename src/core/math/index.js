/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Core mathematical utilities and classes for jsReality
// Port of de.jreality.math package

export * from './Rn.js';            // Real vector space operations
export * from './Pn.js';            // Projective space operations
export * from './P3.js';            // 3D projective space specific operations
export * from './Matrix.js';        // 4x4 matrix wrapper class
export * from './Quaternion.js';    // Quaternion class
export * from './MatrixBuilder.js'; // Fluent matrix construction
export * from './FactoredMatrix.js'; // Matrix with polar decomposition 
export * from './PlueckerLineGeometry.js';