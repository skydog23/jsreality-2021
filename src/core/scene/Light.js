/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SceneGraphNode } from './SceneGraphNode.js';
import { Color } from '../util/Color.js';

/**
 * Abstract base class for all lights in the scene graph.
 * Carries a color and an intensity as common properties.
 *
 * Port of de.jreality.scene.Light.
 */
export class Light extends SceneGraphNode {

  #color = new Color(255, 255, 255);
  #intensity = 0.75;
  #global = true;
  #ambientFake = false;

  constructor(name = 'light') {
    super(name);
  }

  getColor() {
    return this.#color;
  }

  setColor(color) {
    this.#color = color;
    this.#fireLightChanged();
  }

  /**
   * Returns the light color as [r, g, b] floats in [0,1], pre-multiplied by intensity.
   */
  getScaledColorAsFloat() {
    const c = this.#color;
    return [
      (c.getRed() / 255) * this.#intensity,
      (c.getGreen() / 255) * this.#intensity,
      (c.getBlue() / 255) * this.#intensity,
    ];
  }

  getIntensity() {
    return this.#intensity;
  }

  setIntensity(intensity) {
    this.#intensity = intensity;
    this.#fireLightChanged();
  }

  isGlobal() {
    return this.#global;
  }

  setGlobal(global) {
    this.#global = global;
    this.#fireLightChanged();
  }

  isAmbientFake() {
    return this.#ambientFake;
  }

  setAmbientFake(b) {
    this.#ambientFake = b;
    this.#fireLightChanged();
  }

  #fireLightChanged() {
    this.dispatchEvent(new Event('lightChanged'));
  }

  accept(v) {
    v.visitLight(this);
  }
}
