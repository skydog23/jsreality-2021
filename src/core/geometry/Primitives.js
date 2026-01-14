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
import { ClippingPlane } from '../scene/ClippingPlane.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { SceneGraphUtility } from '../util/SceneGraphUtility.js';
import { Color } from '../util/Color.js';
import { IndexedFaceSetFactory } from './IndexedFaceSetFactory.js';
import { IndexedFaceSetUtility } from './IndexedFaceSetUtility.js';
import { IndexedLineSetFactory } from './IndexedLineSetFactory.js';
import { IndexedLineSetUtility } from './IndexedLineSetUtility.js';
import { QuadMeshFactory } from './QuadMeshFactory.js';
import { ParametricSurfaceFactory } from './ParametricSurfaceFactory.js';
import * as Rn from '../math/Rn.js';

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
    [-0.850651026, 0, -0.525731027 ],
    [-0.850651026, 0, 0.525731027 ],
    [-0.525731027, 0.850651026, 0],
    [0.0, 0.525731027, -0.850651026],
    [0.0, -0.525731027, -0.850651026],
    [-0.525731027, -0.850651026, 0.0]
  ];

  static #icoVerts4 = [
    [0.850651026, 0, 0.525731027,1  ],
    [0.850651026, 0, -0.525731027,1 ],
    [0.525731027, 0.850651026, 0,1 ],
    [0.525731027, -0.850651026, 0.0,1 ],
    [0.0, -0.525731027, 0.850651026,1 ],
    [0.0, 0.525731027, 0.850651026,1 ],
    [-0.850651026, 0, -0.525731027,1 ],
    [-0.850651026, 0, 0.525731027,1 ],
    [-0.525731027, 0.850651026, 0,1 ],
    [0.0, 0.525731027, -0.850651026,1 ],
    [0.0, -0.525731027, -0.850651026,1 ],
    [-0.525731027, -0.850651026, 0.0,1 ]
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
  static cube(colored = false) {
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
  
  // (collapsed overload) cube(colored=false) is implemented above
  
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
  static tetrahedron(colored = false) {
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
   * Create a colored tetrahedron
   * @returns {IndexedFaceSet}
   */
  static coloredTetrahedron() {
    return Primitives.tetrahedron(true);
  }
  
  // (collapsed overload) tetrahedron(colored=false) is implemented above
  
  /**
   * Create an icosahedron
   * @returns {IndexedFaceSet}
   */
  static icosahedron(dim=3) {
    const ifsf = new IndexedFaceSetFactory();
    ifsf.setVertexCount(12);
    ifsf.setFaceCount(20);
    ifsf.setVertexCoordinates(dim === 3 ? Primitives.#icoVerts3 : Primitives.#icoVerts4);
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
  static regularPolygon(order, offset = 0.5) {
    return Primitives.regularPolygonFactory(order, offset).getIndexedFaceSet();
  }
  
  /**
   * Construct a regular polygon factory
   * @param {number} order - Number of vertices
   * @param {number} offset - Rotation offset (0.0 to 1.0)
   * @returns {IndexedFaceSetFactory}
   */
  static regularPolygonFactory(order, offset=.5) {
    const verts = Primitives.regularPolygonVertices(order, offset);
    return IndexedFaceSetUtility.constructPolygonFactory(null, verts, EUCLIDEAN);
  }
  
  /**
   * Generate vertices for a regular polygon
   * @param {number} order - Number of vertices
   * @param {number} offset - Rotation offset (0.0 to 1.0)
   * @returns {number[][]} Array of vertex coordinates
   */
  static regularPolygonVertices(order, offset=.5) {
    const verts = Array(order);
    const start = offset * (2 * Math.PI) / order;
    for (let i = 0; i < order; ++i) {
      const angle = start + i * 2.0 * Math.PI / order;
      verts[i] = [Math.cos(angle), Math.sin(angle), 0.0, 1.0];
    }
    console.log('regularPolygonVertices: verts', verts);
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

  /**
   * Generate a torus knot as an IndexedLineSet.
   * Port of `Primitives.discreteTorusKnot(double R, double r, int n, int m, int nPts)` from Java.
   *
   * The curve lives in 3D Euclidean space and is returned as a closed curve.
   *
   * @param {number} R major radius
   * @param {number} r minor radius
   * @param {number} n number of windings around the big circle
   * @param {number} m number of windings around the small (meridianal) circle
   * @param {number} nPts number of sample points
   * @returns {import('../scene/IndexedLineSet.js').IndexedLineSet}
   */
  static discreteTorusKnot(R, r, n, m, nPts) {
    const vertices = new Array(nPts);
    for (let i = 0; i < nPts; i++) {
      const angle = (i * 2.0 * Math.PI) / nPts;
      const a = m * angle;
      const A = n * angle;
      const C = Math.cos(A);
      const S = Math.sin(A);
      const c = r * Math.cos(a);
      const s = r * Math.sin(a);
      vertices[i] = [C * (R + c), s, S * (R + c), 1];
    }
    return IndexedLineSetUtility.createCurveFromPoints(vertices, true);
  }

  /**
   * A {@link SceneGraphComponent} with wire-frame sphere (azimuth/elevation coordinate mesh).
   * Port of `Primitives.wireframeSphere()` / `wireframeSphere(int w, int h)`.
   *
   * @param {number} [w=40]
   * @param {number} [h=20]
   * @returns {SceneGraphComponent}
   */
  static wireframeSphere(w = 40, h = 20) {
    const hypersphere = SceneGraphUtility.createFullSceneGraphComponent('wireframe sphere');

    const eps = 1e-5;
    const immersion = {
      isImmutable() { return true; },
      getDimensionOfAmbientSpace() { return 3; },
      evaluate(u, v, targetArray, arrayLocation) {
        targetArray[arrayLocation + 0] = Math.cos(u) * Math.sin(v);
        targetArray[arrayLocation + 1] = Math.sin(u) * Math.sin(v);
        targetArray[arrayLocation + 2] = Math.cos(v);
      }
    };

    const factory = new ParametricSurfaceFactory(immersion);
    factory.setULineCount(w + 1);
    factory.setVLineCount(h + 1);
    factory.setClosedInUDirection(true);
    factory.setClosedInVDirection(false);
    factory.setUMax(2 * Math.PI);
    factory.setVMin(eps);
    factory.setVMax(Math.PI - eps);
    factory.setGenerateEdgesFromFaces(true);
    factory.update();

    hypersphere.setGeometry(factory.getIndexedFaceSet());

    const ap = hypersphere.getAppearance();
    ap.setAttribute(CommonAttributes.FACE_DRAW, false);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.TUBES_DRAW}`, false);
    ap.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, new Color(200, 200, 200));
    ap.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.LINE_WIDTH}`, 0.5);

    return hypersphere;
  }

  /**
   * Cylinder factory (prism approximation) – overload-collapsed port of the Java methods:
   * - cylinder(n)
   * - cylinder(n, r, zmin, zmax, thetamax)
   * - cylinder(n, r, R, zmin, zmax, thetamax)
   * - cylinder(n, r, R, zmin, zmax, thetamax, res)
   *
   * @returns {IndexedFaceSet}
   */
  static cylinder(...args) {
    let n, r, R, zmin, zmax, thetamax, res;
    if (args.length === 1) {
      [n] = args;
      r = 1;
      R = 1;
      zmin = -1;
      zmax = 1;
      thetamax = 2 * Math.PI;
      res = 2;
    } else if (args.length === 5) {
      [n, r, zmin, zmax, thetamax] = args;
      R = r;
      res = 2;
    } else if (args.length === 6) {
      [n, r, R, zmin, zmax, thetamax] = args;
      res = 2;
    } else if (args.length === 7) {
      [n, r, R, zmin, zmax, thetamax, res] = args;
    } else {
      throw new Error(`Primitives.cylinder: unsupported signature (got ${args.length} args)`);
    }

    const rn = n + 1;
    const verts = new Array(res * rn);
    const delta = thetamax / n;
    for (let j = 0; j < res; j++) {
      const melta = zmin + (j / (res - 1.0)) * (zmax - zmin);
      for (let i = 0; i < rn; i++) {
        const angle = i * delta;
        verts[j * rn + i] = [r * Math.cos(angle), R * Math.sin(angle), melta];
      }
    }

    const qmf = new QuadMeshFactory();
    qmf.setULineCount(rn);
    qmf.setVLineCount(res);
    qmf.setClosedInUDirection(Math.abs(2 * Math.PI - thetamax) < 1e-8);
    qmf.setVertexCoordinates(verts);
    qmf.setGenerateEdgesFromFaces(true);
    qmf.setGenerateFaceNormals(true);
    qmf.setGenerateVertexNormals(true);
    qmf.setGenerateTextureCoordinates(true);
    qmf.update();

    const ifs = qmf.getIndexedFaceSet();
    ifs.setGeometryAttributes(
      CommonAttributes.RMAN_PROXY_COMMAND,
      `Cylinder ${r} ${zmin} ${zmax} ${(180.0 / Math.PI) * thetamax}`
    );
    return ifs;
  }

  /**
   * Closed cylinder (with end caps). Overload-collapsed port of:
   * - closedCylinder(n, r, zmin, zmax, thetamax)
   * - closedCylinder(n, r, R, zmin, zmax, thetamax)
   *
   * @returns {SceneGraphComponent}
   */
  static closedCylinder(...args) {
    let n, r, R, zmin, zmax, thetamax;
    if (args.length === 5) {
      [n, r, zmin, zmax, thetamax] = args;
      R = r;
    } else if (args.length === 6) {
      [n, r, R, zmin, zmax, thetamax] = args;
    } else {
      throw new Error(`Primitives.closedCylinder: unsupported signature (got ${args.length} args)`);
    }

    if (Math.abs(thetamax - 2 * Math.PI) > 1e-4) {
      throw new Error('Can only do full cylinders');
    }

    const result = new SceneGraphComponent('closedCylinder');
    const d1 = new SceneGraphComponent('disk1');
    const d2 = new SceneGraphComponent('disk2');

    const cyl = Primitives.cylinder(n, r, R, zmin, zmax, thetamax);
    result.setGeometry(cyl);

    const disk = Primitives.regularPolygon(n, 0.0);
    d1.setGeometry(disk);
    d2.setGeometry(disk);
    result.addChild(d1);
    result.addChild(d2);

    MatrixBuilder.euclidean().translate(0, 0, zmin).scale(r, R, 1).assignTo(d1);
    MatrixBuilder.euclidean().translate(0, 0, zmax).rotateX(Math.PI).scale(r, R, 1).assignTo(d2);
    return result;
  }

  /**
   * Cone (triangulated). Overload-collapsed port of the Java methods:
   * - cone(n)
   * - cone(n, h)
   * - cone(n, h, base)
   *
   * Note: Java's `cone(n, h)` ignores `h` and calls `cone(n, 1.0, false)`;
   * we keep that behavior for parity.
   *
   * @returns {IndexedFaceSet}
   */
  static cone(...args) {
    let n, h, base;
    if (args.length === 1) {
      [n] = args;
      h = 1.0;
      base = false;
    } else if (args.length === 2) {
      [n] = args;
      h = 1.0; // Java parity
      base = false;
    } else if (args.length === 3) {
      [n, h, base] = args;
    } else {
      throw new Error(`Primitives.cone: unsupported signature (got ${args.length} args)`);
    }

    const verts = new Array(n + 1);
    const delta = (2 * Math.PI) / n;
    for (let i = 0; i < n; i++) {
      const angle = i * delta;
      verts[i] = [Math.sin(angle), Math.cos(angle), 0];
    }
    verts[n] = [0, 0, h];

    const nf = base ? n + 1 : n;
    const indices = new Array(nf);
    if (base) indices[nf - 1] = new Array(n);
    for (let i = 0; i < n; i++) {
      indices[i] = [i, n, (i + 1) % n];
      if (base) indices[nf - 1][i] = i;
    }

    const ifsf = new IndexedFaceSetFactory();
    ifsf.setVertexCount(n + 1);
    ifsf.setFaceCount(nf);
    ifsf.setVertexCoordinates(verts);
    ifsf.setFaceIndices(indices);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.setGenerateFaceNormals(true);
    ifsf.setGenerateVertexNormals(true);
    ifsf.update();
    return ifsf.getIndexedFaceSet();
  }

  /**
   * Pyramid: a cone with vertex `tip` over polygon `base`.
   * @param {number[][]} base
   * @param {number[]} tip
   * @returns {IndexedFaceSet}
   */
  static pyramid(base, tip) {
    const n = base.length;
    const l = base[0].length;
    if (l !== tip.length) throw new Error('Points must have same dimension');

    const newVerts = new Array(n + 1);
    for (let i = 0; i < n; i++) newVerts[i] = [...base[i]];
    newVerts[n] = [...tip];

    const indices = new Array(n + 1);
    for (let i = 0; i < n; i++) {
      indices[i] = [i,(i + 1) % n, n];
    }
    indices[n] = new Array(n);
    for (let i = 0; i < n; i++) indices[n][i] = n-i-1;

    const ifsf = new IndexedFaceSetFactory();
    ifsf.setVertexCount(n + 1);
    ifsf.setFaceCount(n + 1);
    ifsf.setVertexCoordinates(newVerts);
    ifsf.setFaceIndices(indices);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.setGenerateFaceNormals(true);
    ifsf.update();
    return ifsf.getIndexedFaceSet();
  }

  /**
   * Regular annulus (a ring) as an IndexedFaceSet.
   * @param {number} order
   * @param {number} offset
   * @param {number} r
   * @returns {IndexedFaceSet}
   */
  static regularAnnulus(order, offset, r) {
    if (r === 0.0) return Primitives.regularPolygon(order, offset);

    const qmf = new QuadMeshFactory();
    const allverts = new Array(2);
    allverts[0] = new Array(order + 1);
    allverts[1] = new Array(order + 1);

    const start = (offset * (2 * Math.PI)) / order;
    for (let i = 0; i <= order; i++) {
      const angle = start + (i * 2.0 * Math.PI) / order;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      allverts[0][i] = [x, y, 0.0];
      allverts[1][i] = [r * x, r * y, 0.0];
    }

    qmf.setULineCount(order + 1);
    qmf.setVLineCount(2);
    qmf.setVertexCoordinates(allverts);
    qmf.setClosedInUDirection(true);
    qmf.setClosedInVDirection(false);
    qmf.setGenerateEdgesFromFaces(true);
    qmf.setGenerateFaceNormals(true);
    qmf.update();
    return qmf.getIndexedFaceSet();
  }

  /**
   * Arrow as an IndexedLineSet.
   * Port of the Java overloads: arrow(..., tipSize) and arrow(..., tipSize, halfArrow).
   *
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @param {number} tipSize
   * @param {boolean} [halfArrow=false]
   * @returns {import('../scene/IndexedLineSet.js').IndexedLineSet}
   */
  static arrow(x0, y0, x1, y1, tipSize, halfArrow = false) {
    const verts = new Array(4);
    verts[0] = [x0, y0, 0.0];
    verts[1] = [x1, y1, 0.0];

    const dx = (x1 - x0) * tipSize;
    const dy = (y1 - y0) * tipSize;
    verts[2] = [x1 - dx + dy, y1 - dy - dx, 0.0];
    verts[3] = [x1 - dx - dy, y1 - dy + dx, 0.0];

    const indices = halfArrow ? [[0, 1], [1, 2]] : [[0, 1], [1, 2], [1, 3]];

    const ilsf = new IndexedLineSetFactory();
    ilsf.setVertexCount(4);
    ilsf.setVertexCoordinates(verts);
    ilsf.setEdgeCount(indices.length);
    ilsf.setEdgeIndices(indices);
    ilsf.update();
    return ilsf.getIndexedLineSet();
  }

  /**
   * Create a clipping plane component with given plane equation and metric.
   * Port of `Primitives.clippingPlane(double[] plane)` and `clippingPlane(double[] plane, int sig)`.
   *
   * @param {number[]} plane [a,b,c,d] for ax+by+cz+d=0
   * @param {number} [sig=EUCLIDEAN]
   * @returns {SceneGraphComponent}
   */
  static clippingPlane(plane, sig = EUCLIDEAN) {
    const normal = [plane[0], plane[1], plane[2], 0.0];
    const rotation = P3.makeRotationMatrix(null, [0, 0, 1], normal);
    const l = Rn.euclideanNormSquared(normal);

    let tform;
    if (l !== 0) {
      const f = -plane[3] / l;
      const tlate = [0, 0, 0, 1.0];
      Rn.times(tlate, f, normal);
      tlate[3] = 1.0;
      const translation = P3.makeTranslationMatrix(null, tlate, sig);
      tform = Rn.times(null, translation, rotation);
    } else {
      tform = rotation;
    }

    const cp = SceneGraphUtility.createFullSceneGraphComponent('clippingPlane');
    cp.getTransformation().setMatrix(tform);
    cp.setGeometry(new ClippingPlane());
    return cp;
  }

  /**
   * Create a torus as an IndexedFaceSet using ParametricSurfaceFactory.
   * Port of `Primitives.torus(double bR, double sR, int bDetail, int sDetail)`.
   *
   * @param {number} bR major radius
   * @param {number} sR minor radius
   * @param {number} bDetail number of samples around major circle
   * @param {number} sDetail number of samples around minor circle
   * @returns {IndexedFaceSet}
   */
  static torus(bR, sR, bDetail, sDetail) {
    const immersion = {
      isImmutable() { return true; },
      getDimensionOfAmbientSpace() { return 3; },
      evaluate(x, y, targetArray, arrayLocation) {
        const sRMulSinY = sR * Math.sin(y);
        targetArray[arrayLocation + 0] = Math.cos(-x) * (bR + sRMulSinY);
        targetArray[arrayLocation + 1] = sR * Math.cos(y);
        targetArray[arrayLocation + 2] = Math.sin(-x) * (bR + sRMulSinY);
      }
    };

    const factory = new ParametricSurfaceFactory(immersion);
    factory.setULineCount(bDetail + 1);
    factory.setVLineCount(sDetail + 1);
    factory.setClosedInUDirection(true);
    factory.setClosedInVDirection(true);
    factory.setUMax(2 * Math.PI);
    factory.setVMax(2 * Math.PI);
    factory.setGenerateFaceNormals(true);
    factory.setGenerateVertexNormals(true);
    factory.setGenerateEdgesFromFaces(true);
    factory.setEdgeFromQuadMesh(true);
    factory.update();

    const ifs = factory.getIndexedFaceSet();
    const rmanproxy =
      `TransformBegin\n` +
      `Rotate 90 1 0 0\n` +
      `Torus ${bR} ${sR} 0 360 360\n` +
      `TransformEnd\n`;
    ifs.setGeometryAttributes(CommonAttributes.RMAN_PROXY_COMMAND, rmanproxy);
    return ifs;
  }

  /**
   * Textured quadrilateral using default points or provided flat array (len 12 or 16).
   * Port of `Primitives.texturedQuadrilateral()` and `texturedQuadrilateral(double[] points)`.
   *
   * @param {number[]|null} [points]
   * @returns {IndexedFaceSet}
   */
  static texturedQuadrilateral(points = null) {
    return Primitives.texturedQuadrilateralFactory(points).getIndexedFaceSet();
  }

  /**
   * Textured quadrilateral factory. Port of:
   * - texturedQuadrilateralFactory()
   * - texturedQuadrilateralFactory(double[] points)
   *
   * @param {number[]|null} [points]
   * @returns {IndexedFaceSetFactory}
   */
  static texturedQuadrilateralFactory(points = null) {
    const defaultPoints = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    const p = points ?? defaultPoints;

    if (!Array.isArray(p) || (p.length !== 12 && p.length !== 16)) {
      throw new Error('texturedQuadrilateralFactory: points must have length 12 (3D) or 16 (4D)');
    }
    const dim = p.length / 4;
    const verts = [
      p.slice(0 * dim, 1 * dim),
      p.slice(1 * dim, 2 * dim),
      p.slice(2 * dim, 3 * dim),
      p.slice(3 * dim, 4 * dim)
    ];

    const factory = new IndexedFaceSetFactory();
    factory.setVertexCount(4);
    factory.setFaceCount(1);
    factory.setVertexCoordinates(verts);
    factory.setFaceIndices([[0, 1, 2, 3]]);
    factory.setVertexTextureCoordinates([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1]
    ]);
    factory.setGenerateVertexNormals(true);
    factory.setGenerateFaceNormals(true);
    factory.setGenerateEdgesFromFaces(true);
    factory.update();
    return factory;
  }

  /**
   * Textured box (cube-like) with per-face texture coordinates.
   * Port of `Primitives.texturedBox(double width, double height, double depth)`.
   *
   * @param {number} width
   * @param {number} height
   * @param {number} depth
   * @returns {IndexedFaceSet}
   */
  static texturedBox(width, height, depth) {
    const x = width / 2;
    const y = height / 2;
    const z = depth / 2;

    const vertexCoordinates = [
      [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], // front
      [x, -y, -z], [x, -y, z], [x, y, z], [x, y, -z], // right
      [x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], // back
      [-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], // left
      [-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z], // top
      [-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z] // bottom
    ];

    const faceIndices = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9, 10, 11],
      [12, 13, 14, 15],
      [16, 17, 18, 19],
      [20, 21, 22, 23]
    ];

    const textureCoordinates = [
      [-x, -y], [x, -y], [x, y], [-x, y], // front
      [-y, -z], [-y, z], [y, z], [y, -z], // right
      [x, -y], [-x, -y], [-x, y], [x, y], // back
      [-y, -z], [-y, z], [y, z], [y, -z], // left
      [-x, z], [x, z], [x, -z], [-x, -z], // top
      [-x, -z], [x, -z], [x, z], [-x, z] // bottom
    ];

    const factory = new IndexedFaceSetFactory();
    factory.setGenerateFaceNormals(true);
    factory.setGenerateEdgesFromFaces(true);
    factory.setVertexCount(24);
    factory.setFaceCount(6);
    factory.setVertexCoordinates(vertexCoordinates);
    factory.setFaceIndices(faceIndices);
    factory.setVertexTextureCoordinates(textureCoordinates);
    factory.update();
    return factory.getIndexedFaceSet();
  }
}

