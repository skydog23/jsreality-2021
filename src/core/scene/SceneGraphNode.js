/**
 * JavaScript port of jReality's SceneGraphNode class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's SceneGraphNode class (from SceneGraphNode.java)
// Simplified for JavaScript single-threaded environment

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * Base class for scene graph member nodes.
 * Common features of all scene graph nodes are an optional name
 * and a read-only flag.
 * 
 * This JavaScript version simplifies the thread-safe access mechanisms
 * since JavaScript is single-threaded, but maintains the API for compatibility.
 */
export class SceneGraphNode extends EventTarget {
  
  /**
   * @type {boolean}
   */
  #readOnly = false;
  
  /**
   * @type {string}
   */
  #name;
  
  /**
   * @type {*}
   */
  #owner = null;

  /**
   * Global thread safety flag (kept for API compatibility)
   * @type {boolean}
   */
  static #threadsafe = true;

  /**
   * Create a new SceneGraphNode
   * @param {string} name - The name of the node
   */
  constructor(name) {
    super();
    this.#name = name;
  }

  /**
   * Returns the readOnly flag
   * @returns {boolean}
   */
  isReadOnly() {
    this.startReader();
    try {
      return this.#readOnly;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Sets the readOnly flag
   * @param {boolean} newReadOnlyState - The desired readOnly flag value
   */
  setReadOnly(newReadOnlyState) {
    this.startWriter();
    this.#readOnly = newReadOnlyState;
    this.finishWriter();
  }

  /**
   * Check if this node is read-only and throw error if it is
   * @protected
   */
  checkReadOnly() {
    if (this.#readOnly) {
      throw new Error('Node is read-only');
    }
  }

  /**
   * Get the name of this node
   * @returns {string}
   */
  getName() {
    // Simplified - no locking needed in JavaScript
    return this.#name;
  }

  /**
   * Set the name of this node
   * @param {string} name - The new name
   */
  setName(name) {
    this.checkReadOnly();
    // Simplified - no locking needed in JavaScript
    this.#name = name;
  }

  /**
   * Get the owner of this node
   * @returns {*}
   */
  getOwner() {
    return this.#owner;
  }

  /**
   * Set the owner of this node
   * @param {*} owner - The new owner
   */
  setOwner(owner) {
    this.#owner = owner;
  }

  /**
   * Start a read operation (simplified - no-op in JavaScript)
   * @protected
   */
  startReader() {
    // No-op in JavaScript single-threaded environment
  }

  /**
   * Finish a read operation (simplified - no-op in JavaScript)
   * @protected
   */
  finishReader() {
    // No-op in JavaScript single-threaded environment
  }

  /**
   * Start a write operation (simplified - no-op in JavaScript)
   * @protected
   */
  startWriter() {
    // No-op in JavaScript single-threaded environment
  }

  /**
   * Finish a write operation and trigger events
   * @protected
   */
  finishWriter() {
    // Always call writingFinished to maintain event semantics
    try {
      this.writingFinished();
    } catch (e) {
      console.error('Error in writingFinished:', e);
    }
  }

  /**
   * Called when writing is finished - subclasses should override to fire events
   * @protected
   */
  writingFinished() {
    // Default implementation does nothing
  }

  /**
   * Accept a visitor (Visitor pattern)
   * @param {SceneGraphVisitor} visitor - The visitor to accept
   */
  accept(visitor) {
    visitor.visit(this);
  }

  /**
   * String representation for debugging
   * @returns {string}
   */
  toString() {
    return `${this.getName()} [${this.constructor.name}]`;
  }

  /**
   * Allow thread-unsafe access (kept for API compatibility)
   * @param {boolean} b - Whether to enable thread safety
   */
  static setThreadSafe(b) {
    SceneGraphNode.#threadsafe = b;
  }

  /**
   * Get the thread safety setting
   * @returns {boolean}
   */
  static getThreadSafe() {
    return SceneGraphNode.#threadsafe;
  }
}
