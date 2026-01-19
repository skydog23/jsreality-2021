/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// JavaScript translation of:
//   ProjectiveGeometry/src/charlesgunn/jreality/geometry/projective/PointRangeFactory.java

import { AnimationUtility } from '../../../anim/util/AnimationUtility.js';
import { lineFromPoints, polarize as plueckerPolarize } from '../../math/PlueckerLineGeometry.js';
import * as Pn from '../../math/Pn.js';
import * as Rn from '../../math/Rn.js';
import { IndexedLineSetFactory } from '../IndexedLineSetFactory.js';
import { IndexedLineSetUtility } from '../IndexedLineSetUtility.js';
import { QuadMeshFactory } from '../QuadMeshFactory.js';
import { METRIC } from '../../shader/CommonAttributes.js';
import { getLogger, Category } from '../../util/LoggingSystem.js';
import { Abstract1DExtentFactory } from './Abstract1DExtentFactory.js';
import { LineUtility } from './LineUtility.js';

const logger = getLogger('jsreality.core.geometry.projective.PointRangeFactory');

/**
 * Direct translation of `charlesgunn.jreality.geometry.projective.PointRangeFactory`.
 */
export class PointRangeFactory extends Abstract1DExtentFactory {
  /** @type {boolean} */
  ilsDirty = true;

  /** @type {import('../../scene/IndexedLineSet.js').IndexedLineSet|null} */
  theLine = null;

  /** @type {IndexedLineSetFactory} */
  lineFactory = new IndexedLineSetFactory();

  /** @type {boolean} */
  finiteSphere = true;

  /** @type {number} */
  sphereRadius = 10; // 10E5;

  /** @type {boolean} */
  doubled = true;

  /** @type {boolean} */
  firstTime = true;

  /** @type {number[]} */
  center = [0, 0, 0, 1];

  /** @type {number[]|null} */
  oldPoint = null;

  /** @type {number[]|null} */
  plueckerLine = null;

  /** @type {number[][]} */
  cutpoints = [new Array(4).fill(0), new Array(4).fill(0)];

  isFiniteSphere() {
    return this.finiteSphere;
  }

  setFiniteSphere(finiteSphere) {
    this.finiteSphere = finiteSphere;
  }

  getSphereRadius() {
    return this.sphereRadius;
  }

  setSphereRadius(sphereRadius) {
    this.sphereRadius = sphereRadius;
  }

  isDoubled() {
    return this.doubled;
  }

  setDoubled(doubled) {
    this.doubled = doubled;
  }

  getCenter() {
    return this.center;
  }

  setCenter(center) {
    this.center = [...center];
  }

  getOldPoint() {
    return this.oldPoint;
  }

  setOldPoint(oldPoint) {
    this.oldPoint = oldPoint;
  }

  getLine() {
    // if (ilsDirty) update();
    return this.lineFactory.getIndexedLineSet();
  }

  getLineFactory() {
    return this.lineFactory;
  }

  update() {
    let isValid = true;
    if (this.finiteSphere) {
      if (this.samples == null) {
        this.samples = new Array(this.numSegs).fill(0).map(() => new Array(4).fill(0));
      }
      isValid = this.intersectLineWithSphere(this.cutpoints, 0, this.element0, this.element1, this.oldPoint, this.sphereRadius);
      if (isValid) {
        if (this.numSegs >= 2) {
          for (let i = 0; i < this.numSegs; ++i) {
            const t = i / (this.numSegs - 1.0);
            AnimationUtility.linearInterpolation(this.samples[i + this.offset], t, 0, 1, this.cutpoints[0], this.cutpoints[1]);
          }
        }
      } else {
        logger.info(Category.ALL, 'Lies outside sphere.');
      }
    } else {
      this.samples = LineUtility.samplesOn1DExtent(this.samples, this.offset, this.numSegs, this.element0, this.element1, this.doubled);
      this.samples = this.samples.map(sample => Pn.dehomogenize(null, sample));
    }

    if (isValid && this.numSegs > 0) {
      if (this.firstTime) {
        this.lineFactory = IndexedLineSetUtility.createCurveFactoryFromPointsWithFactory(this.lineFactory, this.samples, !this.finiteSphere);
        this.theLine = this.lineFactory.getIndexedLineSet();
        this.firstTime = false;
      } else {
        this.lineFactory.setVertexCoordinates(this.samples);
        this.lineFactory.update();
      }
    }
    this.ilsDirty = false;
  }

  /**
   * Java overloads:
   * - intersectLineWithSphere(result, offset, p0, p1, radius)
   * - intersectLineWithSphere(result, offset, p0, p1, oldP0, radius)
   *
   * @param {number[][]} result
   * @param {number} offset2
   * @param {number[]} p0x
   * @param {number[]} p1x
   * @param {number[]|number|null} oldP0OrRadius
   * @param {number} [radiusMaybe]
   * @returns {boolean}
   */
  intersectLineWithSphere(result, offset2, p0x, p1x, oldP0OrRadius, radiusMaybe) {
    // intersectLineWithSphere(result, offset2, p0, p1, radius)
    if (typeof oldP0OrRadius === 'number') {
      return this.intersectLineWithSphere(result, offset2, p0x, p1x, null, oldP0OrRadius);
    }

    const oldP0 = /** @type {number[]|null} */ (oldP0OrRadius);
    const radius = /** @type {number} */ (radiusMaybe);

    let p0 = [...p0x];
    let p1 = [...p1x];
    let ct = this.center;
    if (this.center.length === 3) ct = Pn.homogenize(null, this.center);
    else ct = Pn.dehomogenize(null, this.center);
    ct[3] = 0.0;
    if (result == null) {
      throw new Error("result can't be null");
    }
    // intersect line with sphere: p0 + t(p1-p0) intersect |P| = r
    if (Math.abs(p0[3]) < Math.abs(p1[3])) {
      const tmp = p1;
      p1 = p0;
      p0 = tmp;
    }
    Pn.dehomogenize(p0, p0);
    Pn.dehomogenize(p1, p1);
    let v0 = p0;
    let v = null;
    if (p0[3] === 0.0) {
      v0 = p1;
      v = p0;
    } else if (p1[3] === 0.0) {
      v = p1;
    } else {
      v = Rn.subtract(null, p1, p0);
    }
    Rn.subtract(v0, v0, ct);
    const a = Rn.innerProduct(v, v, 3);
    const b = 2 * Rn.innerProduct(v0, v, 3);
    const c = Rn.innerProduct(v0, v0, 3) - radius * radius;
    let d = b * b - 4 * a * c;
    if (d < 0) {
      return false;
    }
    d = Math.sqrt(d);
    const r0 = (-b + d) / (2 * a);
    const r1 = (-b - d) / (2 * a);
    Rn.add(result[0 + offset2], Rn.linearCombination(null, 1, v0, r0, v), ct);
    Rn.add(result[1 + offset2], Rn.linearCombination(null, 1, v0, r1, v), ct);
    Pn.dehomogenize(result[0 + offset2], result[0 + offset2]);
    Pn.dehomogenize(result[1 + offset2], result[1 + offset2]);
    if (oldP0 != null) {
      const d0 = Pn.distanceBetween(result[0 + offset2], oldP0, Pn.EUCLIDEAN);
      const d1 = Pn.distanceBetween(result[1 + offset2], oldP0, Pn.EUCLIDEAN);
      if (d0 > d1) {
        const tmp = result[0 + offset2];
        result[0 + offset2] = result[1 + offset2];
        result[1 + offset2] = tmp;
      }
    }
    return true;
  }

  /**
   * @param {number[]} pt0
   * @param {number[]} pt1
   * @param {number} [numSegs=12]
   * @returns {import('../../scene/IndexedLineSet.js').IndexedLineSet}
   */
  static line(pt0, pt1, numSegs = 12) {
    let pt04 = pt0;
    let pt14 = pt1;
    if (pt0.length === 3 || pt1.length === 3) {
      pt04 = [pt0[0], pt0[1], 0, pt0[2]];
      pt14 = [pt1[0], pt1[1], 0, pt1[2]];
    }
    const verts = LineUtility.coordinatesFor1DExtent(null, 0, numSegs, pt04, pt14);
    return IndexedLineSetUtility.createCurveFromPoints(verts, true);
  }

  setPluckerLine(pc) {
    this.plueckerLine = [...pc];
    const pts = LineUtility.twoPointsOnLine(null, pc);
    this.setElement0(pts[0]);
    this.setElement1(pts[1]);
  }

  set2DLine(abc) {
    const pc = [abc[2], 0, -abc[1], 0, -abc[0], 0];
    const pts = LineUtility.twoPointsOnLine(null, pc);
    this.setElement0(pts[0]);
    this.setElement1(pts[1]);
  }

  getPluckerLine() {
    if (this.plueckerLine != null) return this.plueckerLine;
    if (this.element0 == null || this.element1 == null) return null;
    return lineFromPoints(null, this.element0, this.element1);
  }

  static count = 0;

  /**
   * @param {QuadMeshFactory|null} ifsf
   * @param {number} r
   * @param {number} circleRes
   * @returns {QuadMeshFactory}
   */
  getTubedLine(ifsf, r, circleRes) {
    const plueckerLine = this.getPluckerLine();
    const polarLine = plueckerPolarize(null, plueckerLine, Pn.ELLIPTIC);
    circleRes = 2 * Math.floor(circleRes / 2);
    const polarF = new PointRangeFactory();
    polarF.setFiniteSphere(false);
    polarF.setPluckerLine(polarLine);
    polarF.setNumberOfSamples(circleRes);
    polarF.update();
    const polarSamples = polarF.getSamples();

    const verts = new Array(this.numSegs + 1);
    for (let i = 0; i <= this.numSegs; ++i) {
      verts[i] = new Array(circleRes + 1);
      for (let j = 0; j <= circleRes; ++j) {
        verts[i][j] = Pn.dragTowards(null, this.samples[i % this.numSegs], polarSamples[j % circleRes], r, Pn.ELLIPTIC);
      }
    }
    if (ifsf == null) ifsf = new QuadMeshFactory();
    ifsf.setMetric(Pn.ELLIPTIC);
    ifsf.setClosedInUDirection(true);
    ifsf.setClosedInVDirection(true);
    ifsf.setGenerateFaceNormals(true);
    ifsf.setGenerateVertexNormals(true);
    ifsf.setGenerateTextureCoordinates(true);
    ifsf.setULineCount(circleRes + 1);
    ifsf.setVLineCount(this.numSegs + 1);
    ifsf.setVertexCoordinates(verts);
    ifsf.update();
    const geom = ifsf.getIndexedFaceSet();
    geom.setName(`tubedLine${PointRangeFactory.count++}`);
    geom.setGeometryAttribute(METRIC, Pn.ELLIPTIC);
    return ifsf;
  }
}

