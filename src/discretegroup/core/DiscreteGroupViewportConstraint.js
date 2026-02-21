/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { DiscreteGroupSimpleConstraint } from './DiscreteGroupSimpleConstraint.js';

/**
 * Port of `de.jtem.discretegroup.core.DiscreteGroupViewportConstraint`.
 *
 * Works with a `Graphics3D`-like context that provides `getObjectToNDC()`.
 */
export class DiscreteGroupViewportConstraint extends DiscreteGroupSimpleConstraint {
  constructor(mind, minw, maxd, maxw, gc = null) {
    super(maxd, maxw);
    this.objectToNDCContext = gc;
    this.objectToNDC = null;
    this.fudge = 1.2;
    this.ztlate = 0.5;
    this.valid = true;
    this.cameraPosition = [0, 0, 0, 0];
    this.points = null;
    this.tpoints = [[0, 0, 0, 1]];
    this.minDistance = mind;
    this.minWordLength = minw;
    if (this.objectToNDCContext != null) {
      this.objectToNDC = this.objectToNDCContext.getObjectToNDC?.() ?? null;
    }
  }

  acceptElement(dge) {
    // Minimal conditions first: if either is satisfied return true.
    if (this.minWordLength > 0 && (dge.getWord() || '').length <= this.minWordLength) return true;

    const elemMat = dge.getArray();
    if (this.minDistance > 0) {
      this.tmp = Rn.matrixTimesVector(this.tmp, elemMat, this.centerPoint);
      const d = Pn.distanceBetween(this.tmp, this.centerPoint, dge.getMetric());
      if (d <= this.minDistance) return true;
    }

    // Superclass acceptance check (max distance / word length / count).
    if (!super.acceptElement(dge)) return false;
    if (this.objectToNDC == null) return true;

    const mat = Rn.times(null, this.objectToNDC, elemMat);
    if (this.points == null) {
      Rn.matrixTimesVector(this.tpoints[0], mat, this.centerPoint);
    } else {
      Rn.matrixTimesVector(this.tpoints, mat, this.points);
    }

    for (let i = 0; i < this.tpoints.length; i += 1) {
      const p = this.tpoints[i];
      Pn.dehomogenize(p, p);
      if (Math.abs(p[2]) > 1.0) return false;
      if (Math.abs(p[0]) <= this.fudge && Math.abs(p[1]) <= this.fudge) return true;
    }
    return false;
  }

  getModelToNDC() {
    return this.objectToNDCContext?.getObjectToNDC?.() ?? null;
  }

  update() {
    this.objectToNDC = this.objectToNDCContext?.getObjectToNDC?.() ?? null;
  }

  toString() {
    const matStr = this.objectToNDC ? Rn.matrixToString(this.objectToNDC) : 'null';
    return `mind ${this.getMinDistance()}\tmaxd ${this.getMaxDistance()}\ttlate ${this.getZtlate()}\to2ndc = \t${matStr}`;
  }

  getGraphicsContext() {
    return this.objectToNDCContext;
  }

  setGraphicsContext(gc) {
    this.objectToNDCContext = gc;
    this.update();
  }

  getFudge() {
    return this.fudge;
  }

  setFudge(fudge) {
    this.fudge = fudge;
  }

  getZtlate() {
    return this.ztlate;
  }

  setZtlate(ztlate) {
    this.ztlate = ztlate;
  }

  getPoints() {
    return this.points;
  }

  setPoints(points) {
    this.points = points;
    if (points == null || points.length === 0) {
      this.tpoints = [[0, 0, 0, 1]];
      return;
    }
    this.tpoints = new Array(points.length).fill(0).map(() => new Array(points[0].length).fill(0));
  }

  getMinDistance() {
    return this.minDistance;
  }

  getMinWordLength() {
    return this.minWordLength;
  }

  setMinDistance(minDistance) {
    this.minDistance = minDistance;
  }

  setMinWordLength(minWordLength) {
    this.minWordLength = minWordLength;
  }

  getSimpleConstraint() {
    return new DiscreteGroupSimpleConstraint(
      this.getMaxDistance(),
      this.getMaxWordLength(),
      this.getMaxNumberElements(),
    );
  }
}

