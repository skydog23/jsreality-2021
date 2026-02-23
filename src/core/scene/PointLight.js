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
 * Point light situated at the local origin (0,0,0,1).
 * Use scene graph transformations on a parent component to position it.
 *
 * Attenuation is proportional to 1 / (A0 + A1·d + A2·d²)
 * where d is the distance from the illuminated point to the light.
 *
 * Port of de.jreality.scene.PointLight.
 */
export class PointLight extends Light {

  #falloffA0 = 0.5;
  #falloffA1 = 0.5;
  #falloffA2 = 0;

  constructor(name) {
    super(name ?? `point-light ${UNNAMED_ID++}`);
  }

  getFalloffA0() { return this.#falloffA0; }
  getFalloffA1() { return this.#falloffA1; }
  getFalloffA2() { return this.#falloffA2; }

  setFalloffA0(v) { this.#falloffA0 = v; }
  setFalloffA1(v) { this.#falloffA1 = v; }
  setFalloffA2(v) { this.#falloffA2 = v; }

  setFalloff(a0, a1, a2) {
    this.#falloffA0 = a0;
    this.#falloffA1 = a1;
    this.#falloffA2 = a2;
  }

  accept(v) {
    v.visitPointLight(this);
  }
}
