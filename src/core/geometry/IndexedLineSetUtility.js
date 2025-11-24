/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's IndexedLineSetUtility class (from IndexedLineSetUtility.java)

import { IndexedLineSet } from '../scene/IndexedLineSet.js';
import { IndexedLineSetFactory } from './IndexedLineSetFactory.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { fromDataList, toDataList } from '../scene/data/DataUtility.js';
import * as Rn from '../math/Rn.js';
import * as Pn from '../math/Pn.js';
import { EUCLIDEAN } from '../math/Pn.js';

/**
 * Static methods for constructing, extracting, and modifying 
 * instances of {@link IndexedLineSet}.
 */
export class IndexedLineSetUtility {
  
  /**
   * Private constructor - all methods are static
   */
  constructor() {
    throw new Error('IndexedLineSetUtility is a static utility class');
  }
  
  /**
   * Refine an IndexedLineSet by subdividing each edge segment into n parts
   * @param {IndexedLineSet} ils - Line set to refine
   * @param {number} n - Number of subdivisions per segment
   * @returns {IndexedLineSet}
   */
  static refine(ils, n) {
    return IndexedLineSetUtility.refineFactory(ils, n).getIndexedLineSet();
  }
  
  /**
   * Refine an IndexedLineSet by subdividing each edge segment into n parts
   * @param {IndexedLineSet} ils - Line set to refine
   * @param {number} n - Number of subdivisions per segment
   * @returns {IndexedLineSetFactory}
   */
  static refineFactory(ils, n) {
    const indicesData = ils.getEdgeAttribute(GeometryAttribute.INDICES);
    const indices = fromDataList(indicesData);
    
    let totalSegments = 0;
    for (let i = 0; i < indices.length; ++i) {
      totalSegments += indices[i].length - 1;
    }
    
    const vertsData = ils.getVertexAttribute(GeometryAttribute.COORDINATES);
    const verts = fromDataList(vertsData);
    const numEdges = ils.getNumEdges();
    const veclength = verts[0].length;
    const newVerts = Array(n * totalSegments).fill(null).map(() => new Array(veclength));
    const newIndices = Array(totalSegments).fill(null).map(() => new Array(n));
    
    let runningCount = 0;
    for (let i = 0; i < numEdges; ++i) {
      for (let k = 0; k < indices[i].length - 1; ++k) {
        const i0 = indices[i][k];
        const i1 = indices[i][k + 1];
        const p0 = verts[i0];
        const p1 = verts[i1];
        for (let j = 0; j < n; ++j) {
          const t = j / (n - 1.0);
          const s = 1.0 - t;
          newVerts[runningCount * n + j] = Rn.linearCombination(null, s, p0, t, p1);
          newIndices[runningCount][j] = runningCount * n + j;
        }
        runningCount++;
      }
    }
    
    const ifsf = new IndexedLineSetFactory();
    ifsf.setVertexCount(newVerts.length);
    ifsf.setVertexCoordinates(newVerts);
    ifsf.setEdgeCount(newIndices.length);
    ifsf.setEdgeIndices(newIndices);
    ifsf.update();
    return ifsf;
  }
  
  /**
   * Refine an IndexedLineSet with different refinement levels per edge
   * @param {IndexedLineSet} ils - Line set to refine
   * @param {number[]} which - Array of refinement levels (one per edge)
   * @returns {IndexedLineSet}
   */
  static refine2(ils, which) {
    const indicesData = ils.getEdgeAttribute(GeometryAttribute.INDICES);
    const indices = fromDataList(indicesData);
    
    let totalSegments = 0, totalVerts = 0;
    for (let i = 0; i < indices.length; ++i) {
      const n = which[i];
      totalSegments += indices[i].length - 1;
      totalVerts += (indices[i].length - 1) * (n - 1) + 1;
    }
    
    const vertsData = ils.getVertexAttribute(GeometryAttribute.COORDINATES);
    const verts = fromDataList(vertsData);
    const numEdges = ils.getNumEdges();
    const veclength = verts[0].length;
    const newVerts = Array(totalVerts).fill(null).map(() => new Array(veclength));
    const newIndices = Array(indices.length).fill(null);
    
    let runningCount = 0;
    for (let i = 0; i < numEdges; ++i) {
      const length = indices[i].length;
      const n = which[i];
      newIndices[i] = new Array((length - 1) * (n - 1) + 1);
      let segmentCount = 0;
      for (let k = 0; k < length; ++k) {
        const i0 = indices[i][k];
        const i1 = indices[i][(k === length - 1) ? k : k + 1];
        const p0 = verts[i0];
        const p1 = verts[i1];
        const lim = (k < length - 1) ? n - 1 : 1;
        for (let j = 0; j < lim; ++j) {
          const t = j / (n - 1.0);
          const s = 1.0 - t;
          newVerts[runningCount] = Rn.linearCombination(null, s, p0, t, p1);
          newIndices[i][segmentCount * (n - 1) + j] = runningCount;
          runningCount++;
        }
        segmentCount++;
      }
    }
    
    const ifsf = new IndexedLineSetFactory();
    ifsf.setVertexCount(newVerts.length);
    ifsf.setVertexCoordinates(newVerts);
    ifsf.setEdgeCount(newIndices.length);
    ifsf.setEdgeIndices(newIndices);
    ifsf.update();
    return ifsf.getIndexedLineSet();
  }
  
  /**
   * Remove a vertex from an IndexedLineSetFactory
   * @param {IndexedLineSetFactory} ilsf - Factory to modify
   * @param {number} vertexIndex - Index of vertex to remove
   */
  static removeVertex(ilsf, vertexIndex) {
    const ils = ilsf.getIndexedLineSet();
    const vertsData = ils.getVertexAttribute(GeometryAttribute.COORDINATES);
    const verts = fromDataList(vertsData);
    const nverts = Array(verts.length - 1);
    
    for (let i = 0; i < ilsf.getEdgeCount(); ++i) {
      IndexedLineSetUtility.removeVertexFromEdge(ilsf, vertexIndex, i);
    }
    
    // Now remove the index from the vertex list: have to renumber all indices in the edge indices!
    const edgesData = ils.getEdgeAttribute(GeometryAttribute.INDICES);
    const edges = fromDataList(edgesData);
    
    for (const edgeList of edges) {
      for (let i = 0; i < edgeList.length; ++i) {
        const index = edgeList[i];
        if (index > vertexIndex) edgeList[i] = index - 1;
      }
    }
    
    for (let i = 0, outcount = 0; i < verts.length; ++i) {
      if (i === vertexIndex) continue;
      nverts[outcount++] = verts[i];
    }
    
    ilsf.setVertexCount(nverts.length);
    ilsf.setVertexCoordinates(nverts);
    ilsf.setEdgeIndices(edges);
    ilsf.update();
  }
  
  /**
   * Remove a vertex from a specific edge (leaves the vertex in the vertex list)
   * @param {IndexedLineSetFactory} ilsf - Factory to modify
   * @param {number} vertexIndex - Index of vertex to remove
   * @param {number} edgeIndex - Index of edge to remove vertex from
   */
  static removeVertexFromEdge(ilsf, vertexIndex, edgeIndex) {
    const ils = ilsf.getIndexedLineSet();
    const edgesData = ils.getEdgeAttribute(GeometryAttribute.INDICES);
    const edges = fromDataList(edgesData);
    
    let occurrences = 0;
    for (let i = 0; i < edges[edgeIndex].length; ++i) {
      if (edges[edgeIndex][i] === vertexIndex) occurrences++;
    }
    if (occurrences === 0) return;
    
    console.warn("removing # " + occurrences);
    const newedge = new Array(edges[edgeIndex].length - occurrences);
    let outcount = 0;
    for (let i = 0; i < edges[edgeIndex].length; ++i) {
      if (edges[edgeIndex][i] !== vertexIndex) {
        newedge[outcount++] = edges[edgeIndex][i];
      }
    }
    edges[edgeIndex] = newedge;
    ilsf.setEdgeIndices(edges);
    ilsf.update();
  }
  
  /**
   * Calculate angles at vertices of closed loops
   * @param {number[][]} [angles] - Optional array to store results
   * @param {IndexedLineSet} ils - Line set to calculate angles for
   * @returns {number[][]} Array of angles per edge
   */
  static calculateAngles(angles, ils) {
    const vertsData = ils.getVertexAttribute(GeometryAttribute.COORDINATES);
    const verts = fromDataList(vertsData);
    const indicesData = ils.getEdgeAttribute(GeometryAttribute.INDICES);
    const indices = fromDataList(indicesData);
    const numEdges = ils.getNumEdges();
    
    if (angles == null || angles.length !== indices.length) {
      angles = Array(numEdges);
    }
    
    for (let j = 0; j < numEdges; ++j) {
      const length = indices[j].length - 1;
      let total = 0;
      angles[j] = new Array(length);
      for (let i = 0; i < length; ++i) {
        const prev = indices[j][(i + length - 1) % length];
        const hier = indices[j][i];
        const next = indices[j][(i + 1) % length];
        const v0 = Rn.subtract(null, verts[next], verts[hier]);
        const v1 = Rn.subtract(null, verts[hier], verts[prev]);
        let euclideanAngle = Rn.euclideanAngle(v0, v1);
        const xpro = Rn.crossProduct(null, v0, v1);
        if (xpro[2] > 0) euclideanAngle *= -1.0;
        total = total + euclideanAngle;
        euclideanAngle = Math.PI - euclideanAngle;
        angles[j][i] = euclideanAngle;
      }
      console.warn("total = " + total);
      for (let k = 0; k < angles[j].length; ++k) {
        if (total < 0.0) angles[j][k] = Math.PI * 2.0 - angles[j][k];
        console.warn("angle = " + angles[j][k]);
      }
    }
    
    return angles;
  }
  
  /**
   * Extract a curve from an IndexedLineSet
   * @param {number[][]} [curve] - Optional array to store results
   * @param {IndexedLineSet} ils - Line set to extract from
   * @param {number} i - Edge index to extract
   * @returns {number[][]} Array of vertex coordinates
   */
  static extractCurve(curve, ils, i) {
    const verts = ils.getVertexAttribute(GeometryAttribute.COORDINATES);
    const indices = ils.getEdgeAttribute(GeometryAttribute.INDICES);
    const thisEdge = indices.item(i);
    const n = thisEdge.length;
    
    let output = null;
    if (curve == null || curve.length !== n) {
      output = Array(n);
    } else {
      output = curve;
    }
    
    // Get all vertices as array for direct indexing
    const vertsArray = fromDataList(verts);
    
    for (let j = 0; j < n; ++j) {
      const which = thisEdge[j];
      output[j] = [...vertsArray[which]]; // Copy the vertex array
    }
    
    return output;
  }
  
  /**
   * Extract curve colors from an IndexedLineSet
   * @param {number[][]} [curve] - Optional array to store results
   * @param {IndexedLineSet} ils - Line set to extract from
   * @param {number} i - Edge index to extract
   * @returns {number[][]|null} Array of color values or null if no colors
   */
  static extractCurveColors(curve, ils, i) {
    const verts = ils.getVertexAttribute(GeometryAttribute.COLORS);
    if (verts == null) return null;
    
    const indices = ils.getEdgeAttribute(GeometryAttribute.INDICES);
    const thisEdge = indices.item(i);
    const n = thisEdge.length;
    
    let output = null;
    if (curve == null || curve.length !== n) {
      output = Array(n);
    } else {
      output = curve;
    }
    
    // Get all colors as array for direct indexing
    const colorsArray = fromDataList(verts);
    
    for (let j = 0; j < n; ++j) {
      const which = thisEdge[j];
      output[j] = [...colorsArray[which]]; // Copy the color array
    }
    
    return output;
  }
  
  /**
   * Extract radii from an IndexedLineSet
   * @param {number[]} [curve] - Optional array to store results
   * @param {IndexedLineSet} ils - Line set to extract from
   * @param {number} i - Edge index to extract
   * @returns {number[]|null} Array of radius values or null if no radii
   */
  static extractRadii(curve, ils, i) {
    const vertsData = ils.getVertexAttribute(GeometryAttribute.RELATIVE_RADII);
    if (vertsData == null) return null;
    
    const verts = fromDataList(vertsData);
    const indices = ils.getEdgeAttribute(GeometryAttribute.INDICES);
    const thisEdge = indices.item(i);
    const n = thisEdge.length;
    
    let output = null;
    if (curve == null || curve.length !== n) {
      output = new Array(n);
    } else {
      output = curve;
    }
    
    for (let j = 0; j < n; ++j) {
      const which = thisEdge[j];
      output[j] = verts[which];
    }
    
    return output;
  }
  
  /**
   * Create a curve from points (2D array)
   * @param {number[][]} points - Array of vertex coordinates
   * @param {boolean} closed - Whether the curve is closed
   * @returns {IndexedLineSet}
   */
  static createCurveFromPoints(points, closed) {
    return IndexedLineSetUtility.createCurveFromPointsWithLineSet(null, points, closed);
  }
  
  /**
   * Create a curve from points (2D array) with optional existing line set
   * @param {IndexedLineSet} [g] - Optional existing line set to modify
   * @param {number[][]} points - Array of vertex coordinates
   * @param {boolean} closed - Whether the curve is closed
   * @returns {IndexedLineSet}
   */
  static createCurveFromPointsWithLineSet(g, points, closed) {
    return IndexedLineSetUtility.createCurveFactoryFromPoints(points, closed).getIndexedLineSet();
  }
  
  /**
   * Create a curve factory from points (2D array)
   * @param {number[][]} points - Array of vertex coordinates
   * @param {boolean} closed - Whether the curve is closed
   * @returns {IndexedLineSetFactory}
   */
  static createCurveFactoryFromPoints(points, closed) {
    return IndexedLineSetUtility.createCurveFactoryFromPointsWithFactory(null, points, closed);
  }
  
  /**
   * Create a curve factory from points (2D array) with optional existing factory
   * @param {IndexedLineSetFactory} [ilsf] - Optional existing factory to modify
   * @param {number[][]} points - Array of vertex coordinates
   * @param {boolean} closed - Whether the curve is closed
   * @returns {IndexedLineSetFactory}
   */
  static createCurveFactoryFromPointsWithFactory(ilsf, points, closed) {
    const n = points.length;
    const size = (closed) ? n + 1 : n;
    const ind = [Array(size)];
    for (let i = 0; i < size; ++i) {
      ind[0][i] = (i % n);
    }
    if (ilsf == null) ilsf = new IndexedLineSetFactory();
    ilsf.setVertexCount(points.length);
    ilsf.setVertexCoordinates(points);
    ilsf.setEdgeCount(1);
    ilsf.setEdgeIndices(ind);
    ilsf.update();
    return ilsf;
  }
  
  /**
   * Create a curve from points (flat array)
   * @param {number[]} points - Flat array of vertex coordinates
   * @param {number} fiber - Number of components per vertex
   * @param {boolean} closed - Whether the curve is closed
   * @returns {IndexedLineSet}
   */
  static createCurveFromPointsFlat(points, fiber, closed) {
    return IndexedLineSetUtility.createCurveFromPointsFlatWithLineSet(null, points, fiber, closed);
  }
  
  /**
   * Create a curve from points (flat array) with indices
   * @param {IndexedLineSet} [g] - Optional existing line set to modify
   * @param {number[]} points - Flat array of vertex coordinates
   * @param {number} fiber - Number of components per vertex
   * @param {number[][]} indices - Edge indices
   * @returns {IndexedLineSet}
   */
  static createCurveFromPointsFlatWithIndices(g, points, fiber, indices) {
    const n = points.length / fiber;
    if (g == null) {
      g = new IndexedLineSet(n, indices.length);
    }
    const ils = g;
    
    ils.startWriter();
    try {
      const indicesDataList = toDataList(indices, null, 'int32');
      const coordsDataList = toDataList(points, fiber);
      
      const edgeAttrs = new Map();
      edgeAttrs.set(GeometryAttribute.INDICES, indicesDataList);
      ils.setEdgeCountAndAttributes(edgeAttrs);
      
      const vertexAttrs = new Map();
      vertexAttrs.set(GeometryAttribute.COORDINATES, coordsDataList);
      ils.setVertexCountAndAttributes(vertexAttrs);
    } finally {
      ils.finishWriter();
    }
    
    return g;
  }
  
  /**
   * Create a curve from points (flat array) with optional existing line set
   * @param {IndexedLineSet} [g] - Optional existing line set to modify
   * @param {number[]} points - Flat array of vertex coordinates
   * @param {number} fiber - Number of components per vertex
   * @param {boolean} closed - Whether the curve is closed
   * @returns {IndexedLineSet}
   */
  static createCurveFromPointsFlatWithLineSet(g, points, fiber, closed) {
    const n = points.length / fiber;
    const size = (closed) ? n + 1 : n;
    const ind = [Array(size)];
    for (let i = 0; i < size; ++i) {
      ind[0][i] = (i % n);
    }
    return IndexedLineSetUtility.createCurveFromPointsFlatWithIndices(g, points, fiber, ind);
  }
  
  /**
   * Create a circle as an IndexedLineSet
   * @param {number} n - Number of vertices
   * @param {number} cx - Center X coordinate
   * @param {number} cy - Center Y coordinate
   * @param {number} r - Radius
   * @returns {IndexedLineSet}
   */
  static circle(n, cx, cy, r) {
    return IndexedLineSetUtility.circleFactory(n, cx, cy, r).getIndexedLineSet();
  }
  
  /**
   * Create a circle factory
   * @param {number} n - Number of vertices
   * @param {number} cx - Center X coordinate
   * @param {number} cy - Center Y coordinate
   * @param {number} r - Radius
   * @returns {IndexedLineSetFactory}
   */
  static circleFactory(n, cx, cy, r) {
    const verts = Array(n).fill(null).map(() => new Array(4));
    let angle = 0;
    const delta = Math.PI * 2 / n;
    for (let i = 0; i < n; ++i) {
      angle = i * delta;
      verts[i][0] = cx + r * Math.cos(angle);
      verts[i][1] = cy + r * Math.sin(angle);
      verts[i][2] = 0.0;
      verts[i][3] = 1.0;
    }
    return IndexedLineSetUtility.createCurveFactoryFromPoints(verts, true);
  }
  
  /**
   * Create a unit circle as an IndexedLineSet
   * @param {number} n - Number of vertices
   * @returns {IndexedLineSet}
   */
  static circleUnit(n) {
    return IndexedLineSetUtility.circle(n, 0, 0, 1);
  }
  
  /**
   * Remove segments that are too long (infinity segments)
   * @param {IndexedLineSet} ils - Line set to modify
   * @param {number} distance - Maximum allowed distance
   */
  static removeInfinity(ils, distance) {
    // Convert the edge index list into a list of segments, skipping over all segments 
    // where a w-coordinate sign change is detected.
    const vertsData = ils.getVertexAttribute(GeometryAttribute.COORDINATES);
    const vertsHomogeneous = fromDataList(vertsData);
    // Dehomogenize vertices (modify in place)
    const verts = vertsHomogeneous.map(v => {
      if (v.length === 4) {
        return Pn.dehomogenize(null, v);
      }
      return v;
    });
    
    const eindData = ils.getEdgeAttribute(GeometryAttribute.INDICES);
    const eind = fromDataList(eindData);
    
    // First go through and find where the switches take place
    const goods = [];
    for (let i = 0; i < eind.length; ++i) {
      for (let j = 1; j < eind[i].length; ++j) {
        const i1 = eind[i][j - 1];
        const i2 = eind[i][j];
        const v1 = verts[i1];
        const v2 = verts[i2];
        const d = Pn.distanceBetween(v1, v2, EUCLIDEAN);
        
        if (d <= distance) {
          goods.push([i1, i2]);
        }
      }
    }
    
    const ninds = Array(goods.length);
    let count = 0;
    for (const item of goods) {
      ninds[count] = item;
      count++;
    }
    
    const indicesDataList = toDataList(ninds, null, 'int32');
    const edgeAttrs = new Map();
    edgeAttrs.set(GeometryAttribute.INDICES, indicesDataList);
    ils.setEdgeCountAndAttributes(edgeAttrs);
  }
}

