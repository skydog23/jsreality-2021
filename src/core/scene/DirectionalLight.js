/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Light } from './Light.js';

let UNNAMED_ID = 0;

/**
 * Directional (parallel / distant) light.
 * Does not decay with distance.  The light direction is the local z-axis;
 * use scene graph transformations on a parent component to orient it.
 *
 * Port of de.jreality.scene.DirectionalLight.
 */
export class DirectionalLight extends Light {

  constructor(name) {
    super(name ?? `dir-light ${UNNAMED_ID++}`);
  }

  accept(v) {
    v.visitDirectionalLight(this);
  }
}
