/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { PollingDevice } from './raw/PollingDevice.js';
import { getLogger } from '../../util/LoggingSystem.js';
import { Level, Category } from '../../util/LoggingSystem.js';

const logger = getLogger('jsreality.core.scene.tool.Poller');

/**
 * Singleton poller for polling devices.
 * Polls all registered polling devices on each animation frame.
 */
export class Poller {
  /** @type {Poller|null} */
  static #instance = null;

  /** @type {Set<PollingDevice>} */
  #pollingDevices = new Set();

  /** @type {number|null} */
  #animationFrameId = null;

  /** @type {boolean} */
  #running = false;

  /**
   * Get the shared poller instance.
   * @returns {Poller} The poller instance
   */
  static getSharedInstance() {
    if (Poller.#instance === null) {
      Poller.#instance = new Poller();
    }
    return Poller.#instance;
  }

  /**
   * Add a polling device.
   * @param {PollingDevice} device - The polling device
   */
  addPollingDevice(device) {
    this.#pollingDevices.add(device);
    if (this.#pollingDevices.size === 1 && !this.#running) {
      this.start();
    }
  }

  /**
   * Remove a polling device.
   * @param {PollingDevice} device - The polling device
   */
  removePollingDevice(device) {
    this.#pollingDevices.delete(device);
    if (this.#pollingDevices.size === 0 && this.#running) {
      this.stop();
    }
  }

  /**
   * Start polling.
   * @private
   */
  start() {
    if (this.#running) return;
    this.#running = true;
    this.#poll();
  }

  /**
   * Stop polling.
   * @private
   */
  stop() {
    this.#running = false;
    if (this.#animationFrameId !== null) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
  }

  /**
   * Poll all devices.
   * @private
   */
  #poll() {
    if (!this.#running) return;
    
    const now = Date.now();
    for (const device of this.#pollingDevices) {
      try {
        device.poll(now);
      } catch (e) {
        logger.severe(Category.ALL, 'Error polling device:', e);
      }
    }
    
    this.#animationFrameId = requestAnimationFrame(() => this.#poll());
  }

  /**
   * Dispose of the poller.
   */
  dispose() {
    this.stop();
    this.#pollingDevices.clear();
  }
}

