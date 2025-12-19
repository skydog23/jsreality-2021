/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Backwards-compatibility re-export.
//
// The animation system is not part of jReality "core" (src/core). It has been
// moved to src/anim. Keep this module to avoid breaking existing imports.
export * from '../../anim/index.js';
