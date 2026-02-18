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
 * Interface-like base class for discrete-group constraints.
 */
export class DiscreteGroupConstraint {
  /**
   * @param {import('./DiscreteGroupElement.js').DiscreteGroupElement} _dge
   * @returns {boolean}
   */
  acceptElement(_dge) {
    throw new Error('DiscreteGroupConstraint.acceptElement() must be implemented');
  }

  /**
   * @returns {number}
   */
  getMaxNumberElements() {
    throw new Error('DiscreteGroupConstraint.getMaxNumberElements() must be implemented');
  }

  /**
   * @param {number} _i
   */
  setMaxNumberElements(_i) {
    throw new Error('DiscreteGroupConstraint.setMaxNumberElements() must be implemented');
  }

  update() {
    // Optional for subclasses.
  }
}

