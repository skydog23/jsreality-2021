/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as Rn from '../math/Rn.js';
import { QuadMeshFactory } from './QuadMeshFactory.js';

/**
 * Bezier tensor-product patch mesh of arbitrary target dimension.
 *
 * The control net is stored as [v][u][fiber]. Refinement is binary subdivision
 * using precomputed split matrices in each parameter direction.
 */
export class BezierPatchMesh {
  /**
   * @param {number} uDegree
   * @param {number} vDegree
   * @param {number[][][]} cp control points in [v][u][fiber] layout
   */
  constructor(uDegree, vDegree, cp) {
    this.uDegree = uDegree;
    this.vDegree = vDegree;

    const vCount = cp.length;
    const uCount = cp[0]?.length ?? 0;
    if (
      (vDegree > 1 && vCount !== 2 && (vCount % vDegree) !== 1) ||
      (uDegree > 1 && uCount !== 2 && (uCount % uDegree) !== 1)
    ) {
      throw new Error('Array length must be for form degree*n + 1');
    }

    this.controlPoints = cp;

    this.u0Split = Rn.identityMatrix(uDegree + 1);
    this.u1Split = Rn.identityMatrix(uDegree + 1);
    this.v0Split = Rn.identityMatrix(vDegree + 1);
    this.v1Split = Rn.identityMatrix(vDegree + 1);

    this.#initSplitMatrices();
  }

  #binomial(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    const kk = Math.min(k, n - k);
    let c = 1;
    for (let i = 1; i <= kk; i++) {
      c = (c * (n - kk + i)) / i;
    }
    return c;
  }

  #initSplitMatrices() {
    let factor = 1.0;
    let size = (this.uDegree + 1) * (this.uDegree + 1);
    for (let i = 0; i <= this.uDegree; ++i) {
      for (let j = 0; j <= i; ++j) {
        const b = this.#binomial(i, j);
        this.u0Split[i * (this.uDegree + 1) + j] = factor * b;
        this.u1Split[size - i * (this.uDegree + 1) - j - 1] = factor * b;
      }
      factor *= 0.5;
    }

    factor = 1.0;
    size = (this.vDegree + 1) * (this.vDegree + 1);
    for (let i = 0; i <= this.vDegree; ++i) {
      for (let j = 0; j <= i; ++j) {
        const b = this.#binomial(i, j);
        this.v0Split[i * (this.vDegree + 1) + j] = factor * b;
        this.v1Split[size - i * (this.vDegree + 1) - j - 1] = factor * b;
      }
      factor *= 0.5;
    }
  }

  refineU() {
    const vDim = this.controlPoints.length;
    const uDim = this.controlPoints[0].length;
    const vectorLength = this.controlPoints[0][0].length;
    const vals = new Array(vDim)
      .fill(null)
      .map(() => new Array(2 * uDim - 1).fill(null).map(() => new Array(vectorLength).fill(0)));

    const icp = new Array(this.uDegree + 1).fill(0);
    const ocp = new Array(this.uDegree + 1).fill(0);
    for (let k = 0; k < vDim; ++k) {
      for (let i = 0; i < vectorLength; ++i) {
        let outCount = 0;
        for (let inCount = 0; inCount < uDim - 1; inCount += this.uDegree) {
          for (let j = 0; j <= this.uDegree; ++j) icp[j] = this.controlPoints[k][inCount + j][i];
          Rn.matrixTimesVector(ocp, this.u0Split, icp);
          for (let j = 0; j <= this.uDegree; ++j) vals[k][outCount + j][i] = ocp[j];
          outCount += this.uDegree;
          Rn.matrixTimesVector(ocp, this.u1Split, icp);
          for (let j = 0; j <= this.uDegree; ++j) vals[k][outCount + j][i] = ocp[j];
          outCount += this.uDegree;
        }
      }
    }
    this.controlPoints = vals;
  }

  refineV() {
    const vDim = this.controlPoints.length;
    const uDim = this.controlPoints[0].length;
    const vectorLength = this.controlPoints[0][0].length;
    const vals = new Array(2 * vDim - 1)
      .fill(null)
      .map(() => new Array(uDim).fill(null).map(() => new Array(vectorLength).fill(0)));

    const icp = new Array(this.vDegree + 1).fill(0);
    const ocp = new Array(this.vDegree + 1).fill(0);
    for (let k = 0; k < uDim; ++k) {
      for (let i = 0; i < vectorLength; ++i) {
        let outCount = 0;
        for (let inCount = 0; inCount < vDim - 1; inCount += this.vDegree) {
          for (let j = 0; j <= this.vDegree; ++j) icp[j] = this.controlPoints[inCount + j][k][i];
          Rn.matrixTimesVector(ocp, this.v0Split, icp);
          for (let j = 0; j <= this.vDegree; ++j) vals[outCount + j][k][i] = ocp[j];
          outCount += this.vDegree;
          Rn.matrixTimesVector(ocp, this.v1Split, icp);
          for (let j = 0; j <= this.vDegree; ++j) vals[outCount + j][k][i] = ocp[j];
          outCount += this.vDegree;
        }
      }
    }
    this.controlPoints = vals;
  }

  refine() {
    this.refineU();
    this.refineV();
  }

  getControlPoints() {
    return this.controlPoints;
  }

  getUDegree() {
    return this.uDegree;
  }

  getVDegree() {
    return this.vDegree;
  }

  /**
   * Java-overload-compatible dispatcher:
   * - (bpm) -> IndexedFaceSet
   * - (bpm, metric) -> QuadMeshFactory
   * - (qmf, bpm, metric) -> QuadMeshFactory
   *
   * @param {...any} args
   * @returns {import('../scene/IndexedFaceSet.js').IndexedFaceSet|QuadMeshFactory}
   */
  static representBezierPatchMeshAsQuadMesh(...args) {
    if (args.length === 1 && args[0] instanceof BezierPatchMesh) {
      const bpm = args[0];
      return BezierPatchMesh.representBezierPatchMeshAsQuadMeshFactory(null, bpm, 0).getIndexedFaceSet();
    }

    if (args.length === 2 && args[0] instanceof BezierPatchMesh && typeof args[1] === 'number') {
      const bpm = args[0];
      const metric = args[1];
      const qmf = new QuadMeshFactory();
      BezierPatchMesh.representBezierPatchMeshAsQuadMeshFactory(qmf, bpm, metric);
      return qmf;
    }

    if ((args.length === 3 || args.length === 2) && args[1] instanceof BezierPatchMesh) {
      const qmf = args[0] ?? null;
      const bpm = args[1];
      const metric = args.length === 3 ? args[2] : 0;
      return BezierPatchMesh.representBezierPatchMeshAsQuadMeshFactory(qmf, bpm, metric);
    }

    throw new Error('Unsupported arguments for representBezierPatchMeshAsQuadMesh');
  }

  /**
   * Explicit helper to get an IndexedFaceSet from a BezierPatchMesh.
   * @param {BezierPatchMesh} bpm
   * @param {number} [metric=0]
   * @returns {import('../scene/IndexedFaceSet.js').IndexedFaceSet}
   */
  static representBezierPatchMeshAsIndexedFaceSet(bpm, metric = 0) {
    return BezierPatchMesh.representBezierPatchMeshAsQuadMeshFactory(null, bpm, metric).getIndexedFaceSet();
  }

  /**
   * @param {QuadMeshFactory|null} qmf
   * @param {BezierPatchMesh} bpm
   * @param {number} metric
   * @returns {QuadMeshFactory}
   */
  static representBezierPatchMeshAsQuadMeshFactory(qmf, bpm, metric) {
    const thePoints = bpm.getControlPoints();
    const factory = qmf ?? new QuadMeshFactory();
    factory.setMetric(metric);
    factory.setULineCount(bpm.uDegree === 1 ? thePoints[0].length : Math.floor(thePoints[0].length / bpm.uDegree) + 1);
    factory.setVLineCount(bpm.vDegree === 1 ? thePoints.length : Math.floor(thePoints.length / bpm.vDegree) + 1);
    factory.setClosedInUDirection(false);
    factory.setClosedInVDirection(false);
    factory.setGenerateTextureCoordinates(true);
    const sampled = [];
    const vStep = Math.max(1, bpm.vDegree);
    const uStep = Math.max(1, bpm.uDegree);
    for (let v = 0; v < thePoints.length; v += vStep) {
      const row = [];
      for (let u = 0; u < thePoints[0].length; u += uStep) {
        row.push(thePoints[v][u]);
      }
      sampled.push(row);
    }
    factory.setVertexCoordinates(sampled);
    factory.setGenerateFaceNormals(true);
    factory.setGenerateVertexNormals(true);
    factory.update();
    return factory;
  }
}

