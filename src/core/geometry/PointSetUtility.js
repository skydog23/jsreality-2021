/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as CommonAttributes from '../shader/CommonAttributes.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { Appearance } from '../scene/Appearance.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { fromDataList } from '../scene/data/DataUtility.js';
import { IndexedLineSetFactory } from './IndexedLineSetFactory.js';

/**
 * Utility methods for PointSet geometries.
 */
export class PointSetUtility {
  constructor() {
    throw new Error('PointSetUtility is a static utility class');
  }

  /**
   * Display one line segment per vertex normal.
   *
   * @param {import('../scene/PointSet.js').PointSet} ps
   * @param {number} scale
   * @param {number} metric
   * @returns {SceneGraphComponent}
   */
  static displayVertexNormals(ps, scale, metric) {
    const sgc = new SceneGraphComponent('displayFaceNormals()');
    const ap = new Appearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(`lineShader.${CommonAttributes.TUBES_DRAW}`, false);
    ap.setAttribute(CommonAttributes.FACE_DRAW, false);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    sgc.setAppearance(ap);

    const n = ps.getNumPoints();
    const verts = fromDataList(ps.getVertexAttribute(GeometryAttribute.COORDINATES));
    const normalsDL = ps.getVertexAttribute(GeometryAttribute.NORMALS);
    const normals = normalsDL ? fromDataList(normalsDL) : null;
    if (!normals) {
      throw new Error('must have vertex normals');
    }
    if (!verts || n === 0) {
      return sgc;
    }

    const fiberlength = verts[0].length;
    const nvectors = new Array(2 * n).fill(null).map(() => new Array(fiberlength).fill(0));
    const edges = new Array(n).fill(null).map(() => new Array(2).fill(0));

    for (let i = 0; i < n; ++i) {
      nvectors[i] = [...verts[i]];
      if (metric === Pn.EUCLIDEAN) {
        Rn.add(nvectors[i + n], nvectors[i], Rn.times(null, scale, normals[i]));
      } else {
        Pn.dragTowards(nvectors[i + n], nvectors[i], normals[i], scale, metric);
      }
      if (fiberlength === 4 && metric === Pn.EUCLIDEAN) {
        nvectors[i + n][3] = 1.0;
      }
      edges[i][0] = i;
      edges[i][1] = i + n;
    }

    const ilsf = new IndexedLineSetFactory();
    ilsf.setVertexCount(2 * n);
    ilsf.setVertexCoordinates(nvectors);
    ilsf.setEdgeCount(n);
    ilsf.setEdgeIndices(edges);
    ilsf.update();
    sgc.setGeometry(ilsf.getIndexedLineSet());

    return sgc;
  }
}

