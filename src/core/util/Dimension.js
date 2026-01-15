/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
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

