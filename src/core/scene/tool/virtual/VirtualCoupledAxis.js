/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.toolsystem.virtual.VirtualCoupledAxis.
// Output is PRESSED iff all input slots are PRESSED.

import { ToolEvent } from '../ToolEvent.js';
import { AxisState } from '../AxisState.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualCoupledAxis {
  /** @type {InputSlot[]} */
  #inSlots = [];

  /** @type {InputSlot|null} */
  #outSlot = null;

  /** @type {boolean} */
  #currentState = false;

  /** @type {boolean} */
  #initialized = false;

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#outSlot === null || this.#inSlots.length === 0) return null;

    const e = context.getEvent();
    const t = e.getTimeStamp();

    if (!this.#initialized) {
      this.#initialized = true;
      return new ToolEvent(e.getSource(), t, this.#outSlot, AxisState.ORIGIN);
    }

    let state = true;
    for (const slot of this.#inSlots) {
      state = state && context.getAxisState(slot).isPressed();
      if (!state) break;
    }

    if (state !== this.#currentState) {
      this.#currentState = state;
      const te = new ToolEvent(
        e.getSource(),
        t,
        this.#outSlot,
        this.#currentState ? AxisState.PRESSED : AxisState.ORIGIN
      );

      // Mirror the slightly odd Java consume rule.
      const firstSlot = this.#inSlots[0];
      if (e.getInputSlot() === firstSlot || context.getAxisState(firstSlot).isPressed()) {
        e.consume();
      }
      return te;
    }

    return null;
  }

  /**
   * @param {InputSlot[]} inputSlots
   * @param {InputSlot} result
   * @param {Object|Map<string, Object>|null} configuration
   */
  initialize(inputSlots, result, configuration) {
    this.#inSlots = [...inputSlots];
    this.#outSlot = result;
    this.#currentState = false;
    this.#initialized = false;
  }

  dispose() {
    // No resources.
  }

  getName() {
    return 'CoupledAxis';
  }
}


