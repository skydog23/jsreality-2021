/**
 * @fileoverview AbstractAnimatedSet - Base class for animating arrays of values.
 * @author Charles Gunn
 */

import { InterpolationTypes, BoundaryModes } from '../util/AnimationUtility.js';

/**
 * Abstract base class for animating sets of values with independent timing and interpolation.
 * Each element in the set can have its own keyframes and interpolation type.
 */
export class AbstractAnimatedSet {
    /**
     * Creates a new AbstractAnimatedSet.
     * @param {number[][]} dkeySet - Delta key times for each animated element
     * @param {InterpolationTypes[]|number[]} [interpType] - Interpolation types (or legacy integer types)
     */
    constructor(dkeySet, interpType) {
        /** @type {number[][]} Delta key times */
        this.dkeySet = dkeySet;
        
        /** @type {number[][]} Absolute key times (computed from deltas) */
        this.keySet = null;
        
        /** @type {InterpolationTypes[]} Interpolation type for each element */
        this.interpType = null;
        
        /** @type {BoundaryModes[]} Boundary/wrap mode for each element */
        this.wrapType = null;

        // Handle legacy integer interpolation types
        if (interpType && typeof interpType[0] === 'number') {
            this.interpType = AbstractAnimatedSet.convertOldToNew(interpType);
        } else if (interpType) {
            this.interpType = interpType;
        } else {
            // Default to CUBIC_HERMITE for all elements
            this.interpType = new Array(dkeySet.length);
            for (let i = 0; i < this.interpType.length; ++i) {
                this.interpType[i] = InterpolationTypes.CUBIC_HERMITE;
            }
        }

        // Initialize wrap types to CLAMP
        this.wrapType = new Array(dkeySet.length);
        for (let i = 0; i < this.wrapType.length; ++i) {
            this.wrapType[i] = BoundaryModes.CLAMP;
        }

        this.initializeKeys();
    }

    /**
     * Converts legacy integer interpolation types to new enum values.
     * @param {number[]} interpType - Legacy integer interpolation types
     * @returns {InterpolationTypes[]} New enum interpolation types
     * @static
     */
    static convertOldToNew(interpType) {
        const newtype = new Array(interpType.length);
        for (let i = 0; i < interpType.length; ++i) {
            switch (interpType[i]) {
                case 0:
                default:
                    newtype[i] = InterpolationTypes.CONSTANT;
                    break;
                case 1:
                    newtype[i] = InterpolationTypes.LINEAR;
                    break;
                case 2:
                    newtype[i] = InterpolationTypes.CUBIC_HERMITE;
                    break;
            }
        }
        return newtype;
    }

    /**
     * Initializes the absolute key times from delta times.
     * @protected
     */
    initializeKeys() {
        this.keySet = new Array(this.dkeySet.length);
        for (let j = 0; j < this.dkeySet.length; ++j) {
            this.keySet[j] = new Array(this.dkeySet[j].length);
            this.keySet[j][0] = this.dkeySet[j][0];
            for (let i = 1; i < this.dkeySet[j].length; ++i) {
                this.keySet[j][i] = this.keySet[j][i - 1] + this.dkeySet[j][i];
            }
        }
    }

    /**
     * Gets the minimum time across all animated elements.
     * @returns {number} The minimum time
     */
    getTMin() {
        return this.keySet[0][0];
    }

    /**
     * Gets the maximum time across all animated elements.
     * @returns {number} The maximum time
     */
    getTMax() {
        return this.keySet[0][this.keySet[0].length - 1];
    }

    /**
     * Sets the wrap/boundary type for all elements.
     * @param {BoundaryModes[]|BoundaryModes} wrap - Wrap types array or single type for all
     */
    setWrapType(wrap) {
        if (Array.isArray(wrap)) {
            this.wrapType = wrap;
        } else {
            // Single wrap type for all elements
            for (let i = 0; i < this.wrapType.length; ++i) {
                this.wrapType[i] = wrap;
            }
        }
    }

    /**
     * Gets the wrap/boundary type for a specific element.
     * @param {number} index - Element index
     * @returns {BoundaryModes} The wrap type
     */
    getWrapType(index) {
        return this.wrapType[index];
    }

    /**
     * Gets the interpolation type for a specific element.
     * @param {number} index - Element index
     * @returns {InterpolationTypes} The interpolation type
     */
    getInterpolationType(index) {
        return this.interpType[index];
    }

    /**
     * Sets the interpolation type for a specific element.
     * @param {number} index - Element index
     * @param {InterpolationTypes} type - The interpolation type
     */
    setInterpolationType(index, type) {
        this.interpType[index] = type;
    }

    /**
     * Gets the number of animated elements.
     * @returns {number} The number of elements
     */
    getElementCount() {
        return this.dkeySet.length;
    }

    /**
     * Gets the number of keyframes for a specific element.
     * @param {number} index - Element index
     * @returns {number} The number of keyframes
     */
    getKeyFrameCount(index) {
        return this.keySet[index].length;
    }

    /**
     * Gets the key times for a specific element.
     * @param {number} index - Element index
     * @returns {number[]} Array of key times
     */
    getKeyTimes(index) {
        return this.keySet[index];
    }

    /**
     * Transposes a 2D array (swaps rows and columns).
     * @param {number[][]} array - The array to transpose
     * @returns {number[][]} The transposed array
     * @static
     */
    static transpose(array) {
        const transp = new Array(array[0].length);
        for (let j = 0; j < array[0].length; ++j) {
            transp[j] = new Array(array.length);
        }
        
        for (let i = 0; i < array.length; ++i) {
            for (let j = 0; j < array[i].length; ++j) {
                transp[j][i] = array[i][j];
            }
        }
        return transp;
    }

    /**
     * Finds the keyframe segment index for interpolation at the given time.
     * @param {number} elementIndex - Index of the animated element
     * @param {number} t - The time value
     * @returns {number} The segment index (-1 if before first keyframe)
     * @protected
     */
    getSegmentAtTime(elementIndex, t) {
        const keys = this.keySet[elementIndex];
        const n = keys.length;
        
        // Handle boundary modes
        if (this.wrapType[elementIndex] === BoundaryModes.REPEAT) {
            const tmin = this.getTMin();
            const tmax = this.getTMax();
            t = tmin + ((t - tmin) % (tmax - tmin));
        }
        
        for (let i = 1; i < n; ++i) {
            if (t < keys[i]) {
                return i - 1;
            }
        }
        return n - 1;
    }

    /**
     * Creates a string representation of this animated set.
     * @returns {string} String representation
     */
    toString() {
        return `AbstractAnimatedSet(${this.getElementCount()} elements, tmin=${this.getTMin()}, tmax=${this.getTMax()})`;
    }
}
