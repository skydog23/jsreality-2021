import * as Pn from './Pn.js';
import { normalize, subtract, crossProduct, innerProduct, matrixTimesVector } from './Rn.js';

/**
 * Static methods for geometry of real projective 3-space (RP3).
 * Includes methods for line coordinates, perspective transformations,
 * and 3D-specific isometries.
 */

// Constants for Plücker coordinates
export const EPS = 1e-10;
export const ZERO = new Array(6).fill(0);

/**
 * Convert two points to Plücker coordinates of the line through them
 * @param {number[]} dst - Destination array for line coordinates
 * @param {number[]} p1 - First point
 * @param {number[]} p2 - Second point
 * @returns {number[]} Plücker coordinates
 */
export function lineFromPoints(dst, p1, p2) {
    if (!dst) dst = new Array(6);
    
    // Normalize points to have w=1
    const w1 = p1[3], w2 = p2[3];
    const x1 = p1[0]/w1, y1 = p1[1]/w1, z1 = p1[2]/w1;
    const x2 = p2[0]/w2, y2 = p2[1]/w2, z2 = p2[2]/w2;
    
    // Plücker coordinates are the 2x2 minors of the matrix [p1 p2]
    dst[0] = x1*y2 - y1*x2;  // xy component
    dst[1] = x1*z2 - z1*x2;  // xz component
    dst[2] = x1 - x2;        // xw component
    dst[3] = y1*z2 - z1*y2;  // yz component
    dst[4] = y1 - y2;        // yw component
    dst[5] = z1 - z2;        // zw component
    
    return dst;
}

/**
 * Test if two lines intersect
 * @param {number[]} l1 - Plücker coordinates of first line
 * @param {number[]} l2 - Plücker coordinates of second line
 * @returns {boolean} True if lines intersect
 */
export function linesIntersect(l1, l2) {
    // Lines intersect if their Plücker inner product is zero
    const product = l1[0]*l2[5] + l1[1]*l2[4] + l1[2]*l2[3] 
                 - l1[3]*l2[2] - l1[4]*l2[1] - l1[5]*l2[0];
    return Math.abs(product) < EPS;
}

/**
 * Create perspective projection matrix
 * @param {number[]} dst - Destination array for matrix
 * @param {number} near - Near plane distance
 * @param {number} far - Far plane distance
 * @param {number} fovy - Field of view in y-direction (radians)
 * @param {number} aspect - Aspect ratio (width/height)
 * @returns {number[]} Perspective matrix
 */
export function perspectiveMatrix(dst, near, far, fovy, aspect) {
    if (!dst) dst = new Array(16).fill(0);
    
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    
    dst[0] = f / aspect;  // Scale x by 1/aspect to account for window shape
    dst[5] = f;           // Scale y by 1/tan(fovy/2)
    dst[10] = (far + near) * nf;  // Map z to [-1,1]
    dst[11] = -1;         // Convert to homogeneous coordinates
    dst[14] = 2 * far * near * nf;  // Map z to [-1,1]
    dst[15] = 0;         // Convert to homogeneous coordinates
    
    return dst;
}

/**
 * Create view matrix from camera parameters
 * @param {number[]} dst - Destination array for matrix
 * @param {number[]} eye - Camera position
 * @param {number[]} center - Look-at point
 * @param {number[]} up - Up vector
 * @returns {number[]} View matrix
 */
export function lookAt(dst, eye, center, up) {
    if (!dst) dst = new Array(16);
    
    // Calculate camera coordinate system
    const forward = normalize(null, subtract(null, center, eye));
    const right = normalize(null, crossProduct(null, forward, up));
    const newUp = crossProduct(null, right, forward);
    
    // Build rotation matrix
    dst[0] = right[0];   dst[4] = right[1];   dst[8] = right[2];    dst[12] = 0;
    dst[1] = newUp[0];   dst[5] = newUp[1];   dst[9] = newUp[2];    dst[13] = 0;
    dst[2] = -forward[0]; dst[6] = -forward[1]; dst[10] = -forward[2]; dst[14] = 0;
    dst[3] = 0;          dst[7] = 0;          dst[11] = 0;          dst[15] = 1;
    
    // Translate by -eye
    const t = new Array(16).fill(0);
    t[0] = t[5] = t[10] = t[15] = 1;
    t[12] = -eye[0];
    t[13] = -eye[1];
    t[14] = -eye[2];
    
    // Combine rotation and translation
    const result = new Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) {
                sum += dst[i + k*4] * t[k + j*4];
            }
            result[i + j*4] = sum;
        }
    }
    
    // Copy result to destination
    for (let i = 0; i < 16; i++) {
        dst[i] = result[i];
    }
    
    return dst;
}

/**
 * Create rotation matrix around arbitrary axis
 * @param {number[]} dst - Destination array for matrix
 * @param {number[]} axis - Rotation axis
 * @param {number} angle - Rotation angle in radians
 * @returns {number[]} Rotation matrix
 */
export function rotationMatrix(dst, axis, angle) {
    if (!dst) dst = new Array(16).fill(0);
    
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    const [x, y, z] = normalize(null, axis);
    
    // Build 3x3 rotation matrix using Rodrigues' rotation formula
    dst[0] = t*x*x + c;    dst[4] = t*x*y - s*z;  dst[8] = t*x*z + s*y;  dst[12] = 0;
    dst[1] = t*x*y + s*z;  dst[5] = t*y*y + c;    dst[9] = t*y*z - s*x;  dst[13] = 0;
    dst[2] = t*x*z - s*y;  dst[6] = t*y*z + s*x;  dst[10] = t*z*z + c;   dst[14] = 0;
    dst[3] = 0;            dst[7] = 0;            dst[11] = 0;           dst[15] = 1;
    
    return dst;
}

/**
 * Find the perpendicular bisector plane between two points
 * @param {number[]} dst - Destination array for result
 * @param {number[]} p1 - First point
 * @param {number[]} p2 - Second point
 * @param {number} metric - One of HYPERBOLIC (-1), EUCLIDEAN (0), ELLIPTIC (1)
 * @returns {number[]} The perpendicular bisector plane
 */
export function perpendicularBisector(dst, p1, p2, metric) {
    if (!dst) dst = new Array(4); // 3D homogeneous coordinates
    
    // First normalize both points
    const np1 = normalize(null, p1, metric);
    const np2 = normalize(null, p2, metric);
    
    // For Euclidean case, we need special handling
    if (metric === Pn.EUCLIDEAN) {
        // Dehomogenize both points
        const dp1 = Pn.dehomogenize(null, np1);
        const dp2 = Pn.dehomogenize(null, np2);
        
        // Find midpoint
        const mid = new Array(3);
        for (let i = 0; i < 3; i++) {
            mid[i] = (dp1[i] + dp2[i]) / 2;
        }
        
        // Direction vector from p1 to p2
        const dir = new Array(3);
        for (let i = 0; i < 3; i++) {
            dir[i] = dp2[i] - dp1[i];
        }
        
        // Create plane equation: dot(x-mid, dir) = 0
        // This expands to: dir·x - dir·mid = 0
        for (let i = 0; i < 3; i++) {
            dst[i] = dir[i];
        }
        dst[3] = -innerProduct(dir, mid);
        return dst;
    }
    
    // For non-Euclidean cases, we can use linear interpolation
    return Pn.linearInterpolation(dst, np1, np2, 0.5, metric);
}

/**
 * Create a plane from three points
 * @param {number[]} dst - Destination array for plane coefficients
 * @param {number[]} p1 - First point
 * @param {number[]} p2 - Second point
 * @param {number[]} p3 - Third point
 * @returns {number[]} Plane coefficients [A,B,C,D] where Ax + By + Cz + D = 0
 */
export function planeFromPoints(dst, p1, p2, p3) {
    if (!dst) dst = new Array(4);
    
    // Convert to affine coordinates
    const w1 = p1[3], w2 = p2[3], w3 = p3[3];
    const x1 = p1[0]/w1, y1 = p1[1]/w1, z1 = p1[2]/w1;
    const x2 = p2[0]/w2, y2 = p2[1]/w2, z2 = p2[2]/w2;
    const x3 = p3[0]/w3, y3 = p3[1]/w3, z3 = p3[2]/w3;
    
    // Calculate two vectors in the plane
    const v1 = [x2-x1, y2-y1, z2-z1];
    const v2 = [x3-x1, y3-y1, z3-z1];
    
    // Normal is cross product of vectors
    const normal = crossProduct(null, v1, v2);
    
    // Plane equation: normal·(x-p1) = 0
    // Expands to: normal·x - normal·p1 = 0
    dst[0] = normal[0];
    dst[1] = normal[1];
    dst[2] = normal[2];
    dst[3] = -(normal[0]*x1 + normal[1]*y1 + normal[2]*z1);
    
    return dst;
}

/**
 * Create a plane parallel to a direction vector passing through a point
 * @param {number[]} dst - Destination array for plane coefficients
 * @param {number[]} direction - Direction vector
 * @param {number[]} point - Point the plane should pass through
 * @returns {number[]} Plane coefficients
 */
export function planeParallelToPassingThrough(dst, direction, point) {
    if (!dst) dst = new Array(4);
    
    // Normalize direction vector
    const dir = normalize(null, direction);
    
    // Plane normal is perpendicular to direction
    // For 3D, we can use cross product with any non-parallel vector
    // Choose (1,0,0) or (0,1,0) depending on direction
    const temp = Math.abs(dir[0]) > Math.abs(dir[1]) ? [0,1,0] : [1,0,0];
    const normal = normalize(null, crossProduct(null, dir, temp));
    
    // Create plane equation: normal·(x-point) = 0
    dst[0] = normal[0];
    dst[1] = normal[1];
    dst[2] = normal[2];
    dst[3] = -innerProduct(normal, Pn.dehomogenize(null, point));
    
    return dst;
}

/**
 * Extract orientation matrix that fixes a given point
 * @param {number[]} dst - Destination array for matrix
 * @param {number[]} src - Source matrix
 * @param {number[]} point - Point to fix
 * @param {number} metric - Metric type
 * @returns {number[]} Orientation matrix
 */
export function extractOrientationMatrix(dst, src, point, metric) {
    if (!dst) dst = new Array(16);
    
    const image = matrixTimesVector(null, src, point);
    const translate = makeTranslationMatrix(null, image, metric);
    const invTranslate = Pn.inverse(null, translate);
    
    return Pn.times(dst, invTranslate, src);
}

/**
 * Create a translation matrix
 * @param {number[]} dst - Destination array for matrix
 * @param {number[]} translation - Translation vector
 * @param {number} metric - Metric type
 * @returns {number[]} Translation matrix
 */
export function makeTranslationMatrix(dst, translation, metric) {
    if (!dst) dst = new Array(16).fill(0);
    
    // Start with identity matrix
    dst[0] = dst[5] = dst[10] = dst[15] = 1;
    
    // Add translation components
    if (metric === Pn.EUCLIDEAN) {
        const t = Pn.dehomogenize(null, translation);
        dst[12] = t[0];
        dst[13] = t[1];
        dst[14] = t[2];
    } else {
        // For non-Euclidean metrics, use homogeneous coordinates directly
        dst[12] = translation[0];
        dst[13] = translation[1];
        dst[14] = translation[2];
        dst[15] = translation[3];
    }
    
    return dst;
}

/**
 * Get transformed absolute quadric
 * @param {number[]} m - Transformation matrix
 * @param {number} metric - Metric type
 * @returns {number[]} Transformed quadric
 */
export function getTransformedAbsolute(m, metric) {
    const dst = new Array(4);
    
    // For Euclidean metric
    if (metric === Pn.EUCLIDEAN) {
        dst[0] = dst[1] = dst[2] = 0;
        dst[3] = m[15];
        return dst;
    }
    
    // For other metrics
    const sign = metric === Pn.HYPERBOLIC ? -1 : 1;
    for (let i = 0; i < 3; i++) {
        dst[i] = m[i + 12];
    }
    dst[3] = sign * m[15];
    
    return dst;
} 