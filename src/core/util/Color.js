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
     * 
     * @param {number} max 
     * @returns {number[]} [r, g, b, a] in range [0, 1]
     */
    toFloatArray(max = 255.0) {
        return [this.r / max, this.g / max, this.b / max, this.a / max];
    }

    /**
     * 
     * @param {number[]} floatArray 
     * @returns {Color}
     */
    fromFloatArray(floatArray) {
        return floatArray.length === 3 ? 
        new Color(floatArray[0] * max, floatArray[1] * max, floatArray[2] * max) : 
        new Color(floatArray[0] * max, floatArray[1] * max, floatArray[2] * max, floatArray[3] * max);
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
        return fromFloatArray([r, g, b, a]);
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

    /**
     * Static utility to convert any color value to CSS string
     * Handles Color objects, strings, arrays, etc.
     * @param {*} colorValue - Color object, string, or other value
     * @returns {string} CSS color string
     */
    static toCSSColor(colorValue) {
        if (colorValue instanceof Array) { 
            const n = colorValue.length;
            if (n === 3) {
                return `rgb(${colorValue[0]}, ${colorValue[1]}, ${colorValue[2]})`;
            } else if (n === 4) {
                return `rgba(${colorValue[0]}, ${colorValue[1]}, ${colorValue[2]}, ${colorValue[3]})`;
            }
        } else if (colorValue && typeof colorValue.toCSSString === 'function') {
            return colorValue.toCSSString();
        }
        return String(colorValue);
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

// Add constants as static properties to Color class for Java-like API (Color.RED, etc.)
Color.BLACK = BLACK;
Color.BLUE = BLUE;
Color.CYAN = CYAN;
Color.DARK_GRAY = DARK_GRAY;
Color.GRAY = GRAY;
Color.GREEN = GREEN;
Color.LIGHT_GRAY = LIGHT_GRAY;
Color.MAGENTA = MAGENTA;
Color.ORANGE = ORANGE;
Color.PINK = PINK;
Color.RED = RED;
Color.WHITE = WHITE;
Color.YELLOW = YELLOW;
// PURPLE is an alias for MAGENTA (common name)
Color.PURPLE = MAGENTA;

// Default export for convenience
export default Color;
