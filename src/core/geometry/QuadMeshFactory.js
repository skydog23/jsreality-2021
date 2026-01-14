/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { IndexedFaceSetFactory } from './IndexedFaceSetFactory.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { GeometryUtility } from './GeometryUtility.js';
import { Dimension } from '../util/Dimension.js';
import { EUCLIDEAN } from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { toDataList, fromDataList } from '../scene/data/DataUtility.js';
import { getLogger, Level, Category } from '../util/LoggingSystem.js';

const logger = getLogger('jsreality.core.geometry.QuadMeshFactory');

/**
 * Factory class supporting creation/editing of quad meshes.
 * Port of de.jreality.geometry.QuadMeshFactory.
 *
 * In contrast to IndexedFaceSetFactory, the face indices are generated from the
 * u/v line counts and cannot be set explicitly.
 */
export class QuadMeshFactory extends IndexedFaceSetFactory {
  /** @type {number} */
  #uLineCount = 10;
  /** @type {number} */
  #vLineCount = 10;
  /** @type {number} */
  #uLineCountFast = 10; // mirrors Java's uLineCount_ for fast index(u,v)

  /** @type {boolean} */
  #closedInUDirection = false;
  /** @type {boolean} */
  #closedInVDirection = false;

  /** @type {boolean} */
  #edgeFromQuadMesh = false;

  /** @type {boolean} */
  #generateTextureCoordinates = true;

  /** @type {number} */
  #uTextureScale = 1;
  /** @type {number} */
  #vTextureScale = 1;
  /** @type {number} */
  #uTextureShift = 0;
  /** @type {number} */
  #vTextureShift = 0;

  /** @type {boolean} */
  #generateVertexNormalsFlag = false;
  /** @type {boolean} */
  #generateFaceNormalsFlag = false;

  /**
   * @param {import('../scene/IndexedFaceSet.js').IndexedFaceSet|null} [existing=null]
   * @param {number} [metric=EUCLIDEAN]
   */
  constructor(existing = null, metric = EUCLIDEAN) {
    super(existing, metric);
    this.setMeshSize(10, 10);
    this.setClosedInUDirection(false);
    this.setClosedInVDirection(false);
    this.setGenerateTextureCoordinates(true);
  }

  /**
   * Java convenience name.
   * @returns {import('../scene/IndexedFaceSet.js').IndexedFaceSet}
   */
  getQuadMesh() {
    return this.getIndexedFaceSet();
  }

  // ---------------------------------------------------------------------------
  // Mesh dimensions / closure
  // ---------------------------------------------------------------------------

  /**
   * Mirrors Java's setMeshSize(maxU, maxV).
   * @param {number} maxU
   * @param {number} maxV
   */
  setMeshSize(maxU, maxV) {
    if (maxU < 2 || maxV < 2) {
      throw new Error('line count must be bigger then 1');
    }
    if (maxU === this.getULineCount() && maxV === this.getVLineCount()) return;

    this.#uLineCount = maxU;
    this.#vLineCount = maxV;
    this.#uLineCountFast = maxU;

    // Vertex/face counts are derived; user cannot set them directly.
    super.setVertexCount(this.getULineCount() * this.getVLineCount());
    super.setFaceCount((this.getULineCount() - 1) * (this.getVLineCount() - 1));
  }

  /** @returns {number} */
  getULineCount() {
    return this.#uLineCount;
  }

  /** @returns {number} */
  getVLineCount() {
    return this.#vLineCount;
  }

  /** @param {number} newU */
  setULineCount(newU) {
    this.setMeshSize(newU, this.getVLineCount());
  }

  /** @param {number} newV */
  setVLineCount(newV) {
    this.setMeshSize(this.getULineCount(), newV);
  }

  /** @returns {boolean} */
  isClosedInUDirection() {
    return this.#closedInUDirection;
  }

  /** @returns {boolean} */
  isClosedInVDirection() {
    return this.#closedInVDirection;
  }

  /** @param {boolean} close */
  setClosedInUDirection(close) {
    this.#closedInUDirection = Boolean(close);
  }

  /** @param {boolean} close */
  setClosedInVDirection(close) {
    this.#closedInVDirection = Boolean(close);
  }

  // ---------------------------------------------------------------------------
  // Texture coordinate generation controls
  // ---------------------------------------------------------------------------

  /** @returns {boolean} */
  isGenerateTextureCoordinates() {
    return this.#generateTextureCoordinates;
  }

  /** @param {boolean} generate */
  setGenerateTextureCoordinates(generate) {
    this.#generateTextureCoordinates = Boolean(generate);
  }

  /** @returns {number} */
  getUTextureScale() {
    return this.#uTextureScale;
  }
  /** @param {number} textureScale */
  setUTextureScale(textureScale) {
    if (this.#uTextureScale === textureScale) return;
    this.#uTextureScale = textureScale;
  }

  /** @returns {number} */
  getVTextureScale() {
    return this.#vTextureScale;
  }
  /** @param {number} textureScale */
  setVTextureScale(textureScale) {
    if (this.#vTextureScale === textureScale) return;
    this.#vTextureScale = textureScale;
  }

  /** @returns {number} */
  getUTextureShift() {
    return this.#uTextureShift;
  }
  /** @param {number} textureShift */
  setUTextureShift(textureShift) {
    if (this.#uTextureShift === textureShift) return;
    this.#uTextureShift = textureShift;
  }

  /** @returns {number} */
  getVTextureShift() {
    return this.#vTextureShift;
  }
  /** @param {number} textureShift */
  setVTextureShift(textureShift) {
    if (this.#vTextureShift === textureShift) return;
    this.#vTextureShift = textureShift;
  }

  // ---------------------------------------------------------------------------
  // Edge generation mode
  // ---------------------------------------------------------------------------

  /** @returns {boolean} */
  isEdgeFromQuadMesh() {
    return this.#edgeFromQuadMesh;
  }

  /** @param {boolean} b */
  setEdgeFromQuadMesh(b) {
    this.#edgeFromQuadMesh = Boolean(b);
  }

  // ---------------------------------------------------------------------------
  // Overrides: disallow manual count/indices edits as in Java
  // ---------------------------------------------------------------------------

  /** @override */
  setVertexCount(_count) {
    throw new Error('UnsupportedOperationException');
  }

  /** @override */
  setFaceCount(_count) {
    throw new Error('UnsupportedOperationException');
  }

  /**
   * Disallow setting face indices explicitly (quad mesh indices are generated).
   * @override
   */
  setFaceIndices(_data, _pointsPerFace = null) {
    throw new Error('cannot set indices of a quad mesh');
  }

  /**
   * Disallow setting INDICES through generic face attribute setter.
   * @override
   */
  setFaceAttribute(attribute, data, fiberLength = null) {
    if (attribute === GeometryAttribute.INDICES) {
      throw new Error('cannot set indices of a quad mesh');
    }
    return super.setFaceAttribute(attribute, data, fiberLength);
  }

  // ---------------------------------------------------------------------------
  // Normal generation flags: keep a mirror so we can apply seam smoothing after super.update()
  // ---------------------------------------------------------------------------

  /** @override */
  setGenerateFaceNormals(generate) {
    this.#generateFaceNormalsFlag = Boolean(generate);
    return super.setGenerateFaceNormals(generate);
  }

  /** @override */
  setGenerateVertexNormals(generate) {
    this.#generateVertexNormalsFlag = Boolean(generate);
    return super.setGenerateVertexNormals(generate);
  }

  // ---------------------------------------------------------------------------
  // Convenience overloads mirroring Java: allow rectangular 3D arrays
  // ---------------------------------------------------------------------------

  /**
   * Convenience overload mirroring Java: allow a rectangular 3D array for quad meshes.
   * The left-most index counts rows (v), the middle index counts columns (u),
   * and the right-most index is the vertex fiber.
   *
   * @param {number[][][]} points
   */
  setVertexCoordinates(points) {
    if (points == null) {
      return super.setVertexCoordinates(null);
    }
    // Overload:
    // - setVertexCoordinates(double[][][] points) where points is [v][u][fiber] (quad-mesh shaped)
    // - setVertexCoordinates(double[][] points) where points is [nov][fiber] (flat vertex list)
    // ParametricSurfaceFactory produces the latter.
    if (Array.isArray(points[0]) && typeof points[0][0] === 'number') {
      return super.setVertexCoordinates(/** @type {number[][]} */ (points));
    }
    const npoints = QuadMeshFactory._convertDDDtoDD(/** @type {number[][][]} */ (points), this.getULineCount(), this.getVLineCount());
    return super.setVertexCoordinates(npoints);
  }

  /**
   * @param {number[][][]} data
   */
  setVertexNormals(data) {
    if (data == null) return super.setVertexNormals(null);
    if (Array.isArray(data[0]) && typeof data[0][0] === 'number') {
      return super.setVertexNormals(/** @type {number[][]} */ (data));
    }
    const n = QuadMeshFactory._convertDDDtoDD(/** @type {number[][][]} */ (data), this.getULineCount(), this.getVLineCount());
    return super.setVertexNormals(n);
  }

  /**
   * @param {number[][][]} data
   */
  setVertexColors(data) {
    if (data == null) return super.setVertexColors(null);
    if (Array.isArray(data[0]) && typeof data[0][0] === 'number') {
      return super.setVertexColors(/** @type {number[][]} */ (data));
    }
    const n = QuadMeshFactory._convertDDDtoDD(/** @type {number[][][]} */ (data), this.getULineCount(), this.getVLineCount());
    return super.setVertexColors(n);
  }

  /**
   * @param {number[][][]} data
   */
  setVertexTextureCoordinates(data) {
    if (data == null) return super.setVertexTextureCoordinates(null);
    if (Array.isArray(data[0]) && typeof data[0][0] === 'number') {
      return super.setVertexTextureCoordinates(/** @type {number[][]} */ (data));
    }
    const n = QuadMeshFactory._convertDDDtoDD(/** @type {number[][][]} */ (data), this.getULineCount(), this.getVLineCount());
    return super.setVertexTextureCoordinates(n);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers (generated indices/attributes)
  // ---------------------------------------------------------------------------

  /**
   * @returns {number[][]} face indices (quads)
   * @private
   */
  #generateFaceIndices() {
    const uLineCount = this.getULineCount();
    const vLineCount = this.getVLineCount();

    const numUFaces = uLineCount - 1;
    const numVFaces = vLineCount - 1;
    const numPoints = this.getVertexCount();

    /** @type {number[][]} */
    const indices = new Array(numUFaces * numVFaces);
    let k = 0;
    for (let i = 0; i < numVFaces; i++) {
      for (let j = 0; j < numUFaces; j++, k++) {
        const face = new Array(4);
        face[0] = (i * uLineCount + j);
        face[1] = (((i + 1) * uLineCount) + j) % numPoints;
        face[2] = (((i + 1) * uLineCount) + ((j + 1) % uLineCount)) % numPoints;
        face[3] = ((i * uLineCount) + ((j + 1) % uLineCount)) % numPoints;
        indices[k] = face;
      }
    }
    return indices;
  }

  /**
   * @returns {number[][]} edge indices (polylines) when edgeFromQuadMesh == true
   * @private
   */
  #generateParametricCurveEdgeIndices() {
    const uLineCount = this.getULineCount();
    const vLineCount = this.getVLineCount();
    const numVerts = uLineCount * vLineCount;

    const sizeUCurve = vLineCount;
    const sizeVCurve = uLineCount;
    const nbOfEdges = uLineCount + vLineCount;

    /** @type {number[][]} */
    const indices = new Array(nbOfEdges);

    for (let i = 0; i < uLineCount; i++) {
      const poly = new Array(sizeUCurve);
      for (let j = 0; j < sizeUCurve; j++) {
        poly[j] = ((j * uLineCount) + (i % uLineCount)) % numVerts;
      }
      indices[i] = poly;
    }

    for (let i = 0; i < vLineCount; i++) {
      const poly = new Array(sizeVCurve);
      for (let j = 0; j < sizeVCurve; j++) {
        poly[j] = (i * uLineCount + (j % uLineCount)) % numVerts;
      }
      indices[i + uLineCount] = poly;
    }

    return indices;
  }

  /**
   * @returns {number[][]} texture coordinates (u,v) for each vertex
   * @private
   */
  #generateTextureCoordinatesData() {
    const vLineCount = this.getVLineCount();
    const uLineCount = this.getULineCount();
    const nov = this.getVertexCount();

    /** @type {number[][]} */
    const textureCoordinates = new Array(nov);
    for (let i = 0; i < nov; i++) textureCoordinates[i] = [0, 0];

    const dv = (1.0 / (vLineCount - 1)) * this.#vTextureScale;
    const du = (1.0 / (uLineCount - 1)) * this.#uTextureScale;

    let v = 0;
    for (let iv = 0, firstIndexInULine = 0; iv < vLineCount; iv++, v += dv, firstIndexInULine += uLineCount) {
      let u = 0;
      for (let iu = 0; iu < uLineCount; iu++, u += du) {
        const xy = textureCoordinates[firstIndexInULine + iu];
        xy[0] = u + this.#uTextureShift;
        xy[1] = v + this.#vTextureShift;
      }
    }
    return textureCoordinates;
  }

  /**
   * Apply seam-smoothing for Euclidean vertex normals when the mesh is closed.
   * Mirrors Java's generateVertexNormals seam averaging logic.
   * @private
   */
  #smoothClosedVertexNormalsIfNeeded() {
    if (!this.#generateVertexNormalsFlag) return;
    if (!this.isClosedInUDirection() && !this.isClosedInVDirection()) return;

    const metric = this.getMetric();
    if (metric !== EUCLIDEAN) {
      logger.log(Level.WARNING, Category.ALL, 'currently only eucledian normals used for smoothing');
      return;
    }

    const geom = this.getIndexedFaceSet();
    const normalsDL = geom.getVertexAttribute(GeometryAttribute.NORMALS);
    if (!normalsDL) return;

    // We need a mutable JS array to adjust seams.
    const normals = /** @type {number[][]} */ (fromDataList(normalsDL));
    if (!normals || normals.length === 0) return;

    const uLast = this.getULineCount() - 1;
    const vLast = this.getVLineCount() - 1;

    const index = (u, v) => u + this.#uLineCountFast * v;

    const average = (x, y) => {
      // Java: add then times(2,x) (note comment says unnecessary since normalize later)
      Rn.add(x, x, y);
      Rn.times(x, 2, x);
      Rn.copy(y, x);
    };

    const normalize = (x) => {
      Rn.normalize(x, x);
    };

    if (this.isClosedInUDirection()) {
      for (let i = 0; i < this.getVLineCount(); i++) {
        average(normals[index(0, i)], normals[index(uLast, i)]);
      }
    }

    if (this.isClosedInVDirection()) {
      for (let i = 0; i < this.getULineCount(); i++) {
        average(normals[index(i, 0)], normals[index(i, vLast)]);
        normalize(normals[index(i, 0)]);
        normalize(normals[index(i, vLast)]);
      }
    }

    if (this.isClosedInUDirection()) {
      for (let i = 0; i < this.getVLineCount(); i++) {
        normalize(normals[index(0, i)]);
        normalize(normals[index(uLast, i)]);
      }
    }

    // Write back.
    geom.setVertexAttribute(GeometryAttribute.NORMALS, toDataList(normals));
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  /**
   * Apply all pending changes and (re)generate indices / optional attributes for the quad mesh.
   * @override
   */
  update() {
    // Ensure face indices exist (quad mesh indices are always generated).
    const faces = this.#generateFaceIndices();
    super.setFaceIndices(faces);

    // Edge indices: either generated from faces (default) or parametric curve polylines.
    if (this.isEdgeFromQuadMesh()) {
      super.setGenerateEdgesFromFaces(false);
      const edges = this.#generateParametricCurveEdgeIndices();
      super.setEdgeIndices(edges);
    } else {
      super.setGenerateEdgesFromFaces(true);
    }

    // Texture coordinates: generate only if requested and if not already present.
    if (this.isGenerateTextureCoordinates()) {
      const pending = this._getPendingAttributes();
      const geom = this.getIndexedFaceSet();
      const hasPending = pending.has(GeometryAttribute.TEXTURE_COORDINATES);
      const hasExisting = Boolean(geom.getVertexAttribute(GeometryAttribute.TEXTURE_COORDINATES));
      if (!hasPending && !hasExisting) {
        const txc = this.#generateTextureCoordinatesData();
        super.setVertexTextureCoordinates(txc);
      }
    }

    // Perform standard factory update (counts, apply attributes, optional normal generation, etc.)
    super.update();

    // Tag as quad mesh.
    const geom = this.getIndexedFaceSet();
    geom.setGeometryAttribute(GeometryUtility.QUAD_MESH_SHAPE, new Dimension(this.getULineCount(), this.getVLineCount()));

    // Seam-smoothing for closed meshes (vertex normals).
    this.#smoothClosedVertexNormalsIfNeeded();
  }

  /**
   * Flatten rectangular [v][u][fiber] arrays into [v*u][fiber] as in Java convertDDDtoDD().
   * @param {number[][][]} points
   * @param {number} uLineCount
   * @param {number} vLineCount
   * @returns {number[][]}
   * @private
   */
  static _convertDDDtoDD(points, uLineCount, vLineCount) {
    const lengthv = points.length;
    const lengthu = points[0]?.length ?? 0;
    if (lengthv !== vLineCount || lengthu !== uLineCount) {
      throw new Error('Bad dimension for 3D array');
    }
    /** @type {number[][]} */
    const npoints = new Array(lengthv * lengthu);
    for (let i = 0; i < lengthv; i++) {
      for (let j = 0; j < lengthu; j++) {
        npoints[i * lengthu + j] = points[i][j];
      }
    }
    return npoints;
  }
}

