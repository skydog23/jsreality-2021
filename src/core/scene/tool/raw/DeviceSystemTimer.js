/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { RawDevice } from '../RawDevice.js';
import { PollingDevice } from './PollingDevice.js';
import { ToolEvent } from '../ToolEvent.js';
import { ToolEventQueue } from '../ToolEventQueue.js';
import { InputSlot } from '../InputSlot.js';
import { AxisState } from '../AxisState.js';

/**
 * @typedef {import('../ToolEventQueue.js').ToolEventQueue} ToolEventQueue
 * @typedef {import('../../Viewer.js').Viewer} Viewer
 */

/**
 * Custom ToolEvent for system timer that accumulates time deltas.
 * Note: In the browser environment, timer events are typically processed
 * quickly enough that accumulation may not be necessary, but we keep
 * the structure similar to the Java version for consistency.
 */
class SystemTimerEvent extends ToolEvent {
  /**
   * @param {Object} source - Source object
   * @param {number} when - Timestamp
   * @param {InputSlot} device - Input slot
   * @param {AxisState} axis - Axis state (time delta)
   */
  constructor(source, when, device, axis) {
    super(source, when, device, axis);
  }

  /**
   * Check if this event can replace another event.
   * Timer events can replace each other if they're for the same slot.
   * @param {ToolEvent} e - The other event
   * @returns {boolean} True if replaceable
   * @protected
   */
  canReplace(e) {
    return this.getInputSlot() === e.getInputSlot() &&
           this.getSource() === e.getSource();
  }
}

/**
 * System timer device implementation.
 * Generates time delta events for system time tracking.
 * @implements {RawDevice}
 * @implements {PollingDevice}
 */
export class DeviceSystemTimer {
  /** @type {ToolEventQueue|null} */
  #queue = null;

  /** @type {InputSlot|null} */
  #device = null;

  /** @type {number} */
  #lastEvent = -1;

  /**
   * Map a raw device slot to an input slot.
   * @param {string} rawDeviceName - Raw device name (must be "tick")
   * @param {InputSlot} inputDevice - Target input slot
   * @returns {ToolEvent} Initial tool event
   */
  mapRawDevice(rawDeviceName, inputDevice) {
    if (rawDeviceName !== 'tick') {
      throw new Error(`Unknown raw device: ${rawDeviceName}`);
    }
    this.#device = inputDevice;
    return new SystemTimerEvent(this, Date.now(), inputDevice, AxisState.ORIGIN);
  }

  /**
   * Set the event queue.
   * @param {ToolEventQueue} queue - The event queue
   */
  setEventQueue(queue) {
    this.#queue = queue;
  }

  /**
   * Poll for timer events.
   * Generates time delta events.
   * @param {number} when - Current timestamp
   */
  poll(when) {
    if (this.#queue === null || this.#device === null) return;
    
    const delta = this.#lastEvent === -1 ? 0 : when - this.#lastEvent;
    this.#lastEvent = when;
    
    // Create axis state from delta (in milliseconds)
    // Store delta as a normalized value in [-1, 1] range
    // For typical frame rates (16-33ms), normalize to reasonable range
    const deltaNormalized = Math.min(delta / 1000.0, 1.0); // Normalize to seconds, cap at 1
    const axisState = new AxisState(deltaNormalized);
    
    const event = new SystemTimerEvent(this, when, this.#device, axisState);
    this.#queue.addEvent(event);
  }

  /**
   * Initialize the timer device.
   * @param {Viewer} viewer - The viewer (unused)
   * @param {Object} config - Configuration map (unused)
   */
  initialize(viewer, config) {
    // No initialization needed
  }

  /**
   * Dispose of the timer device.
   */
  dispose() {
    // No cleanup needed
  }

  /**
   * Get the name of this device.
   * @returns {string} Device name
   */
  getName() {
    return 'SystemTimer';
  }

  /**
   * Get string representation.
   * @returns {string} String representation
   */
  toString() {
    return 'RawDevice: SystemTimer';
  }
}

