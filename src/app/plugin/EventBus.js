/**
 * EventBus - Simple event system for plugin communication.
 * 
 * Provides a pub/sub mechanism for loose coupling between plugins
 * and between plugins and the viewer.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('EventBus');

/**
 * Simple event bus for plugin communication.
 * Provides publish/subscribe pattern for loose coupling.
 */
export class EventBus {
  /** @type {Map<string, Set<Function>>} */
  #listeners = new Map();

  /**
   * Emit an event to all subscribed listeners.
   * 
   * @param {string} eventType - Type of event to emit
   * @param {*} data - Event data
   */
  emit(eventType, data) {
    const callbacks = this.#listeners.get(eventType);
    if (!callbacks || callbacks.size === 0) {
      return;
    }

    logger.fine(`Emitting event: ${eventType} to ${callbacks.size} listener(s)`);

    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        logger.severe(`Error in event listener for ${eventType}: ${error.message}`);
        console.error(error);
      }
    }
  }

  /**
   * Subscribe to an event.
   * 
   * @param {string} eventType - Type of event to listen for
   * @param {Function} callback - Callback function to invoke when event is emitted
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback) {
    if (!this.#listeners.has(eventType)) {
      this.#listeners.set(eventType, new Set());
    }

    const callbacks = this.#listeners.get(eventType);
    callbacks.add(callback);

    logger.fine(`Subscribed to event: ${eventType} (${callbacks.size} listener(s))`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.#listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        logger.fine(`Unsubscribed from event: ${eventType} (${callbacks.size} listener(s) remaining)`);
        
        // Clean up empty sets
        if (callbacks.size === 0) {
          this.#listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Subscribe to an event for one emission only.
   * The listener is automatically unsubscribed after the first invocation.
   * 
   * @param {string} eventType - Type of event to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(eventType, callback) {
    const unsubscribe = this.on(eventType, (data) => {
      unsubscribe();
      callback(data);
    });
    return unsubscribe;
  }

  /**
   * Remove all listeners for an event type.
   * If no event type is specified, removes all listeners.
   * 
   * @param {string} [eventType] - Optional event type to clear
   */
  clear(eventType) {
    if (eventType) {
      this.#listeners.delete(eventType);
      logger.fine(`Cleared all listeners for event: ${eventType}`);
    } else {
      this.#listeners.clear();
      logger.fine('Cleared all event listeners');
    }
  }

  /**
   * Get the number of listeners for an event type.
   * 
   * @param {string} eventType - Event type
   * @returns {number} Number of listeners
   */
  listenerCount(eventType) {
    const callbacks = this.#listeners.get(eventType);
    return callbacks ? callbacks.size : 0;
  }

  /**
   * Get all registered event types.
   * 
   * @returns {string[]} Array of event type names
   */
  eventTypes() {
    return Array.from(this.#listeners.keys());
  }
}

