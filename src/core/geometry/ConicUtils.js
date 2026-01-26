/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Utility functions for conic calculations
import { det, index, matrix } from 'mathjs';
import * as P2 from '../math/P2.js';
import * as P3 from '../math/P3.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { SVDUtil } from '../math/SVDUtil.js';
import { getLogger, Level, setModuleLevel } from '../util/LoggingSystem.js';

const logger = getLogger('jsreality.core.geometry.ConicUtils');
setModuleLevel(logger.getModuleName(), Level.INFO);


export class SolveConicResult {
    constructor(coefficients, svdQ, svd5Points, fivePoints, rank, maxNumCollPoints) {
        this.coefficients = coefficients;
        this.svdQ = svdQ;
        this.svd5Points = svd5Points;
        this.fivePoints = fivePoints;
        this.rank = rank;
        this.maxNumCollPoints = maxNumCollPoints;
    }
    coefficients = null;
    svdQ = null;
    svd5Points = null;
    fivePoints = null;
    rank = 0;
    maxNumCollPoints = 0;
}

export class ConicUtils {
    
    static conicTypes = ["zero", "double line", "line pair", "regular"];


    static convertQToQ2D(Q) {
        return [[Q[0],Q[1],Q[2]],[Q[3],Q[4],Q[5]],[Q[6],Q[7],Q[8]]];
    }
    static convertQToArray(Q) {
        return this.normalizeCoefficients([Q[0], 2*Q[1], Q[4], 2*Q[2], 2*Q[5], Q[8]]);
    }

    static convertArrayToQ(a,h,b,g,f,c) {
        return this.normalizeQ([a,h/2,g/2,h/2,b,f/2,g/2,f/2,c]);
    }

    static convertArrayToQ2D(a,h,b,g,f,c) {
        return [[a,h/2,g/2],[h/2,b,f/2],[g/2,f/2,c]];
    }

    static normalizeCoefficients(coefficients) {
        const mx = Rn.maxNorm(coefficients);
        return Rn.times(null, 1.0/mx, coefficients);
    }

    static normalizeQ(Q) {
        const det = Rn.determinant(Q);
        if (det !== 0) {
            const n = Math.sqrt(Q.length);
            const factor = 1.0 / Math.pow(Math.abs(det), 1/3.0);
            return Rn.times(null, factor, Q);
        }
        return Q;
    }

    // when rank=1 or two then the conic Q is the outer product of the line factors
    // generically a line pair, but can be a double line when line1 = line2
    static getQFromFactors(line1, line2) {
       return (line1.map(a => line2.map(b => a * b))).flat();  
    }

    static polarize(Q, element){
        return Rn.matrixTimesVector(null, Q, element);
    }
    /*
     Transform the conic by a projective transformation
     @param {number[][]} Q - The conic matrix
     @param {number[][]} transform - The projective transformation matrix
     @returns {number[][]} The transformed conic matrix
     */
     static transform(Q, transform) {
        return Rn.conjugateByMatrix(null, Q, transform);
    }

    
     static getVeroneseEmbedding([x,y,z]) {
        return [x*x,  x*y, y*y, x*z, y*z,  z*z]
    }

    static solveConicFromPoints(points) {
        if (points.length !== 5) {
            throw new Error('Exactly 5 points required');
        }

        logger.fine(-1, 'Using eigenvalue method for conic fitting');

        let rows = [...Array(5)].map((x,j)=>j),
        m = matrix(points.map(pt=>this.getVeroneseEmbedding(pt))),
        val = [...Array(6)].map((x, i) => {
            let columns = [...Array(6)].map((x, j) => j)
            columns.splice(i, 1)   // remove the ith entry
            return ((-1) ** i) * det(m.subset(index(rows, columns)));
        })
    logger.fine(-1, "coeffs = ",val)
    return val;

    }
    // Solve for conic coefficients from 5 points using proper SVD
    static solveConicFromPointsSVD(points, tolerance = 1e-4) {
        if (points.length !== 5) {
            throw new Error('Exactly 5 points required');
        }

        logger.fine(-1, 'Using SVD method for conic fitting');

        // Build the coefficient matrix A (5x6) directly from homogeneous coordinates
        const A = points.map(pt=>this.getVeroneseEmbedding(pt));
    
        logger.fine(-1, 'Coefficient matrix A:', A);

        // Perform SVD decomposition
        const svdPoints = SVDUtil.svdDecomposition(A);
        const dnsp = svdPoints.S.filter(s => s <= tolerance);
        logger.fine(-1, 'null space = ', dnsp);
        logger.fine(-1, 'SVD singular values:', svdPoints.S);
        logger.fine(-1, 'SVD V:', svdPoints.V);
        logger.fine(-1, 'SVD U:', svdPoints.U);

        // The null space vector is the column of V corresponding to the smallest singular value
        // we can always take the last column of V as an element of the null space
        const nullVector = svdPoints.V.map(row => row[5]);
        const coefficients = Rn.normalize(null, nullVector);

        logger.fine(-1, 'Null space vector from SVD:', nullVector);
        logger.fine(-1, 'Normalized coefficients (SVD):', coefficients);
        // Compute SVD of the conic matrix
        // it's useful but we may need to recompute Q since the null vector may not be exact
        const svdQ = SVDUtil.svdDecomposition(this.convertArrayToQ2D(...coefficients));
        logger.fine(-1, 'Q singular values:', svdQ.S);
         // Determine rank (count non-zero singular values)
        let rank = svdQ.S.filter(s => Math.abs(s) > tolerance).length;
        let maxNumCollPoints = -1;
        // classify the conic depending on the null space dimension and the rank of Q
        if (dnsp.length === 1) {    // either a regular conic or a line pair, or a double line
            if (rank === 3) maxNumCollPoints = 0;
            else if (rank === 2) maxNumCollPoints = 3;
        } else if (dnsp.length === 2) {  // 4 collinear points: not unique, but a line pair
            rank = 2;
            maxNumCollPoints = 4;
        } else if (dnsp.length === 3) {  // 5 points: a unique double line, but has to be found
            rank = 1;
            maxNumCollPoints = 5;
        } else throw new Error('Invalid dimension of null space',dnsp);
        return new SolveConicResult(coefficients, svdQ, svdPoints, points, rank, maxNumCollPoints);
       
       
    }


    static factorDoubleLine(conic) {
        // the strategy here:
        // rank-1 means that the conic is a double line.
        // we use the fact the that the "polar line" of any point (not on the double line)
        // is this double line

        logger.fine(-1, "factorDoubleLine: Q = ",conic.Q);
        const lines = this.factorPair(conic);
        logger.fine(-1, "lines = ", lines);
        const evals = lines.map(line => conic.fivePoints.map(pt => Rn.innerProduct(pt, line)))
        const sums = evals.map(oneEval => oneEval.reduce((sum, x) => sum + Math.abs(x), 0));
        logger.fine(-1, "sums = ",sums);
        return sums[0] < sums[1] ? lines[0] : lines[1];
    }
    static factorPair(conic) {
        const svdQ = conic.svdQ;
        logger.fine(-1, "svdQ = ", svdQ.S)
        //Use the V matrix from the svd decomposition to find the common point of the line pair
        const V = svdQ.V;
        logger.fine(-1, "V = ", V);
        const dcp = [V[0][2], V[1][2], V[2][2]];  // last column of V
        logger.fine(-1, "carrierPoint = ",dcp);
        const translation = Pn.normalize(null, [dcp[0], dcp[1], 0, dcp[2]], Pn.ELLIPTIC);
        const tform = P3.makeTranslationMatrix(null, translation, Pn.ELLIPTIC);
        const tform33 = Rn.convert44To33(tform);
        const itform33 = P2.cofactor(tform33);
        const tformV = Rn.matrixTimesVector(null, itform33, dcp);
        
        const Q1D = conic.Q;
        const result1D = Rn.conjugateByMatrix(null, Q1D, tform33);
        const iresult1D = Rn.conjugateByMatrix(null,Q1D, itform33);
        
        logger.finer(-1, "tformV = "+tformV);
        logger.finer(-1, "tform = "+tform33);
        logger.finer(-1, "itform = "+itform33);
        logger.fine(-1, "Q = ",conic.Q);
        logger.fine(-1, "result1D = ",result1D);
        logger.fine(-1, "result1D = ",iresult1D);

        // search for the line pair in the transformed conic
        // the only non-zero entries of iresult1D are the upper left 2x2 submatrix
         // so we can use the upper left 2x2 submatrix to find the line pair
        // and the last column of V is the carrier point
        const vals = [iresult1D[0], -2*iresult1D[1], iresult1D[4]];
        Rn.times(null, vals[0] != 0 ? 1.0/vals[0] : 1.0, vals);
        logger.fine(-1, "vals = "+vals);
        const [aa,bb,cc]= vals;
        const dd =bb*bb-4*aa*cc;
        if (dd >= 0) {       
            const p = Math.sqrt(dd);
            const r1 = (-bb + p)/(2*aa);
            const r2 = (-bb - p)/(2*aa);
            const ret = [[1,r1,0], [1,r2,0]];
            const tret = Rn.matrixTimesVector(null, tform33, ret);
            logger.finer(-1, "ret = ", ret);
            logger.finer(-1, "tret = ", tret);
            return tret;
        }  else return null;
    }

    static getCenterPoint(conic) {
         const [A,H,B,G,F,C] = conic.dcoefficients;
         return Pn.dehomogenize(null,[G/2,F/2,C]);
    }

    static findPointInsideConic(conic, factor = .5)  {

        logger.info(-1, 'conic.Q = ', conic.Q);
        const sylvesterMatrix = conic.sylvester.P;
        logger.info(-1, 'sylvesterMatrix = ', sylvesterMatrix);
        // find point on conic, construct tangent line,
        // find point on tangent line, construct polar line,
        // construct perpendicular line to tangent line at polar point,
        // find intersection of perpendicular line with polar line
        // take the average of the two intersection points
        const ponc = this.findPointOnConic(conic);
        const tl = ConicUtils.polarize(conic.Q, ponc);
        const tli = [-tl[1], tl[0], 0]; // pt at infinity on the tangent line
        const pot = Rn.linearCombination(null, factor, ponc, 1-factor, tli);
        const perpLine = P2.perpLineToLineInPoint(tl, ponc); 
        logger.finer(-1, 'ponc = ', ponc);
        logger.finer(-1, 'tl = ', tl);
        logger.finer(-1, 'tli = ', tli);
        logger.finer(-1, 'pot = ', pot);
        logger.finer(-1, 'perpLine = ', perpLine);
        const ints = ConicUtils.intersectLineWithConic(perpLine, conic);
        if (ints == null) {
            logger.warn(-1, 'Could not find intersection of perpendicular line with conic');
            return null;
        }
        const [p1, p2] = ints;
        const mid = Rn.linearCombination(null, .5, p1, .5, p2);
        logger.finer(-1, 'mid = ', mid);
        return Pn.dehomogenize(null, mid);
    }

    static intersectLineWithConic(line, conic) {
        const [a,b,c] = line;
        logger.fine(-1, 'line = ', line);
        let pts = [[-b,a,0], [c,0,-a], [0,-c,b]].filter(pt => Rn.innerProduct(pt, pt) > 0);
        logger.finer(-1, 'pts = ', pts);
        
        pts = pts.map(pt => Pn.normalize(null, pt, Pn.ELLIPTIC));
        const [p1, p2] = [pts[0], pts[1]];
        const A = Rn.bilinearForm(conic.Q, p1, p1);
        const B = 2 * Rn.bilinearForm(conic.Q, p1, p2);
        const C = Rn.bilinearForm(conic.Q, p2, p2);
        const d = (B * B - 4 * A * C);
        logger.finer(-1, 'A B C d p1 p2 = ', A, B, C, d, p1, p2);
        if (d < 0) return null; 
        const ints = [[Pn.normalize(null, Rn.add(null, Rn.times(null, 2*A, p2), Rn.times(null, (-B + Math.sqrt(d)), p1)), Pn.ELLIPTIC)], 
            [Pn.normalize(null, Rn.add(null, Rn.times(null, 2*A, p2), Rn.times(null, (-B - Math.sqrt(d)), p1)), Pn.ELLIPTIC)]];
        logger.fine(-1, 'ints = ', ints);
        return ints.map(pt => Pn.dehomogenize(null, pt));
    }

    static  findPointsOnConic(conic, numPoints = 100) {
        let numLines = numPoints/2;
        const centerPoint = conic.getViewport() != null ? conic.getViewport().getCenter() : this.getCenterPoint(conic);
        logger.fine(-1, 'centerPoint = ', centerPoint);
            const dirs = new Array(numLines ).fill(0).map((_, i) => {
            const angle = (2*Math.PI * i) / numLines;
            return [Math.cos(angle), Math.sin(angle), 0];
        });
        const C = Rn.bilinearForm(conic.Q, centerPoint, centerPoint);
        const data = dirs.map(V => {
            const A = Rn.bilinearForm(conic.Q, V, V);
            const B = 2 * Rn.bilinearForm(conic.Q, V, centerPoint);
            const d = (B * B - 4 * A * C);
            if (d < 0) return null;  
            // const [t1,t2] = [(-B + Math.sqrt(d)) / (2 * A), (-B - Math.sqrt(d)) / (2 * A)];
            const t1 = (-B + Math.sqrt(d)) / (2 * A); //, (-B - Math.sqrt(d)) / (2 * A)];
            return Rn.add(null, Rn.times(null, t1, V), centerPoint);
         });

        if (data.length === 0) {
            logger.warn(-1, 'Could not find point on conic');
            return null;
        }
        logger.fine(-1, 'data = ', data);
        const points = data.filter(data => data !== null);
        points.map(pt => {Pn.dehomogenize(null, pt)});
        return points; 
    }

    static findPointOnConic(conic, numLines = 20){
        let pointOnConic = null;
        const points = this.findPointsOnConic(conic, numLines*2);
        const centerPoint = conic.getViewport() != null ? conic.getViewport().getCenter() : this.getCenterPoint(conic);
        if (points.length === 0) {
            logger.warn(-1, 'Could not find point on conic');
            return centerPoint;
        }
        const best = points.reduce((best, item) => {
            const value = Pn.distanceBetween( item, centerPoint, Pn.EUCLIDEAN);
         return value < best.value ? { item, value } : best;
          }, { item: null, value: Infinity }).item;

        if (best != null) {
            pointOnConic = best;
        } else {
            logger.warn(-1, 'Could not find point on conic');
            pointOnConic = centerPoint;
        }
        logger.fine(-1, '# found points = ', points.length);
        logger.fine(-1, 'pointOnConic = ', pointOnConic);
        logger.fine(-1, 'centerPoint = ', centerPoint);
        logger.fine(-1, 'eval = ', Rn.bilinearForm(conic.Q, pointOnConic, pointOnConic));
        return ( Pn.dehomogenize(null, pointOnConic));
        
    }

   
}       





