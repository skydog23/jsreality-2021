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
import { getLogger, setModuleLevel, Level } from '../util/LoggingSystem.js'; 

const logger = getLogger('jsreality.core.geometry.IndexedLineSetUtility');
setModuleLevel(logger.getModuleName(), Level.INFO);

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
    console.log('output: ', output);
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
   * Create a curve from points.
   *
   * This method implements the Java overload set:
   * - createCurveFromPoints(double[][] points, boolean closed)
   * - createCurveFromPoints(IndexedLineSet g, double[][] points, boolean closed)
   * - createCurveFromPoints(double[] points, int fiber, boolean closed)
   * - createCurveFromPoints(IndexedLineSet g, double[] points, int fiber, boolean closed)
   * - createCurveFromPoints(IndexedLineSet g, double[] points, int fiber, int[][] indices)
   *
   * @param {...any} args
   * @returns {IndexedLineSet}
   */
  static createCurveFromPoints(...args) {
    const isNumberArray = (x) => Array.isArray(x) && (x.length === 0 || typeof x[0] === 'number');
    const isArrayOfArrays = (x) => Array.isArray(x) && (x.length === 0 || Array.isArray(x[0]));

    // (double[][] points, boolean closed)
    if (args.length === 2 && isArrayOfArrays(args[0]) && typeof args[1] === 'boolean') {
      const [points, closed] = args;
      return IndexedLineSetUtility.createCurveFactoryFromPoints(points, closed).getIndexedLineSet();
    }

    // (IndexedLineSet g, double[][] points, boolean closed)  -- Java ignores g; we keep signature for parity.
    if (args.length === 3 && args[0] instanceof IndexedLineSet && isArrayOfArrays(args[1]) && typeof args[2] === 'boolean') {
      const [, points, closed] = args;
      return IndexedLineSetUtility.createCurveFactoryFromPoints(points, closed).getIndexedLineSet();
    }

    // (double[] points, int fiber, boolean closed)
    if (args.length === 3 && isNumberArray(args[0]) && Number.isInteger(args[1]) && typeof args[2] === 'boolean') {
      const [points, fiber, closed] = args;
      return IndexedLineSetUtility.createCurveFromPointsFlatWithLineSet(null, points, fiber, closed);
    }

    // (IndexedLineSet g, double[] points, int fiber, boolean closed)
    if (
      args.length === 4 &&
      args[0] instanceof IndexedLineSet &&
      isNumberArray(args[1]) &&
      Number.isInteger(args[2]) &&
      typeof args[3] === 'boolean'
    ) {
      const [g, points, fiber, closed] = args;
      return IndexedLineSetUtility.createCurveFromPointsFlatWithLineSet(g, points, fiber, closed);
    }

    // (IndexedLineSet g, double[] points, int fiber, int[][] indices)
    if (
      args.length === 4 &&
      args[0] instanceof IndexedLineSet &&
      isNumberArray(args[1]) &&
      Number.isInteger(args[2]) &&
      Array.isArray(args[3])
    ) {
      const [g, points, fiber, indices] = args;
      return IndexedLineSetUtility.createCurveFromPointsFlatWithIndices(g, points, fiber, indices);
    }

    throw new Error(`IndexedLineSetUtility.createCurveFromPoints: unsupported signature (${args.length} args)`);
  }
  
  /**
   * @deprecated Use {@link IndexedLineSetUtility.createCurveFromPoints} with overload dispatch.
   * @param {IndexedLineSet} [g] - Optional existing line set to modify
   * @param {number[][]} points - Array of vertex coordinates
   * @param {boolean} closed - Whether the curve is closed
   * @returns {IndexedLineSet}
   */
  static createCurveFromPointsWithLineSet(g, points, closed) {
    return IndexedLineSetUtility.createCurveFromPoints(g, points, closed);
  }
  
  /**
   * Create a curve factory from points.
   *
   * Java overload set:
   * - createCurveFactoryFromPoints(double[][] points, boolean closed)
   * - createCurveFactoryFromPoints(IndexedLineSetFactory ilsf, double[][] points, boolean closed)
   *
   * @param {...any} args
   * @returns {IndexedLineSetFactory}
   */
  static createCurveFactoryFromPoints(...args) {
    const isArrayOfArrays = (x) => Array.isArray(x) && (x.length === 0 || Array.isArray(x[0]));

    if (args.length === 2 && isArrayOfArrays(args[0]) && typeof args[1] === 'boolean') {
      const [points, closed] = args;
      return IndexedLineSetUtility.createCurveFactoryFromPointsWithFactory(null, points, closed);
    }

    if (
      args.length === 3 &&
      args[0] instanceof IndexedLineSetFactory &&
      isArrayOfArrays(args[1]) &&
      typeof args[2] === 'boolean'
    ) {
      const [ilsf, points, closed] = args;
      return IndexedLineSetUtility.createCurveFactoryFromPointsWithFactory(ilsf, points, closed);
    }

    throw new Error(`IndexedLineSetUtility.createCurveFactoryFromPoints: unsupported signature (${args.length} args)`);
  }
  
  /**
   * @deprecated Use {@link IndexedLineSetUtility.createCurveFactoryFromPoints} with overload dispatch.
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
   * @deprecated Use {@link IndexedLineSetUtility.createCurveFromPoints} with overload dispatch.
   * @param {number[]} points - Flat array of vertex coordinates
   * @param {number} fiber - Number of components per vertex
   * @param {boolean} closed - Whether the curve is closed
   * @returns {IndexedLineSet}
   */
  static createCurveFromPointsFlat(points, fiber, closed) {
    return IndexedLineSetUtility.createCurveFromPoints(points, fiber, closed);
  }
  
  /**
   * @deprecated Use {@link IndexedLineSetUtility.createCurveFromPoints} with overload dispatch.
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
   * @deprecated Use {@link IndexedLineSetUtility.createCurveFromPoints} with overload dispatch.
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
  static circle(n, cx = 0, cy = 0, r = 1) {
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
   * @param {IndexedLineSet} pts4 - Array of homogeneous points
   * @param {number} distance - Maximum allowed distance
   * @param {number} tolerance - How close to get to the line at infinity (smaller is closer)
   */
  static removeInfinity(pts4, distance = 2.0, tolerance = 0.001) {
    logger.fine(-1, 'distance = ', distance);
    // Dehomogenize vertices (modify in place)
    const verts = pts4.map(v => (v.length === 4) ? Pn.dehomogenize(null, v) : v);
    // First go through and find where the switches take place
    const fins = [], infs = [];
    for (let i = 0; i < verts.length-1; ++i) {
        let pt0 = verts[i], pt1 = verts[i+1];
        const d = Pn.distanceBetween(pt0, pt1, EUCLIDEAN);
        if (d <= distance || IndexedLineSetUtility.sameSide(pt0, pt1)) {
          fins.push([i,i+1]);
        } else {
          logger.fine(-1, 'inf d = ', `${d.toFixed(6)}`);
          infs.push([i, i+1]);
        }
      }
    
    const ninds = new Array(fins.length+infs.length*2);
    let count = 0;
    for (const item of fins) {
      ninds[count] = item;
      count++;
    }
    for (const item of infs) {
      let np0 = verts[item[0]], np1 = verts[item[1]];
      let V0 =Rn.dehomogenize(null,Rn.add(null,Rn.times(null, -(1+tolerance),np0),np1)), 
      V1 = Rn.dehomogenize(null,Rn.add(null,np0,Rn.times(null, -(1+tolerance),np1)));
      verts.push(V0);
      verts.push(V1);
      logger.finer(-1, 'P0 = ', np0, 'V0 = ', V0, 'V1 = ', V1, 'P1 = ', np1);
      ninds[count++] = [item[0], verts.length - 2];
      ninds[count++] = [verts.length - 1, item[1]];
   }
    const ilsf = new IndexedLineSetFactory();
    ilsf.setVertexCount(verts.length);
    ilsf.setVertexCoordinates(verts);
    ilsf.setEdgeCount(ninds.length);
    ilsf.setEdgeIndices(ninds);
    ilsf.update();
    return ilsf.getIndexedLineSet(null);
  }

  //
  // @param {number[]} pt0 - First point
  // @param {number[]} pt1 - Second point
  // @returns {boolean} - True if the points are on the same side of the line at infinity
  static sameSide(pt0, pt1) {
    return Rn.innerProductN(pt0, pt1, 3) * pt0[3]*pt1[3] > 0;
  }

}

