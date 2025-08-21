// Variable-length DataList for irregular arrays like polygon index lists
// Each "row" can have a different number of elements

/**
 * A DataList where each row can have different lengths.
 * Useful for polygon indices, variable-length adjacency lists, etc.
 */
export class VariableDataList {
  
  /**
   * Create a new VariableDataList
   * @param {Array<Array>} data - Array of arrays with potentially different lengths
   * @param {string} dataType - Type of data: 'int32', 'float64', 'string', 'object'
   */
  constructor(data, dataType = 'int32') {
    this.dataType = dataType;
    this.rows = [];
    this.rowOffsets = [0]; // Cumulative offsets for each row
    
    // Store each row as a separate typed array/array
    let totalSize = 0;
    for (const row of data) {
      const typedRow = this.#createTypedArray(row, dataType);
      this.rows.push(typedRow);
      totalSize += row.length;
      this.rowOffsets.push(totalSize);
    }
    
    // Also maintain flat representation for efficient access
    this.flatData = this.#createTypedArray(new Array(totalSize), dataType);
    this.#rebuildFlatData();
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
   * Rebuild the flat data representation
   * @private
   */
  #rebuildFlatData() {
    let offset = 0;
    for (const row of this.rows) {
      for (let i = 0; i < row.length; i++) {
        this.flatData[offset + i] = row[i];
      }
      offset += row.length;
    }
  }
  
  /**
   * Get the number of rows
   * @returns {number}
   */
  length() {
    return this.rows.length;
  }
  
  /**
   * Get total number of elements across all rows
   * @returns {number}
   */
  size() {
    return this.flatData.length;
  }
  
  /**
   * Get a complete row
   * @param {number} rowIndex - Row index
   * @returns {Array} Copy of the row data
   */
  getRow(rowIndex) {
    if (rowIndex < 0 || rowIndex >= this.rows.length) {
      throw new Error(`Row index ${rowIndex} out of bounds (0 to ${this.rows.length - 1})`);
    }
    return Array.from(this.rows[rowIndex]);
  }
  
  /**
   * Get a specific element
   * @param {number} rowIndex - Row index
   * @param {number} colIndex - Column index within the row
   * @returns {*} The element value
   */
  getItem(rowIndex, colIndex) {
    if (rowIndex < 0 || rowIndex >= this.rows.length) {
      throw new Error(`Row index ${rowIndex} out of bounds`);
    }
    
    const row = this.rows[rowIndex];
    if (colIndex < 0 || colIndex >= row.length) {
      throw new Error(`Column index ${colIndex} out of bounds for row ${rowIndex} (length ${row.length})`);
    }
    
    return row[colIndex];
  }
  
  /**
   * Set a complete row
   * @param {number} rowIndex - Row index
   * @param {Array} data - New row data
   */
  setRow(rowIndex, data) {
    if (rowIndex < 0 || rowIndex >= this.rows.length) {
      throw new Error(`Row index ${rowIndex} out of bounds`);
    }
    
    // Create new typed array for the row
    this.rows[rowIndex] = this.#createTypedArray(data, this.dataType);
    
    // Rebuild offsets and flat data
    this.#rebuildOffsets();
    this.#rebuildFlatData();
  }
  
  /**
   * Set a specific element
   * @param {number} rowIndex - Row index
   * @param {number} colIndex - Column index
   * @param {*} value - New value
   */
  setItem(rowIndex, colIndex, value) {
    if (rowIndex < 0 || rowIndex >= this.rows.length) {
      throw new Error(`Row index ${rowIndex} out of bounds`);
    }
    
    const row = this.rows[rowIndex];
    if (colIndex < 0 || colIndex >= row.length) {
      throw new Error(`Column index ${colIndex} out of bounds for row ${rowIndex}`);
    }
    
    row[colIndex] = value;
    
    // Update flat data
    const flatIndex = this.rowOffsets[rowIndex] + colIndex;
    this.flatData[flatIndex] = value;
  }
  
  /**
   * Add a new row
   * @param {Array} data - Row data to add
   */
  addRow(data) {
    const typedRow = this.#createTypedArray(data, this.dataType);
    this.rows.push(typedRow);
    this.#rebuildOffsets();
    
    // Rebuild flat data with new size
    const newFlatData = this.#createTypedArray(new Array(this.rowOffsets[this.rowOffsets.length - 1]), this.dataType);
    for (let i = 0; i < this.flatData.length; i++) {
      newFlatData[i] = this.flatData[i];
    }
    this.flatData = newFlatData;
    this.#rebuildFlatData();
  }
  
  /**
   * Remove a row
   * @param {number} rowIndex - Row index to remove
   */
  removeRow(rowIndex) {
    if (rowIndex < 0 || rowIndex >= this.rows.length) {
      throw new Error(`Row index ${rowIndex} out of bounds`);
    }
    
    this.rows.splice(rowIndex, 1);
    this.#rebuildOffsets();
    
    // Rebuild flat data with new size
    const newSize = this.rowOffsets[this.rowOffsets.length - 1];
    this.flatData = this.#createTypedArray(new Array(newSize), this.dataType);
    this.#rebuildFlatData();
  }
  
  /**
   * Get the length of a specific row
   * @param {number} rowIndex - Row index
   * @returns {number} Length of the row
   */
  getRowLength(rowIndex) {
    if (rowIndex < 0 || rowIndex >= this.rows.length) {
      throw new Error(`Row index ${rowIndex} out of bounds`);
    }
    return this.rows[rowIndex].length;
  }
  
  /**
   * Get all row lengths
   * @returns {Array<number>} Array of row lengths
   */
  getRowLengths() {
    return this.rows.map(row => row.length);
  }
  
  /**
   * Rebuild row offsets after structural changes
   * @private
   */
  #rebuildOffsets() {
    this.rowOffsets = [0];
    let total = 0;
    for (const row of this.rows) {
      total += row.length;
      this.rowOffsets.push(total);
    }
  }
  
  /**
   * Get the flat data representation
   * @returns {TypedArray|Array}
   */
  getFlatData() {
    return this.flatData;
  }
  
  /**
   * Convert to nested array format
   * @returns {Array<Array>}
   */
  toNestedArray() {
    return this.rows.map(row => Array.from(row));
  }
  
  /**
   * Create a copy of this VariableDataList
   * @returns {VariableDataList}
   */
  clone() {
    return new VariableDataList(this.toNestedArray(), this.dataType);
  }
  
  /**
   * Get statistics about the data structure
   * @returns {Object}
   */
  getStats() {
    const lengths = this.getRowLengths();
    return {
      numRows: this.length(),
      totalElements: this.size(),
      minRowLength: Math.min(...lengths),
      maxRowLength: Math.max(...lengths),
      avgRowLength: lengths.reduce((a, b) => a + b, 0) / lengths.length
    };
  }
  
  /**
   * String representation for debugging
   * @returns {string}
   */
  toString() {
    const stats = this.getStats();
    return `VariableDataList(rows: ${stats.numRows}, elements: ${stats.totalElements}, ` +
           `lengths: ${stats.minRowLength}-${stats.maxRowLength}, type: ${this.dataType})`;
  }
}
