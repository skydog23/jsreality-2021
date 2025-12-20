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
 * @fileoverview AnimatedDoubleArraySet - Animates arrays of double values.
 * @author Charles Gunn
 */

import { InterpolationTypes, BoundaryModes, AnimationUtility } from '../util/AnimationUtility.js';

/**
 * Animates an array of double values with a single set of keyframes.
 * All elements in the array are animated synchronously with the same timing.
 */
export class AnimatedDoubleArraySet {
    /**
     * Creates a new AnimatedDoubleArraySet.
     * @param {number[]} dkeySet - Delta key times
     * @param {number[][]} valueSet - Values at each keyframe [keyframe][element]
     * @param {InterpolationTypes} [interpType] - Interpolation type (default: LINEAR)
     */
    constructor(dkeySet, valueSet, interpType = InterpolationTypes.LINEAR) {
        /** @type {number[]} Delta key times */
        this.dkeySet = dkeySet;
        
        /** @type {number[]} Absolute key times (computed from deltas) */
        this.keySet = null;
        
        /** @type {number[][]} Values at each keyframe */
        this.valueSet = valueSet;
        
        /** @type {InterpolationTypes} Interpolation type */
        this.interpType = interpType;

        this.initializeKeys();
    }

    /**
     * Initializes the absolute key times from delta times.
     */
    initializeKeys() {
        this.keySet = new Array(this.dkeySet.length);
        this.keySet[0] = this.dkeySet[0];
        for (let i = 1; i < this.dkeySet.length; ++i) {
            this.keySet[i] = this.keySet[i - 1] + this.dkeySet[i];
        }
    }

    /**
     * Gets the minimum time.
     * @returns {number} The minimum time
     */
    getTMin() {
        return this.keySet[0];
    }

    /**
     * Gets the maximum time.
     * @returns {number} The maximum time
     */
    getTMax() {
        return this.keySet[this.keySet.length - 1];
    }

    /**
     * Gets the number of elements in each value array.
     * @returns {number} The number of elements
     */
    getElementCount() {
        return this.valueSet.length > 0 ? this.valueSet[0].length : 0;
    }

    /**
     * Gets the number of keyframes.
     * @returns {number} The number of keyframes
     */
    getKeyFrameCount() {
        return this.keySet.length;
    }

    /**
     * Gets the interpolated values at the specified time.
     * @param {number} t - The time
     * @param {number[]} [vals] - Optional destination array
     * @returns {number[]} The interpolated values
     */
    getValuesAtTime(t, vals = null) {
        const elementCount = this.getElementCount();
        if (!vals || vals.length !== elementCount) {
            vals = new Array(elementCount);
        }

        // Find the keyframe segment
        let key = -1;
        const n = this.keySet.length;
        
        // Boundary handling: this class currently clamps to [tmin, tmax].
        // (If we later add BoundaryModes.REPEAT, we can re-introduce wrap-around here.)
        const tmin = this.getTMin();
        const tmax = this.getTMax();
        if (t <= tmin) {
            const firstValues = this.valueSet[0];
            for (let j = 0; j < elementCount; ++j) {
                vals[j] = firstValues[j];
            }
            return vals;
        }
        if (t >= tmax) {
            const lastValues = this.valueSet[n - 1];
            for (let j = 0; j < elementCount; ++j) {
                vals[j] = lastValues[j];
            }
            return vals;
        }
        
        for (let i = 1; i < n; ++i) {
            if (t < this.keySet[i]) {
                key = i - 1;
                break;
            }
        }

        // At this point, we know t is strictly inside (tmin, tmax), so key must be found.

        // Interpolate between keyframes
        const t1 = this.keySet[key];
        const t2 = this.keySet[key + 1];
        const values1 = this.valueSet[key];
        const values2 = this.valueSet[key + 1];

        switch (this.interpType) {
            case InterpolationTypes.CONSTANT:
            default:
                for (let j = 0; j < elementCount; ++j) {
                    vals[j] = values1[j];
                }
                break;

            case InterpolationTypes.LINEAR:
                for (let j = 0; j < elementCount; ++j) {
                    vals[j] = AnimationUtility.linearInterpolation(t, t1, t2, values1[j], values2[j]);
                }
                break;

            case InterpolationTypes.CUBIC_HERMITE:
                for (let j = 0; j < elementCount; ++j) {
                    vals[j] = AnimationUtility.hermiteInterpolation(t, t1, t2, values1[j], values2[j]);
                }
                break;
        }

        return vals;
    }

    /**
     * Sets the interpolation type.
     * @param {InterpolationTypes} type - The interpolation type
     */
    setInterpolationType(type) {
        this.interpType = type;
    }

    /**
     * Gets the interpolation type.
     * @returns {InterpolationTypes} The interpolation type
     */
    getInterpolationType() {
        return this.interpType;
    }

    /**
     * Gets the values at a specific keyframe.
     * @param {number} keyIndex - The keyframe index
     * @returns {number[]} The values at the keyframe
     */
    getValuesAtKeyFrame(keyIndex) {
        return this.valueSet[keyIndex];
    }

    /**
     * Gets the time at a specific keyframe.
     * @param {number} keyIndex - The keyframe index
     * @returns {number} The time at the keyframe
     */
    getTimeAtKeyFrame(keyIndex) {
        return this.keySet[keyIndex];
    }

    /**
     * Creates a string representation of this animated array set.
     * @returns {string} String representation
     */
    toString() {
        return `AnimatedDoubleArraySet(${this.getElementCount()} elements, ${this.getKeyFrameCount()} keyframes, ${this.interpType})`;
    }
}
