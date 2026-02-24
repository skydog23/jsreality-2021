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
import { DiscreteGroupConstraint } from './DiscreteGroupConstraint.js';

export class DiscreteGroupSimpleConstraint extends DiscreteGroupConstraint {
  static globalMaxNumberElements = 1500;

  static defaultConstraint = new DiscreteGroupSimpleConstraint();

  constructor(maxDistance = -1, maxWordLength = -1, maxNumberElements = DiscreteGroupSimpleConstraint.globalMaxNumberElements) {
    super();
    this.maxDistance = maxDistance;
    this.maxWordLength = maxWordLength;
    this.maxNumberElements = maxNumberElements;
    this.centerPoint = [0, 0, 0, 1];
    this.manhattan = false;
    this.accepted = 0;
    this.countAccepted = true;
    this.listeners = new Set();
    this.tmp = [0, 0, 0, 1];
  }

  setManhattan(b) {
    this.manhattan = !!b;
  }

  acceptElement(dge) {
    if (this.accepted >= this.maxNumberElements) return false;
     if (this.maxDistance < 0 && this.maxWordLength < 0) {
      this.accepted++;
      return true;
     }

    if (this.maxWordLength >= 0) {
      if ((dge.getWord() || '').length > this.maxWordLength) return false;
    }

    if (this.maxDistance >= 0) {
      const mat = dge.getArray();
      this.tmp = Rn.matrixTimesVector(this.tmp, mat, this.centerPoint);
      Pn.dehomogenize(this.tmp, this.tmp);
      let d = 0;
      if (!this.manhattan) {
        d = Pn.distanceBetween(this.tmp, this.centerPoint, dge.getMetric());
      } else {
        const diff = Rn.abs(null, Rn.subtract(null, this.tmp, this.centerPoint));
        d = Math.max(diff[0], Math.max(diff[1], diff[2]));
      }
      if (d > this.maxDistance) return false;
    }

    if (this.countAccepted) this.accepted += 1;
    // if (this.accepted %10 === 0) console.log('acceptElement', this.accepted);
    return true;
  }

  setUseCount(b) {
    this.countAccepted = !!b;
  }

  reset() {
    this.accepted = 0;
  }

  getMaxNumberElements() {
    return this.maxNumberElements;
  }

  setMaxNumberElements(i) {
    this.maxNumberElements = i;
    this.broadcastChange();
  }

  getCenterPoint() {
    return this.centerPoint;
  }

  setCenterPoint(centerPoint) {
    this.centerPoint[3] = 1.0;
    for (let i = 0; i < Math.min(4, centerPoint.length); i += 1) this.centerPoint[i] = centerPoint[i];
    this.broadcastChange();
  }

  update() {this.accepted = 0;}

  getMaxDistance() {
    return this.maxDistance;
  }

  setMaxDistance(maxDistance) {
    this.maxDistance = maxDistance;
    this.broadcastChange();
  }

  getMaxWordLength() {
    return this.maxWordLength;
  }

  setMaxWordLength(maxWordLength) {
    this.maxWordLength = maxWordLength;
    this.broadcastChange();
  }

  addListener(fn) {
    this.listeners.add(fn);
  }

  removeListener(fn) {
    this.listeners.delete(fn);
  }

  broadcastChange() {
    for (const listener of this.listeners) listener(this);
  }
}

