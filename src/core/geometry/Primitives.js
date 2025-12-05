/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's Primitives class (from Primitives.java)
// Large utility class - translating core methods first

import { PointSetFactory } from '../geometry/PointSetFactory.js';
import { MatrixBuilder } from '../math/MatrixBuilder.js';
import * as P3 from '../math/P3.js';
import { EUCLIDEAN } from '../math/Pn.js';
import { Appearance } from '../scene/Appearance.js';
import { toDataList } from '../scene/data/DataUtility.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { IndexedFaceSet } from '../scene/IndexedFaceSet.js';
import { PointSet } from '../scene/PointSet.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Sphere } from '../scene/Sphere.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { SceneGraphUtility } from '../util/SceneGraphUtility.js';
import { IndexedFaceSetFactory } from './IndexedFaceSetFactory.js';
import { IndexedFaceSetUtility } from './IndexedFaceSetUtility.js';
import { IndexedLineSetFactory } from './IndexedLineSetFactory.js';

/**
 * Static methods for generating a variety of geometric primitives.
 * Main categories:
 * - Polyhedra: cube, tetrahedron, icosahedron, pyramids, ...
 * - Approximations to smooth shapes: sphere, cylinder, torus, ...
 * - Points and rectangles
 * - Miscellaneous: clipping planes, ...
 */
export class Primitives {
  
  /**
   * Private constructor - all methods are static
   */
  constructor() {
    throw new Error('Primitives is a static utility class');
  }
  
  static #a = 1.0;
  
  // Cube vertices (3D)
  static #cubeVerts3 = [
    [1.0, 1.0, 1.0],
    [1.0, 1.0, -1.0],
    [1.0, -1.0, 1.0],
    [1.0, -1.0, -1.0],
    [-1.0, 1.0, 1.0],
    [-1.0, 1.0, -1.0],
    [-1.0, -1.0, 1.0],
    [-1.0, -1.0, -1.0]
  ];
  
  // Cube vertices (4D)
  static #cubeVerts4 = [
    [1.0, 1.0, 1.0, 1.0],
    [1.0, 1.0, -1.0, 1.0],
    [1.0, -1.0, 1.0, 1.0],
    [1.0, -1.0, -1.0, 1.0],
    [-1.0, 1.0, 1.0, 1.0],
    [-1.0, 1.0, -1.0, 1.0],
    [-1.0, -1.0, 1.0, 1.0],
    [-1.0, -1.0, -1.0, 1.0]
  ];
  
  // Cube face indices
  static #cubeIndices = [
    [0, 2, 3, 1],
    [1, 5, 4, 0],
    [0, 4, 6, 2],
    [5, 7, 6, 4],
    [2, 6, 7, 3],
    [3, 7, 5, 1]
  ];
  
  // Open cube indices (missing one face)
  static #openCubeIndices = [
    [0, 2, 3, 1],
    [1, 5, 4, 0],
    [5, 7, 6, 4],
    [2, 6, 7, 3],
    [3, 7, 5, 1]
  ];
  
  // Cube face colors
  static #cubeColors = [
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 0],
    [0, 1, 1]
  ];
  
  // Octahedron vertices
  static #octaVerts3 = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
  ];
  
  // Octahedron face indices
  static #octaIndices = [
    [0, 2, 4],
    [2, 1, 4],
    [1, 3, 4],
    [3, 0, 4],
    [2, 0, 5],
    [1, 2, 5],
    [3, 1, 5],
    [0, 3, 5]
  ];
  
  // Tetrahedron vertices
  static #tetrahedronVerts3 = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1]
  ];
  
  // Tetrahedron face indices
  static #tetrahedronIndices = [
    [0, 1, 2],
    [2, 1, 3],
    [1, 0, 3],
    [0, 2, 3]
  ];
  
  // Tetrahedron face colors
  static #tetrahedronColors = [
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 0],
    [1, 0, 1]
  ];
  
  // Icosahedron vertices
  static #icoVerts3 = [
    [0.850651026, 0, 0.525731027],
    [0.850651026, 0, -0.525731027],
    [0.525731027, 0.850651026, 0],
    [0.525731027, -0.850651026, 0.0],
    [0.0, -0.525731027, 0.850651026],
    [0.0, 0.525731027, 0.850651026],
    [-0.850651026, 0, -0.525731027],
    [-0.850651026, 0, 0.525731027],
    [-0.525731027, 0.850651026, 0],
    [0.0, 0.525731027, -0.850651026],
    [0.0, -0.525731027, -0.850651026],
    [-0.525731027, -0.850651026, 0.0]
  ];
  
  // Icosahedron face indices
  static #icoIndices = [
    [0, 1, 2],
    [0, 3, 1],
    [0, 4, 3],
    [0, 5, 4],
    [0, 2, 5],
    [6, 7, 8],
    [6, 8, 9],
    [6, 9, 10],
    [6, 10, 11],
    [6, 11, 7],
    [1, 3, 10],
    [3, 4, 11],
    [4, 5, 7],
    [5, 2, 8],
    [2, 1, 9],
    [7, 11, 4],
    [8, 7, 5],
    [9, 8, 2],
    [10, 9, 1],
    [11, 10, 3]
  ];
  
  // Shared icosahedron instance (lazy initialization)
  static #sharedIcosahedron = null;
  
  /**
   * Get shared icosahedron instance (lazy initialization)
   * @returns {IndexedFaceSet}
   */
  static getSharedIcosahedron() {
    if (Primitives.#sharedIcosahedron == null) {
      Primitives.#sharedIcosahedron = Primitives.icosahedron();
    }
    return Primitives.#sharedIcosahedron;
  }
  
  /**
   * Create a cube (default, no colors)
   * @returns {IndexedFaceSet}
   */
  static cube() {
    return Primitives.cube(false);
  }
  
  /**
   * Create a colored cube
   * @returns {IndexedFaceSet}
   */
  static coloredCube() {
    return Primitives.cube(true);
  }
  
  /**
   * Create an open cube (missing one face)
   * @returns {IndexedFaceSet}
   */
  static openCube() {
    const cube = new IndexedFaceSet();
    cube.setNumPoints(8);
    cube.setNumFaces(5);
    
    const indicesDataList = toDataList(Primitives.#openCubeIndices, null, 'int32');
    const faceAttrs = new Map();
    faceAttrs.set(GeometryAttribute.INDICES, indicesDataList);
    cube.setFaceCountAndAttributes(faceAttrs);
    
    const coordsDataList = toDataList(Primitives.#cubeVerts3);
    const vertexAttrs = new Map();
    vertexAttrs.set(GeometryAttribute.COORDINATES, coordsDataList);
    cube.setVertexCountAndAttributes(vertexAttrs);
    
    IndexedFaceSetUtility.calculateAndSetEdgesFromFaces(cube);
    IndexedFaceSetUtility.calculateAndSetFaceNormals(cube);
    
    return cube;
  }
  
  /**
   * Create a cube with 4D vertices (for non-Euclidean settings)
   * @param {boolean} colored - If true, add face colors
   * @returns {IndexedFaceSet}
   */
  static cube4(colored) {
    const cube = new IndexedFaceSet();
    cube.setNumPoints(8);
    cube.setNumFaces(6);
    
    const indicesDataList = toDataList(Primitives.#cubeIndices, null, 'int32');
    const faceAttrs = new Map();
    faceAttrs.set(GeometryAttribute.INDICES, indicesDataList);
    cube.setFaceCountAndAttributes(faceAttrs);
    
    const coordsDataList = toDataList(Primitives.#cubeVerts4);
    const vertexAttrs = new Map();
    vertexAttrs.set(GeometryAttribute.COORDINATES, coordsDataList);
    cube.setVertexCountAndAttributes(vertexAttrs);
    
    if (colored) {
      const colorsDataList = toDataList(Primitives.#cubeColors);
      const faceColorAttrs = new Map();
      faceColorAttrs.set(GeometryAttribute.COLORS, colorsDataList);
      cube.setFaceAttributes(faceColorAttrs);
    }
    
    IndexedFaceSetUtility.calculateAndSetEdgesFromFaces(cube);
    IndexedFaceSetUtility.calculateAndSetFaceNormals(cube);
    
    return cube;
  }
  
  /**
   * Create a cube
   * @param {boolean} colored - If true, add face colors
   * @returns {IndexedFaceSet}
   */
  static cube(colored) {
    const cube = new IndexedFaceSet();
    cube.setNumPoints(8);
    cube.setNumFaces(6);
    
    const indicesDataList = toDataList(Primitives.#cubeIndices, null, 'int32');
    const faceAttrs = new Map();
    faceAttrs.set(GeometryAttribute.INDICES, indicesDataList);
    cube.setFaceCountAndAttributes(faceAttrs);
    
    const coordsDataList = toDataList(Primitives.#cubeVerts3);
    const vertexAttrs = new Map();
    vertexAttrs.set(GeometryAttribute.COORDINATES, coordsDataList);
    cube.setVertexCountAndAttributes(vertexAttrs);
    
    if (colored) {
      const colorsDataList = toDataList(Primitives.#cubeColors);
      const faceColorAttrs = new Map();
      faceColorAttrs.set(GeometryAttribute.COLORS, colorsDataList);
      cube.setFaceAttributes(faceColorAttrs);
    }
    
    IndexedFaceSetUtility.calculateAndSetEdgesFromFaces(cube);
    IndexedFaceSetUtility.calculateAndSetFaceNormals(cube);
    
    return cube;
  }
  
  /**
   * Create a box (centered at origin)
   * @param {number} width - x-dimension
   * @param {number} height - y-dimension
   * @param {number} depth - z-dimension
   * @param {boolean} colored - If true, add face colors
   * @returns {IndexedFaceSet}
   */
  static box(width, height, depth, colored) {
    return Primitives.box(width, height, depth, colored, EUCLIDEAN);
  }
  
  /**
   * Create a box with specified metric
   * @param {number} width - x-dimension
   * @param {number} height - y-dimension
   * @param {number} depth - z-dimension
   * @param {boolean} colored - If true, add face colors
   * @param {number} metric - Metric (EUCLIDEAN, etc.)
   * @returns {IndexedFaceSet}
   */
  static boxWithMetric(width, height, depth, colored, metric) {
    return Primitives.boxFactory(width, height, depth, colored, metric).getIndexedFaceSet();
  }
  
  /**
   * Create a box factory
   * @param {number} width - x-dimension
   * @param {number} height - y-dimension
   * @param {number} depth - z-dimension
   * @param {boolean} colored - If true, add face colors
   * @param {number} metric - Metric (EUCLIDEAN, etc.)
   * @returns {IndexedFaceSetFactory}
   */
  static boxFactory(width, height, depth, colored, metric) {
    const w = width / 2;
    const h = height / 2;
    const d = depth / 2;
    
    const points = [
      [w, h, d],
      [w, h, -d],
      [w, -h, d],
      [w, -h, -d],
      [-w, h, d],
      [-w, h, -d],
      [-w, -h, d],
      [-w, -h, -d]
    ];
    
    const ifsf = new IndexedFaceSetFactory();
    ifsf.setVertexCount(8);
    ifsf.setVertexCoordinates(points);
    ifsf.setFaceCount(Primitives.#cubeIndices.length);
    ifsf.setFaceIndices(Primitives.#cubeIndices);
    if (colored) ifsf.setFaceColors(Primitives.#cubeColors);
    ifsf.setMetric(metric);
    ifsf.setGenerateFaceNormals(true);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.update();
    return ifsf;
  }
  
  /**
   * Create an octahedron
   * @returns {IndexedFaceSet}
   */
  static octahedron() {
    const ifsf = new IndexedFaceSetFactory();
    ifsf.setVertexCount(6);
    ifsf.setFaceCount(8);
    ifsf.setVertexCoordinates(Primitives.#octaVerts3);
    ifsf.setFaceIndices(Primitives.#octaIndices);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.setGenerateFaceNormals(true);
    ifsf.update();
    return ifsf.getIndexedFaceSet();
  }
  
  /**
   * Create a tetrahedron (default, no colors)
   * @returns {IndexedFaceSet}
   */
  static tetrahedron() {
    return Primitives.tetrahedron(false);
  }
  
  /**
   * Create a colored tetrahedron
   * @returns {IndexedFaceSet}
   */
  static coloredTetrahedron() {
    return Primitives.tetrahedron(true);
  }
  
  /**
   * Create a tetrahedron
   * @param {boolean} colored - If true, add face colors
   * @returns {IndexedFaceSet}
   */
  static tetrahedron(colored) {
    const tetrahedron = new IndexedFaceSet();
    tetrahedron.setNumPoints(4);
    tetrahedron.setNumFaces(4);
    
    const indicesDataList = toDataList(Primitives.#tetrahedronIndices, null, 'int32');
    const faceAttrs = new Map();
    faceAttrs.set(GeometryAttribute.INDICES, indicesDataList);
    tetrahedron.setFaceCountAndAttributes(faceAttrs);
    
    const coordsDataList = toDataList(Primitives.#tetrahedronVerts3);
    const vertexAttrs = new Map();
    vertexAttrs.set(GeometryAttribute.COORDINATES, coordsDataList);
    tetrahedron.setVertexCountAndAttributes(vertexAttrs);
    
    if (colored) {
      const colorsDataList = toDataList(Primitives.#tetrahedronColors);
      const faceColorAttrs = new Map();
      faceColorAttrs.set(GeometryAttribute.COLORS, colorsDataList);
      tetrahedron.setFaceAttributes(faceColorAttrs);
    }
    
    IndexedFaceSetUtility.calculateAndSetEdgesFromFaces(tetrahedron);
    IndexedFaceSetUtility.calculateAndSetFaceNormals(tetrahedron);
    
    return tetrahedron;
  }
  
  /**
   * Create an icosahedron
   * @returns {IndexedFaceSet}
   */
  static icosahedron() {
    const ifsf = new IndexedFaceSetFactory();
    ifsf.setVertexCount(12);
    ifsf.setFaceCount(20);
    ifsf.setVertexCoordinates(Primitives.#icoVerts3);
    ifsf.setFaceIndices(Primitives.#icoIndices);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.setGenerateFaceNormals(true);
    ifsf.update();
    return ifsf.getIndexedFaceSet();
  }
  
  /**
   * Create a single point as a PointSet
   * @param {number[]} center - Center coordinates
   * @returns {PointSet}
   */
  static point(center) {
    return Primitives.pointWithLabel(center, null);
  }
  
  /**
   * Create a single point with optional label
   * @param {number[]} center - Center coordinates
   * @param {string} [label] - Optional label
   * @returns {PointSet}
   */
  static pointWithLabel(center, label) {
    const ps = new PointSet(1);
    const n = center.length;
    const pts = [[...center]];
    const texc = [[0, 0]];
    
    const psf = new PointSetFactory();
    psf.setVertexCount(1);
    psf.setVertexCoordinates(pts);
    psf.update();
    return psf.getPointSet();
      
    // if (label != null) {
    //   const labelsDataList = toDataList([label], null, 'string');
    //   const labelAttrs = new Map();
    //   labelAttrs.set(GeometryAttribute.LABELS, labelsDataList);
    //   ps.setVertexAttributes(labelAttrs);
    // }
    
    // return ps;
  }
  
  /**
   * Create a PointSet from multiple points
   * @param {number[][]} pts - Array of point coordinates
   * @param {string[]} [label] - Optional array of labels
   * @returns {PointSet}
   */
  static points(pts, label) {
    const n = pts.length;
    const ps = new PointSet(n);
    
    const coordsDataList = toDataList(pts);
    const vertexAttrs = new Map();
    vertexAttrs.set(GeometryAttribute.COORDINATES, coordsDataList);
    ps.setVertexCountAndAttributes(vertexAttrs);
    
    if (label != null) {
      const labelsDataList = toDataList(label, null, 'string');
      const labelAttrs = new Map();
      labelAttrs.set(GeometryAttribute.LABELS, labelsDataList);
      ps.setVertexAttributes(labelAttrs);
    }
    
    return ps;
  }
  
  /**
   * Create a labeled point as a SceneGraphComponent
   * @param {SceneGraphComponent} [sgc] - Optional existing component
   * @param {number[]} center - Center coordinates
   * @param {string} label - Label text
   * @returns {SceneGraphComponent}
   */
  static labelPoint(sgc, center, label) {
    const ps = Primitives.pointWithLabel(center, label);
    let ap;
    
    if (sgc == null) {
      sgc = new SceneGraphComponent();
      ap = new Appearance();
      sgc.setAppearance(ap);
    } else {
      ap = sgc.getAppearance();
    }
    
    sgc.setGeometry(ps);
    ap.setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.POINT_RADIUS, 0.0);
    return sgc;
  }
  
  /**
   * Create a euclidean sphere with given radius and center
   * @param {number} radius - Sphere radius
   * @param {number} x - Center x coordinate
   * @param {number} y - Center y coordinate
   * @param {number} z - Center z coordinate
   * @returns {SceneGraphComponent}
   */
  static sphere(radius, x, y, z) {
    return Primitives.sphereWithCenter(radius, [x, y, z]);
  }
  
  /**
   * Create a euclidean sphere with given radius and center
   * @param {number} radius - Sphere radius
   * @param {number[]} center - Center coordinates
   * @returns {SceneGraphComponent}
   */
  static sphereWithCenter(radius, center) {
    return Primitives.sphereWithMetric(radius, center, EUCLIDEAN);
  }
  
  /**
   * Create a sphere with given radius, center, and metric
   * @param {number} radius - Sphere radius
   * @param {number[]} center - Center coordinates
   * @param {number} metric - Metric (EUCLIDEAN, etc.)
   * @returns {SceneGraphComponent}
   */
  static sphereWithMetric(radius, center, metric) {
    const sgc = SceneGraphUtility.createFullSceneGraphComponent('sphere');
    if (center == null) center = P3.originP3;
    MatrixBuilder.init(null, metric).translate(center).scale(radius).assignTo(sgc.getTransformation());
    sgc.setGeometry(new Sphere());
    return sgc;
  }
  
  /**
   * Construct a regular polygon lying in the (x,y) plane, lying on the unit-circle there,
   * and having order edges.
   * @param {number} order - Number of vertices
   * @returns {IndexedFaceSet}
   */
  static regularPolygon(order) {
    return Primitives.regularPolygon(order, 0.5);
  }
  
  /**
   * Construct a regular polygon lying in the (x,y) plane, lying on the unit-circle there,
   * and having order edges.
   * Offset rotates vertices:
   * - Offset 0.5: an edge touches the X-axis
   * - Offset 0: a vertex touches the X-axis
   * - Offset 1 equals 0
   * @param {number} order - Number of vertices
   * @param {number} offset - Rotation offset (0.0 to 1.0)
   * @returns {IndexedFaceSet}
   */
  static regularPolygon(order, offset) {
    return Primitives.regularPolygonFactory(order, offset).getIndexedFaceSet();
  }
  
  /**
   * Construct a regular polygon factory
   * @param {number} order - Number of vertices
   * @param {number} offset - Rotation offset (0.0 to 1.0)
   * @returns {IndexedFaceSetFactory}
   */
  static regularPolygonFactory(order, offset) {
    const verts = Primitives.regularPolygonVertices(order, offset);
    return IndexedFaceSetUtility.constructPolygonFactory(null, verts, EUCLIDEAN);
  }
  
  /**
   * Generate vertices for a regular polygon
   * @param {number} order - Number of vertices
   * @param {number} offset - Rotation offset (0.0 to 1.0)
   * @returns {number[][]} Array of vertex coordinates
   */
  static regularPolygonVertices(order, offset) {
    const verts = Array(order);
    const start = offset * (2 * Math.PI) / order;
    for (let i = 0; i < order; ++i) {
      const angle = start + i * 2.0 * Math.PI / order;
      verts[i] = [Math.cos(angle), Math.sin(angle), 0.0];
    }
    return verts;
  }
  
  static regularGrid(size, incr) {

    const xmin = -size / 2, xmax = size / 2, ymin = -size / 2, ymax = size / 2;
    const num = size / incr + 1;
    const topV = Array(num).fill(0).map((_, i) => [xmin + i * incr, ymax, 0, 1]);
    const bottomV = Array(num).fill(0).map((_, i) => [xmin + i * incr, ymin, 0, 1]);
    const leftH = Array(num).fill(0).map((_, i) => [xmin, ymin + i * incr, 0, 1]);
    const rightH = Array(num).fill(0).map((_, i) => [xmax, ymin + i * incr, 0, 1]);
    const verts = [...topV, ...bottomV, ...leftH, ...rightH];
    const indup = Array(num).fill(0).map((_, i) => [i, i + num]);
    const indlr = Array(num).fill(0).map((_, i) => [2 * num + i, 2 * num + i + num]);
    const inds = [...indup, ...indlr];
    
    const factory = new IndexedLineSetFactory();
    factory.setVertexCount(verts.length);
    factory.setVertexCoordinates(verts);
    factory.setEdgeCount(inds.length);
    factory.setEdgeIndices(inds);
    factory.update();
    
    const gridIFS = factory.getIndexedLineSet();
    return gridIFS;
  }
  // Note: cylinder() and torus() methods require QuadMeshFactory - skipped for now
  // Note: wireframeSphere() methods require IndexedLineSetFactory - can be added later
  // Note: regularAnnulus() requires QuadMeshFactory - skipped for now
}

