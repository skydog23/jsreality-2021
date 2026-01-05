/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview KeyFrameAnimated implementation for Color values.
 * @author Charles Gunn
 */

import { SimpleKeyFrameAnimated } from './SimpleKeyFrameAnimated.js';
import { KeyFrameAnimatedDelegate } from './KeyFrameAnimatedDelegate.js';
import { AnimationUtility, InterpolationTypes } from '../util/AnimationUtility.js';
import { Color } from '../../core/util/Color.js';

/**
 * Animate an instance of {@link Color}.
 * @extends SimpleKeyFrameAnimated<Color>
 */
export class KeyFrameAnimatedColor extends SimpleKeyFrameAnimated {
    /**
     * Constructs a new KeyFrameAnimatedColor.
     * @param {Color} [c=new Color(255, 255, 255)] - The initial color value.
     */
    constructor(c = new Color(255, 255, 255)) {
        super(c);
    }

    /**
     * Constructs a new KeyFrameAnimatedColor with a custom delegate.
     * @param {KeyFrameAnimatedDelegate<Color>} ad - The delegate to use.
     */
    static withDelegate(ad) {
        const instance = new KeyFrameAnimatedColor();
        instance.setDelegate(ad);
        return instance;
    }

    /**
     * Returns a new instance of the animated type (Color).
     * @returns {Color} A new Color instance (white).
     */
    getNewInstance() {
        return new Color(255, 255, 255);
    }

    /**
     * Sets the value of the animated object at a given time.
     * @param {number} t - The time at which to set the value.
     */
    setValueAtTime(t) {
        if (this.keyFrames.size() === 0) return;
        
        super.setValueAtTime(t);
        if (!this.valueIsSet) { // superclass handles out-of-range times
            let interpolatedRGBA;
            if (this.interp === InterpolationTypes.LINEAR) {
                interpolatedRGBA = AnimationUtility.linearInterpolationColor(
                    t, this.previous.getTime(), this.next.getTime(), 
                    this.previous.getValue(), this.next.getValue()
                );
            } else { // Default to hermite interpolation for colors
                interpolatedRGBA = AnimationUtility.hermiteInterpolationColor(
                    t, this.previous.getTime(), this.next.getTime(), 
                    this.previous.getValue(), this.next.getValue()
                );
            }
            
            // Create a new Color instance from the interpolated RGBA values
            this.currentValue = new Color(interpolatedRGBA.r, interpolatedRGBA.g, interpolatedRGBA.b, interpolatedRGBA.a);
        }
        this.delegate.propagateCurrentValue(this.currentValue);
    }

    /**
     * Copies a value from one instance to another. For immutable types like Color, it just returns the source.
     * @param {Color} from - The source color.
     * @param {Color} to - The target instance (ignored for immutable types).
     * @returns {Color} The copied color.
     */
    copyFromTo(from, to) {
        return from;
    }

    /**
     * Checks if two Color values are equal by comparing their RGBA components.
     * @param {Color} t1 - The first color.
     * @param {Color} t2 - The second color.
     * @returns {boolean} True if the colors are equal, false otherwise.
     */
    equalValues(t1, t2) {
        return t1.r === t2.r && t1.g === t2.g && t1.b === t2.b && t1.a === t2.a;
    }
}
