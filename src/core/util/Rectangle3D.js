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
 * A Rectangle3D represents a rectangular parallelopiped in three dimensional space: a "box".
 * 
 * It exists primarily to provide bounding boxes for 3D geometry.
 * 
 * JavaScript translation of jReality's Rectangle3D.
 * 
 * @author JavaScript translation
 */

import * as Rn from '../math/Rn.js';
import * as Pn from '../math/Pn.js';
import { Rectangle2D } from './Rectangle2D.js';

export class Rectangle3D {
    /**
     * Create a Rectangle3D instance.
     * @param {number|number[][]} [param1] - Width (if number) or vertex list (if array)
     * @param {number} [h] - Height (only if first param is width)
     * @param {number} [d] - Depth (only if first param is width)
     */
    constructor(param1, h, d) {
        this.bounds = [new Array(3), new Array(3)];
        this.center = new Array(3);
        this.extent = new Array(3);
        
        if (typeof param1 === 'number' && typeof h === 'number' && typeof d === 'number') {
            // Constructor with width, height, depth
            this._initialize();
            this.bounds[0][0] = -param1 / 2;
            this.bounds[0][1] = -h / 2;
            this.bounds[0][2] = -d / 2;
            this.bounds[1][0] = param1 / 2;
            this.bounds[1][1] = h / 2;
            this.bounds[1][2] = d / 2;
            this.update();
        } else if (Array.isArray(param1)) {
            // Constructor with vector list
            this._initialize();
            this.computeFromVectorList(param1);
        } else {
            // Default constructor
            this._initialize();
        }
    }

    /**
     * Initialize bounds to empty state
     * @private
     */
    _initialize() {
        Rn.setToValue(this.bounds[0], Number.MAX_VALUE);
        Rn.setToValue(this.bounds[1], -Number.MAX_VALUE);
    }

    /**
     * Copy this rectangle into another
     * @param {Rectangle3D} target
     */
    copyInto(target) {
        this.bounds[0].forEach((val, i) => target.bounds[0][i] = val);
        this.bounds[1].forEach((val, i) => target.bounds[1][i] = val);
        target.update();
    }

    /**
     * String representation
     * @returns {string}
     */
    toString() {
        if (this.isEmpty()) {
            return "IsEmpty";
        }
        
        return `Min:\t${Rn.toString(this.bounds[0])}\n` +
               `Max:\t${Rn.toString(this.bounds[1])}\n` +
               `Center:\t${Rn.toString(this.center)}\n` +
               `Extent:\t${Rn.toString(this.extent)}`;
    }

    /**
     * Check if rectangle is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.getMinX() > this.getMaxX() || 
               this.getMinY() > this.getMaxY() || 
               this.getMinZ() > this.getMaxZ();
    }

    /**
     * Update center and extent from bounds
     */
    update() {
        if (this.isEmpty()) return;
        Rn.linearCombination(this.center, 0.5, this.bounds[0], 0.5, this.bounds[1]);
        Rn.subtract(this.extent, this.bounds[1], this.bounds[0]);
    }

    /**
     * Transform a bounding box by a matrix.
     * The corners of the box are transformed and the bounding box of the
     * resulting 8 vertices is computed.
     * 
     * @param {Rectangle3D} target - Target rectangle (created if null)
     * @param {number[]} transform - 4x4 transformation matrix
     * @returns {Rectangle3D}
     */
    transformByMatrix(target, transform) {
        const cube = new Array(8);
        const tcube = new Array(8);
        
        if (target === null) target = new Rectangle3D();
        
        // Create a cube with our bounds (use homogeneous coordinates)
        for (let i = 0; i < 2; ++i) {
            for (let j = 0; j < 2; ++j) {
                for (let k = 0; k < 2; ++k) {
                    const index = i * 4 + j * 2 + k;
                    cube[index] = [
                        this.bounds[i][0],
                        this.bounds[j][1], 
                        this.bounds[k][2],
                        1.0  // homogeneous coordinate
                    ];
                }
            }
        }

        // Transform all 8 vertices
        for (let i = 0; i < 8; i++) {
            tcube[i] = Rn.matrixTimesVector(null, transform, cube[i]);
        }
        
        // Dehomogenize if necessary and calculate bounds.
        // NOTE: Pn.dehomogenize defaults to returning an array the same length as src
        // unless dst is provided. For bounding boxes we want 3D points.
        const dehomogCube = tcube.map(v => v.length === 4 ? Pn.dehomogenize(new Array(3), v) : v);
        Rn.calculateBounds(target.bounds, dehomogCube);
        target.update();
        return target;
    }

    /**
     * Configure as bounding box of vertices in the list.
     * The vectors can be either 3-vectors or homogeneous 4-vectors.
     * 
     * @param {number[][]} vlist - Array of vertices
     * @returns {Rectangle3D} this
     */
    computeFromVectorList(vlist) {
        if (vlist.length === 0) return this;
        
        if (vlist[0].length === 3) {
            Rn.calculateBounds(this.bounds, vlist);
        } else if (vlist[0].length === 4) {
            Pn.calculateBounds(this.bounds, vlist);
        } else {
            throw new Error("computeFromVectorList: invalid vlist dimension");
        }

        this.update();
        return this;
    }

    /**
     * Finds the union of the receiver and aBound, places result in target.
     * 
     * @param {Rectangle3D} other
     * @param {Rectangle3D} target - Target rectangle (defaults to this if null)
     * @returns {Rectangle3D}
     */
    unionWith(other, target) {
        if (target === null) {
            target = this;
        }

        if (this.isEmpty() && !other.isEmpty()) {
            other.bounds[0].forEach((val, i) => target.bounds[0][i] = val);
            other.bounds[1].forEach((val, i) => target.bounds[1][i] = val);
            target.update();
            return target;
        } else if (!this.isEmpty() && other.isEmpty()) {
            this.bounds[0].forEach((val, i) => target.bounds[0][i] = val);
            this.bounds[1].forEach((val, i) => target.bounds[1][i] = val);
            target.update();
            return target;
        } else if (this.isEmpty() && other.isEmpty()) {
            return target;
        }

        Rn.min(target.bounds[0], other.bounds[0], this.bounds[0]);
        Rn.max(target.bounds[1], other.bounds[1], this.bounds[1]);
        target.update();
        return target;
    }

    /**
     * Get the center of this box.
     * @param {number[]} [store] - Optional array to store result
     * @returns {number[]} Center coordinates
     */
    getCenter(store) {
        this.update();
        if (store === null || store === undefined) {
            return [...this.center];
        }
        this.center.forEach((val, i) => store[i] = val);
        return store;
    }

    /**
     * Get the dimensions of the box (length, width, depth).
     * @param {number[]} [store] - Optional array to store result
     * @returns {number[]} Extent dimensions
     */
    getExtent(store) {
        this.update();
        if (store === null || store === undefined) {
            return [...this.extent];
        }
        this.extent.forEach((val, i) => store[i] = val);
        return store;
    }

    /**
     * Get the maximum extent dimension
     * @returns {number}
     */
    getMaxExtent() {
        return Math.max(Math.max(this.extent[0], this.extent[1]), this.extent[2]);
    }

    /**
     * Project this box onto its first two dimensions
     * @param {Rectangle2D} [rec] - Optional rectangle to reuse
     * @returns {Rectangle2D}
     */
    convertToRectangle2D(rec) {
        let screenExtent;
        if (rec === null || rec === undefined) {
            screenExtent = new Rectangle2D.Double();
        } else {
            screenExtent = rec;
        }
        screenExtent.setFrameFromDiagonal(
            this.bounds[0][0], this.bounds[0][1],
            this.bounds[1][0], this.bounds[1][1]
        );
        return screenExtent;
    }

    /**
     * Get the two opposite corners of this box (min(x,y,z) and max(x,y,z)).
     * @param {number[][]} [store] - Optional array to store result
     * @returns {number[][]}
     */
    getBounds(store) {
        if (store === null || store === undefined) {
            return [
                [...this.bounds[0]],
                [...this.bounds[1]]
            ];
        }
        this.bounds[0].forEach((val, i) => store[0][i] = val);
        this.bounds[1].forEach((val, i) => store[1][i] = val);
        return store;
    }

    /**
     * Set the two opposite corners of this box.
     * @param {number[][]} bounds - [min, max] corners
     */
    setBounds(bounds) {
        if (bounds.length !== 2 || bounds[0].length !== 3) return;
        this.bounds = [
            [...bounds[0]],
            [...bounds[1]]
        ];
        this.update();
    }

    // Getter methods for bounds
    getMinX() { return this.bounds[0][0]; }
    getMaxX() { return this.bounds[1][0]; }
    getMinY() { return this.bounds[0][1]; }
    getMaxY() { return this.bounds[1][1]; }
    getMinZ() { return this.bounds[0][2]; }
    getMaxZ() { return this.bounds[1][2]; }

    /**
     * Scale the rectangle by a factor
     * @param {number} factor
     */
    scale(factor) {
        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 2; ++j) {
                this.bounds[j][i] *= factor;
            }
        }
    }

    /**
     * Add margin to the rectangle
     * @param {number} margin
     */
    add(margin) {
        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 2; ++j) {
                this.bounds[j][i] += (j === 0 ? -margin : margin);
            }
        }
    }

    /**
     * Check if this rectangle contains another rectangle
     * @param {Rectangle3D} other
     * @returns {boolean}
     */
    contains(other) {
        for (let i = 0; i < 3; ++i) {
            if (this.bounds[0][i] > other.bounds[0][i]) return false;
            if (this.bounds[1][i] < other.bounds[1][i]) return false;
        }
        return true;
    }

    /**
     * Create a copy of this rectangle
     * @returns {Rectangle3D}
     */
    clone() {
        const result = new Rectangle3D();
        this.copyInto(result);
        return result;
    }

    /**
     * Test for equality
     * @param {Rectangle3D} other
     * @returns {boolean}
     */
    equals(other) {
        if (!(other instanceof Rectangle3D)) return false;
        
        for (let i = 0; i < 3; i++) {
            if (this.bounds[0][i] !== other.bounds[0][i] ||
                this.bounds[1][i] !== other.bounds[1][i]) {
                return false;
            }
        }
        return true;
    }
}

// Static constants
Rectangle3D.EMPTY_BOX = new Rectangle3D();

Rectangle3D.unitCube = (() => {
    const unitCube = new Rectangle3D();
    const bounds = [
        [-1.0, -1.0, -1.0],
        [1.0, 1.0, 1.0]
    ];
    unitCube.setBounds(bounds);
    unitCube.update();
    return unitCube;
})();

export default Rectangle3D;
