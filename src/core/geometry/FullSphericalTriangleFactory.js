/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { SphericalTriangleFactory } from './SphericalTriangleFactory.js';

export class FullSphericalTriangleFactory {
  triangle = new SphericalTriangleFactory();
  dualTriangle = new SphericalTriangleFactory();
  both = new SceneGraphComponent('both');

  constructor(triangle = null) {
    if (triangle) this.triangle = triangle;
    this.triangle.setDual(false);
    this.dualTriangle.setDual(true);
    this.both.addChildren(this.triangle.getSceneGraphComponent(), this.dualTriangle.getSceneGraphComponent());
    this.update();
  }

  update() {
    this.triangle.update();
    const sides = this.triangle.getSides().map((v) => v.slice());
    this.dualTriangle.setVerts(sides);
    this.dualTriangle.update();
  }

  getSceneGraphComponent() { return this.both; }
  getTriangle() { return this.triangle; }
  getDualTriangle() { return this.dualTriangle; }
}

