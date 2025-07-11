/**
 * JavaScript port of jReality's Rn class.
 * Static methods for n-dimensional real vector space.
 */

// Constants
export const TOLERANCE = 1e-10;

/**
 * Matrix multiplication
 * @param {number[]} dst - Destination array
 * @param {number[]} matrix - Input matrix
 * @param {number[]} vector - Input vector
 * @returns {number[]} Result vector
 */
export function matrixTimesVector(dst, matrix, vector) {
    if (!dst) dst = new Array(vector.length);
    const n = vector.length;
    
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            sum += matrix[i * n + j] * vector[j];
        }
        dst[i] = sum;
    }
    
    return dst;
}

/**
 * Vector subtraction
 * @param {number[]} dst - Destination array
 * @param {number[]} v1 - First vector
 * @param {number[]} v2 - Second vector
 * @returns {number[]} Difference vector
 */
export function subtract(dst, v1, v2) {
    if (!dst) dst = new Array(v1.length);
    
    for (let i = 0; i < v1.length; i++) {
        dst[i] = v1[i] - v2[i];
    }
    
    return dst;
}

/**
 * Vector normalization
 * @param {number[]} dst - Destination array
 * @param {number[]} src - Source vector
 * @returns {number[]} Normalized vector
 */
export function normalize(dst, src) {
    if (!dst) dst = new Array(src.length);
    
    let norm = 0;
    for (let i = 0; i < src.length; i++) {
        norm += src[i] * src[i];
    }
    norm = Math.sqrt(norm);
    
    if (norm === 0) {
        for (let i = 0; i < src.length; i++) {
            dst[i] = 0;
        }
        return dst;
    }
    
    const scale = 1.0 / norm;
    for (let i = 0; i < src.length; i++) {
        dst[i] = scale * src[i];
    }
    
    return dst;
}

/**
 * Cross product (3D only)
 * @param {number[]} dst - Destination array
 * @param {number[]} v1 - First vector
 * @param {number[]} v2 - Second vector
 * @returns {number[]} Cross product vector
 */
export function crossProduct(dst, v1, v2) {
    if (!dst) dst = new Array(3);
    
    dst[0] = v1[1] * v2[2] - v1[2] * v2[1];
    dst[1] = v1[2] * v2[0] - v1[0] * v2[2];
    dst[2] = v1[0] * v2[1] - v1[1] * v2[0];
    
    return dst;
}

/**
 * Inner product (dot product)
 * @param {number[]} v1 - First vector
 * @param {number[]} v2 - Second vector
 * @returns {number} Inner product
 */
export function innerProduct(v1, v2) {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
        sum += v1[i] * v2[i];
    }
    return sum;
} 