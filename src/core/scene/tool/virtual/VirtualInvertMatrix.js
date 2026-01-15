/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.toolsystem.virtual.VirtualInvertMatrix.

import { ToolEvent } from '../ToolEvent.js';
import * as Rn from '../../../math/Rn.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualInvertMatrix {
  /** @type {InputSlot|null} */
  #matrixIn = null;

  /** @type {InputSlot|null} */
  #outSlot = null;

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#matrixIn === null || this.#outSlot === null) return null;
    const e = context.getEvent();
    const matrix = context.getTransformationMatrix(this.#matrixIn);
    const inverse = Rn.inverse(null, matrix);
    return ToolEvent.createWithTransformation(e.getSource(), e.getTimeStamp(), this.#outSlot, inverse);
  }

  /**
   * @param {InputSlot[]} inputSlots
   * @param {InputSlot} result
   * @param {Object|Map<string, Object>|null} configuration
   */
  initialize(inputSlots, result, configuration) {
    this.#outSlot = result;
    this.#matrixIn = inputSlots[0] || null;
  }

  dispose() {
    // No resources.
  }

  getName() {
    return 'InvertMatrix';
  }
}


