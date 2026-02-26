/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Shader Registry - Maps shader names to implementation classes
// Supports dynamic registration of custom shaders

/**
 * Registry for mapping shader names to implementation classes.
 * 
 * This enables the system to support non-default shaders like "implode", "twoSide", etc.
 * Shaders are registered by type (point, line, polygon) and name.
 * 
 * Usage:
 * ```javascript
 * // Register a custom shader
 * ShaderRegistry.registerPolygonShader('implode', ImplodePolygonShader);
 * 
 * // Resolve a shader by name
 * const ShaderClass = ShaderRegistry.resolveShader('polygon', 'implode');
 * ```
 */
export class ShaderRegistry {
  /** @type {Map<string, Object>} Map of name → schema for point shaders */
  static #pointShaders = new Map();
  
  /** @type {Map<string, Object>} Map of name → schema for line shaders */
  static #lineShaders = new Map();
  
  /** @type {Map<string, Object>} Map of name → schema for polygon shaders */
  static #polygonShaders = new Map();
  
  /** @type {Map<string, Object>} Map of name → schema for fog shaders */
  static #fogShaders = new Map();
  
  /**
   * Register a point shader implementation
   * @param {string} name - Shader name (e.g., 'default', 'custom')
   * @param {Object} schema - Shader schema object (e.g., DefaultPointShader)
   */
  static registerPointShader(name, schema) {
    this.#pointShaders.set(name, schema);
  }
  
  /**
   * Register a line shader implementation
   * @param {string} name - Shader name (e.g., 'default', 'custom')
   * @param {Object} schema - Shader schema object (e.g., DefaultLineShader)
   */
  static registerLineShader(name, schema) {
    this.#lineShaders.set(name, schema);
  }
  
  /**
   * Register a polygon shader implementation
   * @param {string} name - Shader name (e.g., 'default', 'implode', 'twoSide')
   * @param {Object} schema - Shader schema object (e.g., DefaultPolygonShader, ImplodePolygonShader)
   */
  static registerPolygonShader(name, schema) {
    this.#polygonShaders.set(name, schema);
  }
  
  /**
   * Register a fog shader implementation
   * @param {string} name - Shader name (e.g., 'default')
   * @param {Object} schema - Shader schema object (e.g., DefaultFogShader)
   */
  static registerFogShader(name, schema) {
    this.#fogShaders.set(name, schema);
  }
  
  /**
   * Resolve a shader by type and name
   * @param {string} type - Shader type: 'point', 'line', or 'polygon'
   * @param {string} name - Shader name (e.g., 'default', 'implode')
   * @returns {Object|null} Shader schema object, or null if not found
   */
  static resolveShader(type, name) {
    let registry;
    switch (type) {
      case 'point':
        registry = this.#pointShaders;
        break;
      case 'line':
        registry = this.#lineShaders;
        break;
      case 'polygon':
        registry = this.#polygonShaders;
        break;
      case 'fog':
        registry = this.#fogShaders;
        break;
      default:
        throw new Error(`Unknown shader type: ${type}`);
    }
    
    const schema = registry.get(name);
    if (!schema) {
      throw new Error(`No such ${type} shader [${name}]`);
    }
    
    return schema;
  }
  
  /**
   * Check if a shader is registered
   * @param {string} type - Shader type: 'point', 'line', or 'polygon'
   * @param {string} name - Shader name
   * @returns {boolean} True if shader is registered
   */
  static hasShader(type, name) {
    let registry;
    switch (type) {
      case 'point':
        registry = this.#pointShaders;
        break;
      case 'line':
        registry = this.#lineShaders;
        break;
      case 'polygon':
        registry = this.#polygonShaders;
        break;
      case 'fog':
        registry = this.#fogShaders;
        break;
      default:
        return false;
    }
    
    return registry.has(name);
  }
  
  /**
   * Get all registered shader names for a type
   * @param {string} type - Shader type: 'point', 'line', or 'polygon'
   * @returns {string[]} Array of registered shader names
   */
  static getRegisteredShaders(type) {
    let registry;
    switch (type) {
      case 'point':
        registry = this.#pointShaders;
        break;
      case 'line':
        registry = this.#lineShaders;
        break;
      case 'polygon':
        registry = this.#polygonShaders;
        break;
      case 'fog':
        registry = this.#fogShaders;
        break;
      default:
        return [];
    }
    
    return Array.from(registry.keys());
  }
}

