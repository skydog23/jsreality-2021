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

/**
 * @typedef {import('./InputSlot.js').InputSlot} InputSlot
 * @typedef {import('./VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 * @typedef {import('./MissingSlotException.js').MissingSlotException} MissingSlotException
 */

/**
 * Interface for virtual devices that compute output slots from input slots.
 * Virtual devices are composed from raw devices and other virtual devices.
 * @interface
 */
export class VirtualDevice {
  /**
   * Process an event and generate a new event for the output slot.
   * @param {VirtualDeviceContext} context - The virtual device context
   * @returns {ToolEvent|null} A new tool event or null if no event should be generated
   * @throws {MissingSlotException} If a required input slot is missing
   */
  process(context) {
    throw new Error('Method not implemented');
  }

  /**
   * Initialize the virtual device.
   * @param {InputSlot[]} inputSlots - List of input slots
   * @param {InputSlot} result - Output slot
   * @param {Map<string, Object>|Object} configuration - Configuration map
   */
  initialize(inputSlots, result, configuration) {
    throw new Error('Method not implemented');
  }

  /**
   * Dispose of the virtual device.
   */
  dispose() {
    throw new Error('Method not implemented');
  }

  /**
   * Get the name of this virtual device.
   * @returns {string} Device name
   */
  getName() {
    throw new Error('Method not implemented');
  }
}

