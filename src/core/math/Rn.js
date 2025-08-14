// JavaScript port of jReality's Rn class (from Rn.java)
// This file is auto-generated to match the Java version as closely as possible.
// All functions are static and operate on arrays (vectors/matrices) of numbers.
// @ts-check

/** @typedef {number[]} Vec */
/** @typedef {number[]} Matrix */

export const TOLERANCE = 1e-8;

// Helper: fast integer sqrt for small perfect squares (used for matrix size)
function mysqrt(sq) {
  switch (sq) {
    case 16: return 4;
    case 9: return 3;
    case 4: return 2;
    case 1: return 1;
    case 25: return 5;
    case 36: return 6;
    case 49: return 7;
    case 64: return 8;
    case 81: return 9;
    case 100: return 10;
    case 0: return 0;
    default:
      if (sq < 0) throw new Error(String(sq));
      return Math.floor(Math.sqrt(sq));
  }
}

/**
 * Dehomogenize a homogeneous vector by dividing by the last coordinate.
 * If the last coordinate is (near) zero, returns a copy scaled by 1 (no-op).
 * @param {Vec|null} dst
 * @param {Vec} src
 * @returns {Vec}
 */
export function dehomogenize(dst, src) {
  const length = src.length;
  let factor = 1.0;
  if (dst == null) dst = new Array(length);
  if (Math.abs(src[length-1]) > 1e-10) {
      factor = 1.0 / src[length-1];
  }
  return times(dst, factor, src);
}


// Helper: fill array with value
/**
 * Fill a vector with a scalar value.
 * @param {Vec} dst
 * @param {number} val
 * @returns {Vec}
 */
export function setToValue(dst, val) {
  dst.fill(val);
  return dst;
};

// Helper: set 2-vector
/**
 * Set a 2D vector to specific components.
 * @param {Vec|null} dst
 * @param {number} x
 * @param {number} y
 * @returns {Vec}
 */
export function setToValue2(dst, x, y) {
  if (!dst) dst = new Array(2);
  if (dst.length !== 2) throw new Error('Incompatible length');
  dst[0] = x; dst[1] = y;
  return dst;
};

// Helper: set 3-vector
/**
 * Set a 3D vector to specific components.
 * @param {Vec|null} dst
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {Vec}
 */
export function setToValue3(dst, x, y, z) {
  if (!dst) dst = new Array(3);
  if (dst.length !== 3) throw new Error('Incompatible length');
  dst[0] = x; dst[1] = y; dst[2] = z;
  return dst;
};

// Helper: set 4-vector
/**
 * Set a 4D vector to specific components.
 * @param {Vec|null} dst
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} w
 * @returns {Vec}
 */
export function setToValue4(dst, x, y, z, w) {
  if (!dst) dst = new Array(4);
  if (dst.length !== 4) throw new Error('Incompatible length');
  dst[0] = x; dst[1] = y; dst[2] = z; dst[3] = w;
  return dst;
};

// abs: elementwise absolute value
/**
 * Elementwise absolute value.
 * @param {Vec|null} dst
 * @param {Vec} src
 * @returns {Vec}
 */
export function abs(dst, src) {
  const n = src.length;
  if (!dst) dst = new Array(n);
  for (let i = 0; i < n; ++i) dst[i] = Math.abs(src[i]);
  return dst;
};

// add: elementwise addition
/**
 * Elementwise vector addition.
 * @param {Vec|null} dst
 * @param {Vec} src1
 * @param {Vec} src2
 * @returns {Vec}
 */
export function add(dst, src1, src2) {
  if (!dst) dst = new Array(Math.max(src1.length, src2.length));
  
  // Handle empty vectors
  if (src1.length === 0) {
    for (let i = 0; i < src2.length; ++i) dst[i] = src2[i];
    return dst;
  }
  if (src2.length === 0) {
    for (let i = 0; i < src1.length; ++i) dst[i] = src1[i];
    return dst;
  }
  
  // Add overlapping elements and keep remaining elements from first vector
  const minLen = Math.min(src1.length, src2.length);
  for (let i = 0; i < minLen; ++i) {
    dst[i] = src1[i] + src2[i];
  }
  
  // Copy remaining elements from the first vector
  for (let i = minLen; i < src1.length; ++i) {
    dst[i] = src1[i];
  }
  
  return dst;
};

// average: average of a list of vectors
/**
 * Average of a list of vectors (componentwise mean).
 * @param {Vec|null} dst
 * @param {Vec[]} vlist
 * @returns {Vec|null}
 */
export function average(dst, vlist) {
  if (!dst) dst = new Array(vlist[0].length);
  if (vlist.length === 0) return null;
  const tmp = new Array(dst.length).fill(0);
  for (let i = 0; i < vlist.length; ++i) add(tmp, tmp, vlist[i]);
  times(dst, 1.0 / vlist.length, tmp);
  return dst;
};

// copy: copy src to dst
/**
 * Copy source vector into destination.
 * @param {Vec|null} dst
 * @param {Vec} src
 * @returns {Vec}
 */
export function copy(dst, src) {
  if (!dst) dst = new Array(src.length);
  for (let i = 0; i < Math.min(dst.length, src.length); ++i) dst[i] = src[i];
  return dst;
};

// crossProduct: 3D cross product
/**
 * 3D cross product u x v.
 * @param {Vec|null} dst
 * @param {Vec} u
 * @param {Vec} v
 * @returns {Vec}
 */
export function crossProduct(dst, u, v) {
  if (u.length < 3 || v.length < 3) throw new Error('Vectors too short');
  if (!dst) dst = new Array(3);
  let tmp = dst;
  if (dst === u || dst === v) tmp = new Array(3);
  tmp[0] = u[1] * v[2] - u[2] * v[1];
  tmp[1] = u[2] * v[0] - u[0] * v[2];
  tmp[2] = u[0] * v[1] - u[1] * v[0];
  if (tmp !== dst) for (let i = 0; i < 3; ++i) dst[i] = tmp[i];
  return dst;
};

// euclideanDistance: sqrt of sum of squares of differences
/**
 * Euclidean distance between vectors.
 * @param {Vec} u
 * @param {Vec} v
 * @returns {number}
 */
export function euclideanDistance(u, v) {
  return Math.sqrt(euclideanDistanceSquared(u, v));
};

// euclideanDistanceSquared: sum of squares of differences
/**
 * Squared Euclidean distance between vectors.
 * @param {Vec} u
 * @param {Vec} v
 * @returns {number}
 */
export function euclideanDistanceSquared(u, v) {
  const tmp = new Array(u.length);
  subtract(tmp, u, v);
  return euclideanNormSquared(tmp);
};

// euclideanNorm: sqrt of sum of squares
/**
 * Euclidean norm (2-norm) of a vector.
 * @param {Vec} vec
 * @returns {number}
 */
export function euclideanNorm(vec) {
  return Math.sqrt(euclideanNormSquared(vec));
};

// euclideanNormSquared: sum of squares
/**
 * Squared Euclidean norm (sum of squares).
 * @param {Vec} vec
 * @returns {number}
 */
export function euclideanNormSquared(vec) {
  return innerProductN(vec, vec, 2);
};

// innerProduct: dot product
/**
 * Dot product (componentwise) of u and v; tolerates off-by-one length.
 * @param {Vec} u
 * @param {Vec} v
 * @returns {number}
 */
export function innerProduct(u, v) {
  if (u.length !== v.length) {
    if (Math.abs(u.length - v.length) !== 1) throw new Error('Vectors must have same length');
  }
  let norm = 0.0;
  const n = u.length < v.length ? u.length : v.length;
  for (let i = 0; i < n; ++i) norm += u[i] * v[i];
  return norm;
};

// innerProduct with n terms
/**
 * Dot product of the first n entries of u and v.
 * @param {Vec} u
 * @param {Vec} v
 * @param {number} n
 * @returns {number}
 */
export function innerProductN(u, v, n) {
  if (u.length < n || v.length < n) throw new Error('Vectors not long enough');
  let norm = 0.0;
  const m = u.length < n ? u.length : n;
  for (let i = 0; i < m; ++i) norm += u[i] * v[i];
  return norm;
};

// manhattanNorm: sum of absolute values
/**
 * Manhattan (L1) norm of a vector.
 * @param {Vec} vec
 * @returns {number}
 */
export function manhattanNorm(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; ++i) sum += Math.abs(vec[i]);
  return sum;
};

// manhattanNormDistance: manhattan norm of difference
/**
 * Manhattan (L1) distance between vectors.
 * @param {Vec} u
 * @param {Vec} v
 * @returns {number}
 */
export function manhattanNormDistance(u, v) {
  const tmp = new Array(u.length);
  subtract(tmp, u, v);
  return manhattanNorm(tmp);
};

// max: elementwise maximum
/**
 * Elementwise maximum of two vectors.
 * @param {Vec|null} dst
 * @param {Vec} src1
 * @param {Vec} src2
 * @returns {Vec}
 */
export function max(dst, src1, src2) {
  const n = Math.min(src1.length, src2.length);
  if (!dst) dst = new Array(n);
  if (dst.length !== n) throw new Error('Invalid target vector length');
  const lim = Math.min(dst.length, n);
  for (let i = 0; i < lim; ++i) dst[i] = Math.max(src1[i], src2[i]);
  return dst;
};

// maxNorm: maximum absolute value
/**
 * Max norm (L-infinity) of a vector.
 * @param {Vec} vec
 * @returns {number}
 */
export function maxNorm(vec) {
  let max = 0;
  for (let i = 0; i < vec.length; ++i) max = Math.max(max, Math.abs(vec[i]));
  return max;
};

// maxNormDistance: max norm of difference
/**
 * Max norm distance (L-infinity) between vectors.
 * @param {Vec} u
 * @param {Vec} v
 * @returns {number}
 */
export function maxNormDistance(u, v) {
  const tmp = new Array(u.length);
  subtract(tmp, u, v);
  return maxNorm(tmp);
};

// min: elementwise minimum
/**
 * Elementwise minimum of two vectors.
 * @param {Vec|null} dst
 * @param {Vec} src1
 * @param {Vec} src2
 * @returns {Vec}
 */
export function min(dst, src1, src2) {
  const n = Math.min(src1.length, src2.length);
  if (!dst) dst = new Array(n);
  if (dst.length !== n) throw new Error('Invalid target vector length');
  for (let i = 0; i < n; ++i) dst[i] = Math.min(src1[i], src2[i]);
  return dst;
};

// negate: elementwise negation
/**
 * Elementwise negation of a vector.
 * @param {Vec|null} dst
 * @param {Vec} src
 * @returns {Vec}
 */
export function negate(dst, src) {
  if (!dst) dst = new Array(src.length);
  if (dst.length !== src.length) throw new Error('Vectors must have same length');
  const n = Math.min(dst.length, src.length);
  for (let i = 0; i < n; ++i) dst[i] = -src[i];
  return dst;
};

// normalize: normalize to unit length
/**
 * Normalize a vector to unit Euclidean length.
 * @param {Vec|null} dst
 * @param {Vec} src
 * @returns {Vec}
 */
export function normalize(dst, src) {
  return setEuclideanNorm(dst, 1.0, src);
};

// normalize array of vectors
/**
 * Normalize an array of vectors to unit length.
 * @param {Vec[]|null} dst
 * @param {Vec[]} src
 * @returns {Vec[]}
 */
export function normalizeArray(dst, src) {
  if (!dst) dst = new Array(src.length).fill(0).map(() => new Array(src[0].length));
  if (dst.length !== src.length || dst[0].length !== src[0].length) throw new Error('Vectors must have same length');
  const n = Math.min(dst.length, src.length);
  for (let i = 0; i < n; ++i) normalize(dst[i], src[i]);
  return dst;
};

// setEuclideanNorm: scale to given length
/**
 * Scale src to have given Euclidean length.
 * @param {Vec|null} dst
 * @param {number} length
 * @param {Vec} src
 * @returns {Vec}
 */
export function setEuclideanNorm(dst, length, src) {
  if (!dst) dst = new Array(src.length);
  if (dst.length !== src.length) throw new Error('Incompatible lengths');
  const norm = euclideanNorm(src);
  if (norm === 0) {
    for (let i = 0; i < Math.min(src.length, dst.length); ++i) dst[i] = src[i];
    return dst;
  }
  return times(dst, length / norm, src);
};



// subtract: elementwise subtraction
/**
 * Elementwise subtraction src1 - src2.
 * @param {Vec|null} dst
 * @param {Vec} src1
 * @param {Vec} src2
 * @returns {Vec}
 */
export function subtract(dst, src1, src2) {
  if (!dst) dst = new Array(Math.max(src1.length, src2.length));
  
  // Handle empty vectors
  if (src1.length === 0) {
    for (let i = 0; i < src2.length; ++i) dst[i] = -src2[i];
    return dst;
  }
  if (src2.length === 0) {
    for (let i = 0; i < src1.length; ++i) dst[i] = src1[i];
    return dst;
  }
  
  // Subtract overlapping elements and keep remaining elements from first vector
  const minLen = Math.min(src1.length, src2.length);
  for (let i = 0; i < minLen; ++i) {
    dst[i] = src1[i] - src2[i];
  }
  
  // Copy remaining elements from the first vector
  for (let i = minLen; i < src1.length; ++i) {
    dst[i] = src1[i];
  }
  
  return dst;
};

// subtract array of vectors
/**
 * Elementwise subtraction of arrays of vectors.
 * @param {Vec[]|null} dst
 * @param {Vec[]} src1
 * @param {Vec[]} src2
 * @returns {Vec[]}
 */
export function subtractArray(dst, src1, src2) {
  if (!dst) dst = new Array(src1.length).fill(0).map(() => new Array(src1[0].length));
  if (dst.length !== src1.length) throw new Error('Vectors must be same length');
  const n = src1.length;
  for (let i = 0; i < n; ++i) subtract(dst[i], src1[i], src2[i]);
  return dst;
};

// times: scalar multiplication
/**
 * Multiply vector by scalar factor.
 * @param {Vec|null} dst
 * @param {number} factor
 * @param {Vec} src
 * @returns {Vec}
 */
export function times(dst, factor, src) {
  if (!dst) dst = new Array(src.length);
  if (dst.length !== src.length) throw new Error('Vectors must be same length');
  const n = dst.length;
  for (let i = 0; i < n; ++i) dst[i] = factor * src[i];
  return dst;
};

// times: matrix multiplication
/**
 * Matrix multiplication dst = src1 * src2 (both square, same size, row-major 1D arrays).
 * @param {Matrix|null} dst
 * @param {Matrix} src1
 * @param {Matrix} src2
 * @returns {Matrix}
 */
export function timesMatrix(dst, src1, src2) {
  if (src1.length !== src2.length) throw new Error('Input Matrices must be same size'+src1.length+' '+src2.length);
  const n = mysqrt(src1.length);
  let out;
  let rewrite = false;
  if (dst === src1 || dst === src2 || !dst) {
    out = new Array(src1.length);
    if (dst) rewrite = true;
  } else {
    out = dst;
  }
  if (out.length !== src1.length) throw new Error('Input and output Matrices must be same size');
  
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      out[i * n + j] = 0.0;
      for (let k = 0; k < n; ++k) {
        out[i * n + j] += src1[i * n + k] * src2[k * n + j];
      }
    }
  }
  if (!dst) return out;
  if (rewrite) for (let i = 0; i < dst.length; ++i) dst[i] = out[i];
  return dst;
};

// times: scalar multiplication for array of vectors
/**
 * Multiply an array of vectors by a scalar factor.
 * @param {Vec[]|null} dst
 * @param {number} factor
 * @param {Vec[]} src
 * @returns {Vec[]}
 */
export function timesArray(dst, factor, src) {
  if (!dst) dst = new Array(src.length).fill(0).map(() => new Array(src[0].length));
  if (dst.length !== src.length) throw new Error('Vectors must be same length');
  const n = src.length;
  for (let i = 0; i < n; ++i) times(dst[i], factor, src[i]);
  return dst;
};

/**
 * Convert a flat n*n array to a 2D n x n array.
 * @param {number[][]|null} dst
 * @param {Matrix} src
 * @returns {number[][]}
 */
export function convertFlatArrayTo2DArray(dst, src) {
  const n = mysqrt(src.length);
  if (!dst) dst = new Array(n).fill(0).map(() => new Array(n));
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      dst[i][j] = src[i * n + j];
    }
  }
  return dst;
};
// barycentricTriangleInterp: barycentric interpolation
/**
 * Barycentric interpolation of three corner vectors with weights.
 * @param {Vec|null} dst
 * @param {Vec[]} corners length 3
 * @param {number[]} weights length 3
 * @returns {Vec}
 */
export function barycentricTriangleInterp(dst, corners, weights) {
  let ddst;
  if (!dst) ddst = new Array(corners[0].length);
  else ddst = dst;
  const n = Math.min(corners[0].length, ddst.length);
  const tmp = new Array(n);
  ddst.fill(0);
  for (let i = 0; i < 3; ++i) {
    add(ddst, ddst, times(tmp, weights[i], corners[i]));
  }
  return ddst;
};

// calculateBounds: min/max bounds of vector list
/**
 * Compute axis-aligned bounds for a list of vectors.
 * @param {number[][]} bounds [min[], max[]]
 * @param {Vec[]} vlist
 * @returns {number[][]}
 */
export function calculateBounds(bounds, vlist) {
  const vl = vlist[0].length;
  const bl = bounds[0].length;
  if (vl > bl) throw new Error('invalid dimension');
  
  // fill bounds with appropriate values
  for (let i = 0; i < vl; ++i) {
    bounds[0][i] = Number.MAX_VALUE;
    bounds[1][i] = -Number.MAX_VALUE;
  }
  for (let i = vl; i < bl; ++i) {
    bounds[0][i] = bounds[1][i] = 0.0;
  }
  for (let i = 0; i < vlist.length; ++i) {
    max(bounds[1], bounds[1], vlist[i]);
    min(bounds[0], bounds[0], vlist[i]);
    if (isNaN(bounds[0][0])) throw new Error('calculate bounds: nan');
  }
  return bounds;
};

// convertArray2DToArray1D: flatten 2D array
/**
 * Flatten a 2D array to a 1D row-major array.
 * @param {number[]|null} target
 * @param {number[][]} src
 * @returns {number[]}
 */
export function convertArray2DToArray1D(target, src) {
  console.log("convertArray2DToArray1D: src = "+src.length+" "+src[0].length);
   const slotLength = src[0].length;
  if (!target) target = new Array(src.length * slotLength);
  for (let i = 0; i < src.length; i++) {
    for (let j = 0; j < slotLength; j++) {
      target[i * slotLength + j] = src[i][j];
    }
  }
  return target;
};

// convertArray3DToArray1D: flatten 3D array
/**
 * Flatten a 3D array to 1D with sampling.
 * @param {number[][][]} V
 * @param {number} [usample=1]
 * @param {number} [vsample=1]
 * @returns {number[]}
 */
export function convertArray3DToArray1D(V, usample = 1, vsample = 1) {
  const n = V.length;
  const m = V[0].length;
  const p = V[0][0].length;
  const newV = new Array(((n + vsample - 1) / vsample) * ((m + usample - 1) / usample) * p);
  for (let i = 0, ind = 0; i < n; i += vsample) {
    for (let j = 0; j < m; j += usample) {
      for (let k = 0; k < p; k++, ind++) {
        newV[ind] = V[i][j][k];
      }
    }
  }
  return newV;
};

// convertArray3DToArray2D: flatten 3D array to 2D
/**
 * Flatten a 3D array to a 2D array by stacking slices.
 * @param {number[][][]} V
 * @returns {number[][]}
 */
export function convertArray3DToArray2D(V) {
  const n = V.length;
  const m = V[0].length;
  const p = V[0][0].length;
  const newV = new Array(n * m).fill(0).map(() => new Array(p));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; ++j) {
      for (let k = 0; k < p; ++k) {
        newV[i * m + j][k] = V[i][j][k];
      }
    }
  }
  return newV;
};

// convertDoubleToFloatArray: convert double to float
/**
 * Convert a double array to a float array (JS number-to-number, kept for API parity).
 * @param {number[]} ds
 * @returns {number[]}
 */
export function convertDoubleToFloatArray(ds) {
  const n = ds.length;
  const fs = new Array(n);
  for (let i = 0; i < n; ++i) fs[i] = ds[i];
  return fs;
};

// euclideanAngle: angle between vectors
/**
 * Angle between vectors in Euclidean space.
 * @param {Vec} u
 * @param {Vec} v
 * @returns {number}
 */
export function euclideanAngle(u, v) {
  if (u.length !== v.length) throw new Error('Vectors must have same length');
  const uu = innerProduct(u, u);
  const vv = innerProduct(v, v);
  const uv = innerProduct(u, v);
  if (uu === 0 || vv === 0) return Number.MAX_VALUE;
  let f = uv / Math.sqrt(Math.abs(uu * vv));
  if (f > 1.0) f = 1.0;
  if (f < -1.0) f = -1.0;
  return Math.acos(f);
};

// equals: check if vectors are equal within tolerance
/**
 * Compare vectors for approximate equality.
 * @param {Vec} u
 * @param {Vec} v
 * @param {number} [tol=0]
 * @returns {boolean}
 */
export function equals(u, v, tol = 0) {
  let n = u.length;
  if (v.length < u.length) n = v.length;
  for (let i = 0; i < n; ++i) {
    const d = u[i] - v[i];
    if (d > tol || d < -tol) return false;
  }
  return true;
};

// identityMatrix: create identity matrix
/**
 * Create an identity matrix of given dimension (flattened row-major).
 * @param {number} dim
 * @returns {Matrix}
 */
export function identityMatrix(dim) {
  const m = new Array(dim * dim).fill(0);
  for (let i = 0, k = 0, doffs = dim + 1; i < dim; i++, k += doffs) {
    m[k] = 1.0;
  }
  return m;
};

// isIdentityMatrix: check if matrix is identity
/**
 * Test if a matrix is (approximately) identity.
 * @param {Matrix} mat
 * @param {number} tol
 * @returns {boolean}
 */
export function isIdentityMatrix(mat, tol) {
  const n = mysqrt(mat.length);
  const idd = identityMatrix(n);
  for (let i = 0; i < mat.length; ++i) {
    if (Math.abs(mat[i] - idd[i]) > tol) return false;
  }
  return true;
};

// isNan: check if array contains NaN
/**
 * Check if an array contains NaN.
 * @param {number[]} ds
 * @returns {boolean}
 */
export function isNan(ds) {
  const n = ds.length;
  for (let i = 0; i < n; ++i) {
    if (isNaN(ds[i])) return true;
  }
  return false;
};

// isSpecialMatrix: check if determinant is 1
/**
 * Check if |determinant(mat)| ~= 1 within tolerance.
 * @param {Matrix} mat
 * @param {number} tol
 * @returns {boolean}
 */
export function isSpecialMatrix(mat, tol) {
  const d = determinant(mat);
  return (Math.abs(Math.abs(d) - 1) < tol);
};

// isZero: check if array is zero
/**
 * Check if all components are near zero within tolerance.
 * @param {number[]} iline
 * @param {number} [tol=TOLERANCE]
 * @returns {boolean}
 */
export function isZero(iline, tol = TOLERANCE) {
  for (const d of iline) {
    if (Math.abs(d) > tol) return false;
  }
  return true;
};

// linearCombination: dst = a*aVec + b*bVec
/**
 * Linear combination: dst = a*aVec + b*bVec
 * @param {Vec|null} dst
 * @param {number} a
 * @param {Vec} aVec
 * @param {number} b
 * @param {Vec} bVec
 * @returns {Vec}
 */
export function linearCombination(dst, a, aVec, b, bVec) {
  if (aVec.length !== bVec.length) throw new Error('Vectors must be same length');
  if (!dst) dst = new Array(aVec.length);
  const tmp = new Array(dst.length);
  return add(dst, times(tmp, a, aVec), times(dst, b, bVec));
};

// matrixTimesVector: matrix times vector
/**
 * Multiply square matrix (flattened) by vector.
 * @param {Vec|null} dst
 * @param {Matrix} m
 * @param {Vec} src
 * @returns {Vec}
 */
export function matrixTimesVector(dst, m, src) {
  let out;
  let rewrite = false;
  if (dst === m || dst === src) {
    out = new Array(src.length);
    rewrite = true;
  } else if (!dst) {
    out = new Array(src.length);
  } else {
    out = dst;
  }
  
  _matrixTimesVectorSafe(out, m, src);
  
  if (rewrite) {
    const target = /** @type {number[]} */ (dst);
    for (let i = 0; i < out.length; ++i) target[i] = out[i];
    return target;
  }
  return out;
};

/**
 * Compute bilinear form v2^T * m * v1.
 * @param {Matrix} m
 * @param {Vec} v1
 * @param {Vec} v2
 * @returns {number}
 */
export function bilinearForm(m, v1, v2) {
  return innerProduct(matrixTimesVector(null, m, v1), v2);
};

// matrixTimesVector for array of vectors
/**
 * Multiply matrix by an array of vectors.
 * @param {Vec[]|null} dst
 * @param {Matrix} m
 * @param {Vec[]} src
 * @returns {Vec[]}
 */
export function matrixTimesVectorArray(dst, m, src) {
  const n = mysqrt(m.length);
  let out;
  let rewrite = false;
  if (!dst || dst === src) {
    out = new Array(src.length).fill(0).map(() => new Array(src[0].length));
    if (dst === src) rewrite = true;
  } else {
    out = dst;
  }
  
  const nv = src.length;
  for (let k = 0; k < nv; ++k) _matrixTimesVectorSafe(out[k], m, src[k]);
  
  if (rewrite) {
    const target = /** @type {number[][]} */ (dst);
    for (let i = 0; i < target.length; ++i) {
      for (let j = 0; j < target[0].length; ++j) target[i][j] = out[i][j];
    }
    return target;
  }
  return out;
};

// matrixToString: convert matrix to string
/**
 * Convert a square matrix to a formatted string.
 * @param {Matrix} m
 * @param {string} [formatString='%g']
 * @returns {string}
 */
export function matrixToString(m, formatString = '%g') {
  const sb = [];
  const n = mysqrt(m.length);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sb.push(formatString.replace('%g', String(m[n * i + j])));
      sb.push(j === (n - 1) ? '\n' : '\t');
    }
  }
  return sb.join('');
};

// setIdentityMatrix: set matrix to identity
/**
 * Set an existing square matrix to identity in-place.
 * @param {Matrix} mat
 * @returns {Matrix}
 */
export function setIdentityMatrix(mat) {
  const n = mysqrt(mat.length), noffs = n + 1;
  mat.fill(0);
  for (let i = 0, k = 0; i < n; i++, k += noffs) {
    mat[k] = 1.0;
  }
  return mat;
};

// swap: swap contents of two vectors
/**
 * Swap the contents of two vectors in-place.
 * @param {Vec} u
 * @param {Vec} v
 * @returns {void}
 */
export function swap(u, v) {
  if (v.length !== v.length) throw new Error('Inputs must be same length');
  const n = u.length;
  for (let i = 0; i < n; ++i) {
    const tmp = u[i];
    u[i] = v[i];
    v[i] = tmp;
  }
};

// toString: convert vector to string
/**
 * Convert a vector to formatted string.
 * @param {Vec} v
 * @param {string} [formatString='%g']
 * @returns {string}
 */
export function toString(v, formatString = '%g') {
  const n = v.length;
  const strb = [];
  for (let i = 0; i < n; ++i) {
    strb.push(formatString.replace('%g', String(v[i])));
    strb.push('\t');
  }
  return strb.join('');
};

// toString for array of vectors
/**
 * Convert an array of vectors to a string (for debugging).
 * @param {Vec[]} v
 * @param {number} [n=-1]
 * @returns {string}
 */
export function toStringArray(v, n = -1) {
  if (n < 0) n = v.length;
  const strb = [];
  for (let i = 0; i < n; ++i) {
    strb.push(toString(v[i]) + '\t');
    strb.push('\n');
  }
  return strb.join('');
};

// toString for 3D array
/**
 * Convert a 3D array to a string (for debugging).
 * @param {number[][][]} v
 * @returns {string}
 */
export function toString3D(v) {
  const n = v.length, m = v[0].length;
  const strb = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      strb.push(toString(v[i][j]) + '\t');
      strb.push('\n');
    }
    strb.push('\n');
  }
  return strb.join('');
};

// transpose: transpose matrix
/**
 * Transpose a square matrix (flattened row-major).
 * @param {Matrix|null} dst
 * @param {Matrix} src
 * @returns {Matrix}
 */
export function transpose(dst, src) {
  const n = mysqrt(src.length);
  let out;
  let rewrite = false;
  if (!dst) dst = new Array(src.length);
  if (dst.length !== src.length) throw new Error('Matrices must be same size');
  if (dst === src) {
    out = new Array(dst.length);
    rewrite = true;
  } else {
    out = dst;
  }
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      out[i * n + j] = src[j * n + i];
    }
  }
  if (rewrite) {
    for (let i = 0; i < dst.length; ++i) dst[i] = out[i];
  }
  return dst;
};

// transposeD2F: transpose double to float
/**
 * Transpose 4x4 double array to float-like array (JS numbers).
 * @param {number[]|null} dst length 16
 * @param {number[]} src length 16
 * @returns {number[]}
 */
export function transposeD2F(dst, src) {
  if (!dst) dst = new Array(16);
  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      dst[i * 4 + j] = src[j * 4 + i];
    }
  }
  return dst;
};

// transposeF2D: transpose float to double
/**
 * Transpose 4x4 float-like array to double-like (JS numbers).
 * @param {number[]|null} dst length 16
 * @param {number[]} src length 16
 * @returns {number[]}
 */
export function transposeF2D(dst, src) {
  if (!dst) dst = new Array(16);
  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      dst[i * 4 + j] = src[j * 4 + i];
    }
  }
  return dst;
};

// _matrixTimesVectorSafe: internal matrix-vector multiplication
function _matrixTimesVectorSafe(dst, m, src) {
  const sl = src.length;
  const ml = mysqrt(m.length);
  let dehomog = false;
  if (ml === sl + 1) dehomog = true;
  if (sl + 1 < ml || sl > ml) {
    throw new Error('Invalid dimension in _matrixTimesVectorSafe');
  }
  let out;
  if (dehomog) {
    out = new Array(ml);
  } else {
    out = dst;
  }
  for (let i = 0; i < ml; ++i) {
    out[i] = 0;
    for (let j = 0; j < ml; ++j) {
      if (dehomog && j === ml - 1) {
        out[i] += m[i * ml + j]; // src[last] = 1.0
      } else {
        out[i] += m[i * ml + j] * src[j];
      }
    }
  }
  if (dehomog) {
    // Return the full homogeneous result instead of dehomogenizing
    for (let i = 0; i < ml; ++i) {
      dst[i] = out[i];
    }
  }
}

// bilinearInterpolation: bilinear interpolation
/**
 * Bilinear interpolation on a quad from bottom/top edges.
 * @param {Vec|null} ds
 * @param {number} u
 * @param {number} v
 * @param {Vec} vb
 * @param {Vec} vt
 * @param {Vec} cb
 * @param {Vec} ct
 * @returns {Vec}
 */
export function bilinearInterpolation(ds, u, v, vb, vt, cb, ct) {
  if (!ds) ds = new Array(vb.length);
  const vv = linearCombination(null, 1 - u, vb, u, vt);
  const cc = linearCombination(null, 1 - u, cb, u, ct);
  linearCombination(ds, 1 - v, vv, v, cc);
  return ds;
};

// bezierCombination: Bezier curve combination
/**
 * Cubic Bezier combination of control points and tangents.
 * @param {Vec} dst
 * @param {number} t
 * @param {Vec} v0
 * @param {Vec} t0
 * @param {Vec} t1
 * @param {Vec} v1
 * @returns {Vec}
 */
export function bezierCombination(dst, t, v0, t0, t1, v1) {
  const tmp1 = (1 - t);
  const tmp2 = tmp1 * tmp1;
  const c0 = tmp2 * tmp1;
  const c1 = 3 * tmp2 * t;
  const c2 = 3 * tmp1 * t * t;
  const c3 = t * t * t;
  dst = add(dst,
    add(null, times(null, c0, v0), times(null, c1, t0)),
    add(null, times(null, c2, t1), times(null, c3, v1)));
  return dst;
};

// completeBasis: complete orthogonal basis
/**
 * Complete an orthogonal basis from partial vectors (heuristic).
 * @param {number[][]|null} dst
 * @param {number[][]} partial
 * @returns {number[][]}
 */
export function completeBasis(dst, partial) {
  const dim = partial[0].length;
  const size = partial.length;
  if (!dst || dst.length !== dim) dst = new Array(dim).fill(0).map(() => new Array(dim));
  const inline = new Array(dim * dim);
  for (let i = 0; i < size; ++i) {
    for (let j = 0; j < dim; ++j) inline[i * dim + j] = partial[i][j];
  }
  for (let i = size; i < dim; ++i) {
    for (let j = 0; j < dim; ++j) {
      inline[i * dim + j] = Math.random();
    }
  }
  for (let i = size; i < dim; ++i) {
    const newrow = dst[i];
    for (let j = 0; j < dim; ++j) {
      newrow[j] = (((i + j) % 2 === 0) ? 1 : -1) * determinant(submatrix(null, inline, i, j));
    }
    for (let j = 0; j < dim; ++j) inline[i * dim + j] = newrow[j];
  }
  for (let i = 0; i < dim; ++i) {
    for (let j = 0; j < dim; ++j) dst[i][j] = inline[i * dim + j];
  }
  return dst;
};

// determinant: matrix determinant
/**
 * Determinant of a square matrix (flattened row-major).
 * @param {Matrix} m
 * @returns {number}
 */
export function determinant(m) {
  let det = 0.0;
  const n = mysqrt(m.length);
  if (n > 4) {
    const subm = new Array((n - 1) * (n - 1));
    for (let i = 0; i < n; ++i) {
      const tmp = m[i] * determinant(submatrix(subm, m, 0, i));
      det += ((i % 2) === 0) ? tmp : (-tmp);
    }
  } else {
    return determinantOld(m);
  }
  return det;
};

// determinantOld: optimized for low dimensions
function determinantOld(m) {
  let det = 0.0;
  const n = mysqrt(m.length);
  switch (n) {
    case 4:
      det = m[3] * m[6] * m[9] * m[12] - m[2] * m[7] * m[9] * m[12]
        - m[3] * m[5] * m[10] * m[12] + m[1] * m[7] * m[10] * m[12]
        + m[2] * m[5] * m[11] * m[12] - m[1] * m[6] * m[11] * m[12]
        - m[3] * m[6] * m[8] * m[13] + m[2] * m[7] * m[8] * m[13]
        + m[3] * m[4] * m[10] * m[13] - m[0] * m[7] * m[10] * m[13]
        - m[2] * m[4] * m[11] * m[13] + m[0] * m[6] * m[11] * m[13]
        + m[3] * m[5] * m[8] * m[14] - m[1] * m[7] * m[8] * m[14]
        - m[3] * m[4] * m[9] * m[14] + m[0] * m[7] * m[9] * m[14]
        + m[1] * m[4] * m[11] * m[14] - m[0] * m[5] * m[11] * m[14]
        - m[2] * m[5] * m[8] * m[15] + m[1] * m[6] * m[8] * m[15]
        + m[2] * m[4] * m[9] * m[15] - m[0] * m[6] * m[9] * m[15]
        - m[1] * m[4] * m[10] * m[15] + m[0] * m[5] * m[10] * m[15];
      break;
    case 3:
      det = -(m[2] * m[4] * m[6]) + m[1] * m[5] * m[6] + m[2] * m[3] * m[7] - m[0] * m[5] * m[7] - m[1] * m[3] * m[8] + m[0] * m[4] * m[8];
      break;
    case 2:
      det = m[0] * m[3] - m[2] * m[1];
      break;
    case 1:
      det = m[0];
      break;
    default:
      det = determinant(m);
  }
  return det;
}
// diagonalMatrix: create diagonal matrix
/**
 * Create a diagonal matrix with given diagonal entries.
 * @param {Matrix|null} dst
 * @param {number[]} entries
 * @returns {Matrix}
 */
export function diagonalMatrix(dst, entries) {
  const n = entries.length;
  if (!dst) dst = identityMatrix(n);
  for (let i = 0; i < n; ++i) dst[n * i + i] = entries[i];
  return dst;
};

// extractSubmatrix: extract rectangular submatrix
/**
 * Extract a rectangular submatrix [t..b]x[l..r] from a square matrix.
 * @param {Matrix} subm
 * @param {Matrix} src
 * @param {number} l
 * @param {number} r
 * @param {number} t
 * @param {number} b
 * @returns {Matrix}
 */
export function extractSubmatrix(subm, src, l, r, t, b) {
  if (r - l !== b - t) throw new Error('(b-t) must equal (r-l)');
  const n = mysqrt(src.length);
  const submsize = (b - t + 1) * (r - l + 1);
  let count = 0;
  if (subm.length !== submsize) subm = new Array(submsize);
  for (let i = t; i <= b; ++i) {
    for (let j = l; j <= r; ++j) {
      subm[count++] = src[i * n + j];
    }
  }
  return subm;
};

// planeParallelToPassingThrough: create plane
/**
 * Construct plane parallel to ds passing through ds2.
 * @param {Vec|null} plane
 * @param {Vec} ds
 * @param {Vec} ds2
 * @returns {Vec}
 */
export function planeParallelToPassingThrough(plane, ds, ds2) {
  if (!plane) plane = new Array(4);
  for (let i = 0; i < 3; ++i) plane[i] = ds[i];
  plane[3] = -innerProductN(plane, ds2, 3);
  return plane;
};

// projectOnto: orthogonal projection
/**
 * Orthogonal projection of src onto fixed.
 * @param {Vec|null} dst
 * @param {Vec} src
 * @param {Vec} fixed
 * @returns {Vec}
 */
export function projectOnto(dst, src, fixed) {
  if (!dst) dst = new Array(src.length);
  const d = innerProduct(fixed, fixed);
  const f = innerProduct(fixed, src);
  times(dst, f / d, fixed);
  return dst;
};

// projectOntoComplement: projection onto orthogonal complement
/**
 * Projection of src onto the orthogonal complement of fixed.
 * @param {Vec|null} dst
 * @param {Vec} src
 * @param {Vec} fixed
 * @returns {Vec}
 */
export function projectOntoComplement(dst, src, fixed) {
  return subtract(dst, src, projectOnto(null, src, fixed));
};

// setDiagonalMatrix: set diagonal matrix
/**
 * Set a (possibly larger) matrix to have given diagonal entries.
 * @param {Matrix|null} dst
 * @param {number[]} diag
 * @returns {Matrix}
 */
export function setDiagonalMatrix(dst, diag) {
  const n2 = diag.length;
  if (!dst) dst = new Array(n2 * n2);
  const n1 = mysqrt(dst.length);
  if (n1 < n2) throw new Error('Incompatible lengths');
  setIdentityMatrix(dst);
  const n = Math.min(n1, n2);
  for (let i = 0; i < n; ++i) dst[n1 * i + i] = diag[i];
  return dst;
};

// setToLength: scale to given length
/**
 * Scale vector p12 to length rad and write into p1.
 * @param {Vec} p1
 * @param {Vec} p12
 * @param {number} rad
 * @returns {Vec}
 */
export function setToLength(p1, p12, rad) {
  return times(p1, rad / euclideanNorm(p12), p12);
};

// submatrix: extract submatrix by deleting row and column
/**
 * Submatrix by removing given row and column from square matrix.
 * @param {Matrix|null} subm
 * @param {Matrix} m
 * @param {number} row
 * @param {number} column
 * @returns {Matrix}
 */
export function submatrix(subm, m, row, column) {
  const n = mysqrt(m.length);
  if (!subm) subm = new Array((n - 1) * (n - 1));
  if (subm.length !== (n - 1) * (n - 1)) throw new Error('Invalid dimension for submatrix');
  for (let i = 0, cnt = 0; i < n; ++i) {
    if (i === row) continue;
    for (let j = 0; j < n; ++j) {
      if (j !== column) subm[cnt++] = m[i * n + j];
    }
  }
  return subm;
};

// trace: matrix trace
/**
 * Trace of a square matrix.
 * @param {Matrix} m
 * @returns {number}
 */
export function trace(m) {
  const n = mysqrt(m.length);
  let t = 0;
  for (let i = 0; i < n; ++i) t += m[i * n + i];
  return t;
};

// cofactor: calculate the (i,j)th cofactor of a matrix
/**
 * Cofactor C(row,column) of a square matrix.
 * @param {Matrix} m
 * @param {number} row
 * @param {number} column
 * @returns {number}
 */
export function cofactor(m, row, column) {
  const n = mysqrt(m.length);
  return determinant(submatrix(null, m, row, column));
};

// adjugate: calculate the adjugate (classical adjugate) of a matrix
/**
 * Classical adjugate (transpose of cofactor matrix).
 * @param {Matrix|null} dst
 * @param {Matrix} src
 * @returns {Matrix}
 */
export function adjugate(dst, src) {
  const n = mysqrt(src.length);
  if (!dst) dst = src.slice(); // Clone the array
  let out;
  let rewrite = false;
  if (dst === src) {
    out = new Array(dst.length);
    rewrite = true;
  } else {
    out = dst;
  }
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      out[i * n + j] = cofactor(src, i, j) * (((i + j) % 2 === 1) ? -1 : 1);
    }
  }
  if (rewrite) {
    for (let i = 0; i < dst.length; ++i) dst[i] = out[i];
  }
  return dst;
};

// inverse: matrix inverse using Gaussian pivoting
/**
 * Matrix inverse via Gaussian elimination with partial pivoting.
 * @param {Matrix|null} minvIn
 * @param {Matrix} m
 * @returns {Matrix}
 */
export function inverse(minvIn, m) {
  const n = mysqrt(m.length);
  let i, j, k;
  let x, f;
  let t;
  let largest;

  t = new Array(m.length);
  for (let idx = 0; idx < m.length; ++idx) t[idx] = m[idx]; // Copy array

  let minv;
  if (!minvIn) {
    minv = new Array(m.length);
  } else {
    minv = minvIn;
  }
  setIdentityMatrix(minv);

  for (i = 0; i < n; i++) {
    largest = i;
    let largesq = t[n * i + i] * t[n * i + i];
    // find the largest entry in the ith column below the ith row
    for (j = i + 1; j < n; j++) {
      x = t[j * n + i] * t[j * n + i];
      if (x > largesq) {
        largest = j;
        largesq = x;
      }
    }

    // swap the ith row with the row with largest entry in the ith column
    for (k = 0; k < n; ++k) {
      x = t[i * n + k];
      t[i * n + k] = t[largest * n + k];
      t[largest * n + k] = x;
    }
    // do the same in the inverse matrix
    for (k = 0; k < n; ++k) {
      x = minv[i * n + k];
      minv[i * n + k] = minv[largest * n + k];
      minv[largest * n + k] = x;
    }
    
    // now for each remaining row, subtract off a multiple of the ith
    // row so that the entry in the ith column of that row becomes 0
    for (j = i + 1; j < n; j++) {
      f = t[j * n + i] / t[i * n + i];
      for (k = 0; k < n; ++k) {
        t[j * n + k] -= f * t[i * n + k];
      }
      for (k = 0; k < n; ++k) {
        minv[j * n + k] -= f * minv[i * n + k];
      }
    }
  }

  for (i = 0; i < n; i++) {
    f = t[i * n + i];
    if (f === 0.0) {
      // Singular matrix - return identity
      console.warn('Divide by zero, returning identity matrix');
      setIdentityMatrix(minv);
      return minv;
    }
    f = 1.0 / f;
    for (j = 0; j < n; j++) {
      t[i * n + j] *= f;
      minv[i * n + j] *= f;
    }
  }
  
  for (i = n - 1; i >= 0; i--) {
    for (j = i - 1; j >= 0; j--) {
      f = t[j * n + i];
      for (k = 0; k < n; ++k) {
        t[j * n + k] -= f * t[i * n + k];
      }
      for (k = 0; k < n; ++k) {
        minv[j * n + k] -= f * minv[i * n + k];
      }
    }
  }
  return minv;
};

// conjugateByMatrix: form the conjugate of matrix m by matrix c: dst = c * m * Inverse(c)
/**
 * Conjugate matrix: dst = c * m * inverse(c).
 * @param {Matrix|null} dst
 * @param {Matrix} m
 * @param {Matrix} c
 * @returns {Matrix}
 */
export function conjugateByMatrix(dst, m, c) {
   if (!dst) dst = new Array(c.length);
  timesMatrix(dst, c, timesMatrix(null, m, inverse(null, c)));
  return dst;
};

// permutationMatrix: create permutation matrix from permutation array
/**
 * Build permutation matrix from permutation array (row i -> column perm[i]).
 * @param {Matrix|null} dst
 * @param {number[]} perm
 * @returns {Matrix}
 */
export function permutationMatrix(dst, perm) {
  const n = perm.length;
  if (!dst) dst = new Array(n * n).fill(0);
  else dst.fill(0);
  for (let i = 0; i < n; ++i) {
    dst[i * n + perm[i]] = 1;
  }
  transpose(dst, dst);
  return dst;
};

// polarDecompose: polar decomposition of a matrix
/**
 * Polar decomposition m = q * s with q orthogonal and s symmetric positive (iterative).
 * @param {Matrix} q
 * @param {Matrix} s
 * @param {Matrix} m
 * @returns {Matrix}
 */
export function polarDecompose(q, s, m) {
  let old = 0, nw = 1;
  const qq = [new Array(m.length), new Array(m.length)];
  let qit = m.slice(); // Clone
  for (let i = 0; i < m.length; ++i) {
    qq[old][i] = m[i]; // Clone
    qq[nw][i] = m[i];  // Clone
  }
  const tol = 10E-12;
  let count = 0;

  // Iterative polar decomposition
  do {
    transpose(qit, inverse(qit, qq[old]));
    add(qq[nw], qq[old], qit);
    times(qq[nw], 0.5, qq[nw]);
    nw = 1 - nw;
    old = 1 - old;
    count++;
  } while (count < 20 && !equals(qq[nw], qq[old], tol));
  
  for (let i = 0; i < m.length; ++i) q[i] = qq[nw][i];
  transpose(qit, qq[nw]);
  timesMatrix(s, qit, m);
  return m;
};

