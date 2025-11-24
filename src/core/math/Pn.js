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
 * @typedef {number[]} Vec
 * @typedef {number[]} Matrix
 */

import { innerProduct as RnInnerProduct, normalize as RnNormalize } from './Rn.js';

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
        return Number.MAX_VALUE; // error: infinite distance
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

export function dehomogenize(dst, src)	{
    // assert dim checks
    const sl = src.length;
    if (!dst) dst = new double[src.length];
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
    if (p1[p1.length - 1] === 0 || p2[p2.length - 1] === 0) {
        return Infinity;
    }

    // For Euclidean metric, use direct calculation
    if (metric === EUCLIDEAN) {
        const p1d = dehomogenize(null, p1);
        const p2d = dehomogenize(null, p2);
        let sum = 0;
        for (let i = 0; i < p1d.length; i++) {
            const diff = p1d[i] - p2d[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    // For other metrics, use angle-based calculation
    const angle = angleBetween(p1, p2, metric);
    switch (metric) {
        case HYPERBOLIC:
            return acosh(Math.abs(cosh(angle)));
        case ELLIPTIC:
            return angle;
        default:
            return angle;
    }
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
    let sum = 0;
    
    for (let i = 0; i < n; i++) {
        sum += u[i] * v[i];
    }
    
    switch (metric) {
        case HYPERBOLIC:
            return sum - u[n] * v[n];
        case EUCLIDEAN:
            return sum;
        case ELLIPTIC:
            return sum + u[n] * v[n];
        default:
            return sum;
    }
}

/**
 * Calculate the inner product of two planes with respect to the given metric
 * @param {number[]} u - First plane
 * @param {number[]} v - Second plane
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number} The inner product
 */
export function innerProductPlanes(u, v, metric) {
    return innerProduct(u, v, -metric);
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
export function isValidCoordinate(v, metric) {
    const ns = normSquared(v, metric);
    return metric === EUCLIDEAN ? ns >= 0 : ns !== 0;
}

/**
 * Calculate bounds of a set of points
 * @param {number[][]} bounds - Output bounds array
 * @param {number[][]} points - Array of points
 * @returns {number[][]} The bounds array
 */
export function calculateBounds(bounds, points) {
    if (!bounds || bounds.length !== 2) {
        bounds = [[], []];
    }
    
    const dim = points[0].length - 1;
    for (let i = 0; i < dim; i++) {
        bounds[0][i] = Infinity;
        bounds[1][i] = -Infinity;
    }
    
    for (const point of points) {
        if (point[point.length - 1] === 0) continue;
        const p = dehomogenize(null, point);
        for (let i = 0; i < dim; i++) {
            bounds[0][i] = Math.min(bounds[0][i], p[i]);
            bounds[1][i] = Math.max(bounds[1][i], p[i]);
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
export function linearInterpolation(dst, p1, p2, t, metric) {
    if (!dst) dst = new Array(p1.length);
    
    const np1 = normalize(null, p1, metric);
    const np2 = normalize(null, p2, metric);
    
    if (metric === EUCLIDEAN) {
        const dp1 = dehomogenize(null, np1);
        const dp2 = dehomogenize(null, np2);
        for (let i = 0; i < dp1.length; i++) {
            dst[i] = (1-t) * dp1[i] + t * dp2[i];
        }
        dst[dst.length-1] = 1;
    } else {
        const angle = angleBetween(np1, np2, metric);
        if (angle === 0) {
            return setToLength(dst, np1, 1, metric);
        }
        
        const s1 = Math.sin((1-t) * angle);
        const s2 = Math.sin(t * angle);
        const sinA = Math.sin(angle);
        
        for (let i = 0; i < dst.length; i++) {
            dst[i] = (s1 * np1[i] + s2 * np2[i]) / sinA;
        }
    }
    
    return normalize(dst, dst, metric);
}

/**
 * Normalize a vector to unit length
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source vector
 * @param {number} metric - Metric type
 * @returns {number[]} The normalized vector
 */
export function normalize(dst, src, metric) {
    if (metric === EUCLIDEAN) {
        return dehomogenize(dst, src);
    }
    return setToLength(dst, src, 1.0, metric);
}

/**
 * Normalize a plane equation
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source plane equation
 * @param {number} metric - Metric type
 * @returns {number[]} The normalized plane equation
 */
export function normalizePlane(dst, src, metric) {
    if (metric === EUCLIDEAN) {
        if (!dst) dst = new Array(src.length);
        const n = src.length - 1;
        let norm = 0;
        for (let i = 0; i < n; i++) {
            norm += src[i] * src[i];
        }
        norm = Math.sqrt(norm);
        if (norm === 0) return null;
        
        const scale = 1.0 / norm;
        for (let i = 0; i < src.length; i++) {
            dst[i] = scale * src[i];
        }
        return dst;
    }
    return normalize(dst, src, metric);
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
 * Mirrors Pn.polarizePlane(dst, plane, metric) in Java.
 * @param {number[]|null} dst - Destination array or null to create new
 * @param {number[]} plane - Input plane
 * @param {number} metric - Metric constant (ELLIPTIC, EUCLIDEAN, HYPERBOLIC)
 * @returns {number[]} The polar plane
 */
export function polarizePlane(dst, plane, metric) {
    return polarize(dst, plane, metric);
}
 