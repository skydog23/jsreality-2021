/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// JavaScript translation of:
//   ProjectiveGeometry/src/charlesgunn/jreality/geometry/projective/LineUtility.java

import { lineFromPoints, dualizeLine, lineToSkewMatrix, lineIntersectPlane, lineJoinPoint, lineFromPlanes } from '../../math/PlueckerLineGeometry.js';
import * as Pn from '../../math/Pn.js';
import * as P3 from '../../math/P3.js';
import * as Rn from '../../math/Rn.js';
import { GeometryUtility } from '../GeometryUtility.js';
import { Primitives } from '../Primitives.js';
import { Matrix } from '../../math/Matrix.js';
import { MatrixBuilder } from '../../math/MatrixBuilder.js';
import { SceneGraphComponent } from '../../scene/SceneGraphComponent.js';
import Rectangle3D from '../../util/Rectangle3D.js';
import { PointRangeFactory } from './PointRangeFactory.js';

/**
 * Static projective line utilities.
 * Direct translation of `charlesgunn.jreality.geometry.projective.LineUtility`.
 */
export class LineUtility {
  // [28.10.21) believe it or not, the line (1,0,0,0,1,0) (vertical line through (1,0,0,1)
  // doesn't render correctly in euclidean space unless this offset is non-zero
  // (but in spherical space it does work. Also turning on "render 3-sphere" doesn't help
  static lineCoordOffset = 0.000001;

  /**
   * @param {number[][]|null} pts
   * @param {number[]} pluckerLine
   * @returns {number[][]}
   */
  static twoPlanesOnLine(pts, pluckerLine) {
    if (pts == null) pts = [new Array(4), new Array(4)];
    const m = lineToSkewMatrix(null, pluckerLine);
    const mx = new Matrix(m);
    let row = null;
    let i = 0;
    const size = Rn.euclideanNormSquared(pluckerLine);
    for (; i < 4; ++i) {
      row = mx.getColumn(i);
      if (Rn.euclideanNormSquared(row) > size * 10e-4) break;
    }
    if (i === 4) throw new Error(`Degenerate plucker line ${Rn.toString(pluckerLine)}`);
    pts[0] = row;
    i++;
    for (; i < 4; ++i) {
      row = mx.getColumn(i);
      const pl = lineFromPoints(null, row, pts[0]);
      const ll = Rn.innerProduct(pl, pl);
      if (ll > size * 10e-16) {
        if (Rn.euclideanNormSquared(row) > size * 10e-4) break;
      }
    }
    if (i === 4) throw new Error(`Degenerate plucker line ${Rn.toString(pluckerLine)}`);
    pts[1] = row;
    return pts;
  }

  /**
   * @param {number[][]|null} pts
   * @param {number[]} pluckerLine
   * @returns {number[][]}
   */
  static twoPointsOnLine(pts, pluckerLine) {
    return LineUtility.twoPlanesOnLine(pts, dualizeLine(null, pluckerLine));
  }

  /**
   * @param {number[][]|null} verts
   * @param {number[]} pt0
   * @param {number[]} pt1
   * @param {number} num
   * @returns {number[][]}
   */
  static ellipticSegment(verts, pt0, pt1, num) {
    if (verts == null) verts = new Array(num).fill(0).map(() => new Array(pt0.length));
    for (let i = 0; i < num; ++i) {
      const d = i / (num - 1.0);
      Pn.linearInterpolation(verts[i], pt0, pt1, d, Pn.ELLIPTIC);
    }
    return verts;
  }

  /**
   * @param {number[][]|null} verts
   * @param {number} offset
   * @param {number} numSegs
   * @param {number[]} pt0
   * @param {number[]} pt1
   * @param {boolean} doubled
   * @returns {number[][]}
   */
  static samplesOn1DExtent(verts, offset, numSegs, pt0, pt1, doubled) {
    const d3 = (pt0.length === 3);
    let pt04 = pt0;
    let pt14 = pt1;
    if (d3) {
      pt04 = Pn.homogenize(null, pt0);
      pt14 = Pn.homogenize(null, pt1);
    }
    if (doubled) {
      if ((numSegs % 2) !== 0) {
        throw new Error('Number of segments must be even');
      }
    }
    if (verts == null) verts = new Array(numSegs).fill(0).map(() => new Array(4));
    const lim = doubled ? (numSegs / 2) : numSegs;
    const angle = (doubled ? 2 : 1) * Math.PI / numSegs;
    const begin = (-angle * (lim / 2 + LineUtility.lineCoordOffset));
    const p0 = Pn.normalize(null, pt04, Pn.ELLIPTIC);
    const p1 = Pn.normalize(null, pt14, Pn.ELLIPTIC);
    for (let i = 0; i < lim; ++i) {
      Pn.dragTowards(verts[offset + i], p0, p1, begin + i * angle, Pn.ELLIPTIC);
      if (doubled) Rn.times(verts[offset + lim + i], -1.0, verts[offset + i]);
    }
    return verts;
  }

  /**
   * @param {number[][]|null} verts
   * @param {number} numSegs
   * @param {number[]} line
   * @param {boolean} doubled
   * @returns {number[][]}
   */
  static samplesOnLine(verts, numSegs, line, doubled) {
    const points = LineUtility.twoPointsOnLine(null, line);
    return LineUtility.samplesOn1DExtent(verts, 0, numSegs, points[0], points[1], doubled);
  }

  /**
   * @param {number} t
   * @param {number[]} p0
   * @param {number[]} p1
   * @returns {number[]}
   */
  static valueAtTime(t, p0, p1) {
    const rads = t * Math.PI;
    return Pn.dragTowards(null, p0, p1, rads, Pn.ELLIPTIC);
  }

  /**
   * @param {number[][]|null} verts
   * @param {number} offset
   * @param {number} numSegs
   * @param {number[]} pt0
   * @param {number[]} pt1
   * @returns {number[][]}
   */
  static coordinatesFor1DExtent(verts, offset, numSegs, pt0, pt1) {
    return LineUtility.samplesOn1DExtent(verts, offset, numSegs, pt0, pt1, true);
  }

  /**
   * @param {SceneGraphComponent|null} exists
   * @param {number[]} plane
   * @param {number[]} point
   * @param {number} scale
   * @returns {SceneGraphComponent}
   */
  static sceneGraphForPlane(exists, plane, point, scale) {
    if (exists == null) exists = new SceneGraphComponent();
    const N = [plane[0], plane[1], plane[2]];
    if (Math.abs(Rn.innerProduct(plane, point)) > 10e-6) {
      throw new Error('Point must lie on plane');
    }
    MatrixBuilder.euclidean().translate(point).rotateFromTo([0, 0, 1], plane).scale(scale).assignTo(exists);
    exists.setGeometry(Primitives.regularPolygon(20));
    return exists;
  }

  /**
   * @param {SceneGraphComponent|null} exists
   * @param {number[]} line
   * @param {number[]|null} point
   * @param {number} scale
   * @param {boolean} [finite=false]
   * @returns {SceneGraphComponent}
   */
  static sceneGraphForLine(exists, line, point=null, scale=false, finite = false) {
    if (exists == null) exists = new SceneGraphComponent();
    if (line.length === 3) line = LineUtility.convert2DLineToPluckerLine(line);
    const prf = new PointRangeFactory();
    prf.setPluckerLine(line);
    if (point == null) point = [0, 0, 0, 1];
    prf.setCenter(point);
    prf.setSphereRadius(scale);
    prf.setFiniteSphere(finite);
    prf.update();
    exists.setGeometry(prf.getLine());
    prf.getLine().setGeometryAttribute(GeometryUtility.BOUNDING_BOX, Rectangle3D.EMPTY_BOX);
    return exists;
  }

  /**
   * @param {SceneGraphComponent|null} exists
   * @param {number[][]} lines
   * @param {number[][]|null} points
   * @param {number} scale
   * @param {boolean} finite
   * @returns {SceneGraphComponent}
   */
  static sceneGraphForCurveOfLines(exists, lines, points, scale, finite) {
    const newsgc = (exists == null || exists.getChildComponentCount() !== lines.length);
    if (exists == null) {
      exists = new SceneGraphComponent();
    }
    const n = lines.length;
    for (let i = 0; i < n; ++i) {
      let child = null;
      if (!newsgc) child = exists.getChildComponent(i);
      const child2 = LineUtility.sceneGraphForLine(child, lines[i], points == null ? P3.originP3 : points[i], scale, finite);
      if (child == null) exists.addChild(child2);
    }
    return exists;
  }

  static hack1 = new SceneGraphComponent();
  static hack2 = new SceneGraphComponent();
  static hack3 = new SceneGraphComponent();

  /**
   * @param {SceneGraphComponent|null} hack
   * @param {number[]} line
   * @param {number[]} center
   * @param {number} rad
   * @returns {number[][]}
   */
  static lineIntersectSphere(hack, line, center, rad) {
    if (center.length === 3) center = Pn.homogenize(null, center);
    const ct = Rn.subtract(null, center, [0, 0, 0, 1]);
    // intersect line with sphere
    // p0 + t(p1-p0)  intersect |P| = r
    const q = [null, null];
    const plane = LineUtility.#directionOfLine(null, line);
    plane[3] = 0;
    q[0] = lineIntersectPlane(null, line, plane);
    plane[3] = 1;
    q[1] = lineIntersectPlane(null, line, plane);
    Pn.dehomogenize(q[0], q[0]);
    Pn.dehomogenize(q[1], q[1]);
    let v0 = q[0];
    let v = null;
    if (q[0][3] === 0.0) {
      v0 = q[1];
      v = q[0];
    } else if (q[1][3] === 0.0) {
      v = q[1];
    } else {
      v = Rn.subtract(null, q[1], q[0]);
    }
    Rn.subtract(v0, v0, ct);
    // solve for solutions of q1 + tq0 intersect sphere with radius r1
    // that is, t^2<q0,q0>+2t<q0,q1>+<q1,q1>-r1*r1=0
    const a = Rn.innerProduct(v, v);
    const b = 2 * Pn.innerProduct(v0, v, Pn.EUCLIDEAN);
    const c = Pn.innerProduct(v0, v0, Pn.EUCLIDEAN) - rad * rad;
    const d = b * b - 4 * a * c;
    let p1, p2;
    let t1, t2;
    if (d < 0) {
      // return closest point on sphere to line
      // first find plane through center perpendicular to direction of line
      p1 = LineUtility.#directionOfLine(null, line);
      const plane0 = [p1[0], p1[1], p1[2], -Rn.innerProduct(p1, center, 3)];
      const plane1 = lineJoinPoint(null, line, center);
      const linem = lineFromPlanes(null, plane0, plane1);
      if (hack != null && hack.getChildComponentCount() === 0) {
        hack.addChildren(LineUtility.hack1, LineUtility.hack2, LineUtility.hack3);
      }
      // Debug visualization; skip if PointRangeFactory isn't available yet.
      try {
        if (hack != null) {
          LineUtility.sceneGraphForLine(LineUtility.hack1, linem, null, 4.0);
          LineUtility.sceneGraphForPlane(LineUtility.hack2, plane0, center, 1.0);
          LineUtility.sceneGraphForPlane(LineUtility.hack3, plane1, center, 1.0);
        }
      } catch (_e) {
        // intentionally ignore (debug only)
      }
      p1 = LineUtility.#directionOfLine(null, linem);
      Rn.setToLength(p1, p1, rad);
      p2 = Rn.times(null, -1, p1);
      Rn.add(p2, p2, ct);
      p1 = p2;
    } else {
      const disc = Math.sqrt(d);
      t1 = (-b + disc) / (2 * a);
      t2 = (-b - disc) / (2 * a);
      p1 = Rn.add(null, Rn.linearCombination(null, 1, v0, t1, v), ct);
      p2 = Rn.add(null, Rn.linearCombination(null, 1, v0, t2, v), ct);
    }
    return [p1, p2];
  }

  static convert2DLineToPluckerLine(abc) {
    return [abc[2], 0, -abc[1], 0, -abc[0], 0];
  }
  /**
   * @param {number[]|null} dst
   * @param {number[]} line
   * @returns {number[]}
   * @private
   */
  static #directionOfLine(dst, line) {
    if (dst == null) dst = new Array(4);
    dst[0] = line[2];
    dst[1] = -line[4];
    dst[2] = line[5];
    return dst;
  }
}

