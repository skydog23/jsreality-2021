/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * @fileoverview Scenegraph-specific animation adapters.
 *
 * These classes depend on the jReality scene graph port in `src/core/scene/*`.
 * Keep them separate from the animation core so `src/anim/core` remains
 * reusable for non-scenegraph animation.
 */

export { KeyFrameAnimatedTransformation } from './KeyFrameAnimatedTransformation.js';
