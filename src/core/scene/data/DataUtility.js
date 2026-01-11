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
 * Utility functions for data array processing
 */

import { DataList } from './DataList.js';
import { RegularDataList } from './RegularDataList.js';
import { VariableDataList } from './VariableDataList.js';
import { Color } from '../../util/Color.js';

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
 * Convert various data formats to a DataList or VariableDataList.
 * 
 * Handles:
 * - DataList/VariableDataList (returns as-is)
 * - null/undefined (returns null)
 * - Flat arrays: [x0,y0,z0, x1,y1,z1, ...] (requires explicit fiberLength) → DataList
 * - 2D arrays with fixed row length: [[x0,y0,z0], [x1,y1,z1], ...] → DataList
 * - 2D arrays with variable row length: [[x0,y0], [x1,y1,x2], ...] → VariableDataList
 * - 3D arrays: [[[x0,y0], [x1,y1]], ...] (auto-detects fiberLength) → DataList
 * 
 * Automatically detects variable-length arrays (rows with different lengths) and returns VariableDataList.
 * For fixed-shape arrays, returns DataList.
 * 
 * @param {DataList|VariableDataList|number[]|number[][]|number[][][]|null|undefined} data - Input data
 * @param {number|null} [fiberLength=null] - Number of components per fiber (required for flat arrays)
 * @param {string} [dataType='float64'] - Data type for the resulting DataList/VariableDataList
 * @returns {DataList|VariableDataList|null} The DataList/VariableDataList, or null if input was null/undefined
 * 
 * @example
 * // Already a DataList
 * const list = new DataList([1,2,3,4,5,6], [2,3], 'float64');
 * const result = DataUtility.toDataList(list); // Returns list unchanged
 * 
 * @example
 * // 2D array with fixed row length - auto-detects fiberLength=3
 * const vertices = [[1,2,3], [4,5,6]];
 * const list = DataUtility.toDataList(vertices); // Creates DataList with shape [2,3]
 * 
 * @example
 * // 2D array with variable row length - returns VariableDataList
 * const polygons = [[0,1,2], [3,4,5,6], [7,8]];
 * const list = DataUtility.toDataList(polygons); // Creates VariableDataList
 * 
 * @example
 * // Flat array - requires explicit fiberLength
 * const flat = [1,2,3, 4,5,6];
 * const list = DataUtility.toDataList(flat, 3); // Creates DataList with shape [2,3]
 * 
 * @example
 * // 3D array - auto-detects innermost dimension
 * const nested = [[[1,2], [3,4]], [[5,6], [7,8]]];
 * const list = DataUtility.toDataList(nested); // Creates DataList with shape [4,2]
 */
export function toDataList(data, fiberLength = null, dataType = 'float64') {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return null;
  }
  
  // If it's already a DataList (RegularDataList or VariableDataList), return it
  if (data instanceof DataList) {
    return data;
  }
  
  // Must be an array
  if (!Array.isArray(data)) {
    throw new Error('Data must be a DataList (RegularDataList or VariableDataList), array, or nested array');
  }
  
  // Check if it's nested (2D or higher) or flat
  if (data.length === 0) {
    // Empty array - determine shape based on dataType
    if (dataType === 'string') {
      return new RegularDataList([], [0], 'string');
    }
    // Default to RegularDataList with shape [0, 0] for numeric arrays
    return new RegularDataList([], [0, 0], dataType);
  }
  
  const isNested = Array.isArray(data[0]);
  
  
  if (isNested) {
    // Check if it's a 2D array (not 3D+)
    // A 2D array has: data[0] is array, but data[0][0] is NOT an array (or doesn't exist)
    // Find first non-empty row to check depth
    let firstNonEmptyRow = null;
    for (let i = 0; i < data.length; i++) {
      if (Array.isArray(data[i]) && data[i].length > 0) {
        firstNonEmptyRow = data[i];
        break;
      }
    }
    
    const is2D = firstNonEmptyRow === null || 
                 typeof firstNonEmptyRow[0] !== 'object' || 
                 !Array.isArray(firstNonEmptyRow[0]);
    
    if (is2D) {
      // Check if rows have variable lengths
      // Find first row with a length to compare against
      let firstRowLength = null;
      for (let i = 0; i < data.length; i++) {
        if (Array.isArray(data[i])) {
          firstRowLength = data[i].length;
          break;
        }
      }
      
      if (firstRowLength !== null) {
        const hasVariableLength = data.some(row => {
          if (!Array.isArray(row)) return true; // Non-array row means variable
          return row.length !== firstRowLength;
        });
        
        if (hasVariableLength) {
          // Variable-length rows → VariableDataList
          return new VariableDataList(data, dataType);
        }
      }
      // Fixed-length rows (or all empty) → DataList (fall through to existing logic)
    }
    // 3D+ array - always fixed shape, use DataList (fall through)
  }
  
  // Special handling for Color object arrays:
  // Convert eagerly into a packed Float32Array of RGBA in [0,1] with shape [n,4].
  //
  // Rationale:
  // - Rendering (WebGL/WebGPU) wants float RGBA.
  // - Normalizing here prevents downstream code from needing to guess 0..255 vs 0..1,
  //   and avoids accidentally storing object arrays (Color instances) inside DataList.
  const isColorArray =
    !isNested &&
    data.length > 0 &&
    typeof data[0] === 'object' &&
    data[0] !== null &&
    ('r' in data[0] || data[0] instanceof Color);

  if (isColorArray) {
    const n = data.length;
    const channels = 4;
    const out = new Float32Array(n * channels);

    for (let i = 0; i < n; i++) {
      const c = data[i];

      // Default alpha to fully opaque.
      let r = 0, g = 0, b = 0, a = 1;

      if (c instanceof Color) {
        // Color stores 0..255 integers.
        r = c.r / 255;
        g = c.g / 255;
        b = c.b / 255;
        a = (c.a ?? 255) / 255;
      } else if (c && typeof c === 'object') {
        // Plain object with r,g,b,(a). Accept either 0..255 or already-normalized 0..1.
        const rr = Number(c.r ?? 0);
        const gg = Number(c.g ?? 0);
        const bb = Number(c.b ?? 0);
        const aa = Number(c.a ?? 1);
        const max = Math.max(rr, gg, bb, aa);
        if (max > 1.0) {
          r = rr / 255;
          g = gg / 255;
          b = bb / 255;
          a = aa / 255;
        } else {
          r = rr;
          g = gg;
          b = bb;
          a = aa;
        }
      }

      const o = i * channels;
      out[o + 0] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = a;
    }

    return new RegularDataList(out, [n, channels], 'float32');
  }
  
  // Special handling for string arrays: strings are atomic, so we preserve their natural shape
  const isStringArray = dataType === 'string' || 
    (data.length > 0 && typeof data[0] === 'string');
  
  if (isStringArray) {
    // For string arrays, determine shape from the nested structure
    if (isNested) {
      // Build shape from nested structure: [outermost, ..., innermost]
      const shape = [];
      let current = data;
      
      // Traverse nested arrays to determine dimensions
      while (Array.isArray(current) && current.length > 0) {
        shape.push(current.length);
        // Check if we've reached strings (atomic elements)
        if (typeof current[0] === 'string') {
          break; // Strings are atomic, stop here
        }
        current = current[0];
      }
      
      // Flatten for storage
      const flatData = flattenArray(data);
      return new RegularDataList(flatData, shape, 'string');
    } else {
      // Flat string array: shape is just [length]
      return new RegularDataList(data, [data.length], 'string');
    }
  }
  
  // Fixed-shape array → DataList (numeric arrays)
  // Flatten if needed
  const flatData = isNested ? flattenArray(data) : data;
  
  // Determine fiber length
  if (fiberLength === null) {
    if (isNested) {
      // Can detect from nested array structure (traverses to innermost dimension)
      fiberLength = detectFiberLength(data);
      if (fiberLength === null) {
        throw new Error('Cannot determine fiber length from array structure');
      }
    } else {
      // Flat array - cannot infer without explicit fiberLength
      throw new Error('Cannot infer fiber length from flat array. Please provide fiberLength parameter.');
    }
  }
  
  // Validate that data length is divisible by fiber length
  if (flatData.length % fiberLength !== 0) {
    throw new Error(`Data length ${flatData.length} is not divisible by fiber length ${fiberLength}`);
  }
  
  // Create RegularDataList
  const numFibers = flatData.length / fiberLength;
  // For numeric arrays, always use [numFibers, fiberLength] shape
  return new RegularDataList(flatData, [numFibers, fiberLength], dataType);
}

/**
 * Convert a DataList or VariableDataList back to a nested JavaScript array.
 * 
 * This is the inverse operation of `toDataList()`. 
 * - For a DataList with shape [n, m], returns a 2D array `number[][]` with fixed row lengths
 * - For a VariableDataList, returns a 2D array `number[][]` with variable row lengths
 * - For shape [n, m, p], returns a 3D array, etc.
 * 
 * @param {DataList|VariableDataList} dataList - The DataList/VariableDataList to convert
 * @returns {number[]|number[][]|number[][][]|...} Nested array representation
 * 
 * @example
 * // Convert DataList back to 2D array (fixed row length)
 * const dataList = toDataList([[1,2,3], [4,5,6]]);
 * const array = fromDataList(dataList); // Returns [[1,2,3], [4,5,6]]
 * 
 * @example
 * // Convert VariableDataList back to 2D array (variable row length)
 * const varList = toDataList([[0,1,2], [3,4,5,6], [7,8]]);
 * const array = fromDataList(varList); // Returns [[0,1,2], [3,4,5,6], [7,8]]
 * 
 * @example
 * // Handle null/undefined
 * const array = fromDataList(null); // Returns null
 */
export function fromDataList(dataList) {
  if (dataList === null || dataList === undefined) {
    return null;
  }
  
  if (dataList instanceof DataList) {
    // DataList (RegularDataList or VariableDataList) → nested array
    return dataList.toNestedArray();
  }
  
  throw new Error('Input must be a DataList (RegularDataList or VariableDataList), or null/undefined');
}

/**
 * DataUtility - Collection of utility functions for data array processing
 */
export const DataUtility = {
  detectFiberLength,
  flattenArray,
  getFiberCount,
  validateDataArray,
  getDataList: toDataList,
  fromDataList
};

export default DataUtility;

