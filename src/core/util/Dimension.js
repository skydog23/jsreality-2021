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
 * A minimal Dimension class equivalent to java.awt.Dimension for jReality JavaScript translation.
 * Represents a 2D size (width, height).
 */
export class Dimension {
  /**
   * @param {number} [width=0]
   * @param {number} [height=0]
   */
  constructor(width = 0, height = 0) {
    this.width = width;
    this.height = height;
  }

  /**
   * @returns {number}
   */
  getWidth() {
    return this.width;
  }

  /**
   * @returns {number}
   */
  getHeight() {
    return this.height;
  }
}

