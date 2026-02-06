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
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { SVDUtil } from '../math/SVDUtil.js';
import { fromDataList } from '../scene/data/DataUtility.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { Color } from '../util/Color.js';
import { getLogger, Level, setModuleLevel } from '../util/LoggingSystem.js';
import { Rectangle2D } from '../util/Rectangle2D.js';
import { SceneGraphUtility } from '../util/SceneGraphUtility.js';
import { ConicUtils } from './ConicUtils.js';
import { GeometryMergeFactory } from './GeometryMergeFactory.js';
import { IndexedLineSetFactory } from './IndexedLineSetFactory.js';
import { LineUtility } from './projective/LineUtility.js';
import { PointRangeFactory } from './projective/PointRangeFactory.js';

const logger = getLogger('jsreality.core.geometry.ConicSection');
setModuleLevel(logger.getModuleName(), Level.INFO);

export class ConicSection {
    name = 'conic';
    curve = null;
    dualConicSGC = null;
    Q = null;
    dQ = null;
    coefficients = [1, 0, 1, 0, 0, -1];
    dcoefficients = null;
    rank = 0;
    svdQ = null;
    sylvester = null;
    isImaginary = false;
    linePair = null;
    fivePoints = null;
    pts5d = null;
    exactFollower = true;
    numPoints =100;
    useSylvParam = false;
    maxPixelError = .0003;  // have to compute this from the viewport and the canvas size
    degConTol = null;  // set this to override ConicUtils.degenConicTolerance.
    viewport = null;
    normalize = true;

    constructor(initArray = [1, 0, 1, 0, 0, -1], normalize = true) {
        // console.log('ConicSection constructor called with initArray = ', initArray);
        if (initArray !== null)
            if (Array.isArray(initArray)) {
                if (Array.isArray(initArray[0]))
                    this.setFromFivePoints(initArray);
                else if (initArray.length == 6) this.setFromCoefficients(initArray);
                else if (initArray.length == 9) {
                    this.setFromCoefficients(ConicUtils.convertQToArray(initArray));
                }
            }
            else throw new Error('Argument must be an array of arrays or a single array');
        this.normalize = normalize;
    }

    
    // the conic can be determined by 5 points
    setFromFivePoints(fivePoints) {
        logger.finer(-1, 'setFromFivePoints called with fivePoints = ', fivePoints);
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
        const evals = this.fivePoints.map(pt => Rn.bilinearForm(this.Q, pt, pt));
        logger.fine(-1, 'evals = ', evals);
        if (Math.max(...evals) > 1e-6) {
            logger.warn(-1, 'Points are not exactly on the conic. Max eval = ', Math.max(...evals));
            return;
        }
        this.updateGeomRepn();
    }

    // we can also set the conic from coefficients directly
    setFromCoefficients(coefficients) {
        logger.fine(-1,"\n Setting from coeffs \n", coefficients);
        this.pts5d = null;   // get rid of the five points data
        // calculate the rand from SVD of Q
        this.svdQ = SVDUtil.svdDecomposition(ConicUtils.convertArrayToQ2D(...coefficients));
        // Determine rank (count non-zero singular values)
        const tol = (this.degConTol !== null) ? this.degConTol : ConicUtils.degenConicTolerance;

        this.rank = this.svdQ.S.filter(s => Math.abs(s) > tol).length;
        this.setCoefficients(coefficients);
        this.updateGeomRepn();
    }

    setCoefficients(coefficients) {
        this.coefficients = this.#chooseContinuity(this.coefficients, coefficients);
        if (this.normalize) this.coefficients = ConicUtils.normalizeCoefficients(this.coefficients);
        this.Q = ConicUtils.convertArrayToQ(...this.coefficients);
        // this.isImaginary = ConicUtils.isImaginary(this.Q);
        // if (this.isImaginary)    {
        //     console.log('Conic ', this.name, ' imaginary conic\n', Rn.matrixToString(this.Q));
        // }
        // this.sylvester =  Rn.reorderSylvesterOddSignLast(Rn.sylvesterDiagonalize3x3(this.Q));
        this.sylvester =  Rn.reorderSylvesterOddSignLast(Rn.sylvesterDiagonalize3x3(this.Q));
        if (false) {
            const sylQ = Rn.congruenceTransform(null, this.Q, Rn.inverse(null, this.sylvester.P));
            if (!Rn.isDiagonalMatrix(sylQ, 1e-4)) {
                logger.warn(-1, 'sylQ is not diagonal');
            }
            logger.info(-1, 'sylvester form of Q = ', sylQ);
        }
        this.dQ = P2.cofactor(null, this.Q);
        if (this.normalize) this.dQ = ConicUtils.normalizeQ(this.dQ);
        this.dcoefficients = ConicUtils.convertQToArrayN(this.dQ);
        logger.fine(-1, 'Q singular values:', this.svdQ.S);
        logger.fine(-1, 'rank = ', this.rank);
        logger.fine(-1, 'conic Q', this.Q);
        logger.fine(-1, 'conic dQ', this.dQ);
        logger.fine(-1, 'Q.dQ = ', Rn.times(null, this.Q, this.dQ));
    }

    #chooseContinuity(oldc, newc) {
        if (oldc == null) return newc;
        const d1 = Rn.linearCombination(null, .5, oldc, .5, newc);   // (oldc + newc)/2
        const d2 = Rn.linearCombination(null, .5, oldc, -.5, newc);   // (oldc - newc)/2
        // choose the smaller norm
        const norms = [Rn.euclideanNorm(d1), Rn.euclideanNorm(d2)];
        if (norms[0] > norms[1]) return newc;
        return Rn.times(null, -1, newc);
    }
    // get the geometric representation for the conic
    updateGeomRepn() {
        logger.fine(-1, 'Updating conic section');
        logger.fine(-1, 'conic rank', this.rank);


        if (this.rank === 1) {
            this.doubleLine = ConicUtils.factorDoubleLine(this);
            // we now have exact rank-1, and should update the Q matrix
            if (this.normalize) this.#updateQ(ConicUtils.buildQFromFactors(this.doubleLine, this.doubleLine));
            let l1 = new PointRangeFactory();
            logger.fine("double line = ",Rn.toString(this.doubleLine));
            l1.set2DLine(this.doubleLine);
            l1.update();
            this.curve = l1.getLine();
            return;
        }
        else if (this.rank === 2) {
            this.linePair = ConicUtils.factorPair(this);
            logger.fine(-1, 'line pair = ', this.linePair);
            // we now have exact rank-2, and should update the Q matrix
            if (this.normalize) this.#updateQ(ConicUtils.buildQFromFactors(this.linePair[0], this.linePair[1]));
            else this.#updateQ(ConicUtils.buildQFromFactors(this.linePair[0], this.linePair[1]));
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

        let centerPoint = null;
        let C = null;
        let newSylvester = this.sylvester;
        const TP = Rn.transpose(null, newSylvester.P);
        logger.fine(-1, 'name = ', this.name);
        logger.fine(-1, 'sylvester.P = ', newSylvester.P);
        logger.fine(-1, 'Pt.Q.P = ', Rn.congruenceTransform(null, this.Q, TP));
        logger.fine(-1, 'sylvester.D = ', newSylvester.D);
        logger.fine(-1, 'sylvester.signs = ', newSylvester.signs);
        logger.fine(-1, 'sylvester.inertia = ', newSylvester.inertia);
        logger.fine(-1, 'sylvester.eigenvalues = ', newSylvester.eigenvalues);
        centerPoint =  Pn.dehomogenize(null, Rn.matrixTimesVector(null, newSylvester.P, [0, 0, 1]));
        if (Math.abs(centerPoint[2]) < 1e-4) {
            logger.warn(-1, 'centerPoint[2] = ', centerPoint[2]);
            centerPoint = [centerPoint[0], centerPoint[1], .1];
        }
        C = Rn.bilinearForm(this.Q, centerPoint, centerPoint);
        const npts = this.numPoints;
        const myVP = this.viewport ? this.viewport.expand(.1) : new Rectangle2D(-10, -10, 20, 20);
        const tvals = new Array(npts).fill(0).map((_, i) => (2*Math.PI * i) / (npts-1));  // wrap around to 2*Pi.
        const edges = new Array(npts-1).fill(0).map((_, i) => [i, (i+1)]);
        // let pts3 = null;
        // if (this.useSylvParam) {
        //     // all regular conics have this form in sylvester normal form
        //     let Dpts3 = tvals.map(t => [Math.cos(t), Math.sin(t), 1]);
        //     pts3 = Dpts3.map(pt => Pn.dehomogenize(null, Rn.matrixTimesVector(null, newSylvester.P, pt)));
        // } else {
        //     pts3 = tvals.map(t => this.#pointCenter(t, C, centerPoint));
        // }

        const pts3 = tvals.map(t => this.useSylvParam ? this.#pointSylvester(t, newSylvester.P) : this.#pointCenter(t, C, centerPoint));
        const evals = pts3.map(pt => Math.abs(Rn.bilinearForm(this.Q, pt, pt))/Rn.innerProduct(pt, pt));
        const maxEval = Math.max(...evals);
        if (maxEval > 1e-4) {
            logger.fine(-1, 'name = ', this.name);
            logger.fine(-1, 'maxEval = ', maxEval);
            logger.fine(-1, 'Q = ', this.Q);
            logger.fine(-1, 'P = ', newSylvester.P);
            logger.fine(-1, 'evals = ', evals);
            logger.fine(-1, 'pts3 = ', pts3[pts3.length-1]);
            logger.warn('#drawRegularConic: points off conic');
        }
        const newedges = [];
        do {
            const [i1, i2] = edges.pop();   // get the next edge
            const [p1, p2] = [pts3[i1], pts3[i2]];  // and its endpoints
            // This segment check against viewport should be more careful. 
            // It could still cut off the corner of the viewport
            if (!myVP.contains(p1[0], p1[1]) && !myVP.contains(p2[0], p2[1])) {
                continue;
            }
            const [t1, t2] = [tvals[i1], tvals[i2]];   // the times of the endpoints
            const [mid, tm] = [Rn.linearCombination(null, .5, p1, .5, p2), (t1 + t2) / 2];
            const pt = this.useSylvParam ?  this.#pointSylvester(tm, newSylvester.P ) : this.#pointCenter(tm, C, centerPoint);
            const error = Rn.euclideanNorm(Rn.subtract(null, pt, mid)); // compare to midpoint
            if (error > this.maxPixelError) { // too much curve deviation, subdivide
                logger.finer(-1, 'error = ', error, ' > ', this.maxPixelError, ' subdividing');
                logger.finer(-1, 'pt = ', pt);
                logger.finer(-1, 'mid = ', mid);
                tvals.push(tm);  pts3.push(pt);
                edges.push([i1, pts3.length - 1]);
                edges.push([pts3.length - 1, i2]);
            } else {   // accept this edge
                newedges.push([i1, i2]);
            }
        } while (edges.length > 0 && pts3.length < 10000);  // in case things go crazy
        logger.fine(-1, '# points = ', pts3.length);
        const ifsf = new IndexedLineSetFactory();
        ifsf.setVertexCount(pts3.length);
        ifsf.setVertexCoordinates(pts3.map(pt => Rn.convert3To4(null, pt)));
        ifsf.setEdgeCount(newedges.length);
        ifsf.setEdgeIndices(newedges);
        ifsf.update();
        return ifsf.getIndexedLineSet();
    }

    #pointSylvester(t, Pm) {
        const V = [Math.cos(t), Math.sin(t),1];
        return Pn.dehomogenize(null, Rn.matrixTimesVector(null, Pm, V));
    }
    // calculation using a point not on the conic
    #pointCenter(t, C, centerPoint) {
        const V = [Math.cos(t), Math.sin(t), 0];
        const A = Rn.bilinearForm(this.Q, V, V);
        const B = 2 * Rn.bilinearForm(this.Q, V, centerPoint);
        let d = (B * B - 4 * A * C);
        if (d < -1e-8){
            logger.fine(-1, 'name = ', this.name);
            logger.fine(-1, 'centerPoint = ', centerPoint);
            logger.fine('#pointCenter: d < -1e-8', d);
            d = 0;
        }
        return Pn.dehomogenize(null, Rn.add(null, 
                    Rn.times(null, 2*A, centerPoint),  
                    Rn.times(null, (-B + Math.sqrt(d)), V)));
    }

    // internal function:
    // if we've detected a degenerate conic, reset with an exact rank-1 or rank-2 conic
    #updateQ(newQ) {
        if (this.normalize) this.Q = ConicUtils.normalizeQ(newQ);
        else this.Q = newQ;
        this.sylvester = Rn.sylvesterDiagonalize3x3(this.Q);
        this.coefficients = ConicUtils.convertQToArrayN(this.Q);
        this.dQ = P2.cofactor(null, this.Q);
        this.dcoefficients = ConicUtils.convertQToArrayN(this.dQ);
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
        // console.log('ConicSection viewport = ', this.viewport);
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

// Remove this code if it's hanging around in 2027
// It was part of the process of getting the rendering of the regular conics.
// Now that Google Gemini reminded my how to do midpoint subdivision, I'm happy with the
// current code.
// if (false &&this.exactFollower) {
//     // try out the exact follower algorithm.
//     let stepSize = .02,
//         P = pointOnConic,
//         nP = null,
//         C = pointOnConic,   // try putting the center at the point on the conic
//         c = Pn.polarize(null, C, Pn.ELLIPTIC),   // the "tangent space" of C in Ell2.
//         np = null,
//         dir = Pn.normalize(null, Rn.subtract(null, P, C), Pn.ELLIPTIC),     // should be ideal point when C and P are both finite
//         ndir = null,
//         totalAngle = 0;
//     P = Pn.normalize(null, P, Pn.ELLIPTIC);
//     C = Pn.normalize(null, C, Pn.ELLIPTIC);
//     do {
//         nP = this.#exactNextPoint(P, C, c, stepSize);
//         totalAngle += Pn.angleBetween(P, nP, Pn.ELLIPTIC);
//         // return to "euclidean" norm
//         pts4.push(convert3To4(null, Pn.dehomogenize(null, P)));
//         //pts4.push(Rn.convert3To4(null, Pn.homogenize(null, nP)));
//         P = nP;
//         dir = ndir;
        
//     } while (Math.abs(totalAngle) <= 2*Math.PI && totalAngle !== 0);
//     console.log('calculated #points ', pts4.length);
// } else if (false &&this.viewport) {  
//     // we implement a two-stage approach.
//     // first make sure that the part of the curve inside the viewport has maximum distance between points.
//     // Then we call a clipCurveToRectangle2D to obtain an IndexedLineSet from the results.
//     // For this reason we apply a slightly larger viewport in the first stage.
//     const biggerVP = this.viewport.clone().expand(.1);
//     let angle = 0,
//     currentPoint = null,
//     lastPoint = null,
//     currentAngle = 0,
//     d = 0;
//     let maxDistance = this.maxSegmentLength;
//     let minDistance = maxDistance / 3;
//     do {
//         let dangle = Math.PI / this.numPoints;  // start with standard step-size
//         // keep halving the step-size until the distance is less than maxDistance
//         // this should also be adaptable to the previous result, and then be allowed to increase, too.
//         // later!
//         let its = 0;
//         do {  
//             angle = currentAngle + dangle;      // dangle decreases in this loop until distance 
//                 // to previous point is less than maxDistance and the point is on the conic
//             currentPoint = this.#calculatePointForAngle(angle, pointOnConic);
//             // skip it if it's outside our expanded viewport
//             if (currentPoint === null || !biggerVP.contains(currentPoint[0], currentPoint[1])) {
//                 dangle = Math.PI / this.numPoints; 
//                 break;
//             } 
//             if (count === 0) break;
//             // estimate the step-size based on how much too far we moved.
//             d = Rn.euclideanNorm(Rn.subtract(null, currentPoint, lastPoint));
//             dangle *= .8 * maxDistance / d;   // reduce step-size
//             its++;
//         } while (count != 0 && its < 5 && (d > maxDistance || d < minDistance));
//         currentAngle = angle;
//         if (currentPoint !== null) {
//             pts4.push(Rn.convert3To4(null, currentPoint));
//             lastPoint = currentPoint;
//             count++;
//             // console.log('CS draw regular count = ', count);
//         }
//     } while (angle <= Math.PI);
//     console.log('CS draw regular count = ', count)
// }  else {
// #calculatePointForAngle(angle, pointOnConic) {
//     const V = [Math.cos(angle), Math.sin(angle), 0];
//     const a = Rn.bilinearForm(this.Q, V, V);
//     const b = 2 * Rn.bilinearForm(this.Q, V, pointOnConic);
//     if (Math.abs(a) > 1e-10) {
//         return Rn.add(null, pointOnConic, Rn.times(null, -b / a, V));
//     } else return null;
// }

// #exactNextPoint(P, C, c, stepSize = .02) {
//     const tangent = ConicUtils.polarize(this.Q, P);
//     const tdir = Pn.normalize(null, [tangent[1], -tangent[0], 0], Pn.ELLIPTIC); // a point on the "equator" of S2
//     let np = Rn.add(null, P, Rn.times(null, stepSize, tdir));  // move along tangent line
//     const sdir = Rn.subtract(null, np, C);     // direction from center to np
//     const cc = Rn.bilinearForm(this.Q, C, C),
//         pp = Rn.bilinearForm(this.Q, P, P),
//         k = Math.sqrt(Math.abs(cc/(pp-cc)));
//     np = Rn.add(null, C, Rn.times(null, k, sdir));
//     if (false) {
//         console.log('P = ', P);
//         console.log('P.tangent = ', Rn.innerProduct(tangent, P));
//         console.log('sdir = ', sdir);
//         console.log('np = ', np);
//         console.log('Q(np) = ', Rn.bilinearForm(this.Q, np, np));
//     }
//     return Pn.normalize(null, np, Pn.ELLIPTIC);
// }

