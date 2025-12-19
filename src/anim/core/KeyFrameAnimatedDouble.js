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
 * @fileoverview KeyFrameAnimatedDouble - Concrete implementation for animating Double values.
 * @author Charles Gunn
 */

import { SimpleKeyFrameAnimated } from './SimpleKeyFrameAnimated.js';
import { KeyFrameAnimatedDelegate } from './KeyFrameAnimatedDelegate.js';
import { AnimationUtility, InterpolationTypes } from '../util/AnimationUtility.js';

/**
 * Fill in the required methods to animate a variable of type Number.
 * @extends SimpleKeyFrameAnimated<number>
 */
export class KeyFrameAnimatedDouble extends SimpleKeyFrameAnimated {
    /**
     * Creates a new KeyFrameAnimatedDouble.
     * @param {number|KeyFrameAnimatedDelegate<number>} [doubleOrDelegate] - Initial value or delegate
     */
    constructor(doubleOrDelegate) {
        if (doubleOrDelegate instanceof KeyFrameAnimatedDelegate) {
            super(doubleOrDelegate);
        } else {
            super(doubleOrDelegate != null ? doubleOrDelegate : 1.0);
        }
    }

    /**
     * Creates a new instance of Number.
     * @returns {number} A new Number instance (0.0)
     */
    getNewInstance() {
        return 0.0;
    }

    /**
     * Sets the value at the specified time with interpolation.
     * @param {number} t - The time
     */
    setValueAtTime(t) {
        if (this.getKeyFrames().size() === 0) return;
        
        super.setValueAtTime(t);
        
        if (!this.valueIsSet) {
            // Superclass handles out-of-range times, we handle interpolation
            if (this.interp === InterpolationTypes.LINEAR) {
                this.currentValue = AnimationUtility.linearInterpolation(
                    t, 
                    this.previous.getTime(), 
                    this.next.getTime(),
                    this.previous.getValue(), 
                    this.next.getValue()
                );
            } else if (this.interp === InterpolationTypes.CUBIC_HERMITE) {
                this.currentValue = AnimationUtility.hermiteInterpolation(
                    t, 
                    this.previous.getTime(), 
                    this.next.getTime(),
                    this.previous.getValue(), 
                    this.next.getValue()
                );
            } else {
                // Default to previous value for constant interpolation
                this.currentValue = this.previous.getValue();
            }
        }
        
        if (this.delegate) {
            this.delegate.propagateCurrentValue(this.currentValue);
        }
    }

    /**
     * Copy from one Number to another (for immutable numbers, just return the value).
     * @param {number} from - Source number
     * @param {number} to - Destination (ignored for immutable numbers)
     * @returns {number} The source number
     */
    copyFromTo(from, to) {
        return from;
    }

    /**
     * Check if two Number values are equal.
     * @param {number} t1 - First number
     * @param {number} t2 - Second number
     * @returns {boolean} True if equal
     */
    equalValues(t1, t2) {
        return t1 === t2;
    }

    /**
     * Gets the current animated value.
     * @returns {number} The current value
     */
    getCurrentValue() {
        return this.currentValue;
    }

    /**
     * Sets the current value directly.
     * @param {number} value - The value to set
     */
    setCurrentValue(value) {
        this.currentValue = value;
    }
}
