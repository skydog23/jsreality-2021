/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { ToolEvent } from './ToolEvent.js';
import { AxisState } from './AxisState.js';

/**
 * @typedef {import('./InputSlot.js').InputSlot} InputSlot
 * @typedef {import('./MissingSlotException.js').MissingSlotException} MissingSlotException
 */

/**
 * Context provided to virtual devices during processing.
 * Provides access to the current event and device states.
 * @interface
 */
export class VirtualDeviceContext {
  /**
   * Get the current tool event being processed.
   * @returns {ToolEvent} The current event
   */
  getEvent() {
    throw new Error('Method not implemented');
  }

  /**
   * Get the axis state for a slot.
   * @param {InputSlot} slot - The input slot
   * @returns {AxisState} The axis state
   * @throws {MissingSlotException} If the slot is not available
   */
  getAxisState(slot) {
    throw new Error('Method not implemented');
  }

  /**
   * Get the transformation matrix for a slot.
   * @param {InputSlot} slot - The input slot
   * @returns {number[]} 4x4 transformation matrix
   * @throws {MissingSlotException} If the slot is not available
   */
  getTransformationMatrix(slot) {
    throw new Error('Method not implemented');
  }
}

