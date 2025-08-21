// JavaScript port of jReality's Appearance class (from Appearance.java)
// Simplified with Map-based storage for JavaScript environment

import { SceneGraphNode } from './SceneGraphNode.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * Special objects for appearance attribute inheritance
 */
export const DEFAULT = Symbol('DEFAULT');
export const INHERITED = Symbol('INHERITED');

/**
 * Event fired when appearance attributes change
 */
export class AppearanceEvent extends Event {
  /**
   * @param {Appearance} source - The appearance that changed
   * @param {string} key - The attribute key that changed
   * @param {*} oldValue - The previous value
   */
  constructor(source, key, oldValue) {
    super('appearanceChanged');
    this.source = source;
    this.key = key;
    this.oldValue = oldValue;
  }
}

/**
 * The appearance node. Contains attributes of arbitrary type stored as (key,value)
 * pairs in a Map. There are special methods for setting attributes
 * whose values are common built-in types: number, boolean, and string.
 * 
 * You can query the state of the Appearance by using getAttribute(key). If
 * no attribute has been defined for this key, the special symbol INHERITED is returned.
 * 
 * If you wish to remove an attribute value from the key 'foo', call:
 * setAttribute('foo', INHERITED);
 */
export class Appearance extends SceneGraphNode {
  
  /**
   * @type {Map<string, *>} The attributes map
   */
  #attributes = new Map();
  
  /**
   * @type {Set<string>} Changed attributes for batched events
   */
  #changedAttributes = new Set();

  /**
   * @type {number} Counter for unnamed appearances
   */
  static #UNNAMED_ID = 0;

  /**
   * Create a new Appearance
   * @param {string} [name] - Name for the appearance
   */
  constructor(name) {
    super(name || `app ${Appearance.#UNNAMED_ID++}`);
  }

  /**
   * Get an attribute value
   * @param {string} key - The attribute key
   * @returns {*} The attribute value or INHERITED if not set
   */
  getAttribute(key) {
    this.startReader();
    try {
      const value = this.#attributes.get(key);
      return value !== undefined ? value : INHERITED;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get an attribute value with type checking
   * @param {string} key - The attribute key
   * @param {Function} type - The expected type (constructor function)
   * @returns {*} The attribute value, DEFAULT, or INHERITED
   */
  getAttributeWithType(key, type) {
    this.startReader();
    try {
      const val = this.getAttribute(key);
      if (val === DEFAULT || val instanceof type || typeof val === type.name.toLowerCase()) {
        return val;
      }
      return INHERITED;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get all attributes as a Map (defensive copy)
   * @returns {Map<string, *>}
   */
  getAttributes() {
    this.startReader();
    try {
      return new Map(this.#attributes);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get all stored attribute keys
   * @returns {Set<string>}
   */
  getStoredAttributes() {
    this.startReader();
    try {
      return new Set(this.#attributes.keys());
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set an attribute with inferred type
   * @param {string} key - The attribute key
   * @param {*} value - The attribute value
   */
  setAttribute(key, value) {
    this.setAttributeWithType(key, value, value?.constructor || Object);
  }

  /**
   * Set an attribute with declared type
   * @param {string} key - The attribute key
   * @param {*} value - The attribute value
   * @param {Function} declaredType - The declared type
   */
  setAttributeWithType(key, value, declaredType) {
    this.checkReadOnly();
    this.startWriter();
    try {
      if (declaredType == null || value == null) {
        throw new Error('Null type or value not allowed');
      }

      let oldValue;
      if (value === INHERITED) {
        oldValue = this.#attributes.get(key);
        this.#attributes.delete(key);
      } else {
        oldValue = this.#attributes.get(key);
        this.#attributes.set(key, value);
      }

      if (oldValue !== value) {
        this.#fireAppearanceChanged(key, oldValue);
      }
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set a numeric attribute
   * @param {string} key - The attribute key
   * @param {number} value - The numeric value
   */
  setAttributeNumber(key, value) {
    this.setAttribute(key, Number(value));
  }

  /**
   * Set a boolean attribute
   * @param {string} key - The attribute key
   * @param {boolean} value - The boolean value
   */
  setAttributeBoolean(key, value) {
    this.setAttribute(key, Boolean(value));
  }

  /**
   * Set a string attribute
   * @param {string} key - The attribute key
   * @param {string} value - The string value
   */
  setAttributeString(key, value) {
    this.setAttribute(key, String(value));
  }

  /**
   * Add an appearance listener
   * @param {function(AppearanceEvent): void} listener - The listener function
   */
  addAppearanceListener(listener) {
    this.startReader();
    this.addEventListener('appearanceChanged', listener);
    this.finishReader();
  }

  /**
   * Remove an appearance listener
   * @param {function(AppearanceEvent): void} listener - The listener function
   */
  removeAppearanceListener(listener) {
    this.startReader();
    this.removeEventListener('appearanceChanged', listener);
    this.finishReader();
  }

  /**
   * Called when writing is finished - fires events for changed attributes
   * @protected
   */
  writingFinished() {
    try {
      for (const [key, oldValue] of this.#changedAttributes) {
        this.dispatchEvent(new AppearanceEvent(this, key, oldValue));
      }
    } finally {
      this.#changedAttributes.clear();
    }
  }

  /**
   * Mark an attribute as changed for event firing
   * @param {string} key - The attribute key
   * @param {*} oldValue - The old value
   * @private
   */
  #fireAppearanceChanged(key, oldValue) {
    this.#changedAttributes.set(key, oldValue);
  }

  /**
   * Accept a visitor
   * @param {SceneGraphVisitor} visitor - The visitor
   */
  accept(visitor) {
    this.startReader();
    try {
      visitor.visitAppearance?.(this) || visitor.visit(this);
    } finally {
      this.finishReader();
    }
  }

  /**
   * String representation for debugging
   * @returns {string}
   */
  toString() {
    const attrs = {};
    for (const [key, value] of this.#attributes) {
      attrs[key] = value;
    }
    return JSON.stringify(attrs);
  }
}
