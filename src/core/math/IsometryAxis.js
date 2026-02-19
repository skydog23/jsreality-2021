/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Quaternion, IJK as quaternionIJK } from './Quaternion.js';
import { Biquaternion, Metric } from './Biquaternion.js';
import * as Rn from './Rn.js';

/**
 * Simplified compatibility port of `charlesgunn.math.IsometryAxis`.
 * Computes axis-angle style data for direct isometries.
 */
export class IsometryAxis {
  isometry = null;
  axis = null;
  angle = null;
  metric = Metric.EUCLIDEAN;
  isTranslation = false;
  isRightTranslation = false;
  isIdentity = false;
  fromLog = false;
  matrix = new Array(16).fill(0);

  constructor(arg0, arg1 = null, arg2 = null) {
    if (arg0 instanceof Biquaternion && arg1 instanceof Biquaternion) {
      this.axis = arg0;
      this.angle = arg1;
      this.metric = arg2 ?? Metric.EUCLIDEAN;
      this.fromLog = true;
      return;
    }
    if (arg0 instanceof Biquaternion) {
      this.isometry = arg0;
      this.metric = arg0.getMetric();
      this.#init();
      return;
    }
    this.matrix = (arg0 ?? this.matrix).slice();
    this.metric = arg1 ?? Metric.EUCLIDEAN;
    this.isometry = Biquaternion.biquaternionFromDirectIsometry(null, this.matrix, this.metric);
    this.#init();
  }

  getIsometry() { return this.isometry; }
  getAxis() { return this.axis; }
  getAngle() { return this.angle; }
  getMatrix() { return this.matrix; }
  setMatrix(m) { this.matrix = m; }

  getAngles() {
    return [this.angle?.qr?.re ?? 0, this.angle?.qd?.re ?? 0];
  }

  exp(t) {
    if (this.isIdentity) return this.isometry;
    const theta = t * (this.angle?.qr?.re ?? 0);
    const half = theta / 2;
    const axisVec = quaternionIJK([0, 0, 1], this.axis?.qr ?? new Quaternion(0, 0, 0, 1));
    const u = Rn.normalize(null, axisVec);
    const rot = new Quaternion(Math.cos(half), Math.sin(half) * u[0], Math.sin(half) * u[1], Math.sin(half) * u[2]);
    return new Biquaternion(rot, new Quaternion(0, 0, 0, 0), this.metric);
  }

  #init() {
    if (this.fromLog) return;
    this.matrix = Biquaternion.matrixFromBiquaternion(this.matrix, this.isometry);
    const bivector = Biquaternion.bivector(null, this.isometry);
    this.axis = new Biquaternion(this.metric);
    this.angle = new Biquaternion(this.metric);
    this.axis = Biquaternion.normalize(this.axis, this.angle, bivector);
    if (Biquaternion.isBiscalar(this.isometry)) {
      this.isIdentity = true;
      return;
    }
    const v = quaternionIJK([0, 0, 0], this.isometry.qr);
    const vnorm = Rn.euclideanNorm(v);
    const w = this.isometry.qr.re;
    const theta = 2 * Math.atan2(vnorm, w);
    this.angle.qr.re = theta;
    this.angle.qd.re = 0;
    if (Math.abs(theta) < 1e-9 && Math.hypot(this.isometry.qd.x, this.isometry.qd.y, this.isometry.qd.z) > 1e-9) {
      this.isTranslation = true;
    }
  }
}

