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
 * Represents a button or a double value for tools.
 * Values are stored as integers internally, with double values in range [-1, 1]
 * mapped to integer range [-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER].
 */
export class AxisState {
  /** Pressed state (maximum positive value) */
  static PRESSED = new AxisState(Number.MAX_SAFE_INTEGER);
  
  /** Origin/released state (zero) */
  static ORIGIN = new AxisState(0);
  
  /** @type {number} Internal state value */
  #state;
  
  /** @type {number} Minimum pressed state (maximum negative value) */
  static #MINUS_PRESSED = -Number.MAX_SAFE_INTEGER;
  
  /**
   * Create an AxisState from a double or integer value.
   * 
   * In Java, there are two constructors:
   * - AxisState(double value): clamps to [-1, 1] and converts
   * - AxisState(int value): stores integer directly
   * 
   * In JavaScript, we distinguish by magnitude:
   * - Small numbers (abs <= 100): treat as double, clamp to [-1, 1] and convert
   * - Large integers (abs > 100 and whole number): store directly
   * 
   * @param {number} value - Double value or integer value
   */
  constructor(value) {
    if (typeof value === 'number') {
      const absValue = Math.abs(value);
      const isWholeNumber = value === Math.floor(value);
      
      // Large whole numbers (like Integer.MAX_VALUE, 1000, etc.) are stored directly
      // Small numbers (like 0.5, 2.0, -1.5) are clamped and converted
      if (absValue > 100 && isWholeNumber) {
        // Large integer: store directly (e.g., Integer.MAX_VALUE, 1000)
        this.#state = value;
      } else {
        // Small number or non-whole: treat as double, clamp to [-1, 1] and convert
        let clampedValue = value;
        if (value < -1) clampedValue = -1;
        if (value > 1) clampedValue = 1;
        this.#state = Math.floor(clampedValue * Number.MAX_SAFE_INTEGER);
      }
    } else {
      // Non-number type: assume integer value
      this.#state = value;
    }
  }
  
  /**
   * Get the integer value of this axis state
   * @returns {number} Integer value
   */
  intValue() {
    return this.#state;
  }
  
  /**
   * Get the double value of this axis state (in range [-1, 1])
   * @returns {number} Double value
   */
  doubleValue() {
    return this.#state / Number.MAX_SAFE_INTEGER;
  }
  
  /**
   * Returns true if the double value is 1 or -1 (pressed state)
   * @returns {boolean} True if pressed
   */
  isPressed() {
    return this.#state === Number.MAX_SAFE_INTEGER || this.#state === AxisState.#MINUS_PRESSED;
  }
  
  /**
   * Returns true if the state is zero (released/origin)
   * @returns {boolean} True if released
   */
  isReleased() {
    return this.#state === 0;
  }
  
  /**
   * String representation of this axis state
   * @returns {string} String representation
   */
  toString() {
    if (this.#state === 0) {
      return "AxisState=ORIGIN";
    } else if (this.#state === Number.MAX_SAFE_INTEGER) {
      return "AxisState=PRESSED";
    } else if (this.#state === AxisState.#MINUS_PRESSED) {
      return "AxisState=MINUS_PRESSED";
    } else {
      const doubleVal = this.doubleValue();
      const rounded = Math.round(doubleVal * 100) / 100;
      return `AxisState=${this.#state} [${rounded}]`;
    }
  }
}
