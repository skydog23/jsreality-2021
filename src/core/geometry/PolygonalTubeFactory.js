/**
 * JavaScript port/translation of jReality.
 *
 * Port of: de.jreality.geometry.PolygonalTubeFactory
 *
 * Policy: This factory expects **4D homogeneous coordinates** for its input curve.
 * Upstream code must homogenize 3D points before constructing/using this factory.
 */

import { getLogger, Category } from '../util/LoggingSystem.js';
import * as P3 from '../math/P3.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { QuadMeshFactory } from './QuadMeshFactory.js';
import { IndexedLineSetUtility } from './IndexedLineSetUtility.js';
import { TubeFactory } from './TubeFactory.js';

export class PolygonalTubeFactory extends TubeFactory {
  /** @type {import('../util/LoggingSystem.js').Logger} */
  #logger = getLogger('jsreality.core.geometry.PolygonalTubeFactory');

  /** @type {any} */
  _theTube = null;
  /** @type {QuadMeshFactory|null} */
  _qmf = null;
  /** @type {number[][]|null} */
  _theTubeVertices = null;

  /** @type {number[][]|null} */
  #polygon2 = null;
  /** @type {number[][]|null} */
  #vals = null;

  constructor(curveOrIls, whichCurve = 0) {
    if (Array.isArray(curveOrIls)) {
      super(curveOrIls);
    } else {
      // Assume IndexedLineSet-like
      super(IndexedLineSetUtility.extractCurve(null, curveOrIls, whichCurve));
    }
  }

  /**
   * Port of PolygonalTubeFactory.makeTube(...)
   *
   * @protected
   * @param {number[][]} curve 4D points
   * @param {number[]} radii
   * @param {number[][]} xsec cross-section points (must be 4D for 4x4 multiplication)
   * @param {number} type FrameFieldType (numeric)
   * @param {boolean} closed
   * @param {number} metric
   * @param {number} twists
   * @returns {number[][]|null}
   */
  _makeTube(curve, radii, xsec, type, closed, metric, twists) {
    if (!curve || curve.length === 0) return null;
    if (curve[0].length !== 4) {
      throw new Error('PolygonalTubeFactory: curve points must have dimension 4.');
    }
    if (!xsec || xsec.length === 0) {
      throw new Error('PolygonalTubeFactory: crossSection is empty.');
    }
    if (xsec[0].length !== 4) {
      throw new Error('PolygonalTubeFactory: crossSection points must have dimension 4.');
    }

    let n = curve.length;
    const vl = xsec[0].length;

    // auto-close detection: if first and last points are identical (euclidean distance small)
    // NOTE: This is a euclidean test in Java as well.
    const d = Rn.euclideanDistance(curve[0], curve[n - 1]);
    const autoClosed = d < 1e-8;
    if (autoClosed) {
      closed = true;
      n = n - 1;
    }

    const realLength = (closed ? n + 1 : n) * xsec.length;
    if (!this.#vals || this.#vals.length !== realLength || this.#vals[0].length !== vl) {
      this.#vals = new Array(realLength);
      for (let i = 0; i < realLength; i++) this.#vals[i] = new Array(vl).fill(0);
    }

    if (n <= 1) return null;

    let radii2 = null;
    const hasRadii = radii.length > 1;
    const usedVerts = closed ? n + 3 : n + 2;
    if (!this.#polygon2 || this.#polygon2.length !== usedVerts) {
      this.#polygon2 = new Array(usedVerts);
    }
    if (hasRadii) radii2 = new Array(usedVerts);

    for (let i = 0; i < n; i++) {
      this.#polygon2[i + 1] = curve[i];
      if (hasRadii) radii2[i + 1] = radii[i];
    }

    if (closed) {
      this.#polygon2[0] = curve[n - 1];
      this.#polygon2[n + 1] = curve[0];
      this.#polygon2[n + 2] = curve[1];
      if (hasRadii) {
        radii2[0] = radii[n - 1];
        radii2[n + 1] = radii[0];
        radii2[n + 2] = radii[1];
      }
    } else {
      this.#polygon2[0] = Rn.add(null, curve[0], Rn.subtract(null, curve[0], curve[1]));
      this.#polygon2[n + 1] = Rn.add(null, curve[n - 1], Rn.subtract(null, curve[n - 1], curve[n - 2]));
      if (hasRadii) {
        radii2[0] = radii2[1];
        radii2[n + 1] = radii2[n];
      }
    }
   
    // frames
    if (this._userFrames == null) this._frames = this.makeFrameField(this.#polygon2, type, metric);
    else this._frames = this._userFrames;

    if (this._frames == null) throw new Error('PolygonalTubeFactory: No frames!');

    const rad = Rn.identityMatrix(4);
    const nn = this._frames.length;
    const lastphi = this._frames[nn - 1].phi;
    const correction =
      closed && this._matchClosedTwist
        ? (lastphi > Math.PI ? 2 * Math.PI - lastphi : -lastphi) / nn
        : 0.0;

    for (let i = 0; i < nn; i++) {
      const sangle = Math.sin(this._frames[i].theta / 2.0);
      let factor = 1.0;
      if (sangle !== 0) factor = 1.0 / sangle;
      const r = hasRadii ? radii2[i + 1] : radii[0];
      rad[0] = r * factor;
      rad[5] = r;

      this._frames[i].phi = this._frames[i].phi + i * correction + twists * 2 * Math.PI * this._frames[i].length;
      const zrot = P3.makeRotationMatrixZ(null, this._frames[i].phi);
      const scaledFrame = Rn.times(null, this._frames[i].frame, Rn.times(null, rad, zrot));
      console.log('scaledFrame: ', scaledFrame);
      
      const m = xsec.length;
      for (let j = 0; j < m; j++) {
        Rn.matrixTimesVector(this.#vals[i * m + j], scaledFrame, xsec[j]);
      }
    }

    if (closed && this._matchClosedTwist) {
      // Copy the last cross section over as the first (aliasing intentionally, per Java)
      const m = xsec.length;
      for (let j = 0; j < m; j++) this.#vals[(nn - 1) * m + j] = this.#vals[j];
    }

    return this.#vals;
  }

  /**
   * Update output tube geometry based on current parameters.
   */
  update() {
    super.update();

    if (this._radii == null) this._radii = [this._radius];
    if (this._radii.length === 1) this._radii[0] = this._radius;

    this._theTubeVertices = this._makeTube(
      this._theCurve,
      this._radii,
      this._crossSection,
      this._frameFieldType,
      this._closedCurve,
      this._metric,
      this._twists
    );

    if (this._theTubeVertices == null) return;

    this._qmf = new QuadMeshFactory();
    this._qmf.setMetric(this._metric);
    this._qmf.setGenerateTextureCoordinates(this._generateTextureCoordinates && !this._arcLengthTextureCoordinates);
    this._qmf.setULineCount(this._crossSection.length);
    this._qmf.setVLineCount(this._theTubeVertices.length / this._crossSection.length);

    const closedInU =
      Rn.euclideanDistance(this._crossSection[0], this._crossSection[this._crossSection.length - 1]) < 1e-8;
    this._qmf.setClosedInUDirection(closedInU);
    this._qmf.setClosedInVDirection(this._closedCurve);
    this._qmf.setVertexCoordinates(this._theTubeVertices);
    this._qmf.setGenerateFaceNormals(true);
    this._qmf.setGenerateVertexNormals(true);
    this._qmf.setEdgeFromQuadMesh(true);
    this._qmf.setGenerateEdgesFromFaces(this._generateEdges);
    this._qmf.update();
    this._theTube = this._qmf.getIndexedFaceSet();

    if (this._generateTextureCoordinates) {
      if (!this._arcLengthTextureCoordinates) {
        this._qmf.setGenerateTextureCoordinates(true);
      } else {
        this._qmf.setVertexTextureCoordinates(
          this.#arcLengthTextureCoordinates(this._theCurve, this._crossSection, this._metric)
        );
      }
    }

    // face/vertex colors: in jsreality we route through QuadMeshFactory setters
    if (this._vertexColors != null || this._edgeColors != null) {
      const numVerts = this._theTube.getNumPoints();
      const numFaces = this._theTube.getNumFaces();
      const xsLength = this._crossSection.length;

      if (this._edgeColors != null) {
        const colorLength = this._edgeColors[0].length;
        const faceColors = new Array(numFaces);
        const lim = numFaces / xsLength;
        for (let j = 0; j < lim; j++) {
          for (let k = 0; k < xsLength; k++) {
            const dst = new Array(colorLength);
            const src = this._edgeColors[j % this._edgeColors.length];
            for (let m = 0; m < colorLength; m++) dst[m] = src[m];
            faceColors[j * xsLength + k] = dst;
          }
        }
        this.#logger.finer(Category.ALL, 'Setting face colors');
        this._qmf.setFaceColors(faceColors);
      }

      if (this._vertexColorsEnabled && this._vertexColors != null) {
        const colorLength = this._vertexColors[0].length;
        const vertColors = new Array(numVerts);
        const realNumVerts = numVerts / xsLength;
        for (let j = 0; j < realNumVerts; j++) {
          for (let k = 0; k < xsLength; k++) {
            const dst = new Array(colorLength);
            const src = this._vertexColors[j % this._vertexColors.length];
            for (let m = 0; m < colorLength; m++) dst[m] = src[m];
            vertColors[j * xsLength + k] = dst;
          }
        }
        this.#logger.finer(Category.ALL, 'Setting vertex colors');
        this._qmf.setVertexColors(vertColors);
      }
    }

    this._qmf.update();
    this._theTube = this._qmf.getIndexedFaceSet();
  }

  /**
   * Arc-length texture coordinates (v parameter).
   * Enforces 4D-only points.
   * @private
   */
  #arcLengthTextureCoordinates(theCurve, crossSection, metric) {
    const vLineCount = theCurve.length;
    const uLineCount = crossSection.length;
    const textureCoordinates = new Array(uLineCount * vLineCount);
    for (let i = 0; i < textureCoordinates.length; i++) textureCoordinates[i] = [0, 0];

    const vLength = theCurve[0].length;
    if (vLength === 3) {
      throw new Error(
        'PolygonalTubeFactory.arcLengthTextureCoordinates: 3D points detected. Upstream must homogenize to 4D.'
      );
    }
    if (vLength !== 4) {
      throw new Error('PolygonalTubeFactory.arcLengthTextureCoordinates: curve points must have dimension 4.');
    }

    if (crossSection[0].length === 3) {
      throw new Error(
        'PolygonalTubeFactory.arcLengthTextureCoordinates: 3D crossSection points detected. Upstream must homogenize to 4D.'
      );
    }
    if (crossSection[0].length !== 4) {
      throw new Error('PolygonalTubeFactory.arcLengthTextureCoordinates: crossSection points must have dimension 4.');
    }

    const lengths = new Array(vLineCount);
    lengths[0] = 0.0;
    for (let i = 1; i < vLineCount; i++) {
      lengths[i] = lengths[i - 1] + Pn.distanceBetween(theCurve[i], theCurve[i - 1], metric);
    }

    const du = 1.0 / (uLineCount - 1);
    const curveLength = lengths[vLineCount - 1];

    for (let iv = 0, firstIndexInULine = 0; iv < vLineCount; iv++, firstIndexInULine += uLineCount) {
      let u = 0;
      for (let iu = 0; iu < uLineCount; iu++, u += du) {
        const indexOfUV = firstIndexInULine + iu;
        textureCoordinates[indexOfUV][0] = u;
        textureCoordinates[indexOfUV][1] = lengths[iv] / curveLength;
      }
    }

    return textureCoordinates;
  }

  /**
   * @returns {any}
   */
  getTube() {
    return this._theTube;
  }

  updateFrames() {
    // subclass hook (not used yet)
  }
}

