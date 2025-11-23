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
 * @fileoverview AnimatedDoubleArrayArraySet - Animates 2D arrays (arrays of arrays) of double values.
 * @author Charles Gunn
 */

import { InterpolationTypes, AnimationUtility } from '../util/AnimationUtility.js';

/**
 * Animates 2D arrays (arrays of arrays) of double values with synchronized timing.
 * Useful for animating matrices, transformation sequences, or other 2D data structures.
 */
export class AnimatedDoubleArrayArraySet {
    /**
     * Creates a new AnimatedDoubleArrayArraySet.
     * @param {number[]} dkeySet - Delta key times
     * @param {number[][][]} valueSet - 3D array of values [keyframe][row][column]
     * @param {InterpolationTypes} [interpType] - Interpolation type (default: LINEAR)
     */
    constructor(dkeySet, valueSet, interpType = InterpolationTypes.LINEAR) {
        /** @type {number[]} Delta key times */
        this.dkeySet = dkeySet;
        
        /** @type {number[]} Absolute key times (computed from deltas) */
        this.keySet = null;
        
        /** @type {number[][][]} 3D array of values */
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
        
        if (typeof console !== 'undefined' && console.log) {
            console.log('AnimatedDoubleArrayArraySet keys =', this.keySet);
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
     * Gets the key times array.
     * @returns {number[]} The key times
     */
    getKeySet() {
        return this.keySet;
    }

    /**
     * Gets the value set (3D array).
     * @returns {number[][][]} The value set
     */
    getValueSet() {
        return this.valueSet;
    }

    /**
     * Gets the number of keyframes.
     * @returns {number} The number of keyframes
     */
    getKeyFrameCount() {
        return this.keySet.length;
    }

    /**
     * Gets the dimensions of the 2D arrays being animated.
     * @returns {{rows: number, cols: number}} The dimensions
     */
    getDimensions() {
        if (this.valueSet.length === 0 || this.valueSet[0].length === 0) {
            return { rows: 0, cols: 0 };
        }
        return {
            rows: this.valueSet[0].length,
            cols: this.valueSet[0][0].length
        };
    }

    /**
     * Gets the interpolated 2D array at the specified time.
     * @param {number} t - The time
     * @param {number[][]} [vals] - Optional destination 2D array
     * @returns {number[][]} The interpolated 2D array
     */
    getValuesAtTime(t, vals = null) {
        const n = this.keySet.length;
        let key = -1;
        
        // Find the pair of keys (key, key+1) such that t is contained 
        // in the half-open interval [key, key+1)
        let i = 0;
        while (i < n && t >= this.keySet[i]) i++;
        
        if (i === 0) {
            // Before first keyframe
            return this.copyArray2D(this.valueSet[0], vals);
        } else if (i >= n) {
            // At or after last keyframe
            return this.copyArray2D(this.valueSet[n - 1], vals);
        } else {
            key = i - 1;
        }

        if (typeof console !== 'undefined' && console.log) {
            console.log(`AnimatedDoubleArrayArraySet: Time = ${t}, key = ${key}`);
        }

        const t1 = this.keySet[key];
        const t2 = this.keySet[key + 1];
        const values1 = this.valueSet[key];
        const values2 = this.valueSet[key + 1];

        switch (this.interpType) {
            case InterpolationTypes.CONSTANT:
            default:
                return this.copyArray2D(values1, vals);

            case InterpolationTypes.LINEAR:
                return this.linearInterpolate2D(t, t1, t2, values1, values2, vals);

            case InterpolationTypes.CUBIC_HERMITE:
                return this.hermiteInterpolate2D(t, t1, t2, values1, values2, vals);
        }
    }

    /**
     * Performs linear interpolation between two 2D arrays.
     * @param {number} t - The interpolation time
     * @param {number} t1 - Start time
     * @param {number} t2 - End time
     * @param {number[][]} values1 - Start values
     * @param {number[][]} values2 - End values
     * @param {number[][]} [result] - Optional destination array
     * @returns {number[][]} The interpolated 2D array
     * @private
     */
    linearInterpolate2D(t, t1, t2, values1, values2, result = null) {
        const rows = values1.length;
        const cols = values1[0].length;
        
        if (!result) {
            result = new Array(rows);
            for (let i = 0; i < rows; i++) {
                result[i] = new Array(cols);
            }
        }

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                result[i][j] = AnimationUtility.linearInterpolation(
                    t, t1, t2, values1[i][j], values2[i][j]
                );
            }
        }

        return result;
    }

    /**
     * Performs Hermite interpolation between two 2D arrays.
     * @param {number} t - The interpolation time
     * @param {number} t1 - Start time
     * @param {number} t2 - End time
     * @param {number[][]} values1 - Start values
     * @param {number[][]} values2 - End values
     * @param {number[][]} [result] - Optional destination array
     * @returns {number[][]} The interpolated 2D array
     * @private
     */
    hermiteInterpolate2D(t, t1, t2, values1, values2, result = null) {
        const rows = values1.length;
        const cols = values1[0].length;
        
        if (!result) {
            result = new Array(rows);
            for (let i = 0; i < rows; i++) {
                result[i] = new Array(cols);
            }
        }

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                result[i][j] = AnimationUtility.hermiteInterpolation(
                    t, t1, t2, values1[i][j], values2[i][j]
                );
            }
        }

        return result;
    }

    /**
     * Copies a 2D array.
     * @param {number[][]} source - Source array
     * @param {number[][]} [dest] - Optional destination array
     * @returns {number[][]} The copied array
     * @private
     */
    copyArray2D(source, dest = null) {
        const rows = source.length;
        const cols = source[0].length;
        
        if (!dest) {
            dest = new Array(rows);
            for (let i = 0; i < rows; i++) {
                dest[i] = new Array(cols);
            }
        }

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                dest[i][j] = source[i][j];
            }
        }

        return dest;
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
     * Creates a string representation of this animated 2D array set.
     * @returns {string} String representation
     */
    toString() {
        const dims = this.getDimensions();
        return `AnimatedDoubleArrayArraySet(${dims.rows}x${dims.cols}, ${this.getKeyFrameCount()} keyframes, ${this.interpType})`;
    }
}
