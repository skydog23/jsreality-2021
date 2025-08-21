// JavaScript port of jReality's FactoredMatrix class (from FactoredMatrix.java)
// This file is auto-generated to match the Java version as closely as possible.
// @ts-check

import { Matrix } from './Matrix.js';
import { Quaternion } from './Quaternion.js';
import * as Rn from './Rn.js';
import * as Pn from './Pn.js';
import * as P3 from './P3.js';

/** @typedef {number[]} Matrix4 */

/**
 * The FactoredMatrix class is a subclass of Matrix supporting a canonical
 * factorization of the matrix into simpler factors. The class provides a
 * variety of methods for setting and getting the transformation. One instance
 * can handle a series of transformations, based on the so-called polar
 * decomposition.
 * 
 * The matrix M is factored as the matrix product M=T*R*S. Note
 * that matrices act on column vectors which stand to the right of the matrix. S
 * is a "stretch" or "scale" matrix -- a diagonal matrix. R is an arbitrary
 * rotation of Euclidean 3-space, and T is a translation.
 * 
 * NOTE: The full polar decomposition includes a second rotation U that conjugates 
 * the scaling matrix, i.e., M=TRUSU'. We assume that U is the identity, which 
 * amounts to assuming that M has no shearing component.
 * 
 * Users may set the matrix directly, then the factors will be computed and are
 * accessible. Or, the user can set one or more of the factors, and the
 * corresponding matrix is calculated and made available. The update mechanism
 * either decomposes or composes the matrix depending on the type of the most
 * recent "setter" called by the user.
 * 
 * This class is designed to work with any of the classical homogeneous
 * geometries: euclidean, elliptic, or hyperbolic. The variable metric
 * controls which geometry is active.
 * 
 * By default the origin (0,0,0,1) is the fixed point of the scale and rotation
 * part of the transformation. It is however possible to specify another
 * center. The resulting matrix is then T*C*R*S*IC where C is the translation 
 * taking the origin to C, and IC is its inverse. The fixed point for the 
 * rotation and stretch is then center.
 * 
 * It is also possible to work with reflections, since any reflection can be
 * factored as T*R*S*G where G is the diagonal matrix {-1,-1,-1,1} (that is,
 * reflection around the origin). A matrix is considered a reflection if its
 * determinant is negative.
 * 
 * NOTE: Some constructors from the Java version that depend on scene graph classes 
 * are not yet implemented and will be added when those classes are translated:
 * - FactoredMatrix(Transformation trafo) constructor
 */
export class FactoredMatrix extends Matrix {

  /**
   * @type {number[]}
   */
  #translationVector;
  
  /**
   * @type {number[]}
   */
  #centerVector;
  
  /**
   * @type {number[]}
   */
  #stretchVector;
  
  /**
   * @type {number[]}
   */
  #rotationAxis;
  
  /**
   * @type {number[]}
   */
  #centerMatrix;
  
  /**
   * @type {number[]}
   */
  #invCenterMatrix;

  /**
   * @type {Quaternion}
   */
  #rotationQ;
  
  /**
   * @type {Quaternion}
   */
  #stretchRotationQ;

  /**
   * @type {boolean}
   */
  #factorHasChanged = false;
  
  /**
   * @type {boolean}
   */
  #matrixHasChanged = false;
  
  /**
   * @type {boolean}
   */
  #isFactored = false;
  
  /**
   * @type {boolean}
   */
  #isIdentity = false;
  
  /**
   * @type {boolean}
   */
  #isSpecial = false;
  
  /**
   * @type {boolean}
   */
  #isReflection = false;
  
  /**
   * @type {boolean}
   */
  #useCenter = false;

  /**
   * @type {number}
   */
  #metric;

  /**
   * Generate a new transform with given metric and matrix
   * @param {number} [metric=Pn.EUCLIDEAN] - The metric to use
   * @param {number[]|Matrix|null} [m] - Initial matrix data, if null uses identity
   */
  constructor(metric = Pn.EUCLIDEAN, m = null) {
    super(m);
    this.#metric = metric;
    this.#translationVector = new Array(4);
    this.#stretchVector = new Array(4);
    this.#rotationAxis = new Array(3);
    this.#rotationQ = new Quaternion(1.0, 0.0, 0.0, 0.0);
    this.#stretchRotationQ = new Quaternion(1.0, 0.0, 0.0, 0.0);
    this.#matrixHasChanged = true;
    this.#useCenter = false;
    this.update();
  }

  /**
   * Copy constructor with metric
   * @param {Matrix} m 
   * @param {number} metric 
   * @returns {FactoredMatrix}
   */
  static fromMatrix(m, metric) {
    return new FactoredMatrix(metric, m.getArray().slice());
  }

  /**
   * Copy constructor
   * @param {FactoredMatrix} fm 
   * @returns {FactoredMatrix}
   */
  static fromFactoredMatrix(fm) {
    return FactoredMatrix.fromMatrix(fm, fm.getMetric());
  }

  /**
   * Get the underlying matrix array (updates if factors changed)
   * @returns {number[]}
   */
  getArray() {
    if (this.#factorHasChanged) this.update();
    return super.getArray();
  }

  /**
   * Assign from another FactoredMatrix
   * @param {FactoredMatrix} fm 
   */
  assignFromFactored(fm) {
    super.assignFrom(fm);
    this.#metric = fm.getMetric();
    this.#matrixHasChanged = true;
    this.update();
  }

  /**
   * Override assignFrom to mark matrix as changed
   * @param {number[]|Matrix} initValue 
   */
  assignFrom(initValue) {
    super.assignFrom(initValue);
    this.#matrixHasChanged = true;
    this.update();
  }

  /**
   * Check if the matrix has negative determinant (is a reflection)
   * @returns {boolean}
   */
  getIsReflection() {
    return this.#isReflection;
  }

  /**
   * Set the matrix to be a reflection
   * @param {boolean} aVal 
   */
  setIsReflection(aVal) {
    if (aVal === this.#isReflection) return;
    this.#isReflection = aVal;
    this.#factorHasChanged = true;
    this.update();
  }

  /**
   * Check if transform uses a separate center for rotation and stretch
   * @returns {boolean}
   */
  getUseCenter() {
    return this.#useCenter;
  }

  /**
   * Check if determinant is +/- 1 (within tolerance)
   * @returns {boolean}
   */
  getIsSpecial() {
    if (this.#isMatrixHasChanged() || this.#factorHasChanged) {
      this.update();
    }
    return this.#isSpecial;
  }

  /**
   * Set the center of the transformation
   * @param {number[]|null} aVec - The position of the center (3-vector or 4-vector)
   * @param {boolean} [keepMatrix=false] - Whether to preserve the matrix value
   */
  setCenter(aVec, keepMatrix = false) {
    if (aVec === null) {
      this.#useCenter = false;
      return;
    }
    this.#useCenter = true;
    if (this.#centerVector === null) {
      this.#centerVector = new Array(4);
    }
    if (this.#centerMatrix === null) {
      this.#centerMatrix = new Array(16);
    }
    if (this.#invCenterMatrix === null) {
      this.#invCenterMatrix = new Array(16);
    }
    this.#centerVector[3] = 1.0;
    this.#centerVector.set(aVec.slice(0, Math.min(aVec.length, 3)));
    P3.makeTranslationMatrix(this.#centerMatrix, this.#centerVector, this.#metric);
    Rn.inverse(this.#invCenterMatrix, this.#centerMatrix);

    if (keepMatrix) {
      this.#matrixHasChanged = true;
      this.#factorHasChanged = false;
    } else {
      this.#matrixHasChanged = false;
      this.#factorHasChanged = true;
    }
    this.update();
  }

  /**
   * Get the center vector (as homogeneous 4-vector)
   * @returns {number[]}
   */
  getCenter() {
    return this.#centerVector;
  }

  /**
   * Set the translation factor with three components
   * @param {number} tx 
   * @param {number} ty 
   * @param {number} tz 
   */
  setTranslation(tx, ty, tz) {
    this.#translationVector[0] = tx;
    this.#translationVector[1] = ty;
    this.#translationVector[2] = tz;
    this.#translationVector[3] = 1.0;
    this.#factorHasChanged = true;
    this.update();
  }

  /**
   * Set the translation part with a vector
   * @param {number[]} aTransV 
   */
  setTranslationVector(aTransV) {
    if (aTransV.length === 4 && this.#metric === Pn.EUCLIDEAN && aTransV[3] === 0.0) {
      throw new Error('Invalid euclidean translation');
    }
    const n = Math.min(aTransV.length, 4);
    this.#translationVector.set(aTransV.slice(0, n));
    this.#translationVector.set(P3.originP3.slice(n), n);
    this.#factorHasChanged = true;
    this.update();
  }

  /**
   * Get the translation vector
   * @returns {number[]}
   */
  getTranslation() {
    if (this.#isMatrixHasChanged()) this.update();
    return this.#translationVector;
  }

  /**
   * Set the rotation axis using three components
   * @param {number} ax 
   * @param {number} ay 
   * @param {number} az 
   */
  setRotationAxis(ax, ay, az) {
    const axis = [ax, ay, az];
    this.setRotation(this.getRotationAngle(), axis);
  }

  /**
   * Set the rotation axis using a 3-vector
   * @param {number[]} axis 
   */
  setRotationAxisVector(axis) {
    this.setRotation(this.getRotationAngle(), axis);
  }

  /**
   * Set the rotation angle
   * @param {number} angle - The angle in radians
   */
  setRotationAngle(angle) {
    this.setRotation(angle, this.getRotationAxis());
  }

  /**
   * Set angle and axis simultaneously
   * @param {number} angle 
   * @param {number[]} axis 
   */
  setRotation(angle, axis) {
    if (typeof axis === 'undefined') {
      // Called with just angle
      this.setRotationAngle(angle);
      return;
    }
    Quaternion.makeRotationQuaternionAngle(this.#rotationQ, angle, axis);
    this.#factorHasChanged = true;
    this.update();
  }

  /**
   * Set rotation using components
   * @param {number} angle 
   * @param {number} ax 
   * @param {number} ay 
   * @param {number} az 
   */
  setRotationComponents(angle, ax, ay, az) {
    const axis = [ax, ay, az];
    this.setRotation(angle, axis);
  }

  /**
   * Set rotation using a quaternion
   * @param {Quaternion} aQ 
   */
  setRotationQuaternion(aQ) {
    Quaternion.copy(this.#rotationQ, aQ);
    Quaternion.normalize(this.#rotationQ, this.#rotationQ);
    this.getRotationAxis();
    this.#factorHasChanged = true;
    this.update();
  }

  /**
   * Get the rotation axis
   * @returns {number[]}
   */
  getRotationAxis() {
    return Rn.normalize(this.#rotationAxis, Quaternion.IJK(this.#rotationAxis, this.#rotationQ));
  }

  /**
   * Get the rotation angle (in radians)
   * @returns {number}
   */
  getRotationAngle() {
    const angle = 2.0 * Math.acos(Math.abs(this.#rotationQ.re));
    return angle;
  }

  /**
   * Get the rotation as a unit quaternion
   * @returns {Quaternion}
   */
  getRotationQuaternion() {
    if (this.#isMatrixHasChanged()) this.update();
    return this.#rotationQ;
  }

  /**
   * Set uniform stretch factor
   * @param {number} stretch 
   */
  setStretch(stretch) {
    this.#stretchVector[0] = stretch;
    this.#stretchVector[1] = stretch;
    this.#stretchVector[2] = stretch;
    this.#stretchVector[3] = 1.0;
    this.#factorHasChanged = true;
    this.update();
  }

  /**
   * Set stretch using three components
   * @param {number} sx 
   * @param {number} sy 
   * @param {number} sz 
   */
  setStretchComponents(sx, sy, sz) {
    this.#stretchVector[0] = sx;
    this.#stretchVector[1] = sy;
    this.#stretchVector[2] = sz;
    this.#stretchVector[3] = 1.0;
    this.#factorHasChanged = true;
    this.update();
  }

  /**
   * Set stretch using a 3-vector
   * @param {number[]} stretchV 
   */
  setStretchVector(stretchV) {
    this.#stretchVector.set(stretchV.slice(0, Math.min(stretchV.length, 3)));
    if (stretchV.length === 3) {
      this.#stretchVector[3] = 1.0;
    }
    this.#factorHasChanged = true;
    this.update();
  }

  /**
   * Get the stretch vector
   * @returns {number[]}
   */
  getStretch() {
    if (this.#isMatrixHasChanged()) this.update();
    return this.#stretchVector;
  }

  /**
   * Update the current state of the transformation
   */
  update() {
    const isFlipped = [this.#isReflection];
    const MC = new Array(16);
    let TTmp;
    
    if (this.#factorHasChanged) {
      P3.composeMatrixFromFactors(this.getArray(), this.#translationVector,
        this.#rotationQ, this.#stretchRotationQ, this.#stretchVector, this.#isReflection,
        this.#metric);
      if (this.#useCenter) {
        Rn.timesMatrix(this.getArray(), this.getArray(), this.#invCenterMatrix);
        Rn.timesMatrix(this.getArray(), this.#centerMatrix, this.getArray());
      }
    } else if (this.#isMatrixHasChanged()) {
      if (this.#useCenter) {
        Rn.timesMatrix(MC, this.getArray(), this.#centerMatrix);
        Rn.timesMatrix(MC, this.#invCenterMatrix, MC);
        TTmp = MC;
      } else {
        TTmp = this.getArray();
      }
      P3.factorMatrix(TTmp, this.#translationVector, this.#rotationQ,
        this.#stretchRotationQ, this.#stretchVector, isFlipped, this.#metric);
      this.#isReflection = isFlipped[0];
    }
    this.#isSpecial = Rn.isSpecialMatrix(this.getArray(), Matrix.TOLERANCE);
    this.#matrixHasChanged = this.#factorHasChanged = this.resetMatrixChanged();
  }

  /**
   * Get the inverse as a FactoredMatrix
   * @returns {FactoredMatrix}
   */
  getInverseFactored() {
    return new FactoredMatrix(this.getMetric(), Rn.inverse(null, this.getArray()));
  }

  /**
   * Get the metric
   * @returns {number}
   */
  getMetric() {
    return this.#metric;
  }

  /**
   * Check if matrix has changed
   * @returns {boolean}
   */
  #isMatrixHasChanged() {
    return this.#matrixHasChanged || this.matrixChanged;
  }

  /**
   * Get the rotation matrix
   * @returns {Matrix}
   */
  getRotation() {
    const m = new Matrix();
    Quaternion.quaternionToRotationMatrix(m.getArray(), this.getRotationQuaternion());
    return m;
  }

  /**
   * String representation
   * @returns {string}
   */
  toString() {
    const rot = `rotation + ${Rn.toString(this.getRotationAxis())} ${this.getRotationAngle() / Math.PI}`;
    const trans = `translation + ${Rn.toString(this.getTranslation())}`;
    const stretch = `scale + ${Rn.toString(this.getStretch())}`;
    return `metric=${this.#metric}\n${rot}\n${trans}\n${stretch}\n`;
  }
}
