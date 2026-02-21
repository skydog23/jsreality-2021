/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { IndexedFaceSetFactory } from '../../core/geometry/IndexedFaceSetFactory.js';
import { IndexedFaceSetUtility } from '../../core/geometry/IndexedFaceSetUtility.js';
import * as P3 from '../../core/math/P3.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { DiscreteGroupUtility } from '../core/DiscreteGroupUtility.js';
import { TriangleGroup } from './TriangleGroup.js';

export class PointGroup3S2 extends TriangleGroup {
  static texCoord = [[0, 1], [0, 0], [1, 0], [0, 0]];

  constructor() {
    super();
    this.dimension = 3;
    this.metric = Pn.EUCLIDEAN;
    this.isFinite = true;
    this.mirrorGroup = false;
    this.vertices = Array.from({ length: 3 }, () => [0, 0, 0, 1]);
    this.reflectionPlanes = new Array(3).fill(null);
    this.name = '3*2';
    this.update();
  }

  calculateGenerators() {
    const d = 1.0 / Math.sqrt(3.0);
    this.vertices[0][0] = d; this.vertices[0][1] = d; this.vertices[0][2] = d;
    this.vertices[1][0] = 1.0; this.vertices[1][1] = 0.0; this.vertices[1][2] = 0.0;
    this.vertices[2][0] = 0.0; this.vertices[2][1] = 1.0; this.vertices[2][2] = 0.0;

    this.generators = new Array(2);
    this.generators[0] = new DiscreteGroupElement();
    this.generators[0].setWord(DiscreteGroupUtility.genNames[0]);
    this.generators[0].setArray(P3.makeReflectionMatrix(null, [0, 0, 1, 0], Pn.EUCLIDEAN));

    this.generators[1] = new DiscreteGroupElement();
    this.generators[1].setWord(DiscreteGroupUtility.genNames[1]);
    this.generators[1].setArray(P3.makeRotationMatrix(null, [1, 1, 1], (4 * Math.PI) / 3.0));
  }

  convertToProjective() {
    const cp = new PointGroup3S2();
    return this._convertToProjective(cp);
  }

  getSplitFundamentalRegion(_foo = null) {
    const centerPoint3 = this.centerPoint.slice();
    if (this.metric === Pn.ELLIPTIC && this.dimension === 2) {
      Rn.matrixTimesVector(centerPoint3, TriangleGroup.swapZW, centerPoint3);
    }
    Pn.dehomogenize(centerPoint3, centerPoint3);
    let flipped = false;
    for (let i = 0; i < 3; i += 1) {
      if (centerPoint3[i] < 0) {
        centerPoint3[i] *= -1;
        flipped = !flipped;
      }
    }
    let [x, y, z] = centerPoint3;
    if (this.constrained) {
      Pn.setToLength(centerPoint3, centerPoint3, 1.0, Pn.EUCLIDEAN);
      if (x > y && z >= y) { centerPoint3[0] = z; centerPoint3[1] = x; centerPoint3[2] = y; }
      if (z > x && y >= x) { centerPoint3[0] = y; centerPoint3[1] = z; centerPoint3[2] = x; }
    } else {
      if (x > y && x > z) { centerPoint3[0] = z; centerPoint3[1] = x; centerPoint3[2] = y; }
      if (z > x && z > y) { centerPoint3[0] = y; centerPoint3[1] = z; centerPoint3[2] = x; }
    }

    if (this.constrained) {
      x = centerPoint3[0];
      y = centerPoint3[1];
      centerPoint3[2] = 0.0;
      const d = Math.sqrt(2 / (2 - 2 * x * y));
      for (let i = 0; i < 3; i += 1) centerPoint3[i] *= d;
      this.setCenterPoint(centerPoint3);
    }
    if (this.metric === Pn.ELLIPTIC && this.dimension === 2) {
      Rn.matrixTimesVector(centerPoint3, TriangleGroup.swapZW, centerPoint3);
    }

    let quads;
    let indices;
    if (this.constrained) {
      quads = Array.from({ length: 4 }, () => [0, 0, 0, 1]);
      indices = [[0, 1, 2], [0, 2, 3]];
    } else {
      quads = Array.from({ length: 11 }, () => [0, 0, 0, 1]);
      indices = [new Array(3), new Array(4), new Array(4)];
      quads[7] = quads[0];
      quads[8] = quads[2];
      quads[9] = quads[0];
      quads[10] = quads[4];
    }

    Rn.copy(quads[0], centerPoint3);
    for (let i = 0; i < 3; i += 1) quads[1][i] = this.vertices[0][i];
    quads[1][3] = 1.0;
    Rn.matrixTimesVector(quads[2], this.generators[1].getArray(), quads[0]);
    Pn.dehomogenize(quads[2], quads[2]);

    if (this.dimension === 3 && this.metric === Pn.EUCLIDEAN) {
      const p3 = Rn.matrixTimesVector(null, this.generators[1].getArray(), quads[2]);
      const plane = P3.planeFromPoints(null, quads[0], quads[2], p3);
      P3.lineIntersectPlane(quads[1], P3.originP3, quads[1], plane);
    }

    if (this.constrained) {
      quads[3][1] = 0.0; quads[3][2] = 0.0; quads[3][0] = quads[2][0]; quads[3][3] = 1.0;
      if (x > y) quads[3][0] = quads[0][0];
    } else {
      indices[0][0] = 0; indices[0][1] = 1; indices[0][2] = 2;
      Rn.matrixTimesVector(quads[4], this.generators[0].getArray(), quads[0]);
      Pn.linearInterpolation(quads[4], quads[0], quads[4], 0.5, Pn.EUCLIDEAN);
      Pn.dehomogenize(quads[4], quads[4]);

      Rn.matrixTimesVector(quads[3], this.generators[0].getArray(), quads[2]);
      Pn.linearInterpolation(quads[3], quads[2], quads[3], 0.5, Pn.EUCLIDEAN);
      Pn.dehomogenize(quads[3], quads[3]);
      indices[1][0] = 7; indices[1][1] = flipped ? 8 : 4; indices[1][2] = 3; indices[1][3] = flipped ? 4 : 8;

      const reflection = P3.makeReflectionMatrix(null, [1, 0, 0, 0], Pn.EUCLIDEAN);
      Rn.matrixTimesVector(quads[5], reflection, quads[0]);
      Pn.linearInterpolation(quads[5], quads[0], quads[5], 0.5, Pn.EUCLIDEAN);
      Pn.dehomogenize(quads[5], quads[5]);
      Rn.matrixTimesVector(quads[6], reflection, quads[4]);
      Pn.linearInterpolation(quads[6], quads[4], quads[6], 0.5, Pn.EUCLIDEAN);
      Pn.dehomogenize(quads[6], quads[6]);
      indices[2][0] = 9; indices[2][1] = flipped ? 10 : 5; indices[2][2] = 6; indices[2][3] = flipped ? 5 : 10;
    }

    const ifsf = new IndexedFaceSetFactory();
    ifsf.setMetric(this.metric);
    ifsf.setVertexCount(quads.length);
    ifsf.setFaceCount(indices.length);
    ifsf.setVertexCoordinates(quads);
    ifsf.setFaceIndices(indices);
    if (this.constrained) {
      ifsf.setGenerateEdgesFromFaces(false);
      ifsf.setEdgeCount(1);
      ifsf.setEdgeIndices([[0, 2]]);
      ifsf.setVertexTextureCoordinates(PointGroup3S2.texCoord);
    } else {
      ifsf.setGenerateEdgesFromFaces(true);
      ifsf.setVertexTextureCoordinates([
        [0, 0], [1, 0], [1, 1], [1, 0], [1, 1], [0, 1], [1, 1], [0, 1], [0, 0], [0, 0], [1, 0],
      ]);
    }
    ifsf.setGenerateFaceNormals(true);
    if (TriangleGroup.faceColors && TriangleGroup.faceColors.length === indices.length) ifsf.setFaceColors(TriangleGroup.faceColors);
    ifsf.update();
    return ifsf.getIndexedFaceSet();
  }

  static getSplitFundamentalRegion(tg, foo = null) {
    return tg.getSplitFundamentalRegion(foo);
  }

  setFaceColors(fc) {
    TriangleGroup.faceColors = fc;
  }
}

TriangleGroup.pointGroup3S2Factory = () => new PointGroup3S2();

