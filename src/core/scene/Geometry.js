// JavaScript port of jReality's Geometry class (from Geometry.java)
// Simplified data system using Maps and typed arrays for JavaScript environment

import { SceneGraphNode } from './SceneGraphNode.js';
import { DataList, VariableDataList } from './data/index.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */

/**
 * Geometry attribute categories
 */
export const GeometryCategory = {
  VERTEX: 'VERTEX',
  EDGE: 'EDGE', 
  FACE: 'FACE'
};

/**
 * Event fired when geometry changes
 */
export class GeometryEvent extends Event {
  /**
   * @param {Geometry} source - The geometry that changed
   * @param {Set<string>} vertexAttributes - Changed vertex attributes
   * @param {Set<string>} edgeAttributes - Changed edge attributes  
   * @param {Set<string>} faceAttributes - Changed face attributes
   * @param {Set<string>} geometryAttributes - Changed geometry attributes
   */
  constructor(source, vertexAttributes, edgeAttributes, faceAttributes, geometryAttributes) {
    super('geometryChanged');
    this.source = source;
    this.vertexAttributes = vertexAttributes || new Set();
    this.edgeAttributes = edgeAttributes || new Set();
    this.faceAttributes = faceAttributes || new Set();
    this.geometryAttributes = geometryAttributes || new Set();
  }
}



/**
 * A geometry leaf. Supports arbitrary attributes and registering geometry listeners.
 * This simplified version uses Maps for attribute storage and basic typed arrays for data.
 */
export class Geometry extends SceneGraphNode {
  
  /**
   * @type {Map<string, *>} General geometry attributes
   */
  #geometryAttributes = new Map();
  
  /**
   * @type {Map<string, Map<string, DataList>>} Attribute data by category
   */
  #attributeData = new Map();
  
  /**
   * @type {Set<string>} Changed geometry attributes
   */
  #changedGeometryAttributes = new Set();
  
  /**
   * @type {Set<string>} Changed vertex attributes
   */
  #changedVertexAttributes = new Set();
  
  /**
   * @type {Set<string>} Changed edge attributes
   */
  #changedEdgeAttributes = new Set();
  
  /**
   * @type {Set<string>} Changed face attributes
   */
  #changedFaceAttributes = new Set();

  /**
   * Create a new Geometry
   * @param {string} name - Name for the geometry
   */
  constructor(name) {
    super(name);
    
    // Initialize attribute categories
    this.#attributeData.set(GeometryCategory.VERTEX, new Map());
    this.#attributeData.set(GeometryCategory.EDGE, new Map());
    this.#attributeData.set(GeometryCategory.FACE, new Map());
  }

  /**
   * Get all geometry attributes (defensive copy)
   * @returns {Map<string, *>}
   */
  getGeometryAttributes() {
    this.startReader();
    try {
      return new Map(this.#geometryAttributes);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get a specific geometry attribute
   * @param {string} name - The attribute name
   * @returns {*}
   */
  getGeometryAttribute(name) {
    this.startReader();
    try {
      return this.#geometryAttributes.get(name);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set multiple geometry attributes
   * @param {Map<string, *>} attrSet - The attributes to set
   */
  setGeometryAttributes(attrSet) {
    this.checkReadOnly();
    if (attrSet.size === 0) return;
    
    this.startWriter();
    try {
      for (const [key, value] of attrSet) {
        if (value !== null && value !== undefined) {
          this.#geometryAttributes.set(key, value);
        } else {
          this.#geometryAttributes.delete(key);
        }
      }
      this.#fireGeometryAttributesChanged(new Set(attrSet.keys()));
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Set a single geometry attribute
   * @param {string} attr - The attribute name
   * @param {*} value - The attribute value
   */
  setGeometryAttribute(attr, value) {
    this.checkReadOnly();
    this.startWriter();
    try {
      if (value !== null && value !== undefined) {
        this.#geometryAttributes.set(attr, value);
      } else {
        this.#geometryAttributes.delete(attr);
      }
      this.#fireGeometryAttributesChanged(new Set([attr]));
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get the number of entries for a category
   * @param {string} category - The attribute category
   * @returns {number}
   */
  getNumEntries(category) {
    this.startReader();
    try {
      const categoryData = this.#attributeData.get(category);
      if (!categoryData || categoryData.size === 0) return 0;
      
      // Return the size of the first attribute data list
      const firstAttr = categoryData.values().next().value;
      return firstAttr ? firstAttr.size() : 0;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set the number of entries for a category (clears existing data)
   * @param {string} category - The attribute category
   * @param {number} numEntries - The number of entries
   */
  setNumEntries(category, numEntries) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const categoryData = this.#attributeData.get(category);
      if (categoryData) {
        categoryData.clear();
      }
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get all attribute names for a category
   * @param {string} category - The attribute category
   * @returns {Set<string>}
   */
  getAttributeNames(category) {
    this.startReader();
    try {
      const categoryData = this.#attributeData.get(category);
      return categoryData ? new Set(categoryData.keys()) : new Set();
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get attribute data for a category and attribute name
   * @param {string} category - The attribute category
   * @param {string} attr - The attribute name
   * @returns {DataList|null}
   */
  getAttributeData(category, attr) {
    this.startReader();
    try {
      const categoryData = this.#attributeData.get(category);
      return categoryData ? categoryData.get(attr) || null : null;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set attribute data for a category
   * @param {string} category - The attribute category
   * @param {string} attr - The attribute name
   * @param {DataList} dataList - The data list
   */
  setAttributeData(category, attr, dataList) {
    this.checkReadOnly();
    this.startWriter();
    try {
      let categoryData = this.#attributeData.get(category);
      if (!categoryData) {
        categoryData = new Map();
        this.#attributeData.set(category, categoryData);
      }
      
      if (dataList === null) {
        categoryData.delete(attr);
      } else {
        categoryData.set(attr, dataList);
      }
      
      this._fireGeometryDataChanged(category, new Set([attr]));
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Add a geometry listener
   * @param {function(GeometryEvent): void} listener - The listener function
   */
  addGeometryListener(listener) {
    this.startReader();
    this.addEventListener('geometryChanged', listener);
    this.finishReader();
  }

  /**
   * Remove a geometry listener
   * @param {function(GeometryEvent): void} listener - The listener function
   */
  removeGeometryListener(listener) {
    this.startReader();
    this.removeEventListener('geometryChanged', listener);
    this.finishReader();
  }

  /**
   * Mark geometry data as changed
   * @param {string} category - The category that changed
   * @param {Set<string>} attributeKeys - The attributes that changed
   * @protected
   */
  _fireGeometryDataChanged(category, attributeKeys) {
    if (!attributeKeys) return;
    
    if (category === GeometryCategory.VERTEX) {
      for (const attr of attributeKeys) {
        this.#changedVertexAttributes.add(attr);
      }
    } else if (category === GeometryCategory.EDGE) {
      for (const attr of attributeKeys) {
        this.#changedEdgeAttributes.add(attr);
      }
    } else if (category === GeometryCategory.FACE) {
      for (const attr of attributeKeys) {
        this.#changedFaceAttributes.add(attr);
      }
    }
  }

  /**
   * Mark geometry attributes as changed
   * @param {Set<string>} attributeKeys - The attributes that changed
   * @protected
   */
  #fireGeometryAttributesChanged(attributeKeys) {
    if (attributeKeys) {
      for (const attr of attributeKeys) {
        this.#changedGeometryAttributes.add(attr);
      }
    }
  }

  /**
   * Called when writing is finished - fires events for changed attributes
   * @protected
   */
  writingFinished() {
    if (this.#changedVertexAttributes.size > 0 || 
        this.#changedEdgeAttributes.size > 0 || 
        this.#changedFaceAttributes.size > 0 || 
        this.#changedGeometryAttributes.size > 0) {
      
      this.dispatchEvent(new GeometryEvent(
        this,
        this.#changedVertexAttributes,
        this.#changedEdgeAttributes,
        this.#changedFaceAttributes,
        this.#changedGeometryAttributes
      ));
      
      this.#changedVertexAttributes.clear();
      this.#changedEdgeAttributes.clear();
      this.#changedFaceAttributes.clear();
      this.#changedGeometryAttributes.clear();
    }
  }

  /**
   * Accept a visitor
   * @param {SceneGraphVisitor} visitor - The visitor
   */
  accept(visitor) {
    this.startReader();
    try {
      visitor.visitGeometry?.(this) || visitor.visit(this);
    } finally {
      this.finishReader();
    }
  }
}
