/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * JavaScript port of jReality's Pn class.
 * Static methods for n-dimensional real projective space RP^n.
 * Points and vectors are represented in homogeneous coordinates by arrays of length n+1.
 * @ts-check
 *
 * @typedef {number[]} number[]
 * @typedef {number[]} number[]
 */

import { innerProductN as RnInnerProductN, innerProduct as RnInnerProduct, normalize as RnNormalize } from './Rn.js';
import * as Rn from './Rn.js';

// Metric constants
export const ELLIPTIC = 1;
export const EUCLIDEAN = 0;
export const HYPERBOLIC = -1;
export const PROJECTIVE = 2;

// Standard direction vectors
export const zDirectionP3 = [0.0, 0.0, 1.0, 0.0];

/**
 * Hyperbolic trigonometric functions
 */
export function cosh(x) {
    return 0.5 * (Math.exp(x) + Math.exp(-x));
}

export function sinh(x) {
    return 0.5 * (Math.exp(x) - Math.exp(-x));
}

export function tanh(x) {
    return sinh(x) / cosh(x);
}

export function acosh(x) {
    return Math.log((x > 0 ? x : -x) + Math.sqrt(x * x - 1));
}

export function asinh(x) {
    return Math.log(x + Math.sqrt(x * x + 1));
}

export function atanh(x) {
    return 0.5 * Math.log((1 + x) / (1 - x));
}

/**
 * Calculate the angle between two points with respect to the given metric
 * @param {number[]} u - First point in homogeneous coordinates
 * @param {number[]} v - Second point in homogeneous coordinates
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number} The angle between the points
 */
export function angleBetween(u, v, metric) {
    const uu = innerProductPlanes(u, u, metric);
    const vv = innerProductPlanes(v, v, metric);
    const uv = innerProductPlanes(u, v, metric);
    if (uu === 0 || vv === 0) {
        return Number.MAX_VALUE; // error: ideal plans
    }
    
    let f = uv / Math.sqrt(Math.abs(uu * vv));
    f = Math.max(-1.0, Math.min(1.0, f));
    return Math.acos(f);
}

/**
 * Dehomogenize a point or vector
 * @param {number[]} dst - Destination array (can be null)
 * @param {number[]} src - Source array in homogeneous coordinates
 * @returns {number[]} The dehomogenized coordinates
 */
// using this simpler code breaks some code in intersectSpherePrimitive in BruteForcePicking.js
// export function dehomogenize(dst, src) {
//     const length = src.length;
//     let factor = 1.0;
//     if (dst == null) dst = new Array(length);
//     if (Math.abs(src[length-1]) > 1e-10) {
//         factor = 1.0 / src[length-1];
//     }
//   }
  
export function dehomogenize(dst, src)	{
    // assert dim checks
    const sl = src.length;
    if (!dst) dst = new Array(src.length);
    const dl = dst.length;
    // allow dst array same length or one shorter than source
    if (! (dl == sl || dl +1 == sl))	{
        throw new Error("Invalid dimensions");
    }
    let last = src[sl-1];
    if (last == 1.0 || last == 0.0) 	{
        if (src != dst) {
            for (let i = 0; i < dl; i++) {
                dst[i] = src[i];
            }
        }
        return dst;
    }
    last = 1.0/last;
    for (let i = 0; i<dl; ++i)		dst[i] = last * src[i];
    if (dl == sl) dst[dl-1] = 1.0;
    return dst;
}

/**
 * Homogenize a point or vector
 * @param {number[]|null} dst - Destination array (can be null)
 * @param {number[]} src - Source array
 * @returns {number[]} The homogenized coordinates
 */
export function homogenize(dst, src) {
    const sl = src.length;
    if (!dst) dst = new Array(sl + 1);
    
    for (let i = 0; i < sl; i++) {
        dst[i] = src[i];
    }
    dst[sl] = 1.0;
    
    return dst;
}

/**
 * Calculate the distance between two points with respect to the given metric
 * @param {number[]} p1 - First point
 * @param {number[]} p2 - Second point
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number} The distance between the points
 */
export function distanceBetween(p1, p2, metric) {
    let d = 0.0;
    const n = p1.length;
    switch (metric) {
        default:
            // fall through to euclidean
        case EUCLIDEAN: {
            let ul = p1[n - 1];
            let vl = p2[n - 1];
            const ulvl = ul * vl;
            for (let i = 0; i < n - 1; ++i) {
                const tmp = ul * p2[i] - vl * p1[i];
                d += tmp * tmp;
            }
            d = Math.sqrt(d);
            if (!(d === 0 || d === 1.0)) d /= Math.abs(ulvl);
            if (ul === 0 || vl === 0) d = Number.MAX_VALUE;
            break;
        }
        case HYPERBOLIC: {
            const uu = innerProduct(p1, p1, metric);
            const vv = innerProduct(p2, p2, metric);
            const uv = innerProduct(p1, p2, metric);
            // Java allows uu/vv >= 0 and still returns a distance
            let k = -(uv) / Math.sqrt(Math.abs(uu * vv));
            if (k < 1.0) k = 1.0;
            d = Math.abs(acosh(k));
            break;
        }
        case ELLIPTIC: {
            const uu = innerProduct(p1, p1, metric);
            const vv = innerProduct(p2, p2, metric);
            const uv = innerProduct(p1, p2, metric);
            let ip = (uv) / Math.sqrt(Math.abs(uu * vv));
            if (ip > 1.0) ip = 1.0;
            if (ip < -1.0) ip = -1.0;
            d = Math.acos(ip);
            break;
        }
    }
    return d;
}

/**
 * Calculate the inner product of two vectors with respect to the given metric
 * @param {number[]} u - First vector
 * @param {number[]} v - Second vector
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number} The inner product
 */
export function innerProduct(u, v, metric) {
    const n = Math.min(u.length, v.length) - 1;
    let sum = RnInnerProductN(u, v, n);
    return sum + metric * u[n] * v[n];

}

/**
 * Calculate the inner product of two planes with respect to the given metric
 * @param {number[]} u - First plane
 * @param {number[]} v - Second plane
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number} The inner product
 */
export function innerProductPlanes(u, v, metric) {
    return innerProduct(u, v, metric);
}

/**
 * Calculate the norm squared of a vector
 * @param {number[]} src - Source vector
 * @param {number} metric - Metric type
 * @returns {number} The squared norm
 */
export function normSquared(src, metric) {
    return innerProduct(src, src, metric);
}

/**
 * Set a vector to a specific length
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source vector
 * @param {number} length - Desired length
 * @param {number} metric - Metric type
 * @returns {number[]} The scaled vector
 */
export function setToLength(dst, src, length, metric) {
    if (!dst) dst = new Array(src.length);
    
    const norm = Math.sqrt(Math.abs(normSquared(src, metric)));
    if (norm === 0) return dst;
    
    const scale = length / norm;
    for (let i = 0; i < src.length; i++) {
        dst[i] = scale * src[i];
    }
    
    return dst;
}

/**
 * Check if a coordinate is valid for the given metric
 * @param {number[]} v - Vector to check
 * @param {number} metric - Metric type
 * @returns {boolean} True if valid
 */
export function isValidCoordinate(v, dimOrMetric, metricMaybe) {
    let dim;
    let metric;
    if (typeof metricMaybe === 'number') {
        dim = dimOrMetric;
        metric = metricMaybe;
    } else {
        metric = dimOrMetric;
        dim = v.length - 1;
    }
    if (v.length < dim) return false;

    if (metric === EUCLIDEAN && v.length === (dim + 1) && v[dim] === 0.0) {
        return false;
    }
    if (metric === HYPERBOLIC) {
        if (v.length === (dim + 1)) {
            if (!(innerProduct(v, v, metric) < 0)) return false;
        } else if (v.length === dim) {
            if (!(Rn.innerProduct(v, v) < 1)) return false;
        }
    }
    return true;
}

/**
 * Calculate bounds of a set of points
 * @param {number[][]} bounds - Output bounds array
 * @param {number[][]} points - Array of points
 * @returns {number[][]} The bounds array
 */
export function calculateBounds(bounds, points) {
    const vl = points[0].length;
    if (!bounds || bounds.length !== 2) {
        bounds = [new Array(vl - 1), new Array(vl - 1)];
    }

    const bl = bounds[0].length;
    if (vl - 1 > bl) return null;

    for (let i = 0; i < vl - 1; i++) {
        bounds[0][i] = Number.MAX_VALUE;
        bounds[1][i] = -Number.MAX_VALUE;
    }
    for (let i = vl - 1; i < bl; i++) {
        bounds[0][i] = 0.0;
        bounds[1][i] = 0.0;
    }

    const tmp = new Array(vl - 1);
    for (const point of points) {
        if (point[vl - 1] === 0.0) continue;
        dehomogenize(tmp, point);
        for (let i = 0; i < vl - 1; i++) {
            bounds[0][i] = Math.min(bounds[0][i], tmp[i]);
            bounds[1][i] = Math.max(bounds[1][i], tmp[i]);
        }
    }

    return bounds;
}

/**
 * Calculate the centroid of a set of points
 * @param {number[]} dst - Destination array
 * @param {number[][]} points - Array of points
 * @param {number} metric - Metric type
 * @returns {number[]} The centroid
 */
export function centroid(dst, points, metric) {
    if (!dst) dst = new Array(points[0].length);
    const tmp = new Array(dst.length);
    
    for (let i = 0; i < points.length; i++) {
        normalize(tmp, points[i], metric);
        for (let j = 0; j < dst.length; j++) {
            dst[j] = (dst[j] || 0) + tmp[j];
        }
    }
    
    const scale = 1.0 / points.length;
    for (let i = 0; i < dst.length; i++) {
        dst[i] *= scale;
    }
    
    return normalize(dst, dst, metric);
}

/**
 * Linear interpolation between two points
 * @param {number[]} dst - Destination array
 * @param {number[]} p1 - First point
 * @param {number[]} p2 - Second point
 * @param {number} t - Interpolation parameter [0,1]
 * @param {number} metric - Metric type
 * @returns {number[]} The interpolated point
 */
export function linearInterpolation(dst, u, v, t, metric) {
    if (!dst) dst = new Array(u.length);

    let s0 = 0.0;
    let s1 = 0.0;
    let dot = 0.0;
    let angle;
    let s2;
    let realMetric = metric;

    let uu = u;
    let vv = v;
    if (metric !== EUCLIDEAN && metric !== PROJECTIVE) {
        uu = normalize(null, u, metric);
        vv = normalize(null, v, metric);
    }

    switch (metric) {
        case PROJECTIVE:
        case EUCLIDEAN:
            s0 = 1 - t;
            s1 = t;
            break;
        case HYPERBOLIC:
            dot = innerProduct(uu, vv, metric);
            if (Math.abs(dot) <= 1.0) realMetric = ELLIPTIC;
            break;
        case ELLIPTIC:
            dot = innerProduct(uu, vv, metric);
            if (dot > 1.0) dot = 1.0;
            if (dot < -1.0) dot = -1.0;
            break;
    }

    if (realMetric === ELLIPTIC) {
        angle = Math.acos(dot);
        s2 = Math.sin(angle);
        if (s2 !== 0.0) {
            s0 = Math.sin((1 - t) * angle) / s2;
            s1 = Math.sin(t * angle) / s2;
        } else {
            s0 = 1.0;
            s1 = 0.0;
        }
    } else if (realMetric === HYPERBOLIC) {
        angle = acosh(dot);
        s2 = sinh(angle);
        if (s2 !== 0.0) {
            s0 = sinh((1 - t) * angle) / s2;
            s1 = sinh(t * angle) / s2;
        } else {
            s0 = 1.0;
            s1 = 0.0;
        }
    }

    return Rn.linearCombination(dst, s0, uu, s1, vv);
}

/**
 * TODO The euclidean case is handled awkwardly. normalize, normalizePoint, normalizePlane need to be better coordinated.
 * Normalize a vector to unit length
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source vector
 * @param {number} metric - Metric type
 * @returns {number[]} The normalized vector
 */
export function normalize(dst, a, b, c, d) {
    // Java overloads:
    // - normalize(double[] dst, double[] src, int metric)
    // - normalize(double[][] dst, double[][] src, int metric)
    // - normalize(double[] dst, double[] dvec, double[] src, double[] svec, int metric)
    //
    // JS port rule: keep the Java name and dispatch at runtime.

    // normalize(double[][] dst, double[][] src, int metric)
    if (Array.isArray(a) && Array.isArray(a[0]) && typeof b === 'number') {
        const src = /** @type {number[][]} */ (a);
        const metric = /** @type {number} */ (b);
        if (dst == null) dst = new Array(src.length).fill(0).map(() => new Array(src[0].length));
        if (!Array.isArray(dst) || !Array.isArray(dst[0]) || dst.length !== src.length) {
            throw new Error('Incompatible lengths');
        }
        for (let i = 0; i < src.length; ++i) {
            normalize(dst[i], src[i], metric);
        }
        return dst;
    }

    // normalize(double[] dst, double[] src, int metric)
    if (typeof b === 'number') {
        const src = /** @type {number[]} */ (a);
        const metric = /** @type {number} */ (b);
        if (metric === EUCLIDEAN) {
            return dehomogenize(/** @type {number[]|null} */(dst), src);
        }
        return setToLength(/** @type {number[]|null} */(dst), src, 1.0, metric);
    }

    // normalize(double[] dst, double[] dvec, double[] src, double[] svec, int metric)
    const dvec = /** @type {number[]} */ (a);
    const src = /** @type {number[]} */ (b);
    const svec = /** @type {number[]} */ (c);
    const metric = /** @type {number} */ (d);
    if (dst == null) dst = new Array(src.length);
    if (metric === EUCLIDEAN) {
        dehomogenize(/** @type {number[]} */(dst), src);
        dehomogenize(dvec, svec);
        dvec[dvec.length - 1] = 0.0;
        return dst;
    }
    normalize(/** @type {number[]} */(dst), src, metric);
    projectToTangentSpace(dvec, /** @type {number[]} */(dst), svec, metric);
    normalize(dvec, dvec, metric);
    return dst;
}

/**
 * Normalize a plane equation.  The euclidean case needs to be done more consistently.
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source plane equation
 * @param {number} metric - Metric type
 * @returns {number[]} The normalized plane equation
 */
export function normalizePlane(dst, src, metric) {
    if (metric !== EUCLIDEAN) return normalize(dst, src, metric);
    const norm = RnInnerProductN(src, src, src.length - 1);
    if (norm === 0) return dst;
    return Rn.times(dst, 1.0 / Math.sqrt(norm), src);
}

/**
 * Find the plane which lies, metrically, half-way between the two given planes.
 *
 * Mirrors `Pn.midPlane(midp, pl1, pl2, metric)` in Java.
 *
 * @param {number[]|null} midp - Destination array or null to create new (expects length 4 for P3)
 * @param {number[]} pl1 - First plane
 * @param {number[]} pl2 - Second plane
 * @param {number} metric - Metric constant
 * @returns {number[]} The mid-plane
 */
export function midPlane(midp, pl1, pl2, metric) {
    // Java allocates length 4; we keep the same behavior since this is used in P3 contexts.
    if (midp == null) midp = new Array(4);
    const pt1 = normalizePlane(null, pl1, metric);
    const pt2 = normalizePlane(null, pl2, metric);
    linearInterpolation(midp, pt1, pt2, 0.5, metric);
    return midp;
}

/**
 * Project a vector onto another vector
 * @param {number[]} dst - Destination array
 * @param {number[]} master - Vector to project onto
 * @param {number[]} victim - Vector to project
 * @param {number} metric - Metric type
 * @returns {number[]} The projection
 */
export function projectOnto(dst, master, victim, metric) {
    if (!dst) dst = new Array(victim.length);
    
    const mm = innerProduct(master, master, metric);
    if (mm === 0) return null;
    
    const mv = innerProduct(master, victim, metric);
    const scale = mv / mm;
    
    for (let i = 0; i < dst.length; i++) {
        dst[i] = scale * master[i];
    }
    
    return dst;
}

/**
 * Project a vector onto the complement of another vector
 * @param {number[]} dst - Destination array
 * @param {number[]} master - Vector whose complement to project onto
 * @param {number[]} victim - Vector to project
 * @param {number} metric - Metric type
 * @returns {number[]} The projection
 */
export function projectOntoComplement(dst, master, victim, metric) {
    if (!dst) dst = new Array(victim.length);
    
    const proj = projectOnto(null, master, victim, metric);
    if (!proj) return null;
    
    for (let i = 0; i < dst.length; i++) {
        dst[i] = victim[i] - proj[i];
    }
    
    return dst;
}

/**
 * Project a vector onto the tangent space at a point
 * @param {number[]} dst - Destination array
 * @param {number[]} point - Base point
 * @param {number[]} vector - Vector to project
 * @param {number} metric - Metric type
 * @returns {number[]} The projection
 */
export function projectToTangentSpace(dst, point, vector, metric) {
    return projectOntoComplement(dst, point, vector, metric);
}

/**
 * Drag a point towards another point by a given length
 * @param {number[]} dst - Destination array
 * @param {number[]} p0 - Starting point
 * @param {number[]} p1 - Target point
 * @param {number} length - Distance to drag
 * @param {number} metric - Metric type
 * @returns {number[]} The dragged point
 */
export function dragTowards(dst, p0, p1, length, metric) {
    if (!dst) dst = new Array(p0.length);
    
    const np0 = normalize(null, p0, metric);
    const np1 = normalize(null, p1, metric);
    
    if (metric === EUCLIDEAN) {
        const dp0 = dehomogenize(null, np0);
        const dp1 = dehomogenize(null, np1);
        const dir = new Array(dp0.length);
        let norm = 0;
        
        for (let i = 0; i < dp0.length; i++) {
            dir[i] = dp1[i] - dp0[i];
            norm += dir[i] * dir[i];
        }
        norm = Math.sqrt(norm);
        if (norm === 0) return null;
        
        const scale = length / norm;
        for (let i = 0; i < dp0.length; i++) {
            dst[i] = dp0[i] + scale * dir[i];
        }
        dst[dst.length-1] = 1;
        return dst;
    }
    
    const angle = angleBetween(np0, np1, metric);
    if (angle === 0) return null;
    
    const t = length / angle;
    return linearInterpolation(dst, np0, np1, t, metric);
}

/**
 * Absolute value of a vector
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source vector
 * @returns {number[]} Vector with absolute values
 */
export function abs(dst, src) {
    if (!dst) dst = new Array(src.length);
    
    for (let i = 0; i < src.length; i++) {
        dst[i] = Math.abs(src[i]);
    }
    
    return dst;
}

/**
 * Check if a vector is zero
 * @param {number[]} vec - Vector to check
 * @param {number} tol - Tolerance
 * @returns {boolean} True if vector is zero
 */
export function isZero(vec, tol = 1e-8) {
    for (let i = 0; i < vec.length; i++) {
        if (Math.abs(vec[i]) > tol) return false;
    }
    return true;
}

/**
 * Calculate Manhattan norm of a vector
 * @param {number[]} vec - Input vector
 * @returns {number} Manhattan norm
 */
export function manhattanNorm(vec) {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
        sum += Math.abs(vec[i]);
    }
    return sum;
}

/**
 * Calculate Manhattan norm distance between two vectors
 * @param {number[]} u - First vector
 * @param {number[]} v - Second vector
 * @returns {number} Manhattan norm distance
 */
export function manhattanNormDistance(u, v) {
    let sum = 0;
    for (let i = 0; i < u.length; i++) {
        sum += Math.abs(u[i] - v[i]);
    }
    return sum;
}

/**
 * Complete a partial basis to a full basis
 * @param {number[][]} dst - Destination array for basis vectors
 * @param {number[][]} partial - Partial basis vectors
 * @returns {number[][]} Complete basis
 */
export function completeBasis(dst, partial) {
    const n = partial[0].length;
    if (!dst) dst = new Array(n);
    
    // Copy existing vectors
    for (let i = 0; i < partial.length; i++) {
        dst[i] = partial[i].slice();
    }
    
    // Add new vectors
    for (let i = partial.length; i < n; i++) {
        dst[i] = new Array(n).fill(0);
        dst[i][i] = 1;
        
        // Make orthogonal to previous vectors
        for (let j = 0; j < i; j++) {
            projectOntoComplement(dst[i], dst[j], dst[i], EUCLIDEAN);
        }
        
        // Normalize
        RnNormalize(dst[i], dst[i]);
    }
    
    return dst;
}

/**
 * Create a permutation matrix
 * @param {number[]} dst - Destination array
 * @param {number[]} perm - Permutation array
 * @returns {number[]} Permutation matrix
 */
export function permutationMatrix(dst, perm) {
    const n = perm.length;
    if (!dst) dst = new Array(n * n).fill(0);
    
    for (let i = 0; i < n; i++) {
        dst[i * n + perm[i]] = 1;
    }
    
    return dst;
}

/**
 * Extract a submatrix
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source matrix
 * @param {number} row - Starting row
 * @param {number} col - Starting column
 * @returns {number[]} Submatrix
 */
export function submatrix(dst, src, row, col) {
    if (!dst) dst = [];
    const n = Math.sqrt(src.length);
    const size = n - 1;
    
    let k = 0;
    for (let i = 0; i < n; i++) {
        if (i === row) continue;
        for (let j = 0; j < n; j++) {
            if (j === col) continue;
            dst[k++] = src[i * n + j];
        }
    }
    
    return dst;
}

/**
 * Square root function that preserves sign
 * @param {number} n - Input number
 * @returns {number} Signed square root
 */
export function mysqrt(n) {
    return Math.sign(n) * Math.sqrt(Math.abs(n));
}

/**
 * Matrix inverse
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source matrix
 * @returns {number[]} Inverse matrix
 */
export function inverse(dst, src) {
    const n = Math.sqrt(src.length);
    if (!dst) dst = new Array(src.length);
    
    // Create augmented matrix [src|I]
    const aug = new Array(2 * n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            aug[i * 2*n + j] = src[i * n + j];
            aug[i * 2*n + n + j] = i === j ? 1 : 0;
        }
    }
    
    // Gaussian elimination
    for (let i = 0; i < n; i++) {
        // Find pivot
        let max = Math.abs(aug[i * 2*n + i]);
        let maxRow = i;
        for (let j = i + 1; j < n; j++) {
            const abs = Math.abs(aug[j * 2*n + i]);
            if (abs > max) {
                max = abs;
                maxRow = j;
            }
        }
        
        if (max === 0) return null; // Matrix is singular
        
        // Swap rows if necessary
        if (maxRow !== i) {
            for (let j = 0; j < 2*n; j++) {
                const temp = aug[i * 2*n + j];
                aug[i * 2*n + j] = aug[maxRow * 2*n + j];
                aug[maxRow * 2*n + j] = temp;
            }
        }
        
        // Scale row
        const pivot = aug[i * 2*n + i];
        for (let j = 0; j < 2*n; j++) {
            aug[i * 2*n + j] /= pivot;
        }
        
        // Eliminate column
        for (let j = 0; j < n; j++) {
            if (j === i) continue;
            const factor = aug[j * 2*n + i];
            for (let k = 0; k < 2*n; k++) {
                aug[j * 2*n + k] -= factor * aug[i * 2*n + k];
            }
        }
    }
    
    // Extract inverse from augmented matrix
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            dst[i * n + j] = aug[i * 2*n + n + j];
        }
    }
    
    return dst;
}

/**
 * Matrix multiplication
 * @param {number[]} dst - Destination array
 * @param {number[]} m1 - First matrix
 * @param {number[]} m2 - Second matrix
 * @returns {number[]} Product matrix
 */
export function times(dst, m1, m2) {
    const n = Math.sqrt(m1.length);
    if (!dst) dst = new Array(m1.length);
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += m1[i * n + k] * m2[k * n + j];
            }
            dst[i * n + j] = sum;
        }
    }
    
    return dst;
}

/**
 * Check if two matrices are equal within tolerance
 * @param {number[]} m1 - First matrix
 * @param {number[]} m2 - Second matrix
 * @param {number} tol - Tolerance
 * @returns {boolean} True if matrices are equal
 */
export function equals(m1, m2, tol = 1e-8) {
    if (m1.length !== m2.length) return false;
    
    for (let i = 0; i < m1.length; i++) {
        if (Math.abs(m1[i] - m2[i]) > tol) return false;
        }
    
    return true;
}

/**
 * Check if a matrix is the identity matrix
 * @param {number[]} m - Matrix to check
 * @param {number} tol - Tolerance
 * @returns {boolean} True if matrix is identity
 */
export function isIdentityMatrix(m, tol = 1e-10) {
    const n = Math.sqrt(m.length);
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const expected = i === j ? 1 : 0;
            if (Math.abs(m[i * n + j] - expected) > tol) return false;
        }
    }
    
    return true;
}

/**
 * Copy a matrix
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source matrix
 * @returns {number[]} Copy of matrix
 */
export function copy(dst, src) {
    if (!dst) dst = new Array(src.length);
    for (let i = 0; i < src.length; i++) {
        dst[i] = src[i];
    }
    return dst;
}

/**
 * Compute the polar of a point or plane with respect to the given metric.
 * Mirrors Pn.polarize(polar, p, metric) in Java.
 * @param {number[]|null} polar - Destination array or null to create new
 * @param {number[]} p - Input point or plane
 * @param {number} metric - Metric constant (ELLIPTIC, EUCLIDEAN, HYPERBOLIC)
 * @returns {number[]} The polar
 */
export function polarize(polar, p, metric) {
    if (polar === null) {
        polar = [...p]; // Clone the array
    } else {
        // Copy p to polar
        for (let i = 0; i < p.length; i++) {
            polar[i] = p[i];
        }
    }
    
    // Last element is multiplied by the metric!
    switch (metric) {
        case ELLIPTIC:
            // self-polar!
            break;
        case EUCLIDEAN:
            polar[polar.length - 1] = 0.0;
            break;
        case HYPERBOLIC:
            polar[polar.length - 1] *= -1;
            break;
    }
    return polar;
}

/**
 * Compute the polar plane of a plane with respect to the given metric.
 * This just calls polarize since the polar plane of a plane is the same operation.
 * This is assuming a plane-based algebra. Dual euclidean space cannot be represented as a plane.
 * Mirrors Pn.polarizePlane(dst, plane, metric) in Java.
 * @param {number[]|null} dst - Destination array or null to create new
 * @param {number[]} plane - Input plane
 * @param {number} metric - Metric constant (ELLIPTIC, EUCLIDEAN, HYPERBOLIC)
 * @returns {number[]} The polar plane
 */
export function polarizePlane(dst, plane, metric) {
    return polarize(dst, plane, metric);
}

/**
 * Compute the polar plane of a point with respect to the given metric.
 *
 * Java semantics:
 * - If metric is EUCLIDEAN, the polar of any (finite) point is the **ideal plane**.
 * - Otherwise this is the same as {@link polarize}.
 *
 * Mirrors `Pn.polarizePoint(dst, point, metric)` in Java.
 *
 * @param {number[]|null} dst - Destination array or null to create new
 * @param {number[]} point - Input point
 * @param {number} metric - Metric constant (ELLIPTIC, EUCLIDEAN, HYPERBOLIC)
 * @returns {number[]} The polar plane
 */
export function polarizePoint(dst, point, metric) {
    if (metric === EUCLIDEAN) {
        // There is only one polar plane: the plane at infinity.
        if (dst == null) dst = new Array(point.length);
        for (let i = 0; i < dst.length - 1; i++) dst[i] = 0.0;
        dst[dst.length - 1] = -1.0;
        return dst;
    }
    return polarize(dst, point, metric);
}
 