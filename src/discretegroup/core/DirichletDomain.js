/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { IndexedFaceSet } from '../../core/scene/IndexedFaceSet.js';
import { IndexedFaceSetUtility } from '../../core/geometry/IndexedFaceSetUtility.js';
import { Matrix } from '../../core/math/Matrix.js';
import * as P2 from '../../core/math/P2.js';
import * as P3 from '../../core/math/P3.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { getLogger, Category } from '../../core/util/LoggingSystem.js';
import { DiscreteGroupSimpleConstraint } from './DiscreteGroupSimpleConstraint.js';
import { DiscreteGroupUtility } from './DiscreteGroupUtility.js';
import { WingedEdge } from '../util/WingedEdge.js';
import { WingedEdgeUtility } from '../util/WingedEdgeUtility.js';
import { WallpaperGroup } from '../groups/WallpaperGroup.js';

const logger = getLogger('DirichletDomain');
const zplane1 = [0, 0, 1, 0];
const zplane2 = [0, 0, 1, -0.01];

export class DirichletDomain {
  constructor(dg) {
    this.group = dg;
    this.orbitSize = dg.getMaxDirDomOrbitSize();
    this.dirdomIFS = null;
    this.elementList = null;
    this.doAll3D = true;
    if (dg.getDimension() === 2) this.dirdomIFS = new IndexedFaceSet();
    else if (dg.getDimension() === 3) this.dirdomIFS = new WingedEdge(20.0);
  }

  getDirichletDomain() {
    return this.dirdomIFS;
  }

  update() {
    let tmpWE = null;
    if (this.elementList == null) this.setDirichletDomainOrbit(75);
    const dimension = this.group.getDimension();
    const centerPoint = this.group.getCenterPoint();
    const metric = this.group.getMetric();
    const n = this.elementList.length;
    if (n === 1) return;
    const changeOfBasis = this.group.getChangeOfBasis();
    const cobm = changeOfBasis.getArray();
    const cobim = Rn.inverse(null, cobm);
    const cobCenter = Rn.matrixTimesVector(null, cobm, centerPoint);

    if (dimension === 2) {
      if (!this.doAll3D) {
        const orbit = [0, 0, 0, 1];
        const orbit3 = [0, 0, 1];
        const centerPoint3 = [0, 0, 1];
        const pb = [0, 0, 0];
        let polygon = DiscreteGroupUtility.bigSquare.map((p) => [p[0], p[1], p[2]]);
        P2.projectP3ToP2(centerPoint3, cobCenter);
        for (let i = 1; i < n; ++i) {
          Rn.matrixTimesVector(orbit, this.elementList[i].getArray(), centerPoint);
          Rn.matrixTimesVector(orbit, cobm, orbit);
          P2.projectP3ToP2(orbit3, orbit);
          P2.perpendicularBisector(pb, centerPoint3, orbit3, metric);
          const polygon2 = P2.chopConvexPolygonWithLine(polygon, pb);
          if (polygon2 == null) break;
          polygon = polygon2;
        }
        if (polygon == null) return;
        for (let i = 0; i < polygon.length; ++i) polygon[i][2] = 0.0;
        Rn.matrixTimesVector(polygon, cobim, polygon);
        this.dirdomIFS = IndexedFaceSetUtility.constructPolygon(polygon);
      } else {
        tmpWE = new WingedEdge(20.0);
        tmpWE.cutWithPlane(zplane1, -1, null);
        tmpWE.cutWithPlane(zplane2, -2, null);
      }
    } else if (dimension === 3) {
      tmpWE = this.dirdomIFS;
      tmpWE.init();
    }

    if (tmpWE != null) {
      const orbit = [0, 0, 0, 1];
      const pb = [0, 0, 0, 0];
      tmpWE.setMetric(metric);
      for (let i = 1; i < n; ++i) {
        Rn.matrixTimesVector(orbit, this.elementList[i].getArray(), centerPoint);
        if (Pn.distanceBetween(orbit, centerPoint, metric) < 1e-7) continue;
        P3.perpendicularBisector(pb, cobCenter, orbit, metric);
        Pn.normalizePlane(pb, pb, metric);
        if (!tmpWE.cutWithPlane(pb, i, this.elementList[i])) continue;
        const wd = this.elementList[i].getWord() || '';
        if (wd.length === 1) logger.info(Category.ALL, `word = ${wd}`);
        if (tmpWE.getNumFaces() === 0) return;
        if (i > this.group.getGenerators().length) {
          tmpWE.update();
          if (this.#allFacesMatched(tmpWE)) {
            logger.info(Category.ALL, `dirdom succeeded after ${i} iterations.`);
            break;
          }
        }
      }
      tmpWE.update();
    }

    if (dimension === 2 && this.doAll3D) {
      const foo = tmpWE.getFirstFaceWithTag(-1);
      const verts = tmpWE.getFaceWithIndex(foo);
      if (verts == null) throw new Error('No face found with tag -1');
      this.dirdomIFS = IndexedFaceSetUtility.constructPolygon(verts);
      if (typeof WallpaperGroup.storeEdgeIds === 'function') {
        WallpaperGroup.storeEdgeIds(this.group, this.dirdomIFS);
      }
    }
  }

  #allFacesMatched(we) {
    const unmatched = [...we.getFaceList()];
    do {
      const face = unmatched[0];
      const dge = face.source;
      if (!dge) return false;
      let m = Rn.times(null, dge.getArray(), dge.getArray());
      if (Rn.isIdentityMatrix(m, 1e-7)) {
        unmatched.splice(0, 1);
      } else {
        let matched = false;
        for (const f of we.getFaceList()) {
          if (!unmatched.includes(f)) continue;
          const dge2 = f.source;
          m = Rn.times(null, dge.getArray(), dge2.getArray());
          if (Rn.isIdentityMatrix(m, 1e-7) && this.#isSameFace(we, face, f)) {
            unmatched.splice(unmatched.indexOf(face), 1);
            unmatched.splice(unmatched.indexOf(f), 1);
            matched = true;
            break;
          }
        }
        if (!matched) return false;
      }
    } while (unmatched.length > 0);
    return true;
  }

  #isSameFace(we, f1, f2) {
    WingedEdgeUtility.removeDuplicateVertices(we);
    if (f1.order !== f2.order) return false;
    const v0 = IndexedFaceSetUtility.extractVerticesForFace(we, f1.index);
    let v1 = IndexedFaceSetUtility.extractVerticesForFace(we, f2.index);
    v1 = Rn.matrixTimesVector(null, f1.source.getArray(), v1);
    for (let i = 0; i < v0.length; ++i) {
      let matched = false;
      for (let j = 0; j < v1.length; ++j) {
        const d = Pn.distanceBetween(v0[i], v1[j], this.group.getMetric());
        if (d < 1e-4) {
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
    return true;
  }

  getDirichletDomainOrbitSize() {
    return this.orbitSize;
  }

  setDirichletDomainOrbit(i) {
    this.orbitSize = i;
    const triv = new DiscreteGroupSimpleConstraint(-1, -1, this.orbitSize);
    const proj = this.group.isProjective();
    this.group.setProjective(false);
    this.elementList = DiscreteGroupUtility.generateElements(this.group, triv);
    this.group.setProjective(proj);
  }

  static getPairedFaces(we) {
    const map = new Map();
    let i = 0;
    for (const face of we.faceList) {
      const dge = face.source;
      let j = 0;
      for (const face2 of we.faceList) {
        const dge2 = face2.source;
        if (Rn.isIdentityMatrix(Rn.times(null, dge.getArray(), dge2.getArray()), 1e-7)) {
          map.set(i, j);
        }
        j++;
      }
      i++;
    }
    return map;
  }
}

