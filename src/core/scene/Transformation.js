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
 * JavaScript port of jReality's Transformation class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's Transformation class (from Transformation.java)
// Simplified event system for JavaScript environment

import { SceneGraphNode } from './SceneGraphNode.js';
import * as Rn from '../math/Rn.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * Event fired when transformation matrix changes
 */
export class TransformationEvent extends Event {
  /**
   * @param {Transformation} source - The transformation that changed
   */
  constructor(source) {
    super('transformationChanged');
    this.source = source;
  }
}

/**
 * A simple transformation class which wraps a 4x4 real matrix. Access is read-only.
 * When contained as a field in an instance of SceneGraphComponent,
 * this transformation is applied to any geometry contained in the component as well as 
 * to all children.
 * 
 * For generating and manipulating matrices meeting specific constraints (isometries, etc.)
 * see P3, MatrixBuilder and FactoredMatrix.
 */
export class Transformation extends SceneGraphNode {
  
  /**
   * @type {number[]} The 4x4 transformation matrix
   */
  #theMatrix;
  
  /**
   * @type {boolean} Flag indicating if matrix has changed
   */
  #matrixChanged = false;

  /**
   * @type {number} Counter for unnamed transformations
   */
  static #UNNAMED_ID = 0;

  /**
   * Generate a new transform with given matrix
   * If m is null, use identity matrix.
   * @param {string} [name] - Name for the transformation
   * @param {number[]|null} [m] - The 4x4 matrix (16 elements)
   */
  constructor(name, m) {
    if (typeof name !== 'string') {
      // Handle overloaded constructors
      if (Array.isArray(name)) {
        // constructor(matrix)
        m = name;
        name = `trafo ${Transformation.#UNNAMED_ID++}`;
      } else if (name === undefined) {
        // constructor()
        name = `trafo ${Transformation.#UNNAMED_ID++}`;
        m = null;
      }
    }
    
    super(name || `trafo ${Transformation.#UNNAMED_ID++}`);
    
    if (m === null || m === undefined) {
      this.#theMatrix = Rn.identityMatrix(4);
    } else {
      if (m.length !== 16) {
        throw new Error('Matrix must have 16 elements');
      }
      this.#theMatrix = m.slice(); // Clone the array
    }
  }

  /**
   * Get a copy of the current matrix
   * @param {number[]|null} [aMatrix] - Optional array to fill
   * @returns {number[]} The matrix array
   */
  getMatrix(aMatrix = null) {
    this.startReader();
    try {
      if (aMatrix !== null && aMatrix.length !== 16) {
        throw new Error('Matrix array must have length 16');
      }
      if (aMatrix === null) aMatrix = new Array(16);
      for (let i = 0; i < 16; i++) {
        aMatrix[i] = this.#theMatrix[i];
      }
      return aMatrix;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Assign aMatrix to this Transformation
   * @param {number[]} aMatrix - The new matrix values
   */
  setMatrix(aMatrix) {
    if (aMatrix.length !== 16) {
      throw new Error('Matrix must have 16 elements');
    }
    this.checkReadOnly();
    this.startWriter();
    try {
      for (let i = 0; i < 16; i++) {
        this.#theMatrix[i] = aMatrix[i];
      }
      this.fireTransformationChanged();
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Multiply this matrix on the right by T: this = this * T
   * @param {number[]} T - Matrix to multiply on the right
   */
  multiplyOnRight(T) {
    this.startWriter();
    try {
      Rn.times(this.#theMatrix, this.#theMatrix, T);
      this.fireTransformationChanged();
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Multiply this matrix on the left by T: this = T * this
   * @param {number[]} T - Matrix to multiply on the left
   */
  multiplyOnLeft(T) {
    this.startWriter();
    try {
      Rn.times(this.#theMatrix, T, this.#theMatrix);
      this.fireTransformationChanged();
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Add a transformation listener
   * @param {function(TransformationEvent): void} listener - The listener function
   */
  addTransformationListener(listener) {
    this.startReader();
    this.addEventListener('transformationChanged', listener);
    this.finishReader();
  }

  /**
   * Remove a transformation listener
   * @param {function(TransformationEvent): void} listener - The listener function
   */
  removeTransformationListener(listener) {
    this.startReader();
    this.removeEventListener('transformationChanged', listener);
    this.finishReader();
  }

  /**
   * Called when writing is finished - fires events if matrix changed
   * @protected
   */
  writingFinished() {
    if (this.#matrixChanged) {
      this.dispatchEvent(new TransformationEvent(this));
      this.#matrixChanged = false;
    }
  }

  /**
   * Mark that the transformation has changed
   * @protected
   */
  fireTransformationChanged() {
    this.#matrixChanged = true;
  }

  /**
   * Check if this transformation is read-only
   * @returns {boolean} True if read-only, false otherwise
   */
  isReadOnly() {
    // For now, we'll assume transformations are writable unless explicitly set otherwise
    // This could be enhanced later with proper read-only state management
    return false;
  }

  /**
   * Accept a visitor
   * @param {SceneGraphVisitor} visitor - The visitor
   */
  accept(visitor) {
    this.startReader();
    try {
      visitor.visitTransformation?.(this) || visitor.visit(this);
    } finally {
      this.finishReader();
    }
  }
}
