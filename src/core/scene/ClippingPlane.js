// JavaScript port of jReality's ClippingPlane class (from ClippingPlane.java)

import { Geometry } from './Geometry.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * A clipping plane through the origin with normal pointing in positive z direction.
 * All points with <b>positive</b> z will be clipped away. Insert into scene graph using
 * {@link SceneGraphComponent#setGeometry} and use transformations to get clipping plane 
 * into arbitrary position. To flip the clipped side, attach a reflection in <i>z=0</i> 
 * to the SceneGraphComponent containing the clipping plane.
 */
export class ClippingPlane extends Geometry {
  
  /**
   * @type {number} Counter for unnamed clipping planes
   */
  static #UNNAMED_ID = 0;

  /**
   * @type {boolean} Apply only to this sub-graph?
   */
  #local = false;

  /**
   * @type {number[]} Plane equation [a, b, c, d] where ax + by + cz + d = 0
   */
  #plane = [0, 0, -1, 0];

  /**
   * Create a new ClippingPlane
   * @param {string} [name] - Optional name for the clipping plane
   */
  constructor(name = null) {
    if (name === null) {
      name = `clippingPlane ${ClippingPlane.#UNNAMED_ID++}`;
    }
    super(name);
  }

  /**
   * Check if this clipping plane is local (applies only to this sub-graph)
   * @returns {boolean}
   */
  isLocal() {
    return this.#local;
  }

  /**
   * Set whether this clipping plane is local
   * @param {boolean} local - True if applies only to this sub-graph
   */
  setLocal(local) {
    this.#local = local;
  }

  /**
   * Get the plane equation
   * @returns {number[]} Plane equation [a, b, c, d] where ax + by + cz + d = 0
   */
  getPlane() {
    return [...this.#plane]; // Return copy
  }

  /**
   * Set the plane equation
   * @param {number[]} plane - Plane equation [a, b, c, d] where ax + by + cz + d = 0
   */
  setPlane(plane) {
    if (!Array.isArray(plane) || plane.length !== 4) {
      throw new Error('Plane must be an array of 4 numbers [a, b, c, d]');
    }
    this.#plane = [...plane]; // Store copy
  }

  /**
   * Accept a visitor
   * @param {SceneGraphVisitor} visitor - The visitor
   */
  accept(visitor) {
    this.startReader();
    try {
      if (visitor.visitClippingPlane) {
        visitor.visitClippingPlane(this);
      } else {
        visitor.visitGeometry?.(this) || visitor.visit(this);
      }
    } finally {
      this.finishReader();
    }
  }
}

