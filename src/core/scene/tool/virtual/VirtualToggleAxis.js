/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.toolsystem.virtual.VirtualToggleAxis.

import { ToolEvent } from '../ToolEvent.js';
import { AxisState } from '../AxisState.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualToggleAxis {
  /** @type {InputSlot|null} */
  #inSlot = null;

  /** @type {InputSlot|null} */
  #outSlot = null;

  /** @type {boolean} */
  #pressed = false;

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#inSlot === null || this.#outSlot === null) return null;

    const e = context.getEvent();
    const t = e.getTimeStamp();

    if (e.getInputSlot() === this.#inSlot) {
      const inState = context.getAxisState(this.#inSlot);
      if (inState.isPressed()) {
        this.#pressed = !this.#pressed;
        return null;
      }
      // On release: emit the toggled value.
      return new ToolEvent(
        e.getSource(),
        t,
        this.#outSlot,
        this.#pressed ? AxisState.PRESSED : AxisState.ORIGIN
      );
    }

    // Java branch for "source == out" (only relevant if this device is also triggered on outSlot).
    const outState = context.getAxisState(this.#outSlot);
    if (outState.isReleased() && this.#pressed) this.#pressed = false;
    return null;
  }

  /**
   * @param {InputSlot[]} inputSlots
   * @param {InputSlot} result
   * @param {Object|Map<string, Object>|null} configuration
   */
  initialize(inputSlots, result, configuration) {
    this.#inSlot = inputSlots[0] || null;
    this.#outSlot = result;
    this.#pressed = false;
  }

  dispose() {
    // No resources.
  }

  getName() {
    return 'ToggleAxis';
  }
}


