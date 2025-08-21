// JavaScript DataList implementation for jReality
// Simplified multidimensional array storage using flat typed arrays

/**
 * A multidimensional array stored as a flat typed array with computed access.
 * Supports arbitrary dimensions with stride-based indexing.
 */
export class DataList {
  
  /**
   * Create a new DataList
   * @param {Array|TypedArray} data - The flat data array
   * @param {number|Array<number>} shape - Shape of the array (e.g., [rows, cols, 3] for mesh)
   * @param {string} dataType - Type of data: 'int32', 'float64', 'string', 'object'
   */
  constructor(data, shape, dataType = 'float64') {
    this.shape = Array.isArray(shape) ? shape : [shape];
    this.dataType = dataType;
    this.strides = this.#calculateStrides(this.shape);
    
    // Validate data size
    const expectedSize = this.shape.reduce((a, b) => a * b, 1);
    if (data.length !== expectedSize) {
      throw new Error(`Data size ${data.length} doesn't match shape ${this.shape} (expected ${expectedSize})`);
    }
    
    // Store data in appropriate typed array
    this.data = this.#createTypedArray(data, dataType);
  }
  
  /**
   * Create typed array based on data type
   * @param {Array} data - Source data
   * @param {string} dataType - Target data type
   * @returns {TypedArray|Array}
   * @private
   */
  #createTypedArray(data, dataType) {
    switch (dataType) {
      case 'int32':
        return data instanceof Int32Array ? data : new Int32Array(data);
      case 'float64':
        return data instanceof Float64Array ? data : new Float64Array(data);
      case 'float32':
        return data instanceof Float32Array ? data : new Float32Array(data);
      case 'string':
      case 'object':
        return Array.isArray(data) ? data : Array.from(data);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
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
  length() {
    return this.shape[0];
  }
  
  /**
   * Get item at multidimensional index
   * @param {...number} indices - Indices for each dimension
   * @returns {*} The value at the specified location
   */
  getItem(...indices) {
    if (indices.length === 1 && this.shape.length === 1) {
      // Simple 1D case
      return this.data[indices[0]];
    }
    
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
      // Full indexing - return single item
      return this.getItem(...indices);
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
   * Create a copy of this DataList
   * @returns {DataList}
   */
  clone() {
    return new DataList(Array.from(this.data), this.shape, this.dataType);
  }
  
  /**
   * String representation for debugging
   * @returns {string}
   */
  toString() {
    return `DataList(shape: [${this.shape.join(', ')}], type: ${this.dataType}, size: ${this.size()})`;
  }
}
