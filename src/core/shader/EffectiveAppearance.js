/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's EffectiveAppearance class
// Manages hierarchical appearance attribute inheritance

import { Appearance, INHERITED, DEFAULT } from '../scene/Appearance.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';

/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */
/** @typedef {import('../scene/SceneGraphNode.js').SceneGraphNode} SceneGraphNode */

/**
 * The attributes of Appearances are designed to be inherited via the scene graph
 * tree structure. This class manages this inheritance mechanism.
 * 
 * To evaluate the actual state of the Appearance system at a point in a scene graph
 * specified by a SceneGraphPath, one must essentially create a chain of 
 * EffectiveAppearance's, one for each Appearance instance occurring on this path.
 * 
 * Requests for the value of a given key cause a search "up" the tree towards the root,
 * for an appearance containing this key.
 * 
 * The '.' character plays a special role in key strings, allowing namespace stripping.
 * For example, the key "foo" can match a request for the string "bar.foo".
 * When querying "point.diffuseColor", the search tries:
 *   1. "point.diffuseColor" (full namespaced key)
 *   2. "diffuseColor" (base key with namespace stripped)
 * 
 * This allows generic attributes to be overridden by more specific namespaced ones.
 */
export class EffectiveAppearance {
  
  /** @type {EffectiveAppearance|null} */
  #parentApp;
  
  /** @type {Appearance} */
  #app;

  /**
   * Private constructor - use static factory methods instead
   * @param {EffectiveAppearance|null} parent - Parent effective appearance
   * @param {Appearance} app - The appearance for this level
   */
  constructor(parent, app) {
    this.#parentApp = parent;
    this.#app = app;
  }

  /**
   * Get the Appearance object at this level
   * @returns {Appearance}
   */
  getApp() {
    return this.#app;
  }

  /**
   * Create an empty root EffectiveAppearance
   * @returns {EffectiveAppearance}
   */
  static create() {
    return new EffectiveAppearance(null, new Appearance());
  }

  /**
   * Create an EffectiveAppearance from a SceneGraphPath by collecting
   * all Appearance instances along the path
   * @param {SceneGraphPath} path - The scene graph path
   * @returns {EffectiveAppearance}
   */
  static createFromPath(path) {
    let eap = EffectiveAppearance.create();
    
    // Iterate through the path and collect appearances
    // SceneGraphPath is iterable, so we can use for...of directly
    for (const node of path) {
      if (node instanceof SceneGraphComponent) {
        const app = node.getAppearance();
        if (app !== null) {
          eap = eap.createChild(app);
        }
      }
    }
    
    return eap;
  }

  /**
   * Create an EffectiveAppearance from an array of Appearance instances.
   * The array is treated as parent-to-child order, where the first element
   * is the root and the last element is the leaf.
   * @param {Appearance[]} appearances - Array of appearances from root to leaf
   * @returns {EffectiveAppearance}
   */
  static createFromArray(appearances) {
    let eap = EffectiveAppearance.create();
    
    // Chain appearances from root to leaf
    for (const app of appearances) {
      if (app !== null && app !== undefined) {
        eap = eap.createChild(app);
      }
    }
    
    return eap;
  }

  /**
   * Create a child EffectiveAppearance with the given Appearance
   * @param {Appearance} app - The appearance to add
   * @returns {EffectiveAppearance} A new child effective appearance
   */
  createChild(app) {
    return new EffectiveAppearance(this, app);
  }

  /**
   * Get an attribute value with namespace stripping.
   * 
   * The dot notation allows hierarchical attribute names. When searching for
   * an attribute like "point.diffuseColor", the method tries:
   *   1. "point.diffuseColor" (full key)
   *   2. "diffuseColor" (stripped key)
   * 
   * This allows base attributes to be overridden by namespace-specific ones.
   * 
   * @param {string} key - The attribute key (may include dots for namespacing)
   * @param {*} defaultValue - Value to return if attribute not found
   * @returns {*} The attribute value, or defaultValue if not found
   */
  getAttribute(key, defaultValue) {
    // Find the last dot in the key
    const lastDot = key.lastIndexOf('.');
    
    // Get the portion after the last dot (or entire key if no dot)
    const lastKeyPart = key.substring(lastDot + 1);
    
    // Try progressively stripping namespace prefixes
    // For "a.b.c.d", try: "a.b.c.d", "b.c.d", "c.d", "d"
    let currentPos = lastDot;
    while (currentPos !== -1) {
      const localKey = key.substring(0, currentPos + 1) + lastKeyPart;
      const value = this.#getAttribute1(localKey, defaultValue);
      if (value !== INHERITED) {
        return value;
      }
      // Find next dot moving backwards
      currentPos = key.lastIndexOf('.', currentPos - 1);
    }
    
    // Finally try just the last part without any namespace
    const value = this.#getAttribute1(lastKeyPart, defaultValue);
    if (value === INHERITED) {
      return defaultValue;
    }
    return value;
  }

  /**
   * Internal method to get attribute from this level or search up the chain
   * @param {string} key - The attribute key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} The attribute value or INHERITED
   * @private
   */
  #getAttribute1(key, defaultValue) {
    const value = this.#app.getAttribute(key);
    
    // If DEFAULT symbol, use the provided default value
    if (value === DEFAULT) {
      return defaultValue;
    }
    
    // If found (not INHERITED), return it
    if (value !== INHERITED) {
      return value;
    }
    
    // Not found at this level - search parent
    if (this.#parentApp === null) {
      return INHERITED;
    }
    
    return this.#parentApp.#getAttribute1(key, defaultValue);
  }

  /**
   * Check if this EffectiveAppearance matches a given SceneGraphPath
   * Validates that the chain of appearances corresponds to the path
   * @param {SceneGraphPath} path - The path to check against
   * @returns {boolean} True if this EffectiveAppearance matches the path
   */
  static matches(eap, path) {
    let ea = eap;
    
    // Walk backwards through the path
    const pathArray = path.toArray();
    for (let i = pathArray.length - 1; i >= 0; i--) {
      const node = pathArray[i];
      if (node instanceof SceneGraphComponent) {
        const app = node.getAppearance();
        if (app !== null) {
          if (ea.#app !== app) {
            return false;
          }
          ea = ea.#parentApp;
        }
      }
    }
    
    // The chain should be exhausted except for the root empty appearance
    if (ea.#parentApp !== null) {
      // eap has a non-trivial prefix before path
      return false;
    }
    
    return true;
  }

  /**
   * Get the hierarchy of Appearance objects from this node up to the root
   * @returns {Appearance[]} Array of appearances from deepest to root
   */
  getAppearanceHierarchy() {
    const appearances = [];
    let current = this;
    
    while (current !== null) {
      if (current.#app !== null) {
        appearances.push(current.#app);
      }
      current = current.#parentApp;
    }
    
    return appearances;
  }

  /**
   * Get a string representation showing the appearance chain
   * @returns {string} String representation
   */
  toString() {
    const names = [];
    let current = this;
    
    while (current !== null) {
      names.push(current.#app.getName());
      current = current.#parentApp;
    }
    
    return names.join(':');
  }

  /**
   * Resolve a shader schema (e.g., DefaultPointShader) using this EffectiveAppearance.
   * Each attribute defined by the schema will be pulled from the appearance using
   * the provided prefix (e.g., CommonAttributes.POINT_SHADER).
   *
   * @param {{ATTRIBUTES?: string[], type?: string}} shaderSchema
   * @param {string} attributePrefix - Prefix such as CommonAttributes.POINT_SHADER
   * @param {*} defaultInstance - Optional default value to fall back on
   * @returns {Object} Map of attribute -> value
   */
  resolveShaderAttributes(shaderSchema, attributePrefix = '', defaultInstance = {}) {
    if (!shaderSchema) {
      return {};
    }

    const attributes = shaderSchema?.ATTRIBUTES || [];
    const defaults =
      typeof shaderSchema?.getAllDefaults === 'function'
        ? shaderSchema.getAllDefaults()
        : defaultInstance;
    const resolved = { ...defaults };

    for (const attr of attributes) {
      const key = attributePrefix ? `${attributePrefix}.${attr}` : attr;
      const value = this.getAttribute(key, resolved[attr]);
      if (value !== undefined && value !== null) {
        resolved[attr] = value;
      }
    }

    return resolved;
  }

  /**
   * Create a shader data object (simple POJO) from a schema and prefix.
   * Adds a canonical $type property for downstream consumers.
   * @param {{ATTRIBUTES?: string[], type?: string}} shaderSchema
   * @param {string} attributePrefix
   * @returns {Object}
   */
  createShaderInstance(shaderSchema, attributePrefix = '') {
    const resolved = this.resolveShaderAttributes(shaderSchema, attributePrefix, {});
    if (shaderSchema?.type) {
      resolved.$type = shaderSchema.type;
    }
    return resolved;
  }
}

