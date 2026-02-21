/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
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

