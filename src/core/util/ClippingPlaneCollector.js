/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import { SceneGraphPath } from '../scene/SceneGraphPath.js';

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/ClippingPlane.js').ClippingPlane} ClippingPlane */

/**
 * Traverses a scene graph collecting paths to all ClippingPlane nodes.
 */
export class ClippingPlaneCollector extends SceneGraphVisitor {
  /** @type {SceneGraphComponent} */
  #sgc;
  /** @type {SceneGraphPath} */
  #currentPath;
  /** @type {SceneGraphPath[]} */
  #clippingPlaneList;

  /**
   * @param {SceneGraphComponent} root
   */
  constructor(root) {
    super();
    this.#sgc = root;
    this.#clippingPlaneList = [];
  }

  /**
   * Start traversal and return collected clipping plane paths.
   * @returns {SceneGraphPath[]}
   */
  visit() {
    this.#currentPath = new SceneGraphPath();
    this.#clippingPlaneList = [];
    if (this.#sgc == null) return this.#clippingPlaneList;
    this.#sgc.accept(this);
    return this.#clippingPlaneList;
  }

  /**
   * @param {ClippingPlane} cp
   */
  visitClippingPlane(cp) {
    const foundOne = this.#currentPath.clone();
    foundOne.push(cp);
    this.#clippingPlaneList.push(foundOne);
  }

  /**
   * @param {SceneGraphComponent} c
   */
  visitComponent(c) {
    this.#currentPath.push(c);
    c.childrenAccept(this);
    this.#currentPath.pop();
  }
}
