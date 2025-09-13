/**
 * @fileoverview Animated interface combining Named and Settable with animation lifecycle methods.
 * @author Charles Gunn
 */

import { Named } from './Named.js';
import { Settable } from './Settable.js';

/**
 * The minimal interface needed to animate: respond to playback commands and manage lifecycle.
 * Combines Named and Settable interfaces with animation-specific methods.
 * @interface Animated
 * @extends Named
 * @extends Settable
 */
export class Animated extends Named {
    /**
     * Sets the value of this object at the specified time.
     * Inherited from Settable interface.
     * @param {number} t - The time at which to set the value
     */
    setValueAtTime(t) {
        throw new Error('Animated.setValueAtTime() must be implemented by subclass');
    }

    /**
     * Called when animation playback starts.
     * Use this method to initialize any resources or state needed for animation.
     */
    startAnimation() {
        throw new Error('Animated.startAnimation() must be implemented by subclass');
    }

    /**
     * Called when animation playback ends.
     * Use this method to clean up resources or finalize animation state.
     */
    endAnimation() {
        throw new Error('Animated.endAnimation() must be implemented by subclass');
    }

    /**
     * Prints the current state of this animated object to the console.
     * Useful for debugging animation behavior.
     */
    printState() {
        throw new Error('Animated.printState() must be implemented by subclass');
    }
}
