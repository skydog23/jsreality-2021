/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.toolsystem.virtual.VirtualExtractTranslationTrafo.
// Extracts the translation components (x,y,z) from an input transformation matrix
// and outputs them as a pure translation matrix.

import { ToolEvent } from '../ToolEvent.js';
import { MissingSlotException } from '../MissingSlotException.js';
import * as Rn from '../../../math/Rn.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualExtractTranslationTrafo {
  /** @type {InputSlot|null} */
  #inSlot = null;

  /** @type {InputSlot|null} */
  #outSlot = null;

  /** @type {number[]} */
  #slotValue = Rn.identityMatrix(4);

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#inSlot === null || this.#outSlot === null) return null;
    try {
      const inTrafo = context.getTransformationMatrix(this.#inSlot);
      // Keep matrix as identity except translation entries.
      this.#slotValue[3] = inTrafo[3];
      this.#slotValue[7] = inTrafo[7];
      this.#slotValue[11] = inTrafo[11];
      return ToolEvent.createWithTransformation(
        context.getEvent().getSource(),
        context.getEvent().getTimeStamp(),
        this.#outSlot,
        this.#slotValue
      );
    } catch (e) {
      throw new MissingSlotException(this.#inSlot);
    }
  }

  /**
   * @param {InputSlot[]} inputSlots
   * @param {InputSlot} result
   * @param {Object|Map<string, Object>|null} configuration
   */
  initialize(inputSlots, result, configuration) {
    this.#inSlot = inputSlots[0] || null;
    this.#outSlot = result;
    Rn.setIdentityMatrix(this.#slotValue);
  }

  dispose() {
    // No resources.
  }

  getName() {
    return 'ExtractTranslationTrafo';
  }
}


