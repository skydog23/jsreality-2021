/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Quaternion, times as qTimes, add as qAdd, subtract as qSubtract, conjugate as qConjugate, length as qLength, rotationMatrixToQuaternion, quaternionToRotationMatrix } from './Quaternion.js';

const EPS = 1e-9;

class MetricTag {
  constructor(name, integer) {
    this.name = name;
    this.integer = integer;
  }
  getInteger() { return this.integer; }
  toString() { return this.name; }
}

export const Metric = Object.freeze({
  EUCLIDEAN: new MetricTag('EUCLIDEAN', 0),
  HYPERBOLIC: new MetricTag('HYPERBOLIC', -1),
  ELLIPTIC: new MetricTag('ELLIPTIC', 1),
});

export class Biquaternion {
  qr = new Quaternion(1, 0, 0, 0);
  qd = new Quaternion(0, 0, 0, 0);
  metric = Metric.EUCLIDEAN;
  lineComplex = null;

  constructor(a = Metric.EUCLIDEAN, b = null, c = null) {
    if (a instanceof Quaternion && b instanceof Quaternion) {
      this.qr = new Quaternion(a);
      this.qd = new Quaternion(b);
      this.metric = c ?? Metric.EUCLIDEAN;
      return;
    }
    if (typeof a === 'number' && typeof b === 'number') {
      this.qr = new Quaternion(a, 0, 0, 0);
      this.qd = new Quaternion(b, 0, 0, 0);
      this.metric = c ?? Metric.EUCLIDEAN;
      return;
    }
    if (a instanceof MetricTag || (a && typeof a.getInteger === 'function')) {
      this.metric = a;
      return;
    }
    this.metric = Metric.EUCLIDEAN;
  }

  getMetric() { return this.metric; }
  getRealPart() { return this.qr; }
  getDualPart() { return this.qd; }
  setLineComplex(plucker6) { this.lineComplex = plucker6?.slice?.() ?? null; return this; }
  toString() { return `Biquaternion(qr=${this.qr.toString()}, qd=${this.qd.toString()}, metric=${this.metric})`; }

  static copy(dst, src) {
    const out = dst ?? new Biquaternion(src.metric);
    out.metric = src.metric;
    out.qr = new Quaternion(src.qr);
    out.qd = new Quaternion(src.qd);
    out.lineComplex = src.lineComplex ? src.lineComplex.slice() : null;
    return out;
  }

  static times(dst, a, b) {
    // overloads: scalar*biquaternion or biquaternion*biquaternion
    if (typeof a === 'number' && b instanceof Biquaternion) {
      const out = dst ?? new Biquaternion(b.metric);
      out.metric = b.metric;
      out.qr = qTimes(null, a, b.qr);
      out.qd = qTimes(null, a, b.qd);
      out.lineComplex = b.lineComplex ? b.lineComplex.map((x) => a * x) : null;
      return out;
    }
    if (a instanceof Biquaternion && b instanceof Biquaternion) {
      const out = dst ?? new Biquaternion(a.metric);
      out.metric = a.metric;
      out.qr = qTimes(null, a.qr, b.qr);
      out.qd = qAdd(null, qTimes(null, a.qr, b.qd), qTimes(null, a.qd, b.qr));
      out.lineComplex = null;
      return out;
    }
    throw new Error('Unsupported Biquaternion.times overload');
  }

  static subtract(dst, a, b) {
    const out = dst ?? new Biquaternion(a.metric);
    out.metric = a.metric;
    out.qr = qSubtract(null, a.qr, b.qr);
    out.qd = qSubtract(null, a.qd, b.qd);
    out.lineComplex = null;
    return out;
  }

  static norm(dst, b) {
    const out = dst ?? new Biquaternion(b.metric);
    const qrConj = qConjugate(null, b.qr);
    const qdConj = qConjugate(null, b.qd);
    out.qr = qTimes(null, b.qr, qrConj);
    out.qd = qAdd(null, qTimes(null, b.qr, qdConj), qTimes(null, b.qd, qrConj));
    out.metric = b.metric;
    return out;
  }

  static isBiscalar(b) {
    return Math.abs(b.qr.x) < EPS && Math.abs(b.qr.y) < EPS && Math.abs(b.qr.z) < EPS
      && Math.abs(b.qd.x) < EPS && Math.abs(b.qd.y) < EPS && Math.abs(b.qd.z) < EPS;
  }

  static isInvertible(b) {
    return Math.abs(b.qr.re) > EPS;
  }

  static isLine(b) {
    if (b.lineComplex && b.lineComplex.length === 6) return true;
    const v = Math.hypot(b.qr.x, b.qr.y, b.qr.z, b.qd.x, b.qd.y, b.qd.z);
    return v > EPS;
  }

  static bivector(dst, b) {
    const out = dst ?? new Biquaternion(b.metric);
    out.metric = b.metric;
    out.qr = new Quaternion(0, b.qr.x, b.qr.y, b.qr.z);
    out.qd = new Quaternion(0, b.qd.x, b.qd.y, b.qd.z);
    out.lineComplex = b.lineComplex ? b.lineComplex.slice() : null;
    return out;
  }

  static normalize(axisOut, angleOut, bivector) {
    const axis = axisOut ?? new Biquaternion(bivector.metric);
    const angle = angleOut ?? new Biquaternion(bivector.metric);
    const mag = Math.max(EPS, qLength(bivector.qr));
    axis.metric = bivector.metric;
    axis.qr = qTimes(null, 1 / mag, bivector.qr);
    axis.qd = qTimes(null, 1 / mag, bivector.qd);
    axis.lineComplex = bivector.lineComplex ? bivector.lineComplex.slice() : null;
    angle.metric = bivector.metric;
    angle.qr = new Quaternion(mag, 0, 0, 0);
    angle.qd = new Quaternion(0, 0, 0, 0);
    return axis;
  }

  static polarize(dst, b) {
    // Lightweight approximation used by current utility methods.
    return Biquaternion.copy(dst ?? new Biquaternion(b.metric), b);
  }

  static lineComplexFromBivector(dst, b) {
    const out = dst ?? new Array(6).fill(0);
    if (b.lineComplex && b.lineComplex.length === 6) {
      for (let i = 0; i < 6; i += 1) out[i] = b.lineComplex[i];
      return out;
    }
    out[0] = b.qd.re;
    out[1] = b.qd.x;
    out[2] = b.qd.y;
    out[3] = b.qd.z;
    out[4] = b.qr.x;
    out[5] = b.qr.y;
    return out;
  }

  static biquaternionFromDirectIsometry(dst, matrix, metric = Metric.EUCLIDEAN) {
    const out = dst ?? new Biquaternion(metric);
    const q = new Quaternion();
    rotationMatrixToQuaternion(q, matrix);
    out.qr = q;
    // Translation approximation encoded in dual part.
    out.qd = new Quaternion(0, 0.5 * (matrix[3] ?? 0), 0.5 * (matrix[7] ?? 0), 0.5 * (matrix[11] ?? 0));
    out.metric = metric;
    return out;
  }

  static matrixFromBiquaternion(dst, biq) {
    const out = dst ?? new Array(16).fill(0);
    quaternionToRotationMatrix(out, biq.qr);
    out[3] = 2 * biq.qd.x;
    out[7] = 2 * biq.qd.y;
    out[11] = 2 * biq.qd.z;
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
  }
}

