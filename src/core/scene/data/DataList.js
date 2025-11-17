// Abstract base class for DataList implementations
// Provides common interface and shared functionality

/**
 * Abstract base class for data list implementations.
 * 
 * This class defines the common interface for both RegularDataList (fixed-shape)
 * and VariableDataList (variable-length rows). Subclasses must implement
 * the abstract methods defined here.
 * 
 * @abstract
 */
export class DataList {
  
  /**
   * Create a new DataList (abstract - subclasses must implement)
   * @param {string} [dataType='float64'] - Data type for the list
   */
  constructor(dataType = 'float64') {
    // Abstract class - prevent direct instantiation
    if (this.constructor === DataList) {
      throw new Error('DataList is an abstract class and cannot be instantiated directly');
    }
    
    // Initialize common property
    this.dataType = dataType;
  }
  
  /**
   * Create typed array based on data type.
   * Shared implementation for both RegularDataList and VariableDataList.
   * 
   * @param {Array} data - Source data
   * @param {string} dataType - Target data type
   * @returns {TypedArray|Array}
   * @protected
   */
  _createTypedArray(data, dataType) {
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
   * Get the total number of elements.
   * @abstract
   * @returns {number}
   */
  size() {
    throw new Error('size() must be implemented by subclass');
  }
  
  /**
   * Get the number of items in the first dimension (rows).
   * @abstract
   * @returns {number}
   */
  length() {
    throw new Error('length() must be implemented by subclass');
  }
  
  /**
   * Get the i-th item (sub-array/fiber) from the data list.
   * Matches Java's DataList.item(int i) behavior - returns a sub-array, not a single element.
   * 
   * For RegularDataList with shape [n, m, ...]:
   *   - Returns the i-th fiber (sub-array with remaining dimensions)
   *   - For shape [n, m], item(i) returns array of length m
   *   - For shape [n], item(i) returns single element
   * 
   * For VariableDataList:
   *   - Returns the i-th row as an array
   * 
   * @abstract
   * @param {number} index - Index of the item to retrieve
   * @returns {Array|*} Sub-array or single element
   */
  item(index) {
    throw new Error('item() must be implemented by subclass');
  }
  
  /**
   * Set item at index/indices.
   * @abstract
   * @param {*} value - Value to set
   * @param {...number} indices - Indices (signature varies by subclass)
   */
  setItem(value, ...indices) {
    throw new Error('setItem() must be implemented by subclass');
  }
  
  /**
   * Get the raw flat data array.
   * @abstract
   * @returns {TypedArray|Array}
   */
  getFlatData() {
    throw new Error('getFlatData() must be implemented by subclass');
  }
  
  /**
   * Convert to nested JavaScript arrays.
   * @abstract
   * @returns {Array}
   */
  toNestedArray() {
    throw new Error('toNestedArray() must be implemented by subclass');
  }
  
  /**
   * Create a copy of this DataList.
   * @abstract
   * @returns {DataList}
   */
  clone() {
    throw new Error('clone() must be implemented by subclass');
  }
  
  /**
   * String representation for debugging.
   * @abstract
   * @returns {string}
   */
  toString() {
    throw new Error('toString() must be implemented by subclass');
  }
}
