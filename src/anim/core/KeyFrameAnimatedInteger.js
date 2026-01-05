/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview KeyFrameAnimated implementation for Integer values.
 * @author Charles Gunn
 */

import { SimpleKeyFrameAnimated } from './SimpleKeyFrameAnimated.js';
import { KeyFrameAnimatedDelegate } from './KeyFrameAnimatedDelegate.js';
import { AnimationUtility, InterpolationTypes } from '../util/AnimationUtility.js';

/**
 * Fills in the required methods to animate a variable of type {@link Number} (integer).
 * Integer interpolation is performed using floating-point calculations and then
 * rounded to the nearest integer.
 * @extends SimpleKeyFrameAnimated<Number>
 */
export class KeyFrameAnimatedInteger extends SimpleKeyFrameAnimated {
    /**
     * Constructs a new KeyFrameAnimatedInteger.
     * @param {Number} [d=0] - The initial integer value.
     */
    constructor(d = 0) {
        super(Math.trunc(d));
    }

    /**
     * Constructs a new KeyFrameAnimatedInteger with a custom delegate.
     * @param {KeyFrameAnimatedDelegate<Number>} ad - The delegate to use.
     */
    static withDelegate(ad) {
        const instance = new KeyFrameAnimatedInteger();
        instance.setDelegate(ad);
        return instance;
    }

    /**
     * Returns a new instance of the animated type (Integer).
     * @returns {Number} A new Integer instance (0).
     */
    getNewInstance() {
        return 0;
    }

    /**
     * Sets the value of the animated object at a given time.
     * @param {number} t - The time at which to set the value.
     */
    setValueAtTime(t) {
        if (this.keyFrames.size() === 0) return;
        
        super.setValueAtTime(t);
        if (!this.valueIsSet) { // superclass handles out-of-range times
            switch (this.interp) {
                case InterpolationTypes.CONSTANT:
                    this.currentValue = Math.trunc(this.previous.getValue());
                    break;
                case InterpolationTypes.LINEAR:
                    this.currentValue = Math.trunc(AnimationUtility.linearInterpolation(
                        t, this.previous.getTime(), this.next.getTime(), 
                        this.previous.getValue(), this.next.getValue()
                    ));
                    break;
                case InterpolationTypes.CUBIC_HERMITE:
                default:
                    this.currentValue = Math.trunc(AnimationUtility.hermiteInterpolation(
                        t, this.previous.getTime(), this.next.getTime(), 
                        this.previous.getValue(), this.next.getValue()
                    ));
                    break;
            }
        }
        this.delegate.propagateCurrentValue(this.currentValue);
    }

    /**
     * Copies a value from one instance to another. For immutable types like Integer, it just returns the source.
     * @param {Number} from - The source value.
     * @param {Number} to - The target instance (ignored for immutable types).
     * @returns {Number} The copied value (truncated to integer).
     */
    copyFromTo(from, to) {
        return Math.trunc(from); // Use trunc instead of floor for integer conversion
    }

    /**
     * Checks if two Integer values are equal.
     * @param {Number} t1 - The first value.
     * @param {Number} t2 - The second value.
     * @returns {boolean} True if the values are equal, false otherwise.
     */
    equalValues(t1, t2) {
        return Math.trunc(t1) === Math.trunc(t2);
    }
}
