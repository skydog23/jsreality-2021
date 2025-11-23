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
 * @fileoverview AnimatedDoubleSet - Animates a set of independent double values.
 * @author Charles Gunn
 */

import { AbstractAnimatedSet } from './AbstractAnimatedSet.js';
import { InterpolationTypes, BoundaryModes, AnimationUtility } from '../util/AnimationUtility.js';

/**
 * Animates a set of double values, each with independent keyframes and timing.
 * Extends AbstractAnimatedSet to provide specific functionality for double values.
 */
export class AnimatedDoubleSet extends AbstractAnimatedSet {
    /**
     * Creates a new AnimatedDoubleSet.
     * @param {number[][]} dkeySet - Delta key times for each element
     * @param {number[][]} valueSet - Values at each keyframe [element][keyframe]
     * @param {InterpolationTypes[]} [interpType] - Interpolation types for each element
     */
    constructor(dkeySet, valueSet, interpType) {
        super(dkeySet, interpType);
        
        /** @type {number[][]} Values at each keyframe */
        this.valueSet = valueSet;
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

        // Interpolate each element independently
        for (let j = 0; j < elementCount; ++j) {
            const segmentIndex = this.getSegmentAtTime(j, t);
            const keys = this.keySet[j];
            const values = this.valueSet[j];
            const n = keys.length;

            if (segmentIndex === -1 || segmentIndex >= n - 1) {
                // Use boundary value
                vals[j] = values[segmentIndex === -1 ? 0 : n - 1];
                continue;
            }

            // Interpolate between keyframes
            const t1 = keys[segmentIndex];
            const t2 = keys[segmentIndex + 1];
            const v1 = values[segmentIndex];
            const v2 = values[segmentIndex + 1];

            switch (this.interpType[j]) {
                case InterpolationTypes.CONSTANT:
                default:
                    vals[j] = v1;
                    break;

                case InterpolationTypes.LINEAR:
                    vals[j] = AnimationUtility.linearInterpolation(t, t1, t2, v1, v2);
                    break;

                case InterpolationTypes.CUBIC_HERMITE:
                    vals[j] = AnimationUtility.hermiteInterpolation(t, t1, t2, v1, v2);
                    break;
            }
        }

        return vals;
    }

    /**
     * Gets the values for a specific element at a specific keyframe.
     * @param {number} elementIndex - The element index
     * @param {number} keyIndex - The keyframe index
     * @returns {number} The value
     */
    getValueAt(elementIndex, keyIndex) {
        return this.valueSet[elementIndex][keyIndex];
    }

    /**
     * Sets the values for a specific element at a specific keyframe.
     * @param {number} elementIndex - The element index
     * @param {number} keyIndex - The keyframe index
     * @param {number} value - The value to set
     */
    setValueAt(elementIndex, keyIndex, value) {
        this.valueSet[elementIndex][keyIndex] = value;
    }

    /**
     * Gets all values for a specific element.
     * @param {number} elementIndex - The element index
     * @returns {number[]} Array of values for the element
     */
    getElementValues(elementIndex) {
        return this.valueSet[elementIndex];
    }

    /**
     * Sets all values for a specific element.
     * @param {number} elementIndex - The element index
     * @param {number[]} values - Array of values for the element
     */
    setElementValues(elementIndex, values) {
        this.valueSet[elementIndex] = values;
    }

    /**
     * Creates a string representation of this animated double set.
     * @returns {string} String representation
     */
    toString() {
        return `AnimatedDoubleSet(${this.getElementCount()} elements, tmin=${this.getTMin()}, tmax=${this.getTMax()})`;
    }
}
