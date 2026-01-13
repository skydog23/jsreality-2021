/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import * as Rn from './Rn.js';
import * as P3 from './P3.js';
import * as Pn from './Pn.js';
import { QuadMeshFactory } from '../geometry/QuadMeshFactory.js';
import { getLogger, Level, Category } from '../util/LoggingSystem.js';

const logger = getLogger('jsreality.core.math.PlueckerLineGeometry');

export const LINE_SPACE = 0;      // sig (3,3)
export const SPHERE_SPACE = 1;    // sig (4,2)
export const HYPERBOLIC = 2;      // sig (5,1)
export const ELLIPTIC = 3;        // sig (6,0)

const tolerance = 10e-8;

/**
 * Calculate Pluecker coordinates for the line spanned by p0 and p1.
 * Inputs are homogeneous (length 4).
 * @param {number[]|null} dst
 * @param {number[]} p0
 * @param {number[]} p1
 * @returns {number[]}
 */
export function lineFromPoints(dst, p0, p1) {
  if (p0.length !== 4 || p1.length !== 4) {
    throw new Error('Input points must be homogeneous vectors');
  }
  const coords = dst == null ? new Array(6) : dst;
  coords[0] = p0[0] * p1[1] - p0[1] * p1[0];
  coords[1] = p0[0] * p1[2] - p0[2] * p1[0];
  coords[2] = p0[0] * p1[3] - p0[3] * p1[0];
  coords[3] = p0[1] * p1[2] - p0[2] * p1[1];
  // Note: sign flip in the 5th element to match the inner product convention (Java comment).
  coords[4] = p0[3] * p1[1] - p0[1] * p1[3];
  coords[5] = p0[2] * p1[3] - p0[3] * p1[2];
  return coords;
}

/**
 * @param {number[]|null} dst
 * @param {number[]} plane0
 * @param {number[]} plane1
 * @returns {number[]}
 */
export function lineFromPlanes(dst, plane0, plane1) {
  dst = lineFromPoints(dst, plane0, plane1);
  return dualizeLine(dst, dst);
}

/**
 * @param {number[]|null} dst
 * @param {number[]} p1
 * @param {number[]} p2
 * @param {number[]} p3
 * @returns {number[]}
 */
export function planeFromPoints(dst, p1, p2, p3) {
  return lineJoinPoint(dst, lineFromPoints(null, p1, p2), p3);
}

/**
 * @param {number[]|null} dst
 * @param {number[]} line0
 * @param {number[]} line1
 * @returns {number[]}
 */
export function intersectionPoint(dst, line0, line1) {
  if (dst == null) dst = new Array(4);
  const norm = Math.abs(innerProduct(line0, line1));
  if (norm > tolerance) {
    logger.log(Level.WARNING, Category.ALL, `Norm exceeds tolerance: ${norm} > ${tolerance}`);
    throw new Error('These two lines do not intersect');
  }
  return intersectionPointUnchecked(dst, line0, line1);
}

/**
 * @param {number[]|null} dst
 * @param {number[]} line0
 * @param {number[]} line1
 * @returns {number[]}
 */
export function intersectionPlane(dst, line0, line1) {
  const dline0 = dualizeLine(null, line0);
  const dline1 = dualizeLine(null, line1);
  return intersectionPoint(dst, dline0, dline1);
}

/**
 * @param {number[]|null} dst
 * @param {number[]} line0
 * @param {number[]} line1
 * @returns {number[]}
 */
export function intersectionPointUnchecked(dst, line0, line1) {
  if (dst == null) dst = new Array(4);

  const mm = Rn.times(
    null,
    lineToSkewMatrix(null, dualizeLine(null, line0)),
    lineToSkewMatrix(null, line1)
  );

  // every column of mm should be the same point (intersection point of the two lines)
  let norm1 = Rn.maxNorm(line0);
  const norm2 = Rn.maxNorm(line1);
  if (norm2 > norm1) norm1 = norm2;

  let bestColumn = -1;
  let biggestEntry = -1;

  // Reject columns which are (near) null; require an entry greater than tolerance*norm1.
  let maxval = tolerance * norm1;

  // First find a nonzero column, and its biggest entry.
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const absv = Math.abs(mm[i + 4 * j]);
      if (absv > maxval) {
        maxval = absv;
        bestColumn = i;
        biggestEntry = j;
      }
    }
    if (bestColumn !== -1) break;
  }

  if (bestColumn === -1) throw new Error('lines are same');

  // Compare the biggest entries of the remaining columns to find the best column to use.
  for (let i = bestColumn + 1; i < 4; i++) {
    const d = Math.abs(mm[i + 4 * biggestEntry]);
    if (d > maxval) {
      maxval = d;
      bestColumn = i;
    }
  }

  dst[0] = mm[bestColumn + 0];
  dst[1] = mm[bestColumn + 4];
  dst[2] = mm[bestColumn + 8];
  dst[3] = mm[bestColumn + 12];
  return dst;
}

/**
 * Arrange Pluecker line coordinates in a 4x4 skew-symmetric matrix.
 * Warning: acts on points/planes of the form (w,x,y,z), not (x,y,z,w)!
 * @param {number[]|null} m
 * @param {number[]} pl
 * @returns {number[]}
 */
export function lineToSkewMatrix(m, pl) {
  if (m == null) m = new Array(16);
  m[0] = m[5] = m[10] = m[15] = 0.0;
  m[4] = -(m[1] = pl[5]);
  m[8] = -(m[2] = pl[4]);
  m[12] = -(m[3] = pl[3]);
  m[9] = -(m[6] = pl[2]);
  m[13] = -(m[7] = -pl[1]); // strange minus sign: p42 instead of p24
  m[14] = -(m[11] = pl[0]);
  return m;
}

/**
 * Convert between join-of-points and cut-of-planes coordinate conventions.
 * @param {number[]|null} dst
 * @param {number[]} src
 * @returns {number[]}
 */
export function dualizeLine(dst, src) {
  if (dst == null) dst = new Array(6);
  let tmp = dst;
  if (dst === src) tmp = new Array(6);
  for (let i = 0; i < 6; i++) tmp[5 - i] = src[i];
  if (dst === src) {
    for (let i = 0; i < 6; i++) dst[i] = tmp[i];
  }
  return dst;
}

/**
 * Reorder Pluecker line coordinates according to a permutation of coordinates.
 * @param {number[]|null} dst
 * @param {number[]} src
 * @param {number[]} perm
 * @returns {number[]}
 */
export function permuteCoordinates(dst, src, perm) {
  const P = Rn.permutationMatrix(null, perm);
  const M = lineToSkewMatrix(null, src);
  const MM = Rn.conjugateByMatrix(null, M, P);
  if (dst == null) dst = new Array(src.length);
  dst[0] = MM[11];
  dst[1] = -MM[7];
  dst[2] = MM[6];
  dst[3] = MM[3];
  dst[4] = MM[2];
  dst[5] = MM[1];
  return dst;
}

/**
 * @param {number[]} l0
 * @param {number[]} l1
 * @returns {number}
 */
export function innerProduct(l0, l1) {
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += l0[i] * l1[5 - i];
  return sum;
}

/**
 * Project point p onto the line spanned by v0 and v1 perpendicularly.
 * @param {number[]|null} dst
 * @param {number[]} p
 * @param {number[]} v0
 * @param {number[]} v1
 * @param {number} metric metric from P3 (not P5)
 * @returns {number[]}
 */
export function projectPointOntoLine(dst, p, v0, v1, metric) {
  if (dst == null) dst = new Array(4);
  if (metric === Pn.EUCLIDEAN) {
    const dv = Rn.subtract(null, v1, v0);
    const dp = Rn.subtract(null, p, v0);
    const proj = Rn.projectOnto(null, dp, dv);
    Rn.add(dst, v0, proj);
    return dst;
  }
  const polar0 = Pn.polarizePoint(null, v0, metric);
  const polar1 = Pn.polarizePoint(dst, v1, metric);
  const line = lineFromPlanes(null, polar0, polar1);
  const plane = lineJoinPoint(null, line, p);
  P3.lineIntersectPlane(dst, v0, v1, plane);
  return dst;
}

/**
 * Overload: project point p onto given pluecker line for metric.
 * @param {number[]|null} dst
 * @param {number[]} p
 * @param {number[]} line
 * @param {number} metric
 * @returns {number[]}
 */
export function projectPointOntoLineLine(dst, p, line, metric) {
  if (dst == null) dst = new Array(4);
  const polarLine = polarize(null, line, metric);
  const plane = lineJoinPoint(null, polarLine, p);
  lineIntersectPlane(dst, line, plane);
  return dst;
}

/**
 * @param {number[]|null} point
 * @param {number[]} plueckerLine
 * @param {number[]} plane
 * @returns {number[]}
 */
export function lineIntersectPlane(point, plueckerLine, plane) {
  return Rn.matrixTimesVector(
    point,
    lineToSkewMatrix(null, dualizeLine(null, plueckerLine)),
    plane
  );
}

/**
 * @param {number[]|null} dst
 * @param {number[]} plueckerLine
 * @param {number[]} point
 * @returns {number[]}
 */
export function lineJoinPoint(dst, plueckerLine, point) {
  return Rn.matrixTimesVector(dst, lineToSkewMatrix(null, plueckerLine), point);
}

/**
 * Normalize line coordinates using the Euclidean direction-vector part.
 * @param {number[]|null} dst
 * @param {number[]} src
 * @returns {number[]}
 */
export function normalize(dst, src) {
  if (dst == null) dst = new Array(6);
  let x = src[2] * src[2] + src[4] * src[4] + src[5] * src[5];
  if (x === 0.0) {
    for (let i = 0; i < 6; i++) dst[i] = src[i];
    return dst;
  }
  x = 1.0 / Math.sqrt(x);
  Rn.times(dst, x, src);
  return dst;
}

/**
 * @param {number[]|null} dst
 * @param {number[]} line
 * @returns {number[]}
 * @private
 */
function directionVector(dst, line) {
  // Java returns new array always.
  return dst ?? [line[2], -line[4], line[5]];
}

/**
 * @param {number[]} line1
 * @param {number[]} line2
 * @returns {number}
 */
export function cosineBetweenLines(line1, line2) {
  const dv1 = directionVector(null, line1);
  const dv2 = directionVector(null, line2);
  const d11 = Rn.innerProduct(dv1, dv1);
  const d12 = Rn.innerProduct(dv1, dv2);
  const d22 = Rn.innerProduct(dv2, dv2);
  return d12 / Math.sqrt(d11 * d22);
}

/**
 * @param {number[]} line
 * @returns {boolean}
 */
export function isInfinite(line) {
  const dv = directionVector(null, line);
  const ll = Rn.innerProduct(dv, dv);
  return ll === 0.0;
}

/**
 * NOTE: Java version references LieSphereGeometry.isInfinity; not yet ported in jsreality.
 * This function is ported 1:1 but will throw until LieSphereGeometry exists.
 * @param {number[]} l1
 * @param {number[]} l2
 * @returns {number}
 */
export function distanceBetweenLines(l1, l2) {
  throw new Error('Not yet implemented: requires LieSphereGeometry.isInfinity');
}

const plueckerIndices = [[0, 1], [0, 2], [0, 3], [1, 2], [3, 1], [2, 3]];

/**
 * Induced P5 projectivity from a P3 projectivity.
 * @param {number[]|null} dst length 36
 * @param {number[]} p3m length 16
 * @returns {number[]}
 */
export function inducedP5ProjFromP3Proj(dst, p3m) {
  if (dst == null) dst = new Array(36);
  for (let i = 0; i < 6; i++) {
    const ii = plueckerIndices[i][0];
    const jj = plueckerIndices[i][1];
    for (let j = 0; j < 6; j++) {
      const kk = plueckerIndices[j][0];
      const mm = plueckerIndices[j][1];
      const ind = i * 6 + j;
      dst[ind] = p3m[ii * 4 + kk] * p3m[jj * 4 + mm] - p3m[ii * 4 + mm] * p3m[jj * 4 + kk];
    }
  }
  return dst;
}

/**
 * Conjugate w.r.t. a complex.
 * @param {number[]|null} dst
 * @param {number[]} complex
 * @param {number[]} line
 * @returns {number[]}
 */
export function conjugateWithRespectToComplex(dst, complex, line) {
  if (dst == null) dst = new Array(6);
  const p5m = inducedP5ProjFromP3Proj(null, lineToSkewMatrix(null, complex));
  Rn.matrixTimesVector(dst, p5m, line);
  // the projectivity above is actually a correlation so we have to flip the result
  dualizeLine(dst, dst);
  return dst;
}

/**
 * @param {number[]|null} dst
 * @param {number[]} complex
 * @param {number[]} point
 * @returns {number[]}
 */
export function nullPlane(dst, complex, point) {
  const skew = lineToSkewMatrix(null, complex);
  return Rn.matrixTimesVector(dst, skew, point);
}

/**
 * @param {number[]|null} dst
 * @param {number[]} complex
 * @param {number[]} plane
 * @returns {number[]}
 */
export function nullPoint(dst, complex, plane) {
  const skew = lineToSkewMatrix(null, dualizeLine(null, complex));
  return Rn.matrixTimesVector(dst, skew, plane);
}

/**
 * @param {number[]} ds
 * @returns {boolean}
 */
export function isValidLine(ds) {
  const euc2 = Rn.euclideanNormSquared(ds);
  if (euc2 < 10e-16) return false;
  const pl = innerProduct(ds, ds);
  if (pl > 10e-8) return false;
  return true;
}

/**
 * Polarize (metric dependent): hard-wired indices assume the 3rd coordinate is homogeneous.
 * @param {number[]|null} dst
 * @param {number[]} src
 * @param {number} metric
 * @returns {number[]}
 */
export function polarize(dst, src, metric) {
  dst = dualizeLine(dst, src);
  dst[2] *= metric;
  dst[4] *= metric;
  dst[5] *= metric;
  return dst;
}

/** @returns {number} */
export function getTolerance() {
  return tolerance;
}

// ---------------------------------------------------------------------------
// The remainder of the Java class depends on additional (unported) subsystems
// (LieSphereGeometry, Clifford algebra types, and projective geometry utilities).
// We keep explicit stubs for now to preserve the API surface while preventing
// silent wrong results.
// ---------------------------------------------------------------------------

export function closestPoint(_ret, point, _line, _metric) {
  // Java currently returns point directly.
  return point;
}

export function regulusWaistPlaneAndCenter(_ret, _generators, _metric) {
  throw new Error('Not yet implemented: requires additional projective geometry utilities (LineUtility, etc.)');
}

export function makeOrthogonalParallelLinesExample() {
  throw new Error('Not yet implemented: example/demo method not yet ported');
}

export function makeOrthogonalParallelLinesExample2() {
  throw new Error('Not yet implemented: example/demo method not yet ported');
}

export function buildQuadMeshFromLines(_lines, _uCount, _vCount) {
  // Placeholder hook: the Java class uses QuadMeshFactory and projective sampling utilities.
  // Kept as stub until LineUtility/PointRangeFactory are ported.
  throw new Error('Not yet implemented: requires LineUtility/PointRangeFactory ports');
}

export { QuadMeshFactory };

