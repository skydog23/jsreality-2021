// JavaScript port of jReality's Sphere class (from Sphere.java)

import { Geometry } from './Geometry.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * Sphere centered at (0, 0, 0) with radius 1. 
 * Use scene graph transformations to change size and position.
 */
export class Sphere extends Geometry {
  
  /**
   * @type {number} Counter for unnamed spheres
   */
  static #UNNAMED_ID = 0;

  /**
   * Create a new Sphere
   * @param {string} [name] - Optional name for the sphere
   */
  constructor(name = null) {
    if (name === null) {
      name = `sphere ${Sphere.#UNNAMED_ID++}`;
    }
    super(name);
  }

  /**
   * Accept a visitor
   * @param {SceneGraphVisitor} visitor - The visitor
   */
  accept(visitor) {
    this.startReader();
    try {
      if (visitor.visitSphere) {
        visitor.visitSphere(this);
      } else {
        visitor.visitGeometry?.(this) || visitor.visit(this);
      }
    } finally {
      this.finishReader();
    }
  }
}

