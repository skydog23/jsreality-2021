import * as Pn from './Pn';
import * as Rn from './Rn';

/**
 * Static methods for geometry of real projective 3-space (RP3).
 * Includes methods for line coordinates, perspective transformations,
 * and 3D-specific isometries.
 */

// Constants for Plücker coordinates
const EPS = 1e-10;
const ZERO = new Array(6).fill(0);

/**
 * Convert two points to Plücker coordinates of the line through them
 * @param {number[]} dst - Destination array for line coordinates
 * @param {number[]} p1 - First point
 * @param {number[]} p2 - Second point
 * @returns {number[]} Plücker coordinates
 */
export function lineFromPoints(dst, p1, p2) {
    if (!dst) dst = new Array(6);
    
    // Plücker coordinates are the 2x2 minors of the matrix [p1 p2]
    dst[0] = p1[0]*p2[1] - p1[1]*p2[0];  // x1y2 - y1x2
    dst[1] = p1[0]*p2[2] - p1[2]*p2[0];  // x1z2 - z1x2
    dst[2] = p1[0]*p2[3] - p1[3]*p2[0];  // x1w2 - w1x2
    dst[3] = p1[1]*p2[2] - p1[2]*p2[1];  // y1z2 - z1y2
    dst[4] = p1[1]*p2[3] - p1[3]*p2[1];  // y1w2 - w1y2
    dst[5] = p1[2]*p2[3] - p1[3]*p2[2];  // z1w2 - w1z2
    
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
 * @param {number} fov - Field of view in radians
 * @param {number} aspect - Aspect ratio
 * @param {number} near - Near plane distance
 * @param {number} far - Far plane distance
 * @returns {number[]} Perspective matrix
 */
export function perspectiveMatrix(dst, fov, aspect, near, far) {
    if (!dst) dst = new Array(16).fill(0);
    
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    
    dst[0] = f / aspect;
    dst[5] = f;
    dst[10] = (far + near) * nf;
    dst[11] = -1;
    dst[14] = 2 * far * near * nf;
    
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
    
    const z = Rn.normalize(null, Rn.subtract(null, eye, center));
    const x = Rn.normalize(null, Rn.crossProduct(null, up, z));
    const y = Rn.crossProduct(null, z, x);
    
    dst[0] = x[0];  dst[4] = x[1];  dst[8] = x[2];  dst[12] = -Rn.innerProduct(x, eye);
    dst[1] = y[0];  dst[5] = y[1];  dst[9] = y[2];  dst[13] = -Rn.innerProduct(y, eye);
    dst[2] = z[0];  dst[6] = z[1];  dst[10] = z[2]; dst[14] = -Rn.innerProduct(z, eye);
    dst[3] = 0;     dst[7] = 0;     dst[11] = 0;    dst[15] = 1;
    
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
    const [x, y, z] = Rn.normalize(null, axis);
    
    dst[0] = t*x*x + c;    dst[4] = t*x*y - s*z;  dst[8] = t*x*z + s*y;  dst[12] = 0;
    dst[1] = t*x*y + s*z;  dst[5] = t*y*y + c;    dst[9] = t*y*z - s*x;  dst[13] = 0;
    dst[2] = t*x*z - s*y;  dst[6] = t*y*z + s*x;  dst[10] = t*z*z + c;   dst[14] = 0;
    dst[3] = 0;            dst[7] = 0;            dst[11] = 0;           dst[15] = 1;
    
    return dst;
}

export default {
    lineFromPoints,
    linesIntersect,
    perspectiveMatrix,
    lookAt,
    rotationMatrix
}; 