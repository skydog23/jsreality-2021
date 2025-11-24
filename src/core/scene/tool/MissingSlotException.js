/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { InputSlot } from './InputSlot.js';

/**
 * Exception thrown when a required input slot is missing.
 */
export class MissingSlotException extends Error {
  /** @type {InputSlot} The missing slot */
  #slot;

  /**
   * Create a new MissingSlotException.
   * @param {InputSlot} slot - The missing slot
   */
  constructor(slot) {
    super(`Missing slot: ${slot.getName()}`);
    this.name = 'MissingSlotException';
    this.#slot = slot;
  }

  /**
   * Get the missing slot.
   * @returns {InputSlot} The missing slot
   */
  getSlot() {
    return this.#slot;
  }
}

