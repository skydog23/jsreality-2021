/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as P3 from './P3.js';
import * as Pn from './Pn.js';
import * as Rn from './Rn.js';
import * as PlueckerLineGeometry from './PlueckerLineGeometry.js';
import { Biquaternion } from './Biquaternion.js';

export class BiquaternionUtility {
  static projectPointOntoLine(dst, point, line) {
    if (!Biquaternion.isLine(line)) throw new Error('Must be a line');
    const polar = Biquaternion.polarize(null, line);
    const plucker = Biquaternion.lineComplexFromBivector(null, polar);
    const plane = PlueckerLineGeometry.lineJoinPoint(null, plucker, point);
    return PlueckerLineGeometry.lineIntersectPlane(dst, Biquaternion.lineComplexFromBivector(null, line), plane);
  }

  static lineSegmentCenteredOnPoint(dst, line, point, length) {
    const out = dst ?? [new Array(4), new Array(4)];
    const metric = line.getMetric().getInteger();
    const polarPlane = Pn.polarizePoint(null, point, metric);
    const point2 = PlueckerLineGeometry.lineIntersectPlane(
      null,
      Biquaternion.lineComplexFromBivector(null, line),
      polarPlane,
    );
    Pn.dragTowards(out[0], point, point2, length, metric);
    Pn.dragTowards(out[1], point, Rn.times(point2, -1, point2), length, metric);
    return out;
  }

  static diagonalMatrixTimesVector(dst, m, src) {
    const out = dst ?? new Array(src.length).fill(0);
    const n = out.length;
    if (src.length * src.length !== m.length) throw new Error('Wrong dimensions.');
    for (let i = 0; i < n; i += 1) out[i] = m[i * (n + 1)] * src[i];
    return out;
  }

  static leftCliffordTlateFor(dst, P, Q = null) {
    if (Q) {
      const dist = Pn.distanceBetween(P, Q, Pn.ELLIPTIC);
      return P3.makeScrewMotionMatrix(dst, P, Q, dist, Pn.ELLIPTIC);
    }
    const xy = Math.hypot(P[0], P[1]) || 1;
    let phi = Math.atan2(P[2], xy);
    phi = (phi + Math.PI / 2) / 2;
    const x = (Math.cos(phi) * P[0]) / xy;
    const y = (Math.cos(phi) * P[1]) / xy;
    const z = Math.sin(phi);
    const pq = [x, y, z, 0];
    return BiquaternionUtility.leftCliffordTlateFor(dst, P3.originP3, pq);
  }

  static rightCliffordTlateFor(dst, P, Q) {
    const dist = Pn.distanceBetween(P, Q, Pn.ELLIPTIC);
    return P3.makeScrewMotionMatrix(dst, P, Q, -dist, Pn.ELLIPTIC);
  }
}

