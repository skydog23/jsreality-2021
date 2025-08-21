// JavaScript port of jReality's Matrix class (from Matrix.java)
// This file is auto-generated to match the Java version as closely as possible.
// All functions are static and operate on arrays (vectors/matrices) of numbers.
// @ts-check

import * as Rn from './Rn.js';

/** @typedef {number[]} Matrix4 */

export const TOLERANCE = Rn.TOLERANCE;

/**
 * A simple wrapper class for 4x4 real matrices. The matrix is represented as a
 * linear array of 16 values (number[16]) to avoid problems with JavaScript's
 * multi-dimensional arrays. The elements are listed in row/column order and act on column vectors
 * sitting to the right of the matrix.
 * 
 * This class provides a convenient wrapper for number arrays that offers some basic
 * functionality for multiplying and inverting matrices and such.
 * 
 * NOTE: Some methods from the Java version that depend on scene graph classes 
 * (Transformation, SceneGraphComponent) are not yet implemented and will be added
 * when those classes are translated:
 * - Matrix(Transformation data) constructor
 * - assignFrom(Transformation trafo)
 * - assignTo(Transformation trafo) 
 * - assignTo(SceneGraphComponent comp)
 */
export class Matrix {
  
  /**
   * @type {number[]}
   */
  #matrix;
  
  /**
   * @type {boolean}
   */
  #matrixChanged = true;

  /**
   * Create a new Matrix instance.
   * @param {number[]|Matrix|null} [m] - Initial matrix data (16 elements) or Matrix instance
   */
  constructor(m) {
    if (m instanceof Matrix) {
      // Copy constructor
      this.#matrix = new Array(16);
      for (let i = 0; i < 16; i++) {
        this.#matrix[i] = m.#matrix[i];
      }
    } else if (m && Array.isArray(m)) {
      if (m.length !== 16) {
        throw new Error('invalid dimension for 4x4 matrix');
      }
      this.#matrix = m; // Plain wrapper - does NOT make a copy
    } else {
      // Default constructor - identity matrix
      this.#matrix = Rn.identityMatrix(4);
    }
  }

  /**
   * Create Matrix with individual components
   * @param {number} x00 
   * @param {number} x01 
   * @param {number} x02 
   * @param {number} x03 
   * @param {number} x10 
   * @param {number} x11 
   * @param {number} x12 
   * @param {number} x13 
   * @param {number} x20 
   * @param {number} x21 
   * @param {number} x22 
   * @param {number} x23 
   * @param {number} x30 
   * @param {number} x31 
   * @param {number} x32 
   * @param {number} x33 
   * @returns {Matrix}
   */
  static fromComponents(x00, x01, x02, x03, x10, x11, x12, x13, x20, x21, x22, x23, x30, x31, x32, x33) {
    return new Matrix([x00, x01, x02, x03, x10, x11, x12, x13, x20, x21, x22, x23, x30, x31, x32, x33]);
  }

  /**
   * Static factory methods
   */

  /**
   * Multiply two matrices A * B
   * @param {Matrix} A 
   * @param {Matrix} B 
   * @returns {Matrix}
   */
  static times(A, B) {
    return new Matrix(Rn.timesMatrix(null, A.#matrix, B.#matrix));
  }

  /**
   * Add two matrices A + B
   * @param {Matrix} A 
   * @param {Matrix} B 
   * @returns {Matrix}
   */
  static sum(A, B) {
    return new Matrix(Rn.add(null, A.#matrix, B.#matrix));
  }

  /**
   * Conjugate matrix A by matrix B: B * A * B^-1
   * @param {Matrix} A 
   * @param {Matrix} B 
   * @returns {Matrix}
   */
  static conjugate(A, B) {
    return new Matrix(Rn.conjugateByMatrix(null, A.#matrix, B.#matrix));
  }

  /**
   * Raise matrix to a power
   * @param {Matrix} m 
   * @param {number} n 
   * @returns {Matrix}
   */
  static power(m, n) {
    const res = new Matrix();
    const absN = Math.abs(n);
    for (let i = 0; i < absN; ++i) {
      res.multiplyOnLeft(m);
    }
    if (n < 0) res.invert();
    return res;
  }

  /**
   * Instance methods
   */

  /**
   * Copy values from another array or Matrix
   * @param {number[]|Matrix} initValue 
   */
  assignFrom(initValue) {
    this.#matrixChanged = true;
    if (initValue instanceof Matrix) {
      for (let i = 0; i < 16; i++) {
        this.#matrix[i] = initValue.getArray()[i];
      }
    } else if (Array.isArray(initValue)) {
      if (initValue.length !== 16) {
        throw new Error('invalid dimension for 4x4 matrix');
      }
      for (let i = 0; i < 16; i++) {
        this.#matrix[i] = initValue[i];
      }
    } else {
      throw new Error('Invalid argument type');
    }
  }

  /**
   * Set matrix components individually
   * @param {number} x00 
   * @param {number} x01 
   * @param {number} x02 
   * @param {number} x03 
   * @param {number} x10 
   * @param {number} x11 
   * @param {number} x12 
   * @param {number} x13 
   * @param {number} x20 
   * @param {number} x21 
   * @param {number} x22 
   * @param {number} x23 
   * @param {number} x30 
   * @param {number} x31 
   * @param {number} x32 
   * @param {number} x33 
   */
  assignFromComponents(x00, x01, x02, x03, x10, x11, x12, x13, x20, x21, x22, x23, x30, x31, x32, x33) {
    this.assignFrom([x00, x01, x02, x03, x10, x11, x12, x13, x20, x21, x22, x23, x30, x31, x32, x33]);
  }

  /**
   * Copy this matrix to another array
   * @param {number[]} array 
   */
  assignTo(array) {
    if (array.length !== 16) {
      throw new Error('Target array must have length 16');
    }
    for (let i = 0; i < 16; i++) {
      array[i] = this.#matrix[i];
    }
  }

  /**
   * Copy this matrix to another Matrix
   * @param {Matrix} m 
   */
  assignToMatrix(m) {
    m.assignFrom(this.#matrix);
  }

  /**
   * Set to identity matrix
   */
  assignIdentity() {
    this.#matrixChanged = true;
    Rn.setIdentityMatrix(this.#matrix);
  }

  /**
   * Get the determinant
   * @returns {number}
   */
  getDeterminant() {
    return Rn.determinant(this.#matrix);
  }

  /**
   * Get the trace
   * @returns {number}
   */
  getTrace() {
    return Rn.trace(this.#matrix);
  }

  /**
   * Get entry at row, column
   * @param {number} row 
   * @param {number} column 
   * @returns {number}
   */
  getEntry(row, column) {
    return this.#matrix[4 * row + column];
  }

  /**
   * Set entry at row, column
   * @param {number} row 
   * @param {number} column 
   * @param {number} value 
   */
  setEntry(row, column, value) {
    if (this.#matrix[4 * row + column] !== value) {
      this.#matrixChanged = true;
    }
    this.#matrix[4 * row + column] = value;
  }

  /**
   * Get a row as array
   * @param {number} i 
   * @returns {number[]}
   */
  getRow(i) {
    return [this.#matrix[4 * i], this.#matrix[4 * i + 1], this.#matrix[4 * i + 2], this.#matrix[4 * i + 3]];
  }

  /**
   * Set a row from array
   * @param {number} i 
   * @param {number[]} v 
   */
  setRow(i, v) {
    this.#matrixChanged = true;
    this.#matrix[4 * i] = v[0];
    this.#matrix[4 * i + 1] = v[1];
    this.#matrix[4 * i + 2] = v[2];
    this.#matrix[4 * i + 3] = v[3];
  }

  /**
   * Get a column as array
   * @param {number} i 
   * @returns {number[]}
   */
  getColumn(i) {
    return [this.#matrix[i], this.#matrix[i + 4], this.#matrix[i + 8], this.#matrix[i + 12]];
  }

  /**
   * Set a column from array. If v.length == 3, the 4th entry is set to 0.
   * @param {number} i 
   * @param {number[]} v 
   */
  setColumn(i, v) {
    this.#matrixChanged = true;
    this.#matrix[i] = v[0];
    this.#matrix[i + 4] = v[1];
    this.#matrix[i + 8] = v[2];
    this.#matrix[i + 12] = (v.length > 3) ? v[3] : 0;
  }

  /**
   * Get reference to the internal array
   * @returns {number[]}
   */
  getArray() {
    return this.#matrix;
  }

  /**
   * Copy the current matrix into aMatrix and return it
   * @param {number[]|null} aMatrix 
   * @returns {number[]}
   */
  writeToArray(aMatrix) {
    if (aMatrix !== null && aMatrix.length !== 16) {
      throw new Error('matrix must have length 16');
    }
    const copy = aMatrix === null ? new Array(16) : aMatrix;
    for (let i = 0; i < 16; i++) {
      copy[i] = this.#matrix[i];
    }
    return copy;
  }

  /**
   * Form M*T and store in M
   * @param {number[]|Matrix} T 
   */
  multiplyOnRight(T) {
    this.#matrixChanged = true;
    const Tmatrix = T instanceof Matrix ? T.#matrix : T;
    Rn.timesMatrix(this.#matrix, this.#matrix, Tmatrix);
  }

  /**
   * Form T*M and store in M
   * @param {number[]|Matrix} T 
   */
  multiplyOnLeft(T) {
    this.#matrixChanged = true;
    const Tmatrix = T instanceof Matrix ? T.#matrix : T;
    Rn.timesMatrix(this.#matrix, Tmatrix, this.#matrix);
  }

  /**
   * Assign T * M * T^-1
   * @param {Matrix} T 
   */
  conjugateBy(T) {
    this.#matrixChanged = true;
    Rn.conjugateByMatrix(this.#matrix, this.#matrix, T.#matrix);
  }

  /**
   * Assign M + T
   * @param {Matrix} T 
   */
  add(T) {
    this.#matrixChanged = true;
    Rn.add(this.#matrix, this.#matrix, T.#matrix);
  }

  /**
   * Assign M - T
   * @param {Matrix} T 
   */
  subtract(T) {
    this.#matrixChanged = true;
    Rn.subtract(this.#matrix, this.#matrix, T.#matrix);
  }

  /**
   * Assign f * M
   * @param {number} f 
   */
  times(f) {
    this.#matrixChanged = true;
    Rn.times(this.#matrix, f, this.#matrix);
  }

  /**
   * Get the inverse as a new Matrix
   * @returns {Matrix}
   */
  getInverse() {
    return new Matrix(Rn.inverse(null, this.#matrix));
  }

  /**
   * Invert this matrix in place
   */
  invert() {
    this.#matrixChanged = true;
    Rn.inverse(this.#matrix, this.#matrix);
  }

  /**
   * Get the transpose as a new Matrix
   * @returns {Matrix}
   */
  getTranspose() {
    return new Matrix(Rn.transpose(null, this.#matrix));
  }

  /**
   * Transpose this matrix in place
   */
  transpose() {
    this.#matrixChanged = true;
    Rn.transpose(this.#matrix, this.#matrix);
  }

  /**
   * Form matrix-vector product M.v (v is column vector on the right)
   * @param {number[]} v 
   * @returns {number[]}
   */
  multiplyVector(v) {
    return Rn.matrixTimesVector(null, this.#matrix, v);
  }

  /**
   * Transform vector in place: assign M.v to v
   * @param {number[]} v 
   */
  transformVector(v) {
    Rn.matrixTimesVector(v, this.#matrix, v);
  }

  /**
   * Check equality with another Matrix
   * @param {Matrix} T 
   * @returns {boolean}
   */
  equals(T) {
    return Rn.equals(this.#matrix, T.#matrix);
  }

  /**
   * Check if matrix contains NaN or Infinite values
   * @returns {boolean}
   */
  containsNanOrInfinite() {
    for (const v of this.#matrix) {
      if (isNaN(v) || !isFinite(v)) return true;
    }
    return false;
  }

  /**
   * String representation
   * @returns {string}
   */
  toString() {
    return Rn.matrixToString(this.#matrix);
  }

  /**
   * Get the matrix changed flag (for extending classes)
   * @returns {boolean}
   */
  get matrixChanged() {
    return this.#matrixChanged;
  }

  /**
   * Reset the matrix changed flag (for extending classes)
   */
  resetMatrixChanged() {
    this.#matrixChanged = false;
  }

  // Static projection matrix utilities for 3D rendering

  /**
   * Create a perspective projection matrix
   * @param {number[]} matrix - Target matrix array (16 elements)
   * @param {number} fovy - Field of view angle in radians
   * @param {number} aspect - Aspect ratio (width/height)
   * @param {number} near - Near clipping plane
   * @param {number} far - Far clipping plane
   * @returns {number[]} The matrix (same as input)
   */
  static assignPerspective(matrix, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2.0);
    const nf = 1.0 / (near - far);

    matrix[0] = f / aspect;  matrix[4] = 0;  matrix[8] = 0;                    matrix[12] = 0;
    matrix[1] = 0;           matrix[5] = f;  matrix[9] = 0;                    matrix[13] = 0;
    matrix[2] = 0;           matrix[6] = 0;  matrix[10] = (far + near) * nf;   matrix[14] = 2 * far * near * nf;
    matrix[3] = 0;           matrix[7] = 0;  matrix[11] = -1;                  matrix[15] = 0;

    return matrix;
  }

  /**
   * Create an orthographic projection matrix
   * @param {number[]} matrix - Target matrix array (16 elements)
   * @param {number} left - Left clipping plane
   * @param {number} right - Right clipping plane
   * @param {number} bottom - Bottom clipping plane
   * @param {number} top - Top clipping plane
   * @param {number} near - Near clipping plane
   * @param {number} far - Far clipping plane
   * @returns {number[]} The matrix (same as input)
   */
  static assignOrthographic(matrix, left, right, bottom, top, near, far) {
    const rl = 1.0 / (right - left);
    const tb = 1.0 / (top - bottom);
    const fn = 1.0 / (far - near);

    matrix[0] = 2 * rl;      matrix[4] = 0;           matrix[8] = 0;            matrix[12] = -(right + left) * rl;
    matrix[1] = 0;           matrix[5] = 2 * tb;      matrix[9] = 0;            matrix[13] = -(top + bottom) * tb;
    matrix[2] = 0;           matrix[6] = 0;           matrix[10] = -2 * fn;     matrix[14] = -(far + near) * fn;
    matrix[3] = 0;           matrix[7] = 0;           matrix[11] = 0;           matrix[15] = 1;

    return matrix;
  }
}
