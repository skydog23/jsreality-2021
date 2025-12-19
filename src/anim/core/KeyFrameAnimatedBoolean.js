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
 * @fileoverview KeyFrameAnimatedBoolean - Concrete implementation for animating Boolean values.
 * @author Charles Gunn
 */

import { SimpleKeyFrameAnimated } from './SimpleKeyFrameAnimated.js';
import { KeyFrameAnimatedDelegate } from './KeyFrameAnimatedDelegate.js';

/**
 * Fill in the required methods to animate a variable of type Boolean.
 * @extends SimpleKeyFrameAnimated<boolean>
 */
export class KeyFrameAnimatedBoolean extends SimpleKeyFrameAnimated {
    /**
     * Creates a new KeyFrameAnimatedBoolean.
     * @param {KeyFrameAnimatedDelegate<boolean>} [delegate] - Optional delegate
     */
    constructor(delegate) {
        if (delegate instanceof KeyFrameAnimatedDelegate) {
            super(delegate);
        } else {
            super();
        }
    }

    /**
     * Copy from one Boolean to another (for immutable booleans, just return the value).
     * @param {boolean} from - Source boolean
     * @param {boolean} to - Destination (ignored for immutable booleans)
     * @returns {boolean} The source boolean
     */
    copyFromTo(from, to) {
        return from;
    }

    /**
     * Creates a new instance of Boolean.
     * @returns {boolean} A new Boolean instance (true)
     */
    getNewInstance() {
        return true;
    }

    /**
     * Sets the value at the specified time.
     * For booleans, we use constant interpolation (no smooth transitions).
     * @param {number} t - The time
     */
    setValueAtTime(t) {
        if (this.getKeyFrames().size() === 0) return;
        
        super.setValueAtTime(t);
        
        if (!this.valueIsSet) {
            // For booleans, always use the previous keyframe's value (step function)
            this.currentValue = this.previous.getValue();
        }
        
        if (this.delegate) {
            this.delegate.propagateCurrentValue(this.currentValue);
        }
    }

    /**
     * Check if two Boolean values are equal.
     * @param {boolean} t1 - First boolean
     * @param {boolean} t2 - Second boolean
     * @returns {boolean} True if equal
     */
    equalValues(t1, t2) {
        return t1 === t2;
    }

    /**
     * Gets the current animated value.
     * @returns {boolean} The current value
     */
    getCurrentValue() {
        return this.currentValue;
    }

    /**
     * Sets the current value directly.
     * @param {boolean} value - The value to set
     */
    setCurrentValue(value) {
        this.currentValue = value;
    }
}
