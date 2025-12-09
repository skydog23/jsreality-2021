/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of de.jreality.toolsystem.virtual.VirtualMousePointerTrafo.
// Extends VirtualRawMousePointerTrafo by normalizing the pointer frame to an
// orthonormal basis and emitting a ToolEvent for the output slot.

import * as Rn from '../../../math/Rn.js';
import { ToolEvent } from '../ToolEvent.js';
import { VirtualRawMousePointerTrafo } from './VirtualRawMousePointerTrafo.js';

/**
 * @typedef {import('../VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 * @typedef {import('../InputSlot.js').InputSlot} InputSlot
 */

export class VirtualMousePointerTrafo extends VirtualRawMousePointerTrafo {
  /**
   * @param {InputSlot} ndcToWorldSlot - Slot providing the NDC→World matrix
   * @param {InputSlot} pointerNdcSlot - Slot providing the raw pointer in NDC
   * @param {InputSlot} outSlot - Output slot (e.g. POINTER_TRANSFORMATION)
   */
  constructor(ndcToWorldSlot, pointerNdcSlot, outSlot) {
    super(ndcToWorldSlot, pointerNdcSlot, outSlot);
    this._outSlot = outSlot;
  }

  /**
   * Process the current event and emit a ToolEvent with the normalized
   * POINTER_TRANSFORMATION matrix.
   *
   * @param {VirtualDeviceContext} context
   * @returns {ToolEvent|null}
   */
  process(context) {
    const pointerTrafo = this.computePointerTrafo(context);
    if (!pointerTrafo) return null;

    // Normalization code from VirtualMousePointerTrafo.java
    for (let i = 0; i < 4; i++) {
      const w = pointerTrafo[12 + i];
      if (Math.abs(w) > Rn.TOLERANCE) {
        this.#scaleColumn(pointerTrafo, i, 1 / w);
      }
    }
    for (let i = 0; i < 3; i++) {
      this.#columnTrafo(pointerTrafo, i, 3, -1);
    }

    let nrm = this.#columnNorm(pointerTrafo, 2);
    if (nrm > Rn.TOLERANCE) {
      this.#scaleColumn(pointerTrafo, 2, -1 / nrm);
    }
    for (let i = 1; i >= 0; i--) {
      this.#columnTrafo(
        pointerTrafo,
        i,
        i + 1,
        -this.#scalarColumnProduct(pointerTrafo, i, i + 1)
      );
    }

    this.#columnTrafo(
      pointerTrafo,
      1,
      2,
      -this.#scalarColumnProduct(pointerTrafo, 1, 2)
    );
    nrm = this.#columnNorm(pointerTrafo, 1);
    if (nrm > Rn.TOLERANCE) {
      this.#scaleColumn(pointerTrafo, 1, 1 / nrm);
    }

    this.#columnTrafo(
      pointerTrafo,
      0,
      2,
      -this.#scalarColumnProduct(pointerTrafo, 0, 2)
    );
    this.#columnTrafo(
      pointerTrafo,
      0,
      1,
      -this.#scalarColumnProduct(pointerTrafo, 0, 1)
    );
    nrm = this.#columnNorm(pointerTrafo, 0);
    if (nrm > Rn.TOLERANCE) {
      this.#scaleColumn(pointerTrafo, 0, 1 / nrm);
    }

    // Ensure last row is [0,0,0,1]
    pointerTrafo[12] = 0;
    pointerTrafo[13] = 0;
    pointerTrafo[14] = 0;
    pointerTrafo[15] = 1;

    const event = ToolEvent.createWithTransformation(
      this,
      context.getEvent().getTimeStamp(),
      this._outSlot,
      pointerTrafo
    );
    return event;
  }

  #scaleColumn(matrix, col, factor) {
    matrix[col] *= factor;
    matrix[col + 4] *= factor;
    matrix[col + 8] *= factor;
    matrix[col + 12] *= factor;
  }

  #columnTrafo(matrix, i, j, factor) {
    matrix[i] += matrix[j] * factor;
    matrix[i + 4] += matrix[j + 4] * factor;
    matrix[i + 8] += matrix[j + 8] * factor;
    matrix[i + 12] += matrix[j + 12] * factor;
  }

  #scalarColumnProduct(matrix, i, j) {
    return (
      matrix[i] * matrix[j] +
      matrix[i + 4] * matrix[j + 4] +
      matrix[i + 8] * matrix[j + 8] +
      matrix[i + 12] * matrix[j + 12]
    );
  }

  #columnNorm(matrix, i) {
    return Math.sqrt(this.#scalarColumnProduct(matrix, i, i));
  }

  /** @override */
  getName() {
    return 'MousePointerTrafo';
  }
}

