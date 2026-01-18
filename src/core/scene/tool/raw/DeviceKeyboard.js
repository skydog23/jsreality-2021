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
 * Key code mapping from DOM key codes to virtual key codes.
 * Maps common keys to their VK_* equivalents.
 */
const KEY_CODE_MAP = {
  'Shift': 'VK_SHIFT',
  'Control': 'VK_CONTROL',
  'Alt': 'VK_ALT',
  'Meta': 'VK_META',
  'Enter': 'VK_ENTER',
  'Escape': 'VK_ESCAPE',
  'Space': 'VK_SPACE',
  'Tab': 'VK_TAB',
  'Backspace': 'VK_BACK_SPACE',
  'Delete': 'VK_DELETE',
  'ArrowUp': 'VK_UP',
  'ArrowDown': 'VK_DOWN',
  'ArrowLeft': 'VK_LEFT',
  'ArrowRight': 'VK_RIGHT',
  'PageUp': 'VK_PAGE_UP',
  'PageDown': 'VK_PAGE_DOWN',
  'Home': 'VK_HOME',
  'End': 'VK_END',
  'Insert': 'VK_INSERT',
  'F1': 'VK_F1',
  'F2': 'VK_F2',
  'F3': 'VK_F3',
  'F4': 'VK_F4',
  'F5': 'VK_F5',
  'F6': 'VK_F6',
  'F7': 'VK_F7',
  'F8': 'VK_F8',
  'F9': 'VK_F9',
  'F10': 'VK_F10',
  'F11': 'VK_F11',
  'F12': 'VK_F12'
};

/**
 * Keyboard device implementation for browser environment.
 * Maps DOM keyboard events to ToolEvents.
 * Handles auto-repeat and modifier key state tracking.
 * @implements {RawDevice}
 * @implements {PollingDevice}
 */
export class DeviceKeyboard {
  /** @type {ToolEventQueue|null} */
  #queue = null;

  /** @type {HTMLElement|null} */
  #element = null;

  /** @type {Map<string, InputSlot>} */
  #keysToVirtual = new Map();

  /** @type {Map<string, boolean>} */
  #keyState = new Map();

  /** @type {Array<{event: KeyboardEvent, timestamp: number}>} */
  #eventQueue = [];

  /** @type {Object|null} Bound event handlers */
  #boundHandlers = null;

  /**
   * Initialize the keyboard device.
   * @param {Viewer} viewer - The viewer
   * @param {Object} config - Configuration map
   */
  initialize(viewer, config) {
    if (!viewer.hasViewingComponent()) {
      throw new Error('Viewer must have a viewing component');
    }
    const component = viewer.getViewingComponent();
    if (!(component instanceof HTMLElement)) {
      throw new Error('Viewing component must be an HTMLElement');
    }
    this.#element = component;
    
    const handlers = {
      keydown: this.#handleKeyDown.bind(this),
      keyup: this.#handleKeyUp.bind(this),
      blur: this.#handleBlur.bind(this)
    };
    
    this.#boundHandlers = handlers;
    component.addEventListener('keydown', handlers.keydown);
    component.addEventListener('keyup', handlers.keyup);
    component.addEventListener('blur', handlers.blur);
    
    // Make element focusable
    if (component.tabIndex === -1) {
      component.tabIndex = 0;
    }
  }

  /**
   * Handle key down event.
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  #handleKeyDown(e) {
    const keyCode = this.#resolveKeyCode(e);
    if (keyCode === null) return;
    
    const slot = this.#keysToVirtual.get(keyCode);
    if (slot != null) {
      this.#enqueueEvent(e, true);
    }
    
    // Check modifier keys
    this.#checkModifiers(e);
  }

  /**
   * Handle key up event.
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  #handleKeyUp(e) {
    const keyCode = this.#resolveKeyCode(e);
    if (keyCode === null) return;
    
    const slot = this.#keysToVirtual.get(keyCode);
    if (slot != null) {
      this.#enqueueEvent(e, false);
    }
    
    // Check modifier keys
    this.#checkModifiers(e);
  }

  /**
   * Handle blur event (element loses focus).
   * @param {FocusEvent} e - Focus event
   * @private
   */
  #handleBlur(e) {
    // Release all pressed keys when focus is lost
    for (const [keyCode, pressed] of this.#keyState.entries()) {
      if (pressed) {
        const slot = this.#keysToVirtual.get(keyCode);
        if (slot !== null && this.#queue !== null) {
          this.#queue.addEvent(new ToolEvent(
            this,
            Date.now(),
            slot,
            AxisState.ORIGIN
          ));
          this.#keyState.set(keyCode, false);
        }
      }
    }
  }

  /**
   * Enqueue a keyboard event for processing.
   * @param {KeyboardEvent} e - Keyboard event
   * @param {boolean} pressed - Whether key is pressed
   * @private
   */
  #enqueueEvent(e, pressed) {
    const keyCode = this.#resolveKeyCode(e);
    if (keyCode === null) return;
    
    this.#eventQueue.push({
      event: e,
      timestamp: Date.now(),
      pressed: pressed,
      keyCode: keyCode
    });
  }

  /**
   * Check modifier keys state.
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  #checkModifiers(e) {
    const modifiers = [
      { key: 'Shift', code: 'VK_SHIFT', down: e.shiftKey },
      { key: 'Control', code: 'VK_CONTROL', down: e.ctrlKey },
      { key: 'Alt', code: 'VK_ALT', down: e.altKey },
      { key: 'Meta', code: 'VK_META', down: e.metaKey }
    ];
    
    for (const mod of modifiers) {
      const slot = this.#keysToVirtual.get(mod.code);
      if (slot != null) {
        const wasPressed = this.#keyState.get(mod.code) === true;
        if (!mod.down && wasPressed) {
          // Modifier was released
          if (this.#queue !== null) {
            this.#queue.addEvent(new ToolEvent(
              this,
              Date.now(),
              slot,
              AxisState.ORIGIN
            ));
          }
          this.#keyState.set(mod.code, false);
        }
      }
    }
  }

  /**
   * Resolve key code from keyboard event.
   * @param {KeyboardEvent} e - Keyboard event
   * @returns {string|null} Key code or null
   * @private
   */
  #resolveKeyCode(e) {
    // Try key first (more reliable for special keys)
    if (KEY_CODE_MAP.hasOwnProperty(e.key)) {
      return KEY_CODE_MAP[e.key];
    }
    
    // For letter keys, use uppercase letter
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      return `VK_${e.key.toUpperCase()}`;
    }
    
    // For number keys
    if (/^\d$/.test(e.key)) {
      return `VK_${e.key}`;
    }
    
    return null;
  }

  /**
   * Map a raw device slot to an input slot.
   * @param {string} rawDeviceName - Raw device name (e.g., "VK_W")
   * @param {InputSlot} inputDevice - Target input slot
   * @returns {ToolEvent} Initial tool event
   */
  mapRawDevice(rawDeviceName, inputDevice) {
    // rawDeviceName should be like "VK_W" or "VK_SHIFT"
    this.#keysToVirtual.set(rawDeviceName, inputDevice);
    return new ToolEvent(this, Date.now(), inputDevice, AxisState.ORIGIN);
  }

  /**
   * Set the event queue.
   * @param {ToolEventQueue} queue - The event queue
   */
  setEventQueue(queue) {
    this.#queue = queue;
  }

  /**
   * Poll for keyboard events.
   * Processes queued events with a minimum age to handle auto-repeat.
   * @param {number} when - Current timestamp
   */
  poll(when) {
    if (this.#queue === null) return;
    
    const now = Date.now();
    const minAge = 3; // Minimum age in milliseconds
    
    while (this.#eventQueue.length > 0) {
      const queued = this.#eventQueue[0];
      const age = now - queued.timestamp;
      
      if (age < minAge) {
        // Event too recent, wait
        return;
      }
      
      // Remove from queue
      this.#eventQueue.shift();
      
      const keyCode = queued.keyCode;
      const pressed = queued.pressed;
      const wasPressed = this.#keyState.get(keyCode) === true;
      
      // Only process if state changed
      if (wasPressed !== pressed) {
        const slot = this.#keysToVirtual.get(keyCode);
        if (slot != null) {
          const state = pressed ? AxisState.PRESSED : AxisState.ORIGIN;
          this.#queue.addEvent(new ToolEvent(
            queued.event,
            queued.timestamp,
            slot,
            state
          ));
          this.#keyState.set(keyCode, pressed);
        }
      }
    }
  }

  /**
   * Dispose of the keyboard device.
   */
  dispose() {
    if (this.#element !== null && this.#boundHandlers !== null) {
      const handlers = this.#boundHandlers;
      this.#element.removeEventListener('keydown', handlers.keydown);
      this.#element.removeEventListener('keyup', handlers.keyup);
      this.#element.removeEventListener('blur', handlers.blur);
      this.#boundHandlers = null;
      this.#element = null;
    }
    this.#keysToVirtual.clear();
    this.#keyState.clear();
    this.#eventQueue = [];
  }

  /**
   * Get the name of this device.
   * @returns {string} Device name
   */
  getName() {
    return 'Keyboard';
  }

  /**
   * Get string representation.
   * @returns {string} String representation
   */
  toString() {
    return 'RawDevice: Keyboard';
  }
}

