/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview FramedCurve - Complex curve animation with reference frames.
 * @author Charles Gunn
 */

import { InterpolationTypes, AnimationUtility } from '../util/AnimationUtility.js';

/**
 * Represents a control point with transformation and time.
 */
export class ControlPoint {
    /**
     * Creates a new ControlPoint.
     * @param {number[][]} transformation - 4x4 transformation matrix
     * @param {number} t - Time parameter
     */
    constructor(transformation, t) {
        /** @type {number[][]} 4x4 transformation matrix */
        this.transformation = transformation;
        
        /** @type {number} Time parameter */
        this.t = t;
    }

    /**
     * Gets the time parameter.
     * @returns {number} The time
     */
    getTime() {
        return this.t;
    }

    /**
     * Sets the time parameter.
     * @param {number} value - The time to set
     */
    setTime(value) {
        this.t = value;
    }

    /**
     * Gets the transformation matrix.
     * @returns {number[][]} The 4x4 transformation matrix
     */
    getTransformation() {
        return this.transformation;
    }

    /**
     * Sets the transformation matrix.
     * @param {number[][]} transformation - The 4x4 transformation matrix
     */
    setTransformation(transformation) {
        this.transformation = transformation;
    }

    /**
     * Extracts the translation from the transformation matrix.
     * @returns {number[]} [x, y, z] translation vector
     */
    getTranslation() {
        return [
            this.transformation[0][3],
            this.transformation[1][3],
            this.transformation[2][3]
        ];
    }

    /**
     * Extracts the scale from the transformation matrix.
     * @returns {number[]} [sx, sy, sz] scale vector
     */
    getScale() {
        const m = this.transformation;
        const sx = Math.sqrt(m[0][0] * m[0][0] + m[1][0] * m[1][0] + m[2][0] * m[2][0]);
        const sy = Math.sqrt(m[0][1] * m[0][1] + m[1][1] * m[1][1] + m[2][1] * m[2][1]);
        const sz = Math.sqrt(m[0][2] * m[0][2] + m[1][2] * m[1][2] + m[2][2] * m[2][2]);
        return [sx, sy, sz];
    }

    /**
     * Compares this control point with another for sorting.
     * @param {ControlPoint} other - The other control point
     * @returns {number} Comparison result
     */
    compareTo(other) {
        if (this.t > other.t) return 1;
        else if (this.t < other.t) return -1;
        else return 0;
    }

    /**
     * Creates a string representation.
     * @returns {string} String representation
     */
    toString() {
        const trans = this.getTranslation();
        return `ControlPoint(t=${this.t}, pos=[${trans[0].toFixed(2)}, ${trans[1].toFixed(2)}, ${trans[2].toFixed(2)}])`;
    }
}

/**
 * A curve with moving reference frames for complex animations.
 * Supports camera paths, object trajectories, and smooth transformations.
 */
export class FramedCurve {
    /**
     * Creates a new FramedCurve.
     * @param {string} [metric='euclidean'] - The metric type ('euclidean', 'hyperbolic', etc.)
     */
    constructor(metric = 'euclidean') {
        /** @type {ControlPoint[]} Array of control points */
        this.controlPoints = [];
        
        /** @type {number} Minimum time */
        this.tmin = 0;
        
        /** @type {number} Maximum time */
        this.tmax = 1;
        
        /** @type {boolean} Whether the curve data is out of date */
        this.outOfDate = true;
        
        /** @type {string} The metric type */
        this.metric = metric;
        
        /** @type {boolean} Whether to use B-spline interpolation */
        this.useBSpline = true;
        
        /** @type {boolean} Whether to interpolate scale values */
        this.interpolateScale = false;
        
        /** @type {number} Number of points for curve representation */
        this.pointsForCurveRepresentation = 100;
        
        /** @type {InterpolationTypes} Interpolation type for the curve */
        this.interpolationType = InterpolationTypes.CUBIC_HERMITE;
        
        // Cached interpolation data
        /** @type {number[]} Cached time values */
        this.cachedTimes = null;
        
        /** @type {number[][]} Cached position values */
        this.cachedPositions = null;
        
        /** @type {number[][]} Cached rotation values (quaternions) */
        this.cachedRotations = null;
        
        /** @type {number[][]} Cached scale values */
        this.cachedScales = null;
    }

    /**
     * Adds a control point to the curve.
     * @param {ControlPoint} controlPoint - The control point to add
     */
    addControlPoint(controlPoint) {
        this.controlPoints.push(controlPoint);
        this.controlPoints.sort((a, b) => a.compareTo(b));
        this.setOutOfDate(true);
    }

    /**
     * Sets control points from transformation matrices.
     * @param {number[][][]} matrices - Array of 4x4 transformation matrices
     */
    setControlPoints(matrices) {
        this.controlPoints = [];
        for (let i = 0; i < matrices.length; i++) {
            const t = i / Math.max(1, matrices.length - 1);
            this.addControlPoint(new ControlPoint(matrices[i], t));
        }
    }

    /**
     * Gets a control point by index.
     * @param {number} index - The index of the control point
     * @returns {ControlPoint} The control point
     */
    getControlPoint(index) {
        return this.controlPoints[index];
    }

    /**
     * Gets the number of control points.
     * @returns {number} The number of control points
     */
    getNumberControlPoints() {
        return this.controlPoints.length;
    }

    /**
     * Deletes a control point by index.
     * @param {number} index - The index of the control point to delete
     */
    deleteControlPoint(index) {
        if (index >= 0 && index < this.controlPoints.length) {
            this.controlPoints.splice(index, 1);
            this.setOutOfDate(true);
        }
    }

    /**
     * Gets the minimum time value.
     * @returns {number} The minimum time
     */
    getTmin() {
        if (this.outOfDate) this.update();
        return this.tmin;
    }

    /**
     * Gets the maximum time value.
     * @returns {number} The maximum time
     */
    getTmax() {
        if (this.outOfDate) this.update();
        return this.tmax;
    }

    /**
     * Sets whether the curve data is out of date.
     * @param {boolean} outOfDate - Whether the data is out of date
     */
    setOutOfDate(outOfDate) {
        this.outOfDate = outOfDate;
    }

    /**
     * Gets whether to use B-spline interpolation.
     * @returns {boolean} Whether to use B-splines
     */
    isUseBSpline() {
        return this.useBSpline;
    }

    /**
     * Sets whether to use B-spline interpolation.
     * @param {boolean} useBSpline - Whether to use B-splines
     */
    setUseBSpline(useBSpline) {
        this.useBSpline = useBSpline;
        this.setOutOfDate(true);
    }

    /**
     * Gets whether to interpolate scale values.
     * @returns {boolean} Whether to interpolate scale
     */
    isInterpolateScale() {
        return this.interpolateScale;
    }

    /**
     * Sets whether to interpolate scale values.
     * @param {boolean} interpolateScale - Whether to interpolate scale
     */
    setInterpolateScale(interpolateScale) {
        this.interpolateScale = interpolateScale;
        this.setOutOfDate(true);
    }

    /**
     * Updates the curve's cached interpolation data.
     */
    update() {
        if (this.controlPoints.length === 0) {
            this.tmin = 0;
            this.tmax = 1;
            this.outOfDate = false;
            return;
        }

        // Sort control points by time
        this.controlPoints.sort((a, b) => a.compareTo(b));
        
        // Update time bounds
        this.tmin = this.controlPoints[0].getTime();
        this.tmax = this.controlPoints[this.controlPoints.length - 1].getTime();

        // Cache interpolation data
        const n = this.controlPoints.length;
        this.cachedTimes = new Array(n);
        this.cachedPositions = new Array(n);
        this.cachedRotations = new Array(n);
        this.cachedScales = new Array(n);

        for (let i = 0; i < n; i++) {
            const cp = this.controlPoints[i];
            this.cachedTimes[i] = cp.getTime();
            this.cachedPositions[i] = cp.getTranslation();
            this.cachedScales[i] = cp.getScale();
            
            // For now, use simplified rotation extraction
            // In a full implementation, this would extract proper quaternions
            this.cachedRotations[i] = [1, 0, 0, 0]; // Identity quaternion
        }

        this.outOfDate = false;
    }

    /**
     * Gets the segment index for the given time.
     * @param {number} t - The time value
     * @returns {number} The segment index
     */
    getSegmentAtTime(t) {
        if (this.outOfDate) this.update();
        
        if (this.controlPoints.length <= 1) return 0;
        
        for (let i = 1; i < this.controlPoints.length; i++) {
            if (t <= this.controlPoints[i].getTime()) {
                return i - 1;
            }
        }
        return this.controlPoints.length - 2;
    }

    /**
     * Gets the interpolated transformation at the specified time.
     * @param {number} t - The time value
     * @param {number[][]} [dst] - Optional destination matrix
     * @returns {number[][]} The interpolated 4x4 transformation matrix
     */
    getValueAtTime(t, dst = null) {
        if (this.outOfDate) this.update();
        
        if (this.controlPoints.length === 0) {
            return this.createIdentityMatrix();
        }
        
        if (this.controlPoints.length === 1) {
            return this.controlPoints[0].getTransformation();
        }

        // Clamp time to valid range
        t = Math.max(this.tmin, Math.min(this.tmax, t));

        const segmentIndex = this.getSegmentAtTime(t);
        const cp1 = this.controlPoints[segmentIndex];
        const cp2 = this.controlPoints[Math.min(segmentIndex + 1, this.controlPoints.length - 1)];

        if (cp1 === cp2) {
            return cp1.getTransformation();
        }

        // Interpolate between control points
        const t1 = cp1.getTime();
        const t2 = cp2.getTime();
        const alpha = (t2 === t1) ? 0 : (t - t1) / (t2 - t1);

        return this.interpolateTransformations(cp1.getTransformation(), cp2.getTransformation(), alpha, dst);
    }

    /**
     * Interpolates between two transformation matrices.
     * @param {number[][]} matrix1 - First transformation matrix
     * @param {number[][]} matrix2 - Second transformation matrix
     * @param {number} alpha - Interpolation parameter (0-1)
     * @param {number[][]} [dst] - Optional destination matrix
     * @returns {number[][]} The interpolated transformation matrix
     * @private
     */
    interpolateTransformations(matrix1, matrix2, alpha, dst = null) {
        if (!dst) {
            dst = this.createIdentityMatrix();
        }

        // Simple linear interpolation of matrix elements
        // In a full implementation, this would properly handle rotation interpolation
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.interpolationType === InterpolationTypes.LINEAR) {
                    dst[i][j] = AnimationUtility.linearInterpolationDirect(matrix1[i][j], matrix2[i][j], alpha);
                } else if (this.interpolationType === InterpolationTypes.CUBIC_HERMITE) {
                    dst[i][j] = AnimationUtility.hermiteInterpolationDirect(matrix1[i][j], matrix2[i][j], alpha);
                } else {
                    dst[i][j] = alpha < 0.5 ? matrix1[i][j] : matrix2[i][j];
                }
            }
        }

        return dst;
    }

    /**
     * Creates a 4x4 identity matrix.
     * @returns {number[][]} Identity matrix
     * @private
     */
    createIdentityMatrix() {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    }

    /**
     * Gets the interpolated position at the specified time.
     * @param {number} t - The time value
     * @returns {number[]} [x, y, z] position vector
     */
    getPositionAtTime(t) {
        const matrix = this.getValueAtTime(t);
        return [matrix[0][3], matrix[1][3], matrix[2][3]];
    }

    /**
     * Scales the entire curve by a factor.
     * @param {number} scale - The scale factor
     */
    scaleBy(scale) {
        for (const cp of this.controlPoints) {
            const matrix = cp.getTransformation();
            // Scale the translation components
            matrix[0][3] *= scale;
            matrix[1][3] *= scale;
            matrix[2][3] *= scale;
        }
        this.setOutOfDate(true);
    }

    /**
     * Sets the interpolation type for the curve.
     * @param {InterpolationTypes} type - The interpolation type
     */
    setInterpolationType(type) {
        this.interpolationType = type;
    }

    /**
     * Gets the interpolation type for the curve.
     * @returns {InterpolationTypes} The interpolation type
     */
    getInterpolationType() {
        return this.interpolationType;
    }

    /**
     * Creates a factory method for creating framed curves from control points.
     * @param {ControlPoint[]} controlPoints - Array of control points
     * @returns {FramedCurve} A new framed curve
     * @static
     */
    static frameCurveFactory(controlPoints) {
        const fc = new FramedCurve();
        for (const cp of controlPoints) {
            fc.addControlPoint(cp);
        }
        return fc;
    }

    /**
     * Creates a string representation of this framed curve.
     * @returns {string} String representation
     */
    toString() {
        return `FramedCurve(${this.controlPoints.length} control points, t=${this.tmin}-${this.tmax}, ${this.interpolationType})`;
    }
}
