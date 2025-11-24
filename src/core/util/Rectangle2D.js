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
 * A minimal Rectangle2D class equivalent to java.awt.geom.Rectangle2D for jReality JavaScript translation.
 * Represents a 2D rectangular region defined by x, y, width, and height.
 * 
 * @author JavaScript translation
 */

export class Rectangle2D {
    /**
     * Create a Rectangle2D instance.
     * @param {number} [x=0] - X coordinate of upper-left corner
     * @param {number} [y=0] - Y coordinate of upper-left corner  
     * @param {number} [width=0] - Width of rectangle
     * @param {number} [height=0] - Height of rectangle
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /**
     * Get the X coordinate
     * @returns {number}
     */
    getX() {
        return this.x;
    }

    /**
     * Get the Y coordinate  
     * @returns {number}
     */
    getY() {
        return this.y;
    }

    /**
     * Get the width
     * @returns {number}
     */
    getWidth() {
        return this.width;
    }

    /**
     * Get the height
     * @returns {number}
     */
    getHeight() {
        return this.height;
    }

    /**
     * Get the minimum X coordinate
     * @returns {number}
     */
    getMinX() {
        return this.x;
    }

    /**
     * Get the minimum Y coordinate
     * @returns {number}
     */
    getMinY() {
        return this.y;
    }

    /**
     * Get the maximum X coordinate
     * @returns {number}
     */
    getMaxX() {
        return this.x + this.width;
    }

    /**
     * Get the maximum Y coordinate
     * @returns {number}
     */
    getMaxY() {
        return this.y + this.height;
    }

    /**
     * Get the center X coordinate
     * @returns {number}
     */
    getCenterX() {
        return (this.x + this.width) / 2;
    }

    /**
     * Get the center Y coordinate
     * @returns {number}
     */
    getCenterY() {
        return (this.y + this.height) / 2;
    }

    /**
     * Check if the rectangle is empty (zero or negative width/height)
     * @returns {boolean}
     */
    isEmpty() {
        return this.width <= 0 || this.height <= 0;
    }

    /**
     * Set the rectangle from diagonal coordinates
     * @param {number} x1 - First corner X
     * @param {number} y1 - First corner Y
     * @param {number} x2 - Second corner X
     * @param {number} y2 - Second corner Y
     */
    setFrameFromDiagonal(x1, y1, x2, y2) {
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const maxX = Math.max(x1, x2);
        const maxY = Math.max(y1, y2);
        
        this.x = minX;
        this.y = minY;
        this.width = maxX - minX;
        this.height = maxY - minY;
    }

    /**
     * Set the rectangle bounds
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    setFrame(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /**
     * Test if a point is inside the rectangle
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    contains(x, y) {
        return x >= this.x && x < this.getMaxX() && 
               y >= this.y && y < this.getMaxY();
    }

    /**
     * Test if another rectangle is completely inside this rectangle
     * @param {Rectangle2D} rect
     * @returns {boolean}
     */
    containsRect(rect) {
        return this.contains(rect.getMinX(), rect.getMinY()) &&
               this.contains(rect.getMaxX(), rect.getMaxY());
    }

    /**
     * Test if this rectangle intersects with another rectangle
     * @param {Rectangle2D} rect
     * @returns {boolean}
     */
    intersects(rect) {
        return !(rect.getMaxX() <= this.x || rect.getMinX() >= this.getMaxX() ||
                 rect.getMaxY() <= this.y || rect.getMinY() >= this.getMaxY());
    }

    /**
     * Create the union of this rectangle with another
     * @param {Rectangle2D} rect
     * @returns {Rectangle2D}
     */
    union(rect) {
        const minX = Math.min(this.getMinX(), rect.getMinX());
        const minY = Math.min(this.getMinY(), rect.getMinY());
        const maxX = Math.max(this.getMaxX(), rect.getMaxX());
        const maxY = Math.max(this.getMaxY(), rect.getMaxY());
        
        return new Rectangle2D(minX, minY, maxX - minX, maxY - minY);
    }

    /**
     * Test for equality
     * @param {Rectangle2D} other
     * @returns {boolean}
     */
    equals(other) {
        return other instanceof Rectangle2D &&
               this.x === other.x &&
               this.y === other.y &&
               this.width === other.width &&
               this.height === other.height;
    }

    /**
     * Create a copy of this rectangle
     * @returns {Rectangle2D}
     */
    clone() {
        return new Rectangle2D(this.x, this.y, this.width, this.height);
    }

    toString() {
        return `Rectangle2D[x=${this.x}, y=${this.y}, width=${this.width}, height=${this.height}]`;
    }
}

/**
 * Convenience subclass for double precision rectangles 
 * (equivalent to Java's Rectangle2D.Double)
 */
export class Double extends Rectangle2D {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        super(x, y, width, height);
    }
}

// Add Double as a static property for Java-like usage
Rectangle2D.Double = Double;

// Default export for convenience
export default Rectangle2D;
