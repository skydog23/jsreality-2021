/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Interface for polling devices.
 * Polling devices perform their polling in the poll() method.
 * @interface
 */
export class PollingDevice {
  /**
   * Perform polling for the device.
   * @param {number} when - Current timestamp in milliseconds
   */
  poll(when) {
    throw new Error('Method not implemented');
  }
}

