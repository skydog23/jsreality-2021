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

/** @typedef {import('../scene/SceneGraphNode.js').SceneGraphNode} SceneGraphNode */
/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */

/**
 * @callback PathMatcher
 * @param {SceneGraphPath} path
 * @returns {boolean}
 */

/**
 * Traverses a scene graph collecting all paths from a root SceneGraphComponent
 * that satisfy a given matcher predicate.
 */
export class PathCollector extends SceneGraphVisitor {
  /** @type {SceneGraphComponent} */
  #root;
  /** @type {SceneGraphPath} */
  #currentPath = new SceneGraphPath();
  /** @type {SceneGraphPath[]} */
  #collectedPaths = [];
  /** @type {PathMatcher} */
  #matcher;

  /**
   * @param {PathMatcher} matcher
   * @param {SceneGraphComponent} root
   */
  constructor(matcher, root) {
    super();
    this.#matcher = matcher;
    this.#root = root;
  }

  /**
   * Start traversal and return collected paths.
   * Also serves as the catch-all visitor for non-component nodes: when called
   * with a node argument, pushes it onto the path, checks the matcher, and pops.
   * @param {SceneGraphNode} [node]
   * @returns {SceneGraphPath[]|undefined}
   */
  visit(node) {
    if (node === undefined) {
      this.#root.accept(this);
      return this.#collectedPaths;
    }
    this.#currentPath.push(node);
    if (this.#currentPath.getLength() > 0 && this.#matcher(this.#currentPath)) {
      this.#collectedPaths.push(this.#currentPath.clone());
    }
    this.#currentPath.pop();
  }

  /**
   * @param {SceneGraphComponent} c
   */
  visitComponent(c) {
    this.#currentPath.push(c);
    if (this.#matcher(this.#currentPath)) {
      this.#collectedPaths.push(this.#currentPath.clone());
    }
    c.childrenAccept(this);
    this.#currentPath.pop();
  }
}
