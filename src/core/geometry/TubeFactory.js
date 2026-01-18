/**
 * JavaScript port/translation of jReality.
 *
 * Port of: de.jreality.geometry.TubeFactory
 *
 * Important jsreality policy:
 * - This implementation enforces **4D homogeneous points only** for tube inputs.
 *   If 3D points are detected, we throw and require upstream homogenization.
 */

import { getLogger, Level, setModuleLevel, Category } from '../util/LoggingSystem.js';
import * as P3 from '../math/P3.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { FrameInfo, FrameFieldType, octagonalCrossSection, getInitialBinormal} from './TubeUtility.js';
import * as TubeFactorySceneGraph from './TubeFactorySceneGraph.js';

const logger = getLogger('jsreality.core.geometry.TubeFactory');
setModuleLevel(logger.getModuleName(), Level.FINER);

export class TubeFactory {
  /**
   * Bitmask controlling debug output, matching the Java implementation.
   * Keep as a numeric bitfield so callers can use the same flags.
   *
   * Example: TubeFactory.debug |= 2;
   * @type {number}
   */
  static debug = 63; // matches Java default in TubeFactory.java

  
  // "protected" fields (JS convention): subclasses can access them directly.
  /** @type {number[][]|null} */
  _theCurve;
  /** @type {number[][]|null} */
  _userTangents = null;
  /** @type {number[][]|null} */
  _userBinormals = null;
  /** @type {number[][]|null} */
  _vertexColors = null;
  /** @type {number[][]|null} */
  _edgeColors = null;
  /** @type {number[][]} */
  _crossSection = octagonalCrossSection;
  /** @type {number[]|null} */
  _radii = null;
  /** @type {number} */
  _radius = 0.05;
  /** @type {number} */
  _frameFieldType = FrameFieldType.PARALLEL;
  /** @type {number} */
  _metric = Pn.EUCLIDEAN;
  /** @type {number} */
  _twists = 0;
  /** @type {boolean} */
  _generateTextureCoordinates = false;
  /** @type {boolean} */
  _arcLengthTextureCoordinates = false;
  /** @type {boolean} */
  _generateEdges = false;
  /** @type {boolean} */
  _matchClosedTwist = false;
  /** @type {boolean} */
  _extendAtEnds = false;
  /** @type {boolean} */
  _removeDuplicates = false;
  /** @type {boolean} */
  _duplicatesRemoved = false;
  /** @type {boolean} */
  _isLine = false;
  /** @type {boolean} */
  _framesDirty = true;
  /** @type {FrameInfo[]|null} */
  _frames = null;
  /** @type {FrameInfo[]|null} */
  _userFrames = null;
  /** @type {number[]|null} */
  _radiiField = null;
  /** @type {number[]|null} */
  _initialBinormal = null;
  /** @type {boolean} */
  _closedCurve = false;
  /** @type {boolean} */
  _vertexColorsEnabled = false;

  _tolerance = 1e-15;

  // cached working arrays for makeFrameField
  /** @type {number[][]|null} */
  #tangentField = null;
  /** @type {number[][]|null} */
  #frenetNormalField = null;
  /** @type {number[][]|null} */
  #parallelNormalField = null;
  /** @type {number[][]|null} */
  #binormalField = null;

  constructor(curve = null) {
    this._theCurve = curve;
   }

  // ---- basic getters/setters (port of Java API) ----

  updateFrames() {
    // intended for subclasses
  }

  /**
   * @returns {FrameInfo[]|null}
   */
  getFrameField() {
    return this._frames;
  }

  /**
   * @param {boolean} closedCurve
   */
  setClosed(closedCurve) {
    this._closedCurve = closedCurve;
    this._framesDirty = true;
  }

  /**
   * @param {number[][]} crossSection
   */
  setCrossSection(crossSection) {
    this._crossSection = crossSection;
  }

  getTangents() {
    return this._userTangents;
  }

  setTangents(tangents) {
    this._userTangents = tangents;
  }

  getUserBinormals() {
    return this._userBinormals;
  }

  setUserBinormals(userBinormals) {
    this._userBinormals = userBinormals;
  }

  setFrameField(frames) {
    this._userFrames = frames;
  }

  setFrameFieldType(frameFieldType) {
    this._frameFieldType = frameFieldType;
  }

  setRadius(radius) {
    this._radius = radius;
  }

  setRadii(radii) {
    this._radii = radii;
  }

  setMetric(metric) {
    this._metric = metric;
    this._framesDirty = true;
  }

  setTwists(twists) {
    this._twists = twists;
  }

  setVertexColorsEnabled(vertexColorsEnabled) {
    this._vertexColorsEnabled = vertexColorsEnabled;
  }

  setEdgeColors(edgeColors) {
    this._edgeColors = edgeColors;
  }

  setVertexColors(vertexColors) {
    this._vertexColors = vertexColors;
  }

  isGenerateTextureCoordinates() {
    return this._generateTextureCoordinates;
  }

  setGenerateTextureCoordinates(generateTextureCoordinates) {
    this._generateTextureCoordinates = generateTextureCoordinates;
  }

  isArcLengthTextureCoordinates() {
    return this._arcLengthTextureCoordinates;
  }

  setArcLengthTextureCoordinates(arcLengthTextureCoordinates) {
    this._arcLengthTextureCoordinates = arcLengthTextureCoordinates;
  }

  isExtendAtEnds() {
    return this._extendAtEnds;
  }

  setExtendAtEnds(extendAtEnds) {
    this._extendAtEnds = extendAtEnds;
    this._framesDirty = true;
  }

  isRemoveDuplicates() {
    return this._removeDuplicates;
  }

  setRemoveDuplicates(removeDuplicates) {
    this._removeDuplicates = removeDuplicates;
  }

  isGenerateEdges() {
    return this._generateEdges;
  }

  setGenerateEdges(generateEdges) {
    this._generateEdges = generateEdges;
  }

  isMatchClosedTwist() {
    return this._matchClosedTwist;
  }

  setMatchClosedTwist(matchClosedTwist) {
    this._matchClosedTwist = matchClosedTwist;
  }

  getInitialBinormal() {
    return this._initialBinormal;
  }

  setInitialBinormal(initialBinormal) {
    this._initialBinormal = initialBinormal;
  }

  getFramesSceneGraphRepresentation(scale = .02) {
    return TubeFactorySceneGraph.getSceneGraphRepresentation(this._frames, scale);
  }

  update() {
    if (this._removeDuplicates && !this._duplicatesRemoved && this._theCurve) {
      this._theCurve = TubeFactory.#removeDuplicates(this._theCurve);
      this._duplicatesRemoved = true;
    }
  }

  // ---- core algorithm ----

  /**
   * Port of TubeFactory.makeFrameField(...)
   *
   * Enforces: polygon points must be 4D homogeneous coordinates.
   *
   * @param {number[][]} polygon array of 4D points, including endpoint padding (length n)
   * @param {number} type FrameFieldType.PARALLEL or FrameFieldType.FRENET
   * @param {number} metric
   * @returns {FrameInfo[]}
   */
  makeFrameField(polygon, type, metric) {
    if (this._frames != null && !this._framesDirty) return this._frames;

    const numberJoints = polygon.length;
    this._metric = metric;

    if (!polygon || polygon.length === 0) {
      throw new Error('TubeFactory.makeFrameField: polygon is empty');
    }

    // Enforce 4D-only policy
    if (polygon[0].length === 3) {
      polygon = Pn.homogenize(null, polygon);
    }
    if (polygon[0].length !== 4) {
      throw new Error('TubeFactory.makeFrameField: Points must have dimension 4');
    }

    // Normalize / sign-fix like Java for 4D input case
    const polygonh = Pn.normalize(null, polygon, metric);
    for (let i = 0; i < polygonh.length; i++) {
      if (polygonh[i][3] < 0) Rn.times(polygonh[i], -1, polygonh[i]);
    }

    this.#calculateIsLine(polygonh);
    console.log('isLine', this._isLine);

    if ((TubeFactory.debug & 1) !== 0) {
      logger.finer(Category.ALL, `Generating frame field for metric ${metric}`);
    }
    if ((TubeFactory.debug & 32) !== 0) {
      for (let i = 0; i < polygonh.length; i++) {
        logger.finer(Category.ALL, `Vertex ${i} : ${Rn.toString(polygonh[i])}`);
      }
    }

    const internalLen = numberJoints - 2;
    if (!this.#tangentField || this.#tangentField.length !== internalLen) {
      this.#tangentField = new Array(internalLen);
      this.#frenetNormalField = new Array(internalLen);
      this.#parallelNormalField = new Array(internalLen);
      this.#binormalField = new Array(internalLen);
      for (let i = 0; i < internalLen; i++) {
        this.#tangentField[i] = [0, 0, 0, 1];
        this.#frenetNormalField[i] = [0, 0, 0, 1 ];
        this.#parallelNormalField[i] = [0, 0, 0, 1];
        this.#binormalField[i] = [0, 0, 0, 1];
      }
    }

    const frameInfo = new Array(internalLen);
    const d = new Array(internalLen);

    // distances between adjacent points (normalized to sum 1)
    let totalLength = 0.0;
    for (let i = 1; i < numberJoints - 1; i++) {
      totalLength += Pn.distanceBetween(polygonh[i - 1], polygonh[i], metric);
      d[i - 1] = totalLength;
    }
    totalLength = 1.0 / totalLength;
    for (let i = 1; i < numberJoints - 1; i++) d[i - 1] *= totalLength;

    const frame = new Array(16).fill(0);
    console.log('curve: ', this._theCurve);

    // Construct the frames for the "internal joints", away from the ends of the curve
    for (let i = 1; i < numberJoints - 1; i++) {
      let theta = 0.0;
      let phi = 0.0;
      let collinear = false;

      const polarPlane = Pn.polarizePoint(null, polygonh[i], metric);
      if ((TubeFactory.debug & 2) !== 0) {
        logger.fine(Category.ALL, `Polar plane is: ${Rn.toString(polarPlane)}`);
      }

      const osculatingPlane = P3.planeFromPoints(null, polygonh[i - 1], polygonh[i], polygonh[i + 1]);
      let size = Rn.euclideanNormSquared(osculatingPlane);
     logger.finer(Category.ALL, `osculatingPlane: ${Rn.toString(osculatingPlane)}`);
      // binormal is the normal to the osculating plane
      if (size < this._tolerance) {
        collinear = true;
        if ((TubeFactory.debug & 2) !== 0) logger.finer(Category.ALL, 'degenerate binormal');
        if (i === 1) this.#binormalField[i - 1] = TubeUtility.getInitialBinormal(polygonh, metric);
        else Pn.projectToTangentSpace(this.#binormalField[i - 1], polygonh[i], this.#binormalField[i - 2], metric);
      } else {
        Pn.polarize(this.#binormalField[i - 1], osculatingPlane, metric);
      }

      if (this._userBinormals) {
        const src = this._userBinormals[i - 1];
        for (let k = 0; k < src.length; k++) this.#binormalField[i - 1][k] = src[k];
      }
      Pn.setToLength(this.#binormalField[i - 1], this.#binormalField[i - 1], 1.0, metric);

      // I once remembered this sign change for elliptic metric, but it's not needed for hyperbolic or euclidean.
      if (i > 1 && metric === Pn.ELLIPTIC) {
        const foo = Pn.angleBetween(this.#binormalField[i - 2], this.#binormalField[i - 1], metric);
        if (Math.abs(foo) > Math.PI / 2) Rn.times(this.#binormalField[i - 1], -1, this.#binormalField[i - 1]);
      }

      if ((TubeFactory.debug & 2) !== 0) {
        logger.finer(Category.ALL, `Binormal is ${Rn.toString(this.#binormalField[i - 1])}`);
      }

      // tangent via mid-plane (or user tangents if provided)
      let midPlane = null;
      let plane1 = null;
      let plane2 = null;

      if (this._userTangents) {
        const src = this._userTangents[i - 1];
        for (let k = 0; k < src.length; k++) this.#tangentField[i - 1][k] = src[k];
        midPlane = Rn.planeParallelToPassingThrough(null, src, polygonh[i]);
        if (i > 1) theta = Pn.angleBetween(this._userTangents[i - 2], this._userTangents[i - 1], metric);
        else theta = 0;
      } else {
        if (!collinear) {
          // construct the the two planes in the binormal plane pencil containing the two segments meeting here
          plane1 = P3.planeFromPoints(null, this.#binormalField[i - 1], polygonh[i], polygonh[i - 1]);
          plane2 = P3.planeFromPoints(null, this.#binormalField[i - 1], polygonh[i], polygonh[i + 1]);
          // we approximate the tangent vector here as the perpendicular to the midplane of these two planes
          midPlane = Pn.midPlane(null, plane1, plane2, metric);
          size = Rn.euclideanNormSquared(midPlane);
          if ((TubeFactory.debug & 2) !== 0) {
            logger.finer(Category.ALL, `tangent norm squared is ${size}`);
            logger.finer(Category.ALL, "midplane =", midPlane);
          }
          theta = Pn.angleBetween(plane1, plane2, metric);
          console.log('theta: ', theta);
        }

        // if the three points are collinear, we use the pseudo-tangent vector
        // But I can't recall the logic.  Probably better to pre-process the curve to remove collinear sequences.
        if (collinear || size < this._tolerance) {
          if ((TubeFactory.debug & 2) !== 0) logger.finer(Category.ALL, 'degenerate Tangent vector');

          const pseudoTangent = P3.lineIntersectPlane(null, polygonh[i - 1], polygonh[i + 1], polarPlane);
          if ((TubeFactory.debug & 2) !== 0) {
            logger.fine(Category.ALL, `pseudo-Tangent vector is ${Rn.toString(pseudoTangent)}`);
          }
          midPlane = (metric !== Pn.EUCLIDEAN) ? Pn.polarizePoint(null, pseudoTangent, metric) : pseudoTangent;
          // euclidean vs non-euclidean
          if (metric !== Pn.EUCLIDEAN) {
            midPlane = Pn.polarizePoint(null, pseudoTangent, metric);
          } else {
            midPlane = pseudoTangent;
          }
          theta = Math.PI;
        }

        if ((TubeFactory.debug & 2) !== 0) {
          logger.fine(Category.ALL, `Midplane is ${Rn.toString(midPlane)}`);
        }
        // polarize the midplane to get the tangent vector
        Pn.polarizePlane(this.#tangentField[i - 1], midPlane, metric);
      }

      // choose sign of tangent
      // It should be in roughly the same direction as the segment that brings me to this point
      const diff = Rn.subtract(null, polygonh[i], polygonh[i - 1]);
      if (Rn.innerProduct(diff, this.#tangentField[i - 1]) < 0.0) {
        Rn.times(this.#tangentField[i - 1], -1.0, this.#tangentField[i - 1]);
      }
      // normalize the tangent vector
      Pn.setToLength(this.#tangentField[i - 1], this.#tangentField[i - 1], 1.0, metric);

      // frenet normal is the normal to the plane spanned by the binormal and tangent fields at this point
      // That is, it completes the orthonormal frame.
      Pn.polarizePlane(
        this.#frenetNormalField[i - 1],
        P3.planeFromPoints(null, this.#binormalField[i - 1], this.#tangentField[i - 1], polygonh[i]),
        metric
      );
      // normalize the frenet normal
      Pn.setToLength(this.#frenetNormalField[i - 1], this.#frenetNormalField[i - 1], 1.0, metric);
      if ((TubeFactory.debug & 2) !== 0) {
        logger.fine(Category.ALL, `frenet normal is ${Rn.toString(this.#frenetNormalField[i - 1])}`);
      }

      if (type === FrameFieldType.PARALLEL) {
        if (i === 1) {
          for (let k = 0; k < 4; k++) this.#parallelNormalField[0][k] = this.#frenetNormalField[0][k];
        } else {
          // parallel-transport the previous parallel normal to the current point
          const nPlane = P3.planeFromPoints(null, polygonh[i], polygonh[i - 1], this.#parallelNormalField[i - 2]);
          // by intersecting with the midplane and the polar plane we obtain a vector in the tangent space 
          // to polygonh[i] that has the same direction as the previous parallel normal but is now "based"
          // at polygonh[i].
          const projectedN = P3.pointFromPlanes(null, nPlane, midPlane, polarPlane);
          let projected = projectedN;
          if (Rn.euclideanNormSquared(projected) < this._tolerance) {
            logger.fine(Category.ALL, 'degenerate normal');
            projected = this.#parallelNormalField[i - 2];
          }
          this.#parallelNormalField[i - 1] = Pn.normalizePlane(null, projected, metric);
        }

        Pn.setToLength(this.#parallelNormalField[i - 1], this.#parallelNormalField[i - 1], 1.0, metric);

        if ((TubeFactory.debug & 128) !== 0) {
          logger.fine(Category.ALL, `Parallel normal is ${Rn.toString(this.#parallelNormalField[i - 1])}`);
        }

        // phi is the angle betwee the frenet direction (determined by torsion of the curve)
        // and the parallel direction (which ignores the torsion as much as possible).
        phi = Pn.angleBetween(this.#frenetNormalField[i - 1], this.#parallelNormalField[i - 1], metric);
        // as usual, the elliptic metric is more sensitive.
        if (metric === Pn.ELLIPTIC) {
          if (phi > Math.PI / 2) phi = phi - Math.PI;
          else if (phi < -Math.PI / 2) phi = phi + Math.PI;
        }
        const a = Pn.angleBetween(this.#parallelNormalField[i - 1], this.#binormalField[i - 1], metric);
        // we force phi to be in the range [-pi/2, pi/2].
        if (a > Math.PI / 2) phi = -phi;
        if (this._isLine) phi = 0;
      } else {
        phi = 0.0;
      }

      // assemble frame matrix (transpose happens in FrameInfo constructor like Java usage)
      const index = this._isLine ? 0 : i - 1;
      for (let k = 0; k < 4; k++) frame[k] = this.#frenetNormalField[index][k];
      for (let k = 0; k < 4; k++) frame[4 + k] = this.#binormalField[index][k];
      for (let k = 0; k < 4; k++) frame[8 + k] = this.#tangentField[index][k];
      for (let k = 0; k < 4; k++) frame[12 + k] = polygonh[i][k];

      if ((TubeFactory.debug & 4) !== 0) {
        logger.fine(Category.ALL, `determinant is:\n${Rn.determinant(frame)}`);
      }

      // Java stores Rn.transpose(null, frame)
      const ft = Rn.transpose(null, frame);
      frameInfo[i - 1] = new FrameInfo(ft, d[i - 1], theta, phi);
      if ((TubeFactory.debug & 16) !== 0) {
        logger.fine(Category.ALL, `Frame ${i - 1}: ${frameInfo[i - 1].toString()}`);
      }
    }

    this._framesDirty = false;
    this._frames = frameInfo;
    return frameInfo;
  }

  // ---- helpers ----

  static #removeDuplicates(cc) {
    const n = cc.length;
    const v = [];
    let currentPoint = cc[0];
    v.push(currentPoint);
    let i = 1;
    let d = 0;
    do {
      let nextPoint;
      do {
        nextPoint = cc[i];
        d = Rn.euclideanDistance(currentPoint, nextPoint);
        i++;
      } while (d < this._tolerance && i < n);
      if (i === n) break;
      currentPoint = nextPoint;
      v.push(currentPoint);
    } while (i < n);
    return v;
  }

  #calculateIsLine(polygon) {
    const n = polygon.length;
    for (let i = 1; i < n - 1; i++) {
      const bloop = P3.planeFromPoints(null, polygon[i - 1], polygon[i], polygon[i + 1]);
      console.log('bloop', bloop);
      if (Rn.euclideanNormSquared(bloop) > this._tolerance) {
        this._isLine = false;
        return;
      }
    }
    this._isLine = true;
  }


}

