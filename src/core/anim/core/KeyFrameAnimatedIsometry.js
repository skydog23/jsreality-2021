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
 * @fileoverview KeyFrameAnimated implementation for FactoredMatrix (isometry transformations).
 * Simplified version without CUBIC_BSPLINE support.
 * @author Charles Gunn
 */

import { SimpleKeyFrameAnimated } from './SimpleKeyFrameAnimated.js';
import { KeyFrameAnimatedDelegate } from './KeyFrameAnimatedDelegate.js';
import { AnimationUtility, InterpolationTypes } from '../util/AnimationUtility.js';
import { FactoredMatrix } from '../../math/FactoredMatrix.js';
import * as Rn from '../../math/Rn.js';

/**
 * The basic class for interpolating isometries in euclidean and non-euclidean spaces.
 * Uses an instance of {@link FactoredMatrix} to manage the factoring and interpolation of
 * values. Specific classes that represent such isometries should subclass this one by
 * providing a delegate. See {@link KeyFrameAnimatedTransformation} for an example.
 * 
 * This simplified version supports LINEAR and CUBIC_HERMITE interpolation modes.
 * CUBIC_BSPLINE mode is not supported in this implementation.
 * 
 * @extends SimpleKeyFrameAnimated<FactoredMatrix>
 */
export class KeyFrameAnimatedIsometry extends SimpleKeyFrameAnimated {
    /**
     * Constructs a new KeyFrameAnimatedIsometry with default identity matrix.
     */
    constructor() {
        super(new FactoredMatrix());
    }

    /**
     * Constructs a new KeyFrameAnimatedIsometry with the specified FactoredMatrix.
     * @param {FactoredMatrix} t - The initial FactoredMatrix.
     */
    static withMatrix(t) {
        const instance = new KeyFrameAnimatedIsometry();
        instance.target = t;
        instance.currentValue = new FactoredMatrix(t.getMetric());
        instance.currentValue.assignFrom(t.getArray());
        return instance;
    }

    /**
     * Constructs a new KeyFrameAnimatedIsometry with a custom delegate.
     * @param {KeyFrameAnimatedDelegate<FactoredMatrix>} animatedDelegate - The delegate to use.
     */
    static withDelegate(animatedDelegate) {
        const instance = new KeyFrameAnimatedIsometry();
        instance.setDelegate(animatedDelegate);
        return instance;
    }

    /**
     * Copies a FactoredMatrix from one instance to another.
     * @param {FactoredMatrix} from - The source matrix.
     * @param {FactoredMatrix} to - The target matrix.
     * @returns {FactoredMatrix} The target matrix.
     */
    copyFromTo(from, to) {
        to.assignFrom(from.getArray());
        to.update();
        return to;
    }

    /**
     * Returns a new instance of the animated type (FactoredMatrix).
     * @returns {FactoredMatrix} A new FactoredMatrix instance.
     */
    getNewInstance() {
        if (this.target != null) return new FactoredMatrix(this.target.getMetric());
        return new FactoredMatrix();
    }

    /**
     * Sets the value of the animated object at a given time.
     * Handles interpolation between keyframes using the specified interpolation type.
     * @param {number} t - The time at which to set the value.
     */
    setValueAtTime(t) {
        if (this.keyFrames.size() === 0) return;

        super.setValueAtTime(t);
        
        if (!this.valueIsSet) {
            // Interpolate between keyframes
            if (this.interp === InterpolationTypes.CUBIC_HERMITE && this.keyFrames.size() > 1) {
                // For hermite interpolation, we first compute a hermite time parameter
                const hermiteT = AnimationUtility.hermiteInterpolation(
                    t, this.previous.getTime(), this.next.getTime(), 
                    this.previous.getTime(), this.next.getTime()
                );
                
                // Then use linear interpolation with the hermite time parameter
                this.currentValue = AnimationUtility.linearInterpolationFactoredMatrix(
                    this.currentValue, hermiteT, this.previous.getTime(), this.next.getTime(), 
                    this.previous.getValue(), this.next.getValue()
                );
            } else {
                // Default to linear interpolation
                this.currentValue = AnimationUtility.linearInterpolationFactoredMatrix(
                    this.currentValue, t, this.previous.getTime(), this.next.getTime(), 
                    this.previous.getValue(), this.next.getValue()
                );
            }
        }

        // Update target if it exists
        if (this.target != null) {
            this.target.assignFrom(this.currentValue.getArray());
            this.target.update();
        }

        // Propagate the current value through the delegate
        this.delegate.propagateCurrentValue(this.currentValue);
    }

    /**
     * Checks if two FactoredMatrix values are equal.
     * @param {FactoredMatrix} t1 - The first matrix.
     * @param {FactoredMatrix} t2 - The second matrix.
     * @returns {boolean} True if the matrices are equal, false otherwise.
     */
    equalValues(t1, t2) {
        const array1 = t1.getArray();
        const array2 = t2.getArray();
        return Rn.equals(array1, array2, 1e-8);
    }

    /**
     * Prints the current state of the animated object for debugging.
     */
    printState() {
        console.log(`KeyFrameAnimatedIsometry: ${this.keyFrames.size()} keyframes`);
        let i = 0;
        for (const kf of this.keyFrames) {
            const m = kf.getValue().getArray();
            console.log(`Time = ${kf.getTime()}\tKey frame ${i} = ${Rn.matrixToString(m)}`);
            i++;
        }
    }
}
