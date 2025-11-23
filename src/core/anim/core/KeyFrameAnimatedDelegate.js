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
 * @fileoverview KeyFrameAnimatedDelegate interface extending AnimatedDelegate.
 * @author Charles Gunn
 */

import { AnimatedDelegate } from './AnimatedDelegate.js';

/**
 * The method needed to get the current value in order to
 * set it into a key frame.
 * @interface KeyFrameAnimatedDelegate
 * @template T The type of the object being animated
 * @extends AnimatedDelegate
 */
export class KeyFrameAnimatedDelegate extends AnimatedDelegate {
    /**
     * Gathers the current value from the target object.
     * @param {T} t - The object to gather the current value into
     * @returns {T} The gathered current value
     */
    gatherCurrentValue(t) {
        throw new Error('KeyFrameAnimatedDelegate.gatherCurrentValue() must be implemented by subclass');
    }
}
