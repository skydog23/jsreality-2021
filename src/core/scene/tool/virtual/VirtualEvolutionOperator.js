/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.toolsystem.virtual.VirtualEvolutionOperator.
// Computes a delta between successive values:
// - for transformations: delta = newTrafo * inverse(oldTrafo)
// - for axes: delta = newVal - oldVal

import { ToolEvent } from '../ToolEvent.js';
import { AxisState } from '../AxisState.js';
import { MissingSlotException } from '../MissingSlotException.js';
import * as Rn from '../../../math/Rn.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualEvolutionOperator {
  /** @type {boolean} */
  #isAxis = false;

  /** @type {InputSlot|null} */
  #inSlot = null;

  /** @type {InputSlot|null} */
  #outSlot = null;

  /** @type {number} */
  #oldAxis = 0;

  /** @type {number[]|null} */
  #oldTrafo = null;

  /** @type {number[]} */
  #slotValue = Rn.identityMatrix(4);

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#inSlot === null || this.#outSlot === null) return null;

    if (!this.#isAxis) {
      let newTrafo;
      try {
        newTrafo = context.getTransformationMatrix(this.#inSlot);
      } catch (e) {
        throw new MissingSlotException(this.#inSlot);
      }

      if (this.#oldTrafo === null) {
        // First sample initializes the reference.
        this.#oldTrafo = [...newTrafo];
        return null;
      }

      // delta = newTrafo * inverse(oldTrafo)
      const invOld = Rn.inverse(null, this.#oldTrafo);
      Rn.times(this.#slotValue, newTrafo, invOld);
      this.#oldTrafo = [...newTrafo];

      return ToolEvent.createWithTransformation(
        context.getEvent().getSource(),
        context.getEvent().getTimeStamp(),
        this.#outSlot,
        this.#slotValue
      );
    }

    // Axis mode
    let newVal;
    try {
      newVal = context.getAxisState(this.#inSlot).doubleValue();
    } catch (e) {
      throw new MissingSlotException(this.#inSlot);
    }
    const dval = newVal - this.#oldAxis;
    this.#oldAxis = newVal;
    return new ToolEvent(
      context.getEvent().getSource(),
      context.getEvent().getTimeStamp(),
      this.#outSlot,
      new AxisState(dval)
    );
  }

  /**
   * @param {InputSlot[]} inputSlots
   * @param {InputSlot} result
   * @param {Object|Map<string, Object>|null} configuration
   */
  initialize(inputSlots, result, configuration) {
    this.#inSlot = inputSlots[0] || null;
    this.#outSlot = result;
    this.#oldTrafo = null;
    this.#oldAxis = 0;
    this.#isAxis = false;

    // jReality config: { slottype: "axis" } switches to axis mode.
    if (configuration && typeof configuration === 'object') {
      const slotType = /** @type {*} */ (configuration).slottype;
      if (typeof slotType === 'string' && slotType.toLowerCase() === 'axis') {
        this.#isAxis = true;
      }
    }
  }

  dispose() {
    // No resources.
  }

  getName() {
    return 'DeltaTrafo';
  }
}


