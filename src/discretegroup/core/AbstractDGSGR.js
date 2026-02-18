/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { DiscreteGroupElement } from './DiscreteGroupElement.js';

/**
 * Abstract base class for discrete-group scene graph representations.
 */
export class AbstractDGSGR {
  setElementList(_list) {
    throw new Error('AbstractDGSGR.setElementList() must be implemented');
  }

  getElementList() {
    throw new Error('AbstractDGSGR.getElementList() must be implemented');
  }

  getRepresentationRoot() {
    throw new Error('AbstractDGSGR.getRepresentationRoot() must be implemented');
  }

  getSceneGraphRepn() {
    throw new Error('AbstractDGSGR.getSceneGraphRepn() must be implemented');
  }

  getFundamentalRegion() {
    throw new Error('AbstractDGSGR.getFundamentalRegion() must be implemented');
  }

  setConstraint(_c) {
    throw new Error('AbstractDGSGR.setConstraint() must be implemented');
  }

  getConstraint() {
    throw new Error('AbstractDGSGR.getConstraint() must be implemented');
  }

  setAppList(_aplist) {
    throw new Error('AbstractDGSGR.setAppList() must be implemented');
  }

  update() {}

  /**
   * Apply a constraint by toggling visibility of each child in scene graph representation.
   * @param {AbstractDGSGR} dgsgr
   * @param {import('./DiscreteGroupConstraint.js').DiscreteGroupConstraint} constraint
   */
  static applyConstraint(dgsgr, constraint) {
    const root = dgsgr.getSceneGraphRepn();
    if (!root) return;
    const n = root.getChildComponentCount();
    const dge = new DiscreteGroupElement();
    if (typeof constraint.setUseCount === 'function') {
      constraint.setUseCount(true);
      if (typeof constraint.reset === 'function') constraint.reset();
    }
    for (let i = 0; i < n; ++i) {
      const child = root.getChildComponent(i);
      const trafo = child.getTransformation();
      if (!trafo) continue;
      dge.setArray(trafo.getMatrix());
      const split = (child.getName() || '').split(' ');
      dge.setWord(split.length === 1 ? '' : split[1]);
      child.setVisible(!!constraint.acceptElement(dge));
    }
  }
}

