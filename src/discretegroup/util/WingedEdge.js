/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { IndexedFaceSet } from '../../core/scene/IndexedFaceSet.js';
import { GeometryAttribute } from '../../core/scene/GeometryAttribute.js';
import { toDataList, fromDataList } from '../../core/scene/data/DataUtility.js';
import { GeometryUtility } from '../../core/geometry/GeometryUtility.js';
import { IndexedFaceSetUtility } from '../../core/geometry/IndexedFaceSetUtility.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { WingedEdgeUtility } from './WingedEdgeUtility.js';

const TOLERANCE = 1e-7;

export class WingedEdge extends IndexedFaceSet {
  constructor(a = 17.0, b = null, c = null, d = null, e = null, f = null) {
    super();
    this.bounds = [[0, 0, 0], [0, 0, 0]];
    this.numVertices = 0;
    this.numEdges = 0;
    this.numFaces = 0;
    this.metric = Pn.EUCLIDEAN;
    this.isDirty = true;
    this.coloredFaces = true;
    this.vertexList = [];
    this.edgeList = [];
    this.faceList = [];
    this.colormap = null;

    if (b == null) this.initAsBoxOfSize(a, a, a);
    else this.#initAsBox(a, b, c, d, e, f);
  }

  init() {
    this.initAsCubeOfSize(17.0);
  }

  initAsCubeOfSize(size) {
    this.initAsBoxOfSize(size, size, size);
  }

  initAsBoxOfSize(xs, ys, zs) {
    this.#initAsBox(-xs, xs, -ys, ys, -zs, zs);
  }

  #initAsBox(xn, xx, yn, yx, zn, zx) {
    this.bounds[0][0] = xn;
    this.bounds[1][0] = xx;
    this.bounds[0][1] = yn;
    this.bounds[1][1] = yx;
    this.bounds[0][2] = zn;
    this.bounds[1][2] = zx;
    this.reset();
  }

  #newVertex(point = [0, 0, 0, 0]) {
    return {
      point,
      dist: 0,
      order: 0,
      tag: 0,
      isIdeal: false,
    };
  }

  #newEdge() {
    return {
      v0: null,
      v1: null,
      e0L: null,
      e0R: null,
      e1L: null,
      e1R: null,
      fL: null,
      fR: null,
      tag: -1,
    };
  }

  #newFace() {
    return {
      inverse: null,
      someEdge: null,
      order: 0,
      tag: 0,
      index: 0,
      source: null,
      plane: [0, 0, 0, 0],
      area: 0,
    };
  }

  reset() {
    this.numVertices = 8;
    this.numEdges = 12;
    this.numFaces = 6;
    this.isDirty = true;

    this.vertexList = [];
    this.edgeList = [];
    this.faceList = [];

    for (let i = 0; i < 8; ++i) {
      const v = [0, 0, 0, 1.0];
      v[0] = (i & 4) !== 0 ? this.bounds[1][0] : this.bounds[0][0];
      v[1] = (i & 2) !== 0 ? this.bounds[1][1] : this.bounds[0][1];
      v[2] = (i & 1) !== 0 ? this.bounds[1][2] : this.bounds[0][2];
      this.vertexList.push(this.#newVertex(v));
    }

    for (let i = 0; i < 12; ++i) this.edgeList.push(this.#newEdge());
    for (let i = 0; i < 6; ++i) this.faceList.push(this.#newFace());

    for (let i = 0; i < 12; ++i) {
      const we = this.edgeList[i];
      we.tag = i;
      we.v0 = this.vertexList[WingedEdgeUtility.edata[i][0]];
      we.v1 = this.vertexList[WingedEdgeUtility.edata[i][1]];
      we.e0L = this.edgeList[WingedEdgeUtility.edata[i][2]];
      we.e0R = this.edgeList[WingedEdgeUtility.edata[i][3]];
      we.e1L = this.edgeList[WingedEdgeUtility.edata[i][4]];
      we.e1R = this.edgeList[WingedEdgeUtility.edata[i][5]];
      we.fL = this.faceList[WingedEdgeUtility.edata[i][6]];
      we.fR = this.faceList[WingedEdgeUtility.edata[i][7]];
    }

    for (let i = 0; i < 6; ++i) {
      const wf = this.faceList[i];
      wf.order = 4;
      wf.index = i;
      wf.tag = i;
      wf.someEdge = this.edgeList[WingedEdgeUtility.fdata[i]];
      wf.inverse = null;
    }
    this.update();
  }

  #updateColors() {
    if (!this.coloredFaces) return;
    if (this.colormap == null) this.colormap = WingedEdgeUtility.builtincmap;
    const cc = Array.from({ length: this.numFaces }, () => new Array(this.colormap[0].length).fill(0));
    for (let i = 0; i < this.numFaces; ++i) {
      const foo = this.faceList[i].tag >= 0 ? this.faceList[i].tag : 0;
      Rn.copy(cc[i], this.colormap[foo % this.colormap.length]);
    }
    this.setFaceAttribute(GeometryAttribute.COLORS, toDataList(cc));
  }

  update() {
    if (!this.isDirty) return;

    this.numFaces = this.faceList.length;
    this.numEdges = this.edgeList.length;
    this.numVertices = this.vertexList.length;

    if (this.numVertices === 0 || this.numEdges === 0 || this.numFaces === 0) {
      throw new Error('Degenerate geometry');
    }

    const data = Array.from({ length: this.numVertices }, () => new Array(4).fill(0));
    for (let i = 0; i < this.numVertices; ++i) {
      Rn.copy(data[i], this.vertexList[i].point);
      this.vertexList[i].tag = i;
    }

    const indices = new Array(this.numFaces);
    for (let i = 0; i < this.numFaces; ++i) indices[i] = new Array(this.faceList[i].order);
    for (let i = 0; i < this.numEdges; ++i) this.edgeList[i].tag = i;

    for (let i = 0; i < this.numFaces; ++i) {
      const thisf = this.faceList[i];
      thisf.index = i;
      let thise = thisf.someEdge;
      let vertexIndex = 0;
      do {
        if (vertexIndex === indices[i].length) break;
        if (thise.fL === thisf) {
          indices[i][vertexIndex++] = thise.v0.tag;
          thise = thise.e1L;
        } else {
          indices[i][vertexIndex++] = thise.v1.tag;
          thise = thise.e0R;
        }
      } while (thise !== thisf.someEdge);
    }

    this.isDirty = false;
    this.setVertexCoordinates(data);
    this.setFaceIndices(indices);
    this.#calculateAndSetEdgesFromFaces();
    IndexedFaceSetUtility.calculateAndSetFaceNormals(this);
    this.#updateColors();
  }

  #calculateAndSetEdgesFromFaces() {
    const edges = Array.from({ length: this.edgeList.length }, () => new Array(2).fill(0));
    for (let i = 0; i < this.edgeList.length; ++i) {
      edges[i][0] = this.edgeList[i].v0.tag;
      edges[i][1] = this.edgeList[i].v1.tag;
    }
    this.setEdgeIndices(edges);
  }

  removeEdge(edges) {
    if (Array.isArray(edges)) {
      const ede = [];
      for (const i of edges) ede.push(this.edgeList[i]);
      for (const e of ede) this.removeEdge(e);
      return;
    }
    const e = edges;
    if (!this.edgeList.includes(e)) throw new Error('No such edge');

    let nextEdge = e.e1R;
    if (e.fL.someEdge === e) e.fL.someEdge = nextEdge;
    do {
      if (nextEdge.fR === e.fR) {
        nextEdge.fR = e.fL;
        nextEdge = nextEdge.e1R;
      } else if (nextEdge.fL === e.fR) {
        nextEdge.fL = e.fL;
        nextEdge = nextEdge.e0L;
      } else throw new Error('Bad face connectivity');
      e.fL.order++;
    } while (nextEdge !== e);

    if (e === e.e0L.e1L) e.e0L.e1L = e.e0R;
    else if (e === e.e0L.e0R) e.e0L.e0R = e.e0R;
    else throw new Error('Bad edge connections');

    if (e === e.e0R.e1R) e.e0R.e1R = e.e0L;
    else if (e === e.e0R.e0L) e.e0R.e0L = e.e0L;
    else throw new Error('Bad edge connections');

    if (e === e.e1L.e0L) e.e1L.e0L = e.e1R;
    else if (e === e.e1L.e1R) e.e1L.e1R = e.e1R;
    else throw new Error('Bad edge connections');

    if (e === e.e1R.e0R) e.e1R.e0R = e.e1L;
    else if (e === e.e1R.e1L) e.e1R.e1L = e.e1L;
    else throw new Error('Bad edge connections');

    this.edgeList = this.edgeList.filter((x) => x !== e);
    e.fL.order--;
    this.faceList = this.faceList.filter((x) => x !== e.fR);
    this.isDirty = true;
    this.update();
  }

  cutWithPlane(aPlane, aTag = this.numFaces, source = null) {
    let faceIsNeeded = false;
    for (let i = 0; i < this.numVertices; ++i) {
      const nvertex = this.vertexList[i];
      nvertex.dist = Rn.innerProduct(aPlane, nvertex.point);
      if (nvertex.dist > 1e-5) faceIsNeeded = true;
      if (Math.abs(nvertex.dist) < TOLERANCE) nvertex.dist = 0.0;
    }
    if (!faceIsNeeded) return false;

    const newFace = this.#newFace();
    Rn.copy(newFace.plane, aPlane);
    newFace.tag = aTag;
    newFace.source = source;
    newFace.order = 0;
    this.cutEdges();
    this.cutFaces(newFace);
    this.removeDeadEdges();
    this.removeDeadVertices();
    this.faceList.push(newFace);
    this.numFaces++;
    this.isDirty = true;
    this.update();
    return true;
  }

  cutEdges() {
    const lim = this.numEdges;
    for (let i = 0; i < lim; ++i) {
      const edge = this.edgeList[i];
      const d0 = edge.v0.dist;
      const d1 = edge.v1.dist;
      if (d0 * d1 < 0.0) {
        const newVertex = this.#newVertex([0, 0, 0, 0]);
        const newEdge = this.#newEdge();
        const t = -d0 / (d1 - d0);
        const s = 1.0 - t;
        Rn.linearCombination(newVertex.point, s, edge.v0.point, t, edge.v1.point);
        this.vertexList.push(newVertex);
        this.numVertices++;
        newVertex.dist = 0.0;

        newEdge.v1 = edge.v1;
        newEdge.v0 = newVertex;
        edge.v1 = newVertex;

        let nbrEdge = edge.e1L;
        newEdge.e1L = nbrEdge;
        if (nbrEdge.e0L === edge) nbrEdge.e0L = newEdge;
        else nbrEdge.e1R = newEdge;

        nbrEdge = edge.e1R;
        newEdge.e1R = nbrEdge;
        if (nbrEdge.e0R === edge) nbrEdge.e0R = newEdge;
        else nbrEdge.e1L = newEdge;

        newEdge.e0L = edge;
        newEdge.e0R = edge;
        edge.e1L = newEdge;
        edge.e1R = newEdge;
        newEdge.fL = edge.fL;
        newEdge.fR = edge.fR;
        edge.fL.order++;
        edge.fR.order++;
        this.edgeList.push(newEdge);
        this.numEdges++;
      }
    }

    for (let i = 0; i < this.numEdges; ++i) {
      const edge = this.edgeList[i];
      if (edge.v0.dist < 0.0 || edge.v1.dist < 0.0) {
        edge.fL.someEdge = edge;
        edge.fR.someEdge = edge;
      }
    }
  }

  cutFaces(newFace) {
    newFace.order = 0;
    for (let i = this.numFaces - 1; i >= 0; --i) {
      const face = this.faceList[i];
      let edge = face.someEdge;
      if (face.someEdge.v0.dist >= 0 && face.someEdge.v1.dist >= 0) {
        this.faceList.splice(i, 1);
        continue;
      }
      let zeroCount = 0;
      let e0 = null;
      let e1 = null;
      let e2 = null;
      let e3 = null;
      let count = 0;
      let count1 = 0;
      let count3 = 0;
      let nextEdge = null;
      do {
        let d0;
        let d1;
        if (edge.fL === face) {
          d0 = edge.v0.dist;
          d1 = edge.v1.dist;
          nextEdge = edge.e1L;
        } else {
          d0 = edge.v1.dist;
          d1 = edge.v0.dist;
          nextEdge = edge.e0R;
        }
        if (d0 === 0.0) {
          if (d1 === 0.0) {
            if (edge.fL === face) edge.fR = newFace;
            else edge.fL = newFace;
            newFace.someEdge = edge;
            newFace.order++;
            break;
          }
          zeroCount++;
          if (d1 < 0.0) {
            e3 = edge;
            count3 = count;
          } else {
            e1 = edge;
            count1 = count;
          }
        } else if (d1 === 0.0) {
          if (d0 < 0.0) e0 = edge;
          else e2 = edge;
        }
        edge = nextEdge;
        count++;
      } while (edge !== face.someEdge);

      if (zeroCount === 2) {
        const newEdge = this.#newEdge();
        this.edgeList.push(newEdge);
        this.numEdges++;
        const v01 = e0.v0.dist === 0.0 ? e0.v0 : e0.v1;
        const v23 = e2.v0.dist === 0.0 ? e2.v0 : e2.v1;
        newEdge.v0 = v01;
        newEdge.v1 = v23;
        newEdge.e0L = e0;
        newEdge.e0R = e1;
        newEdge.e1L = e3;
        newEdge.e1R = e2;
        newEdge.fL = face;
        newEdge.fR = newFace;

        if (e0.v0 === v01) e0.e0R = newEdge;
        else e0.e1L = newEdge;
        if (e1.v0 === v01) e1.e0L = newEdge;
        else e1.e1R = newEdge;
        if (e2.v0 === v23) e2.e0R = newEdge;
        else e2.e1L = newEdge;
        if (e3.v0 === v23) e3.e0L = newEdge;
        else e3.e1R = newEdge;
        newFace.someEdge = newEdge;
        newFace.order++;
        face.order = ((count1 - count3 + face.order) % face.order) + 1;
      }
    }
    this.numFaces = this.faceList.length;
  }

  removeDeadEdges() {
    for (let i = this.numEdges - 1; i >= 0; --i) {
      const edge = this.edgeList[i];
      if (edge.v0.dist > 0.0 || edge.v1.dist > 0.0) {
        if (edge.v0.dist === 0.0) {
          if (edge.e0L.e0R === edge) edge.e0L.e0R = edge.e0R;
          else edge.e0L.e1L = edge.e0R;
          if (edge.e0R.e0L === edge) edge.e0R.e0L = edge.e0L;
          else edge.e0R.e1R = edge.e0L;
        }
        if (edge.v1.dist === 0.0) {
          if (edge.e1L.e1R === edge) edge.e1L.e1R = edge.e1R;
          else edge.e1L.e0L = edge.e1R;
          if (edge.e1R.e1L === edge) edge.e1R.e1L = edge.e1L;
          else edge.e1R.e0R = edge.e1L;
        }
        this.edgeList.splice(i, 1);
      }
    }
    this.numEdges = this.edgeList.length;
  }

  removeDeadVertices() {
    for (let i = this.numVertices - 1; i >= 0; --i) {
      const nvertex = this.vertexList[i];
      if (nvertex.dist > 0.0) this.vertexList.splice(i, 1);
    }
    this.numVertices = this.vertexList.length;
  }

  vertexExists(pt) {
    for (const wev of this.vertexList) {
      if (Rn.equals(wev.point, pt, TOLERANCE)) return wev;
    }
    return null;
  }

  getEdgeList() {
    return this.edgeList;
  }

  getFaceList() {
    return this.faceList;
  }

  getVertexList() {
    return this.vertexList;
  }

  setEdgeList(vector) {
    this.edgeList = vector;
  }

  setFaceList(vector) {
    this.faceList = vector;
  }

  setVertexList(vector) {
    this.vertexList = vector;
  }

  getColormap() {
    return this.colormap;
  }

  setColormap(grid) {
    this.colormap = grid;
    this.isDirty = true;
    this.#updateColors();
  }

  getFirstFaceWithTag(t) {
    for (let i = 0; i < this.numFaces; ++i) {
      if (this.faceList[i].tag === t) return i;
    }
    return -1;
  }

  getFaceWithIndex(i) {
    if (i >= this.getNumFaces()) throw new Error('No such face');
    const indData = this.getFaceAttribute(GeometryAttribute.INDICES);
    const ind = fromDataList(indData)[i];
    const vertsData = this.getVertexAttribute(GeometryAttribute.COORDINATES);
    const verts = fromDataList(vertsData);
    return ind.map((k) => [...verts[k]]);
  }

  getMetric() {
    return this.metric;
  }

  setMetric(metric) {
    this.metric = metric;
    this.setGeometryAttribute(GeometryUtility.METRIC, metric);
  }

  normalize(scale) {
    const verts = fromDataList(this.getVertexAttribute(GeometryAttribute.COORDINATES));
    let size = 0;
    for (const v of verts) size += Pn.norm(v, Pn.EUCLIDEAN);
    size /= verts.length;
    size = scale / size;
    let mat = MatrixBuilder.euclidean().scale(size).getArray();
    for (const wv of this.vertexList) Rn.matrixTimesVector(wv.point, mat, wv.point);
    mat = Rn.diagonalMatrix(null, [1, 1, 1, size]);
    for (const wf of this.faceList) Rn.matrixTimesVector(wf.plane, mat, wf.plane);
    this.isDirty = true;
    this.update();
  }

  isColoredFaces() {
    return this.coloredFaces;
  }

  setColoredFaces(coloredFaces) {
    this.coloredFaces = !!coloredFaces;
  }
}

