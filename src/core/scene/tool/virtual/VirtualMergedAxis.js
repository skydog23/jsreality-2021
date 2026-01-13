/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.toolsystem.virtual.VirtualMergedAxis.
// out = plus.intValue - minus.intValue

import { ToolEvent } from '../ToolEvent.js';
import { AxisState } from '../AxisState.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualMergedAxis {
  /** @type {InputSlot|null} */
  #inPlus = null;

  /** @type {InputSlot|null} */
  #inMinus = null;

  /** @type {InputSlot|null} */
  #outSlot = null;

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#inMinus === null || this.#inPlus === null || this.#outSlot === null) return null;

    const e = context.getEvent();
    const t = e.getTimeStamp();

    // jReality uses "null ? ORIGIN" here; in JS, MissingSlotException means "not available".
    let minus = AxisState.ORIGIN;
    let plus = AxisState.ORIGIN;
    try {
      minus = context.getAxisState(this.#inMinus);
    } catch (err) {
      minus = AxisState.ORIGIN;
    }
    try {
      plus = context.getAxisState(this.#inPlus);
    } catch (err) {
      plus = AxisState.ORIGIN;
    }

    return new ToolEvent(
      e.getSource(),
      t,
      this.#outSlot,
      new AxisState(plus.intValue() - minus.intValue())
    );
  }

  /**
   * @param {InputSlot[]} inputSlots
   * @param {InputSlot} result
   * @param {Object|Map<string, Object>|null} configuration
   */
  initialize(inputSlots, result, configuration) {
    this.#inMinus = inputSlots[0] || null;
    this.#inPlus = inputSlots[1] || null;
    this.#outSlot = result;
  }

  dispose() {
    // No resources.
  }

  getName() {
    return 'MergedAxis';
  }
}


