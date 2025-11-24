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
import { ToolEventQueue } from './ToolEventQueue.js';
import { InputSlot } from './InputSlot.js';

/**
 * @typedef {import('../Viewer.js').Viewer} Viewer
 * @typedef {import('./ToolEvent.js').ToolEvent} ToolEvent
 * @typedef {import('./ToolEventQueue.js').ToolEventQueue} ToolEventQueue
 * @typedef {import('./InputSlot.js').InputSlot} InputSlot
 */

/**
 * Interface for raw input devices (mouse, keyboard, etc.).
 * Raw devices convert hardware input into ToolEvents.
 * @interface
 */
export class RawDevice {
  /**
   * Set the event queue for posting events.
   * @param {ToolEventQueue} queue - The event queue
   */
  setEventQueue(queue) {
    throw new Error('Method not implemented');
  }

  /**
   * Initialize the raw device.
   * @param {Viewer} viewer - The viewer
   * @param {Object} config - Configuration map
   */
  initialize(viewer, config) {
    throw new Error('Method not implemented');
  }

  /**
   * Map a raw device slot to an input slot.
   * Returns a ToolEvent representing a reasonable initial value for the mapping.
   * @param {string} rawDeviceName - The raw device slot name
   * @param {InputSlot} inputDevice - The target input slot
   * @returns {ToolEvent} Initial tool event
   */
  mapRawDevice(rawDeviceName, inputDevice) {
    throw new Error('Method not implemented');
  }

  /**
   * Dispose of the raw device.
   */
  dispose() {
    throw new Error('Method not implemented');
  }

  /**
   * Get the name of this raw device.
   * @returns {string} Device name
   */
  getName() {
    throw new Error('Method not implemented');
  }
}

