/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's MatrixBuilder class (from MatrixBuilder.java)
// This file is auto-generated to match the Java version as closely as possible.
// @ts-check

import { Matrix } from './Matrix.js';
import * as Pn from './Pn.js';
import * as P3 from './P3.js';
import * as Rn from './Rn.js';
import { Transformation } from '../scene/Transformation.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';

/** @typedef {number[]} Matrix4 */

/**
 * This class wraps a Matrix instance for easy specification of
 * concatenated operations. All the static methods are factory methods that
 * create an instance for a selected metric.
 * 
 * The instance methods which carry out matrix operations 
 * are always applied on the right hand side of the
 * current value of the matrix. All these methods return this instance as value, 
 * so that one can chain many calls in a row.
 * 
 * Example:
 * const m = MatrixBuilder.euclidean()
 *            .translate(2, 2, 2)
 *            .rotate(Math.PI/2, 1, 1, 1)
 *            .scale(3, 1, 2)
 *            .getMatrix();
 * 
 * NOTE: Some factory methods and assign methods from the Java version that depend 
 * on scene graph classes are not yet implemented and will be added when those 
 * classes are translated:
 * - euclidean(Transformation m), euclidean(SceneGraphComponent cmp)
 * - hyperbolic(Transformation m), hyperbolic(SceneGraphComponent cmp)  
 * - elliptic(Transformation m), elliptic(SceneGraphComponent cmp)
 * - projective(Transformation m)
 * - assignTo(SceneGraphComponent comp), assignTo(Transformation trafo)
 */
export class MatrixBuilder {

  /**
   * @type {Matrix}
   */
  #matrix;

  /**
   * @type {number}
   */
  #metric;

  /**
   * @type {number[]}
   */
  #tmp = new Array(16);

  /**
   * Create a MatrixBuilder with given matrix and metric
   * @param {Matrix} m 
   * @param {number} metric 
   */
  constructor(m, metric) {
    this.#matrix = m;
    this.#metric = metric;
  }

  /**
   * Static factory methods
   */

  /**
   * Create a matrix builder for euclidean transformations
   * @param {Matrix|null} [m] - Initial matrix
   * @returns {MatrixBuilder}
   */
  static euclidean(m = null) {
    const mat = m !== null ? m : new Matrix();
    return new MatrixBuilder(mat, Pn.EUCLIDEAN);
  }

  /**
   * Create a matrix builder for hyperbolic transformations
   * @param {Matrix|null} [m] - Initial matrix
   * @returns {MatrixBuilder}
   */
  static hyperbolic(m = null) {
    const mat = m !== null ? m : new Matrix();
    return new MatrixBuilder(mat, Pn.HYPERBOLIC);
  }

  /**
   * Create a matrix builder for elliptic transformations
   * @param {Matrix|null} [m] - Initial matrix
   * @returns {MatrixBuilder}
   */
  static elliptic(m = null) {
    const mat = m !== null ? m : new Matrix();
    return new MatrixBuilder(mat, Pn.ELLIPTIC);
  }

  /**
   * Create a matrix builder for projective transformations
   * @param {Matrix|null} [m] - Initial matrix
   * @returns {MatrixBuilder}
   */
  static projective(m = null) {
    const mat = m !== null ? m : new Matrix();
    return new MatrixBuilder(mat, Pn.PROJECTIVE);
  }

  /**
   * Create a matrix builder for the given metric
   * @param {number} metric 
   * @returns {MatrixBuilder}
   */
  static forMetric(metric) {
    switch (metric) {
      case Pn.EUCLIDEAN:
        return MatrixBuilder.euclidean();
      case Pn.ELLIPTIC:
        return MatrixBuilder.elliptic();
      case Pn.HYPERBOLIC:
        return MatrixBuilder.hyperbolic();
      default:
        return MatrixBuilder.euclidean();
    }
  }

  /**
   * Initialize with matrix and metric
   * @param {Matrix|null} m 
   * @param {number} metric 
   * @returns {MatrixBuilder}
   */
  static init(m, metric) {
    return new MatrixBuilder(m === null ? new Matrix() : m, metric);
  }

  /**
   * Instance methods for transformations
   */

  /**
   * Apply rotation about given axis
   * @param {number} angle 
   * @param {number} axisX 
   * @param {number} axisY 
   * @param {number} axisZ 
   * @returns {MatrixBuilder}
   */
  rotate(angle, axisX, axisY, axisZ) {
    if (typeof axisX === 'object') {
      // Called with array as second argument
      return this.rotateArray(angle, axisX);
    }
    return this.rotateArray(angle, [axisX, axisY, axisZ]);
  }

  /**
   * Apply rotation about given axis (array form)
   * @param {number} angle 
   * @param {number[]} axis 
   * @returns {MatrixBuilder}
   */
  rotateArray(angle, axis) {
    P3.makeRotationMatrix(this.#tmp, axis, angle);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Rotate about axis through two points
   * @param {number[]} p1 
   * @param {number[]} p2 
   * @param {number} angle 
   * @returns {MatrixBuilder}
   */
  rotateAboutAxis(p1, p2, angle) {
    P3.makeRotationMatrixAxis(this.#tmp, p1, p2, angle, this.#metric);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Rotate about X axis
   * @param {number} angle 
   * @returns {MatrixBuilder}
   */
  rotateX(angle) {
    P3.makeRotationMatrixX(this.#tmp, angle);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Rotate about Y axis
   * @param {number} angle 
   * @returns {MatrixBuilder}
   */
  rotateY(angle) {
    P3.makeRotationMatrixY(this.#tmp, angle);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Rotate about Z axis
   * @param {number} angle 
   * @returns {MatrixBuilder}
   */
  rotateZ(angle) {
    P3.makeRotationMatrixZ(this.#tmp, angle);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Rotation which takes vector v1 to vector v2
   * @param {number[]} v1 
   * @param {number[]} v2 
   * @returns {MatrixBuilder}
   */
  rotateFromTo(v1, v2) {
    P3.makeRotationAxisMatrix(this.#tmp, v1, v2);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Uniform scaling
   * @param {number} scale 
   * @returns {MatrixBuilder}
   */
  scale(scale) {
    if (typeof scale === 'number') {
      this.#matrix.multiplyOnRight(P3.makeStretchMatrix(this.#tmp, scale));
      return this;
    } else {
      // scale is an array
      return this.scaleArray(scale);
    }
  }

  /**
   * uniform scaling with number
   * @param {number} scaleVec 
   * @returns {MatrixBuilder}
   */
  scaleArray(scaleVec) {
    P3.makeStretchMatrix(this.#tmp, scaleVec);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Non-uniform scaling with components
   * @param {number} scaleX 
   * @param {number} scaleY 
   * @param {number} scaleZ 
   * @returns {MatrixBuilder}
   */
  scaleXYZ(scaleX, scaleY, scaleZ) {
    P3.makeStretchMatrixXYZ(this.#tmp, scaleX, scaleY, scaleZ);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Apply skew transformation
   * @param {number} i 
   * @param {number} j 
   * @param {number} val 
   * @returns {MatrixBuilder}
   */
  skew(i, j, val) {
    P3.makeSkewMatrix(this.#tmp, i, j, val);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Apply translation
   * @param {number[]|number} vector - Translation vector or x component
   * @param {number} [dy] - y component
   * @param {number} [dz] - z component
   * @returns {MatrixBuilder}
   */
  translate(vector, dy, dz) {
    if (typeof vector === 'number') {
      // Called with three numbers - dy and dz default to 0 if not provided
      return this.translateArray([vector, dy ?? 0, dz ?? 0]);
    } else {
      // Called with array
      return this.translateArray(vector);
    }
  }

  /**
   * Apply translation with array
   * @param {number[]} vector 
   * @returns {MatrixBuilder}
   */
  translateArray(vector) {
    P3.makeTranslationMatrix(this.#tmp, vector, this.#metric);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Apply translation from one point to another
   * @param {number[]} from 
   * @param {number[]} to 
   * @returns {MatrixBuilder}
   */
  translateFromTo(from, to) {
    P3.makeTranslationMatrix2(this.#tmp, from, to, this.#metric);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Apply reflection about plane determined by three points
   * @param {number[]} v1 
   * @param {number[]} v2 
   * @param {number[]} v3 
   * @returns {MatrixBuilder}
   */
  reflect(v1, v2, v3) {
    if (arguments.length === 1) {
      // Called with plane equation
      return this.reflectPlane(v1);
    } else {
      // Called with three points
      return this.reflectPlane(P3.planeFromPoints(null, v1, v2, v3));
    }
  }

  /**
   * Apply reflection about given plane
   * @param {number[]} plane 
   * @returns {MatrixBuilder}
   */
  reflectPlane(plane) {
    P3.makeReflectionMatrix(this.#tmp, plane, this.#metric);
    this.#matrix.multiplyOnRight(this.#tmp);
    return this;
  }

  /**
   * Apply conjugation by matrix c
   * @param {number[]} c 
   * @returns {MatrixBuilder}
   */
  conjugateBy(c) {
    Rn.conjugateByMatrix(this.#matrix.getArray(), this.#matrix.getArray(), c);
    return this;
  }

  /**
   * Multiply by matrix on the right
   * @param {Matrix|number[]} matrix 
   * @returns {MatrixBuilder}
   */
  times(matrix) {
    if (matrix instanceof Matrix) {
      return this.timesArray(matrix.getArray());
    } else {
      return this.timesArray(matrix);
    }
  }

  /**
   * Multiply by array (considered as 4x4 matrix) on the right
   * @param {number[]} array 
   * @returns {MatrixBuilder}
   */
  timesArray(array) {
    this.#matrix.multiplyOnRight(array);
    return this;
  }

  /**
   * Reset to identity matrix
   * @returns {MatrixBuilder}
   */
  // reset() {
  //   this.#matrix = Rn.identityMatrix(4);
  //   return this;
  // }

  /**
   * Get the underlying Matrix
   * @returns {Matrix}
   */
  getMatrix() {
    return this.#matrix;
  }

  /**
   * Get the underlying array
   * @returns {number[]}
   */
  getArray() {
    return this.#matrix.getArray();
  }

  /**
   * Assign to array
   * @param {number[]} array 
   */
  assignTo(array) {
    this.#matrix.assignTo(array);
  }
 /**
   * Assign to Matrix
   * @param {Matrix} m 
   */
 assignToMatrix(m) {
    this.#matrix.assignToMatrix(m);
  }
/**
 * Assign to Transformation
 * @param {Transformation} transformation 
 */
  assignToTransformation(transformation) {
    this.#matrix.assignToTransformation(transformation);
  }
  /**
   * Assign to SceneGraphComponent
   * @param {SceneGraphComponent} sgc 
   */
  assignToSGC(sgc) {
    this.#matrix.assignToSGC(sgc);
  }
 
}
