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
import { DiscreteGroup } from '../core/DiscreteGroup.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { DiscreteGroupSimpleConstraint } from '../core/DiscreteGroupSimpleConstraint.js';
import { DiscreteGroupUtility } from '../core/DiscreteGroupUtility.js';
import { WingedEdge } from '../util/WingedEdge.js';

export class TriangleGroup extends DiscreteGroup {
  static names = [
    '233', '*233', '234', '*234', '3*2', '235', '*235', '236', '*236',
    '244', '*244', '237', '*237', '245', '*245', '224', '*224', '*225',
    '225', '*226', '226', '*228', '228',
  ];

  static trinames = ['*233', '*234', '*235', '233', '234', '235'];

  static faceColors = [
    [1.0, 0.9, 0.0],
    [1.0, 0.3, 0.3],
    [0.5, 0.6, 1.0],
  ];

  static swapZW = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0, 1,
    0, 0, 1, 0,
  ];

  static nameTable = new Map(TriangleGroup.names.map((n, i) => [n, i]));
  static pointGroup3S2Factory = null;

  constructor() {
    super();
    this.mirrorGroup = false;
    this.p = 2;
    this.q = 3;
    this.r = 3;
    this.vertices = null;
    this.reflectionPlanes = null;
    this.weights = null;
    this.constrained = false;
  }

  static getNames() {
    return TriangleGroup.names;
  }

  static instanceOf(ip, iq, ir, mirror, name) {
    const tg = new TriangleGroup();
    tg.p = ip;
    tg.q = iq;
    tg.r = ir;
    tg.mirrorGroup = !!mirror;
    tg.vertices = Array.from({ length: 3 }, () => [0, 0, 0, 1]);
    tg.reflectionPlanes = new Array(3).fill(null);
    tg.weights = [0, 0, 0];
    tg.dimension = 2;
    tg.setName(name);
    tg.update();
    return tg;
  }

  static instanceOfGroup(name) {
    if (name === '3*2') {
      if (typeof TriangleGroup.pointGroup3S2Factory === 'function') {
        return TriangleGroup.pointGroup3S2Factory();
      }
      throw new Error('PointGroup3S2 factory not registered');
    }
    let atoms;
    if (name.includes(' ')) atoms = name.split(' ');
    else atoms = Array.from(name);
    if (atoms.length < 3 || atoms.length > 4) {
      throw new Error('Invalid name for triangle group');
    }
    let m = false;
    let idx = 0;
    if (atoms[0].startsWith('*')) {
      m = true;
      idx += 1;
    }
    const ip = Number.parseInt(atoms[idx], 10);
    const iq = Number.parseInt(atoms[idx + 1], 10);
    const ir = Number.parseInt(atoms[idx + 2], 10);
    return TriangleGroup.instanceOf(ip, iq, ir, m, name);
  }

  convertToProjective() {
    if (!(this.metric === Pn.EUCLIDEAN && this.dimension === 3)) return this;
    const tg = TriangleGroup.instanceOf(this.p, this.q, this.r, this.mirrorGroup, this.name);
    return this._convertToProjective(tg);
  }

  _convertToProjective(tg) {
    if (tg.generators) {
      for (const gen of tg.generators) {
        gen.setArray(Rn.conjugateByMatrix(null, gen.getArray(), TriangleGroup.swapZW));
      }
    }
    for (let i = 0; i < 3; i += 1) {
      tg.vertices[i][3] = 0.0;
      Rn.matrixTimesVector(tg.vertices[i], TriangleGroup.swapZW, tg.vertices[i]);
      Pn.dehomogenize(tg.vertices[i], tg.vertices[i]);
      if (!(tg instanceof PointGroup3S2) && tg.reflectionPlanes[i]) {
        Rn.matrixTimesVector(tg.reflectionPlanes[i], TriangleGroup.swapZW, tg.reflectionPlanes[i]);
      }
    }
    tg.metric = Pn.ELLIPTIC;
    tg.dimension = 2;
    tg.setChanged(true);
    tg.update();
    return tg;
  }

  calculateGenerators() {
    const a = Math.PI / this.p;
    const b = Math.PI / this.q;
    const c = Math.PI / this.r;
    if (this.p !== 2) {
      DiscreteGroupUtility.logger.warn('Not a right-angled triangle, not implemented');
      return;
    }

    const reflections = new Array(3);
    if (a + b + c > Math.PI) {
      this.metric = Pn.EUCLIDEAN;
      this.dimension = 3;
      this.isFinite = true;
      const B = Math.acos((Math.cos(b) + Math.cos(a) * Math.cos(c)) / (Math.sin(a) * Math.sin(c)));
      const C = Math.acos((Math.cos(c) + Math.cos(b) * Math.cos(a)) / (Math.sin(b) * Math.sin(a)));
      this.vertices[0][0] = this.vertices[0][1] = 0.0; this.vertices[0][2] = 1.0;
      this.vertices[1][0] = 0.0; this.vertices[1][1] = Math.sin(C); this.vertices[1][2] = Math.cos(C);
      this.vertices[2][0] = Math.sin(B); this.vertices[2][1] = 0.0; this.vertices[2][2] = Math.cos(B);
      for (let i = 0; i < 3; i += 1) {
        this.reflectionPlanes[i] = P3.planeFromPoints(null, P3.originP3, this.vertices[(i + 1) % 3], this.vertices[(i + 2) % 3]);
        reflections[i] = P3.makeReflectionMatrix(null, this.reflectionPlanes[i], Pn.EUCLIDEAN);
      }
    } else if (Math.abs(a + b + c - Math.PI) < 1e-5) {
      this.metric = Pn.EUCLIDEAN;
      this.dimension = 2;
      const B = Math.cos(b);
      const C = Math.cos(c);
      this.vertices[0][0] = C; this.vertices[0][1] = 0; this.vertices[0][2] = 0;
      this.vertices[1][0] = C; this.vertices[1][1] = B; this.vertices[1][2] = 0;
      this.vertices[2][0] = 0; this.vertices[2][1] = 0; this.vertices[2][2] = 0;
      const plane = [0, 0, 0, 0];
      plane[0] = B; plane[1] = -C; plane[2] = 0; plane[3] = 0;
      reflections[0] = P3.makeReflectionMatrix(null, plane, Pn.EUCLIDEAN);
      plane[0] = 0; plane[1] = 1; plane[2] = 0; plane[3] = 0;
      reflections[1] = P3.makeReflectionMatrix(null, plane, Pn.EUCLIDEAN);
      plane[0] = 1; plane[1] = 0; plane[2] = 0; plane[3] = -C;
      reflections[2] = P3.makeReflectionMatrix(null, plane, Pn.EUCLIDEAN);
      this.setConstraint(new DiscreteGroupSimpleConstraint(12.0, 12));
    } else {
      this.metric = Pn.HYPERBOLIC;
      this.dimension = 2;
      this.isFinite = false;
      const B = Pn.acosh((Math.cos(b) + Math.cos(a) * Math.cos(c)) / (Math.sin(a) * Math.sin(c)));
      const d = Pn.tanh(B);
      this.vertices[0][0] = d; this.vertices[0][1] = 0; this.vertices[0][2] = 0;
      this.vertices[1][0] = d; this.vertices[1][1] = d * Math.tan(c); this.vertices[1][2] = 0;
      this.vertices[2][0] = 0; this.vertices[2][1] = 0; this.vertices[2][2] = 0;
      const plane = [0, 0, 0, 0];
      plane[0] = this.vertices[1][1]; plane[1] = -this.vertices[1][0]; plane[2] = 0; plane[3] = 0;
      reflections[0] = P3.makeReflectionMatrix(null, plane, Pn.HYPERBOLIC);
      plane[0] = 0; plane[1] = 1; plane[2] = 0; plane[3] = 0;
      reflections[1] = P3.makeReflectionMatrix(null, plane, Pn.HYPERBOLIC);
      plane[0] = 1; plane[1] = 0; plane[2] = 0; plane[3] = -this.vertices[0][0];
      reflections[2] = P3.makeReflectionMatrix(null, plane, Pn.HYPERBOLIC);
      this.setConstraint(new DiscreteGroupSimpleConstraint(12.0, 12));
    }

    this.generators = new Array(3);
    for (let i = 0; i < 3; i += 1) {
      const gen = new DiscreteGroupElement();
      gen.setWord(DiscreteGroupUtility.genNames[i]);
      if (this.mirrorGroup) gen.setArray(reflections[i]);
      else gen.setArray(Rn.times(null, reflections[(i + 1) % 3], reflections[(i + 2) % 3]));
      this.generators[i] = gen;
    }
  }

  update() {
    if (this.generators == null) this.calculateGenerators();
    super.update();
  }

  getTriangle() {
    return this.vertices;
  }

  isMirrorGroup() {
    return this.mirrorGroup;
  }

  setMirrorGroup(b) {
    this.mirrorGroup = !!b;
  }

  getReflectionPlanes() {
    return this.reflectionPlanes;
  }

  setConstrained(b) {
    this.constrained = !!b;
  }

  static getTenPlaneRegion(tg, d) {
    const domain = new WingedEdge();
    const vertices = tg.getTriangle();
    const centerPoint = tg.getCenterPoint();
    const planes = Array.from({ length: 10 }, () => [0, 0, 0, 0]);
    Pn.setToLength(centerPoint, centerPoint, 1.0, tg.getMetric());
    for (let i = 0; i < 3; i += 1) {
      planes[i] = P3.planeFromPoints(planes[i], P3.originP3, vertices[(2 + i) % 3], vertices[(i + 1) % 3]);
    }
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) planes[i + 3][j] = vertices[i][j];
      planes[i + 3][3] = -Rn.innerProduct(vertices[i], centerPoint, 3);
    }
    for (let j = 0; j < 3; j += 1) planes[6][j] = centerPoint[j];
    planes[6][3] = -d[3];
    for (let i = 0; i < 7; i += 1) domain.cutWithPlane(planes[i], i);
    return domain;
  }

  static getSplitFundamentalRegion(tg, _foo = null) {
    if (tg && tg.constructor && tg.constructor.name === 'PointGroup3S2' && typeof tg.getSplitFundamentalRegion === 'function') {
      return tg.getSplitFundamentalRegion(null);
    }
    const centerPoint = tg.getCenterPoint().slice();
    const mirrorGroup = tg.isMirrorGroup();
    const vertices = tg.getTriangle();
    const metric = tg.getMetric();
    const dimension = tg.getDimension();
    const generators = tg.getGenerators();
    if (metric === Pn.EUCLIDEAN && dimension === 3) {
      Pn.setToLength(centerPoint, centerPoint, 1.0, Pn.EUCLIDEAN);
    }
    tg.setCenterPoint(centerPoint);
    const images = Array.from({ length: 3 }, () => [0, 0, 0, 0]);
    const quads = Array.from({ length: 12 }, () => [0, 0, 0, 1]);
    Rn.copy(quads[0], centerPoint);
    const factor = mirrorGroup ? 0.5 : 1.0;
    for (let i = 0; i < 3; i += 1) {
      const temp = [0, 0, 0, 0];
      Rn.copy(quads[i + 1], vertices[i]);
      Rn.matrixTimesVector(images[i], generators[i].getArray(), centerPoint);
      Pn.dehomogenize(images[i], images[i]);
      Pn.linearInterpolation(temp, centerPoint, images[i], factor, metric);
      Pn.dehomogenize(quads[i + 4], temp);
    }
    quads[7] = quads[0].slice(); quads[8] = quads[6].slice(); quads[9] = quads[0].slice();
    quads[10] = quads[5].slice(); quads[11] = quads[4].slice();

    const tll = [0, 0], tlr = [1, 0], tur = [1, 1], tul = [0, 1];
    const textures = [tll.slice(), tur.slice(), tur.slice(), tur.slice(), tlr.slice(), tul.slice(), tlr.slice(), tll.slice(), tul.slice(), tll.slice(), tlr.slice(), tul.slice()];

    let indices;
    if (!mirrorGroup) {
      if (metric === Pn.EUCLIDEAN && dimension === 3) {
        const plane = [0, 0, 0, 0];
        Rn.planeParallelToPassingThrough(plane, quads[2], quads[0]); P3.lineIntersectPlane(quads[2], P3.originP3, quads[2], plane);
        Rn.planeParallelToPassingThrough(plane, quads[3], quads[0]); P3.lineIntersectPlane(quads[3], P3.originP3, quads[3], plane);
      }
      indices = [[0, 4, 5], [7, 10, 2], [9, 6, 3]];
    } else {
      if (metric === Pn.EUCLIDEAN && dimension === 3) {
        const plane = [0, 0, 0, 0];
        Rn.planeParallelToPassingThrough(plane, quads[1], quads[0]); P3.lineIntersectPlane(quads[1], P3.originP3, quads[1], plane);
        Rn.planeParallelToPassingThrough(plane, quads[2], quads[0]); P3.lineIntersectPlane(quads[2], P3.originP3, quads[2], plane);
        Rn.planeParallelToPassingThrough(plane, quads[3], quads[0]); P3.lineIntersectPlane(quads[3], P3.originP3, quads[3], plane);
      }
      indices = [[0, 6, 1, 5], [7, 4, 2, 8], [9, 10, 3, 11]];
    }

    const ifsf = new IndexedFaceSetFactory();
    ifsf.setMetric(metric);
    ifsf.setVertexCount(quads.length);
    ifsf.setFaceCount(indices.length);
    ifsf.setVertexCoordinates(quads);
    let offset = 0.0;
    const third = 1.0 / 3.0;
    for (const face of indices) {
      for (const j of face) textures[j][0] = offset + third * textures[j][0];
      offset += third;
    }
    ifsf.setVertexTextureCoordinates(textures);
    ifsf.setFaceIndices(indices);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.setGenerateFaceNormals(true);
    if (TriangleGroup.faceColors != null) ifsf.setFaceColors(TriangleGroup.faceColors);
    ifsf.update();
    return ifsf.getIndexedFaceSet();
  }

  static getDefaultFundamentalRegion(tg) {
    const vertices = tg.getTriangle();
    if (vertices == null) return null;
    tg.setCenterPoint(Rn.average(null, vertices));
    const ifsf = IndexedFaceSetUtility.constructPolygonFactory(null, vertices, Pn.EUCLIDEAN);
    ifsf.setEdgeCount(3);
    ifsf.setEdgeIndices([[0, 1], [1, 2], [2, 0]]);
    ifsf.update();
    return ifsf.getIndexedFaceSet();
  }

  getDefaultFundamentalRegion() {
    return TriangleGroup.getDefaultFundamentalRegion(this);
  }
}

