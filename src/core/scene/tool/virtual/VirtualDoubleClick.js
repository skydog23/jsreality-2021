/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.toolsystem.virtual.VirtualDoubleClick.

import { ToolEvent } from '../ToolEvent.js';
import { AxisState } from '../AxisState.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualDoubleClick {
  /** @type {InputSlot|null} */
  #inSlot = null;

  /** @type {InputSlot|null} */
  #outSlot = null;

  /** @type {number} */
  #maxDelay = 300;

  /** @type {boolean} */
  #releaseOnNextRelease = false;

  /** @type {number} */
  #lastClickTime = -1;

  /** @type {boolean} */
  #init = true;

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#inSlot === null || this.#outSlot === null) return null;

    const e = context.getEvent();
    const t = e.getTimeStamp();

    if (this.#init) {
      this.#init = false;
      return new ToolEvent(e.getSource(), t, this.#outSlot, AxisState.ORIGIN);
    }

    if (this.#releaseOnNextRelease) {
      // Java asserts released here; we mirror behavior and reset.
      context.getAxisState(this.#inSlot);
      this.#lastClickTime = -1;
      this.#releaseOnNextRelease = false;
      return new ToolEvent(e.getSource(), t, this.#outSlot, AxisState.ORIGIN);
    }

    const inState = context.getAxisState(this.#inSlot);
    if (inState.isReleased()) return null;

    if (this.#lastClickTime === -1 || (t - this.#lastClickTime) > this.#maxDelay) {
      this.#lastClickTime = t;
      return null;
    }

    this.#releaseOnNextRelease = true;
    return new ToolEvent(e.getSource(), t, this.#outSlot, AxisState.PRESSED);
  }

  /**
   * @param {InputSlot[]} inputSlots
   * @param {InputSlot} result
   * @param {Object|Map<string, Object>|null} configuration
   */
  initialize(inputSlots, result, configuration) {
    this.#inSlot = inputSlots[0] || null;
    this.#outSlot = result;
    this.#releaseOnNextRelease = false;
    this.#lastClickTime = -1;
    this.#init = true;

    const cfg = configuration && typeof configuration === 'object' ? configuration : null;
    const maxDelay = cfg && /** @type {*} */ (cfg).maxDelay;
    if (typeof maxDelay === 'number' && Number.isFinite(maxDelay)) {
      this.#maxDelay = maxDelay;
    }
  }

  dispose() {
    // No resources.
  }

  getName() {
    return 'DoubleClick';
  }
}


