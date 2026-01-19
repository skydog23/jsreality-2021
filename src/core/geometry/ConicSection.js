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
import {SVDUtil} from '../math/SVDUtil.js';
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
   centerPoint = [0,0,1];
   drawRadials = false;
   numPoints = 250;
   degenConicTolerance = 1e-4;
   Q = null;
   dQ = null;
   coefficients = [1,0,1,0,0,-1];
   dcoefficients = null;
   rank = 0;
    svdQ = null;    
    svd5Points = null;
   linePair = null;
   fivePoints = null;
   pts5d = null;
    constructor(coefficients = [1,0,1,0,0,-1]) {
        this.setFromCoefficients(coefficients);
        
    }

    // the conic can be determined by 5 points
    setFromFivePoints(fivePoints) {
        if (fivePoints  == null || fivePoints.length !== 5) {
            logger.warn(-1, 'Five points are required to set the conic');
            return;
        }
        this.pts5d = ConicUtils.solveConicFromPointsSVD(fivePoints);
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
        this.coefficients = ConicUtils.normalizeCoefficients([ ...coefficients ]);
        this.Q = ConicUtils.convertArrayToQ(...this.coefficients);
        this.dQ = ConicUtils.normalizeQ(P2.cofactor(null, this.Q));
        this.dcoefficients = ConicUtils.convertQToArray(this.dQ);
        logger.fine(-1, 'conic Q',this.Q);
        logger.fine(-1, 'conic dQ',this.dQ);
        logger.fine(-1, 'Q.dQ = ', Rn.times(null, this.Q, this.dQ));
     }
  
    // get the geometric representation for the conic
    updateGeomRepn() {
        logger.fine(-1, 'Updating conic section');
         logger.fine(-1, 'conic rank',this.rank);
       
         
         if (this.rank === 1) {
            this.doubleLine = ConicUtils.factorDoubleLine(this);
            // we now have exact rank-1, and should update the Q matrix
            this.updateQ(ConicUtils.getQFromFactors(this.doubleLine, this.doubleLine));
            logger.fine(-1, 'conic Q',this.Q);
            logger.fine(-1, 'conic dQ',this.dQ);
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
        // if we are here we are drawing a general conic
        const [A,H,B,G,F,C] = this.dcoefficients;
        // the polar point of the line at infinity ([0,0,1]) is the center point of a conic
        // have to use the dual conic to act on lines to obtain points
        this.centerPoint = Pn.dehomogenize(null,[G/2,F/2,C]);
        // if (this.fivePoints) {
        //     this.centerPoint = this.fivePoints.reduce((acc, point) => {return Rn.add(null, acc, point);}, [0,0,0]);
        //     this.centerPoint = Pn.dehomogenize(null, this.centerPoint);
        // }
        // logger.fine(-1, 'Conic center:', this.centerPoint); 
     // Try several lines through X to find a good point on the conic
        const pointOnConic = this.findPointOnConic();

        // Now rotate a line around this point and find intersections
        const pts4 = new Array(this.numPoints+1).fill(null).map(() => [0,0,0,0]);
        let firstPoint = null;
        for (let i = 0; i < this.numPoints; i++) {
            const angle = ( Math.PI * i) / this.numPoints;
            // find the intersection of a rotating line through the point on the conic with the conic
            // The quadratic form Q(P+tV) is simple because Q(P,P) = 0
            const V = [Math.cos(angle) , Math.sin(angle), 0];
            // Quadratic coefficient (t²)
            const a = Rn.bilinearForm(this.Q, V,V);
            // Linear coefficient (t)
            const b = 2*Rn.bilinearForm(this.Q, V,pointOnConic);
            if (Math.abs(a) > 1e-10) {
                const t = -b/a;  // Other solution is t=0 
                const currentPoint = Rn.add(null,pointOnConic, Rn.times(null,t,V));
                // logger.finer(-1, 'currentPoint = ', currentPoint);
                pts4[i] = Rn.convert3To4(null, currentPoint);
                if (i === 0) {
                    firstPoint = currentPoint;
                }
            }
        }
        // close up the curve by adding the first point again
        pts4[this.numPoints] = pts4[0];
        this.curve = IndexedLineSetUtility.removeInfinity(pts4, 1.0);       

        
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

    #updateDualCurveSGC() {
        const sampledCoords = fromDataList(this.curve.getVertexAttribute(GeometryAttribute.COORDINATES)).filter((pt,i) => (i%4) === 0);
        const sampledCurve = sampledCoords.map(pt => Rn.convert4To3(null,pt));
        const lineCurve = sampledCurve.map(pt => P2.normalizeLine(ConicUtils.polarize(this.Q, pt)));
        // console.log('lineCurve = ', lineCurve);
        this.dualConicSGC.removeAllChildren();
        LineUtility.sceneGraphForCurveOfLines(this.dualConicSGC, lineCurve, sampledCoords, 2.0, true);
    }

    findPointOnConic() {
        let pointOnConic = null;
        let minDistance = Infinity;
        const numTrialLines = 20;

        for (let i = 0; i < numTrialLines; i++) {
            const angle = (2 * Math.PI * i) / numTrialLines;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            const V = [dx, dy, 0];


            // t² coefficient
            const A = Rn.bilinearForm(this.Q, V, V);

            // t¹ coefficient
            const B = 2 * Rn.bilinearForm(this.Q, V, this.centerPoint);

            // t⁰ coefficient
            const C = Rn.bilinearForm(this.Q, this.centerPoint, this.centerPoint);
               // Solve quadratic equation
            if (Math.abs(A) > 1e-10) {
                const disc = B * B - 4 * A * C;
                if (disc >= 0) {
                    // Two solutions for t
                    const t1 = (-B + Math.sqrt(disc)) / (2 * A);
                    const t2 = (-B - Math.sqrt(disc)) / (2 * A);

                    // Try both solutions
                    const points = [
                        Rn.add(null, Rn.times(null, t1, V), this.centerPoint),
                        Rn.add(null, Rn.times(null, t2, V), this.centerPoint)
                    ].map(p => Pn.dehomogenize(null, p));

                    for (const p of points) {
                        // Check if this point is actually on the conic
                        const value = Rn.bilinearForm(this.Q, p, p);
                         if (Math.abs(value) < 1e-8) {
                            const distance = Rn.euclideanNorm(Rn.subtract(null, p, this.centerPoint));
                            // console.log('distance:', distance);
                            if (distance < minDistance) {
                                minDistance = distance;
                                pointOnConic = p;
                            }
                        }
                    }
                }
            }
        }

        if (!pointOnConic) {
            logger.warn(-1, 'Could not find initial point on conic');
            pointOnConic = [0, 0, 1];
        }
        logger.fine(-1, 'Using point on conic:', pointOnConic);
       return ( Pn.dehomogenize(null, pointOnConic));
        
    }


    
    
}

