/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript RegularDataList implementation for jReality
// Simplified multidimensional array storage using flat typed arrays

import { DataList } from './DataList.js';

/**
 * A multidimensional array stored as a flat typed array with computed access.
 * Supports arbitrary dimensions with stride-based indexing.
 * All rows have the same length (fixed shape).
 * 
 * @extends DataList
 */
export class RegularDataList extends DataList {
  
  /**
   * Create a new RegularDataList
   * @param {Array|TypedArray} data - The flat data array
   * @param {number|Array<number>} shape - Shape of the array (e.g., [rows, cols, 3] for mesh)
   * @param {string} dataType - Type of data: 'int32', 'float64', 'string', 'object'
   */
  constructor(data, shape, dataType = 'float64') {
    super(dataType); // Pass dataType to base class
    this.shape = Array.isArray(shape) ? shape : [shape];
    this.strides = this.#calculateStrides(this.shape);
    
    // Validate data size
    const expectedSize = this.shape.reduce((a, b) => a * b, 1);
    if (data.length !== expectedSize) {
      throw new Error(`Data size ${data.length} doesn't match shape ${this.shape} (expected ${expectedSize})`);
    }
    
    // Store data in appropriate typed array
    this.data = this._createTypedArray(data, dataType);
  }
  
  /**
   * Calculate strides for each dimension
   * @param {Array<number>} shape - Array shape
   * @returns {Array<number>} Stride for each dimension
   * @private
   */
  #calculateStrides(shape) {
    const strides = new Array(shape.length);
    strides[strides.length - 1] = 1;  // Last dimension stride is always 1
    
    for (let i = strides.length - 2; i >= 0; i--) {
      strides[i] = strides[i + 1] * shape[i + 1];
    }
    return strides;
  }
  
  /**
   * Calculate flat index from multidimensional indices
   * @param {Array<number>} indices - Multidimensional indices
   * @returns {number} Flat array index
   * @private
   */
  #flatIndex(indices) {
    if (indices.length > this.shape.length) {
      throw new Error(`Too many indices: expected ${this.shape.length}, got ${indices.length}`);
    }
    
    let offset = 0;
    for (let i = 0; i < indices.length; i++) {
      if (indices[i] < 0 || indices[i] >= this.shape[i]) {
        throw new Error(`Index ${indices[i]} out of bounds for dimension ${i} (size ${this.shape[i]})`);
      }
      offset += indices[i] * this.strides[i];
    }
    return offset;
  }
  
  /**
   * Get the total number of elements
   * @returns {number}
   */
  size() {
    return this.data.length;
  }
  
  /**
   * Get the number of items in the first dimension
   * @returns {number}
   */
  getLength() {
    return this.shape[0];
  }
  
  /**
   * Get the i-th item (sub-array/fiber) from the data list.
   * Matches Java's DataList.item(int i) behavior.
   * 
   * For shape [n, m, p]:
   *   - item(i) returns a 2D array of shape [m, p] (the i-th fiber)
   * For shape [n, m]:
   *   - item(i) returns an array of length m (the i-th row)
   * For shape [n]:
   *   - item(i) returns a single element
   * 
   * @param {number} index - Index of the item to retrieve
   * @returns {Array|*} Sub-array or single element
   */
  item(index) {
    if (index < 0 || index >= this.shape[0]) {
      throw new Error(`Index ${index} out of bounds for dimension 0 (size ${this.shape[0]})`);
    }
    
    // Use getSlice() logic to return the sub-array
    return this.getSlice(index);
  }
  
  /**
   * Get a single element at full multidimensional index.
   * Use this when you need a specific element, not a sub-array.
   * 
   * @param {...number} indices - Indices for each dimension
   * @returns {*} The value at the specified location
   */
  getElement(...indices) {
    if (indices.length !== this.shape.length) {
      throw new Error(`Expected ${this.shape.length} indices, got ${indices.length}`);
    }
    
    const flatIndex = this.#flatIndex(indices);
    return this.data[flatIndex];
  }
  
  /**
   * Set item at multidimensional index
   * @param {*} value - Value to set
   * @param {...number} indices - Indices for each dimension
   */
  setItem(value, ...indices) {
    if (indices.length !== this.shape.length) {
      throw new Error(`Expected ${this.shape.length} indices, got ${indices.length}`);
    }
    
    const flatIndex = this.#flatIndex(indices);
    this.data[flatIndex] = value;
  }
  
  /**
   * Get a slice (subset) of the array
   * @param {...number} indices - Partial indices (fewer than total dimensions)
   * @returns {Array|*} Sub-array or single value
   */
  getSlice(...indices) {
    if (indices.length === this.shape.length) {
      // Full indexing - return single element
      return this.getElement(...indices);
    }
    
    if (indices.length === 0) {
      // No indices - return entire flat array
      return Array.from(this.data);
    }
    
    // Partial indexing - return sub-array
    const remainingShape = this.shape.slice(indices.length);
    const size = remainingShape.reduce((a, b) => a * b, 1);
    const startIndex = this.#flatIndex([...indices, ...new Array(remainingShape.length).fill(0)]);
    
    return Array.from(this.data.slice(startIndex, startIndex + size));
  }
  
  /**
   * Set a slice of the array
   * @param {Array} values - Values to set
   * @param {...number} indices - Partial indices
   */
  setSlice(values, ...indices) {
    if (indices.length === 0) {
      // Setting entire array
      if (values.length !== this.data.length) {
        throw new Error(`Value array size ${values.length} doesn't match data size ${this.data.length}`);
      }
      for (let i = 0; i < values.length; i++) {
        this.data[i] = values[i];
      }
      return;
    }
    
    const remainingShape = this.shape.slice(indices.length);
    const size = remainingShape.reduce((a, b) => a * b, 1);
    const startIndex = this.#flatIndex([...indices, ...new Array(remainingShape.length).fill(0)]);
    
    if (values.length !== size) {
      throw new Error(`Value array size ${values.length} doesn't match slice size ${size}`);
    }
    
    for (let i = 0; i < size; i++) {
      this.data[startIndex + i] = values[i];
    }
  }
  
  /**
   * Get the raw flat data array
   * @returns {TypedArray|Array}
   */
  getFlatData() {
    return this.data;
  }
  
  /**
   * Convert to nested JavaScript arrays
   * @returns {Array}
   */
  toNestedArray() {
    const result = this.#buildNestedArray(this.shape, 0, 0);
    return result;
  }
  
  /**
   * Recursively build nested array structure
   * @param {Array<number>} shape - Remaining shape
   * @param {number} offset - Current flat array offset
   * @param {number} depth - Current depth
   * @returns {Array|*}
   * @private
   */
  #buildNestedArray(shape, offset, depth) {
    if (shape.length === 1) {
      // Base case - return flat slice
      return Array.from(this.data.slice(offset, offset + shape[0]));
    }
    
    const result = [];
    const stride = this.strides[depth];
    const currentSize = shape[0];
    const remainingShape = shape.slice(1);
    
    for (let i = 0; i < currentSize; i++) {
      result.push(this.#buildNestedArray(remainingShape, offset + i * stride, depth + 1));
    }
    
    return result;
  }
  
  /**
   * Create a copy of this RegularDataList
   * @returns {RegularDataList}
   */
  clone() {
    return new RegularDataList(Array.from(this.data), this.shape, this.dataType);
  }
  
  /**
   * String representation for debugging
   * @returns {string}
   */
  toString() {
    return `RegularDataList(shape: [${this.shape.join(', ')}], type: ${this.dataType}, size: ${this.size()})`;
  }
}

