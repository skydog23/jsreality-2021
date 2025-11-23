/**
 * JavaScript port/translation of jReality's HitFilter interface.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/** @typedef {import('./PickResult.js').PickResult} PickResult */

/**
 * Interface for filtering pick results.
 * 
 * @interface
 */
export class HitFilter {
  /**
   * Determine if a pick result should be accepted
   * @param {number[]} from - Ray start point in world coordinates
   * @param {number[]} to - Ray end point in world coordinates
   * @param {PickResult} h - The pick result to filter
   * @returns {boolean} True if the hit should be accepted, false otherwise
   */
  accept(from, to, h) {
    throw new Error('accept() must be implemented');
  }
}

