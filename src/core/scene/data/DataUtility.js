/**
 * Utility functions for data array processing
 */

/**
 * Detect the "fiber length" (innermost dimension) of a nested array structure.
 * 
 * This is useful for detecting the dimension of coordinate data, color data,
 * normal vectors, etc., when stored as nested arrays.
 * 
 * Examples:
 *   - Flat array [1, 2, 3, 4, 5, 6] → returns null (can't determine)
 *   - 2D array [[1, 2, 3], [4, 5, 6]] → returns 3
 *   - 3D array [[[1, 2, 3], [4, 5, 6]], [[7, 8, 9], [10, 11, 12]]] → returns 3
 * 
 * @param {Array} arr - The array (flat or nested)
 * @returns {number|null} The fiber length (innermost dimension), or null if can't be determined
 * 
 * @example
 * // Vertex coordinates: 2 vertices in 3D
 * const vertices = [[1, 2, 3], [4, 5, 6]];
 * const dimension = DataUtility.detectFiberLength(vertices); // 3
 * 
 * @example
 * // Color data: 3 vertices with RGBA colors
 * const colors = [[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1]];
 * const colorDim = DataUtility.detectFiberLength(colors); // 4
 * 
 * @example
 * // Flat array - can't determine fiber length
 * const flat = [1, 2, 3, 4, 5, 6];
 * const dim = DataUtility.detectFiberLength(flat); // null (must be provided explicitly)
 */
export function detectFiberLength(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return null;
  }
  
  // Check if it's a flat array of numbers
  if (typeof arr[0] === 'number') {
    // Can't determine fiber length from flat array - caller must provide
    return null;
  }
  
  // It's nested - traverse to find innermost dimension
  let current = arr;
  while (Array.isArray(current) && current.length > 0 && Array.isArray(current[0])) {
    current = current[0];
  }
  
  // Now 'current' should be the innermost array
  if (Array.isArray(current)) {
    return current.length;
  }
  
  return null;
}

/**
 * Flatten a nested array to a 1D array.
 * 
 * Recursively flattens any level of nesting.
 * 
 * @param {Array} arr - The nested array to flatten
 * @returns {Array} Flattened 1D array
 * 
 * @example
 * const nested = [[1, 2, 3], [4, 5, 6]];
 * const flat = DataUtility.flattenArray(nested); // [1, 2, 3, 4, 5, 6]
 */
export function flattenArray(arr) {
  const result = [];
  
  function flatten(item) {
    if (Array.isArray(item)) {
      for (const element of item) {
        flatten(element);
      }
    } else {
      result.push(item);
    }
  }
  
  flatten(arr);
  return result;
}

/**
 * Get the total number of "fibers" (outermost count) in a nested array.
 * 
 * For coordinate data, this is the number of vertices.
 * For flat arrays with known fiber length, this is array.length / fiberLength.
 * 
 * @param {Array|TypedArray} arr - The array
 * @param {number|null} fiberLength - The fiber length (innermost dimension), or null to auto-detect
 * @returns {number|null} The number of fibers, or null if can't be determined
 * 
 * @example
 * const vertices = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
 * const count = DataUtility.getFiberCount(vertices); // 3
 * 
 * @example
 * const flat = [1, 2, 3, 4, 5, 6];
 * const count = DataUtility.getFiberCount(flat, 3); // 2
 */
export function getFiberCount(arr, fiberLength = null) {
  if (!arr || arr.length === 0) {
    return 0;
  }
  
  // If fiberLength provided, calculate directly
  if (fiberLength !== null) {
    return Math.floor(arr.length / fiberLength);
  }
  
  // Try to detect from structure
  if (Array.isArray(arr)) {
    // Check if it's a flat array
    if (typeof arr[0] === 'number') {
      // Can't determine without fiberLength
      return null;
    }
    
    // It's nested - count outermost dimension
    return arr.length;
  }
  
  // TypedArray or other - need fiberLength
  return null;
}

/**
 * Validate that an array has the expected structure for data storage.
 * 
 * Checks that:
 * - Array is not empty
 * - If nested, all "fibers" have the same length
 * - If flat with fiberLength, length is divisible by fiberLength
 * 
 * @param {Array|TypedArray} arr - The array to validate
 * @param {number|null} expectedFiberLength - Expected fiber length, or null to auto-detect
 * @returns {Object} Validation result: { valid: boolean, message: string, detectedFiberLength: number|null }
 * 
 * @example
 * const vertices = [[1, 2, 3], [4, 5, 6]];
 * const result = DataUtility.validateDataArray(vertices, 3);
 * // { valid: true, message: 'Valid', detectedFiberLength: 3 }
 * 
 * @example
 * const invalid = [[1, 2, 3], [4, 5]]; // Inconsistent fiber lengths
 * const result = DataUtility.validateDataArray(invalid, 3);
 * // { valid: false, message: 'Inconsistent fiber lengths...', detectedFiberLength: 3 }
 */
export function validateDataArray(arr, expectedFiberLength = null) {
  if (!arr || arr.length === 0) {
    return { valid: false, message: 'Array is null or empty', detectedFiberLength: null };
  }
  
  // Detect fiber length if not provided
  const detectedFiberLength = expectedFiberLength !== null 
    ? expectedFiberLength 
    : detectFiberLength(arr);
  
  if (detectedFiberLength === null) {
    return { 
      valid: false, 
      message: 'Cannot determine fiber length (flat array requires explicit fiberLength parameter)', 
      detectedFiberLength: null 
    };
  }
  
  // Check if it's a flat array
  if (Array.isArray(arr) && typeof arr[0] === 'number') {
    // Flat array - check divisibility
    if (arr.length % detectedFiberLength !== 0) {
      return {
        valid: false,
        message: `Array length ${arr.length} is not divisible by fiber length ${detectedFiberLength}`,
        detectedFiberLength
      };
    }
    return { valid: true, message: 'Valid', detectedFiberLength };
  }
  
  // Nested array - check all fibers have consistent length
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      const fiber = arr[i];
      if (!Array.isArray(fiber)) {
        return {
          valid: false,
          message: `Element at index ${i} is not an array`,
          detectedFiberLength
        };
      }
      
      // For nested arrays, check the innermost dimension
      const fiberLen = Array.isArray(fiber[0]) 
        ? detectFiberLength([fiber]) 
        : fiber.length;
      
      if (fiberLen !== detectedFiberLength) {
        return {
          valid: false,
          message: `Inconsistent fiber length at index ${i}: expected ${detectedFiberLength}, got ${fiberLen}`,
          detectedFiberLength
        };
      }
    }
  }
  
  return { valid: true, message: 'Valid', detectedFiberLength };
}

/**
 * DataUtility - Collection of utility functions for data array processing
 */
export const DataUtility = {
  detectFiberLength,
  flattenArray,
  getFiberCount,
  validateDataArray
};

export default DataUtility;

