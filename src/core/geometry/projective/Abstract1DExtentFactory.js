/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// JavaScript translation of:
//   ProjectiveGeometry/src/charlesgunn/jreality/geometry/projective/Abstract1DExtentFactory.java

import * as P3 from '../../math/P3.js';
import * as Pn from '../../math/Pn.js';
import { LineUtility } from './LineUtility.js';

/**
 * Abstract base class for 1D extents (segments/lines) in projective geometry.
 * Direct translation of `charlesgunn.jreality.geometry.projective.Abstract1DExtentFactory`.
 */
export class Abstract1DExtentFactory {
  /** @type {number} */
  offset = 0;

  /** @type {number} */
  numSegs = 12;

  /** @type {number[][]|null} */
  samples = null;

  /** @type {number[]} */
  element0 = [...P3.originP3];

  /** @type {number[]} */
  element1 = [1, 0, 0, 1];

  /** @type {number[]|null} */
  times = null;

  /** @type {number} */
  static dimension = 4;

  update() {
    throw new Error('Abstract method: update()');
  }

  getNumberOfSamples() {
    return this.numSegs;
  }

  setNumberOfSamples(numSegs) {
    // Java had an optional even-enforcement commented out; keep behavior 1:1.
    this.numSegs = numSegs;
  }

  getOffset() {
    return this.offset;
  }

  setOffset(offset) {
    this.offset = offset;
  }

  getElement0() {
    return this.element0;
  }

  setElement0(point0) {
    this.element0 = [...point0];
    if (this.element0.length === 3) {
      this.element0 = Pn.homogenize(null, this.element0);
    }
  }

  getElement1() {
    return this.element1;
  }

  setElement1(point1) {
    this.element1 = [...point1];
    if (this.element1.length === 3) {
      this.element1 = Pn.homogenize(null, this.element1);
    }
  }

  setVertices(v) {
    this.samples = v;
  }

  getVertices() {
    return this.samples;
  }

  getValueAtTime(t) {
    // return LineUtility.valueAtTime(t, samples[0], samples[samples.length-1]);
    return LineUtility.valueAtTime(t, this.element0, this.element1);
  }

  getSamples() {
    return this.samples;
  }

  setTimes(tt) {
    this.times = tt;
  }
}

