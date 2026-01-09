/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// JavaScript translation of:
//   ProjectiveGeometry/src/charlesgunn/jreality/geometry/projective/PointCollector.java

import * as Rn from '../../math/Rn.js';
import { GeometryAttribute } from '../../scene/GeometryAttribute.js';
import { fromDataList } from '../../scene/data/DataUtility.js';
import { getLogger, Level, setModuleLevel } from '../../util/LoggingSystem.js';
import { PointSetFactory } from '../PointSetFactory.js';
import { Snake } from '../Snake.js';

const logger = getLogger('jsreality.core.geometry.projective.PointCollector');
setModuleLevel(logger.getModuleName(), Level.FINE);

/**
 * Collects points into a fixed-size cyclic buffer and exposes a `Snake` curve.
 *
 * Direct translation of `charlesgunn.jreality.geometry.projective.PointCollector`.
 */
export class PointCollector {
  /** @type {Snake} */
  snake;

  /** @type {number} */
  length;

  /** @type {number[][]} */
  points;

  /** @type {number} points to next position to write into */
  count = 0;

  // option: check if the curve crosses over the plane at infinity, and attempt to insert
  // some extra segments so it gets drawn correctly.
  /** @type {boolean} */
  projective = true;

  /** @type {number} */
  insertCount = 10;

  /** @type {boolean} */
  checkInfinity = false;

  /**
   * @param {number} l
   * @param {number} f
   */
  constructor(l, f) {
    this.length = l;
    this.points = new Array(this.length).fill(0).map(() => new Array(f).fill(0));
    this.snake = new Snake(this.points);
    this.snake.setName?.('PCSnake');
    this.reset();
  }

  isCheckInfinity() {
    return this.checkInfinity;
  }

  setCheckInfinity(checkInfinity) {
    this.checkInfinity = checkInfinity;
  }

  setDefaultValue(p) {
    for (let i = 0; i < this.length; ++i) this.points[i] = [...p];
  }

  addPoint(p) {
    this.addPointPrivate(p);
    this.snake.update();
  }

   /**
   * @param {Array<number[]>} points
   */
   addPoints(points) {
    for (const p of points) this.addPointPrivate(p);
    this.snake.update();
  }

addPointPrivate(p) {
    if (p.length !== this.points[0].length) {
      throw new Error('wrong length vector');
    }
    let index = (this.count % this.length);
    for (let i = 0; i < p.length; ++i) this.points[index][i] = p[i];
    const snakeinfo = this.snake.getInfo();
    snakeinfo[0] = (this.count < this.length) ? 0 : (this.count + 1) % this.length;
    snakeinfo[1] = (this.count < this.length) ? this.count+1 : this.length;
    this.count++;
  }

  crossLAI(prev, p) {
    // guarantee same sign for w-coordinate
    let p2 = (p[3] * prev[3] >= 0) ? p : Rn.times(null, -1, p);
    // now we can compare the two points
    let prdotp = Rn.innerProductN(prev, p2, 3);
    // it has probably crossed the line at infinity if the innerproduct is negative and the absolute value of the dot product is greater than the product of the weights
    return (prdotp < 0 && Math.abs(prdotp) > prev[3]*p2[3]);
  }

  getCurve() {
    return this.snake.ifsf.getIndexedLineSet();
  }

  getCount() {
    return this.count;
  }

  getPointSetFactory() {
    const begin = this.snake.getInfo()[0];
    const pts = new Array(this.count).fill(0).map(() => new Array(this.points[0].length));
    const allpts = fromDataList(this.snake.getVertexAttribute(GeometryAttribute.COORDINATES));
    for (let i = 0; i < this.count; ++i) {
      pts[i] = allpts[i + begin];
    }
    const psf = new PointSetFactory();
    psf.setVertexCount(this.count);
    psf.setVertexCoordinates(pts);
    psf.update();
    return psf;
  }

  reset() {
    const snakeinfo = this.snake.getInfo();
    snakeinfo[0] = snakeinfo[1] = 0;
    this.snake.update();
    this.count = 0;
  }
}


