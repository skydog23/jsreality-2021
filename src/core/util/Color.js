/**
 * A minimal Color class equivalent to java.awt.Color for jReality JavaScript translation.
 * Represents colors as RGBA values with utilities for common operations.
 * 
 * @author JavaScript translation
 */

export class Color {
    /**
     * Create a Color instance.
     * @param {number} r - Red component (0-255)
     * @param {number} g - Green component (0-255) 
     * @param {number} b - Blue component (0-255)
     * @param {number} [a=255] - Alpha component (0-255)
     */
    constructor(r, g, b, a = 255) {
        this.r = Math.max(0, Math.min(255, Math.round(r)));
        this.g = Math.max(0, Math.min(255, Math.round(g)));
        this.b = Math.max(0, Math.min(255, Math.round(b)));
        this.a = Math.max(0, Math.min(255, Math.round(a)));
    }

    /**
     * Get red component as float (0.0-1.0)
     * @returns {number}
     */
    getRed() {
        return this.r / 255.0;
    }

    /**
     * Get green component as float (0.0-1.0)
     * @returns {number}
     */
    getGreen() {
        return this.g / 255.0;
    }

    /**
     * Get blue component as float (0.0-1.0)
     * @returns {number}
     */
    getBlue() {
        return this.b / 255.0;
    }

    /**
     * Get alpha component as float (0.0-1.0)
     * @returns {number}
     */
    getAlpha() {
        return this.a / 255.0;
    }

    /**
     * Convert to CSS color string
     * @returns {string}
     */
    toCSSString() {
        if (this.a === 255) {
            return `rgb(${this.r}, ${this.g}, ${this.b})`;
        } else {
            return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a / 255})`;
        }
    }

    /**
     * Convert to hex string
     * @returns {string}
     */
    toHexString() {
        const toHex = (n) => n.toString(16).padStart(2, '0');
        return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
    }

    /**
     * Create Color from float RGB values (0.0-1.0)
     * @param {number} r
     * @param {number} g 
     * @param {number} b
     * @param {number} [a=1.0]
     * @returns {Color}
     */
    static fromFloats(r, g, b, a = 1.0) {
        return new Color(r * 255, g * 255, b * 255, a * 255);
    }

    /**
     * Test for equality
     * @param {Color} other
     * @returns {boolean}
     */
    equals(other) {
        return other instanceof Color && 
               this.r === other.r && 
               this.g === other.g && 
               this.b === other.b && 
               this.a === other.a;
    }

    /**
     * Create a copy of this color
     * @returns {Color}
     */
    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }

    toString() {
        return `Color(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }
}

// Common color constants matching Java's Color class
export const BLACK = new Color(0, 0, 0);
export const BLUE = new Color(0, 0, 255);
export const CYAN = new Color(0, 255, 255);
export const DARK_GRAY = new Color(64, 64, 64);
export const GRAY = new Color(128, 128, 128);
export const GREEN = new Color(0, 255, 0);
export const LIGHT_GRAY = new Color(192, 192, 192);
export const MAGENTA = new Color(255, 0, 255);
export const ORANGE = new Color(255, 200, 0);
export const PINK = new Color(255, 175, 175);
export const RED = new Color(255, 0, 0);
export const WHITE = new Color(255, 255, 255);
export const YELLOW = new Color(255, 255, 0);

// Default export for convenience
export default Color;
