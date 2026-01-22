/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Add references to required classes and utilities
import * as P2 from '../math/P2.js';
import * as Rn from '../math/Rn.js';
import * as Pn from '../math/Pn.js';
import { getLogger, Level, setModuleLevel } from '../util/LoggingSystem.js';
import { ConicUtils } from './ConicUtils.js';
import { SVDUtil } from '../math/SVDUtil.js';
import { GeometryMergeFactory } from './GeometryMergeFactory.js';
import { IndexedLineSetUtility } from './IndexedLineSetUtility.js';
import { PointRangeFactory } from './projective/PointRangeFactory.js';
import { SceneGraphUtility } from '../util/SceneGraphUtility.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { Color } from '../util/Color.js';
import { LineUtility } from './projective/LineUtility.js';
import { fromDataList } from '../scene/data/DataUtility.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { convert4To3, convert3To4 } from '../math/Rn.js';

const logger = getLogger('jsreality.core.geometry.ConicSection');
setModuleLevel(logger.getModuleName(), Level.INFO);

export class ConicSection {
    curve = null;
    dualConicSGC = null;
    Q = null;
    dQ = null;
    coefficients = [1, 0, 1, 0, 0, -1];
    dcoefficients = null;
    rank = 0;
    svdQ = null;
    svd5Points = null;
    linePair = null;
    fivePoints = null;
    pts5d = null;
    drawRadials = false;
    numPoints = 250;
    degenConicTolerance = 1e-4;
    maxSegmentLength = .03;
    viewport = null;

    constructor(initArray = [1, 0, 1, 0, 0, -1]) {
        if (Array.isArray(initArray)) {
            if (Array.isArray(initArray[0]))
                this.setFromFivePoints(initArray);
            else this.setFromCoefficients(initArray);
        }
        else throw new Error('Argument must be an array of arrays or a single array');
    }

    // the conic can be determined by 5 points
    setFromFivePoints(fivePoints) {
        if (fivePoints == null || fivePoints.length !== 5) {
            logger.warn(-1, 'Five points are required to set the conic');
            return;
        }
        const solveConicResult = ConicUtils.solveConicFromPointsSVD(fivePoints, 1e-4);
        this.pts5d = solveConicResult;
        this.rank = this.pts5d.rank;
        this.svdQ = this.pts5d.svdQ;
        this.fivePoints = fivePoints;
        this.setCoefficients(this.pts5d.coefficients);
        this.updateGeomRepn();
    }

    // we can also set the conic from coefficients directly
    setFromCoefficients(coefficients) {
        this.pts5d = null;   // get rid of the five points data
        // calculate the rand from SVD of Q
        this.svdQ = SVDUtil.svdDecomposition(ConicUtils.convertArrayToQ2D(...coefficients));
        // Determine rank (count non-zero singular values)
        this.rank = this.svdQ.S.filter(s => Math.abs(s) > this.degenConicTolerance).length;
        logger.fine(-1, 'Q singular values:', this.svdQ.S);
        logger.fine(-1, 'rank = ', this.rank);
        this.setCoefficients(coefficients);
        this.updateGeomRepn();
    }

    setCoefficients(coefficients) {
        this.coefficients = ConicUtils.normalizeCoefficients([...coefficients]);
        this.Q = ConicUtils.convertArrayToQ(...this.coefficients);
        this.dQ = ConicUtils.normalizeQ(P2.cofactor(null, this.Q));
        this.dcoefficients = ConicUtils.convertQToArray(this.dQ);
        logger.fine(-1, 'conic Q', this.Q);
        logger.info(-1, 'Q singular values:', this.svdQ.S);
        logger.fine(-1, 'conic dQ', this.dQ);
        logger.fine(-1, 'Q.dQ = ', Rn.times(null, this.Q, this.dQ));
    }

    // get the geometric representation for the conic
    updateGeomRepn() {
        logger.fine(-1, 'Updating conic section');
        logger.fine(-1, 'conic rank', this.rank);


        if (this.rank === 1) {
            this.doubleLine = ConicUtils.factorDoubleLine(this);
            // we now have exact rank-1, and should update the Q matrix
            this.updateQ(ConicUtils.getQFromFactors(this.doubleLine, this.doubleLine));
            logger.fine(-1, 'conic Q', this.Q);
            logger.fine(-1, 'conic dQ', this.dQ);
            logger.fine(-1, 'Q.dQ = ', Rn.times(null, this.Q, this.dQ));
            let l1 = new PointRangeFactory();
            l1.set2DLine(this.doubleLine);
            l1.update();
            this.curve = l1.getLine();
            return;
        }
        else if (this.rank === 2) {
            this.linePair = ConicUtils.factorPair(this);
            logger.fine(-1, 'line pair = ', this.linePair);
            // we now have exact rank-2, and should update the Q matrix
            this.updateQ(ConicUtils.getQFromFactors(this.linePair[0], this.linePair[1]));
            let l1 = new PointRangeFactory();
            l1.set2DLine(this.linePair[0]);
            l1.update();
            let l2 = new PointRangeFactory();
            l2.set2DLine(this.linePair[1]);
            l2.update();

            this.curve = GeometryMergeFactory.mergeIndexedLineSets(l1.getLine(), l2.getLine());
            return;
        }

        this.curve = this.#drawRegularConic();

    }

    #drawRegularConic() {

        const pointOnConic = ConicUtils.findPointOnConic(this);
        // Now rotate a line around this point and find intersections
        let pts4 = [], count = 0;
        if (this.viewport) {
            // we implement a two-stage approach.
            // first make sure that the part of the curve inside the viewport has maximum distance between points.
            // Then we call a clipCurveToRectangle2D to obtain an IndexedLineSet from the results.
            // For this reason we apply a slightly larger viewport in the first stage.
            const biggerVP = this.viewport.clone().expand(.1);
            let angle = 0,
            currentPoint = null,
            lastPoint = null,
            currentAngle = 0,
            d = 0;
            let maxDistance = this.maxSegmentLength;
            let minDistance = maxDistance / 3;
            do {
                let dangle = Math.PI / this.numPoints;  // start with standard step-size
                // keep halving the step-size until the distance is less than maxDistance
                // this should also be adaptable to the previous result, and then be allowed to increase, too.
                // later!
                let its = 0;
                do {  
                    angle = currentAngle + dangle;      // dangle decreases in this loop until distance 
                        // to previous point is less than maxDistance and the point is on the conic
                    currentPoint = this.#calculatePointForAngle(angle, pointOnConic);
                    // skip it if it's outside our expanded viewport
                    if (currentPoint === null || !biggerVP.contains(currentPoint[0], currentPoint[1])) {
                        dangle = Math.PI / this.numPoints; 
                        break;
                    } 
                    if (count === 0) break;
                    // estimate the step-size based on how much too far we moved.
                    d = Rn.euclideanNorm(Rn.subtract(null, currentPoint, lastPoint));
                    dangle *= .8 * maxDistance / d;   // reduce step-size
                    its++;
                } while (count != 0 && its < 5 && (d > maxDistance || d < minDistance));
                currentAngle = angle;
                if (currentPoint !== null) {
                    pts4.push(Rn.convert3To4(null, currentPoint));
                    lastPoint = currentPoint;
                    count++;
                    // console.log('CS draw regular count = ', count);
                }
            } while (angle <= Math.PI);
            console.log('CS draw regular count = ', count)
        }  else {
            pts4 = new Array(this.numPoints + 1).fill(null).map(() => [0, 0, 0, 0]);
            for (let i = 0; i < this.numPoints; i++) {
                const angle = (Math.PI * i) / this.numPoints;
                // find the intersection of a rotating line through the point on the conic with the conic
                // The quadratic form Q(P+tV) is simple because Q(P,P) = 0
                const V = [Math.cos(angle), Math.sin(angle), 0];
                // Quadratic coefficient (t²)
                const a = Rn.bilinearForm(this.Q, V, V);
                // Linear coefficient (t)
                const b = 2 * Rn.bilinearForm(this.Q, V, pointOnConic);
                if (Math.abs(a) > 1e-10) {
                    const t = -b / a; // Other solution is t=0 
                    const currentPoint = Rn.add(null, pointOnConic, Rn.times(null, t, V));
                    // logger.finer(-1, 'currentPoint = ', currentPoint);
                    pts4[i] = Rn.convert3To4(null, currentPoint);
                }
            }
            count = this.numPoints;
        }
        pts4[count] = pts4[0];  // I'm not sure if this works with the viewport mode
        return this.viewport ? IndexedLineSetUtility.clipCurveToRectangle2D(pts4, this.viewport) :
            IndexedLineSetUtility.removeInfinity(pts4, 1.0);

    }

    #calculatePointForAngle(angle, pointOnConic) {
        const V = [Math.cos(angle), Math.sin(angle), 0];
        const a = Rn.bilinearForm(this.Q, V, V);
        const b = 2 * Rn.bilinearForm(this.Q, V, pointOnConic);
        if (Math.abs(a) > 1e-10) {
            return Rn.add(null, pointOnConic, Rn.times(null, -b / a, V));
        } else return null;
    }

    updateQ(newQ) {
        this.Q = newQ;
        this.coefficients = ConicUtils.convertQToArray(this.Q);
        this.dQ = P2.cofactor(null, this.Q);
        this.dcoefficients = ConicUtils.convertQToArray(this.dQ);
    };

    getIndexedLineSet() {
        return this.curve;
    }

    getDualCurveSGC() {
        if (this.dualConicSGC === null) {
            this.dualConicSGC = SceneGraphUtility.createFullSceneGraphComponent('dual curve');
            const ap = this.dualConicSGC.getAppearance();
            ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
            ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
            ap.setAttribute("lineShader." + CommonAttributes.TUBE_RADIUS, 0.005);
            ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, new Color(125, 255, 125));
            ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
        }
        this.#updateDualCurveSGC();
        return this.dualConicSGC;
    }

    setViewport(viewport) {
        this.viewport = viewport;
        this.updateGeomRepn();
        console.log('ConicSection viewport = ', this.viewport);
    }

    getViewport() {
        return this.viewport;
    }

    #updateDualCurveSGC() {
        const sampledCoords = fromDataList(this.curve.getVertexAttribute(GeometryAttribute.COORDINATES)).filter((pt, i) => (i % 4) === 0);
        const sampledCurve = sampledCoords.map(pt => Rn.convert4To3(null, pt));
        const lineCurve = sampledCurve.map(pt => P2.normalizeLine(ConicUtils.polarize(this.Q, pt)));
        // console.log('lineCurve = ', lineCurve);
        this.dualConicSGC.removeAllChildren();
        LineUtility.sceneGraphForCurveOfLines(this.dualConicSGC, lineCurve, sampledCoords, 2.0, true);
    }





}

