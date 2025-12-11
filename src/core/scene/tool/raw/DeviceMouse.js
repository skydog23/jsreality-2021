/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { AbstractDeviceMouse } from './AbstractDeviceMouse.js';
import { ToolEvent } from '../ToolEvent.js';
import { ToolEventQueue } from '../ToolEventQueue.js';
import { InputSlot } from '../InputSlot.js';
import { AxisState } from '../AxisState.js';
import * as Rn from '../../../math/Rn.js';
import { getLogger, Category } from '../../../util/LoggingSystem.js';

/**
 * @typedef {import('../ToolEventQueue.js').ToolEventQueue} ToolEventQueue
 * @typedef {import('../../Viewer.js').Viewer} Viewer
 */

const MOUSE_GRAB_TOGGLE_KEY = 'F10';
const MOUSE_GRAB_TOGGLE_ALTERNATIVE_KEY = 'c';

/**
 * Mouse device implementation for browser environment.
 * Maps DOM mouse events to ToolEvents.
 * @implements {import('../RawDevice.js').RawDevice}
 */
export class DeviceMouse extends AbstractDeviceMouse {
  /** @type {HTMLElement|null} */
  #element = null;

  /** @type {Map<string, InputSlot>} */
  #usedSources = new Map();

  /** @type {boolean} */
  #grabbed = false;

  /** @type {Function[]} Bound event handlers for cleanup */
  #boundHandlers = [];

  /**
   * Initialize the mouse device.
   * @param {Viewer} viewer - The viewer
   * @param {Object} config - Configuration map
   */
  initialize(viewer, config) {
    if (!viewer.hasViewingComponent()) {
      throw new Error('Viewer must have a viewing component');
    }
    
    // Attach to the viewer's own viewing component.
    // For ViewerSwitch this is the stable wrapper element, which ensures
    // the mouse device keeps working when switching underlying viewers.
    const component = viewer.getViewingComponent();
    
    if (!(component instanceof HTMLElement)) {
      throw new Error('Viewing component must be an HTMLElement');
    }
    this.setElement(component);
  }

  /**
   * Set the HTML element to attach mouse listeners to.
   * @param {HTMLElement} element - The HTML element
   */
  setElement(element) {
    if (this.#element !== null) {
      this.dispose();
    }
    this.#element = element;
    
    // Bind handlers and store references for cleanup
    const handlers = {
      mousedown: this.#handleMouseDown.bind(this),
      mouseup: this.#handleMouseUp.bind(this),
      mousemove: this.#handleMouseMove.bind(this),
      wheel: this.#handleWheel.bind(this),
      contextmenu: this.#handleContextMenu.bind(this),
      resize: this.#handleResize.bind(this),
      keydown: this.#handleKeyDown.bind(this)
    };
    
    this.#boundHandlers = handlers;
    
    element.addEventListener('mousedown', handlers.mousedown);
    element.addEventListener('mouseup', handlers.mouseup);
    element.addEventListener('mousemove', handlers.mousemove);
    element.addEventListener('wheel', handlers.wheel);
    element.addEventListener('contextmenu', handlers.contextmenu);
    element.addEventListener('resize', handlers.resize);
    element.addEventListener('keydown', handlers.keydown);
    
    // Make element focusable
    if (element.tabIndex === -1) {
      element.tabIndex = 0;
    }
  }

  /**
   * Handle mouse down event.
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  #handleMouseDown(e) {
    const button = this.#findButton(e);
    if (button !== null && this.getQueue() !== null) {
      this.getQueue().addEvent(new ToolEvent(
        this,
        Date.now(),
        button,
        AxisState.PRESSED
      ));
    }
  }

  /**
   * Handle mouse up event.
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  #handleMouseUp(e) {
    const button = this.#findButton(e);
    if (button !== null && this.getQueue() !== null) {
      this.getQueue().addEvent(new ToolEvent(
        this,
        Date.now(),
        button,
        AxisState.ORIGIN
      ));
    }
  }

  /**
   * Handle mouse move event.
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  #handleMouseMove(e) {
    const rect = this.#element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.mouseMoved(x, y);
  }

  /**
   * Handle wheel event.
   * @param {WheelEvent} e - Wheel event
   * @private
   */
  #handleWheel(e) {
    e.preventDefault();
    const deltaY = e.deltaY;
    const queue = this.getQueue();
    if (queue === null) return;

    if (deltaY > 0) {
      const slot = this.getUsedSources().get('wheel_up');
      if (slot !== null) {
        const count = Math.floor(Math.abs(deltaY) / 100); // Normalize wheel delta
        for (let i = 0; i < count; i++) {
          queue.addEvent(new ToolEvent(this, Date.now(), slot, AxisState.PRESSED));
          queue.addEvent(new ToolEvent(this, Date.now(), slot, AxisState.ORIGIN));
        }
      }
    } else if (deltaY < 0) {
      const slot = this.getUsedSources().get('wheel_down');
      if (slot !== null) {
        const count = Math.floor(Math.abs(deltaY) / 100);
        for (let i = 0; i < count; i++) {
          queue.addEvent(new ToolEvent(this, Date.now(), slot, AxisState.PRESSED));
          queue.addEvent(new ToolEvent(this, Date.now(), slot, AxisState.ORIGIN));
        }
      }
    }
  }

  /**
   * Handle context menu event (right-click menu).
   * @param {Event} e - Event
   * @private
   */
  #handleContextMenu(e) {
    // Prevent default context menu if right button is mapped
    if (this.getUsedSources().has('right')) {
      e.preventDefault();
    }
  }

  /**
   * Handle resize event.
   * @param {Event} e - Event
   * @private
   */
  #handleResize(e) {
    if (this.isCenter()) {
      this.setCenter(false);
      const queue = this.getQueue();
      if (queue !== null) {
        const lookSwitch = InputSlot.getDevice('LookSwitch');
        queue.addEvent(new ToolEvent(this, Date.now(), lookSwitch, AxisState.PRESSED));
        queue.addEvent(new ToolEvent(this, Date.now(), lookSwitch, AxisState.ORIGIN));
      }
    }
    this.#requestFocus();
  }

  /**
   * Handle key down event (for mouse grab toggle).
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  #handleKeyDown(e) {
    const key = e.key;
    if (key === MOUSE_GRAB_TOGGLE_KEY ||
        (key.toLowerCase() === MOUSE_GRAB_TOGGLE_ALTERNATIVE_KEY && e.shiftKey && e.ctrlKey)) {
      this.setCenter(!this.isCenter());
      const queue = this.getQueue();
      if (queue !== null) {
        const lookSwitch = InputSlot.getDevice('LookSwitch');
        queue.addEvent(new ToolEvent(this, Date.now(), lookSwitch, AxisState.PRESSED));
        queue.addEvent(new ToolEvent(this, Date.now(), lookSwitch, AxisState.ORIGIN));
      }
    }
  }

  /**
   * Find the InputSlot for a mouse button.
   * @param {MouseEvent} e - Mouse event
   * @returns {InputSlot|null} Input slot or null
   * @private
   */
  #findButton(e) {
    const button = this.#getRealButton(e);
    const usedSources = this.getUsedSources();
    
    if (button === 0) return usedSources.get('left') || null;
    if (button === 1) return usedSources.get('center') || null;
    if (button === 2) return usedSources.get('right') || null;
    return null;
  }

  /**
   * Get the real button number from a mouse event.
   * Handles platform differences (Mac trackpad, Linux, etc.).
   * @param {MouseEvent} e - Mouse event
   * @returns {number} Button number (0=left, 1=center, 2=right)
   * @private
   */
  #getRealButton(e) {
    let button = e.button;
    
    // Handle Mac trackpad and Linux quirks
    if (button === 0 && e.buttons !== undefined) {
      // Linux: use buttons mask
      if (e.buttons & 1) button = 0; // Left
      else if (e.buttons & 4) button = 1; // Middle
      else if (e.buttons & 2) button = 2; // Right
    } else if (button === 0) {
      // Mac OS X: check modifiers
      if (e.altKey && e.buttons === 1) button = 1; // Middle (Alt+click)
      else if (e.ctrlKey && e.buttons === 1) button = 2; // Right (Ctrl+click)
    }
    
    return button;
  }

  /**
   * Map a raw device slot to an input slot.
   * @param {string} rawDeviceName - Raw device name (e.g., "left", "axes")
   * @param {InputSlot} inputDevice - Target input slot
   * @returns {ToolEvent} Initial tool event
   */
  mapRawDevice(rawDeviceName, inputDevice) {
    if (!AbstractDeviceMouse.isKnownSource(rawDeviceName)) {
      throw new Error(`Unknown raw device: ${rawDeviceName}`);
    }
    this.getUsedSources().set(rawDeviceName, inputDevice);
    
    if (rawDeviceName === 'axes') {
      const matrix = Rn.identityMatrix(4);
      return ToolEvent.createWithTransformation(
        this,
        Date.now(),
        inputDevice,
        matrix
      );
    }
    if (rawDeviceName === 'axesEvolution') {
      const matrix = Rn.identityMatrix(4);
      matrix[11] = -1; // Entry (2,3)
      return ToolEvent.createWithTransformation(
        this,
        Date.now(),
        inputDevice,
        matrix
      );
    }
    return new ToolEvent(this, Date.now(), inputDevice, AxisState.ORIGIN);
  }

  /**
   * Dispose of the mouse device.
   */
  dispose() {
    if (this.#element !== null && this.#boundHandlers !== null) {
      const handlers = this.#boundHandlers;
      this.#element.removeEventListener('mousedown', handlers.mousedown);
      this.#element.removeEventListener('mouseup', handlers.mouseup);
      this.#element.removeEventListener('mousemove', handlers.mousemove);
      this.#element.removeEventListener('wheel', handlers.wheel);
      this.#element.removeEventListener('contextmenu', handlers.contextmenu);
      this.#element.removeEventListener('resize', handlers.resize);
      this.#element.removeEventListener('keydown', handlers.keydown);
      this.#boundHandlers = null;
      this.#element = null;
    }
    this.getUsedSources().clear();
    this.uninstallGrabs();
  }

  /**
   * Get the name of this device.
   * @returns {string} Device name
   */
  getName() {
    return 'Mouse';
  }

  /**
   * Calculate center of window.
   */
  calculateCenter() {
    if (this.#element === null) return;
    const rect = this.#element.getBoundingClientRect();
    this.setWinCenter(rect.width / 2, rect.height / 2);
  }

  /**
   * Install mouse grabs (hide cursor, request pointer lock).
   */
  installGrabs() {
    if (this.#element === null) return;
    this.#grabbed = true;
    
    // Request pointer lock (browser equivalent of mouse grab)
    if (this.#element.requestPointerLock) {
      this.#element.requestPointerLock().catch(() => {
        // Pointer lock failed, continue without it
        this.#grabbed = false;
      });
    }
    
    // Hide cursor via CSS
    this.#element.style.cursor = 'none';
    
    this.#requestFocus();
  }

  /**
   * Uninstall mouse grabs (restore cursor, exit pointer lock).
   */
  uninstallGrabs() {
    if (this.#element === null) return;
    this.#grabbed = false;
    
    // Exit pointer lock
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
    
    // Restore cursor
    this.#element.style.cursor = 'default';
  }

  /**
   * Request focus on the element.
   * @private
   */
  #requestFocus() {
    if (this.#element !== null && this.#element.focus) {
      this.#element.focus();
    }
  }

  /**
   * Get window width.
   * @returns {number} Width in pixels
   */
  getWidth() {
    if (this.#element === null) return 0;
    return this.#element.clientWidth || this.#element.offsetWidth || 0;
  }

  /**
   * Get window height.
   * @returns {number} Height in pixels
   */
  getHeight() {
    if (this.#element === null) return 0;
    return this.#element.clientHeight || this.#element.offsetHeight || 0;
  }

  /**
   * Get string representation.
   * @returns {string} String representation
   */
  toString() {
    return 'RawDevice: Mouse';
  }
}

