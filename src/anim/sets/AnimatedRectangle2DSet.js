/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview AnimatedRectangle2DSet - Animates sets of Rectangle2D objects.
 * @author Charles Gunn
 */

import { AbstractAnimatedSet } from './AbstractAnimatedSet.js';
import { InterpolationTypes, BoundaryModes, AnimationUtility } from '../util/AnimationUtility.js';

/**
 * Animates a set of Rectangle2D objects, each with independent keyframes and timing.
 * Useful for animating viewports, UI elements, and geometric regions.
 * Extends AbstractAnimatedSet to provide specific functionality for Rectangle2D values.
 */
export class AnimatedRectangle2DSet extends AbstractAnimatedSet {
    /**
     * Creates a new AnimatedRectangle2DSet.
     * @param {number[][]} dkeySet - Delta key times for each element
     * @param {Object[][]} valueSet - Rectangle2D values at each keyframe [element][keyframe]
     * @param {InterpolationTypes[]} [interpType] - Interpolation types for each element
     */
    constructor(dkeySet, valueSet, interpType) {
        super(dkeySet, interpType);
        
        /** @type {Object[][]} Rectangle2D values at each keyframe */
        this.valueSet = valueSet;
    }

    /**
     * Gets the interpolated Rectangle2D values at the specified time.
     * @param {number} t - The time
     * @param {Object[]} [vals] - Optional destination array
     * @returns {Object[]} The interpolated Rectangle2D objects
     */
    getValuesAtTime(t, vals = null) {
        const elementCount = this.getElementCount();
        if (!vals || vals.length !== elementCount) {
            vals = new Array(elementCount);
        }

        // Interpolate each Rectangle2D element independently
        for (let j = 0; j < elementCount; ++j) {
            let adjustedTime = t;
            
            // Handle REPEAT boundary mode
            if (this.wrapType[j] === BoundaryModes.REPEAT) {
                const tmin = this.getTMin();
                const tmax = this.getTMax();
                adjustedTime = tmin + ((t - tmin) % (tmax - tmin));
            }

            const segmentIndex = this.getSegmentAtTime(j, adjustedTime);
            const keys = this.keySet[j];
            const values = this.valueSet[j];
            const n = keys.length;

            if (segmentIndex === -1) {
                // Before first keyframe - use first value
                vals[j] = values[0];
                continue;
            }

            if (segmentIndex >= n - 1) {
                // At or after last keyframe - use last value
                vals[j] = values[n - 1];
                continue;
            }

            // Interpolate between keyframes
            const t1 = keys[segmentIndex];
            const t2 = keys[segmentIndex + 1];
            const rect1 = values[segmentIndex];
            const rect2 = values[segmentIndex + 1];

            switch (this.interpType[j]) {
                case InterpolationTypes.CONSTANT:
                default:
                    vals[j] = rect1;
                    break;

                case InterpolationTypes.LINEAR:
                    vals[j] = AnimationUtility.linearInterpolationRectangle2D(
                        adjustedTime, t1, t2, rect1, rect2
                    );
                    break;

                case InterpolationTypes.CUBIC_HERMITE:
                    vals[j] = AnimationUtility.hermiteInterpolationRectangle2D(
                        adjustedTime, t1, t2, rect1, rect2
                    );
                    break;
            }
        }

        return vals;
    }

    /**
     * Gets the Rectangle2D value for a specific element at a specific keyframe.
     * @param {number} elementIndex - The element index
     * @param {number} keyIndex - The keyframe index
     * @returns {Object} The Rectangle2D object
     */
    getRectangleAt(elementIndex, keyIndex) {
        return this.valueSet[elementIndex][keyIndex];
    }

    /**
     * Sets the Rectangle2D value for a specific element at a specific keyframe.
     * @param {number} elementIndex - The element index
     * @param {number} keyIndex - The keyframe index
     * @param {Object} rectangle - The Rectangle2D object to set
     */
    setRectangleAt(elementIndex, keyIndex, rectangle) {
        this.valueSet[elementIndex][keyIndex] = rectangle;
    }

    /**
     * Gets all Rectangle2D values for a specific element.
     * @param {number} elementIndex - The element index
     * @returns {Object[]} Array of Rectangle2D objects for the element
     */
    getElementRectangles(elementIndex) {
        return this.valueSet[elementIndex];
    }

    /**
     * Sets all Rectangle2D values for a specific element.
     * @param {number} elementIndex - The element index
     * @param {Object[]} rectangles - Array of Rectangle2D objects for the element
     */
    setElementRectangles(elementIndex, rectangles) {
        this.valueSet[elementIndex] = rectangles;
    }

    /**
     * Creates a simple Rectangle2D-like object.
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width
     * @param {number} height - Height
     * @returns {Object} Rectangle2D-like object
     * @static
     */
    static createRectangle(x, y, width, height) {
        return {
            x,
            y,
            width,
            height,
            getX: () => x,
            getY: () => y,
            getWidth: () => width,
            getHeight: () => height,
            setRect: (newX, newY, newWidth, newHeight) => {
                x = newX;
                y = newY;
                width = newWidth;
                height = newHeight;
            },
            toString: () => `Rectangle2D[x=${x}, y=${y}, width=${width}, height=${height}]`
        };
    }

    /**
     * Gets the bounding rectangle that encompasses all rectangles at the given time.
     * @param {number} t - The time
     * @returns {Object} The bounding Rectangle2D
     */
    getBoundingRectangleAtTime(t) {
        const rectangles = this.getValuesAtTime(t);
        if (rectangles.length === 0) {
            return AnimatedRectangle2DSet.createRectangle(0, 0, 0, 0);
        }

        let minX = rectangles[0].getX();
        let minY = rectangles[0].getY();
        let maxX = minX + rectangles[0].getWidth();
        let maxY = minY + rectangles[0].getHeight();

        for (let i = 1; i < rectangles.length; i++) {
            const rect = rectangles[i];
            const x = rect.getX();
            const y = rect.getY();
            const x2 = x + rect.getWidth();
            const y2 = y + rect.getHeight();

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x2);
            maxY = Math.max(maxY, y2);
        }

        return AnimatedRectangle2DSet.createRectangle(minX, minY, maxX - minX, maxY - minY);
    }

    /**
     * Gets the total area of all rectangles at the given time.
     * @param {number} t - The time
     * @returns {number} The total area
     */
    getTotalAreaAtTime(t) {
        const rectangles = this.getValuesAtTime(t);
        let totalArea = 0;
        
        for (const rect of rectangles) {
            totalArea += rect.getWidth() * rect.getHeight();
        }
        
        return totalArea;
    }

    /**
     * Creates a string representation of this animated rectangle set.
     * @returns {string} String representation
     */
    toString() {
        return `AnimatedRectangle2DSet(${this.getElementCount()} rectangles, tmin=${this.getTMin()}, tmax=${this.getTMax()})`;
    }
}
