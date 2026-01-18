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
import Decimal from '../../vendor/decimal/decimal.mjs';
import * as P2 from '../math/P2.js';
import * as P3 from '../math/P3.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { getLogger, Level, setModuleLevel } from '../util/LoggingSystem.js';

import { ConicSection } from './ConicSection.js';

const logger = getLogger('jsreality.core.geometry.ConicUtils');
setModuleLevel(logger.getModuleName(), Level.INFO);

// Configure Decimal for high precision (used in svdDecompositionHP).
Decimal.set({ precision: 40 });

function toDecimal(x) {
    return new Decimal(x);
}

function fromDecimal(d) {
    return d.toNumber();
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
    /*
     Transform the conic by a projective transformation
     @param {number[][]} Q - The conic matrix
     @param {number[][]} transform - The projective transformation matrix
     @returns {number[][]} The transformed conic matrix
     */
     static transform(Q, transform) {
        return Rn.conjugateByMatrix(null, Q, transform);
    }

    
    // Matrix multiplication for 3x3 matrices
    static matrixMultiply(A, B) {
        const result = Array(3).fill().map(() => Array(3).fill(0));
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return result;
    }

    // Check if two matrices are approximately equal
    static matrixEqual(A, B, tolerance = 1e-10) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (Math.abs(A[i][j] - B[i][j]) > tolerance) {
                    return false;
                }
            }
        }
        return true;
    }

    static getVeroneseEmbedding([x,y,z]) {
        return [x*x,  x*y, y*y, x*z, y*z,  z*z]
    }

    static svdDecomposition(matrix, type = 'std') {
        if (type === 'std') {
            return this.svdDecompositionStd(matrix);
        } else if (type === 'hp') {
            return this.svdDecompositionHP(matrix);
        } else {
            throw new Error('Invalid SVD type');
        }
    }

    static getConicThroughFivePoints(points, conic = null, useSVD = true) {
        if (conic == null) {
            conic = new ConicSection();
        }
        conic.fivePoints = points;
        let coeffs = null;
        if (useSVD) {
            this.solveConicFromPointsSVD(points, conic);
        } else {
            this.solveConicFromPoints(points, conic);
        }
        logger.fine(-1, 'coeffs = ', coeffs);
        return conic;
    }

    static solveConicFromPoints(points, conic = null) {
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
    static solveConicFromPointsSVD(points, conic = null, tolerance = 1e-6) {
        if (points.length !== 5) {
            throw new Error('Exactly 5 points required');
        }

        logger.fine(-1, 'Using SVD method for conic fitting');

        // Build the coefficient matrix A (5x6) directly from homogeneous coordinates
        const A = points.map(pt=>this.getVeroneseEmbedding(pt));
    
        logger.fine(-1, 'Coefficient matrix A:', A);

        // Perform SVD decomposition
        const svdPoints = ConicUtils.svdDecomposition(A);
        const dnsp = svdPoints.S.filter(s => s <= tolerance);
        logger.fine(-1, 'dimn of null space = ', dnsp.length);
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
        const svdQ = ConicUtils.svdDecomposition(this.convertArrayToQ2D(...coefficients));
        const singularValues = svdQ.S.sort((a, b) => Math.abs(b) - Math.abs(a)); // Sort by magnitude
        logger.fine(-1, 'Q singular values:', svdQ.S);
        logger.fine(-1, 'Q singular values sorted:', singularValues);
        // Determine rank (count non-zero singular values)
        const rank = singularValues.filter(s => Math.abs(s) > tolerance).length;

        // classify the conic depending on the null space dimension and the rank of Q
        if (dnsp.length === 1) {    // either a regular conic or a line pair, or a double line
            if (rank === 3 || rank === 2) {
                conic.rank = rank;
                conic.type = this.conicTypes[rank];
            }  else throw new Error('Invalid rank for conic with one null space vector');
        } else if (dnsp.length === 2) {  // 4 collinear points: not unique, but a line pair
            conic.rank = 2;
            conic.type = this.conicTypes[2];
        } else if (dnsp.length === 3) {  // 5 points: a unique double line, but has to be found
            conic.rank = 1;
            conic.type = this.conicTypes[1];
        } 
        conic.svdConic = svdQ;
        conic.svd5Points = svdPoints;
        conic.fivePoints = points;
        conic.setCoefficients(coefficients);
       if (conic.rank === 1) {
            conic.doubleLine = this.factorDoubleLine(conic);
        } else if (conic.rank === 2) {
            conic.linePair = this.factorPair(conic);
        }
         conic.update();
    }


    static factorDoubleLine(conic) {
        // the strategy here:
        // rank-1 means that the conic is a double line.
        // we use the fact the that the "polar line" of any point (not on the double line)
        // is this double line

        logger.fine(-1, "factorDoubleLine: Q = ",conic.Q);

        
        const lines = this.factorPair(conic);
        logger.fine(-1, "lines = ", lines);
        const l0inc = conic.fivePoints.map(pt => Rn.innerProduct(pt, lines[0]));
        const l1inc = conic.fivePoints.map(pt => Rn.innerProduct(pt, lines[1]));
        const sumAbs0 = l0inc.reduce((sum, x) => sum + Math.abs(x), 0);
        const sumAbs1 = l1inc.reduce((sum, x) => sum + Math.abs(x), 0);
        logger.fine(-1, "sumAbs0 = ",sumAbs0);
        logger.fine(-1, "sumAbs1 = ",sumAbs1);
        return sumAbs0 < sumAbs1 ? lines[0] : lines[1];
    }
    static factorPair(conic) {
        const svdQ = conic.svdConic;

        // // try another way. Use the V matrix from the svd decomposition to find the common point of the line pair
        const V = svdQ.V;
        logger.fine(-1, "V = ", V);

        const dcp = [V[0][2], V[1][2], V[2][2]];  // last column of V
        logger.fine(-1, "carrierPoint = ",dcp);
 
        // const tform = new Transform();
        // tform.translate(dcp[0], dcp[1]);
        const translation = Pn.normalize(null, [dcp[0], dcp[1], 0, dcp[2]], Pn.ELLIPTIC);

        const tform = P3.makeTranslationMatrix(null, translation, Pn.ELLIPTIC);

        const tform33 = convert44To33(tform);
        logger.fine(-1, "tform = "+tform33);
        const itform33 = P2.cofactor(tform33);
        logger.fine(-1, "itform = "+itform33);
        const tformV = Rn.matrixTimesVector(null, itform33, dcp);
        logger.fine(-1, "tformV = "+tformV);


        const Q1D = conic.Q;
        logger.fine(-1, "Q = ",conic.Q);
        const result1D = Rn.conjugateByMatrix(null, Q1D, tform33);
        logger.fine(-1, "result1D = ",result1D);
        const iresult1D = Rn.conjugateByMatrix(null,Q1D, itform33);
        logger.fine(-1, "result1D = ",iresult1D);

        // search for the line pair in the transformed conic
        // the only non-zero entries of iresult1D are the upper left 2x2 submatrix
         // so we can use the upper left 2x2 submatrix to find the line pair
        // and the last column of V is the carrier point
        const vals = [iresult1D[0], -2*iresult1D[1], iresult1D[4]];
        if (vals[0] !=0) Rn.times(null, 1.0/vals[0], vals);
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
            logger.fine(-1, "tret = ", tret);
            return tret;
        }


        
    }

     // Compute Sylvester's canonical form: Q = PDP^(-1)
     static sylvesterDecomposition(Q) {
        // First get eigendecomposition using Jacobi method
        const jacobi = ConicUtils.svdDecompositionStd(Q);
        const eigenVectors = jacobi.V;
        const eigenValues = jacobi.S.map(s => s * Math.sign(s)); // Get signed values
        
        // Create D matrix with normalized entries (1, -1, or 0)
        const D = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ];
        
        const tolerance = 1e-10;
        for (let i = 0; i < 3; i++) {
            if (Math.abs(eigenValues[i]) > tolerance) {
                D[i][i] = Math.sign(eigenValues[i]);
            }
        }
        
        // P is the matrix of eigenvectors
        const P = eigenVectors;
        
        // Compute P^(-1)
        const Pinv = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ];
        
        // Simple 3x3 matrix inverse
        const det = P[0][0] * (P[1][1] * P[2][2] - P[1][2] * P[2][1])
                 - P[0][1] * (P[1][0] * P[2][2] - P[1][2] * P[2][0])
                 + P[0][2] * (P[1][0] * P[2][1] - P[1][1] * P[2][0]);
        
        const invDet = 1.0 / det;
        
        Pinv[0][0] = (P[1][1] * P[2][2] - P[1][2] * P[2][1]) * invDet;
        Pinv[0][1] = (P[0][2] * P[2][1] - P[0][1] * P[2][2]) * invDet;
        Pinv[0][2] = (P[0][1] * P[1][2] - P[0][2] * P[1][1]) * invDet;
        Pinv[1][0] = (P[1][2] * P[2][0] - P[1][0] * P[2][2]) * invDet;
        Pinv[1][1] = (P[0][0] * P[2][2] - P[0][2] * P[2][0]) * invDet;
        Pinv[1][2] = (P[0][2] * P[1][0] - P[0][0] * P[1][2]) * invDet;
        Pinv[2][0] = (P[1][0] * P[2][1] - P[1][1] * P[2][0]) * invDet;
        Pinv[2][1] = (P[0][1] * P[2][0] - P[0][0] * P[2][1]) * invDet;
        Pinv[2][2] = (P[0][0] * P[1][1] - P[0][1] * P[1][0]) * invDet;
        
        // Verify decomposition
        const PD = ConicUtils.matrixMultiply(P, D);
        const reconstructedQ = ConicUtils.matrixMultiply(PD, Pinv);
        
        // Convert input Q to 2D array for comparison
        const Q2D = [
            [Q[0], Q[1], Q[2]],
            [Q[3], Q[4], Q[5]],
            [Q[6], Q[7], Q[8]]
        ];
        
        const isCorrect = ConicUtils.matrixEqual(reconstructedQ, Q2D);
        logger.fine(-1, 'Sylvester decomposition verification:', {
            original: Q2D,
            reconstructed: reconstructedQ,
            isCorrect: isCorrect
        });
        
        if (!isCorrect) {
            logger.warn(-1, 'Sylvester decomposition verification failed!');
            logger.fine(-1, 'Original Q:', Q2D);
            logger.fine(-1, 'Reconstructed Q:', reconstructedQ);
            logger.fine(-1, 'P:', P);
            logger.fine(-1, 'D:', D);
            logger.fine(-1, 'Pinv:', Pinv);
        }
        
        return {
            P: P,
            D: D,
            Pinv: Pinv,
            signature: {
                positive: D.filter((row, i) => row[i] === 1).length,
                negative: D.filter((row, i) => row[i] === -1).length,
                zero: D.filter((row, i) => row[i] === 0).length
            },
            isCorrect: isCorrect
        };
    }

    // Solve linear system using Gaussian elimination
    static solveLinearSystem(matrix) {
        const n = matrix.length;
        const augmented = matrix.map(row => [...row]);
        
        // Forward elimination
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            
            // Swap rows
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
            
            // Eliminate column
            for (let k = i + 1; k < n; k++) {
                const factor = augmented[k][i] / augmented[i][i];
                for (let j = i; j < n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }
        
        // Back substitution
        const solution = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < n; j++) {
                sum += augmented[i][j] * solution[j];
            }
            solution[i] = (augmented[i][n] - sum) / augmented[i][i];
        }
        
        return solution;
    }

        // Static methods
        static svdDecompositionStd(matrix) {
       
            const m = matrix.length;      // number of rows
            const n = matrix[0].length;   // number of columns
            
            // Create copies to avoid modifying original
            const U = matrix.map(row => [...row]);
            const V = Array(n).fill().map(() => Array(n).fill(0));
            const S = Array(Math.min(m, n)).fill(0);
            
            // Initialize V as identity matrix
            for (let i = 0; i < n; i++) {
                V[i][i] = 1;
            }
            
            // Perform bidiagonalization using Householder reflections
            const householderBidiag = (U, V, S) => {
                const eps = 1e-15;
                const maxIter = 50;
                
                // For small matrices, we'll use Jacobi SVD approach
                // This is more straightforward for the 5x6 matrices we're dealing with
                
                // First, form A^T * A
                const ATA = Array(n).fill().map(() => Array(n).fill(0));
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        for (let k = 0; k < m; k++) {
                            ATA[i][j] += U[k][i] * U[k][j];
                        }
                    }
                }
                
                // Find eigenvalues and eigenvectors of A^T * A using Jacobi method
                const jacobi = (matrix) => {
                    const size = matrix.length;
                    const eigenVecs = Array(size).fill().map(() => Array(size).fill(0));
                    const eigenVals = Array(size).fill(0);
                    
                    // Initialize eigenvector matrix as identity
                    for (let i = 0; i < size; i++) {
                        eigenVecs[i][i] = 1;
                    }
                    
                    // Copy matrix
                    const A = matrix.map(row => [...row]);
                    
                    for (let iter = 0; iter < maxIter; iter++) {
                        // Find largest off-diagonal element
                        let maxVal = 0;
                        let p = 0, q = 1;
                        
                        for (let i = 0; i < size; i++) {
                            for (let j = i + 1; j < size; j++) {
                                if (Math.abs(A[i][j]) > maxVal) {
                                    maxVal = Math.abs(A[i][j]);
                                    p = i;
                                    q = j;
                                }
                            }
                        }
                        
                        if (maxVal < eps) break;
                        
                        // Calculate rotation angle
                        const theta = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]);
                        const c = Math.cos(theta);
                        const s = Math.sin(theta);
                        
                        // Apply Jacobi rotation
                        const App = A[p][p];
                        const Aqq = A[q][q];
                        const Apq = A[p][q];
                        
                        A[p][p] = c * c * App + s * s * Aqq - 2 * s * c * Apq;
                        A[q][q] = s * s * App + c * c * Aqq + 2 * s * c * Apq;
                        A[p][q] = A[q][p] = 0;
                        
                        // Update other elements
                        for (let i = 0; i < size; i++) {
                            if (i !== p && i !== q) {
                                const Aip = A[i][p];
                                const Aiq = A[i][q];
                                A[i][p] = A[p][i] = c * Aip - s * Aiq;
                                A[i][q] = A[q][i] = s * Aip + c * Aiq;
                            }
                        }
                        
                        // Update eigenvectors
                        for (let i = 0; i < size; i++) {
                            const Vip = eigenVecs[i][p];
                            const Viq = eigenVecs[i][q];
                            eigenVecs[i][p] = c * Vip - s * Viq;
                            eigenVecs[i][q] = s * Vip + c * Viq;
                        }
                    }
                    
                    // Extract eigenvalues and sort
                    for (let i = 0; i < size; i++) {
                        eigenVals[i] = A[i][i];
                    }
                    
                    // Sort eigenvalues and eigenvectors in descending order
                    const indices = Array.from({length: size}, (_, i) => i);
                    indices.sort((a, b) => Math.abs(eigenVals[b]) - Math.abs(eigenVals[a]));
                    
                    const sortedVals = indices.map(i => eigenVals[i]);
                    const sortedVecs = indices.map(i => eigenVecs.map(row => row[i]));
                    
                    return { eigenValues: sortedVals, eigenVectors: sortedVecs };
                };
                
                const result = jacobi(ATA);
                
                // The singular values are square roots of eigenvalues of A^T * A
                for (let i = 0; i < result.eigenValues.length; i++) {
                    S[i] = Math.sqrt(Math.max(0, result.eigenValues[i]));
                }
                
                // V matrix columns are the eigenvectors of A^T * A
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        V[j][i] = result.eigenVectors[i][j];
                    }
                }
                
                // Compute U = A * V * S^(-1) for non-zero singular values
                const UResult = Array(m).fill().map(() => Array(Math.min(m, n)).fill(0));
                for (let i = 0; i < m; i++) {
                    for (let j = 0; j < Math.min(m, n); j++) {
                        if (S[j] > eps) {
                            for (let k = 0; k < n; k++) {
                                UResult[i][j] += U[i][k] * V[k][j] / S[j];
                            }
                        }
                    }
                }
                
                // Copy back to U
                for (let i = 0; i < m; i++) {
                    for (let j = 0; j < Math.min(m, n); j++) {
                        U[i][j] = UResult[i][j];
                    }
                }
            };
            
            householderBidiag(U, V, S);
            
            return { U, S, V };
        }
    
        static svdDecompositionHP(matrix) {
            const m = matrix.length;      // number of rows
            const n = matrix[0].length;   // number of columns
    
            // Create copies to avoid modifying original
            const U = matrix.map(row => row.map(x => toDecimal(x)));
            const V = Array(n).fill().map(() => Array(n).fill(toDecimal(0)));
            const S = Array(Math.min(m, n)).fill(toDecimal(0));
    
            // Initialize V as identity matrix
            for (let i = 0; i < n; i++) {
                V[i][i] = toDecimal(1);
            }
    
            const householderBidiag = (U, V, S) => {
                const eps = toDecimal('1e-40');  // High precision threshold
                const maxIter = 50;
    
                // Form A^T * A with high precision
                const ATA = Array(n).fill().map(() => Array(n).fill(toDecimal(0)));
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        for (let k = 0; k < m; k++) {
                            ATA[i][j] = ATA[i][j].plus(U[k][i].times(U[k][j]));
                        }
                    }
                }
    
                const jacobi = (matrix) => {
                    const size = matrix.length;
                    const eigenVecs = Array(size).fill().map(() => Array(size).fill(toDecimal(0)));
                    const eigenVals = Array(size).fill(toDecimal(0));
    
                    // Initialize eigenvector matrix as identity
                    for (let i = 0; i < size; i++) {
                        eigenVecs[i][i] = toDecimal(1);
                    }
    
                    // Copy matrix
                    const A = matrix.map(row => [...row]);
    
                    for (let iter = 0; iter < maxIter; iter++) {
                        // Find largest off-diagonal element
                        let maxVal = toDecimal(0);
                        let p = 0, q = 1;
    
                        for (let i = 0; i < size; i++) {
                            for (let j = i + 1; j < size; j++) {
                                const absVal = A[i][j].abs();
                                if (absVal.gt(maxVal)) {
                                    maxVal = absVal;
                                    p = i;
                                    q = j;
                                }
                            }
                        }
    
                        if (maxVal.lt(eps)) break;
    
                        // Calculate rotation angle with high precision
                        const theta = Decimal.atan2(
                            toDecimal(2).times(A[p][q]),
                            A[q][q].minus(A[p][p])
                        ).dividedBy(2);
    
                        const c = Decimal.cos(theta);
                        const s = Decimal.sin(theta);
    
                        // Apply Jacobi rotation with high precision
                        const App = A[p][p];
                        const Aqq = A[q][q];
                        const Apq = A[p][q];
    
                        A[p][p] = c.times(c).times(App)
                                 .plus(s.times(s).times(Aqq))
                                 .minus(toDecimal(2).times(s).times(c).times(Apq));
    
                        A[q][q] = s.times(s).times(App)
                                 .plus(c.times(c).times(Aqq))
                                 .plus(toDecimal(2).times(s).times(c).times(Apq));
    
                        A[p][q] = A[q][p] = toDecimal(0);
    
                        // Update other elements
                        for (let i = 0; i < size; i++) {
                            if (i !== p && i !== q) {
                                const Aip = A[i][p];
                                const Aiq = A[i][q];
                                A[i][p] = A[p][i] = c.times(Aip).minus(s.times(Aiq));
                                A[i][q] = A[q][i] = s.times(Aip).plus(c.times(Aiq));
                            }
                        }
    
                        // Update eigenvectors
                        for (let i = 0; i < size; i++) {
                            const Vip = eigenVecs[i][p];
                            const Viq = eigenVecs[i][q];
                            eigenVecs[i][p] = c.times(Vip).minus(s.times(Viq));
                            eigenVecs[i][q] = s.times(Vip).plus(c.times(Viq));
                        }
                    }
    
                    // Extract eigenvalues
                    for (let i = 0; i < size; i++) {
                        eigenVals[i] = A[i][i];
                    }
    
                    // Sort eigenvalues and eigenvectors in descending order
                    const indices = Array.from({length: size}, (_, i) => i);
                    indices.sort((a, b) => eigenVals[b].abs().minus(eigenVals[a].abs()).toNumber());
    
                    const sortedVals = indices.map(i => eigenVals[i]);
                    const sortedVecs = indices.map(i => eigenVecs.map(row => row[i]));
    
                    return { eigenValues: sortedVals, eigenVectors: sortedVecs };
                };
    
                const result = jacobi(ATA);
    
                // Calculate singular values with high precision
                for (let i = 0; i < result.eigenValues.length; i++) {
                    S[i] = Decimal.sqrt(Decimal.max(0, result.eigenValues[i]));
                }
    
                // Copy eigenvectors to V
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        V[j][i] = result.eigenVectors[i][j];
                    }
                }
    
                // Compute U = A * V * S^(-1) for non-zero singular values
                const UResult = Array(m).fill().map(() => Array(Math.min(m, n)).fill(toDecimal(0)));
                for (let i = 0; i < m; i++) {
                    for (let j = 0; j < Math.min(m, n); j++) {
                        if (S[j].gt(eps)) {
                            for (let k = 0; k < n; k++) {
                                UResult[i][j] = UResult[i][j].plus(
                                    U[i][k].times(V[k][j]).dividedBy(S[j])
                                );
                            }
                        }
                    }
                }
    
                // Copy back to U
                for (let i = 0; i < m; i++) {
                    for (let j = 0; j < Math.min(m, n); j++) {
                        U[i][j] = UResult[i][j];
                    }
                }
            };
    
            householderBidiag(U, V, S);
    
            // Convert back to numbers before returning
            return {
                U: U.map(row => row.map(x => fromDecimal(x))),
                S: S.map(x => fromDecimal(x)),
                V: V.map(row => row.map(x => fromDecimal(x)))
            };
        }
    
}       

export function convert44To33(m) {
    const m33 = new Array(9);
    m33[0] = m[0];
    m33[1] = m[1];
    m33[2] = m[3];
    m33[3] = m[4];
    m33[4] = m[5];
    m33[5] = m[7];
    m33[6] = m[12];
    m33[7] = m[13];
    m33[8] = m[15];
    return m33;
}



