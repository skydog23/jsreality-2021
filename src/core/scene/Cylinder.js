/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's Cylinder class (from Cylinder.java)

import { Geometry } from './Geometry.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * Cylinder with axis from (0,0,-1) to (0,0,1) and radius 1. 
 * Put into SceneGraphComponent and use transformations to get a scaled cylinder 
 * in arbitrary position.
 * 
 * TODO: Resolve the fact that backends differ on whether it is a closed or an open cylinder.
 */
export class Cylinder extends Geometry {
  
  /**
   * @type {number} Counter for unnamed cylinders
   */
  static #UNNAMED_ID = 0;

  /**
   * Create a new Cylinder
   * @param {string} [name] - Optional name for the cylinder
   */
  constructor(name = null) {
    if (name === null) {
      name = `cylinder ${Cylinder.#UNNAMED_ID++}`;
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
      if (visitor.visitCylinder) {
        visitor.visitCylinder(this);
      } else {
        visitor.visitGeometry?.(this) || visitor.visit(this);
      }
    } finally {
      this.finishReader();
    }
  }
}

