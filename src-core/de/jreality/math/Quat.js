/**
 * Quaternion operations for 4D vectors
 */

/**
 * Add two quaternions
 * @param {number[]} dst - Destination array for result
 * @param {number[]} a - First quaternion
 * @param {number[]} b - Second quaternion
 * @returns {number[]} Sum of quaternions
 */
export function add(dst, a, b) {
    if (!dst) dst = new Array(4);
    dst[0] = a[0] + b[0];
    dst[1] = a[1] + b[1];
    dst[2] = a[2] + b[2];
    dst[3] = a[3] + b[3];
    return dst;
}

/**
 * Subtract two quaternions
 * @param {number[]} dst - Destination array for result
 * @param {number[]} a - First quaternion
 * @param {number[]} b - Second quaternion
 * @returns {number[]} Difference of quaternions
 */
export function subtract(dst, a, b) {
    if (!dst) dst = new Array(4);
    dst[0] = a[0] - b[0];
    dst[1] = a[1] - b[1];
    dst[2] = a[2] - b[2];
    dst[3] = a[3] - b[3];
    return dst;
}

/**
 * Multiply two quaternions
 * @param {number[]} dst - Destination array for result
 * @param {number[]} a - First quaternion
 * @param {number[]} b - Second quaternion
 * @returns {number[]} Product of quaternions
 */
export function times(dst, a, b) {
    const tmp = [
        a[0]*b[0] - a[1]*b[1] - a[2]*b[2] - a[3]*b[3],
        a[0]*b[1] + a[1]*b[0] + a[2]*b[3] - a[3]*b[2],
        a[0]*b[2] - a[1]*b[3] + a[2]*b[0] + a[3]*b[1],
        a[0]*b[3] + a[1]*b[2] - a[2]*b[1] + a[3]*b[0]
    ];
    if (dst) {
        dst[0] = tmp[0];
        dst[1] = tmp[1];
        dst[2] = tmp[2];
        dst[3] = tmp[3];
        return dst;
    }
    return tmp;
}

/**
 * Scale a quaternion by a scalar
 * @param {number[]} dst - Destination array for result
 * @param {number} a - Scalar value
 * @param {number[]} b - Quaternion to scale
 * @returns {number[]} Scaled quaternion
 */
export function scale(dst, a, b) {
    const tmp = [a*b[0], a*b[1], a*b[2], a*b[3]];
    if (dst) {
        dst[0] = tmp[0];
        dst[1] = tmp[1];
        dst[2] = tmp[2];
        dst[3] = tmp[3];
        return dst;
    }
    return tmp;
}

/**
 * Invert a quaternion
 * @param {number[]} dst - Destination array for result
 * @param {number[]} a - Quaternion to invert
 * @returns {number[]} Inverted quaternion
 */
export function invert(dst, a) {
    if (!dst) dst = new Array(4);
    const ll = lengthSquared(a);
    if (ll === 0) {
        dst[0] = Infinity;
        dst[1] = 0;
        dst[2] = 0;
        dst[3] = 0;
    } else {
        dst[0] = a[0]/ll;
        dst[1] = -a[1]/ll;
        dst[2] = -a[2]/ll;
        dst[3] = -a[3]/ll;
    }
    return dst;
}

/**
 * Calculate squared length of quaternion
 * @param {number[]} a - Input quaternion
 * @returns {number} Squared length
 */
export function lengthSquared(a) {
    return a[0]*a[0] + a[1]*a[1] + a[2]*a[2] + a[3]*a[3];
}

/**
 * Calculate length of quaternion
 * @param {number[]} a - Input quaternion
 * @returns {number} Length
 */
export function length(a) {
    return Math.sqrt(lengthSquared(a));
}

/**
 * Get real part of quaternion
 * @param {number[]} a - Input quaternion
 * @returns {number} Real part
 */
export function re(a) {
    return a[0];
}

/**
 * Get imaginary part of quaternion
 * @param {number[]} a - Input quaternion
 * @returns {number[]} Imaginary part as 3D vector
 */
export function im(a) {
    return [a[1], a[2], a[3]];
}

export default {
    add,
    subtract,
    times,
    scale,
    invert,
    lengthSquared,
    length,
    re,
    im
}; 