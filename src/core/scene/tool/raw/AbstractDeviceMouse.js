/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { ToolEvent } from '../ToolEvent.js';
import { InputSlot } from '../InputSlot.js';
import * as Rn from '../../../math/Rn.js';
import { getLogger } from '../../../util/LoggingSystem.js';
import { Level, Category } from '../../../util/LoggingSystem.js';

/**
 * @typedef {import('../ToolEventQueue.js').ToolEventQueue} ToolEventQueue
 */

const logger = getLogger('AbstractDeviceMouse');

/**
 * Abstract base class for mouse devices.
 * Handles mouse movement tracking and transformation matrix generation.
 */
export class AbstractDeviceMouse {
  /** @type {ToolEventQueue|null} */
  #queue = null;

  /** @type {boolean} */
  #center = false;

  /** @type {boolean} */
  #sentCenter = false;

  /** @type {number} */
  #lastX = -1;

  /** @type {number} */
  #lastY = -1;

  /** @type {number} */
  #winCenterX = 0;

  /** @type {number} */
  #winCenterY = 0;

  /** @type {Map<string, InputSlot>} */
  #usedSources = new Map();

  /** @type {number[]} */
  #axesMatrix = Rn.identityMatrix(4);

  /** @type {number[]} */
  #axesEvolutionMatrix = Rn.identityMatrix(4);

  /** @type {Set<string>} */
  static #knownSources = new Set([
    'left',
    'center',
    'right',
    'axes',
    'axesEvolution',
    'wheel_up',
    'wheel_down'
  ]);

  /**
   * Set the event queue.
   * @param {ToolEventQueue} queue - The event queue
   */
  setEventQueue(queue) {
    this.#queue = queue;
  }

  /**
   * Get the event queue.
   * @returns {ToolEventQueue|null}
   * @protected
   */
  getQueue() {
    return this.#queue;
  }

  /**
   * Get used sources map.
   * @returns {Map<string, InputSlot>}
   * @protected
   */
  getUsedSources() {
    return this.#usedSources;
  }

  /**
   * Check if known source.
   * @param {string} source - Source name
   * @returns {boolean}
   * @protected
   */
  static isKnownSource(source) {
    return AbstractDeviceMouse.#knownSources.has(source);
  }

  /**
   * Handle mouse movement.
   * @param {number} ex - X coordinate
   * @param {number} ey - Y coordinate
   * @protected
   */
  mouseMoved(ex, ey) {
    const slot = this.#usedSources.get('axes');
    if (slot !== null && this.#queue !== null) {
      if (!this.#isCenter()) {
        const width = this.getWidth();
        const height = this.getHeight();
        const xndc = -1.0 + (2.0 * ex) / width;
        const yndc = 1.0 - (2.0 * ey) / height;

        const matrix = Rn.identityMatrix(4);
        matrix[3] = xndc;   // Entry (0,3)
        matrix[7] = yndc;   // Entry (1,3)
        matrix[11] = -1;   // Entry (2,3)

        const event = ToolEvent.createWithTransformation(
          this,
          Date.now(),
          slot,
          matrix
        );
        logger.finest(Category.IO, `Adding POINTER_TRANSFORMATION event: xndc=${xndc.toFixed(3)}, yndc=${yndc.toFixed(3)}`);
        this.#queue.addEvent(event);
      } else if (!this.#sentCenter) {
        const matrix = Rn.identityMatrix(4);
        matrix[3] = 0;   // Entry (0,3)
        matrix[7] = 0;   // Entry (1,3)
        matrix[11] = -1; // Entry (2,3)

        this.#queue.addEvent(ToolEvent.createWithTransformation(
          this,
          Date.now(),
          slot,
          matrix
        ));
        this.#sentCenter = true;
        this.#lastX = ex;
        this.#lastY = ey;
      }
    }

    const evolutionSlot = this.#usedSources.get('axesEvolution');
    if (evolutionSlot !== null && this.#queue !== null) {
      if (this.#lastX === -1) {
        this.#lastX = ex;
        this.#lastY = ey;
        return;
      }

      const dx = ex - this.#lastX;
      const dy = ey - this.#lastY;

      if (dx === 0 && dy === 0) return;

      const width = this.getWidth();
      const height = this.getHeight();
      const dxndc = (2.0 * dx) / width;
      const dyndc = -(2.0 * dy) / height;

      const matrix = Rn.identityMatrix(4);
      matrix[3] = dxndc;   // Entry (0,3)
      matrix[7] = dyndc;   // Entry (1,3)
      matrix[11] = -1;     // Entry (2,3)

      // For evolution, we multiply the transformation
      // This is handled by the event replacement logic
      const evolutionEvent = ToolEvent.createWithTransformation(
        this,
        Date.now(),
        evolutionSlot,
        matrix
      );

      this.#queue.addEvent(evolutionEvent);

      if (this.#isCenter()) {
        // In center mode, reset mouse position (browser doesn't support this directly)
        // We'll just update lastX/Y to center
        this.#lastX = this.#winCenterX;
        this.#lastY = this.#winCenterY;
      } else {
        this.#lastX = ex;
        this.#lastY = ey;
      }
    }
  }

  /**
   * Check if center mode is enabled.
   * @returns {boolean}
   * @protected
   */
  #isCenter() {
    return this.#center;
  }

  /**
   * Set center mode.
   * @param {boolean} center - Whether center mode is enabled
   * @protected
   */
  setCenter(center) {
    if (this.#center !== center) {
      this.#sentCenter = false;
    }
    this.#center = center;
    if (center) {
      this.calculateCenter();
      this.installGrabs();
    } else {
      this.uninstallGrabs();
    }
  }

  /**
   * Get center mode state.
   * @returns {boolean}
   */
  isCenter() {
    return this.#center;
  }

  /**
   * Set window center coordinates.
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @protected
   */
  setWinCenter(x, y) {
    this.#winCenterX = x;
    this.#winCenterY = y;
  }

  /**
   * Calculate center of window.
   * Must be implemented by subclasses.
   * @abstract
   */
  calculateCenter() {
    throw new Error('calculateCenter() must be implemented');
  }

  /**
   * Install mouse grabs (hide cursor, etc.).
   * Must be implemented by subclasses.
   * @abstract
   */
  installGrabs() {
    throw new Error('installGrabs() must be implemented');
  }

  /**
   * Uninstall mouse grabs (restore cursor, etc.).
   * Must be implemented by subclasses.
   * @abstract
   */
  uninstallGrabs() {
    throw new Error('uninstallGrabs() must be implemented');
  }

  /**
   * Get window width.
   * Must be implemented by subclasses.
   * @returns {number}
   * @abstract
   */
  getWidth() {
    throw new Error('getWidth() must be implemented');
  }

  /**
   * Get window height.
   * Must be implemented by subclasses.
   * @returns {number}
   * @abstract
   */
  getHeight() {
    throw new Error('getHeight() must be implemented');
  }
}

