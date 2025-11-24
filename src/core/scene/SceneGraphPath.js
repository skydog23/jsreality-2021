/**
 * JavaScript port of jReality's SceneGraphPath class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's SceneGraphPath class (from SceneGraphPath.java)
// Represents a directed path through the scene graph hierarchy

import * as Rn from '../math/Rn.js';
import { SceneGraphComponent } from './SceneGraphComponent.js';

/** @typedef {import('./SceneGraphNode.js').SceneGraphNode} SceneGraphNode */
/** @typedef {import('./Transformation.js').Transformation} Transformation */

/**
 * A SceneGraphPath represents a directed path between two nodes in the scene graph. 
 * Technically it begins with list of SceneGraphComponent's, but the final element may be 
 * a SceneGraphNode contained in the final SceneGraphComponent.
 * 
 * This allows addressing the sub-nodes contained as fields in the SceneGraphComponent 
 * (such as lights, camera, geometry, appearance). But it is not required that the path 
 * ends in such a SceneGraphNode; it can also end in a SceneGraphComponent.
 * 
 * There are methods for pushing and popping elements onto the path, useful for instances
 * of SceneGraphVisitor.
 * 
 * There are methods for ascertaining the matrix transformation associated to the path
 * (by multiplying the instances of Transformation occurring on the path).
 * 
 * Note: This class takes no care of the elements being inserted. The method isValid()
 * gives information if this path exists in the scenegraph.
 * 
 * This class does not allow specifying a path that begins somewhere in a scene graph,
 * goes up to the root, and then descends again. All paths go down from the root.
 * 
 * The methods equal() and hashCode() always represent the current state of the path,
 * so make sure you do not change paths that are put into some sort of Map etc.!
 */
export class SceneGraphPath {
  
  /**
   * @type {SceneGraphNode[]} The path as an array of scene graph nodes
   */
  #path = [];

  /**
   * @type {number} Counter for unnamed paths
   */
  static #UNNAMED_ID = 0;

  /**
   * Create a new SceneGraphPath
   * @param {...SceneGraphNode|SceneGraphNode[]|SceneGraphPath} args - Nodes, array of nodes, or another path to copy
   */
  constructor(...args) {
    if (args.length === 0) {
      // Empty constructor
      this.#path = [];
    } else if (args.length === 1) {
      const arg = args[0];
      if (arg instanceof SceneGraphPath) {
        // Copy constructor
        this.#path = [...arg.#path];
      } else if (Array.isArray(arg)) {
        // Array constructor
        this.#path = [...arg];
      } else {
        // Single node
        this.#path = [arg];
      }
    } else {
      // Varargs constructor
      this.#path = [...args];
    }
  }

  /**
   * Create a SceneGraphPath from a list of nodes
   * @param {SceneGraphNode[]} list - Array of nodes
   * @returns {SceneGraphPath}
   */
  static fromList(list) {
    const path = new SceneGraphPath();
    path.#path = [...list];
    return path;
  }

  /**
   * Get string representation of the path
   * @returns {string}
   */
  toString() {
    if (this.#path.length === 0) return "<< empty path >>";
    
    const names = this.#path.map(node => node.getName());
    return names.join(" : ");
  }

  /**
   * Clone this path (creates a new path with the same nodes)
   * @returns {SceneGraphPath}
   */
  clone() {
    return new SceneGraphPath(this);
  }

  /**
   * Convert path to a regular array
   * @returns {SceneGraphNode[]}
   */
  toList() {
    return [...this.#path];
  }

  /**
   * Get an iterator over the path nodes
   * @returns {Iterator<SceneGraphNode>}
   */
  *[Symbol.iterator]() {
    for (const node of this.#path) {
      yield node;
    }
  }

  /**
   * Get an iterator starting from a specific position
   * @param {number} start - Starting index
   * @returns {Iterator<SceneGraphNode>}
   */
  *iterator(start = 0) {
    for (let i = start; i < this.#path.length; i++) {
      yield this.#path[i];
    }
  }

  /**
   * Get a reverse iterator from the given position
   * @param {number} [start] - How many nodes from the end should we leave out?
   * @returns {Iterator<SceneGraphNode>}
   */
  *reverseIterator(start = this.#path.length) {
    for (let i = start - 1; i >= 0; i--) {
      yield this.#path[i];
    }
  }

  /**
   * Get the length of the path
   * @returns {number}
   */
  getLength() {
    return this.#path.length;
  }

  /**
   * Push a node onto the end of the path
   * @param {SceneGraphNode} node - The node to add
   */
  push(node) {
    this.#path.push(node);
  }

  /**
   * Push a node onto the end of the path, returning a new path (immutable operation)
   * @param {SceneGraphNode} node - The node to add
   * @returns {SceneGraphPath} New path with the node added
   */
  pushNew(node) {
    return SceneGraphPath.fromList([...this.#path, node]);
  }

  /**
   * Remove the last node from the path
   * @returns {SceneGraphNode|undefined} The removed node
   */
  pop() {
    return this.#path.pop();
  }

  /**
   * Remove the last node from the path, returning a new path (immutable operation)
   * @returns {SceneGraphPath} New path with the last node removed
   */
  popNew() {
    return SceneGraphPath.fromList(this.#path.slice(0, -1));
  }

  /**
   * Check if the path contains a specific node
   * @param {SceneGraphNode} node - The node to search for
   * @returns {boolean}
   */
  contains(node) {
    return this.#path.includes(node);
  }

  /**
   * Get the first element in the path
   * @returns {SceneGraphNode|undefined}
   */
  getFirstElement() {
    return this.#path[0];
  }

  /**
   * Get the last element in the path
   * @returns {SceneGraphNode|undefined}
   */
  getLastElement() {
    return this.#path[this.#path.length - 1];
  }

  /**
   * Get the last SceneGraphComponent in the path
   * @returns {SceneGraphComponent|undefined}
   */
  getLastComponent() {
    const last = this.#path[this.#path.length - 1];
    if (last instanceof SceneGraphComponent) {
      return last;
    }
    // If last element is not a component, check second to last
    if (this.#path.length >= 2) {
      const secondLast = this.#path[this.#path.length - 2];
      if (secondLast instanceof SceneGraphComponent) {
        return secondLast;
      }
    }
    return undefined;
  }

  /**
   * Clear all nodes from the path
   */
  clear() {
    this.#path.length = 0;
  }

  /**
   * Get the node at a specific index
   * @param {number} index - The index
   * @returns {SceneGraphNode}
   */
  get(index) {
    return this.#path[index];
  }

  /**
   * Replace a node in the path with another node
   * @param {SceneGraphNode} oldNode - The node to replace
   * @param {SceneGraphNode} newNode - The replacement node
   */
  replace(oldNode, newNode) {
    const index = this.#path.indexOf(oldNode);
    if (index === -1) {
      throw new Error(`No such node in path: ${oldNode.getName()}`);
    }
    this.#path[index] = newNode;
  }

  /**
   * Insert a node after an existing node in the path
   * @param {SceneGraphNode} toInsert - The node to insert
   * @param {SceneGraphNode} existing - The existing node to insert after
   */
  insertAfter(toInsert, existing) {
    const index = this.#path.indexOf(existing);
    if (index === -1) {
      throw new Error(`No such node in path: ${existing.getName()}`);
    }
    this.#path.splice(index + 1, 0, toInsert);
  }

  /**
   * Check if the path is really an existing path in the scenegraph
   * @returns {boolean} true if the path exists
   */
  isValid() {
    if (this.#path.length === 0) return true;
    
    for (let i = 0; i < this.#path.length - 1; i++) {
      const parent = this.#path[i];
      const child = this.#path[i + 1];
      
      if (!(parent instanceof SceneGraphComponent)) return false;
      if (!parent.isDirectAncestor(child)) return false;
    }
    return true;
  }

  /**
   * Check if this path equals another path
   * @param {*} other - The other object to compare
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof SceneGraphPath)) return false;
    return this.isEqual(other);
  }

  /**
   * Get hash code for this path
   * @returns {number}
   */
  hashCode() {
    let result = 1;
    for (const element of this.#path) {
      // Use object reference for hash since SceneGraphNodes don't have hashCode
      result = 31 * result + (element.getName?.().length || 0);
    }
    return result;
  }

  /**
   * Check if this path equals another SceneGraphPath
   * @param {SceneGraphPath} anotherPath - The other path
   * @returns {boolean}
   */
  isEqual(anotherPath) {
    if (!anotherPath || this.#path.length !== anotherPath.getLength()) {
      return false;
    }

    for (let i = 0; i < this.#path.length; i++) {
      if (this.#path[i] !== anotherPath.#path[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if this path starts with another path as a prefix
   * @param {SceneGraphPath} potentialPrefix - The potential prefix path
   * @returns {boolean}
   */
  startsWith(potentialPrefix) {
    if (this.getLength() < potentialPrefix.getLength()) return false;
    
    for (let i = 0; i < potentialPrefix.getLength(); i++) {
      if (this.#path[i] !== potentialPrefix.#path[i]) return false;
    }
    return true;
  }

  /*** Matrix calculations ***/

  /**
   * Get the cumulative transformation matrix for the entire path
   * @param {number[]|null} [matrix] - Optional matrix to store result (will be allocated if null)
   * @returns {number[]} 4x4 transformation matrix as flat array
   */
  getMatrix(matrix = null) {
    return this.getMatrixRange(matrix, 0, this.#path.length - 1);
  }

  /**
   * Get the cumulative transformation matrix starting from a specific node
   * @param {number[]|null} [matrix] - Optional matrix to store result
   * @param {number} begin - Starting index
   * @returns {number[]} 4x4 transformation matrix as flat array
   */
  getMatrixFrom(matrix = null, begin = 0) {
    return this.getMatrixRange(matrix, begin, this.#path.length - 1);
  }

  /**
   * Get the inverse of the cumulative transformation matrix for the entire path
   * @param {number[]|null} [invMatrix] - Optional matrix to store result
   * @returns {number[]} 4x4 inverse transformation matrix as flat array
   */
  getInverseMatrix(invMatrix = null) {
    return this.getInverseMatrixRange(invMatrix, 0, this.#path.length - 1);
  }

  /**
   * Get the inverse of the cumulative transformation matrix starting from a specific node
   * @param {number[]|null} [invMatrix] - Optional matrix to store result
   * @param {number} begin - Starting index
   * @returns {number[]} 4x4 inverse transformation matrix as flat array
   */
  getInverseMatrixFrom(invMatrix = null, begin = 0) {
    return this.getInverseMatrixRange(invMatrix, begin, this.#path.length - 1);
  }

  /**
   * Get the cumulative transformation matrix for a range of nodes in the path
   * @param {number[]|null} [matrix] - Optional matrix to store result
   * @param {number} begin - Starting index (inclusive)
   * @param {number} end - Ending index (inclusive)
   * @returns {number[]} 4x4 transformation matrix as flat array
   */
  getMatrixRange(matrix = null, begin = 0, end = this.#path.length - 1) {
    const result = matrix || new Array(16);
    Rn.setIdentityMatrix(result);

    for (let i = begin; i <= end && i < this.#path.length; i++) {
      const node = this.#path[i];
      if (node instanceof SceneGraphComponent) {
        const transformation = node.getTransformation();
        if (transformation) {
          Rn.timesMatrix(result, result, transformation.getMatrix());
        }
      }
    }
    return result;
  }

  /**
   * Get the inverse of the cumulative transformation matrix for a range of nodes
   * @param {number[]|null} [matrix] - Optional matrix to store result
   * @param {number} begin - Starting index (inclusive)
   * @param {number} end - Ending index (inclusive)
   * @returns {number[]} 4x4 inverse transformation matrix as flat array
   */
  getInverseMatrixRange(matrix = null, begin = 0, end = this.#path.length - 1) {
    const forwardMatrix = this.getMatrixRange(null, begin, end);
    const result = matrix || new Array(16);
    return Rn.inverse(result, forwardMatrix);
  }
}
