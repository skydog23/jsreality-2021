/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SceneGraphPath } from '../SceneGraphPath.js';
import { SceneGraphComponent } from '../SceneGraphComponent.js';

/**
 * @typedef {import('./Tool.js').Tool} Tool
 */

/**
 * ToolManager manages tool registration and selection based on scene graph paths.
 * It tracks which tools are attached to which paths and helps select tools
 * based on pick results.
 */
export class ToolManager {
  /** @type {Set<Tool>} Tools that require picking for activation */
  #toolsWithPick = new Set();

  /** @type {Map<Tool, SceneGraphPath[]>} Map from tool to list of paths */
  #toolToPaths = new Map();

  /**
   * Add a tool with a specific path.
   * @param {Tool} tool - The tool to add
   * @param {SceneGraphPath} path - The scene graph path
   * @returns {boolean} True if this is the first path for this tool
   */
  addTool(tool, path) {
    const paths = this.#pathsForTool(tool);
    const first = paths.length === 0;
    
    if (paths.includes(path)) {
      throw new IllegalStateException(`Tool ${tool} already registered with path=${path}`);
    }
    
    paths.push(path);
    
    // If tool has activation slots, it needs picking
    if (tool.getActivationSlots().length > 0 && !this.#toolsWithPick.has(tool)) {
      this.#toolsWithPick.add(tool);
    }
    
    return first;
  }

  /**
   * Remove a tool with a specific path.
   * @param {Tool} tool - The tool to remove
   * @param {SceneGraphPath} path - The scene graph path
   * @returns {boolean} True if this was the last path for this tool
   */
  removeTool(tool, path) {
    const paths = this.#pathsForTool(tool);
    const index = paths.indexOf(path);
    if (index === -1) {
      throw new IllegalStateException(`Tool ${tool} not registered with path=${path}`);
    }
    paths.splice(index, 1);
    
    if (paths.length === 0) {
      if (tool.getActivationSlots().length > 0) {
        this.#toolsWithPick.delete(tool);
      }
      return true;
    }
    return false;
  }

  /**
   * Clean up all tools and paths.
   */
  cleanUp() {
    this.#toolToPaths.clear();
    this.#toolsWithPick.clear();
  }

  /**
   * Get all tools in the viewer's scene.
   * @returns {Set<Tool>} Unmodifiable set of all tools
   */
  getTools() {
    return new Set(this.#toolToPaths.keys());
  }

  /**
   * Check if a tool needs picking for activation.
   * @param {Tool} candidate - The tool to check
   * @returns {boolean} True if the tool needs picking
   */
  needsPick(candidate) {
    return this.#toolsWithPick.has(candidate);
  }

  /**
   * Get the list of paths for a tool.
   * @param {Tool} tool - The tool
   * @returns {SceneGraphPath[]} List of paths (mutable)
   * @private
   */
  #pathsForTool(tool) {
    if (!this.#toolToPaths.has(tool)) {
      this.#toolToPaths.set(tool, []);
    }
    return this.#toolToPaths.get(tool);
  }

  /**
   * Get the path for a tool given a pick path.
   * @param {Tool} tool - The tool
   * @param {SceneGraphPath|null} pickPath - The pick path (can be null)
   * @returns {SceneGraphPath|null} The matching path or null
   */
  getPathForTool(tool, pickPath) {
    const paths = this.#pathsForTool(tool);
    
    if (pickPath === null) {
      if (paths.length !== 1) {
        throw new IllegalStateException("ambiguous path without pick");
      }
      return paths[0];
    }
    
    // Find the path that the pickPath starts with
    for (const path of paths) {
      if (pickPath.startsWith(path)) {
        return path;
      }
    }
    
    return null;
  }

  /**
   * Select tools for a given pick path and depth.
   * @param {SceneGraphPath} pickPath - The pick path
   * @param {number} depth - Maximum depth to search
   * @param {Set<Tool>} candidates - Set of candidate tools
   * @returns {Tool[]} List of selected tools
   */
  selectToolsForPath(pickPath, depth, candidates) {
    // Iterate backwards through the path
    for (const node of pickPath.reverseIterator(depth)) {
      if (node instanceof SceneGraphComponent) {
        const tools = node.getTools();
        const matching = tools.filter(tool => candidates.has(tool));
        if (matching.length > 0) {
          return matching;
        }
      }
    }
    
    return [];
  }
}

/**
 * Simple error class for illegal state exceptions.
 */
class IllegalStateException extends Error {
  constructor(message) {
    super(message);
    this.name = 'IllegalStateException';
  }
}

