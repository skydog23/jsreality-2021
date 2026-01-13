/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.toolsystem.virtual.VirtualMap.
// Maps a single slot to a different name: forwards all axis/trafo payload.

import { ToolEvent } from '../ToolEvent.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualMap {
  /** @type {InputSlot|null} */
  #inSlot = null;

  /** @type {InputSlot|null} */
  #outSlot = null;

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#outSlot === null) return null;
    const e = context.getEvent();
    return ToolEvent.createFull(
      e.getSource(),
      e.getTimeStamp(),
      this.#outSlot,
      e.getAxisState(),
      e.getTransformation()
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
  }

  dispose() {
    // No resources.
  }

  getName() {
    return 'Map';
  }
}


