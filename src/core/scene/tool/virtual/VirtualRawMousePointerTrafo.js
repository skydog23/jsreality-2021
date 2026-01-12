/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of de.jreality.toolsystem.virtual.VirtualRawMousePointerTrafo.
// This virtual device composes an NDC-space pointer segment with an NDC→World
// transform to produce a 4x4 pointer frame in world coordinates.

import * as Rn from '../../../math/Rn.js';
import { VirtualDevice } from '../VirtualDevice.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualRawMousePointerTrafo extends VirtualDevice {
  /**
   * @param {InputSlot} ndcToWorldSlot - Slot providing the NDC→World matrix
   * @param {InputSlot} pointerNdcSlot - Slot providing the raw pointer in NDC
   * @param {InputSlot} outSlot - Output slot (e.g. POINTER_TRANSFORMATION)
   */
  constructor(ndcToWorldSlot, pointerNdcSlot, outSlot) {
    super();
    this._ndcToWorldSlot = ndcToWorldSlot;
    this._pointerNdcSlot = pointerNdcSlot;
    this._outSlot = outSlot;

    /** @type {number[]} */
    this._ndcToWorld = Rn.identityMatrix(4);

    /** @type {number[]} */
    this._pointerNdc = Rn.identityMatrix(4);

    /** @type {number[]} */
    this._pointerTrafo = Rn.identityMatrix(4);
  }

  /**
   * Compute the pointer transformation matrix in world coordinates.
   * Mirrors VirtualRawMousePointerTrafo.process() in Java, but returns the
   * computed matrix instead of a ToolEvent.
   *
   * @param {VirtualDeviceContext} context
   * @returns {number[]|null} pointerTrafo matrix or null if inputs unavailable
   */
  computePointerTrafo(context) {
    try {
      const ndcToWorld = context.getTransformationMatrix(this._ndcToWorldSlot);
      const pointerNdc = context.getTransformationMatrix(this._pointerNdcSlot);
      if (!ndcToWorld || !pointerNdc) {
        return null;
      }
      // Copy into internal buffers
      for (let i = 0; i < 16; i++) {
        this._ndcToWorld[i] = ndcToWorld[i];
        this._pointerNdc[i] = pointerNdc[i];
      }
    } catch (e) {
      // MissingSlotException or similar – nothing to do yet
      return null;
    }

    const m = this._pointerNdc;
    const x = m[3];
    const y = m[7];

    // Reconstruct a small segment in NDC around (x,y) with z = -1 / 1,
    // following the Java implementation.
    // Column 0
    m[0] = x + 1;
    m[4] = y;
    m[8] = -1;
    m[12] = 1;

    // Column 1
    m[1] = x;
    m[5] = y + 1;
    m[9] = -1;
    m[13] = 1;

    // Column 2
    m[2] = x;
    m[6] = y;
    m[10] = 1;
    m[14] = 1;

    // Compose pointerTrafo = ndcToWorld * pointerNdc
    Rn.times(this._pointerTrafo, this._ndcToWorld, m);
    return this._pointerTrafo;
  }

  // VirtualDevice interface (unused initialization/dispose for now)

  /** @override */
  process(context) {
    // Subclasses (e.g. VirtualMousePointerTrafo) use computePointerTrafo()
    // and are responsible for creating ToolEvents.
    this.computePointerTrafo(context);
    return null;
  }

  /** @override */
  initialize(inputSlots, result, configuration) {
    // Not used in the current JS configuration path.
  }

  /** @override */
  dispose() {
    // Nothing to dispose for this pure-computation device.
  }

  /** @override */
  getName() {
    return 'RawMousePointerTrafo';
  }
}

