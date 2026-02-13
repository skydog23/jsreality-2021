/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
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
export * from './SylvesterDecomposition.js';