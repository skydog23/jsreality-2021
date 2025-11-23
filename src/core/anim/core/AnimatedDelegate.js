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
 * @fileoverview AnimatedDelegate interface for managing animated objects.
 * @author Charles Gunn
 */

/**
 * For managing classes which implement Animated, this
 * returns the current value of the object being animated.
 * @interface AnimatedDelegate
 * @template T The type of the object being animated
 */
export class AnimatedDelegate {
    /**
     * Propagates the current animated value to the target object.
     * @param {T} t - The current animated value to propagate
     */
    propagateCurrentValue(t) {
        throw new Error('AnimatedDelegate.propagateCurrentValue() must be implemented by subclass');
    }
}
