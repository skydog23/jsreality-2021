/**
 * JavaScript port/translation of jReality.
 *
 * Port of: de.jreality.geometry.TubeUtility
 *
 * Policy:
 * - This module enforces **4D homogeneous coordinates** for tubing-related methods.
 * - Any upstream conversion from 3D -> 4D should happen before calling TubeUtility.
 */

import { getLogger, Category } from '../util/LoggingSystem.js';
import * as P3 from '../math/P3.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Transformation } from '../scene/Transformation.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { fromDataList, toDataList } from '../scene/data/DataUtility.js';

import { QuadMeshFactory } from './QuadMeshFactory.js';
import { TubeFactory } from './TubeFactory.js';

const logger = getLogger('jsreality.core.geometry.TubeUtility');

/**
 * Debug bitmask (mirrors Java `TubeUtility.debug`).
 * @type {number}
 */
export let debug = 0;

/**
 * Frame-field type selection.
 * Mirrors de.jreality.geometry.FrameFieldType.
 * @readonly
 * @enum {number}
 */
export const FrameFieldType = Object.freeze({
    PARALLEL: 1,
    FRENET: 2
});

/**
 * Mirrors de.jreality.geometry.TubeUtility.FrameInfo.
 */
export class FrameInfo {
    /**
     * @param {number[]} frame length-16 array storing a 4x4 matrix
     * @param {number} length curve length fraction in [0,1] up to this point
     * @param {number} theta joint angle
     * @param {number} phi parallel-transport correction angle
     */
    constructor(frame, length, theta, phi) {
        /** @type {number[]} */
        this.frame = frame;
        /** @type {number} */
        this.length = length;
        /** @type {number} */
        this.theta = theta;
        /** @type {number} */
        this.phi = phi;
    }

    toString() {
        return [
            `Frame is\n${Rn.matrixToString(this.frame)}`,
            `Length is: ${this.length}`,
            `Theta is: ${this.theta}`,
            `Phi is: ${this.phi}`
        ].join('\n');
    }
}

/**
 * A simple diamond cross section in the xy-plane (4D points, open curve).
 * @type {number[][]}
 */
export const diamondCrossSection = Object.freeze([
    [1, 0, 0, 1],
    [0, 1, 0, 1],
    [-1, 0, 0, 1],
    [0, -1, 0, 1],
    [1, 0, 0, 1]
]);

/**
 * Default octagonal cross section (4D points, closed curve).
 * @type {number[][]}
 */
export const octagonalCrossSection = Object.freeze([
    [1, 0, 0, 1],
    [0.707, 0.707, 0, 1],
    [0, 1, 0, 1],
    [-0.707, 0.707, 0, 1],
    [-1, 0, 0, 1],
    [-0.707, -0.707, 0, 1],
    [0, -1, 0, 1],
    [0.707, -0.707, 0, 1],
    [1, 0, 0, 1]
]);

/**
 * Generate a planar n-gon cross section in the xy-plane (4D points).
 * @param {number} n
 * @returns {number[][]}
 */
export function getNgon(n) {
    const xsec = new Array(n + 1);
    for (let i = 0; i <= n; i++) {
        const alpha = 2 * Math.PI * (i / n);
        xsec[i] = [Math.cos(alpha), Math.sin(alpha), 0, 1];
    }
    return xsec;
}

// -----------------------------------------------------------------------------
// Internal helpers / cached geometry
// -----------------------------------------------------------------------------

const e1 = [Math.random(), Math.random(), Math.random(), 1.0];
const metrics = [Pn.HYPERBOLIC, Pn.EUCLIDEAN, Pn.ELLIPTIC];
const translation = [0, 0, 0.5, 1];

/** @type {import('../scene/IndexedFaceSet.js').IndexedFaceSet[]|null} */
let _urTube = null;
/** @type {number[][]|null} */
let _canonicalTranslation = null;

function ensureUrTube() {
    if (_urTube) return;

    const n = octagonalCrossSection.length;
    const verts = new Array(2 * n);

    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < n; j++) {
            const q = n - j - 1;
            const src = octagonalCrossSection[j];
            verts[i * n + q] = [src[0], src[1], i === 0 ? -0.5 : 0.5, 1.0];
        }
    }

    _canonicalTranslation = new Array(3);
    _urTube = new Array(3);

    for (let k = 0; k < 3; k++) {
        _canonicalTranslation[k] = P3.makeTranslationMatrix(null, translation, metrics[k]);

        const qmf = new QuadMeshFactory();
        // Keep Java behavior: build using EUCLIDEAN metric.
        qmf.setMetric(Pn.EUCLIDEAN);
        qmf.setULineCount(n);
        qmf.setVLineCount(2);
        qmf.setClosedInUDirection(true);
        qmf.setVertexCoordinates(verts);
        qmf.setGenerateEdgesFromFaces(true);
        qmf.setEdgeFromQuadMesh(true);
        qmf.setGenerateFaceNormals(true);
        qmf.setGenerateVertexNormals(true);
        qmf.setGenerateTextureCoordinates(true);
        qmf.update();

        _urTube[k] = qmf.getIndexedFaceSet();
        _urTube[k].setName(`urTube${k}`);
        // if (k === 1) {
        //     _urTube[k].setGeometryAttributes(CommonAttributes.RMAN_PROXY_COMMAND, 'Cylinder 1.0 -.5 .5 360');
        // }
    }
}

function assert4D(p, name) {
    if (!Array.isArray(p) || p.length !== 4) {
        throw new Error(`TubeUtility: ${name} must be a 4D homogeneous point (length 4).`);
    }
}


// -----------------------------------------------------------------------------
// Public API (ported)
// -----------------------------------------------------------------------------

export function getInitialBinormal(polygon, metric) {
    const n = polygon.length;
    const B = [0, 0, 0, 0];
    for (let i = 1; i < n - 1; i++) {
        Pn.polarize(B, P3.planeFromPoints(null, polygon[i - 1], polygon[i], polygon[i + 1]), metric);
        if (Rn.euclideanNormSquared(B) > 1e-15) return B;
    }
    const Br = [Math.random(), Math.random(), Math.random(), 1.0];
    return Pn.polarizePlane(null, P3.planeFromPoints(null, Br, polygon[1], polygon[2]), metric);
}

/**
 * Port of Java overloads:
 * - tubeOneEdge(ip1, ip2, rad, crossSection, metric)
 * - tubeOneEdge(sgc, ip1, ip2, rad, crossSection, metric)
 *
 * jsreality policy: **4D-only** points.
 *
 * @param  {...any} args
 * @returns {SceneGraphComponent}
 */
export function tubeOneEdge(...args) {
    let sgc = null;
    let ip1, ip2, rad, crossSection, metric;

    if (args.length === 5) {
        [ip1, ip2, rad, crossSection, metric] = args;
    } else if (args.length === 6) {
        [sgc, ip1, ip2, rad, crossSection, metric] = args;
    } else {
        throw new Error(`TubeUtility.tubeOneEdge: unsupported signature (got ${args.length} args)`);
    }

    void crossSection; // parity: Java currently uses cached urTube geometry

    assert4D(ip1, 'ip1');
    assert4D(ip2, 'ip2');

    ensureUrTube();

    // Validity check: jsreality Pn.isValidCoordinate signature is (v, metric).
    const isValid1 = Pn.isValidCoordinate?.(ip1, metric) ?? true;
    const isValid2 = Pn.isValidCoordinate?.(ip2, metric) ?? true;
    if (!isValid1 && !isValid2) return new SceneGraphComponent();

    const p1 = [...ip1];
    const p2 = [...ip2];

    if (!isValid1) Rn.linearCombination(p1, 0.99, p1, 0.01, p2);
    else if (!isValid2) Rn.linearCombination(p2, 0.99, p2, 0.01, p1);

    Pn.normalize(p1, p1, metric);
    Pn.normalize(p2, p2, metric);

    if ((debug & 2) !== 0) logger.fine(Category.ALL, `p1 is ${Rn.toString(p1)}`);
    if ((debug & 2) !== 0) logger.fine(Category.ALL, `p2 is ${Rn.toString(p2)}`);

    const polarPlane = Pn.polarizePoint(null, p1, metric);
    if ((debug & 2) !== 0) logger.fine(Category.ALL, `Polar plane is ${Rn.toString(polarPlane)}`);

    const tangent = P3.lineIntersectPlane(null, p1, p2, polarPlane);
    const diff = Rn.subtract(null, p2, p1);
    if (Rn.innerProduct(diff, tangent) < 0.0) Rn.times(tangent, -1.0, tangent);
    Pn.setToLength(tangent, tangent, 1.0, metric);

    const normal = Pn.polarizePlane(null, P3.planeFromPoints(null, p1, tangent, e1), metric);
    const binormal = Pn.polarizePlane(null, P3.planeFromPoints(null, p1, tangent, normal), metric);
    Pn.setToLength(normal, normal, 1.0, metric);
    Pn.setToLength(binormal, binormal, 1.0, metric);

    const frame = new Array(16);
    for (let i = 0; i < 4; i++) frame[i] = binormal[i];
    for (let i = 0; i < 4; i++) frame[4 + i] = normal[i];
    for (let i = 0; i < 4; i++) frame[8 + i] = tangent[i];
    for (let i = 0; i < 4; i++) frame[12 + i] = p1[i];

    if (Rn.determinant(frame) < 0) {
        for (let i = 0; i < 4; i++) frame[i] = normal[i];
        for (let i = 0; i < 4; i++) frame[4 + i] = binormal[i];
        logger.warn(Category.ALL, 'tubeOneEdge: flipping orientation');
    }

    if ((debug & 16) !== 0) {
        logger.fine(Category.ALL, `Frame is ${Rn.matrixToString(frame)}`);
        logger.fine(Category.ALL, `Det is ${Rn.determinant(frame)}`);
    }

    Rn.transpose(frame, frame);

    const scaler = Rn.identityMatrix(4);
    const dist = Pn.distanceBetween(p1, p2, metric);
    let coord = dist / 2;
    if (Number.isNaN(coord)) {
        logger.warn(Category.ALL, 'tubeOneEdge: bad coord');
        return new SceneGraphComponent();
    }

    if (metric === Pn.HYPERBOLIC) coord = Pn.tanh(dist / 2.0);
    else if (metric === Pn.ELLIPTIC) coord = Math.tan(dist / 2.0);
    scaler[10] = 2 * coord;

    let radcoord = rad;
    if (metric === Pn.HYPERBOLIC) radcoord = Math.sqrt(1 - coord * coord) * Pn.tanh(rad);
    else if (metric === Pn.ELLIPTIC) radcoord = Math.sqrt(1 + coord * coord) * Math.tan(rad);
    scaler[0] = scaler[5] = radcoord;

    if ((debug & 1) !== 0) {
        logger.fine(Category.ALL, `distance=${dist}\tscaler=${coord}\tradiusFactor=${radcoord}`);
    }

    const translate = [0, 0, coord, 1];
    const translateM = P3.makeTranslationMatrix(null, translate, metric);
    const net = Rn.times(null, frame, Rn.times(null, translateM, scaler));

    if ((debug & 64) !== 0) logger.fine(Category.ALL, `net is \n${Rn.matrixToString(net)}`);

    if (sgc == null) sgc = new SceneGraphComponent();
    sgc.setGeometry(_urTube[metric + 1]);
    if (sgc.getTransformation() == null) sgc.setTransformation(new Transformation());
    sgc.getTransformation().setMatrix(net);
    return sgc;
}

/**
 * Port of `TubeUtility.calculateAndSetNormalVectorsForCurve(IndexedLineSet ils)`.
 * jsreality policy: **4D-only** points.
 *
 * @param {import('../scene/IndexedLineSet.js').IndexedLineSet} ils
 */
export function calculateAndSetNormalVectorsForCurve(ils) {
    const coordsDL = ils.getVertexAttribute(GeometryAttribute.COORDINATES);
    if (!coordsDL) throw new Error('calculateAndSetNormalVectorsForCurve: missing COORDINATES');
    const polygon = fromDataList(coordsDL);

    const n = polygon.length;
    if (n <= 1) throw new Error("Can't tube a vertex list of length less than 2");
    if (polygon[0].length !== 4) {
        throw new Error('calculateAndSetNormalVectorsForCurve: expects 4D points; upstream must homogenize.');
    }

    const polygon2 = new Array(n + 2);
    for (let i = 0; i < n; i++) polygon2[i + 1] = polygon[i];
    polygon2[0] = Rn.add(null, polygon[0], Rn.subtract(null, polygon[0], polygon[1]));
    polygon2[n + 1] = Rn.add(null, polygon[n - 1], Rn.subtract(null, polygon[n - 1], polygon[n - 2]));

    const frames = new TubeFactory().makeFrameField(polygon2, FrameFieldType.FRENET, Pn.EUCLIDEAN);
    const normals = new Array(n);

    for (let i = 0; i < n; i++) {
        normals[i] = [0, 0, 0, 0];
        for (let j = 0; j < 4; j++) normals[i][j] = frames[i].frame[4 * j];
        normals[i][3] *= -1;
        Pn.normalize(normals[i], normals[i], Pn.EUCLIDEAN);
    }

    ils.setVertexAttribute(GeometryAttribute.NORMALS, toDataList(normals, 4));
}

// Optional accessors for cached geometry (mirrors Java public fields)
export function getUrTube() {
    ensureUrTube();
    return _urTube;
}

export function getCanonicalTranslation() {
    ensureUrTube();
    return _canonicalTranslation;
}

