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
import { IndexedFaceSetFactory } from '../../core/geometry/IndexedFaceSetFactory.js';
import { GeometryAttribute } from '../../core/scene/GeometryAttribute.js';
import { fromDataList } from '../../core/scene/data/DataUtility.js';
import { WingedEdgeUtility } from '../util/WingedEdgeUtility.js';
import { TriangleGroup } from './TriangleGroup.js';

export class ArchimedeanSolids {
  static archnames = ['100', '010', '001', '101', '110', '011', '111', 'snub'];

  static archimedeanNames = [
    '3.3.3', '3.3.3.3', '3.3.3.3.3', '4.4.4', '5.5.5', '3.4.3.4', '3.4.4.4', '3.4.5.4',
    '3.5.3.5', '3.6.6', '3.8.8', '3.10.10', '4.6.6', '4.6.8', '4.6.10', '5.6.6',
    '3.3.3.3.4', '3.3.3.3.5',
  ];

  static lookupFromNames = [
    [0, 1], [1, 1], [2, 1], [1, 2], [2, 2], [1, 0], [1, 5], [2, 5], [2, 0],
    [0, 4], [1, 4], [2, 4], [0, 6], [1, 6], [2, 6], [2, 3], [4, 7], [5, 7],
  ];

  static archTable = new Map(ArchimedeanSolids.archimedeanNames.map((n, i) => [n, ArchimedeanSolids.lookupFromNames[i]]));

  static debug = false;

  static archimedeanSolid(archnameOrGroup, subtype = null) {
    if (subtype != null) {
      const tg = TriangleGroup.instanceOfGroup(archnameOrGroup);
      ArchimedeanSolids.prepareArchimedeanSolid(tg, subtype);
      const foo = TriangleGroup.getSplitFundamentalRegion(tg);
      const fooall = ArchimedeanSolids.actOnIndexedFaceSet(tg, foo);
      return WingedEdgeUtility.convertConvexPolyhedronToWingedEdge(fooall);
    }
    const which = ArchimedeanSolids.lookupArchimedeanSolid(archnameOrGroup);
    if (!which) throw new Error(`Invalid name for Archimedean solid: ${archnameOrGroup}`);
    return ArchimedeanSolids.archimedeanSolid(TriangleGroup.trinames[which[0]], ArchimedeanSolids.archnames[which[1]]);
  }

  static getArchimedeanNames() {
    return ArchimedeanSolids.archimedeanNames;
  }

  static lookupArchimedeanSolid(archname) {
    return ArchimedeanSolids.archTable.get(archname) ?? null;
  }

  static prepareArchimedeanSolid(tg, subtype) {
    tg.update();
    const metric = tg.getMetric();
    if (subtype === '100') tg.setCenterPoint(tg.getTriangle()[0]);
    else if (subtype === '001') tg.setCenterPoint(tg.getTriangle()[1]);
    else if (subtype === '010') tg.setCenterPoint(tg.getTriangle()[2]);
    else if (subtype === '110') {
      const mm = Rn.times(null, -1.0, tg.getReflectionPlanes()[0]);
      const midplane = Pn.midPlane(null, mm, tg.getReflectionPlanes()[1], metric);
      tg.setCenterPoint(P3.lineIntersectPlane(null, tg.getTriangle()[0], tg.getTriangle()[1], midplane));
    } else if (subtype === '101') {
      const mm = Rn.times(null, -1.0, tg.getReflectionPlanes()[0]);
      const midplane = Pn.midPlane(null, mm, tg.getReflectionPlanes()[2], metric);
      tg.setCenterPoint(P3.lineIntersectPlane(null, tg.getTriangle()[0], tg.getTriangle()[2], midplane));
    } else if (subtype === '011') {
      const mm = Rn.times(null, -1.0, tg.getReflectionPlanes()[1]);
      const midplane = Pn.midPlane(null, mm, tg.getReflectionPlanes()[2], metric);
      tg.setCenterPoint(P3.lineIntersectPlane(null, tg.getTriangle()[1], tg.getTriangle()[2], midplane));
    } else if (subtype === '111' || subtype === 'snub') {
      let mm = Rn.times(null, -1.0, tg.getReflectionPlanes()[1]);
      const midplane1 = Pn.midPlane(null, mm, tg.getReflectionPlanes()[2], metric);
      mm = Rn.times(null, -1.0, tg.getReflectionPlanes()[0]);
      const midplane2 = Pn.midPlane(null, mm, tg.getReflectionPlanes()[2], metric);
      const plane3 = [0.0, 0.0, 1.0, -1.0];
      const cp = P3.pointFromPlanes(null, midplane1, midplane2, plane3);
      Pn.dehomogenize(cp, cp);
      Pn.setToLength(cp, cp, 1.0, Pn.EUCLIDEAN);

      if (subtype === 'snub') {
        const cp3 = [cp[0], cp[1], cp[2]];
        Rn.normalize(cp3, cp3);
        let error = 1.0;
        const delta = [0, 0, 0];
        const e = [0, 0, 0];
        const d = [0, 0, 0];
        const diffs = Array.from({ length: 3 }, () => [0, 0, 0]);
        const images = Array.from({ length: 3 }, () => [0, 0, 0]);
        const order = [0, 0, 0];
        const fudge = 0.2;
        let count = 0;
        do {
          for (let i = 0; i < 3; i += 1) {
            Rn.matrixTimesVector(images[i], tg.getGenerators()[i].getArray(), cp3);
            d[i] = Math.acos(Rn.innerProduct(images[i], cp3));
            Rn.subtract(diffs[i], tg.getTriangle()[i], cp3);
          }
          error = 0.0;
          ArchimedeanSolids.mysort(d, order);
          for (let i = 0; i < 3; i += 1) {
            e[i] = d[(i + 2) % 3] - d[(i + 1) % 3];
            error += Math.abs(e[i]);
          }
          const biggest = order[2];
          const smallest = order[0];
          let size = 2 * d[biggest] - d[(biggest + 1) % 3] - d[(biggest + 2) % 3];
          Rn.times(delta, fudge * size, diffs[biggest]);
          Rn.add(cp3, delta, cp3);
          size = 2 * d[smallest] - d[(smallest + 1) % 3] - d[(smallest + 2) % 3];
          Rn.times(delta, fudge * size, diffs[smallest]);
          Rn.add(cp3, delta, cp3);
          Rn.normalize(cp3, cp3);
          count += 1;
        } while (error > 0.01 && count < 500);
        cp[0] = cp3[0]; cp[1] = cp3[1]; cp[2] = cp3[2]; cp[3] = 1.0;
      }
      tg.setCenterPoint(cp);
    }
    const foo = TriangleGroup.getSplitFundamentalRegion(tg);
    const fooall = ArchimedeanSolids.actOnIndexedFaceSet(tg, foo);
    return WingedEdgeUtility.convertConvexPolyhedronToWingedEdge(fooall);
  }

  static actOnIndexedFaceSet(dg, ifs) {
    const vertsDL = ifs.getVertexAttribute(GeometryAttribute.COORDINATES);
    const facesDL = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    if (!vertsDL || !facesDL) return ifs;
    const verts = fromDataList(vertsDL);
    const faces = fromDataList(facesDL);
    const elems = dg.getElementList() ?? [];
    if (elems.length === 0) return ifs;

    const allVerts = [];
    const allFaces = [];
    for (let i = 0; i < elems.length; i += 1) {
      const m = elems[i].getArray();
      const base = allVerts.length;
      for (const v of verts) {
        const vv = [v[0], v[1], v[2], v.length > 3 ? v[3] : 1.0];
        const tv = [0, 0, 0, 0];
        Rn.matrixTimesVector(tv, m, vv);
        allVerts.push(Pn.dehomogenize([0, 0, 0, 1], tv));
      }
      for (const f of faces) {
        allFaces.push(f.map((idx) => idx + base));
      }
    }
    const ifsf = new IndexedFaceSetFactory();
    ifsf.setMetric(dg.getMetric());
    ifsf.setVertexCount(allVerts.length);
    ifsf.setFaceCount(allFaces.length);
    ifsf.setVertexCoordinates(allVerts);
    ifsf.setFaceIndices(allFaces);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.setGenerateFaceNormals(true);
    ifsf.update();
    return ifsf.getIndexedFaceSet();
  }

  static mysort(d, o) {
    if (d[0] >= d[1] && d[1] >= d[2]) { o[0] = 2; o[1] = 1; o[2] = 0; return; }
    if (d[0] >= d[2] && d[1] >= d[0]) { o[0] = 2; o[1] = 0; o[2] = 1; return; }
    if (d[0] >= d[2] && d[2] >= d[1]) { o[0] = 1; o[1] = 2; o[2] = 0; return; }
    if (d[0] >= d[1] && d[2] >= d[0]) { o[0] = 1; o[1] = 0; o[2] = 2; return; }
    if (d[1] >= d[2] && d[2] >= d[0]) { o[0] = 0; o[1] = 2; o[2] = 1; return; }
    if (d[1] >= d[0] && d[2] >= d[1]) { o[0] = 0; o[1] = 1; o[2] = 2; }
  }
}

