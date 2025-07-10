/**
 * JavaScript port of jReality's Pn class.
 * Static methods for n-dimensional real projective space RP^n.
 * Points and vectors are represented in homogeneous coordinates by arrays of length n+1.
 */

import { Rn } from './Rn.js';

// Metric constants
const ELLIPTIC = 1;
const EUCLIDEAN = 0;
const HYPERBOLIC = -1;
const PROJECTIVE = 2;

// Standard direction vectors
const zDirectionP3 = [0.0, 0.0, 1.0, 0.0];

/**
 * Hyperbolic trigonometric functions
 */
function cosh(x) {
    return 0.5 * (Math.exp(x) + Math.exp(-x));
}

function sinh(x) {
    return 0.5 * (Math.exp(x) - Math.exp(-x));
}

function tanh(x) {
    return sinh(x) / cosh(x);
}

function acosh(x) {
    return Math.log((x > 0 ? x : -x) + Math.sqrt(x * x - 1));
}

function asinh(x) {
    return Math.log(x + Math.sqrt(x * x + 1));
}

function atanh(x) {
    return 0.5 * Math.log((1 + x) / (1 - x));
}

/**
 * Calculate the angle between two points with respect to the given metric
 * @param {number[]} u - First point in homogeneous coordinates
 * @param {number[]} v - Second point in homogeneous coordinates
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number} The angle between the points
 */
function angleBetween(u, v, metric) {
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
function dehomogenize(dst, src) {
    const sl = src.length;
    const dl = sl - 1; // Output has one less dimension
    if (!dst) dst = new Array(dl);
    
    if (dst.length !== dl) {
        throw new Error('Invalid dimensions');
    }
    
    const last = src[sl - 1];
    if (last === 0.0) {
        for (let i = 0; i < dl; i++) {
            dst[i] = src[i] === 0 ? 0 : Infinity * Math.sign(src[i]);
        }
        return dst;
    }
    
    const factor = 1.0 / last;
    for (let i = 0; i < dl; i++) {
        dst[i] = factor * src[i];
    }
    
    return dst;
}

/**
 * Homogenize a point or vector
 * @param {number[]} dst - Destination array (can be null)
 * @param {number[]} src - Source array
 * @returns {number[]} The homogenized coordinates
 */
function homogenize(dst, src) {
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
function distanceBetween(p1, p2, metric) {
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
function innerProduct(u, v, metric) {
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
function innerProductPlanes(u, v, metric) {
    return innerProduct(u, v, -metric);
}

/**
 * Find the perpendicular bisector plane between two points
 * @param {number[]} dst - Destination array for result
 * @param {number[]} p1 - First point
 * @param {number[]} p2 - Second point
 * @param {number} metric - One of HYPERBOLIC (-1), EUCLIDEAN (0), ELLIPTIC (1)
 * @returns {number[]} The perpendicular bisector plane
 */
function perpendicularBisector(dst, p1, p2, metric) {
    if (!dst) dst = new Array(p1.length);
    
    // First normalize both points
    const np1 = normalize(null, p1, metric);
    const np2 = normalize(null, p2, metric);
    
    // For Euclidean case, we need special handling
    if (metric === EUCLIDEAN) {
        // Dehomogenize both points
        const dp1 = dehomogenize(null, np1);
        const dp2 = dehomogenize(null, np2);
        
        // Find midpoint
        const mid = new Array(dp1.length);
        for (let i = 0; i < dp1.length; i++) {
            mid[i] = (dp1[i] + dp2[i]) / 2;
        }
        
        // Direction vector from p1 to p2
        const dir = new Array(dp1.length);
        for (let i = 0; i < dp1.length; i++) {
            dir[i] = dp2[i] - dp1[i];
        }
        
        // Create plane equation: dot(x-mid, dir) = 0
        // This expands to: dir·x - dir·mid = 0
        for (let i = 0; i < dp1.length; i++) {
            dst[i] = dir[i];
        }
        dst[dst.length-1] = -Rn.innerProduct(dir, mid);
        return dst;
    }
    
    // For non-Euclidean cases, we can use linear interpolation
    return linearInterpolation(dst, np1, np2, 0.5, metric);
}

/**
 * Find the intersection point of multiple lines
 * @param {number[]} dst - Destination array for result
 * @param {number[][]} lines - Array of lines
 * @returns {number[]} The intersection point
 */
function pointFromLines(dst, lines) {
    if (!dst) dst = new Array(lines[0].length);
    if (lines.length < 2) throw new Error('Need at least 2 lines to find intersection');
    
    // For 2 lines, use cross product
    if (lines.length === 2) {
        // For 3D homogeneous coordinates
        if (lines[0].length === 4) {
            const [a1, a2, a3, a4] = lines[0];
            const [b1, b2, b3, b4] = lines[1];
            
            dst[0] = a2*b3 - a3*b2;
            dst[1] = a3*b1 - a1*b3;
            dst[2] = a1*b2 - a2*b1;
            dst[3] = a4*b4;
            
            return normalize(dst, dst, EUCLIDEAN);
        }
    }
    
    // For more lines, use least squares method
    const n = lines.length;
    const dim = lines[0].length;
    
    // Build the normal equations matrix
    const A = new Array(dim * dim).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < dim; j++) {
            for (let k = 0; k < dim; k++) {
                A[j*dim + k] += lines[i][j] * lines[i][k];
            }
        }
    }
    
    // Find eigenvector corresponding to smallest eigenvalue
    // This is a simplified approach - for more robust results,
    // should use proper eigenvalue decomposition
    const v = new Array(dim).fill(1);
    for (let iter = 0; iter < 10; iter++) {
        const next = matrixTimesVector(null, A, v);
        const norm = Math.sqrt(Rn.innerProduct(next, next));
        for (let i = 0; i < dim; i++) v[i] = next[i] / norm;
    }
    
    return normalize(dst, v, EUCLIDEAN);
}

/**
 * Find the line through two points
 * @param {number[]} dst - Destination array for result
 * @param {number[]} p1 - First point
 * @param {number[]} p2 - Second point
 * @returns {number[]} The line through the points
 */
function lineFromPoints(dst, p1, p2) {
    if (!dst) dst = new Array(p1.length);
    
    // For 3D homogeneous coordinates, use cross product
    if (p1.length === 4) {
        const [x1, y1, z1, w1] = p1;
        const [x2, y2, z2, w2] = p2;
        
        dst[0] = y1*z2 - z1*y2;
        dst[1] = z1*x2 - x1*z2;
        dst[2] = x1*y2 - y1*x2;
        dst[3] = w1*w2;
        
        return normalize(dst, dst, EUCLIDEAN);
    }
    
    // For other dimensions, return direction vector
    for (let i = 0; i < dst.length; i++) {
        dst[i] = p2[i] * p1[p1.length-1] - p1[i] * p2[p2.length-1];
    }
    
    return normalize(dst, dst, EUCLIDEAN);
}

/**
 * Normalize a vector with respect to the given metric
 * @param {number[]} dst - Destination array (can be null)
 * @param {number[]} src - Source vector
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number[]} The normalized vector
 */
function normalize(dst, src, metric) {
    const norm = Math.sqrt(Math.abs(innerProduct(src, src, metric)));
    if (norm === 0) return Rn.times(dst, 0, src);
    return Rn.times(dst, 1/norm, src);
}

// Helper functions
function add(dst, src1, src2) {
    return Rn.add(dst, src1, src2);
}

function subtract(dst, src1, src2) {
    return Rn.subtract(dst, src1, src2);
}

/**
 * Calculate the squared norm of a vector with respect to the given metric
 * @param {number[]} src - Source vector
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number} The squared norm
 */
function normSquared(src, metric) {
    return innerProduct(src, src, metric);
}

/**
 * Set a vector to a specific length with respect to the given metric
 * @param {number[]} dst - Destination array (can be null)
 * @param {number[]} src - Source vector
 * @param {number} length - Desired length
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number[]} The scaled vector
 */
function setToLength(dst, src, length, metric) {
    if (!dst) dst = new Array(src.length);
    
    const currentNorm = Math.sqrt(Math.abs(normSquared(src, metric)));
    if (currentNorm === 0) {
        throw new Error('Cannot set length of zero vector');
    }
    
    const factor = length / currentNorm;
    return Rn.times(dst, factor, src);
}

/**
 * Check if a coordinate is valid for the given metric
 * @param {number[]} v - The coordinate vector to check
 * @param {number} metric - One of HYPERBOLIC (-1), EUCLIDEAN (0), ELLIPTIC (1)
 * @returns {boolean} True if the coordinate is valid
 * @throws {Error} If metric is invalid
 */
function isValidCoordinate(v, metric) {
    // Check for valid metric values (-1, 0, 1)
    if (metric !== HYPERBOLIC && metric !== EUCLIDEAN && metric !== ELLIPTIC) {
        throw new Error('Invalid metric');
    }
    
    if (!v) return false;
    
    switch (metric) {
        case EUCLIDEAN:
            // Check if not zero vector
            return v.some(x => x !== 0);
            
        case HYPERBOLIC:
            // Check if last coordinate is positive and point lies in upper sheet
            const lastIdx = v.length - 1;
            if (v[lastIdx] <= 0) return false;
            let sum = 0;
            for (let i = 0; i < lastIdx; i++) {
                sum += v[i] * v[i];
            }
            return sum <= v[lastIdx] * v[lastIdx];
            
        case ELLIPTIC:
            // Check if not zero vector
            return v.some(x => x !== 0);
    }
}

/**
 * Calculate bounds of a list of points in projective space
 * Like Rn.calculateBounds but dehomogenizes points before computing bounds
 * @param {number[][]} bounds - Array of two arrays for min and max bounds
 * @param {number[][]} points - Array of points in homogeneous coordinates
 * @returns {number[][]} The bounds array
 */
function calculateBounds(bounds, points) {
    if (!points || points.length === 0) {
        throw new Error('No points provided');
    }

    const vl = points[0].length; // vector length (with homogeneous coordinate)
    const dl = vl - 1; // dimension of dehomogenized points
    
    if (!bounds) {
        bounds = [new Array(dl), new Array(dl)];
    }
    
    // Initialize bounds
    for (let i = 0; i < dl; i++) {
        bounds[0][i] = Number.MAX_VALUE;    // min bounds
        bounds[1][i] = -Number.MAX_VALUE;   // max bounds
    }
    
    const tmp = new Array(dl);
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        if (point[vl-1] === 0) continue; // Skip points at infinity
        
        dehomogenize(tmp, point);
        
        // Update bounds
        for (let j = 0; j < dl; j++) {
            bounds[0][j] = Math.min(bounds[0][j], tmp[j]); // min
            bounds[1][j] = Math.max(bounds[1][j], tmp[j]); // max
        }
    }
    
    return bounds;
}

/**
 * Calculate the centroid of points with respect to the given metric
 * @param {number[]} dst - Destination array (can be null)
 * @param {number[][]} points - Array of points
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number[]} The centroid point
 */
function centroid(dst, points, metric) {
    if (!points || points.length === 0) {
        throw new Error('No points provided');
    }
    
    const dim = points[0].length;
    if (!dst) dst = new Array(dim).fill(0);
    const tmp = new Array(dim);
    const dehom = new Array(dim - 1);
    
    // Initialize result to zero
    for (let i = 0; i < dim - 1; i++) {
        dst[i] = 0;
    }
    dst[dim - 1] = 1; // Set homogeneous coordinate to 1
    
    // Sum points
    for (let i = 0; i < points.length; i++) {
        // Dehomogenize point
        dehomogenize(dehom, points[i]);
        
        // Add to sum
        for (let j = 0; j < dim - 1; j++) {
            dst[j] += dehom[j];
        }
    }
    
    // Average
    const scale = 1.0 / points.length;
    for (let i = 0; i < dim - 1; i++) {
        dst[i] *= scale;
    }
    
    // Normalize result according to metric
    return normalize(dst, dst, metric);
}

/**
 * Linear interpolation between two points with respect to the given metric
 * @param {number[]} dst - Destination array (can be null)
 * @param {number[]} p1 - First point
 * @param {number[]} p2 - Second point
 * @param {number} t - Interpolation parameter (0 to 1)
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number[]} The interpolated point
 */
function linearInterpolation(dst, p1, p2, t, metric) {
    if (metric !== EUCLIDEAN && metric !== HYPERBOLIC && metric !== ELLIPTIC) {
        throw new Error('Unsupported metric');
    }

    if (!dst) dst = new Array(p1.length);
    
    // Handle edge cases
    if (t <= 0) {
        for (let i = 0; i < p1.length; i++) dst[i] = p1[i];
        return dst;
    }
    if (t >= 1) {
        for (let i = 0; i < p2.length; i++) dst[i] = p2[i];
        return dst;
    }
    
    // Normalize input points
    const np1 = new Array(p1.length);
    const np2 = new Array(p2.length);
    normalize(np1, p1, metric);
    normalize(np2, p2, metric);
    
    const s = 1 - t;
    switch (metric) {
        case EUCLIDEAN: {
            // Simple linear interpolation in Euclidean space
            for (let i = 0; i < p1.length; i++) {
                dst[i] = s * np1[i] + t * np2[i];
            }
            break;
        }
        
        case HYPERBOLIC: {
            // Use hyperbolic trigonometry for interpolation
            const d = distanceBetween(np1, np2, metric);
            if (d < Rn.TOLERANCE) {
                for (let i = 0; i < p1.length; i++) dst[i] = np1[i];
                return dst;
            }
            
            const sh = sinh(d);
            const f1 = sinh(s * d) / sh;
            const f2 = sinh(t * d) / sh;
            
            for (let i = 0; i < p1.length; i++) {
                dst[i] = f1 * np1[i] + f2 * np2[i];
            }
            break;
        }
        
        case ELLIPTIC: {
            // Use spherical trigonometry for interpolation
            const d = distanceBetween(np1, np2, metric);
            if (d < Rn.TOLERANCE) {
                for (let i = 0; i < p1.length; i++) dst[i] = np1[i];
                return dst;
            }
            
            const sd = Math.sin(d);
            if (Math.abs(sd) < Rn.TOLERANCE) {
                for (let i = 0; i < p1.length; i++) dst[i] = np1[i];
                return dst;
            }
            
            const f1 = Math.sin(s * d) / sd;
            const f2 = Math.sin(t * d) / sd;
            
            for (let i = 0; i < p1.length; i++) {
                dst[i] = f1 * np1[i] + f2 * np2[i];
            }
            break;
        }
    }
    
    return normalize(dst, dst, metric);
}

/**
 * Multiply a matrix by a vector
 * @param {number[]} dst - Destination array for result
 * @param {number[][]} matrix - Input matrix
 * @param {number[]} vector - Input vector
 * @returns {number[]} The result vector
 */
function matrixTimesVector(dst, matrix, vector) {
    if (!dst) dst = new Array(matrix.length);
    
    for (let i = 0; i < matrix.length; i++) {
        let sum = 0;
        for (let j = 0; j < vector.length; j++) {
            sum += matrix[i][j] * vector[j];
        }
        dst[i] = sum;
    }
    
    return dst;
}

/**
 * Multiply two matrices
 * @param {number[][]} dst - Destination matrix for result
 * @param {number[][]} m1 - First input matrix
 * @param {number[][]} m2 - Second input matrix
 * @returns {number[][]} The result matrix
 */
function matrixTimesMatrix(dst, m1, m2) {
    const rows = m1.length;
    const cols = m2[0].length;
    const n = m2.length; // number of elements to multiply
    
    if (!dst) {
        dst = new Array(rows);
        for (let i = 0; i < rows; i++) {
            dst[i] = new Array(cols);
        }
    }
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += m1[i][k] * m2[k][j];
            }
            dst[i][j] = sum;
        }
    }
    
    return dst;
}

/**
 * Transpose a matrix
 * @param {number[][]} dst - Destination matrix for result
 * @param {number[][]} src - Source matrix to transpose
 * @returns {number[][]} The transposed matrix
 */
function transpose(dst, src) {
    const rows = src.length;
    const cols = src[0].length;
    
    if (!dst) {
        dst = new Array(cols);
        for (let i = 0; i < cols; i++) {
            dst[i] = new Array(rows);
        }
    }
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            dst[j][i] = src[i][j];
        }
    }
    
    return dst;
}

/**
 * Calculate the determinant of a matrix
 * @param {number[][]} matrix - Input matrix
 * @returns {number} The determinant value
 */
function determinant(matrix) {
    const n = matrix.length;
    
    // Handle special cases
    if (n === 1) return matrix[0][0];
    if (n === 2) {
        return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    }
    
    // For larger matrices, use cofactor expansion along first row
    let det = 0;
    const submatrix = new Array(n-1);
    for (let i = 0; i < n-1; i++) {
        submatrix[i] = new Array(n-1);
    }
    
    for (let j = 0; j < n; j++) {
        // Get cofactor
        for (let i = 1; i < n; i++) {
            for (let k = 0; k < n; k++) {
                if (k < j) submatrix[i-1][k] = matrix[i][k];
                else if (k > j) submatrix[i-1][k-1] = matrix[i][k];
            }
        }
        
        // Add to determinant
        const sign = (j % 2 === 0) ? 1 : -1;
        det += sign * matrix[0][j] * determinant(submatrix);
    }
    
    return det;
}

/**
 * Project a vector onto another vector respecting the given metric
 * @param {number[]} dst - Destination array for result
 * @param {number[]} master - Vector to project onto
 * @param {number[]} victim - Vector to project
 * @param {number} metric - One of HYPERBOLIC (-1), EUCLIDEAN (0), ELLIPTIC (1)
 * @returns {number[]} The projected vector
 */
function projectOnto(dst, master, victim, metric) {
    if (!dst) dst = new Array(master.length);
    if (master.length !== victim.length) {
        throw new Error('Vectors must have same dimension');
    }
    
    const factor = innerProductPlanes(master, victim, metric);
    const pp = innerProductPlanes(master, master, metric);
    
    if (pp !== 0) {
        for (let i = 0; i < master.length; i++) {
            dst[i] = (factor / pp) * master[i];
        }
    } else {
        // If pp is 0, return zero vector
        for (let i = 0; i < master.length; i++) {
            dst[i] = 0;
        }
    }
    
    return dst;
}

/**
 * Project a vector onto the orthogonal complement of another vector
 * @param {number[]} dst - Destination array for result
 * @param {number[]} master - Vector whose complement to project onto
 * @param {number[]} victim - Vector to project
 * @param {number} metric - One of HYPERBOLIC (-1), EUCLIDEAN (0), ELLIPTIC (1)
 * @returns {number[]} The projected vector
 */
function projectOntoComplement(dst, master, victim, metric) {
    if (!dst) dst = new Array(master.length);
    
    // First project onto master
    const projection = projectOnto(null, master, victim, metric);
    
    // Then subtract from original vector
    for (let i = 0; i < master.length; i++) {
        dst[i] = victim[i] - projection[i];
    }
    
    return dst;
}

/**
 * Calculate the point lying a distance length from p0 in the direction p1.
 * p1 is first converted into a tangent vector (by projection) and then dragged.
 * @param {number[]} dst - Destination array for result
 * @param {number[]} p0 - Starting point
 * @param {number[]} p1 - Direction point
 * @param {number} length - Distance to drag
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number[]} The dragged point
 */
function dragTowards(dst, p0, p1, length, metric) {
    if (!dst) dst = new Array(p0.length);
    const np0 = normalize(null, p0, metric);
    const np1 = normalize(null, p1, metric);

    if (metric === EUCLIDEAN) {
        const last = p0.length - 1;
        if (np1[last] === 1 && np0[last] === 1) {
            // Subtract to get direction vector
            const dir = subtract(null, np1, np0);
            const norm = Rn.euclideanNorm(dir);
            // Scale direction vector and add to starting point
            const scaledDir = Rn.times(null, length/norm, dir);
            return add(dst, np0, scaledDir);
        }
    }

    // For non-Euclidean metrics:
    // 1. Project p1 onto tangent space at p0
    const tangent = projectToTangentSpace(null, np0, p1, metric);
    // 2. Normalize the tangent vector
    normalize(tangent, tangent, metric);
    // 3. Scale the tangent vector by length
    const scaledTangent = setToLength(null, tangent, length, metric);
    // 4. Add to get final point
    return add(dst, np0, scaledTangent);
}

/**
 * Project a vector onto the tangent space at a point
 * @param {number[]} dst - Destination array for result
 * @param {number[]} point - Base point
 * @param {number[]} vector - Vector to project
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number[]} The projected vector
 */
function projectToTangentSpace(dst, point, vector, metric) {
    if (!dst) dst = new Array(point.length);
    
    if (metric === EUCLIDEAN) {
        // For Euclidean case, just ensure last coordinate is 0
        const result = vector.slice();
        result[result.length - 1] = 0;
        return result;
    }

    // For non-Euclidean case:
    // Project vector onto orthogonal complement of point
    const factor = innerProduct(point, vector, metric);
    const pp = innerProduct(point, point, metric);
    if (pp !== 0) {
        factor /= pp;
    }
    const scaled = Rn.times(null, factor, point);
    return subtract(dst, vector, scaled);
}

/**
 * Orthonormalize a matrix with respect to the given metric.
 * This ensures the matrix preserves the metric, making it a valid isometry.
 * @param {number[]} dst - Destination array for result (4x4 matrix)
 * @param {number[]} m - Input matrix (4x4)
 * @param {number} tolerance - Numerical tolerance for orthogonality
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number[]} The orthonormalized matrix
 */
function orthonormalizeMatrix(dst, m, tolerance, metric) {
    if (!dst) dst = new Array(16);
    if (!tolerance) tolerance = 1e-10;

    // For Euclidean case, normalize the first three columns
    if (metric === EUCLIDEAN) {
        // Copy the matrix
        const result = m.slice();
        
        // Normalize first three columns (ideal points)
        for (let i = 0; i < 3; i++) {
            // Extract column vector
            const v = [m[i], m[i + 4], m[i + 8]];
            // Normalize it
            const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
            if (norm > 0) {
                result[i] = v[0] / norm;
                result[i + 4] = v[1] / norm;
                result[i + 8] = v[2] / norm;
            }
            result[i + 12] = 0; // Translation part
        }
        
        // Copy to destination
        for (let i = 0; i < 16; i++) {
            dst[i] = result[i];
        }
        return dst;
    }

    // For non-Euclidean metrics:
    // Extract the four basis vectors (columns of the matrix)
    const basis = [
        [m[0], m[4], m[8], m[12]],
        [m[1], m[5], m[9], m[13]],
        [m[2], m[6], m[10], m[14]],
        [m[3], m[7], m[11], m[15]]
    ];

    // First orthogonalize using Gram-Schmidt process
    for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 4; j++) {
            // Project basis[j] onto complement of basis[i]
            projectOntoComplement(basis[j], basis[i], basis[j], metric);
        }
    }

    // Then normalize each vector
    for (let i = 0; i < 4; i++) {
        normalize(basis[i], basis[i], metric);
    }

    // Reconstruct the matrix from the orthonormalized basis
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            dst[j * 4 + i] = basis[i][j];
        }
    }

    return dst;
}

/**
 * Get absolute values of vector components
 * @param {number[]} dst - Destination array for result
 * @param {number[]} src - Source vector
 * @returns {number[]} Vector of absolute values
 */
export function abs(dst, src) {
    if (!dst) dst = new Array(src.length);
    for (let i = 0; i < src.length; i++) {
        dst[i] = Math.abs(src[i]);
    }
    return dst;
}

/**
 * Check if a vector is zero within tolerance
 * @param {number[]} vec - Vector to check
 * @param {number} [tol=1e-8] - Tolerance for comparison
 * @returns {boolean} True if vector is zero within tolerance
 */
export function isZero(vec, tol = 1e-8) {
    for (let d of vec) {
        if (Math.abs(d) > tol) return false;
    }
    return true;
}

/**
 * Calculate the manhattan norm (L1 norm) of a vector
 * @param {number[]} vec - Input vector
 * @returns {number} Manhattan norm
 */
export function manhattanNorm(vec) {
    let sum = 0;
    for (let d of vec) {
        sum += Math.abs(d);
    }
    return sum;
}

/**
 * Calculate the manhattan norm distance between two vectors
 * @param {number[]} u - First vector
 * @param {number[]} v - Second vector
 * @returns {number} Manhattan norm distance
 */
export function manhattanNormDistance(u, v) {
    const tmp = new Array(u.length);
    subtract(tmp, u, v);
    return manhattanNorm(tmp);
}

/**
 * Create a plane parallel to a direction vector passing through a point
 * @param {number[]} plane - Destination array for plane coefficients
 * @param {number[]} direction - Direction vector parallel to plane
 * @param {number[]} point - Point that plane passes through
 * @returns {number[]} Plane coefficients
 */
export function planeParallelToPassingThrough(plane, direction, point) {
    if (!plane) plane = new Array(4);
    // First 3 components are normal vector (same as direction)
    plane[0] = direction[0];
    plane[1] = direction[1];
    plane[2] = direction[2];
    // Last component is negative dot product with point
    plane[3] = -(direction[0]*point[0] + direction[1]*point[1] + direction[2]*point[2]);
    return plane;
}

/**
 * Convert between point and plane representations
 * For a point, sets last coordinate to 0 to make it a direction vector
 * For a plane, keeps first 3 coordinates as normal vector
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source point or plane
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number[]} Polarized vector
 */
export function polarizePlane(dst, src, metric) {
    if (!dst) dst = new Array(src.length);
    const n = src.length;
    
    // Copy all but last coordinate
    for (let i = 0; i < n-1; i++) {
        dst[i] = src[i];
    }
    
    // For points, set last coordinate to 0 to make it a direction
    if (metric === EUCLIDEAN) {
        dst[n-1] = 0;
    } else {
        // For non-Euclidean metrics, use metric-dependent polarization
        dst[n-1] = src[n-1];
        if (metric === HYPERBOLIC) {
            dst[n-1] = -dst[n-1];
        }
    }
    return dst;
}

/**
 * Complete a partial basis to a full basis
 * @param {number[][]} dst - Destination array for completed basis
 * @param {number[][]} partial - Partial basis vectors
 * @returns {number[][]} Completed orthogonal basis
 */
export function completeBasis(dst, partial) {
    const dim = partial[0].length;
    const size = partial.length;
    
    if (!dst || dst.length !== dim) {
        dst = Array(dim).fill().map(() => new Array(dim));
    }
    
    // Convert to inline format for easier manipulation
    const inline = new Array(dim * dim);
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < dim; j++) {
            inline[i * dim + j] = partial[i][j];
        }
    }
    
    // Fill remaining vectors with random values
    for (let i = size; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
            inline[i * dim + j] = Math.random();
        }
    }
    
    // Use Gram-Schmidt process to orthogonalize
    for (let i = size; i < dim; i++) {
        const newrow = dst[i];
        for (let j = 0; j < dim; j++) {
            newrow[j] = ((i + j) % 2 === 0 ? 1 : -1) * 
                determinant(submatrix(null, inline, i, j));
        }
        // Copy back to inline array
        for (let j = 0; j < dim; j++) {
            inline[i * dim + j] = newrow[j];
        }
    }
    
    // Copy result to destination array
    for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
            dst[i][j] = inline[i * dim + j];
        }
    }
    
    return dst;
}

/**
 * Create a permutation matrix that sends e(i) to e(perm[i])
 * @param {number[]} dst - Destination array for matrix
 * @param {number[]} perm - Permutation array
 * @returns {number[]} Permutation matrix
 */
export function permutationMatrix(dst, perm) {
    const n = perm.length;
    if (!dst) dst = new Array(n * n).fill(0);
    
    // Set 1's at permuted positions
    for (let i = 0; i < n; i++) {
        dst[i * n + perm[i]] = 1;
    }
    
    // Transpose to get correct mapping
    return transpose(dst, dst);
}

/**
 * Extract orientation matrix from a transformation matrix
 * @param {number[]} dst - Destination array for result
 * @param {number[]} src - Source transformation matrix
 * @param {number[]} point - Fixed point for orientation
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number[]} Orientation matrix
 */
export function extractOrientationMatrix(dst, src, point, metric) {
    if (!dst) dst = new Array(16);
    
    // Find where the point goes under the transformation
    const image = matrixTimesVector(null, src, point);
    
    // Create translation taking image back to original point
    const translate = makeTranslationMatrix(null, image, metric);
    
    // Compose: inverse(translate) * src gives orientation
    return times(dst, inverse(null, translate), src);
}

/**
 * Decompose matrix into rotation and scale parts using polar decomposition
 * M = Q*S where Q is orthogonal and S is symmetric
 * @param {number[]} q - Destination for orthogonal part
 * @param {number[]} s - Destination for symmetric part
 * @param {number[]} m - Input matrix to decompose
 * @returns {number[]} The input matrix m
 */
export function polarDecompose(q, s, m) {
    const n = mysqrt(m.length);
    if (!q) q = new Array(m.length);
    if (!s) s = new Array(m.length);
    
    // Start with Q = M
    const qq = [
        new Array(m.length),
        new Array(m.length)
    ];
    const qit = m.slice();
    qq[0] = m.slice();
    qq[1] = m.slice();
    
    const tol = 1e-12;
    let count = 0;
    let old = 0, nw = 1;
    
    // Iterate until convergence
    do {
        // Q = (Q + inverse(transpose(Q)))/2
        transpose(qit, inverse(qit, qq[old]));
        add(qq[nw], qq[old], qit);
        times(qq[nw], 0.5, qq[nw]);
        
        // Swap buffers
        nw = 1 - nw;
        old = 1 - old;
        count++;
    } while (count < 20 && !equals(qq[nw], qq[old], tol));
    
    // Copy result to output arrays
    copy(q, qq[nw]);
    transpose(qit, qq[nw]);
    times(s, qit, m);
    
    return m;
}

/**
 * Get absolute values of transformed coordinates
 * @param {number[]} m - Transformation matrix
 * @param {number} metric - One of HYPERBOLIC, EUCLIDEAN, ELLIPTIC
 * @returns {number[]} Array of absolute values
 */
export function getTransformedAbsolute(m, metric) {
    const n = mysqrt(m.length);
    const result = new Array(n * n);
    
    // For each basis vector
    for (let i = 0; i < n; i++) {
        const e = new Array(n).fill(0);
        e[i] = 1;
        
        // Transform it and get its length
        const transformed = matrixTimesVector(null, m, e);
        const len = Math.sqrt(Math.abs(innerProduct(transformed, transformed, metric)));
        
        // Store in result
        for (let j = 0; j < n; j++) {
            result[i * n + j] = len;
        }
    }
    
    return result;
}

// Export all functions and constants
export const Pn = {
    // Constants
    ELLIPTIC,
    EUCLIDEAN,
    HYPERBOLIC,
    PROJECTIVE,
    zDirectionP3,
    
    // Functions
    cosh,
    sinh,
    tanh,
    acosh,
    asinh,
    atanh,
    angleBetween,
    dehomogenize,
    homogenize,
    distanceBetween,
    innerProduct,
    innerProductPlanes,
    normalize,
    perpendicularBisector,
    pointFromLines,
    lineFromPoints,
    normSquared,
    setToLength,
    isValidCoordinate,
    calculateBounds,
    centroid,
    linearInterpolation,
    matrixTimesVector,
    matrixTimesMatrix,
    transpose,
    determinant,
    projectOnto,
    projectOntoComplement,
    dragTowards,
    projectToTangentSpace,
    orthonormalizeMatrix,
    abs,
    isZero,
    manhattanNorm,
    manhattanNormDistance,
    planeParallelToPassingThrough,
    polarizePlane,
    completeBasis,
    permutationMatrix
}; 