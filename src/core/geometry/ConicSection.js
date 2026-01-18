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
import { GeometryMergeFactory } from './GeometryMergeFactory.js';
import { IndexedLineSetUtility } from './IndexedLineSetUtility.js';
import { PointRangeFactory } from './projective/PointRangeFactory.js';

const logger = getLogger('jsreality.core.geometry.ConicSection');
setModuleLevel(logger.getModuleName(), Level.INFO);

export class ConicSection {
   curve = null;
   conicSGC = null;
   pointSGC = null;
   centerPoint = [0,0,1];
   pointOnConic = [0,0,1];
   drawRadials = false;
   numPoints = 1000;
   tolerance = 1e-6;
   coefficients = [1,0,1,0,0,-1];
   svdConic = null;
   svd5Points = null;
   rank = 0;
   singularValues = null;
   linePair = null;
   Q = null;
   dQ = null;
   dcoefficients = null;
   fivePoints = null;

    constructor(coefficients = [1,0,1,0,0,-1]) {
        this.setCoefficients(coefficients);
        this.update();
    }

    // Update coefficients and recalculate dependent matrices
    setCoefficients(coefficients) {
        this.coefficients = ConicUtils.normalizeCoefficients([ ...coefficients ]);
        this.Q = ConicUtils.convertArrayToQ(...this.coefficients);
        this.Q = ConicUtils.normalizeQ(this.Q);
        this.dQ = P2.cofactor(null, this.Q);
        this.dcoefficients = ConicUtils.convertQToArray(this.dQ);
        this.dQ = ConicUtils.normalizeQ(this.dQ);
        logger.info(-1, 'conic Q',this.Q);
        logger.info(-1, 'conic dQ',this.dQ);
        logger.info(-1, 'Q.dQ = ', Rn.times(null, this.Q, this.dQ));
    }
  
    // get the geometric representation for the conic
    update() {
        logger.info(-1, 'Updating conic section');
         logger.info(-1, 'conic rank',this.rank);
       
         if (this.rank === 1) {
            let l1 = new PointRangeFactory();
            l1.set2DLine(this.doubleLine);
            l1.update();
            this.curve = l1.getLine();
            const outer = this.doubleLine.map(a => this.doubleLine.map(b => a * b));
            this.setCoefficients(ConicUtils.convertQToArray(outer.flat()));
            logger.finer(-1, 'outer = ', outer);
            return;
        } 
        else if (this.rank === 2) {
             logger.fine(-1, 'line pair = ', this.linePair);
            let l1 = new PointRangeFactory();
            l1.set2DLine(this.linePair[0]);
            l1.update();
            let l2 = new PointRangeFactory();
            l2.set2DLine(this.linePair[1]);
            l2.update();

            this.curve = GeometryMergeFactory.mergeIndexedLineSets(l1.getLine(), l2.getLine());
            return;
        }
        const [A,B,C,H,G,F] = this.dcoefficients;
        // the polar point of the line at infinity ([0,0,1]) is the center point of a conic
        // have to use the dual conic to act on lines to obtain points
        this.centerPoint = Pn.dehomogenize(null,[G/2,F/2,C]);
        if (this.fivePoints) {
            this.centerPoint = this.fivePoints.reduce((acc, point) => {return Rn.add(null, acc, point);}, [0,0,0]);
            this.centerPoint = Pn.dehomogenize(null, this.centerPoint);
        }
        logger.info(-1, 'Conic center:', this.centerPoint); 
     // Try several lines through X to find a good point on the conic
        this.findPointOnConic();

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
            const b = 2*Rn.bilinearForm(this.Q, V,this.pointOnConic);
            if (Math.abs(a) > 1e-10) {
                const t = -b/a;  // Other solution is t=0 
                const currentPoint = Rn.add(null,this.pointOnConic, Rn.times(null,t,V));
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

    getIndexedLineSet() {
        return this.curve;
    }

    findPointOnConic() {
        this.pointOnConic = null;
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
                                this.pointOnConic = p;
                            }
                        }
                    }
                }
            }
        }

        if (!this.pointOnConic) {
            logger.warn(-1, 'Could not find initial point on conic');
            this.pointOnConic = [0, 0, 1];
        }

        this.pointOnConic = Pn.dehomogenize(null, this.pointOnConic);
        logger.fine(-1, 'Using point on conic:', this.pointOnConic);
    }


    
    
}

