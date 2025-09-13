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
