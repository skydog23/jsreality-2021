/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.toolsystem.virtual.VirtualProductMatrix.

import { ToolEvent } from '../ToolEvent.js';
import * as Rn from '../../../math/Rn.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualProductMatrix {
  /** @type {InputSlot|null} */
  #leftSlot = null;

  /** @type {InputSlot|null} */
  #rightSlot = null;

  /** @type {InputSlot|null} */
  #productSlot = null;

  /** @type {number[]} */
  #product = Rn.identityMatrix(4);

  /** @type {number[]} */
  #matrixL = Rn.identityMatrix(4);

  /** @type {number[]} */
  #matrixR = Rn.identityMatrix(4);

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#leftSlot === null || this.#rightSlot === null || this.#productSlot === null) return null;

    const e = context.getEvent();
    const matrixLeft = context.getTransformationMatrix(this.#leftSlot);
    const matrixRight = context.getTransformationMatrix(this.#rightSlot);

    // Keep local copies (mirrors Java arrays being reused).
    this.#matrixL = [...matrixLeft];
    this.#matrixR = [...matrixRight];

    this.#product = Rn.times(this.#product, this.#matrixL, this.#matrixR);
    return ToolEvent.createWithTransformation(e.getSource(), e.getTimeStamp(), this.#productSlot, this.#product);
  }

  /**
   * @param {InputSlot[]} inputSlots
   * @param {InputSlot} result
   * @param {Object|Map<string, Object>|null} configuration
   */
  initialize(inputSlots, result, configuration) {
    this.#productSlot = result;
    this.#leftSlot = inputSlots[0] || null;
    this.#rightSlot = inputSlots[1] || null;
    Rn.setIdentityMatrix(this.#product);
    Rn.setIdentityMatrix(this.#matrixL);
    Rn.setIdentityMatrix(this.#matrixR);
  }

  dispose() {
    // No resources.
  }

  getName() {
    return 'ProductMatrix';
  }
}


