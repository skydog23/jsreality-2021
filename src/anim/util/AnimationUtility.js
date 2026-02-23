/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview Static methods for implementing various interpolations on various primitive types of data.
 * @author Charles Gunn
 */

import { FactoredMatrix } from '../../core/math/FactoredMatrix.js';
import { linearInterpolation as quaternionLinearInterpolation } from '../../core/math/Quaternion.js';
import { Color } from '../../core/util/Color.js';

/**
 * Enumeration of interpolation types.
 * @readonly
 * @enum {string}
 */
export const InterpolationTypes = {
    CONSTANT: 'CONSTANT',
    LINEAR: 'LINEAR',
    CUBIC_HERMITE: 'CUBIC_HERMITE',
    CUBIC_BSPLINE: 'CUBIC_BSPLINE'
};

/**
 * Enumeration of boundary modes.
 * @readonly
 * @enum {string}
 */
export const BoundaryModes = {
    CLAMP: 'CLAMP',
    REPEAT: 'REPEAT',
    EXTRAPOLATE: 'EXTRAPOLATE'
};

/**
 * Enumeration of playback modes.
 * @readonly
 * @enum {string}
 */
export const PlaybackModes = {
    NORMAL: 'NORMAL',
    CYCLE: 'CYCLE',
    SHUTTLE: 'SHUTTLE'
};

/**
 * Map of playback mode names to enum values.
 * @type {Map<string, string>}
 */
export const playbackModeNames = new Map([
    ['normal', PlaybackModes.NORMAL],
    ['cycle', PlaybackModes.CYCLE],
    ['shuttle', PlaybackModes.SHUTTLE]
]);

/**
 * Static methods for implementing various interpolations on various primitive types of data.
 */
export class AnimationUtility {
    /**
     * Private constructor to prevent instantiation.
     */
    constructor() {
        throw new Error('AnimationUtility is a static class and cannot be instantiated');
    }

    /**
     * Linear interpolation between two scalar values.
     * @param {number} t - The interpolation parameter
     * @param {number} minin - Minimum input value
     * @param {number} maxin - Maximum input value  
     * @param {number} minout - Minimum output value
     * @param {number} maxout - Maximum output value
     * @returns {number} The interpolated value
     */
    static linearInterpolation(t, minin, maxin, minout, maxout) {
        // Overload used in older Charles Gunn code:
        //   linearInterpolation(double[] dst, double t, double minin, double maxin, double[] minout, double[] maxout)
        // Implemented here as a runtime-dispatch overload to preserve Java behavior.
        if (Array.isArray(t)) {
            const dst = /** @type {number[]} */ (t);
            const tt = /** @type {number} */ (minin);
            const inMin = /** @type {number} */ (maxin);
            const inMax = /** @type {number} */ (minout);
            if (arguments.length < 6) {
                throw new Error('AnimationUtility.linearInterpolation(dst, t, minin, maxin, minout, maxout) requires 6 arguments');
            }
            const outMin = /** @type {number[]} */ (maxout);
            const outMax = /** @type {number[]} */ (arguments[5]);
            if (!Array.isArray(outMin) || !Array.isArray(outMax)) {
                throw new Error('AnimationUtility.linearInterpolation: expected vector min/max outputs');
            }
            const alpha = AnimationUtility.linearInterpolation(tt, inMin, inMax, 0, 1);
            for (let i = 0; i < outMin.length; i++) {
                dst[i] = (1 - alpha) * outMin[i] + alpha * outMax[i];
            }
            return dst;
        }
        if (t <= minin) return minout;
        if (t >= maxin) return maxout;
        const input = (t - minin) / (maxin - minin);
        return minout + input * (maxout - minout);
    }

    /**
     * Hermite interpolation between two scalar values.
     * @param {number} t - The interpolation parameter
     * @param {number} minin - Minimum input value
     * @param {number} maxin - Maximum input value
     * @param {number} minout - Minimum output value
     * @param {number} maxout - Maximum output value
     * @returns {number} The interpolated value
     */
    static hermiteInterpolation(t, minin, maxin, minout, maxout) {
        if (t <= minin) return minout;
        if (t >= maxin) return maxout;
        const input = (t - minin) / (maxin - minin);
        const out = -2 * input * input * input + 3 * input * input;
        const result = minout + out * (maxout - minout);
        // console.log('hermiteInterpolation', t, minin, maxin, minout, maxout, result);
        return result;
    }

    /**
     * Linear interpolation between two Color objects.
     * @param {number} t - The interpolation parameter
     * @param {number} minin - Minimum input value
     * @param {number} maxin - Maximum input value
     * @param {import('../../util/Color.js').Color} minout - Minimum output color
     * @param {import('../../util/Color.js').Color} maxout - Maximum output color
     * @returns {import('../../util/Color.js').Color} The interpolated color
     */
    static linearInterpolationColor(t, minin, maxin, minout, maxout) {
        if (t <= minin) return minout;
        if (t >= maxin) return maxout;
        const input = (t - minin) / (maxin - minin);
        return AnimationUtility.linearInterpolationColorDirect(minout, maxout, input);
    }

    /**
     * Hermite interpolation between two Color objects.
     * @param {number} t - The interpolation parameter
     * @param {number} minin - Minimum input value
     * @param {number} maxin - Maximum input value
     * @param {import('../../util/Color.js').Color} minout - Minimum output color
     * @param {import('../../util/Color.js').Color} maxout - Maximum output color
     * @returns {import('../../util/Color.js').Color} The interpolated color
     */
    static hermiteInterpolationColor(t, minin, maxin, minout, maxout) {
        if (t <= minin) return minout;
        if (t >= maxin) return maxout;
        const input = (t - minin) / (maxin - minin);
        const out = -2 * input * input * input + 3 * input * input;
        return AnimationUtility.linearInterpolationColorDirect(minout, maxout, out);
    }

    /**
     * Direct linear interpolation between two colors.
     * @param {import('../../util/Color.js').Color} minout - Start color
     * @param {import('../../util/Color.js').Color} maxout - End color
     * @param {number} t - Interpolation parameter (0-1)
     * @returns {import('../../util/Color.js').Color} The interpolated color
     */
    static linearInterpolationColorDirect(minout, maxout, t) {
        const r = Math.round(minout.r + t * (maxout.r - minout.r));
        const g = Math.round(minout.g + t * (maxout.g - minout.g));
        const b = Math.round(minout.b + t * (maxout.b - minout.b));
        const a = Math.round(minout.a + t * (maxout.a - minout.a));
        
        // Return interpolated RGBA values as plain object
        // The caller is responsible for creating the appropriate Color instance
        return { r, g, b, a };
    }


    static saturate(color, factor) {
        const max = Math.max(color.r, color.g, color.b)/255.0;
        const newColor = AnimationUtility.linearInterpolationColorDirect(color, Color.WHITE, factor*max);
        return new Color(...newColor);
    }

 
    /**
     * Linear interpolation for arrays.
     * @param {number} t - The interpolation parameter
     * @param {number} minin - Minimum input value
     * @param {number} maxin - Maximum input value
     * @param {number[]} minout - Minimum output array
     * @param {number[]} maxout - Maximum output array
     * @param {number[]} [dst] - Destination array (optional)
     * @returns {number[]} The interpolated array
     */
    static linearInterpolationArray(t, minin, maxin, minout, maxout, dst = null) {
        if (!dst) dst = new Array(minout.length);
        const input = AnimationUtility.getStandardTime(t, minin, maxin);
        
        for (let i = 0; i < minout.length; ++i) {
            dst[i] = minout[i] + input * (maxout[i] - minout[i]);
        }
        return dst;
    }

    /**
     * Hermite interpolation for arrays.
     * @param {number} t - The interpolation parameter
     * @param {number} minin - Minimum input value
     * @param {number} maxin - Maximum input value
     * @param {number[]} minout - Minimum output array
     * @param {number[]} maxout - Maximum output array
     * @param {number[]} [result] - Result array (optional)
     * @returns {number[]} The interpolated array
     */
    static hermiteInterpolationArray(t, minin, maxin, minout, maxout, result = null) {
        if (t <= minin) return minout;
        if (t >= maxin) return maxout;
        if (!result) result = new Array(minout.length);
        
        for (let i = 0; i < minout.length; ++i) {
            const input = (t - minin) / (maxin - minin);
            const out = -2 * input * input * input + 3 * input * input;
            result[i] = minout[i] + out * (maxout[i] - minout[i]);
        }
        return result;
    }

    /**
     * Linear interpolation between two Rectangle2D objects.
     * @param {number} t - The interpolation parameter
     * @param {number} t0 - Start time
     * @param {number} t1 - End time
     * @param {import('../../util/Rectangle2D.js').Rectangle2D} r1 - Start rectangle
     * @param {import('../../util/Rectangle2D.js').Rectangle2D} r2 - End rectangle
     * @returns {import('../../util/Rectangle2D.js').Rectangle2D} The interpolated rectangle
     */
    static linearInterpolationRectangle2D(t, t0, t1, r1, r2) {
        // Import Rectangle2D dynamically to avoid circular dependencies
        const Rectangle2D = globalThis.Rectangle2D || { Double: class {} };
        
        if (t <= t0) return r1;
        if (t >= t1) return r2;
        
        const input = (t - t0) / (t1 - t0);
        const x = AnimationUtility.linearInterpolationDirect(r1.getX(), r2.getX(), input);
        const y = AnimationUtility.linearInterpolationDirect(r1.getY(), r2.getY(), input);
        const w = AnimationUtility.linearInterpolationDirect(r1.getWidth(), r2.getWidth(), input);
        const h = AnimationUtility.linearInterpolationDirect(r1.getHeight(), r2.getHeight(), input);
        
        // Create new Rectangle2D with interpolated values
        return { x, y, width: w, height: h, getX: () => x, getY: () => y, getWidth: () => w, getHeight: () => h };
    }

    /**
     * Hermite interpolation between two Rectangle2D objects.
     * @param {number} t - The interpolation parameter
     * @param {number} t0 - Start time
     * @param {number} t1 - End time
     * @param {import('../../util/Rectangle2D.js').Rectangle2D} r1 - Start rectangle
     * @param {import('../../util/Rectangle2D.js').Rectangle2D} r2 - End rectangle
     * @returns {import('../../util/Rectangle2D.js').Rectangle2D} The interpolated rectangle
     */
    static hermiteInterpolationRectangle2D(t, t0, t1, r1, r2) {
        if (t <= t0) return r1;
        if (t >= t1) return r2;
        
        const input = (t - t0) / (t1 - t0);
        const x = AnimationUtility.hermiteInterpolationDirect(r1.getX(), r2.getX(), input);
        const y = AnimationUtility.hermiteInterpolationDirect(r1.getY(), r2.getY(), input);
        const w = AnimationUtility.hermiteInterpolationDirect(r1.getWidth(), r2.getWidth(), input);
        const h = AnimationUtility.hermiteInterpolationDirect(r1.getHeight(), r2.getHeight(), input);
        
        // Create new Rectangle2D with interpolated values
        return { x, y, width: w, height: h, getX: () => x, getY: () => y, getWidth: () => w, getHeight: () => h };
    }

    /**
     * Direct linear interpolation between two scalar values.
     * @param {number} v1 - Start value
     * @param {number} v2 - End value
     * @param {number} t - Interpolation parameter (0-1)
     * @returns {number} Interpolated value
     */
    static linearInterpolationDirect(v1, v2, t) {
        return v1 + t * (v2 - v1);
    }

    /**
     * Direct hermite interpolation between two scalar values.
     * @param {number} v1 - Start value
     * @param {number} v2 - End value
     * @param {number} t - Interpolation parameter (0-1)
     * @returns {number} Interpolated value
     */
    static hermiteInterpolationDirect(v1, v2, t) {
        const out = -2 * t * t * t + 3 * t * t;
        return v1 + out * (v2 - v1);
    }

    /**
     * Gets the standard time parameter (0-1) from time bounds.
     * @param {number} t - The time value
     * @param {number} minin - Minimum input time
     * @param {number} maxin - Maximum input time
     * @returns {number} Normalized time parameter
     */
    static getStandardTime(t, minin, maxin) {
        if (t <= minin) return 0.0;
        if (t >= maxin) return 1.0;
        return (t - minin) / (maxin - minin);
    }

    /**
     * Linear interpolation between two FactoredMatrix objects.
     * Interpolates translation, rotation (using SLERP), and stretch separately.
     * @param {import('../../core/math/FactoredMatrix.js').FactoredMatrix|null} dst - Destination matrix (optional)
     * @param {number} t - The interpolation parameter
     * @param {number} t0 - Start time
     * @param {number} t1 - End time
     * @param {import('../../core/math/FactoredMatrix.js').FactoredMatrix} m1 - Start matrix
     * @param {import('../../core/math/FactoredMatrix.js').FactoredMatrix} m2 - End matrix
     * @returns {import('../../core/math/FactoredMatrix.js').FactoredMatrix} The interpolated matrix
     */
    static linearInterpolationFactoredMatrix(dst, t, t0, t1, m1, m2) {
        if (t <= t0) return m1;
        if (t >= t1) return m2;

        const normalizedT = AnimationUtility.getStandardTime(t, t0, t1);
        
        // Create destination matrix if not provided
        if (!dst) {
            dst = new FactoredMatrix(null, m1.getMetric());
        }

        // Interpolate translation
        const trans1 = m1.getTranslation();
        const trans2 = m2.getTranslation();
        const interpTrans = [
            trans1[0] + normalizedT * (trans2[0] - trans1[0]),
            trans1[1] + normalizedT * (trans2[1] - trans1[1]),
            trans1[2] + normalizedT * (trans2[2] - trans1[2])
        ];
        dst.setTranslation(interpTrans[0], interpTrans[1], interpTrans[2]);

        // Interpolate rotation using SLERP (spherical linear interpolation)
        const q1 = m1.getRotationQuaternion();
        const q2 = m2.getRotationQuaternion();
        
        const interpQ = quaternionLinearInterpolation(null, q1, q2, normalizedT);
        dst.setRotationQuaternion(interpQ);

        // Interpolate stretch/scale
        const stretch1 = m1.getStretch();
        const stretch2 = m2.getStretch();
        const interpStretch = [
            stretch1[0] + normalizedT * (stretch2[0] - stretch1[0]),
            stretch1[1] + normalizedT * (stretch2[1] - stretch1[1]),
            stretch1[2] + normalizedT * (stretch2[2] - stretch1[2])
        ];
        dst.setStretchComponents(interpStretch[0], interpStretch[1], interpStretch[2]);

        return dst;
    }
}
