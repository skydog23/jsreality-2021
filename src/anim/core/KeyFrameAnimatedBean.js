/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * Phase-1 JS analogue of Java's `KeyFrameAnimatedBean<T>`.
 *
 * Java uses reflection/introspection to animate "bean" properties of an object
 * (like `Camera`) by name. In JavaScript we avoid reflection by requiring an
 * explicit list of property accessors.
 *
 * This class is a *composite* KeyFrameAnimated: it owns multiple per-property
 * KeyFrameAnimated instances and forwards keyframe/playback calls to them.
 */

import { KeyFrameAnimatedDelegate } from './KeyFrameAnimatedDelegate.js';
import { KeyFrameAnimatedDouble } from './KeyFrameAnimatedDouble.js';
import { KeyFrameAnimatedBoolean } from './KeyFrameAnimatedBoolean.js';

/** @typedef {import('./TimeDescriptor.js').TimeDescriptor} TimeDescriptor */

/**
 * @typedef {'number'|'boolean'} BeanPropertyType
 */

/**
 * @typedef {Object} BeanPropertyDescriptor
 * @property {string} name
 * @property {BeanPropertyType} type
 * @property {() => (number|boolean)} get
 * @property {(value: any) => void} set
 */

/**
 * @typedef {Object} KeyFrameAnimatedBeanOptions
 * @property {string} [name='bean']
 * @property {boolean} [writable=true]
 * @property {boolean} [givesWay=true]
 */

export class KeyFrameAnimatedBean {
  /** @type {string} */
  #name = 'bean';

  /** @type {BeanPropertyDescriptor[]} */
  #props = [];

  /** @type {Array<import('./KeyFrameAnimated.js').KeyFrameAnimated<any>>} */
  #animated = [];

  /** @type {boolean} */
  #writable = true;

  /** @type {boolean} */
  #givesWay = true;

  /**
   * @param {BeanPropertyDescriptor[]} properties
   * @param {KeyFrameAnimatedBeanOptions} [options]
   */
  constructor(properties, options = {}) {
    this.#props = Array.isArray(properties) ? properties : [];
    this.#name = options.name ?? 'bean';
    this.#writable = options.writable !== false;
    this.#givesWay = options.givesWay !== false;

    this.#animated = this.#props.map((p) => this.#createAnimatorForProperty(p));
    for (const a of this.#animated) {
      a?.setWritable?.(this.#writable);
      a?.setGivesWay?.(this.#givesWay);
    }
  }

  getName() {
    return this.#name;
  }

  setName(name) {
    this.#name = typeof name === 'string' ? name : String(name);
  }

  isWritable() {
    return this.#writable;
  }

  setWritable(b) {
    this.#writable = Boolean(b);
    for (const a of this.#animated) a?.setWritable?.(this.#writable);
  }

  isGivesWay() {
    return this.#givesWay;
  }

  setGivesWay(b) {
    this.#givesWay = Boolean(b);
    for (const a of this.#animated) a?.setGivesWay?.(this.#givesWay);
  }

  /**
   * Composite keyframe add: capture bean state and add keyframe for each property.
   * @param {TimeDescriptor} td
   */
  addKeyFrame(td) {
    if (!this.#writable) return;
    for (let i = 0; i < this.#props.length; i++) {
      const p = this.#props[i];
      const a = this.#animated[i];
      if (!a) continue;
      // JS analogue of Java's reflection-based gather: explicitly read the property now.
      a.setCurrentValue?.(p.get());
      a.addKeyFrame?.(td);
    }
  }

  /**
   * Composite keyframe delete.
   * @param {TimeDescriptor} td
   */
  deleteKeyFrame(td) {
    for (const a of this.#animated) a?.deleteKeyFrame?.(td);
  }

  /**
   * Composite playback.
   * @param {number} t
   */
  setValueAtTime(t) {
    for (const a of this.#animated) a?.setValueAtTime?.(t);
  }

  startAnimation() {
    for (const a of this.#animated) a?.startAnimation?.();
  }

  endAnimation() {
    for (const a of this.#animated) a?.endAnimation?.();
  }

  printState() {
    for (const a of this.#animated) a?.printState?.();
  }

  /**
   * @private
   * @param {BeanPropertyDescriptor} p
   */
  #createAnimatorForProperty(p) {
    const delegate = new (class extends KeyFrameAnimatedDelegate {
      gatherCurrentValue(_ignored) {
        // Not strictly needed because addKeyFrame() sets currentValue explicitly,
        // but provided for completeness/parity.
        return p.get();
      }
      propagateCurrentValue(value) {
        p.set(value);
      }
    })();

    if (p.type === 'boolean') {
      return new KeyFrameAnimatedBoolean(delegate);
    }
    // default: number
    return new KeyFrameAnimatedDouble(delegate);
  }
}

