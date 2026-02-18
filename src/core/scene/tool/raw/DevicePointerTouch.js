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
import { AxisState } from '../AxisState.js';
import * as Rn from '../../../math/Rn.js';
import { getLogger, Category, Level, setModuleLevel } from '../../../util/LoggingSystem.js';
import { ViewerSwitch } from '../../../viewers/ViewerSwitch.js';

const logger = getLogger('jsreality.core.scene.tool.raw.DevicePointerTouch');
setModuleLevel(logger.getModuleName(), Level.INFO);

const SOURCE_TOUCH_PRIMARY = 'touch_primary';
const SOURCE_TOUCH_AXES = 'touch_axes';
const SOURCE_TOUCH_AXES_EVOLUTION = 'touch_axesEvolution';
const SOURCE_TOUCH_WHEEL_UP = 'touch_wheel_up';
const SOURCE_TOUCH_WHEEL_DOWN = 'touch_wheel_down';
const KNOWN_SOURCES = new Set([
  SOURCE_TOUCH_PRIMARY,
  SOURCE_TOUCH_AXES,
  SOURCE_TOUCH_AXES_EVOLUTION,
  SOURCE_TOUCH_WHEEL_UP,
  SOURCE_TOUCH_WHEEL_DOWN
]);

const PINCH_PULSE_THRESHOLD_PX = 20;

/**
 * Pointer/touch raw device for mobile and tablet input.
 *
 * V1 behavior:
 * - Single-finger: touch_primary + touch_axes/touch_axesEvolution
 * - Two-finger: midpoint drives touch_axes/touch_axesEvolution
 * - Pinch: emits touch_wheel_up/down pulses
 *
 * TODO(V2):
 * - Split one-finger drag and two-finger pan into separate raw slots.
 * - Add optional inertial panning and smoothing for high-DPI touch devices.
 * - Add configurable pinch curve/inversion and per-device sensitivity.
 * - Add optional two-finger rotate gesture mapped to dedicated slot.
 */
export class DevicePointerTouch extends AbstractDeviceMouse {
  /** @type {HTMLElement|null} */
  #element = null;

  /** @type {Object|null} */
  #boundHandlers = null;

  /** @type {Map<number, {x:number, y:number}>} */
  #activeTouches = new Map();

  /** @type {number|null} */
  #primaryPointerId = null;

  /** @type {boolean} */
  #primaryPressed = false;

  /** @type {number|null} */
  #lastPinchDistance = null;

  /** @type {number} */
  #pinchAccumulator = 0;

  /** @type {boolean} */
  #debug = false;

  /**
   * Initialize touch device with viewer component.
   * @param {import('../../Viewer.js').Viewer} viewer
   * @param {Object} config
   */
  initialize(viewer, config) {
    this.#debug = !!(config && config.debug === true);
    if (!viewer.hasViewingComponent()) {
      throw new Error('Viewer must have a viewing component');
    }
    let component = viewer.getViewingComponent();
    if (typeof viewer.getCurrentViewer === 'function') {
      const currentViewer = viewer.getCurrentViewer();
      if (currentViewer && currentViewer.hasViewingComponent()) {
        component = currentViewer.getViewingComponent();
      }
    } else if (viewer instanceof ViewerSwitch) {
      const currentViewer = viewer.getCurrentViewer();
      if (currentViewer && currentViewer.hasViewingComponent()) {
        component = currentViewer.getViewingComponent();
      }
    }
    if (!(component instanceof HTMLElement)) {
      throw new Error('Viewing component must be an HTMLElement');
    }
    this.#debugLog(`initialize(debug=${this.#debug})`);
    this.setElement(component);
  }

  /**
   * Attach pointer handlers to element.
   * @param {HTMLElement} element
   */
  setElement(element) {
    if (this.#element !== null) {
      this.dispose();
    }
    this.#element = element;
    element.style.touchAction = 'none';
    if (element.tabIndex === -1) {
      element.tabIndex = 0;
    }

    const handlers = {
      pointerdown: this.#onPointerDown.bind(this),
      pointermove: this.#onPointerMove.bind(this),
      pointerup: this.#onPointerUpOrCancel.bind(this),
      pointercancel: this.#onPointerUpOrCancel.bind(this)
    };
    this.#boundHandlers = handlers;

    element.addEventListener('pointerdown', handlers.pointerdown, { passive: false });
    element.addEventListener('pointermove', handlers.pointermove, { passive: false });
    element.addEventListener('pointerup', handlers.pointerup, { passive: false });
    element.addEventListener('pointercancel', handlers.pointercancel, { passive: false });
  }

  /**
   * @param {PointerEvent} e
   */
  #onPointerDown(e) {
    if (e.pointerType !== 'touch') return;
    e.preventDefault();
    this.#requestFocus();
    this.#element?.setPointerCapture?.(e.pointerId);

    const p = this.#eventToLocalPoint(e);
    this.#activeTouches.set(e.pointerId, p);
    this.#debugLog(`pointerdown id=${e.pointerId} touches=${this.#activeTouches.size}`);

    if (this.#activeTouches.size === 1) {
      this.#primaryPointerId = e.pointerId;
      this.#emitPrimaryPress();
      this.mouseMoved(p.x, p.y);
      return;
    }

    if (this.#activeTouches.size >= 2) {
      this.#emitPrimaryRelease();
      const [a, b] = this.#firstTwoTouches();
      this.#lastPinchDistance = this.#distance(a, b);
      this.#pinchAccumulator = 0;
      this.#debugLog('enter two-finger mode');
      this.mouseMoved((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    }
  }

  /**
   * @param {PointerEvent} e
   */
  #onPointerMove(e) {
    if (e.pointerType !== 'touch') return;
    if (!this.#activeTouches.has(e.pointerId)) return;
    e.preventDefault();
    const p = this.#eventToLocalPoint(e);
    this.#activeTouches.set(e.pointerId, p);

    if (this.#activeTouches.size === 1 && this.#primaryPointerId === e.pointerId) {
      this.mouseMoved(p.x, p.y);
      return;
    }

    if (this.#activeTouches.size >= 2) {
      const [a, b] = this.#firstTwoTouches();
      const midX = (a.x + b.x) * 0.5;
      const midY = (a.y + b.y) * 0.5;
      this.mouseMoved(midX, midY);
      this.#updatePinch(a, b);
    }
  }

  /**
   * @param {PointerEvent} e
   */
  #onPointerUpOrCancel(e) {
    if (e.pointerType !== 'touch') return;
    if (!this.#activeTouches.has(e.pointerId)) return;
    e.preventDefault();
    this.#activeTouches.delete(e.pointerId);
    this.#debugLog(`pointerup/cancel id=${e.pointerId} touches=${this.#activeTouches.size}`);

    if (this.#primaryPointerId === e.pointerId) {
      this.#emitPrimaryRelease();
      this.#primaryPointerId = null;
    }

    if (this.#activeTouches.size === 0) {
      this.#lastPinchDistance = null;
      this.#pinchAccumulator = 0;
      return;
    }

    if (this.#activeTouches.size === 1) {
      this.#lastPinchDistance = null;
      this.#pinchAccumulator = 0;
      const [id, p] = this.#activeTouches.entries().next().value;
      this.#primaryPointerId = id;
      this.#debugLog('return to one-finger mode');
      this.mouseMoved(p.x, p.y);
    }
  }

  /**
   * @param {{x:number,y:number}} a
   * @param {{x:number,y:number}} b
   */
  #updatePinch(a, b) {
    const currentDistance = this.#distance(a, b);
    if (this.#lastPinchDistance == null) {
      this.#lastPinchDistance = currentDistance;
      return;
    }
    const delta = currentDistance - this.#lastPinchDistance;
    this.#lastPinchDistance = currentDistance;
    this.#pinchAccumulator += delta;

    while (this.#pinchAccumulator >= PINCH_PULSE_THRESHOLD_PX) {
      this.#emitWheelPulse(SOURCE_TOUCH_WHEEL_DOWN);
      this.#pinchAccumulator -= PINCH_PULSE_THRESHOLD_PX;
      this.#debugLog('pinch pulse: wheel_down');
    }
    while (this.#pinchAccumulator <= -PINCH_PULSE_THRESHOLD_PX) {
      this.#emitWheelPulse(SOURCE_TOUCH_WHEEL_UP);
      this.#pinchAccumulator += PINCH_PULSE_THRESHOLD_PX;
      this.#debugLog('pinch pulse: wheel_up');
    }
  }

  #emitPrimaryPress() {
    if (this.#primaryPressed) return;
    const slot = this.getUsedSources().get(SOURCE_TOUCH_PRIMARY);
    const queue = this.getQueue();
    if (slot != null && queue != null) {
      queue.addEvent(new ToolEvent(this, Date.now(), slot, AxisState.PRESSED));
      this.#primaryPressed = true;
      this.#debugLog('emit primary press');
    }
  }

  #emitPrimaryRelease() {
    if (!this.#primaryPressed) return;
    const slot = this.getUsedSources().get(SOURCE_TOUCH_PRIMARY);
    const queue = this.getQueue();
    if (slot != null && queue != null) {
      queue.addEvent(new ToolEvent(this, Date.now(), slot, AxisState.ORIGIN));
      this.#debugLog('emit primary release');
    }
    this.#primaryPressed = false;
  }

  /**
   * @param {string} sourceName
   */
  #emitWheelPulse(sourceName) {
    const slot = this.getUsedSources().get(sourceName);
    const queue = this.getQueue();
    if (slot == null || queue == null) return;
    queue.addEvent(new ToolEvent(this, Date.now(), slot, AxisState.PRESSED));
    queue.addEvent(new ToolEvent(this, Date.now(), slot, AxisState.ORIGIN));
  }

  /**
   * @returns {[{x:number,y:number},{x:number,y:number}]}
   */
  #firstTwoTouches() {
    const values = Array.from(this.#activeTouches.values());
    return [values[0], values[1]];
  }

  /**
   * @param {{x:number,y:number}} a
   * @param {{x:number,y:number}} b
   * @returns {number}
   */
  #distance(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.hypot(dx, dy);
  }

  /**
   * @param {PointerEvent} e
   * @returns {{x:number,y:number}}
   */
  #eventToLocalPoint(e) {
    const rect = this.#element.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  /**
   * @param {string} rawDeviceName
   * @param {import('../InputSlot.js').InputSlot} inputDevice
   * @returns {ToolEvent}
   */
  mapRawDevice(rawDeviceName, inputDevice) {
    if (!KNOWN_SOURCES.has(rawDeviceName)) {
      throw new Error(`Unknown raw device: ${rawDeviceName}`);
    }
    this.getUsedSources().set(rawDeviceName, inputDevice);
    if (rawDeviceName === SOURCE_TOUCH_AXES) {
      const matrix = Rn.identityMatrix(4);
      return ToolEvent.createWithTransformation(this, Date.now(), inputDevice, matrix);
    }
    if (rawDeviceName === SOURCE_TOUCH_AXES_EVOLUTION) {
      const matrix = Rn.identityMatrix(4);
      matrix[11] = -1;
      return ToolEvent.createWithTransformation(this, Date.now(), inputDevice, matrix);
    }
    return new ToolEvent(this, Date.now(), inputDevice, AxisState.ORIGIN);
  }

  dispose() {
    this.#emitPrimaryRelease();
    if (this.#element !== null && this.#boundHandlers) {
      const h = this.#boundHandlers;
      this.#element.removeEventListener('pointerdown', h.pointerdown);
      this.#element.removeEventListener('pointermove', h.pointermove);
      this.#element.removeEventListener('pointerup', h.pointerup);
      this.#element.removeEventListener('pointercancel', h.pointercancel);
    }
    this.#activeTouches.clear();
    this.#boundHandlers = null;
    this.#element = null;
    this.getUsedSources().clear();
  }

  getName() {
    return 'PointerTouch';
  }

  calculateCenter() {}
  installGrabs() {}
  uninstallGrabs() {}

  getWidth() {
    if (this.#element === null) return 0;
    return this.#element.clientWidth || this.#element.offsetWidth || 0;
  }

  getHeight() {
    if (this.#element === null) return 0;
    return this.#element.clientHeight || this.#element.offsetHeight || 0;
  }

  toString() {
    return 'RawDevice: PointerTouch';
  }

  #requestFocus() {
    this.#element?.focus?.();
  }

  /**
   * Debug log helper; enabled via raw device config { debug: true }.
   * @param {string} message
   */
  #debugLog(message) {
    if (!this.#debug) return;
    logger.info(Category.ALL, `[DevicePointerTouch] ${message}`);
  }
}

