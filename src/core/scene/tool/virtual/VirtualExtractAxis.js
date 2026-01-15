/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.toolsystem.virtual.VirtualExtractAxis.
// Extracts a single matrix entry (e.g. translationX/Y/Z) as an axis value.

import { ToolEvent } from '../ToolEvent.js';
import { AxisState } from '../AxisState.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualExtractAxis {
  /** @type {InputSlot|null} */
  #inSlot = null;

  /** @type {InputSlot|null} */
  #outSlot = null;

  /** @type {number} */
  #index = -1;

  /** @type {number} */
  #gain = 1;

  // Fields present in the Java version but currently unused in the algorithm.
  /** @type {number} */
  #maxVal = 1;

  /** @type {AxisState|null} */
  #state = null;

  /** @type {number} */
  #lastVal = Number.POSITIVE_INFINITY;

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#inSlot === null || this.#outSlot === null) return null;
    if (this.#index === -1) return null;

    const e = context.getEvent();
    const trafo = context.getTransformationMatrix(this.#inSlot);
    const newVal = this.#gain * trafo[this.#index];
    this.#lastVal = newVal;

    return new ToolEvent(e.getSource(), e.getTimeStamp(), this.#outSlot, new AxisState(newVal));
  }

  /**
   * @param {InputSlot[]} inputSlots
   * @param {InputSlot} result
   * @param {Object|Map<string, Object>|null} configuration
   */
  initialize(inputSlots, result, configuration) {
    this.#inSlot = inputSlots[0] || null;
    this.#outSlot = result;
    this.#index = -1;
    this.#gain = 1;

    const cfg = configuration && typeof configuration === 'object' ? configuration : null;
    const gain = cfg && /** @type {*} */ (cfg).gain;
    if (typeof gain === 'number' && Number.isFinite(gain)) {
      this.#gain = gain;
    }

    const axis = cfg && /** @type {*} */ (cfg).axis;
    if (axis === 'translationX') {
      this.#index = 3;
      return;
    }
    if (axis === 'translationY') {
      this.#index = 7;
      return;
    }
    if (axis === 'translationZ') {
      this.#index = 11;
      return;
    }

    const index = cfg && /** @type {*} */ (cfg).index;
    if (typeof index === 'number' && Number.isInteger(index)) {
      this.#index = index;
      return;
    }

    // Keep the Java behavior of throwing on unsupported config strings.
    if (cfg && axis !== undefined && typeof axis === 'string') {
      throw new Error('unsupported config string');
    }
  }

  dispose() {
    // No resources.
  }

  getName() {
    return 'ExtractAxis';
  }
}


