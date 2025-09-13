
// JavaScript port of jReality's Quaternion class (from Quaternion.java)
// This file provides both a Quaternion class and static utility functions
// @ts-check

import * as Rn from './Rn.js';
import * as Pn from './Pn.js';

/** @typedef {number[]} Vec */
/** @typedef {number[]} Matrix */

/**
 * A simple quaternion class for support for FactoredMatrix and isometry generation.
 * Provides both instance methods and static utility functions.
 */
export class Quaternion {
  
  /**
   * @type {number} Real part
   */
  re;
  
  /**
   * @type {number} i component
   */
  x;
  
  /**
   * @type {number} j component
   */
  y;
  
  /**
   * @type {number} k component
   */
  z;

  /**
   * Create a quaternion. Default is the identity quaternion (1, 0, 0, 0).
   * @param {number|Quaternion} [r=1] - Real part or Quaternion to copy
   * @param {number} [dx=0] - i component
   * @param {number} [dy=0] - j component  
   * @param {number} [dz=0] - k component
   */
  constructor(r = 1, dx = 0, dy = 0, dz = 0) {
    if (r instanceof Quaternion) {
      // Copy constructor
      this.re = r.re;
      this.x = r.x;
      this.y = r.y;
      this.z = r.z;
    } else {
      this.re = r;
      this.x = dx;
      this.y = dy;
      this.z = dz;
    }
  }

  /**
   * Set the values of this quaternion
   * @param {number} r 
   * @param {number} dx 
   * @param {number} dy 
   * @param {number} dz 
   */
  setValue(r, dx, dy, dz) {
    this.re = r;
    this.x = dx;
    this.y = dy;
    this.z = dz;
  }

  /**
   * Convert to string
   * @returns {string}
   */
  toString() {
    return `re: ${this.re.toFixed(6)}\ti: ${this.x.toFixed(6)}\tj: ${this.y.toFixed(6)}\tk: ${this.z.toFixed(6)}`;
  }

  /**
   * Convert to double array
   * @param {number[]|null} [val] - Optional target array
   * @param {number[]} [channels=[0,1,2,3]] - Channel mapping
   * @returns {number[]}
   */
  asDouble(val = null, channels = [0, 1, 2, 3]) {
    if (val === null) val = new Array(4);
    val[channels[0]] = this.re;
    val[channels[1]] = this.x;
    val[channels[2]] = this.y;
    val[channels[3]] = this.z;
    return val;
  }
}

// Static unit quaternions for basis vectors
export const eq = [
  new Quaternion(0, 1, 0, 0),
  new Quaternion(0, 0, 1, 0),
  new Quaternion(0, 0, 0, 1)
];

/**
 * Static utility functions (exported individually)
 */

/**
 * Convert quaternion to double array
 * @param {number[]|null} dst 
 * @param {Quaternion} q 
 * @returns {number[]}
 */
export function asDouble(dst, q) {
  if (dst === null) dst = new Array(4);
  dst[0] = q.re;
  dst[1] = q.x;
  dst[2] = q.y;
  dst[3] = q.z;
  return dst;
}

/**
 * Copy quaternion
 * @param {Quaternion|null} dst 
 * @param {Quaternion} src 
 * @returns {Quaternion}
 */
export function copy(dst, src) {
  if (dst === null) return new Quaternion(src);
  dst.re = src.re;
  dst.x = src.x;
  dst.y = src.y;
  dst.z = src.z;
  return dst;
}

/**
 * Return imaginary part as a double array
 * @param {number[]|null} dst 
 * @param {Quaternion} q 
 * @returns {number[]}
 */
export function IJK(dst, q) {
  if (dst === null) dst = new Array(3);
  dst[0] = q.x;
  dst[1] = q.y;
  dst[2] = q.z;
  return dst;
}

/**
 * Check for numerical equality
 * @param {Quaternion} a 
 * @param {Quaternion} b 
 * @param {number} tol 
 * @returns {boolean}
 */
export function equals(a, b, tol) {
  const tmp = new Quaternion();
  subtract(tmp, a, b);
  const ll = length(tmp);
  return ll < tol;
}

/**
 * Check if the rotations represented by the two quaternions are equal
 * @param {Quaternion} a 
 * @param {Quaternion} b 
 * @param {number} tol 
 * @returns {boolean}
 */
export function equalsRotation(a, b, tol) {
  const tmp = new Quaternion();
  return (equals(a, b, tol) || equals(times(tmp, -1.0, a), b, tol));
}

/**
 * Exponential function: exp(t * src)
 * @param {Quaternion|null} dst 
 * @param {number} t 
 * @param {Quaternion} src 
 * @returns {Quaternion}
 */
export function exp(dst, t, src) {
  if (dst === null) dst = new Quaternion();
  dst.re = Math.cos(t);
  const s = Math.sin(t);
  dst.x = s * src.x;
  dst.y = s * src.y;
  dst.z = s * src.z;
  return dst;
}

/**
 * Add two quaternions
 * @param {Quaternion|null} dst 
 * @param {Quaternion} a 
 * @param {Quaternion} b 
 * @returns {Quaternion}
 */
export function add(dst, a, b) {
  if (dst === null) dst = new Quaternion();
  if (a === null || b === null) {
    return dst;
  }
  dst.re = a.re + b.re;
  dst.x = a.x + b.x;
  dst.y = a.y + b.y;
  dst.z = a.z + b.z;
  return dst;
}

/**
 * Negate a quaternion
 * @param {Quaternion|null} dst 
 * @param {Quaternion} src 
 * @returns {Quaternion}
 */
export function negate(dst, src) {
  if (dst === null) dst = new Quaternion();
  if (src === null) {
    return dst;
  }
  dst.re = -src.re;
  dst.x = -src.x;
  dst.y = -src.y;
  dst.z = -src.z;
  return dst;
}

/**
 * Conjugate of a quaternion
 * @param {Quaternion|null} dst 
 * @param {Quaternion} src 
 * @returns {Quaternion}
 */
export function conjugate(dst, src) {
  if (dst === null) dst = new Quaternion();
  if (src === null) {
    return dst;
  }
  dst.re = src.re;
  dst.x = -src.x;
  dst.y = -src.y;
  dst.z = -src.z;
  return dst;
}

/**
 * Subtract two quaternions
 * @param {Quaternion|null} dst 
 * @param {Quaternion} a 
 * @param {Quaternion} b 
 * @returns {Quaternion}
 */
export function subtract(dst, a, b) {
  if (dst === null) dst = new Quaternion();
  if (a === null || b === null) {
    return dst;
  }
  dst.re = a.re - b.re;
  dst.x = a.x - b.x;
  dst.y = a.y - b.y;
  dst.z = a.z - b.z;
  return dst;
}

/**
 * Multiply quaternion by scalar
 * @param {Quaternion|null} dst 
 * @param {number} s 
 * @param {Quaternion} src 
 * @returns {Quaternion}
 */
export function times(dst, s, src) {
  if (dst === null) dst = new Quaternion();
  dst.re = s * src.re;
  dst.x = s * src.x;
  dst.y = s * src.y;
  dst.z = s * src.z;
  return dst;
}

/**
 * Multiply two quaternions
 * @param {Quaternion|null} dst 
 * @param {Quaternion} a 
 * @param {Quaternion} b 
 * @returns {Quaternion}
 */
export function timesQuat(dst, a, b) {
  if (dst === null) dst = new Quaternion();
  if (a === null || b === null) {
    return dst;
  }
  
  // Need temporary storage in case dst === a or dst === b
  const re = a.re * b.re - a.x * b.x - a.y * b.y - a.z * b.z;
  const x = a.re * b.x + b.re * a.x + a.y * b.z - a.z * b.y;
  const y = a.re * b.y - a.x * b.z + b.re * a.y + a.z * b.x;
  const z = a.re * b.z + a.x * b.y - a.y * b.x + b.re * a.z;
  
  dst.re = re;
  dst.x = x;
  dst.y = y;
  dst.z = z;
  return dst;
}

/**
 * Inner product of two quaternions
 * @param {Quaternion} a 
 * @param {Quaternion} b 
 * @returns {number}
 */
export function innerProduct(a, b) {
  return (a.re * b.re + a.x * b.x + a.y * b.y + a.z * b.z);
}

/**
 * Length squared of quaternion
 * @param {Quaternion} q 
 * @returns {number}
 */
export function lengthSquared(q) {
  return innerProduct(q, q);
}

/**
 * Length of quaternion
 * @param {Quaternion} q 
 * @returns {number}
 */
export function length(q) {
  return Math.sqrt(lengthSquared(q));
}

/**
 * Invert a quaternion
 * @param {Quaternion|null} dst 
 * @param {Quaternion} src 
 * @returns {Quaternion}
 */
export function invert(dst, src) {
  if (dst === null) dst = new Quaternion();
  const tmp = new Quaternion();
  const ll = lengthSquared(src);
  if (ll === 0.0) {
    return copy(dst, INFINITE_QUATERNION);
  } else {
    // q^-1 = q* / <q,q>
    const factor = 1.0 / ll;
    conjugate(tmp, src);
    times(dst, factor, tmp);
  }
  return dst;
}

/**
 * Divide two quaternions a / b
 * @param {Quaternion|null} dst 
 * @param {Quaternion} a 
 * @param {Quaternion} b 
 * @returns {Quaternion}
 */
export function divide(dst, a, b) {
  const tmp = new Quaternion();
  invert(tmp, b);
  return timesQuat(dst, a, tmp);
}

/**
 * Star operation: conjugate of inverse
 * @param {Quaternion|null} dst 
 * @param {Quaternion} src 
 * @returns {Quaternion}
 */
export function star(dst, src) {
  const tmp = new Quaternion();
  return conjugate(dst, invert(tmp, src));
}

/**
 * Normalize a quaternion
 * @param {Quaternion|null} dst 
 * @param {Quaternion} src 
 * @returns {Quaternion}
 */
export function normalize(dst, src) {
  if (dst === null) dst = new Quaternion();
  const ll = length(src);
  if (ll === 0) {
    return copy(dst, src);
  } else {
    const factor = 1.0 / ll;
    times(dst, factor, src);
  }
  return dst;
}

/**
 * Create rotation quaternion from angle and axis
 * @param {Quaternion} q 
 * @param {number} angle 
 * @param {number[]} axis 
 * @returns {Quaternion}
 */
export function makeRotationQuaternionAngle(q, angle, axis) {
  const tmp = axis.slice(); // Clone array
  const cos = Math.cos(angle / 2.0);
  const sin = Math.sin(angle / 2.0);
  Rn.normalize(tmp, axis);
  Rn.times(tmp, sin, tmp);
  q.setValue(cos, tmp[0], tmp[1], tmp[2]);
  normalize(q, q);
  return q;
}

/**
 * Create rotation quaternion from cosine and axis
 * @param {Quaternion} q 
 * @param {number} cos 
 * @param {number[]} axis 
 * @returns {Quaternion}
 */
export function makeRotationQuaternionCos(q, cos, axis) {
  return makeRotationQuaternionAngle(q, 2 * Math.acos(cos), axis);
}

/**
 * Convert 4x4 matrix to 3x3 (utility function)
 * @param {number[]} d 
 * @returns {number[]}
 */
export function convert44To33(d) {
  const d33 = new Array(9);
  d33[0] = d[0];
  d33[1] = d[1];
  d33[2] = d[2];
  d33[3] = d[4];
  d33[4] = d[5];
  d33[5] = d[6];
  d33[6] = d[8];
  d33[7] = d[9];
  d33[8] = d[10];
  return d33;
}

/**
 * Convert rotation matrix to quaternion
 * @param {Quaternion|null} q 
 * @param {number[]} mat 
 * @returns {Quaternion}
 */
export function rotationMatrixToQuaternion(q, mat) {
  const n = Rn.mysqrt(mat.length);
  
  const d = Rn.determinant(mat);
  let m = null;
  
  // Handle negative determinant
  if (d < 0) {
    const mtmp = new Array(mat.length);
    Rn.times(mtmp, -1.0, mat);
    m = mtmp;
  } else {
    m = mat;
  }
  
  if (q === null) q = new Quaternion();
  
  // Shepperd's method for converting rotation matrix to quaternion
  q.x = Math.sqrt(Math.max(0, 1 - m[2*n+2] - m[n+1] + m[0])) / 2;
  if (q.x > 0.001) {
    q.y = (m[1] + m[n]) / (4 * q.x);
    q.z = (m[2] + m[2*n]) / (4 * q.x);
    q.re = (m[2*n+1] - m[n+2]) / (4 * q.x);
  } else {
    q.y = Math.sqrt(Math.max(0, 1 - m[2*n+2] + m[n+1] - m[0])) / 2;
    if (q.y > 0.001) {
      q.x = (m[1] + m[n]) / (4 * q.y);
      q.z = (m[n+2] + m[2*n+1]) / (4 * q.y);
      q.re = (m[2] - m[2*n]) / (4 * q.y);
    } else {
      q.z = Math.sqrt(Math.max(0, 1 + m[2*n+2] - m[n+1] - m[0])) / 2;
      if (q.z > 0.001) {
        q.x = (m[2] + m[2*n]) / (4 * q.z);
        q.y = (m[n+2] + m[2*n+1]) / (4 * q.z);
        q.re = (m[n] - m[1]) / (4 * q.z);
      } else {
        q.setValue(1.0, 0.0, 0.0, 0.0);
      }
    }
  }
  normalize(q, q);
  return q;
}

/**
 * Convert quaternion to rotation matrix (old method)
 * @param {number[]|null} rot 
 * @param {Quaternion} qt 
 * @returns {number[]}
 */
export function quaternionToRotationMatrixOld(rot, qt) {
  if (rot === null) rot = new Array(16);
  const axis = new Array(3);
  const q = new Quaternion();
  normalize(q, qt);
  if (1.0 - Math.abs(q.re) < 1e-16) {
    Rn.setIdentityMatrix(rot);
    return rot;
  }
  IJK(axis, q);
  Rn.normalize(axis, axis);
  const angle = 2 * Math.acos(q.re);
  // Note: P3.makeRotationMatrix would need to be implemented
  // return P3.makeRotationMatrix(rot, axis, angle);
  throw new Error('P3.makeRotationMatrix not yet implemented');
}

/**
 * Convert quaternion to rotation matrix
 * @param {number[]|null} rot 
 * @param {Quaternion} qt 
 * @returns {number[]}
 */
export function quaternionToRotationMatrix(rot, qt) {
  if (rot === null) rot = new Array(16);
  Rn.setToValue(rot, 0.0);
  normalize(qt, qt);
  
  rot[4] = 2 * (qt.re * qt.z + qt.y * qt.x);
  rot[1] = 2 * (-qt.re * qt.z + qt.x * qt.y);

  rot[8] = 2 * (-qt.re * qt.y + qt.x * qt.z);
  rot[2] = 2 * (qt.re * qt.y + qt.x * qt.z);

  rot[9] = 2 * (qt.re * qt.x + qt.y * qt.z);
  rot[6] = 2 * (-qt.re * qt.x + qt.y * qt.z);
  
  rot[0] = qt.re * qt.re + qt.x * qt.x - qt.y * qt.y - qt.z * qt.z;
  rot[5] = qt.re * qt.re - qt.x * qt.x + qt.y * qt.y - qt.z * qt.z;
  rot[10] = qt.re * qt.re - qt.x * qt.x - qt.y * qt.y + qt.z * qt.z;
  rot[15] = 1.0;
  
  return rot;
}

/**
 * Linear interpolation between two rotation quaternions
 * @param {Quaternion|null} dst 
 * @param {Quaternion} rot1 
 * @param {Quaternion} rot2 
 * @param {number} s 
 * @returns {Quaternion}
 */
export function linearInterpolation(dst, rot1, rot2, s) {
  if (dst === null) dst = new Quaternion();
  const r1 = rot1.asDouble();
  const r2 = rot2.asDouble();
  if (Rn.innerProduct(r1, r2) < 0) Rn.times(r2, -1.0, r2);
  const val = Pn.linearInterpolation(null, r1, r2, s, Pn.ELLIPTIC);
  dst.setValue(val[0], val[1], val[2], val[3]);
  return dst;
}

// Constants defined after the class to avoid circular dependency
export const INFINITE_QUATERNION = new Quaternion(Number.POSITIVE_INFINITY, 0.0, 0.0, 0.0);