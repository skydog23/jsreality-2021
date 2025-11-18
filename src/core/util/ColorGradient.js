// JavaScript port of jReality's ColorGradient class (from ColorGradient.java)

import { Color } from './Color.js';

/**
 * Utility class for color interpolation/gradients
 */
export class ColorGradient {
  #color = [];
  #time = 0;

  /**
   * Create a color gradient from key colors
   * @param {...Color} keyColors - Array of Color objects defining the gradient
   */
  constructor(...keyColors) {
    if (keyColors.length === 0) {
      // Default gradient: blue -> cyan -> green -> yellow -> red
      keyColors = [Color.BLUE, Color.CYAN, Color.GREEN, Color.YELLOW, Color.RED];
    }

    const range = Array(keyColors.length - 1);

    let totalNumberOfColors = 1;

    for (let k = 0; k < range.length; k++) {
      const redAt0 = keyColors[k].getRed();
      const greenAt0 = keyColors[k].getGreen();
      const blueAt0 = keyColors[k].getBlue();
      const redAt1 = keyColors[k + 1].getRed();
      const greenAt1 = keyColors[k + 1].getGreen();
      const blueAt1 = keyColors[k + 1].getBlue();

      const distRed = Math.abs(redAt0 - redAt1);
      const distGreen = Math.abs(greenAt0 - greenAt1);
      const distBlue = Math.abs(blueAt0 - blueAt1);

      const maxDist = Math.max(distRed, Math.max(distGreen, distBlue));

      totalNumberOfColors += maxDist;

      const denom = maxDist;

      range[k] = Array(maxDist + 1);

      range[k][0] = keyColors[k];
      range[k][maxDist] = keyColors[k + 1];

      for (let i = 1; i < maxDist; i++) {
        const t = i / denom;

        range[k][i] = new Color(
          Math.round((1 - t) * redAt0 + t * redAt1),
          Math.round((1 - t) * greenAt0 + t * greenAt1),
          Math.round((1 - t) * blueAt0 + t * blueAt1)
        );
      }
    }

    this.#color = Array(totalNumberOfColors);

    for (let k = 0, o = 0; k < range.length; o += range[k].length - 1, k++) {
      for (let i = 0; i < range[k].length - 1; i++) {
        this.#color[o + i] = range[k][i];
      }
    }

    this.#color[totalNumberOfColors - 1] = keyColors[keyColors.length - 1];
  }

  /**
   * Get a full periodic color gradient (blue -> cyan -> green -> yellow -> red -> magenta -> blue)
   * @returns {ColorGradient}
   */
  static getFullPeriodicColorGradient() {
    return new ColorGradient(Color.BLUE, Color.CYAN, Color.GREEN, Color.YELLOW, Color.RED, Color.MAGENTA, Color.BLUE);
  }

  /**
   * Get the current time value
   * @returns {number}
   */
  getTime() {
    return this.#time;
  }

  /**
   * Set the current time value
   * @param {number} aDouble
   */
  setTime(aDouble) {
    this.#time = aDouble;
  }

  /**
   * Get color value at current time
   * @returns {Color}
   */
  getColorValue() {
    return this.getColor(this.#time);
  }

  /**
   * Get color at normalized time t (0.0 to 1.0)
   * @param {number} t - Normalized time (0.0 to 1.0)
   * @returns {Color}
   */
  getColor(t) {
    if (t < 0) {
      t = 0;
    }

    if (t > 1) {
      t = 1;
    }

    return this.#color[Math.floor((this.#color.length - 1) * t + 0.5)];
  }

  /**
   * Get all colors in the gradient
   * @returns {Color[]}
   */
  getColors() {
    return [...this.#color];
  }
}

