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
/** @typedef {import('../scene/Light.js').Light} Light */

/**
 * Traverses a scene graph collecting paths to all Light nodes.
 * Only visits visible SceneGraphComponents.
 */
export class LightCollector extends SceneGraphVisitor {
  /** @type {SceneGraphComponent} */
  #sgc;
  /** @type {SceneGraphPath} */
  #currentPath;
  /** @type {SceneGraphPath[]} */
  #lightList;

  /**
   * @param {SceneGraphComponent} root
   */
  constructor(root) {
    super();
    this.#sgc = root;
    this.#lightList = [];
  }

  /**
   * Start traversal and return collected light paths.
   * @returns {SceneGraphPath[]}
   */
  visit() {
    this.#currentPath = new SceneGraphPath();
    this.#lightList = [];
    if (this.#sgc == null) return this.#lightList;
    this.#sgc.accept(this);
    return this.#lightList;
  }

  /**
   * @param {Light} l
   */
  visitLight(l) {
    const foundOne = this.#currentPath.clone();
    foundOne.push(l);
    this.#lightList.push(foundOne);
  }

  /**
   * @param {SceneGraphComponent} c
   */
  visitComponent(c) {
    if (!c.isVisible()) return;
    this.#currentPath.push(c);
    c.childrenAccept(this);
    this.#currentPath.pop();
  }
}
