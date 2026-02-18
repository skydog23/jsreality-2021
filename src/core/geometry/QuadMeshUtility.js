/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { fromDataList, toDataList } from '../scene/data/DataUtility.js';
import { Dimension } from '../util/Dimension.js';
import { GeometryUtility } from './GeometryUtility.js';

/**
 * Static methods applicable to quad meshes.
 */
export class QuadMeshUtility {
  constructor() {
    throw new Error('QuadMeshUtility is a static utility class');
  }

  /**
   * @param {number[][]|null} curve
   * @param {import('../scene/IndexedFaceSet.js').IndexedFaceSet} ifs
   * @param {number} which
   * @returns {number[][]}
   */
  static extractUParameterCurve(curve, ifs, which) {
    return QuadMeshUtility.extractParameterCurve(curve, ifs, which, 0);
  }

  /**
   * @param {number[][]|null} curve
   * @param {import('../scene/IndexedFaceSet.js').IndexedFaceSet} ifs
   * @param {number} which
   * @returns {number[][]}
   */
  static extractVParameterCurve(curve, ifs, which) {
    return QuadMeshUtility.extractParameterCurve(curve, ifs, which, 1);
  }

  /**
   * Extract a parameter curve from a quad mesh.
   *
   * @param {number[][]|null} curve
   * @param {import('../scene/IndexedFaceSet.js').IndexedFaceSet} ifs
   * @param {number} which
   * @param {0|1} type 0=fixed u, 1=fixed v
   * @returns {number[][]}
   */
  static extractParameterCurve(curve, ifs, which, type) {
    const shape = ifs.getGeometryAttribute(GeometryUtility.QUAD_MESH_SHAPE);
    if (!shape) throw new Error('Not a quad mesh');

    const dim =
      shape instanceof Dimension
        ? shape
        : new Dimension(Number(shape.width ?? shape.getWidth?.() ?? 0), Number(shape.height ?? shape.getHeight?.() ?? 0));
    const uSize = dim.width;
    const vSize = dim.height;

    const verts = fromDataList(ifs.getVertexAttribute(GeometryAttribute.COORDINATES));
    const closedU = false;
    const closedV = false;
    const numverts = uSize * vSize;

    let lim;
    let begin;
    let stride;
    let modulo;
    if (type === 0) {
      lim = closedV ? vSize + 1 : vSize;
      begin = which;
      stride = uSize;
      modulo = numverts;
    } else {
      lim = closedU ? uSize + 1 : uSize;
      begin = which * uSize;
      stride = 1;
      modulo = uSize;
    }

    const n = verts?.[0]?.length ?? 0;
    let out = curve;
    if (!out || out.length !== lim || out[0]?.length !== n) {
      out = new Array(lim).fill(null).map(() => new Array(n).fill(0));
    }

    for (let i = 0, m = 0; i < lim; ++i, m += stride) {
      const xx = begin + (m % modulo);
      const vv = verts[xx];
      for (let j = 0; j < n; ++j) out[i][j] = vv[j];
    }
    return out;
  }

  /**
   * Generate parametric curve edges and set them on a quad mesh.
   *
   * @param {import('../scene/IndexedFaceSet.js').IndexedFaceSet} qm
   */
  static generateAndSetEdgesFromQuadMesh(qm) {
    const shape = qm.getGeometryAttribute(GeometryUtility.QUAD_MESH_SHAPE);
    if (!shape) throw new Error('Not a quad mesh');
    const dim =
      shape instanceof Dimension
        ? shape
        : new Dimension(Number(shape.width ?? shape.getWidth?.() ?? 0), Number(shape.height ?? shape.getHeight?.() ?? 0));

    const uLineCount = dim.width;
    const vLineCount = dim.height;
    const sizeUCurve = vLineCount;
    const sizeVCurve = uLineCount;
    const numVerts = uLineCount * vLineCount;

    const indices = new Array(uLineCount + vLineCount);
    for (let i = 0; i < uLineCount; ++i) {
      indices[i] = new Array(sizeUCurve);
      for (let j = 0; j < sizeUCurve; ++j) {
        indices[i][j] = (j * uLineCount + (i % uLineCount)) % numVerts;
      }
    }
    for (let i = 0; i < vLineCount; ++i) {
      indices[i + uLineCount] = new Array(sizeVCurve);
      for (let j = 0; j < sizeVCurve; ++j) {
        indices[i + uLineCount][j] = (i * uLineCount + (j % uLineCount)) % numVerts;
      }
    }

    const edgeAttrs = new Map();
    edgeAttrs.set(GeometryAttribute.INDICES, toDataList(indices, null, 'int32'));
    qm.setEdgeCountAndAttributes(edgeAttrs);
  }
}

