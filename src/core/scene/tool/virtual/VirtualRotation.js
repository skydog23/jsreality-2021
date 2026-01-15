/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of de.jreality.toolsystem.virtual.VirtualRotation.
// Computes a trackball rotation matrix from PointerNDC and CameraToWorld.

import { ToolEvent } from '../ToolEvent.js';
import { MissingSlotException } from '../MissingSlotException.js';
import * as Rn from '../../../math/Rn.js';
import * as P3 from '../../../math/P3.js';

/**
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 */

export class VirtualRotation {
  /** @type {InputSlot|null} */
  #pointerNDC = null;

  /** @type {InputSlot|null} */
  #cameraToWorld = null;

  /** @type {InputSlot|null} */
  #out = null;

  /** @type {number} */
  #gain = 4;

  /** @type {number} */
  #oldX = Number.POSITIVE_INFINITY;

  /** @type {number} */
  #oldY = 0;

  /** @type {number[]} */
  #mouseCoords = [0, 0, 0];

  /** @type {number[]} */
  #mouseCoordsOld = [0, 0, 0];

  /** @type {number[]} */
  #result = Rn.identityMatrix(4);

  /**
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    if (this.#pointerNDC === null || this.#cameraToWorld === null || this.#out === null) {
      return null;
    }

    // Mirror the Java semantics: ignore updates caused by CameraToWorld events.
    if (context.getEvent().getInputSlot() === this.#cameraToWorld) {
      return null;
    }

    const pointer = context.getTransformationMatrix(this.#pointerNDC);
    if (!pointer) {
      throw new MissingSlotException(this.#pointerNDC);
    }

    if (this.#oldX === Number.POSITIVE_INFINITY) {
      this.#oldX = pointer[3];
      this.#oldY = pointer[7];
      return null;
    }

    const x = pointer[3];
    const y = pointer[7];

    const dist = x * x + y * y;
    const z = dist < 2 ? Math.sqrt(2 - dist) : 0;

    // mouseCoords = normalize([x, y, z])
    this.#mouseCoords[0] = x;
    this.#mouseCoords[1] = y;
    this.#mouseCoords[2] = z;
    Rn.normalize(this.#mouseCoords, this.#mouseCoords);

    const cross = Rn.crossProduct(null, this.#mouseCoordsOld, this.#mouseCoords);
    const angle = this.#gain * Math.asin(Rn.euclideanNorm(cross));

    // Transform axis from camera coords to world coords using CameraToWorld.
    const axis4 = [cross[0], cross[1], cross[2], 0];
    const c2w = context.getTransformationMatrix(this.#cameraToWorld);
    if (!c2w) {
      throw new MissingSlotException(this.#cameraToWorld);
    }
    const axisWorld4 = Rn.matrixTimesVector(null, c2w, axis4);
    const axisWorld = [axisWorld4[0], axisWorld4[1], axisWorld4[2]];

    // result = rotation(axisWorld, angle)
    this.#result = P3.makeRotationMatrix(this.#result, axisWorld, angle);

    // Update old coords (match Java: store un-normalized x,y,z)
    this.#mouseCoordsOld[0] = x;
    this.#mouseCoordsOld[1] = y;
    this.#mouseCoordsOld[2] = z;

    return ToolEvent.createWithTransformation(
      this,
      context.getEvent().getTimeStamp(),
      this.#out,
      this.#result
    );
  }

  /**
   * @param {InputSlot[]} inputSlots
   * @param {InputSlot} result
   * @param {Object|Map<string, Object>|null} configuration
   */
  initialize(inputSlots, result, configuration) {
    this.#pointerNDC = inputSlots[0] || null;
    this.#cameraToWorld = inputSlots[1] || null;
    this.#out = result;

    const cfg = configuration && typeof configuration === 'object' ? configuration : null;
    const gain = cfg && /** @type {*} */ (cfg).gain;
    if (typeof gain === 'number' && Number.isFinite(gain)) {
      this.#gain = gain;
    }
  }

  dispose() {
    // No resources to dispose.
  }

  getName() {
    return 'Virtual: Rotation';
  }
}


