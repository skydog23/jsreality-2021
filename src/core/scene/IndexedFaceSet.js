/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's IndexedFaceSet class (from IndexedFaceSet.java)
// A geometry specified as a combinatorial set of faces with variable polygon sizes

import { IndexedLineSet } from './IndexedLineSet.js';
import { GeometryCategory } from './Geometry.js';
import { GeometryAttribute } from './GeometryAttribute.js';
import { DataList, RegularDataList, VariableDataList } from './data/index.js';
import { toDataList, toColorDataList } from '../scene/data/DataUtility.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * A geometry specified as a combinatorial set of faces.
 * 
 * Each face is a polygon that can have variable length - triangles, quads, pentagons, etc.
 * can all be mixed in a single IndexedFaceSet. Face indices are stored as a VariableDataList
 * to handle the variable polygon sizes efficiently.
 * 
 * Inherits vertex attributes from PointSet and edge attributes from IndexedLineSet,
 * and adds face attributes for properties like face colors, normals, etc.
 */
export class IndexedFaceSet extends IndexedLineSet {
  
  /**
   * @type {Map<string, DataList|VariableDataList>} Face attribute storage
   */
  #faceAttributes = new Map();
  
  /**
   * @type {number} Number of faces in this set
   */
  #numFaces = 0;

  /**
   * @type {number} Counter for unnamed face sets
   */
  static #UNNAMED_ID = 0;

  /**
   * Create a new IndexedFaceSet
   * @param {number} [numVertices=0] - Number of vertices
   * @param {number} [numFaces=0] - Number of faces
   */
  constructor(numVertices = 0, numFaces = 0) {
    // IndexedFaceSet doesn't specify edges explicitly - they're derived from faces
    super(numVertices, 0);
    this.setName(`face-set ${IndexedFaceSet.#UNNAMED_ID++}`);
    this.#numFaces = numFaces;
  }

  /**
   * Get the number of faces
   * @returns {number}
   */
  getNumFaces() {
    this.startReader();
    try {
      return this.#numFaces;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set the number of faces (clears all face attributes)
   * @param {number} numFaces - The number of faces (>= 0)
   */
  setNumFaces(numFaces) {
    this.checkReadOnly();
    this.startWriter();
    try {
      if (numFaces < 0) {
        throw new Error('Number of faces must be >= 0');
      }
      
      this.#numFaces = numFaces;
      this.#faceAttributes.clear(); // Clear all attributes when changing size
      this._fireGeometryDataChanged(GeometryCategory.FACE, new Set(['*'])); // Signal all changed
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get all face attributes
   * @returns {Map<string, DataList|VariableDataList>} Defensive copy of face attributes
   */
  getFaceAttributes() {
    this.startReader();
    try {
      return new Map(this.#faceAttributes);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get a specific face attribute
   * @param {string} attributeName - The attribute name
   * @returns {DataList|VariableDataList|null} The attribute data or null if not found
   */
  getFaceAttribute(attributeName) {
    this.startReader();
    try {
      return this.#faceAttributes.get(attributeName) || null;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set multiple face attributes at once
   * @param {Map<string, DataList|VariableDataList>} attributes - Map of attribute name to data
   */
  setFaceAttributes(attributes) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const changedAttributes = new Set();
      
      for (const [name, dataList] of attributes) {
        this.#validateFaceAttribute(name, dataList);
        this.#faceAttributes.set(name, dataList);
        changedAttributes.add(name);
      }
      
      this._fireGeometryDataChanged(GeometryCategory.FACE, changedAttributes);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set a single face attribute
   * @param {string} attributeName - The attribute name
   * @param {DataList|VariableDataList} dataList - The attribute data
   */
  setFaceAttribute(attributeName, dataList) {
    this.checkReadOnly();
    this.startWriter();
    try {
      this.#validateFaceAttribute(attributeName, dataList);
      this.#faceAttributes.set(attributeName, dataList);
      this._fireGeometryDataChanged(GeometryCategory.FACE, new Set([attributeName]));
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set face count and attributes together (atomic operation)
   * @param {string} attributeName - The attribute name
   * @param {DataList|VariableDataList} dataList - The attribute data
   */
  setFaceCountAndAttribute(attributeName, dataList) {
    this.checkReadOnly();
    this.startWriter();
    try {
      // Set count from the data list size
      if (dataList instanceof VariableDataList) {
        this.#numFaces = dataList.length;
      } else if (dataList instanceof RegularDataList && dataList.shape.length >= 1) {
        this.#numFaces = dataList.shape[0];
      }
      
      this.#validateFaceAttribute(attributeName, dataList);
      this.#faceAttributes.set(attributeName, dataList);
      this._fireGeometryDataChanged(GeometryCategory.FACE, new Set([attributeName]));
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set face count and multiple attributes together
   * @param {Map<string, DataList|VariableDataList>} attributes - Map of attribute name to data
   */
  setFaceCountAndAttributes(attributes) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const changedAttributes = new Set();
      
      // Set count from first attribute
      const firstDataList = attributes.values().next().value;
      if (firstDataList instanceof VariableDataList) {
        this.#numFaces = firstDataList.length;
      } else if (firstDataList instanceof RegularDataList && firstDataList.shape.length >= 1) {
        this.#numFaces = firstDataList.shape[0];
      }
      
      for (const [name, dataList] of attributes) {
        this.#validateFaceAttribute(name, dataList);
        this.#faceAttributes.set(name, dataList);
        changedAttributes.add(name);
      }
      
      this._fireGeometryDataChanged(GeometryCategory.FACE, changedAttributes);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Remove a face attribute
   * @param {string} attributeName - The attribute name to remove
   * @returns {boolean} True if the attribute was removed
   */
  removeFaceAttribute(attributeName) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const removed = this.#faceAttributes.delete(attributeName);
      if (removed) {
        this._fireGeometryDataChanged(GeometryCategory.FACE, new Set([attributeName]));
      }
      return removed;
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Check if a face attribute exists
   * @param {string} attributeName - The attribute name
   * @returns {boolean} True if the attribute exists
   */
  hasFaceAttribute(attributeName) {
    this.startReader();
    try {
      return this.#faceAttributes.has(attributeName);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get all face attribute names
   * @returns {string[]} Array of attribute names
   */
  getFaceAttributeNames() {
    this.startReader();
    try {
      return Array.from(this.#faceAttributes.keys());
    } finally {
      this.finishReader();
    }
  }

  /**
   * Convenience method to set face indices (polygons)
   * @param {Array<Array<number>>} polygons - Array of polygons, each containing vertex indices
   */
  setFaceIndices(polygons) {
    const indexList = toDataList(polygons, null, 'int32');
    this.setFaceCountAndAttribute(GeometryAttribute.INDICES, indexList);
  }

  /**
   * Convenience method to get face indices
   * @returns {VariableDataList|null} The face index data
   */
  getFaceIndices() {
    return this.getFaceAttribute(GeometryAttribute.INDICES);
  }

  /**
   * Set face colors. Accepts Color[], float[3][], float[4][], or {r,g,b,a}[].
   * Always stored as RGBA float32 in [0,1] via toColorDataList().
   *
   * @param {Array<Color>|Array<Array<number>>} colors
   */
  setFaceColors(colors) {
    this.setFaceCountAndAttribute(GeometryAttribute.COLORS, toColorDataList(colors));
  }

  getFaceColors() {
    return this.getFaceAttribute(GeometryAttribute.COLORS);
  }

  /**
   * Get a specific polygon by index
   * @param {number} faceIndex - The face/polygon index
   * @returns {Array<number>|null} Array of vertex indices for the polygon
   */
  getPolygon(faceIndex) {
    const indices = this.getFaceIndices();
    if (!indices || !(indices instanceof VariableDataList)) {
      return null;
    }
    
    if (faceIndex < 0 || faceIndex >= indices.length) {
      return null;
    }
    
    return indices.getRow(faceIndex);
  }

  /**
   * Get statistics about the face geometry
   * @returns {Object} Statistics about face sizes
   */
  getFaceStats() {
    const indices = this.getFaceIndices();
    if (!indices || !(indices instanceof VariableDataList)) {
      return { numFaces: 0, minVertices: 0, maxVertices: 0, avgVertices: 0 };
    }
    
    return indices.getStats();
  }

  /**
   * Check if this face set contains only triangles
   * @returns {boolean} True if all faces are triangles
   */
  isTriangular() {
    const stats = this.getFaceStats();
    return stats.minVertices === 3 && stats.maxVertices === 3;
  }

  /**
   * Check if this face set contains only quads
   * @returns {boolean} True if all faces are quads
   */
  isQuadrilateral() {
    const stats = this.getFaceStats();
    return stats.minVertices === 4 && stats.maxVertices === 4;
  }

  /**
   * Validate that a face attribute is compatible with this face set
   * @param {string} attributeName - The attribute name
   * @param {DataList|VariableDataList} dataList - The attribute data
   * @private
   */
  #validateFaceAttribute(attributeName, dataList) {
    if (!dataList || !(dataList instanceof DataList)) {
      throw new Error(`Face attribute '${attributeName}' must be a DataList (RegularDataList or VariableDataList)`);
    }
    
    // Check that the data size matches our face count
    const dataSize = dataList instanceof VariableDataList ? dataList.length : dataList.shape[0];
    
    if (this.#numFaces > 0 && dataSize !== this.#numFaces) {
      throw new Error(
        `Face attribute '${attributeName}' has ${dataSize} entries, ` +
        `but face set has ${this.#numFaces} faces`
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
      if (visitor.visitIndexedFaceSet) {
        visitor.visitIndexedFaceSet(this);
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
    const stats = this.getFaceStats();
    return `IndexedFaceSet(name: "${this.getName()}", points: ${this.getNumPoints()}, ` +
           `faces: ${this.#numFaces}, face-size: ${stats.minVertices}-${stats.maxVertices})`;
  }
}
