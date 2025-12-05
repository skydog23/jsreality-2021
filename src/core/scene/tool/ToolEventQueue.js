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
import { getLogger, Category } from '../../util/LoggingSystem.js';

/**
 * @typedef {import('./ToolEvent.js').ToolEvent} ToolEvent
 */

/**
 * Interface for receiving tool events.
 * @interface
 */
export class ToolEventReceiver {
  /**
   * Process a tool event.
   * @param {ToolEvent} event - The event to process
   */
  processToolEvent(event) {
    throw new Error('Method not implemented');
  }
}

/**
 * ToolEventQueue manages a queue of tool events and processes them.
 * In JavaScript, this uses requestAnimationFrame instead of a separate thread.
 */
export class ToolEventQueue {
  #logger = getLogger('ToolEventQueue');

  /** @type {ToolEventReceiver} Receiver for processed events */
  #receiver;

  /** @type {ToolEvent[]} Queue of events */
  #queue = [];

  /** @type {boolean} Whether the queue is running */
  #running = false;

  /** @type {boolean} Whether the queue has been started */
  #started = false;

  /** @type {number|null} Animation frame ID */
  #animationFrameId = null;

  /**
   * Create a new ToolEventQueue.
   * @param {ToolEventReceiver} receiver - The receiver for processed events
   */
  constructor(receiver) {
    this.#receiver = receiver;
  }

  /**
   * Start processing events.
   */
  start() {
    if (this.#started) {
      throw new Error('ToolEventQueue already started');
    }
    this.#started = true;
    this.#running = true;
    this.#processQueue();
  }

  /**
   * Check if the queue has been started.
   * @returns {boolean} True if the queue has been started
   */
  isStarted() {
    return this.#started;
  }

  /**
   * Process the event queue using requestAnimationFrame.
   * @private
   */
  #processQueue() {
    if (!this.#running) {
      return;
    }

    // Process all available events in this frame
    while (this.#queue.length > 0) {
      const event = this.#queue.shift();
      if (event && this.#running) {
        try {
          this.#receiver.processToolEvent(event);
        } catch (error) {
          const slotName = event.getInputSlot()?.getName() || 'unknown';
          this.#logger.severe(Category.SCENE, `Error processing tool event (${slotName}):`, error);
        }
      }
    }

    // Schedule next frame if still running
    if (this.#running) {
      this.#animationFrameId = requestAnimationFrame(() => this.#processQueue());
    }
  }

  /**
   * Add an event to the queue.
   * @param {ToolEvent} event - The event to add
   * @returns {boolean} True if the event was added, false if it replaced another event
   */
  addEvent(event) {
    if (!this.#started) {
      this.#logger.warn(Category.IO, `Queue not started, dropping event: ${event.getInputSlot()?.getName() || 'unknown'}`);
      return false;
    }
    return this.#placeEvent(event);
  }

  /**
   * Place an event in the queue, possibly replacing an existing event.
   * @param {ToolEvent} event - The event to place
   * @returns {boolean} True if added, false if replaced
   * @private
   */
  #placeEvent(event) {
    
  this.#logger.finer(Category.IO, 'placeEvent() called, event:', event);
    // Check if we can replace the last possible event
    for (let i = this.#queue.length - 1; i >= 0; i--) {
      const e = this.#queue[i];
      if (event.canReplace(e)) {
        e.replaceWith(event);
        return false;
      }
    }

    // Add to end of queue
    this.#queue.push(event);
    return true;
  }

  /**
   * Dispose of the queue and stop processing.
   */
  dispose() {
    this.#running = false;
    if (this.#animationFrameId !== null) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
    this.#queue = [];
  }

  /**
   * Check if the queue is running.
   * @returns {boolean} True if running
   */
  isRunning() {
    return this.#running;
  }

  /**
   * Get the current queue length.
   * @returns {number} Number of events in queue
   */
  getQueueLength() {
    return this.#queue.length;
  }
}

