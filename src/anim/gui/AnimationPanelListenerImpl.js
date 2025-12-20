/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { EventType } from './AnimationPanelEvent.js';

/**
 * Port of charlesgunn.anim.gui.AnimationPanelListenerImpl.
 *
 * This listener applies AnimationPanel events to a list of Animated instances.
 * It intentionally does not do DOM work; the hosting plugin can trigger renders.
 */
export class AnimationPanelListenerImpl {
  /** @type {string} */
  #name = 'unnamed';

  /** @type {Array<import('../core/Animated.js').Animated>} */
  #animated = [];

  /** @type {Array<import('../core/KeyFrameAnimated.js').KeyFrameAnimated<any>>} */
  #animatedKF = [];

  /** @type {Function|null} */
  #afterApply = null;

  /**
   * @param {Object} [options]
   * @param {string} [options.name='application']
   * @param {Array<import('../core/Animated.js').Animated>} [options.animated=[]]
   * @param {Function} [options.afterApply] - Optional callback after SET_VALUE_AT_TIME is applied.
   */
  constructor(options = {}) {
    this.#name = options.name ?? 'application';
    this.#animated = options.animated ?? [];
    this.#afterApply = options.afterApply ?? null;
  }

  getName() {
    return this.#name;
  }

  setName(name) {
    this.#name = name;
  }

  /**
   * @returns {Array<import('../core/Animated.js').Animated>}
   */
  getAnimated() {
    return this.#animated;
  }

  /**
   * @param {Array<import('../core/Animated.js').Animated>} animated
   */
  setAnimated(animated) {
    this.#animated = Array.isArray(animated) ? animated : [];
  }

  printState() {
    for (const at of this.#animated) {
      at?.printState?.();
    }
  }

  /**
   * Get state for persistence (Phase 2).
   * Java version returns the animated list.
   */
  getState() {
    return this.#animated;
  }

  /**
   * Restore state from archive (Phase 2).
   * Kept for parity; no-op in Phase 1.
   */
  setState(_o) {
    // Intentionally postponed (persistence is Phase 2).
  }

  /**
   * @param {import('./AnimationPanelEvent.js').AnimationPanelEvent} e
   */
  actionPerformed(e) {
    switch (e.type) {
      case EventType.PLAYBACK_STARTED:
        for (const at of this.#animated) at?.startAnimation?.();
        break;
      case EventType.PLAYBACK_COMPLETED:
        for (const at of this.#animated) at?.endAnimation?.();
        break;
      case EventType.KEY_FRAME_ADDED:
      case EventType.KEY_FRAME_CHANGED:
        this.#refreshAnimatedKF();
        for (const at of this.#animatedKF) at?.addKeyFrame?.(e.time);
        break;
      case EventType.KEY_FRAME_DELETED:
        this.#refreshAnimatedKF();
        for (const at of this.#animatedKF) at?.deleteKeyFrame?.(e.time);
        break;
      case EventType.SET_VALUE_AT_TIME:
        for (const at of this.#animated) {
          at?.setValueAtTime?.(e.time.getTime());
        }
        this.#afterApply?.();
        break;
      default:
        break;
    }
  }

  #refreshAnimatedKF() {
    this.#animatedKF.length = 0;
    for (const aa of this.#animated) {
      // Best-effort runtime check: KeyFrameAnimated exposes addKeyFrame/deleteKeyFrame.
      if (aa && typeof aa.addKeyFrame === 'function' && typeof aa.deleteKeyFrame === 'function') {
        this.#animatedKF.push(aa);
      }
    }
  }
}

