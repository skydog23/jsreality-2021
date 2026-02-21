/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import * as P3 from '../../core/math/P3.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { GeometryAttribute, attributeForName } from '../../core/scene/GeometryAttribute.js';
import { fromDataList, toDataList } from '../../core/scene/data/DataUtility.js';
import { IndexedFaceSetUtility } from '../../core/geometry/IndexedFaceSetUtility.js';
import { WingedEdge } from './WingedEdge.js';

/**
 * Initial partial port of WingedEdgeUtility.
 * This first pass exposes core static tables and surface-of-revolution helper.
 */
export class WingedEdgeUtility {
  static borromColors = [[0.3, 0.5, 1.0], [0.3, 1.0, 0.5], [1.0, 0.2, 0.2], [0.9, 0.8, 0.8]];

  static edata = [
    [0, 4, 8, 4, 9, 6, 2, 4],
    [2, 6, 4, 10, 6, 11, 4, 3],
    [1, 5, 5, 8, 7, 9, 5, 2],
    [3, 7, 10, 5, 11, 7, 3, 5],
    [0, 2, 0, 8, 1, 10, 4, 0],
    [1, 3, 8, 2, 10, 3, 0, 5],
    [4, 6, 9, 0, 11, 1, 1, 4],
    [5, 7, 2, 9, 3, 11, 5, 1],
    [0, 1, 4, 0, 5, 2, 0, 2],
    [4, 5, 0, 6, 2, 7, 2, 1],
    [2, 3, 1, 4, 3, 5, 3, 0],
    [6, 7, 6, 1, 7, 3, 1, 3],
  ];

  static fdata = [4, 6, 0, 1, 0, 2];

  static builtincmap = [
    [0.8, 0.1, 0.1, 1.0], [0.1, 0.65, 0.4, 1.0], [0.1, 0.1, 0.8, 1.0], [0.9, 0.6, 0.0, 1.0],
    [0.0, 0.6, 0.8, 1.0], [0.5, 0.0, 0.9, 1.0], [0.7, 0.15, 0.1, 1.0], [0.2, 0.2, 0.8, 1.0],
    [0.9, 0.6, 0.02, 1.0], [0.1, 0.3, 0.8, 1.0], [0.1, 0.7, 0.2, 1.0], [0.8, 0.8, 0.4, 1.0],
    [0.7, 0.7, 0.0, 1.0], [0.7, 0.0, 0.7, 1.0], [0.0, 0.7, 0.7, 1.0], [0.9, 0.0, 0.2, 1.0],
    [0.2, 0.6, 0.0, 1.0], [0.0, 0.2, 0.9, 1.0], [0.75, 0.75, 0.75, 1.0], [0.8, 0.4, 0.0, 1.0],
    [0.8, 0.4, 0.0, 1.0], [0.0, 0.4, 0.8, 1.0], [0.0, 0.4, 0.8, 1.0], [0.0, 0.8, 0.4, 1.0],
    [0.0, 0.8, 0.4, 1.0], [0.4, 0.0, 0.8, 1.0],
  ];

  /**
   * Create a surface of revolution by rotating profile around x-axis.
   *
   * @param {number[][]} profile
   * @param {number} num
   * @param {number} angle
   * @returns {number[][]}
   */
  static surfaceOfRevolution(profile, num, angle) {
    if (num <= 1 || profile[0].length < 3) throw new Error('Bad parameters');
    const vals = Array.from({ length: num * profile.length }, () => new Array(profile[0].length).fill(0));
    for (let i = 0; i < num; ++i) {
      const a = (i * angle) / (num - 1);
      const rot = P3.makeRotationMatrixX(null, a);
      for (let j = 0; j < profile.length; ++j) {
        Rn.matrixTimesVector(vals[i * profile.length + j], rot, profile[j]);
      }
    }
    return vals;
  }

  /**
   * @param {import('./WingedEdge.js').WingedEdge} we
   * @returns {number[]}
   */
  static centerPoint(we) {
    const pts = fromDataList(we.getVertexAttribute(GeometryAttribute.COORDINATES));
    return Pn.centroid(null, pts, we.metric);
  }

  /**
   * @param {import('./WingedEdge.js').WingedEdge} we
   * @param {number[]} p
   * @param {number} tolerance
   * @param {number} count
   * @returns {any[]}
   */
  static pointLiesOutsideFace(we, p, tolerance, count = -1) {
    const v = [];
    const p4 = [0, 0, 0, 1];
    Rn.copy(p4, p);
    const faces = we.getFaceList();
    for (let i = 0; i < faces.length; ++i) {
      const f = faces[i];
      const d = Rn.innerProduct(p4, f.plane);
      if (d > tolerance) {
        v.push(f);
        if (count >= 0 && v.length >= count) break;
      }
    }
    return v;
  }

  /**
   * Removes repeated consecutive vertices in face index lists.
   * @param {import('../../core/scene/IndexedFaceSet.js').IndexedFaceSet} ifs
   */
  static removeDuplicateVertices(ifs) {
    const tolerance = 1e-7;
    const vdata = fromDataList(ifs.getVertexAttribute(GeometryAttribute.COORDINATES));
    const indices = fromDataList(ifs.getFaceAttribute(GeometryAttribute.INDICES));
    for (let i = 0; i < indices.length; ++i) {
      const face = indices[i];
      const newIndices = [];
      for (let j = 0; j < face.length; ++j) {
        if (Rn.equals(vdata[face[j]], vdata[face[(j + 1) % face.length]], tolerance)) continue;
        newIndices.push(face[j]);
      }
      indices[i] = newIndices;
    }
    ifs.setFaceIndices(indices);
  }

  /**
   * Convert a convex polyhedron to WingedEdge by repeated half-space cuts.
   * @param {import('../../core/scene/IndexedFaceSet.js').IndexedFaceSet} ifs
   * @returns {WingedEdge}
   */
  static convertConvexPolyhedronToWingedEdge(ifs) {
    const we = new WingedEdge(200.0);
    const faceColors = ifs.getFaceAttribute(GeometryAttribute.COLORS);
    if (faceColors != null) we.setColormap(fromDataList(faceColors));
    WingedEdgeUtility.removeDuplicateVertices(ifs);
    const vv = fromDataList(ifs.getVertexAttribute(GeometryAttribute.COORDINATES));
    const indices = fromDataList(ifs.getFaceAttribute(GeometryAttribute.INDICES));
    for (let i = 0; i < indices.length; ++i) {
      if (indices[i].length < 3) continue;
      const points = [vv[indices[i][0]], vv[indices[i][1]], vv[indices[i][2]]];
      const plane = P3.planeFromPoints(null, points[0], points[1], points[2]);
      if (plane[3] > 0) Rn.times(plane, -1.0, plane);
      we.cutWithPlane(plane, i);
    }
    we.update();
    return we;
  }
}

