/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview Scenegraph-specific animation adapters.
 *
 * These classes depend on the jReality scene graph port in `src/core/scene/*`.
 * Keep them separate from the animation core so `src/anim/core` remains
 * reusable for non-scenegraph animation.
 */

export { KeyFrameAnimatedTransformation } from './KeyFrameAnimatedTransformation.js';
