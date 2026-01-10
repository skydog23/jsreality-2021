/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// @ts-check
import * as Pn from './Pn.js';
import * as Rn from './Rn.js';
import { Rectangle2D } from '../util/Rectangle2D.js';

/** @typedef {number[]} Vec */
/** @typedef {number[]} Matrix */

// Constants
export const p3involution = [-1, -1, -1, -1];
export const Q_HYPERBOLIC = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1];
export const Q_EUCLIDEAN = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
export const Q_ELLIPTIC = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export const Q_LIST = [Q_HYPERBOLIC, Q_EUCLIDEAN, Q_ELLIPTIC];
export const originP3 = [0.0, 0.0, 0.0, 1.0];
export const zeroVector = [0, 0, 0, 0];
export const xaxis = [1, 0, 0];
export const yaxis = [0, 1, 0];
export const zaxis = [0, 0, -1];
export const hzaxis = [0, 0, 1, 1];

/**
 * Extract a matrix from `src` such that it fixes the input position `point`.
 * Port of `de.jreality.math.P3.extractOrientationMatrix`.
 *
 * In practice this removes the translation component with respect to `point`
 * by conjugating with the translation taking `point` to its image.
 *
 * @param {Matrix|null} dst
 * @param {Matrix} src
 * @param {Vec} point
 * @param {number} metric
 * @returns {Matrix}
 */
export function extractOrientationMatrix(dst, src, point, metric) {
  if (!dst) dst = new Array(16);
  const image = Rn.matrixTimesVector(null, src, point);
  const translate = makeTranslationMatrix(null, image, metric);
  const invTranslate = Rn.inverse(null, translate);
  Rn.timesMatrix(dst, invTranslate, src);
  return dst;
}

/**
 * Port of `de.jreality.math.P3.getTransformedAbsolute`.
 * Computes \(Q - m^T Q m\) for the metric's quadratic form Q.
 *
 * @param {Matrix} m
 * @param {number} metric
 * @returns {Matrix}
 */
export function getTransformedAbsolute(m, metric) {
  const Q = Q_LIST[metric + 1];
  const Qtm = Rn.timesMatrix(null, Q, m);
  const mt = Rn.transpose(null, m);
  const mtQm = Rn.timesMatrix(null, mt, Qtm);
  return Rn.subtract(null, Q, mtQm);
}

/**
 * Attempt to convert a matrix into an isometry with respect to `metric`.
 * Port of `de.jreality.math.P3.orthonormalizeMatrix`.
 *
 * @param {Matrix|null} dst
 * @param {Matrix} m
 * @param {number} tolerance
 * @param {number} metric
 * @returns {Matrix}
 */
export function orthonormalizeMatrix(dst, m, tolerance, metric) {
  if (!dst) dst = new Array(16);

  if (metric === Pn.EUCLIDEAN) {
    // Java version punts for Euclidean: normalize first three columns (ideal points).
    for (let i = 0; i < 3; ++i) {
      const v = [m[i], m[i + 4], m[i + 8]];
      Rn.normalize(v, v);
      m[i] = v[0];
      m[i + 4] = v[1];
      m[i + 8] = v[2];
      m[i + 12] = 0;
    }
    if (dst === m) return dst;
    for (let i = 0; i < 16; ++i) dst[i] = m[i];
    return dst;
  }

  const lastentry = m[15];
  let diagnosis = getTransformedAbsolute(m, metric);

  /** @type {number[][]} */
  const basis = Array.from({ length: 4 }, () => new Array(4).fill(0));
  const Q = Q_LIST[metric + 1];

  // Columns of m are basis vectors (images of canonical basis under the isometry).
  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      basis[i][j] = m[j * 4 + i];
    }
  }

  // First orthogonalize.
  for (let i = 0; i < 3; ++i) {
    for (let j = i + 1; j < 4; ++j) {
      if (Q[5 * j] === 0.0) continue;
      if (Math.abs(diagnosis[4 * i + j]) > tolerance) {
        Pn.projectOntoComplement(basis[j], basis[i], basis[j], metric);
      }
    }
  }

  // Then normalize.
  for (let i = 0; i < 4; ++i) {
    if (Q[5 * i] !== 0.0) {
      Pn.normalizePlane(basis[i], basis[i], metric);
    }
    for (let j = 0; j < 4; ++j) {
      dst[j * 4 + i] = basis[i][j];
    }
  }

  // Match Java: if sign flipped in last entry, flip the whole matrix.
  diagnosis = Rn.subtract(
    null,
    Q,
    Rn.timesMatrix(null, Rn.transpose(null, dst), Rn.timesMatrix(null, Q_LIST[metric + 1], dst))
  );
  if (dst[15] * lastentry < 0) Rn.times(dst, -1, dst);
  return dst;
}

/**
 * Calculate a translation matrix which carries the origin (0,0,0,1) to 
 * the point to.
 * @param {number[]} mat - Destination array for matrix
 * @param {number[]} to - Target point
 * @param {number} metric - Metric type (EUCLIDEAN, HYPERBOLIC, ELLIPTIC)
 * @returns {number[]} Translation matrix
 */
/**
 * Make translation matrix carrying origin to point `to` for given metric.
 * Mirrors P3.makeTranslationMatrix in Java.
 * @param {Matrix|null} mat
 * @param {Vec} to
 * @param {number} metric
 * @returns {Matrix}
 */
export function makeTranslationMatrix(mat, to, metric) {
    if (!mat) mat = new Array(16);
    return makeTranslationMatrixOld(mat, to, metric);
}

/**
 * Calculate a translation in the given geometry which carries the origin of P3 (0,0,0,1) to the input point.
 * @param {number[]} mat - Destination array for matrix
 * @param {number[]} p - Target point
 * @param {number} metric - Metric type
 * @returns {number[]} Translation matrix
 */
/**
 * Internal helper that implements translation construction (signature-compatible).
 * @param {Matrix|null} mat
 * @param {Vec} p
 * @param {number} metric
 * @returns {Matrix}
 */
function makeTranslationMatrixOld(mat, p, metric) {
    let tmp = new Array(4);
    let foo = new Array(3);
    let m = mat || new Array(16);
    let rot = new Array(16);
    let mtmp = new Array(16);
    let point;

    // Handle 3D vs 4D points
    if (p.length === 3) {
        point = new Array(4);
        point[0] = p[0];
        point[1] = p[1];
        point[2] = p[2];
        point[3] = 1.0;
    } else {
        point = p;
    }

    switch (metric) {
        case Pn.EUCLIDEAN:
            Rn.setIdentityMatrix(m);
            if (point.length === 4) {
                // Dehomogenize and ensure w=1
                point = Pn.dehomogenize(point, point);
                if (point.length < 4) point[3] = 1.0;
            }
            for (let i = 0; i < 3; ++i) {
                m[i * 4 + 3] = point[i];
            }
            break;

        case Pn.HYPERBOLIC:
            if (Pn.innerProduct(point, point, Pn.HYPERBOLIC) > 0.0) {
                let k = (point[3] * point[3] - 0.0001) / Rn.innerProductN(point, point, 3);
                k = Math.sqrt(k);
                for (let i = 0; i < 3; ++i) point[i] *= k;
            }
        // falls through to ELLIPTIC case
        case Pn.ELLIPTIC:
            Rn.setIdentityMatrix(mtmp);
            tmp = Pn.normalize(tmp, point, metric);
            for (let i = 0; i < 3; ++i) foo[i] = tmp[i];
            let d = Rn.innerProduct(foo, foo);
            mtmp[11] = Math.sqrt(d);
            if (metric === Pn.ELLIPTIC) {
                mtmp[14] = -mtmp[11];
            } else {
                mtmp[14] = mtmp[11];
            }
            mtmp[10] = mtmp[15] = tmp[3];
            makeRotationAxisMatrix(rot, hzaxis, tmp);
            Rn.conjugateByMatrix(m, mtmp, rot);
            break;

        default:
            Rn.setIdentityMatrix(m);
            break;
    }

    return m;
}

/**
 * Calculate a translation matrix that carries point from to point to
 * and maps the line joining from and to to itself (the axis of the isometry).
 * @param {number[]} dst - Destination array for matrix
 * @param {number[]} from - Starting point
 * @param {number[]} to - Target point
 * @param {number} metric - Metric type
 * @returns {number[]} Translation matrix
 */
/**
 * Make translation matrix that carries `from` to `to` along their joining axis.
 * Mirrors P3.makeTranslationMatrix2.
 * @param {Matrix|null} dst
 * @param {Vec} from
 * @param {Vec} to
 * @param {number} metric
 * @returns {Matrix}
 */
export function makeTranslationMatrix2(dst, from, to, metric) {
    if (!dst) dst = new Array(16);
    let TP = makeTranslationMatrix(null, from, metric);
    let iTP = Rn.inverse(null, TP);
    let toPrime = Rn.matrixTimesVector(null, iTP, to);
    makeTranslationMatrix(dst, toPrime, metric);
    Rn.conjugateByMatrix(dst, dst, TP);
    return dst;
}

/**
 * Generate a rotation matrix fixing the origin (0,0,0,1) around the given axis with the given angle.
 * @param {number[]} m - Destination array for matrix
 * @param {number[]} axis - Rotation axis
 * @param {number} angle - Rotation angle
 * @returns {number[]} Rotation matrix
 */
/**
 * Rotation matrix about axis with angle (fixing origin), mirrors P3.makeRotationMatrix.
 * @param {Matrix|null} m
 * @param {Vec} axis length >=3
 * @param {number} angle
 * @returns {Matrix}
 */
export function makeRotationMatrix(m, axis, angle) {
    if (!m) m = new Array(16);
    if (axis.length < 3) {
        throw new Error("Axis is wrong size");
    }
    
    let u = new Array(3);
    for (let i = 0; i < 3; i++) u[i] = axis[i];
    Rn.normalize(u, u);
    
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const v = 1.0 - c;
    
    Rn.setIdentityMatrix(m);
    m[0] = u[0] * u[0] * v + c;
    m[4] = u[0] * u[1] * v + u[2] * s;
    m[8] = u[0] * u[2] * v - u[1] * s;

    m[1] = u[1] * u[0] * v - u[2] * s;
    m[5] = u[1] * u[1] * v + c;
    m[9] = u[1] * u[2] * v + u[0] * s;

    m[2] = u[2] * u[0] * v + u[1] * s;
    m[6] = u[2] * u[1] * v - u[0] * s;
    m[10] = u[2] * u[2] * v + c;
    
    return m;
}

/**
 * Generate a rotation matrix which fixes the origin (0,0,0,1) and carries the vector from to the vector to.
 * @param {number[]} m - Destination array for matrix
 * @param {number[]} from - Starting vector (3D)
 * @param {number[]} to - Target vector (3D)
 * @returns {number[]} Rotation matrix
 */
/**
 * Rotation matrix taking vector `from` to `to` (fixing origin), mirrors P3.makeRotationAxisMatrix.
 * @param {Matrix|null} m
 * @param {Vec} from length >=3
 * @param {Vec} to length >=3
 * @returns {Matrix}
 */
export function makeRotationAxisMatrix(m, from, to) {
    if (!m) m = new Array(16);
    if (from.length < 3 || to.length < 3) {
        throw new Error("Input vectors too short");
    }

    // Create vectors array and normalize input vectors
    /** @type {number[]} */
    const v1 = Rn.normalize(null, from.slice(0, 3));
    /** @type {number[]} */
    const v2 = Rn.normalize(null, to.slice(0, 3));

    // Calculate angle between vectors
    const cosAngle = Rn.innerProduct(v1, v2);
    const angle = Math.acos(cosAngle);
    
    // Handle numerical precision issues
    if (isNaN(angle)) {
        return makeRotationMatrix(m, [1, 0, 0], cosAngle > 0 ? 0 : Math.PI);
    }

    // Calculate rotation axis using cross product and normalize
    const axis = Rn.crossProduct(null, /** @type {number[]} */(v1), /** @type {number[]} */(v2));
    const normalizedAxis = Rn.normalize(null, axis);

    // Generate rotation matrix around this axis
    return makeRotationMatrix(m, normalizedAxis, angle);
}

/**
 * Generate a 4x4 orthographic projection matrix based on the viewport and clipping planes.
 * Mirrors P3.makeOrthographicProjectionMatrix in Java.
 * @param {number[]|null} m - Destination matrix array (16 elements) or null to create new
 * @param {Rectangle2D|Object} viewport - Rectangle2D object or plain object with {x, y, width, height} properties
 * @param {number} near - Near clipping plane distance
 * @param {number} far - Far clipping plane distance
 * @returns {number[]} The orthographic projection matrix
 */
export function makeOrthographicProjectionMatrix(m, viewport, near, far) {
    if (!m) m = new Array(16);
    
    // Get viewport bounds - handle both Rectangle2D objects and plain objects
    const l = viewport.getMinX ? viewport.getMinX() : viewport.x;
    const r = viewport.getMaxX ? viewport.getMaxX() : (viewport.x + viewport.width);
    const b = viewport.getMinY ? viewport.getMinY() : viewport.y;
    const t = viewport.getMaxY ? viewport.getMaxY() : (viewport.y + viewport.height);
    
    // Set to identity matrix
    Rn.setIdentityMatrix(m);
    
    // Set orthographic projection matrix elements
    m[0] = 2 / (r - l);
    m[5] = 2 / (t - b);
    m[10] = -2 / (far - near);
    m[3] = -(r + l) / (r - l);
    m[7] = -(t + b) / (t - b);
    m[11] = -(far + near) / (far - near);
    
    return m;
}

/**
 * Generate a 4x4 perspective projection matrix based on the viewport and clipping planes.
 * Mirrors P3.makePerspectiveProjectionMatrix in Java.
 * @param {number[]|null} dst - Destination matrix array (16 elements) or null to create new
 * @param {Rectangle2D|Object} viewport - Rectangle2D object or plain object with {x, y, width, height} properties
 * @param {number} near - Near clipping plane distance  
 * @param {number} far - Far clipping plane distance
 * @returns {number[]} The perspective projection matrix
 */
export function makePerspectiveProjectionMatrix(dst, viewport, near, far) {
    if (!dst) dst = new Array(16);
    
    const an = Math.abs(near);
    // Get viewport bounds - handle both Rectangle2D objects and plain objects
    const l = (viewport.getMinX ? viewport.getMinX() : viewport.x) * an;
    const r = (viewport.getMaxX ? viewport.getMaxX() : (viewport.x + viewport.width)) * an;
    const b = (viewport.getMinY ? viewport.getMinY() : viewport.y) * an;
    const t = (viewport.getMaxY ? viewport.getMaxY() : (viewport.y + viewport.height)) * an;
    
    // Set to identity matrix
    Rn.setIdentityMatrix(dst);
    
    // Set perspective projection matrix elements
    dst[0] = 2 * near / (r - l);
    dst[5] = 2 * near / (t - b);
    dst[10] = (far + near) / (near - far);
    dst[15] = 0.0;
    dst[2] = (r + l) / (r - l);
    dst[6] = (t + b) / (t - b);
    dst[11] = 2 * near * far / (near - far);
    dst[14] = -1.0;
    
    return dst;
}

/**
 * Create a uniform stretch matrix with the same scale factor for x, y, z.
 * Mirrors P3.makeStretchMatrix(dst, stretch) in Java.
 * @param {number[]|null} dst - Destination matrix array (16 elements) or null to create new
 * @param {number} stretch - Uniform scale factor
 * @returns {number[]} The stretch matrix
 */
export function makeStretchMatrix(dst, stretch) {
    if (!dst) dst = new Array(16);
    
    // Set to identity matrix
    Rn.setIdentityMatrix(dst);
    
    // Set diagonal stretch values (leave w component as 1)
    dst[0] = stretch;   // x scale
    dst[5] = stretch;   // y scale  
    dst[10] = stretch;  // z scale
    // dst[15] = 1.0;   // w unchanged (already set by identity)
    
    return dst;
}

/**
 * Create a non-uniform stretch matrix with individual scale factors.
 * Mirrors P3.makeStretchMatrix(dst, xscale, yscale, zscale) in Java.
 * @param {number[]|null} dst - Destination matrix array (16 elements) or null to create new
 * @param {number} xscale - X-axis scale factor
 * @param {number} yscale - Y-axis scale factor
 * @param {number} zscale - Z-axis scale factor
 * @returns {number[]} The stretch matrix
 */
export function makeStretchMatrixXYZ(dst, xscale, yscale, zscale) {
    if (!dst) dst = new Array(16);
    
    // Set to identity matrix
    Rn.setIdentityMatrix(dst);
    
    // Set diagonal scale values
    dst[0] = xscale;   // x scale
    dst[5] = yscale;   // y scale
    dst[10] = zscale;  // z scale
    
    return dst;
}

/**
 * Create a stretch matrix from a vector of scale factors.
 * Mirrors P3.makeStretchMatrix(dst, v) in Java.
 * @param {number[]|null} dst - Destination matrix array (16 elements) or null to create new
 * @param {number[]} scales - Array of scale factors (length determines how many diagonal elements to set)
 * @returns {number[]} The stretch matrix
 */
export function makeStretchMatrixFromVector(dst, scales) {
    if (!dst) dst = new Array(16);
    
    // Set to identity matrix
    Rn.setIdentityMatrix(dst);
    
    // Set diagonal values from the scales array (up to 4x4 matrix size)
    const maxElements = Math.min(4, scales.length);
    for (let i = 0; i < maxElements; i++) {
        dst[i * 4 + i] = scales[i]; // diagonal element at position [i,i]
    }
    
    return dst;
}

/**
 * Create a uniform scale matrix (alias for makeStretchMatrix for compatibility).
 * Mirrors P3.makeScaleMatrix(dst, s) in Java.
 * @param {number[]|null} dst - Destination matrix array (16 elements) or null to create new
 * @param {number} scale - Uniform scale factor
 * @returns {number[]} The scale matrix
 */
export function makeScaleMatrix(dst, scale) {
    return makeStretchMatrix(dst, scale);
}

/**
 * Create a non-uniform scale matrix (alias for makeStretchMatrixXYZ for compatibility).
 * Mirrors P3.makeScaleMatrix(dst, sx, sy, sz) in Java.
 * @param {number[]|null} dst - Destination matrix array (16 elements) or null to create new
 * @param {number} sx - X-axis scale factor
 * @param {number} sy - Y-axis scale factor
 * @param {number} sz - Z-axis scale factor
 * @returns {number[]} The scale matrix
 */
export function makeScaleMatrixXYZ(dst, sx, sy, sz) {
    return makeStretchMatrixXYZ(dst, sx, sy, sz);
}

/**
 * Create a scale matrix from a vector (alias for makeStretchMatrixFromVector for compatibility).
 * Mirrors P3.makeScaleMatrix(dst, s) in Java.
 * @param {number[]|null} dst - Destination matrix array (16 elements) or null to create new
 * @param {number[]} scales - Array of scale factors
 * @returns {number[]} The scale matrix
 */
export function makeScaleMatrixFromVector(dst, scales) {
    return makeStretchMatrixFromVector(dst, scales);
}

/**
 * Create a skew matrix that adds a multiple of one coordinate to another.
 * Mirrors P3.makeSkewMatrix(dst, i, j, val) in Java.
 * @param {number[]|null} dst - Destination matrix array (16 elements) or null to create new
 * @param {number} i - Row index (0-3)
 * @param {number} j - Column index (0-3)
 * @param {number} val - Skew value to place at position [i,j]
 * @returns {number[]} The skew matrix
 */
export function makeSkewMatrix(dst, i, j, val) {
    if (!dst) dst = new Array(16);
    
    // Start with identity matrix
    Rn.setIdentityMatrix(dst);
    
    // Set the skew value at the specified position
    dst[4 * i + j] = val;
    
    return dst;
}

/**
 * Create a rotation matrix around the X-axis.
 * Mirrors P3.makeRotationMatrixX(mat, angle) in Java.
 * @param {number[]|null} mat - Destination matrix array (16 elements) or null to create new
 * @param {number} angle - Rotation angle in radians
 * @returns {number[]} The rotation matrix
 */
export function makeRotationMatrixX(mat, angle) {
    const axis = [1.0, 0.0, 0.0];
    return makeRotationMatrix(mat, axis, angle);
}

/**
 * Create a rotation matrix around the Y-axis.
 * Mirrors P3.makeRotationMatrixY(mat, angle) in Java.
 * @param {number[]|null} mat - Destination matrix array (16 elements) or null to create new
 * @param {number} angle - Rotation angle in radians
 * @returns {number[]} The rotation matrix
 */
export function makeRotationMatrixY(mat, angle) {
    const axis = [0.0, 1.0, 0.0];
    return makeRotationMatrix(mat, axis, angle);
}

/**
 * Create a rotation matrix around the Z-axis.
 * Mirrors P3.makeRotationMatrixZ(mat, angle) in Java.
 * @param {number[]|null} mat - Destination matrix array (16 elements) or null to create new
 * @param {number} angle - Rotation angle in radians
 * @returns {number[]} The rotation matrix
 */
export function makeRotationMatrixZ(mat, angle) {
    const axis = [0.0, 0.0, 1.0];
    return makeRotationMatrix(mat, axis, angle);
}

/**
 * Create a rotation matrix around the axis defined by two points.
 * Mirrors P3.makeRotationMatrix(m, p1, p2, angle, metric) in Java.
 * @param {number[]|null} m - Destination matrix array (16 elements) or null to create new
 * @param {number[]} p1 - First point defining the rotation axis
 * @param {number[]} p2 - Second point defining the rotation axis
 * @param {number} angle - Rotation angle in radians
 * @param {number} metric - Metric constant (ELLIPTIC, EUCLIDEAN, HYPERBOLIC)
 * @returns {number[]} The rotation matrix
 */
export function makeRotationMatrixAxis(m, p1, p2, angle, metric) {
    // Check dimensions
    if (p1.length < 3 || p2.length < 3) {
        throw new Error("Points too short");
    }
    
    if (!m) m = new Array(16);
    
    // Translate so that p1 is at origin
    const tmat = makeTranslationMatrix(null, p1, metric);
    const invtmat = Rn.inverse(null, tmat);
    
    // Transform p2 to get rotation axis in translated space
    const ip2 = new Array(4);
    Rn.matrixTimesVector(ip2, invtmat, p2);
    
    // Create rotation around this axis
    const foo = makeRotationMatrix(null, ip2, angle);
    
    // Conjugate by translation to get final result
    Rn.conjugateByMatrix(m, foo, tmat);
    
    return m;
}

/**
 * Calculate the plane through three given points.
 * Mirrors P3.planeFromPoints(planeIn, p1, p2, p3) in Java.
 * @param {number[]|null} planeIn - Destination plane array (4 elements) or null to create new
 * @param {number[]} p1 - First point (3 or 4 elements)
 * @param {number[]} p2 - Second point (3 or 4 elements)
 * @param {number[]} p3 - Third point (3 or 4 elements)
 * @returns {number[]} The plane equation [a, b, c, d] where ax + by + cz + d = 0
 */
export function planeFromPoints(planeIn, p1, p2, p3) {
    if (p1.length < 3 || p2.length < 3 || p3.length < 3) {
        throw new Error("Input points must be homogeneous vectors");
    }
    
    let plane;
    if (planeIn === null) plane = new Array(4);
    else plane = planeIn;
    
    if (p1.length === 3 || p2.length === 3 || p3.length === 3) {
        // Handle 3D vectors
        plane[0] = p1[1] * (p2[2] - p3[2]) - p1[2] * (p2[1] - p3[1]) + (p2[1] * p3[2] - p2[2] * p3[1]);
        plane[1] = p1[0] * (p2[2] - p3[2]) - p1[2] * (p2[0] - p3[0]) + (p2[0] * p3[2] - p2[2] * p3[0]);
        plane[2] = p1[0] * (p2[1] - p3[1]) - p1[1] * (p2[0] - p3[0]) + (p2[0] * p3[1] - p2[1] * p3[0]);
        plane[3] = p1[0] * (p2[1] * p3[2] - p2[2] * p3[1]) - p1[1] * (p2[0] * p3[2] - p2[2] * p3[0]) + p1[2] * (p2[0] * p3[1] - p2[1] * p3[0]);
    } else {
        // Handle 4D homogeneous vectors
        plane[0] = p1[1] * (p2[2] * p3[3] - p2[3] * p3[2]) - p1[2] * (p2[1] * p3[3] - p2[3] * p3[1]) + p1[3] * (p2[1] * p3[2] - p2[2] * p3[1]);
        plane[1] = p1[0] * (p2[2] * p3[3] - p2[3] * p3[2]) - p1[2] * (p2[0] * p3[3] - p2[3] * p3[0]) + p1[3] * (p2[0] * p3[2] - p2[2] * p3[0]);
        plane[2] = p1[0] * (p2[1] * p3[3] - p2[3] * p3[1]) - p1[1] * (p2[0] * p3[3] - p2[3] * p3[0]) + p1[3] * (p2[0] * p3[1] - p2[1] * p3[0]);
        plane[3] = p1[0] * (p2[1] * p3[2] - p2[2] * p3[1]) - p1[1] * (p2[0] * p3[2] - p2[2] * p3[0]) + p1[2] * (p2[0] * p3[1] - p2[1] * p3[0]);
    }
    
    // Apply sign corrections from Java version
    plane[0] *= -1;
    plane[2] *= -1;
    
    return plane;
}

/**
 * Calculate the intersection point of a line with a plane.
 * Mirrors P3.lineIntersectPlane(dst, p1, p2, plane) in Java.
 * @param {number[]|null} dst - Destination point array (4 elements) or null to create new
 * @param {number[]} p1 - First point on the line (3 or 4 elements)
 * @param {number[]} p2 - Second point on the line (3 or 4 elements)
 * @param {number[]} plane - Plane equation [a, b, c, d] where ax + by + cz + d = 0
 * @returns {number[]} The intersection point
 */
export function lineIntersectPlane(dst, p1, p2, plane) {
    if (plane.length !== 4) {
        throw new Error("lineIntersectPlane: plane has invalid dimension");
    }
    
    let point1, point2;
    if (dst === null || dst.length !== 4) dst = new Array(4);
    
    // Ensure points are homogeneous
    if (p1.length === 3) point1 = Pn.homogenize(null, p1);
    else point1 = p1;
    if (p2.length === 3) point2 = Pn.homogenize(null, p2);
    else point2 = p2;
    
    const k1 = Rn.innerProduct(point1, plane);
    const k2 = Rn.innerProduct(point2, plane);
    
    // Both points lie in the plane!
    if (k1 === 0.0 && k2 === 0.0) {
        console.warn("lineIntersectPlane: Line lies in plane");
        const copyLength = Math.min(p1.length, dst.length);
        for (let i = 0; i < copyLength; i++) {
            dst[i] = p1[i];
        }
    } else {
        const tmp = new Array(4);
        Rn.linearCombination(tmp, k2, point1, -k1, point2);
        Pn.dehomogenize(dst, tmp);
    }
    
    return dst;
}

/**
 * Via duality, an alias for planeFromPoints.
 * Mirrors P3.pointFromPlanes(point, p1, p2, p3) in Java.
 * @param {number[]|null} point - Destination point array (4 elements) or null to create new
 * @param {number[]} p1 - First plane (4 elements)
 * @param {number[]} p2 - Second plane (4 elements)
 * @param {number[]} p3 - Third plane (4 elements)
 * @returns {number[]} The intersection point of the three planes
 */
export function pointFromPlanes(point, p1, p2, p3) {
    return planeFromPoints(point, p1, p2, p3);
}

/**
 * Line through point, dual of lineIntersectPlane.
 * Mirrors P3.lineJoinPoint(plane, p1, p2, point) in Java.
 * @param {number[]|null} plane - Destination plane array (4 elements) or null to create new
 * @param {number[]} p1 - First point on the line
 * @param {number[]} p2 - Second point on the line
 * @param {number[]} point - Point to join with the line
 * @returns {number[]} The plane equation
 */
export function lineJoinPoint(plane, p1, p2, point) {
    return lineIntersectPlane(plane, p1, p2, point);
}

/**
 * Test if three points are collinear within a given tolerance.
 * Mirrors P3.areCollinear(p0, p1, p2, tol) in Java.
 * @param {number[]} p0 - First point (3 or 4 elements)
 * @param {number[]} p1 - Second point (3 or 4 elements)
 * @param {number[]} p2 - Third point (3 or 4 elements)
 * @param {number} tol - Tolerance for the test
 * @returns {boolean} True if the points are collinear within tolerance
 */
export function areCollinear(p0, p1, p2, tol) {
    const plane = planeFromPoints(null, p0, p1, p2);
    return Rn.equals(plane, zeroVector, tol);
}

/**
 * Calculate barycentric coordinates of point p with respect to points p0 and p1.
 * Mirrors P3.barycentricCoordinates(weights, p0, p1, p) in Java.
 * @param {number[]|null} weights - Destination weights array (2 elements) or null to create new
 * @param {number[]} p0 - First reference point
 * @param {number[]} p1 - Second reference point  
 * @param {number[]} p - Point to find barycentric coordinates for
 * @returns {number[]} Barycentric weights [w0, w1] such that p = w0*p0 + w1*p1
 */
export function barycentricCoordinates(weights, p0, p1, p) {
    // Handle the case that p0, p1, p are linearly independent
    // Project p onto the line through p0 and p1
    let plane = planeFromPoints(null, p0, p1, p);
    let projectedP = p;
    
    if (!Rn.equals(zeroVector, plane, 1e-8)) {
        plane = Rn.subtract(null, p0, p1);
        plane[3] = -Rn.innerProductN(plane, p, 3);
        projectedP = lineIntersectPlane(null, p0, p1, plane);
    }
    
    if (weights === null) weights = new Array(2);
    
    // Find two indices which are linearly independent in p0 and p1
    let det = 0;
    let index0 = 0, index1 = 0;
    const n = Math.min(p0.length, p1.length);
    
    for (; index0 < n - 1; ++index0) {
        for (index1 = index0 + 1; index1 < n; ++index1) {
            det = p0[index0] * p1[index1] - p0[index1] * p1[index0];
            if (Math.abs(det) > 1e-8) break;
        }
        if (index1 !== n) break;
    }
    
    if (index0 === n - 1 && index1 === n) return weights;
    
    const a = p0[index0], b = p1[index0], c = p0[index1], d = p1[index1];
    weights[0] = (d * projectedP[index0] - b * projectedP[index1]) / det;
    weights[1] = (-c * projectedP[index0] + a * projectedP[index1]) / det;
    
    return weights;
}

/**
 * Calculate the affine coordinate of point pw on the line through p1 and p2.
 * Mirrors P3.affineCoordinate(p1, p2, pw) in Java.
 * @param {number[]} p1 - First point on the line
 * @param {number[]} p2 - Second point on the line
 * @param {number[]} pw - Point to find affine coordinate for
 * @returns {number} The affine coordinate t such that pw = p1 + t*(p2-p1)
 */
export function affineCoordinate(p1, p2, pw) {
    const weights = barycentricCoordinates(null, p1, p2, pw);
    if (weights[1] === 0) return 0;
    
    let affCoord = Number.MAX_VALUE;
    if (weights[0] !== 0.0) {
        affCoord = weights[1] / weights[0];
    } else if (weights[1] < 0) {
        affCoord = -Number.MAX_VALUE;
    }
    
    return affCoord;
}

/**
 * Create a screw motion matrix: translation followed by rotation around the same axis.
 * Mirrors P3.makeScrewMotionMatrix(dst, p1, p2, angle, metric) in Java.
 * @param {number[]|null} dst - Destination matrix array (16 elements) or null to create new
 * @param {number[]} p1 - First point defining the axis
 * @param {number[]} p2 - Second point defining the axis  
 * @param {number} angle - Rotation angle in radians
 * @param {number} metric - Metric constant (ELLIPTIC, EUCLIDEAN, HYPERBOLIC)
 * @returns {number[]} The screw motion matrix
 */
export function makeScrewMotionMatrix(dst, p1, p2, angle, metric) {
    const tlate = makeTranslationMatrix2(null, p1, p2, metric);
    const rot = makeRotationMatrixAxis(null, p1, p2, angle, metric);
    return Rn.timesMatrix(dst, tlate, rot);
}

/**
 * Create a lookat matrix that transforms 'from' to origin and 'to' direction to negative z-axis.
 * This represents the worldToCamera transformation for a camera at 'from' looking towards 'to'.
 * Mirrors P3.makeLookatMatrix(m, from, to, roll, metric) in Java.
 * @param {number[]|null} m - Destination matrix array (16 elements) or null to create new
 * @param {number[]} from - Camera position in world coordinates
 * @param {number[]} to - Target point to look at
 * @param {number} roll - Roll angle in radians around the view direction
 * @param {number} metric - Metric constant (ELLIPTIC, EUCLIDEAN, HYPERBOLIC)
 * @returns {number[]} The lookat matrix
 */
export function makeLookatMatrix(m, from, to, roll, metric) {
    const newto = new Array(4);
    const tm1 = new Array(16);
    const tm2 = new Array(16);
    
    if (!m) m = new Array(16);
    
    // Translate 'from' to origin
    makeTranslationMatrix(tm1, from, metric);
    Rn.inverse(tm1, tm1); // tm1 brings 'from' to (0,0,0,1)
    
    // Transform 'to' by this translation
    Rn.matrixTimesVector(newto, tm1, to);
    
    // Rotate to align newto with negative z-axis
    makeRotationAxisMatrix(tm2, newto, zaxis);
    
    // Combine the transformations: m = tm2 * tm1
    Rn.timesMatrix(m, tm2, tm1);
    
    // Apply roll rotation if specified
    if (roll !== 0) {
        makeRotationMatrix(tm1, zaxis, roll);
        Rn.timesMatrix(m, m, tm1);
    }
    
    return m;
}

/**
 * Create a reflection matrix across a plane with respect to the given metric.
 * Mirrors P3.makeReflectionMatrix(m, plane, metric) in Java.
 * @param {number[]|null} m - Destination matrix array (16 elements) or null to create new
 * @param {number[]} plane - Plane equation [a, b, c, d] where ax + by + cz + d = 0
 * @param {number} metric - Metric constant (ELLIPTIC, EUCLIDEAN, HYPERBOLIC)
 * @returns {number[]} The reflection matrix
 */
export function makeReflectionMatrix(m, plane, metric) {
    if (plane.length !== 4) {
        throw new Error("makeReflectionMatrix: Invalid argument");
    }
    
    let reflectionMatrix;
    if (!m) reflectionMatrix = new Array(16);
    else reflectionMatrix = m;
    
    // Start with identity matrix
    Rn.setIdentityMatrix(reflectionMatrix);
    
    // Clone the plane and compute its polar point
    const fixedPlane = [...plane];
    let polarPoint = Pn.polarizePlane(null, fixedPlane, metric);
    Pn.setToLength(polarPoint, polarPoint, 1.0, metric);
    
    // Normalize the plane according to the metric
    switch (metric) {
        case Pn.ELLIPTIC:
        case Pn.HYPERBOLIC:
            Pn.normalize(fixedPlane, fixedPlane, metric);
            break;
        case Pn.EUCLIDEAN:
            // This is not optimal, but it works
            Pn.normalizePlane(fixedPlane, fixedPlane, metric);
            break;
    }
    
    // Build the reflection matrix using the formula:
    // R[i,j] = I[i,j] - 2 * fixedPlane[j] * polarPoint[i]
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            reflectionMatrix[i * 4 + j] = reflectionMatrix[i * 4 + j] - 2 * fixedPlane[j] * polarPoint[i];
        }
    }
    
    return reflectionMatrix;
}

/**
 * Factor a 4x4 transformation matrix into translation, rotation, and scaling components
 * using polar decomposition. This is a direct translation of the Java P3.factorMatrix method.
 * 
 * @param {number[]} m - The 4x4 transformation matrix (16 elements)
 * @param {number[]} transV - Output translation vector (4 elements)
 * @param {import('./Quaternion.js').Quaternion} rotQ - Output rotation quaternion
 * @param {import('./Quaternion.js').Quaternion} stretchRotQ - Output stretch rotation quaternion (set to identity)
 * @param {number[]} stretchV - Output stretch/scale vector (3 elements)
 * @param {boolean[]} isFlipped - Output array indicating if matrix is a reflection (1 element)
 * @param {number} metric - The metric type (EUCLIDEAN, HYPERBOLIC, ELLIPTIC)
 * @returns {number[]} The input matrix m
 */
export function factorMatrix(m, transV, rotQ, stretchRotQ, stretchV, isFlipped, metric) {
    const itransT = new Array(16);
    const transT = new Array(16);
    const tmp = new Array(16);
    const M3 = new Array(9);
    const Q3 = new Array(9);
    const S3 = new Array(9);
    
    // Check if it's a reflection
    const det = Rn.determinant(m);
    isFlipped[0] = (det < 0);
    
    // First extract the translation part
    Rn.matrixTimesVector(transV, m, originP3);
    if (metric === Pn.EUCLIDEAN && transV[3] === 0.0) {
        throw new Error("bad translation vector");
    }
    
    makeTranslationMatrix(transT, transV, metric);
    Rn.inverse(itransT, transT);
    // Undo the translation first
    Rn.timesMatrix(tmp, itransT, m);
    
    // Next polar decompose M
    Rn.extractSubmatrix(M3, tmp, 0, 2, 0, 2);
    if (isFlipped[0] === true) {
        Rn.times(M3, -1.0, M3);
    }
    
    Rn.polarDecompose(Q3, S3, M3);
    
    // We pretend that we have a diagonal scale matrix
    stretchV[0] = S3[0];    // S3[0,0]
    stretchV[1] = S3[4];    // S3[1,1]  
    stretchV[2] = S3[8];    // S3[2,2]
    
    // Convert rotation matrix to quaternion
    rotationMatrixToQuaternion(rotQ, Q3);
    
    // Set the stretch rotation to identity
    stretchRotQ.setValue(1.0, 0.0, 0.0, 0.0);
    
    return m;
}

/**
 * Convert a 3x3 rotation matrix to a quaternion.
 * This is a helper function for factorMatrix.
 * 
 * @param {import('./Quaternion.js').Quaternion} quat - Output quaternion
 * @param {number[]} rotMatrix - 3x3 rotation matrix (9 elements)
 */
function rotationMatrixToQuaternion(quat, rotMatrix) {
    // This is a simplified implementation of the Shepperd's method
    // for converting rotation matrix to quaternion
    const trace = rotMatrix[0] + rotMatrix[4] + rotMatrix[8]; // m00 + m11 + m22
    
    if (trace > 0) {
        const s = Math.sqrt(trace + 1.0) * 2; // s = 4 * qw
        quat.re = 0.25 * s;
        quat.x = (rotMatrix[7] - rotMatrix[5]) / s; // (m21 - m12) / s
        quat.y = (rotMatrix[2] - rotMatrix[6]) / s; // (m02 - m20) / s
        quat.z = (rotMatrix[3] - rotMatrix[1]) / s; // (m10 - m01) / s
    } else if ((rotMatrix[0] > rotMatrix[4]) && (rotMatrix[0] > rotMatrix[8])) {
        const s = Math.sqrt(1.0 + rotMatrix[0] - rotMatrix[4] - rotMatrix[8]) * 2; // s = 4 * qx
        quat.re = (rotMatrix[7] - rotMatrix[5]) / s;
        quat.x = 0.25 * s;
        quat.y = (rotMatrix[1] + rotMatrix[3]) / s;
        quat.z = (rotMatrix[2] + rotMatrix[6]) / s;
    } else if (rotMatrix[4] > rotMatrix[8]) {
        const s = Math.sqrt(1.0 + rotMatrix[4] - rotMatrix[0] - rotMatrix[8]) * 2; // s = 4 * qy
        quat.re = (rotMatrix[2] - rotMatrix[6]) / s;
        quat.x = (rotMatrix[1] + rotMatrix[3]) / s;
        quat.y = 0.25 * s;
        quat.z = (rotMatrix[5] + rotMatrix[7]) / s;
    } else {
        const s = Math.sqrt(1.0 + rotMatrix[8] - rotMatrix[0] - rotMatrix[4]) * 2; // s = 4 * qz
        quat.re = (rotMatrix[3] - rotMatrix[1]) / s;
        quat.x = (rotMatrix[2] + rotMatrix[6]) / s;
        quat.y = (rotMatrix[5] + rotMatrix[7]) / s;
        quat.z = 0.25 * s;
    }
}

/**
 * Compose a 4x4 transformation matrix from translation, rotation, and scaling components.
 * This is the inverse operation of factorMatrix.
 * 
 * @param {number[]} m - Output 4x4 transformation matrix (16 elements)
 * @param {number[]} transV - Translation vector (4 elements)
 * @param {import('./Quaternion.js').Quaternion} rotQ - Rotation quaternion
 * @param {import('./Quaternion.js').Quaternion} stretchRotQ - Stretch rotation quaternion (usually identity)
 * @param {number[]} stretchV - Stretch/scale vector (3 elements)
 * @param {boolean} isFlipped - Whether the matrix represents a reflection
 * @param {number} metric - The metric type (EUCLIDEAN, HYPERBOLIC, ELLIPTIC)
 * @returns {number[]} The composed transformation matrix
 */
export function composeMatrixFromFactors(m, transV, rotQ, stretchRotQ, stretchV, isFlipped, metric) {
    // Temporary matrices
    const transT = new Array(16);
    const rotT = new Array(16);
    const stretchRotT = new Array(16);
    const stretchT = new Array(16);
    const tmp = new Array(3);
    
    if (!transV || !rotQ || !stretchV) {
        throw new Error("Null argument");
    }
    
    // Create translation matrix
    makeTranslationMatrix(transT, transV, metric);
    
    // Convert rotation quaternion to matrix
    quaternionToRotationMatrix(rotT, rotQ);
    
    // Convert stretch rotation quaternion to matrix (for now we ignore it)
    quaternionToRotationMatrix(stretchRotT, stretchRotQ);
    
    // Handle reflection by negating stretch values
    if (isFlipped === true) {
        for (let i = 0; i < 3; ++i) tmp[i] = -stretchV[i];
    } else {
        for (let i = 0; i < 3; ++i) tmp[i] = stretchV[i];
    }
    
    // Create diagonal stretch matrix
    Rn.setDiagonalMatrix(stretchT, tmp);
    
    // Compose: m = transT * rotT * stretchT
    Rn.timesMatrix(m, rotT, stretchT);
    Rn.timesMatrix(m, transT, m);
    
    return m;
}

/**
 * Convert a quaternion to a 4x4 rotation matrix.
 * This is a helper function for composeMatrixFromFactors.
 * 
 * @param {number[]} rotT - Output 4x4 rotation matrix (16 elements)
 * @param {import('./Quaternion.js').Quaternion} q - Input quaternion
 */
function quaternionToRotationMatrix(rotT, q) {
    const w = q.re;
    const x = q.x;
    const y = q.y;
    const z = q.z;
    
    // Convert quaternion to rotation matrix using standard formula
    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const xy = x * y;
    const xz = x * z;
    const yz = y * z;
    const wx = w * x;
    const wy = w * y;
    const wz = w * z;
    
    // Fill the 4x4 matrix (homogeneous coordinates)
    rotT[0] = 1 - 2 * (yy + zz);  // m00
    rotT[1] = 2 * (xy - wz);      // m01
    rotT[2] = 2 * (xz + wy);      // m02
    rotT[3] = 0;                  // m03
    
    rotT[4] = 2 * (xy + wz);      // m10
    rotT[5] = 1 - 2 * (xx + zz);  // m11
    rotT[6] = 2 * (yz - wx);      // m12
    rotT[7] = 0;                  // m13
    
    rotT[8] = 2 * (xz - wy);      // m20
    rotT[9] = 2 * (yz + wx);      // m21
    rotT[10] = 1 - 2 * (xx + yy); // m22
    rotT[11] = 0;                 // m23
    
    rotT[12] = 0;                 // m30
    rotT[13] = 0;                 // m31
    rotT[14] = 0;                 // m32
    rotT[15] = 1;                 // m33
}