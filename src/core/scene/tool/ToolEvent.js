/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { InputSlot } from './InputSlot.js';
import { AxisState } from './AxisState.js';

/**
 * Represents a tool event with input slot, axis state, and/or transformation matrix.
 * 
 * @typedef {import('./InputSlot.js').InputSlot} InputSlot
 * @typedef {import('./AxisState.js').AxisState} AxisState
 */

/**
 * ToolEvent class representing an input event for tools.
 */
export class ToolEvent {
  /** @type {number} Epsilon for axis state comparison */
  #axisEps = 0;

  /** @type {InputSlot} The input slot/device */
  #device;

  /** @type {AxisState|null} The axis state (for button/value events) */
  #axis;

  /** @type {number[]|null} The transformation matrix (4x4, for transformation events) */
  #trafo;

  /** @type {number} Timestamp of the event */
  #time;

  /** @type {boolean} Whether the event has been consumed */
  #consumed = false;

  /** @type {Object|null} Source object (e.g., DOM event) */
  #source;

  /**
   * Create a ToolEvent with axis state.
   * @param {Object|null} source - Source object (e.g., DOM event)
   * @param {number} when - Timestamp in milliseconds
   * @param {InputSlot} device - The input slot
   * @param {AxisState} axis - The axis state
   */
  constructor(source, when, device, axis) {
    this.#source = source;
    this.#time = when;
    this.#device = device;
    this.#axis = axis;
    this.#trafo = null;
  }

  /**
   * Create a ToolEvent with transformation matrix.
   * @param {Object|null} source - Source object
   * @param {number} when - Timestamp in milliseconds
   * @param {InputSlot} device - The input slot
   * @param {number[]} trafo - 4x4 transformation matrix
   */
  static createWithTransformation(source, when, device, trafo) {
    const event = new ToolEvent(source, when, device, null);
    event.#trafo = trafo;
    return event;
  }

  /**
   * Create a ToolEvent with both axis state and transformation.
   * @param {Object|null} source - Source object
   * @param {number} when - Timestamp in milliseconds
   * @param {InputSlot} device - The input slot
   * @param {AxisState|null} axis - The axis state (optional)
   * @param {number[]|null} trafo - 4x4 transformation matrix (optional)
   */
  static createFull(source, when, device, axis, trafo) {
    const event = new ToolEvent(source, when, device, axis);
    event.#trafo = trafo;
    return event;
  }

  /**
   * Get the input slot for this event.
   * @returns {InputSlot} The input slot
   */
  getInputSlot() {
    return this.#device;
  }

  /**
   * Get the axis state for this event.
   * @returns {AxisState|null} The axis state or null
   */
  getAxisState() {
    return this.#axis;
  }

  /**
   * Get the transformation matrix for this event.
   * @returns {number[]|null} 4x4 transformation matrix or null
   */
  getTransformation() {
    return this.#trafo;
  }

  /**
   * Get the timestamp of this event.
   * @returns {number} Timestamp in milliseconds
   */
  getTimeStamp() {
    return this.#time;
  }

  /**
   * Get the source object for this event.
   * @returns {Object|null} The source object
   */
  getSource() {
    return this.#source;
  }

  /**
   * Replace this event's data with another event's data.
   * @param {ToolEvent} replacement - The replacement event
   * @protected
   */
  replaceWith(replacement) {
    this.#axis = replacement.#axis;
    this.#trafo = replacement.#trafo;
    // Time is not replaced
  }

  /**
   * Check if this event can replace another event.
   * @param {ToolEvent} e - The other event
   * @returns {boolean} True if this event can replace the other
   * @protected
   */
  canReplace(e) {
    return (this.#device === e.#device) &&
      (this.getSource() === e.getSource()) &&
      this.#compareTransformation(this.#trafo, e.#trafo) &&
      this.#compareAxisStates(this.#axis, e.#axis);
  }

  /**
   * Compare two axis states.
   * @param {AxisState|null} axis1 - First axis state
   * @param {AxisState|null} axis2 - Second axis state
   * @returns {boolean} True if they are equivalent
   * @private
   */
  #compareAxisStates(axis1, axis2) {
    if (axis1 === axis2) return true;
    if (axis1 === null || axis2 === null) return axis1 === axis2;
    
    // Sign changed
    if ((axis1.doubleValue() * axis2.doubleValue()) <= 0) return false;
    
    // One state changed (pressed/released)
    if ((axis1.isPressed() && !axis2.isPressed()) ||
      (!axis1.isPressed() && axis2.isPressed()) ||
      (axis1.isReleased() && !axis2.isReleased()) ||
      (!axis1.isReleased() && axis2.isReleased())) {
      return false;
    }
    
    return Math.abs(axis1.doubleValue() - axis2.doubleValue()) < this.#axisEps;
  }

  /**
   * Compare two transformation matrices.
   * @param {number[]|null} trafo1 - First transformation
   * @param {number[]|null} trafo2 - Second transformation
   * @returns {boolean} True if they are equivalent
   * @private
   */
  #compareTransformation(trafo1, trafo2) {
    if (trafo1 === trafo2) return true;
    if (trafo1 === null || trafo2 === null) return trafo1 === trafo2;
    // For now, transformations are never considered equal (can be improved)
    return false;
  }

  /**
   * Mark this event as consumed.
   */
  consume() {
    this.#consumed = true;
  }

  /**
   * Check if this event has been consumed.
   * @returns {boolean} True if consumed
   */
  isConsumed() {
    return this.#consumed;
  }

  /**
   * Get a string representation of this event.
   * @returns {string} String representation
   */
  toString() {
    return `ToolEvent source=${this.getSource()} device=${this.#device} ${this.#axis} trafo=${this.#trafo}`;
  }
}

