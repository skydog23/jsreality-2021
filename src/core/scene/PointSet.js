/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's PointSet class (from PointSet.java)
// A set of points in 3D space with attribute support

import { Geometry, GeometryCategory } from './Geometry.js';
import { GeometryAttribute } from './GeometryAttribute.js';
import { DataList } from './data/index.js';
import { toDataList } from './data/DataUtility.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * A set of points in 3 space.
 * 
 * Vertices can be specified with either 3- or 4-D coordinates. The point set is represented as set of
 * attribute/value pairs. The values are typically arrays of data, with one vector or scalar per point.
 * Every point set must contain a value for the coordinates attribute.
 * 
 * Other built-in attributes include:
 * - colors
 * - normals  
 * - texture coordinates
 * - labels
 * - point size
 * - relative radii
 */
export class PointSet extends Geometry {
  
  /**
   * @type {Map<string, DataList>} Vertex attribute storage
   */
  #vertexAttributes = new Map();
  
  /**
   * @type {number} Number of points in this set
   */
  #numPoints = 0;

  /**
   * @type {number} Counter for unnamed point sets
   */
  static #UNNAMED_ID = 0;

  /**
   * Create a new PointSet
   * @param {number} [numPoints=0] - Number of points
   */
  constructor(numPoints = 0) {
    const name = `point-set ${PointSet.#UNNAMED_ID++}`;
    super(name);
    this.#numPoints = numPoints;
  }

  /**
   * Get the number of points
   * @returns {number}
   */
  getNumPoints() {
    this.startReader();
    try {
      return this.#numPoints;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set the number of points (clears all vertex attributes)
   * @param {number} numPoints - The number of points (>= 0)
   */
  setNumPoints(numPoints) {
    this.checkReadOnly();
    this.startWriter();
    try {
      if (numPoints < 0) {
        throw new Error('Number of points must be >= 0');
      }
      this.#numPoints = numPoints;
      this.#vertexAttributes.clear(); // Clear all attributes when changing size
      this._fireGeometryDataChanged(GeometryCategory.VERTEX, new Set(['*'])); // Signal all changed
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get all vertex attributes
   * @returns {Map<string, DataList>} Defensive copy of vertex attributes
   */
  getVertexAttributes() {
    this.startReader();
    try {
      return new Map(this.#vertexAttributes);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get a specific vertex attribute
   * @param {string} attributeName - The attribute name
   * @returns {DataList|null} The attribute data or null if not found
   */
  getVertexAttribute(attributeName) {
    this.startReader();
    try {
      return this.#vertexAttributes.get(attributeName) || null;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set multiple vertex attributes at once
   * @param {Map<string, DataList>} attributes - Map of attribute name to DataList
   */
  setVertexAttributes(attributes) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const changedAttributes = new Set();
      
      for (const [name, dataList] of attributes) {
        this.#validateVertexAttribute(name, dataList);
        this.#vertexAttributes.set(name, dataList);
        changedAttributes.add(name);
      }
      
      this._fireGeometryDataChanged(GeometryCategory.VERTEX, changedAttributes);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set a single vertex attribute
   * @param {string} attributeName - The attribute name
   * @param {DataList} dataList - The attribute data
   */
  setVertexAttribute(attributeName, dataList) {
    this.checkReadOnly();
    this.startWriter();
    try {
      this.#validateVertexAttribute(attributeName, dataList);
      this.#vertexAttributes.set(attributeName, dataList);
      this._fireGeometryDataChanged(GeometryCategory.VERTEX, new Set([attributeName]));
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set vertex count and attributes together (atomic operation)
   * @param {string} attributeName - The attribute name
   * @param {DataList} dataList - The attribute data
   */
  setVertexCountAndAttribute(attributeName, dataList) {
    this.checkReadOnly();
    this.startWriter();
    try {
      // Set count from the data list size
      if (dataList.shape.length >= 1) {
        this.#numPoints = dataList.shape[0];
      }
      
      this.#validateVertexAttribute(attributeName, dataList);
      this.#vertexAttributes.set(attributeName, dataList);
      this._fireGeometryDataChanged(GeometryCategory.VERTEX, new Set([attributeName]));
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set vertex count and multiple attributes together
   * @param {Map<string, DataList>} attributes - Map of attribute name to DataList
   */
  setVertexCountAndAttributes(attributes) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const changedAttributes = new Set();
      
      // Set count from first attribute
      const firstDataList = attributes.values().next().value;
      if (firstDataList && firstDataList.shape.length >= 1) {
        this.#numPoints = firstDataList.shape[0];
      }
      
      for (const [name, dataList] of attributes) {
        this.#validateVertexAttribute(name, dataList);
        this.#vertexAttributes.set(name, dataList);
        changedAttributes.add(name);
      }
      
      this._fireGeometryDataChanged(GeometryCategory.VERTEX, changedAttributes);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Remove a vertex attribute
   * @param {string} attributeName - The attribute name to remove
   * @returns {boolean} True if the attribute was removed
   */
  removeVertexAttribute(attributeName) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const removed = this.#vertexAttributes.delete(attributeName);
      if (removed) {
        this._fireGeometryDataChanged(GeometryCategory.VERTEX, new Set([attributeName]));
      }
      return removed;
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Check if a vertex attribute exists
   * @param {string} attributeName - The attribute name
   * @returns {boolean} True if the attribute exists
   */
  hasVertexAttribute(attributeName) {
    this.startReader();
    try {
      return this.#vertexAttributes.has(attributeName);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get all vertex attribute names
   * @returns {string[]} Array of attribute names
   */
  getVertexAttributeNames() {
    this.startReader();
    try {
      return Array.from(this.#vertexAttributes.keys());
    } finally {
      this.finishReader();
    }
  }

  /**
   * Convenience method to set vertex coordinates
   * @param {Array|Array<Array>} coordinates - Vertex coordinates (flat or nested)
   * @param {number} [coordsPerVertex=3] - Number of coordinates per vertex
   */
  setVertexCoordinates(coordinates, coordsPerVertex = 4) {
    const coordList = toDataList(coordinates, coordsPerVertex);
    this.setVertexCountAndAttribute(GeometryAttribute.COORDINATES, coordList);
  }

  /**
   * Convenience method to get vertex coordinates
   * @returns {DataList|null} The coordinate data list
   */
  getVertexCoordinates() {
    return this.getVertexAttribute(GeometryAttribute.COORDINATES);
  }

  /**
   * Set vertex colors for this point set.
   * 
   * Accepts multiple formats:
   * - Color objects: [Color.RED, Color.GREEN, ...] → stored as int32 (0-255 range)
   * - Numeric arrays: [[r, g, b, a], ...] → stored as float64 by default
   * 
   * NOTE: Color objects use 8-bit precision (0-255 range), which may not be sufficient
   * for all applications (HDR rendering, color grading, scientific visualization).
   * For higher precision, pass numeric arrays directly with normalized (0.0-1.0) or
   * extended ranges, and use setVertexAttribute() with a DataList created using
   * toDataList(colors, numChannels, 'float32') or 'float64'.
   * 
   * @param {Array<Color>|Array<Array<number>>} colors - Color data
   * @param {number} [numChannels=null] - Number of color channels (3 for RGB, 4 for RGBA)
   */
  setVertexColors(colors, numChannels = null) {
    // If numChannels is not provided and colors are Color objects, toDataList will auto-detect
    // Otherwise, use the provided numChannels (defaults to 4 for RGBA if null and not Color objects)
    const colorList = toDataList(colors, numChannels);
    this.setVertexCountAndAttribute(GeometryAttribute.COLORS, colorList);
  }

  getVertexColors() {
    return this.getVertexAttribute(GeometryAttribute.COLORS);
  }

  /**
   * Validate that a vertex attribute is compatible with this point set
   * @param {string} attributeName - The attribute name
   * @param {DataList} dataList - The attribute data
   * @private
   */
  #validateVertexAttribute(attributeName, dataList) {
    if (!dataList || !(dataList instanceof DataList)) {
      throw new Error(`Vertex attribute '${attributeName}' must be a DataList`);
    }
    
    // If we have a fixed number of points, check that the data matches
    if (this.#numPoints > 0 && dataList.shape[0] !== this.#numPoints) {
      throw new Error(
        `Vertex attribute '${attributeName}' has ${dataList.shape[0]} entries, ` +
        `but point set has ${this.#numPoints} points`
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
      if (visitor.visitPointSet) {
        visitor.visitPointSet(this);
      } else {
        visitor.visitGeometry?.(this) || visitor.visit(this);
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
    return `PointSet(name: "${this.getName()}", points: ${this.#numPoints}, ` +
           `attributes: [${this.getVertexAttributeNames().join(', ')}])`;
  }
}
