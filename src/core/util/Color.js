/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * A minimal Color class equivalent to java.awt.Color for jsReality JavaScript translation.
 * Represents colors as RGBA values with utilities for common operations.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
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
     * @param {number} [max=255.0] 
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
    fromFloatArray(floatArray, max = 255.0) {
        // Back-compat instance wrapper; prefer the static form.
        return Color.fromFloatArray(floatArray, max);
    }

    /**
     * Create a Color from a float array `[r,g,b]` or `[r,g,b,a]` with components in range [0,1].
     * @param {number[]} floatArray
     * @param {number} [max=255.0] scale factor to convert floats to 0..255 (defaults 255)
     * @returns {Color}
     */
    static fromFloatArray(floatArray, max = 255.0) {
        if (!Array.isArray(floatArray) && !(floatArray instanceof Float32Array) && !(floatArray instanceof Float64Array)) {
            throw new Error('Color.fromFloatArray: expected an array');
        }
        const n = floatArray.length;
        if (n !== 3 && n !== 4) {
            throw new Error(`Color.fromFloatArray: expected length 3 or 4 (got ${n})`);
        }
        const r = Number(floatArray[0]) * max;
        const g = Number(floatArray[1]) * max;
        const b = Number(floatArray[2]) * max;
        const a = n === 4 ? Number(floatArray[3]) * max : 255;
        return new Color(r, g, b, a);
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
        return Color.fromFloatArray([r, g, b, a]);
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
     * An optimized version of toCSSColor for float arrays normalized to [0,1]
     * @param {} floatArray 
     * @returns 
     */
    static floatArrayToCSSColor(floatArray) {
         const n = floatArray.length;
         if (n !== 3 && n !== 4) return String(floatArray);
         const r = Math.round(Number(floatArray[0]) * 255);
         const g = Math.round(Number(floatArray[1]) * 255);
         const b = Math.round(Number(floatArray[2]) * 255);
         // CSS alpha expects 0..1 (do NOT scale by 255).
         const a = n === 4 ? Number(floatArray[3]) : 1.0;
         return n === 3 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    /**
     * Static utility to convert any color value to CSS string
     * Handles Color objects, strings, arrays, etc.
     * @param {*} colorValue - Color object, string, or other value
     * @returns {string} CSS color string
     */
    static toCSSColor(colorValue) {
        // Accept numeric arrays:
        // - [r,g,b] or [r,g,b,a]
        // - either byte RGB (0..255) or normalized float RGB (0..1)
        // - alpha may be 0..1 (preferred for CSS) or 0..255 (legacy)
        //
        // This is important because geometry colors coming from DataLists are now
        // normalized float[4] in [0,1] (see DataUtility.toDataList Color normalization).
        if (Array.isArray(colorValue)) {
            const n = colorValue.length;
            if (n === 3 || n === 4) {
                const r0 = Number(colorValue[0]);
                const g0 = Number(colorValue[1]);
                const b0 = Number(colorValue[2]);
                const a0 = n === 4 ? Number(colorValue[3]) : 1.0;

                // Heuristic: if all channels are <= 1, treat as normalized.
                const max = Math.max(r0, g0, b0, a0);
                const isNormalized = Number.isFinite(max) && max <= 1.0;

                const r = isNormalized ? Math.round(r0 * 255) : Math.round(r0);
                const g = isNormalized ? Math.round(g0 * 255) : Math.round(g0);
                const b = isNormalized ? Math.round(b0 * 255) : Math.round(b0);

                // CSS alpha is 0..1. If input looks like 0..255 bytes, normalize it.
                const a = (n === 4)
                    ? (isNormalized ? a0 : (a0 > 1.0 ? (a0 / 255) : a0))
                    : 1.0;

                if (n === 3) {
                    return `rgb(${r}, ${g}, ${b})`;
                }
                return `rgba(${r}, ${g}, ${b}, ${a})`;
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
