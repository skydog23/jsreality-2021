/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's IndexedLineSet class (from IndexedLineSet.java)
// A geometric object consisting of polylines (variable-length edge sequences)

import { PointSet } from './PointSet.js';
import { GeometryCategory } from './Geometry.js';
import { GeometryAttribute } from './GeometryAttribute.js';
import { DataList, RegularDataList, VariableDataList } from './data/index.js';
import { toDataList } from './data/DataUtility.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * A geometric object consisting of a set of edges: lists of vertices joined by line segments.
 * 
 * Each "edge" in an IndexedLineSet is actually a polyline - a sequence of connected vertices
 * that can have variable length. This allows representation of:
 * - Simple line segments (2 vertices)
 * - Complex curves (multiple vertices)  
 * - Multiple disconnected polylines in a single object
 * 
 * Edge indices are stored as a VariableDataList to handle variable-length polylines.
 */
export class IndexedLineSet extends PointSet {
  
  /**
   * @type {Map<string, DataList|VariableDataList>} Edge attribute storage
   */
  #edgeAttributes = new Map();
  
  /**
   * @type {number} Number of edges (polylines) in this set
   */
  #numEdges = 0;

  /**
   * @type {number} Counter for unnamed line sets
   */
  static #UNNAMED_ID = 0;

  /**
   * Create a new IndexedLineSet
   * @param {number} [numPoints=0] - Number of points
   * @param {number} [numEdges=0] - Number of edges (polylines)
   */
  constructor(numPoints = 0, numEdges = 0) {
    super(numPoints);
    this.setName(`line-set ${IndexedLineSet.#UNNAMED_ID++}`);
    this.#numEdges = numEdges;
  }

  /**
   * Get the number of edges (polylines)
   * @returns {number}
   */
  getNumEdges() {
    this.startReader();
    try {
      return this.#numEdges;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set the number of edges (clears all edge attributes)
   * @param {number} numEdges - The number of edges (>= 0)
   */
  setNumEdges(numEdges) {
    this.checkReadOnly();
    this.startWriter();
    try {
      if (numEdges < 0) {
        throw new Error('Number of edges must be >= 0');
      }
      
      if (numEdges === this.#numEdges) {
        return; // No change needed
      }
      
      this.#numEdges = numEdges;
      this.#edgeAttributes.clear(); // Clear all attributes when changing size
      this._fireGeometryDataChanged(GeometryCategory.EDGE, new Set(['*'])); // Signal all changed
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get all edge attributes
   * @returns {Map<string, DataList|VariableDataList>} Defensive copy of edge attributes
   */
  getEdgeAttributes() {
    this.startReader();
    try {
      return new Map(this.#edgeAttributes);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get a specific edge attribute
   * @param {string} attributeName - The attribute name
   * @returns {DataList|VariableDataList|null} The attribute data or null if not found
   */
  getEdgeAttribute(attributeName) {
    this.startReader();
    try {
      return this.#edgeAttributes.get(attributeName) || null;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set multiple edge attributes at once
   * @param {Map<string, DataList|VariableDataList>} attributes - Map of attribute name to data
   */
  setEdgeAttributes(attributes) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const changedAttributes = new Set();
      
      for (const [name, dataList] of attributes) {
        this.#validateEdgeAttribute(name, dataList);
        this.#edgeAttributes.set(name, dataList);
        changedAttributes.add(name);
      }
      
      this._fireGeometryDataChanged(GeometryCategory.EDGE, changedAttributes);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set a single edge attribute
   * @param {string} attributeName - The attribute name
   * @param {DataList|VariableDataList} dataList - The attribute data
   */
  setEdgeAttribute(attributeName, dataList) {
    this.checkReadOnly();
    this.startWriter();
    try {
      this.#validateEdgeAttribute(attributeName, dataList);
      this.#edgeAttributes.set(attributeName, dataList);
      this._fireGeometryDataChanged(GeometryCategory.EDGE, new Set([attributeName]));
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set edge count and attributes together (atomic operation)
   * @param {string} attributeName - The attribute name
   * @param {DataList|VariableDataList} dataList - The attribute data
   */
  setEdgeCountAndAttribute(attributeName, dataList) {
    this.checkReadOnly();
    this.startWriter();
    try {
      // Set count from the data list size
      if (dataList instanceof VariableDataList) {
        this.#numEdges = dataList.length;
      } else if (dataList instanceof RegularDataList && dataList.shape.length >= 1) {
        this.#numEdges = dataList.shape[0];
      }
      
      this.#validateEdgeAttribute(attributeName, dataList);
      this.#edgeAttributes.set(attributeName, dataList);
      this._fireGeometryDataChanged(GeometryCategory.EDGE, new Set([attributeName]));
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set edge count and multiple attributes together
   * @param {Map<string, DataList|VariableDataList>} attributes - Map of attribute name to data
   */
  setEdgeCountAndAttributes(attributes) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const changedAttributes = new Set();
      
      // Set count from first attribute
      const firstDataList = attributes.values().next().value;
      if (firstDataList instanceof VariableDataList) {
        this.#numEdges = firstDataList.length;
      } else if (firstDataList instanceof RegularDataList && firstDataList.shape.length >= 1) {
        this.#numEdges = firstDataList.shape[0];
      }
      
      for (const [name, dataList] of attributes) {
        this.#validateEdgeAttribute(name, dataList);
        this.#edgeAttributes.set(name, dataList);
        changedAttributes.add(name);
      }
      
      this._fireGeometryDataChanged(GeometryCategory.EDGE, changedAttributes);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Remove an edge attribute
   * @param {string} attributeName - The attribute name to remove
   * @returns {boolean} True if the attribute was removed
   */
  removeEdgeAttribute(attributeName) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const removed = this.#edgeAttributes.delete(attributeName);
      if (removed) {
        this._fireGeometryDataChanged(GeometryCategory.EDGE, new Set([attributeName]));
      }
      return removed;
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Check if an edge attribute exists
   * @param {string} attributeName - The attribute name
   * @returns {boolean} True if the attribute exists
   */
  hasEdgeAttribute(attributeName) {
    this.startReader();
    try {
      return this.#edgeAttributes.has(attributeName);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get all edge attribute names
   * @returns {string[]} Array of attribute names
   */
  getEdgeAttributeNames() {
    this.startReader();
    try {
      return Array.from(this.#edgeAttributes.keys());
    } finally {
      this.finishReader();
    }
  }

  /**
   * Convenience method to set edge indices (polylines)
   * @param {DataList|VariableDataList|Array<Array<number>>} polylines - Array of polylines, each containing vertex indices
   */
  setEdgeIndices(polylines) {
    // Convert to DataList using toDataList - automatically detects variable-length arrays
    // and creates VariableDataList for polylines with different lengths
    const indexList = toDataList(polylines, null, 'int32');
    this.setEdgeCountAndAttribute(GeometryAttribute.INDICES, indexList);
  }

  /**
   * Convenience method to get edge indices
   * @returns {VariableDataList|null} The edge index data
   */
  getEdgeIndices() {
    return this.getEdgeAttribute(GeometryAttribute.INDICES);
  }

  /**
   * Get a specific polyline by index
   * @param {number} edgeIndex - The edge/polyline index
   * @returns {Array<number>|null} Array of vertex indices for the polyline
   */
  getPolyline(edgeIndex) {
    const indices = this.getEdgeIndices();
    if (!indices || !(indices instanceof VariableDataList)) {
      return null;
    }
    
    if (edgeIndex < 0 || edgeIndex >= indices.length) {
      return null;
    }
    
    return indices.getRow(edgeIndex);
  }

  /**
   * Validate that an edge attribute is compatible with this line set
   * @param {string} attributeName - The attribute name
   * @param {DataList|VariableDataList} dataList - The attribute data
   * @private
   */
  #validateEdgeAttribute(attributeName, dataList) {
    if (!dataList || !(dataList instanceof DataList)) {
      throw new Error(`Edge attribute '${attributeName}' must be a DataList (RegularDataList or VariableDataList)`);
    }
    
    // Check that the data size matches our edge count
    const dataSize = dataList instanceof VariableDataList ? dataList.length : dataList.shape[0];
    
    if (this.#numEdges > 0 && dataSize !== this.#numEdges) {
      throw new Error(
        `Edge attribute '${attributeName}' has ${dataSize} entries, ` +
        `but line set has ${this.#numEdges} edges`
      );
    }
  }

  /**
   * Accept a visitor
   * @param {SceneGraphVisitor} visitor - The visitor
   */
  accept(visitor) {
    this.startReader();
    try {
      if (visitor.visitIndexedLineSet) {
        visitor.visitIndexedLineSet(this);
      } else {
        super.accept(visitor);
      }
    } finally {
      this.finishReader();
    }
  }

  /**
   * String representation for debugging
   * @returns {string}
   */
  toString() {
    return `IndexedLineSet(name: "${this.getName()}", points: ${this.getNumPoints()}, ` +
           `edges: ${this.#numEdges}, edge-attrs: [${this.getEdgeAttributeNames().join(', ')}])`;
  }
}
