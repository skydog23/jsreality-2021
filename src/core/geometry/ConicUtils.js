/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Utility functions for conic calculations
import { det, index, matrix, subset } from 'mathjs';
import * as P2 from '../math/P2.js';
import * as P3 from '../math/P3.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { getLogger, Level, setModuleLevel } from '../util/LoggingSystem.js';

import { ConicSection } from './ConicSection.js';

const logger = getLogger('jsreality.core.geometry.ConicUtils');
setModuleLevel(logger.getModuleName(), Level.FINE);

export class ConicUtils {
    

    /*
     Transform the conic by a projective transformation
     @param {number[][]} Q - The conic matrix
     @param {number[][]} transform - The projective transformation matrix
     @returns {number[][]} The transformed conic matrix
     */
     static transform(Q, transform) {
        return Rn.conjugateByMatrix(null, Q, transform);
    }

    // Static methods
    static svdDecomposition(matrix) {
       
    
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

    static eigenDecomposition(matrix) {
        // This method is not fully implemented in the original file,
        // but the edit hint implies it should be added.
        // For now, we'll return a placeholder.
        return { eigenValues: [], eigenVectors: [] };
    }

    // Analyze the 3x3 symmetric conic matrix
    static analyzeConicMatrix(coeffs) {
        const { a, h, b, g, f, c } = coeffs;
        
        // Build the 3x3 symmetric conic matrix
        const conicMatrix = [
            [a,     h/2,   g/2],
            [h/2,   b,     f/2],
            [g/2,   f/2,   c  ]
        ];

        logger.fine(-1, 'Conic matrix:');
        conicMatrix.forEach(row => logger.fine(-1, 'Row:', row.map(x => x.toFixed(6))));

        // Compute SVD of the conic matrix
        const svd = ConicUtils.svdDecompositionHP(conicMatrix);
        const singularValues = svd.S.sort((a, b) => Math.abs(b) - Math.abs(a)); // Sort by magnitude
        logger.fine(-1, 'Singular values:', singularValues);
        // Determine rank (count non-zero singular values)
        const tolerance = 1e-4;
        const rank = singularValues.filter(s => Math.abs(s) > tolerance).length;
        
        // Classify the conic
        let conicType = 'unknown';
        let degeneracy = 'non-degenerate';
        
        if (rank < 3) {
            degeneracy = 'degenerate';
            if (rank === 2) {
                conicType = 'two lines (or parallel lines)';
            } else if (rank === 1) {
                conicType = 'single line (double line)';
            } else {
                conicType = 'all points (trivial)';
            }
        } else {
            // Non-degenerate: classify by eigenvalues
            const positiveCount = singularValues.filter(s => s > tolerance).length;
            const negativeCount = singularValues.filter(s => s < -tolerance).length;
            const zeroCount = singularValues.filter(s => Math.abs(s) <= tolerance).length;
            
            if (zeroCount === 1) {
                conicType = 'parabola';
            } else if (positiveCount === 3 || negativeCount === 3) {
                conicType = 'ellipse (or circle)';
            } else if (positiveCount === 2 && negativeCount === 1) {
                conicType = 'hyperbola';
            } else if (positiveCount === 1 && negativeCount === 2) {
                conicType = 'hyperbola';
            }
        }

        // Calculate condition number
        const maxSingular = Math.max(...singularValues.map(Math.abs));
        const minSingular = Math.min(...singularValues.filter(s => Math.abs(s) > tolerance).map(Math.abs));
        const conditionNumber = minSingular > 0 ? maxSingular / minSingular : Infinity;

        return {
            matrix: conicMatrix,
            singularValues: singularValues,
            rank: rank,
            conicType: conicType,
            degeneracy: degeneracy,
            conditionNumber: conditionNumber,
            determinant: singularValues.reduce((prod, s) => prod * s, 1)
        };
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
        return [x*x, y*y, z*z, y*z, x*z, x*y]
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
    static solveConicFromPointsSVD(points) {
        if (points.length !== 5) {
            throw new Error('Exactly 5 points required');
        }

        logger.fine(-1, 'Using SVD method for conic fitting');

        // Build the coefficient matrix A (5x6) directly from homogeneous coordinates
        const A = [];
        for (let point of points) {
            const [x, y, w] = point;
            logger.fine(-1, `Using point [${x.toFixed(4)}:${y.toFixed(4)}:${w.toFixed(4)}]`);
            
            // Row corresponds to ax² + hxy + by² + gxw + fyw + cw² = 0
            A.push([
                x*x,  // x² term (a)
                x*y,  // xy term (h)
                y*y,  // y² term (b)
                x*w,  // xw term (g)
                y*w,  // yw term (f)
                w*w   // w² term (c)
            ]);
        }

        logger.fine(-1, 'Coefficient matrix A:', A);

        // Perform SVD decomposition
        const svd = ConicUtils.svdDecompositionHP(A);
        logger.fine(-1, 'SVD singular values:', svd.S);

        // The null space vector is the column of V corresponding to the smallest singular value
        const minIndex = svd.S.indexOf(Math.min(...svd.S));
        const nullVector = svd.V.map(row => row[minIndex]);

        logger.fine(-1, 'Null space vector from SVD:', nullVector);

        // Normalize the vector to unit length
        const norm = Math.sqrt(nullVector.reduce((sum, x) => sum + x*x, 0));
        const normalizedVector = nullVector.map(x => x / norm);

        logger.fine(-1, 'Normalized coefficients (SVD):', normalizedVector);

        // Return coefficients
        const coefficients = {
            a: normalizedVector[0],
            h: normalizedVector[1],
            b: normalizedVector[2],
            g: normalizedVector[3],
            f: normalizedVector[4],
            c: normalizedVector[5]
        };

        // Analyze the conic matrix itself
        const conicAnalysis = ConicUtils.analyzeConicMatrix(coefficients);
        logger.fine(-1, 'Conic matrix analysis:', conicAnalysis);

        return coefficients;
    }

    // Compute Sylvester's canonical form: Q = PDP^(-1)
    static sylvesterDecomposition(Q) {
        // First get eigendecomposition using Jacobi method
        const jacobi = ConicUtils.svdDecomposition(Q);
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

    static isZero(a) {
        const epsilon = 1e-7;
        return Math.abs(a) < epsilon;
    }

    static svdDecompositionHP(matrix) {
        // NOTE:
        // This method originally used `decimal.js` for high-precision Jacobi eigensolve.
        // In the browser test runner (`test/test-jsrapp-example.html`) we can’t assume
        // the dev server exposes `/node_modules/**`, which caused 404s for `decimal.mjs`.
        //
        // For interactive demos, the regular double-precision SVD is typically fine.
        // If you later want HP again, we should load Decimal via an importmap/bundler.
        return ConicUtils.svdDecomposition(matrix);
    }

    static factorPair(conic, svd) {
        
        // // try another way. Use the V matrix from the svd decomposition to find the common point of the line pair
        const V = svd.V;
        logger.fine(-1, "V = "+Rn.toStringArray(V));

        const dcp = [V[0][2], V[1][2], V[2][2]];  // last column of V
        logger.fine(-1, "carrierPoint = "+Rn.toString(dcp));
 
        // const tform = new Transform();
        // tform.translate(dcp[0], dcp[1]);
        const translation = Pn.normalize(null, [dcp[0], dcp[1], 0, dcp[2]], Pn.ELLIPTIC);

        const tform = P3.makeTranslationMatrix(null, translation, Pn.ELLIPTIC);

        const tform33 = convert44To33(tform);
        logger.fine(-1, "tform = "+tform33);
        const itform33 = P2.cofactor(tform33);
        logger.fine(-1, "itform = "+itform33);
        const tformV = P2.multiplyMatrixVector(itform33, dcp);
        logger.fine(-1, "tformV = "+tformV);


        const Q1D = conic.Q;
        logger.fine(-1, "Q = "+Rn.matrixToString(conic.Q));
        const result1D = Rn.conjugateByMatrix(null, Q1D, tform33);
        logger.fine(-1, "result1D = "+Rn.matrixToString(result1D));
        const iresult1D = Rn.conjugateByMatrix(null,Q1D, itform33);
        logger.fine(-1, "result1D = "+Rn.matrixToString(iresult1D));

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
            logger.fine(-1, "ret = "+Rn.matrixToString(tret));
            return tret;
        }


    
        let { a, h, b, g, f, c } = conic.params.coefficients;


        let swapped = false;
        let ret = [];
        // Ensure 'a' is non-zero to simplify the main factorization logic.
        // If 'a' is zero, but 'b' is not, we can swap x and y variables.
        if (ConicUtils.isZero(a) && !ConicUtils.isZero(b)) {
          [a, b] = [b, a];
          [g, f] = [f, g];
          swapped = true;
        }
  
        // The condition for a general second-degree equation to represent a pair of straight lines
        // is that the determinant of the 3x3 matrix of coefficients is zero.
        const determinant = a * b * c + 2 * f * g * h - a * f * f - b * g * g - c * h * h;
       logger.fine(-1, "ConicUtils: determinant = "+determinant);
       if (!ConicUtils.isZero(determinant)) {
          console.error("The given quadratic form does not represent a pair of straight lines (determinant != 0).");
          return null;
        }
  
        // The nature of the lines (intersecting or parallel) depends on the discriminant
        // of the quadratic part: h^2 - ab.
        let discriminant = h * h - a * b;
        // if (ConicUtils.isZero(discriminant)) discriminant = 0;
        // Case 1: Intersecting Lines (h^2 - ab > 0)
        if (discriminant > 0) {
          // The coefficients of the two linear factors can be found by solving the original
          // equation for y (or x) using the quadratic formula. The expression under the
          // square root will be a perfect square of a linear term.
          const p = Math.sqrt(discriminant);
  
          // We can extract the linear term's coefficients by matching the square root expression.
          // The expression under the root is (h^2-ab)x^2 + 2(hf-bg)x + (f^2-bc).
          // This is a perfect square, so it's equal to (p*x + q)^2 for some q.
          // We can find q by matching the cross-term: 2pqx = 2(hf-bg)x => q = (hf-bg)/p.
          const q = (h * f - b * g) / p;
  
          // The two linear factors are given by:
          // by + (hx + f) = +/- (px + q)
          const A1 = h + p;
          const B1 = b;
          const C1 = f + q;
  
          const A2 = h - p;
          const B2 = b;
          const C2 = f - q;
          
          // Return the coefficients, and swap them back if the initial variables were swapped.
          if (swapped) {
            ret = [P2.normalizeLine([B1, A1, C1]), P2.normalizeLine([B2, A2, C2])];
          } else {
            ret = [P2.normalizeLine([A1, B1, C1]), P2.normalizeLine([A2, B2, C2])];
          }
        }
        
        // Case 2: Parallel or Coincident Lines (h^2 - ab = 0)
        else if (ConicUtils.isZero(discriminant)) {
          // In this case, the quadratic part of the equation is a perfect square.
          // ax^2 + 2hxy + by^2 = (sqrt(a)x + s*sqrt(b)y)^2, where s = sign(h).
          const sa = Math.sqrt(a);
          const sb = Math.sqrt(b);
          const s = Math.sign(h);
  
          // The full polynomial can be written as (sa*x + s*sb*y + k1)(sa*x + s*sb*y + k2) = 0.
          // We compare coefficients with the original equation to find k1 and k2.
          // (k1+k2)*sa = 2g => k1+k2 = 2g/sa
          // k1*k2 = c
          const sumK = 2 * g / sa;
          const prodK = c;
  
          // Solve the quadratic equation k^2 - (k1+k2)k + k1*k2 = 0 for k.
          const kDiscriminant = sumK * sumK - 4 * prodK;
  
          if (kDiscriminant < 0) {
            console.error("The quadratic form represents two imaginary parallel lines.");
            return null;
          }
          
          const k1 = (sumK + Math.sqrt(kDiscriminant)) / 2;
          const k2 = (sumK - Math.sqrt(kDiscriminant)) / 2;
  
          const A1 = sa;
          const B1 = s * sb;
          const C1 = k1;
  
          const A2 = sa;
          const B2 = s * sb;
          const C2 = k2;
          
          // Return the coefficients, and swap them back if the initial variables were swapped.
          if (swapped) {
            ret = [P2.normalizeLine([B1, A1, C1]), P2.normalizeLine([B2, A2, C2])];
          } else {
            ret = [P2.normalizeLine([A1, B1, C1]), P2.normalizeLine([A2, B2, C2])];
          }
        }
    
  
        // Case 3: No real factors (h^2 - ab < 0)
       if (ret.length === 0) {
          console.error("The quadratic form represents an ellipse or circle, not two lines.");
          return null;
        } else {
            return ret;
        }
    }

    /**
     * Java-style static entry point for constructing a conic.
     * This forwards to the module-level `createConic()` function below.
     *
     * @param {number} whichMode
     * @returns {ConicSection}
     */
    static createConic(whichMode) {
        return createConic(whichMode);
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

export function createConic(whichMode) {
    const conic = new ConicSection();
    logger.fine(-1, 'Creating initial conic');


    let fivePoints = [];
    if (whichMode == 0) {
        fivePoints = [];
        for (let i = 0; i < 5; i++) {
            const angle = (2 * Math.PI * i) / 5;
            const x = Math.cos(angle);
            const y = Math.sin(angle);
            fivePoints.push([x, y, 1]);
        }
        logger.fine(-1, 'Using normal conic mode - 5 points on unit circle');
    } else  {
        fivePoints = [
            [Math.random()*2-1, Math.random()*2-1,  1],
            [Math.random()*2-1, Math.random()*2-1, 1],
            [Math.random()*2-1, Math.random()*2-1,  1],
            [Math.random()*2-1, Math.random()*2-1, 1],
            [Math.random()*2-1, Math.random()*2-1, 1]
            // [0,0, 1]
        ];
        logger.fine(-1, 'Using four random points and origin');
        //fivePoints[4] = Rn.add(null, Rn.times(null, .4, fivePoints[0]), Rn.times(null, .6, fivePoints[1]));
    }

    updateConicFromPoints(conic, fivePoints);
    logger.fine(-1, 'Initial 5 points created:', fivePoints);
    logger.fine(-1, 'Initial conic created:', conic);
    return conic;
}

export function updateConicFromPoints(conic, fivePoints, solverMethod='svd') {
    let coefficients = null;
    if (solverMethod === 'svd') {
        coefficients = ConicUtils.solveConicFromPointsSVD(fivePoints);
    } else {
        coefficients = ConicUtils.solveConicFromPoints(fivePoints);
    }
        logger.fine(-1, 'Computed coefficients (SVD):', coefficients);
        // Reuse existing instance instead of creating new one
        if (!conic) {
           conic = new ConicSection(coefficients);
        } else {
            conic.setCoefficients(coefficients);
        }
        conic.update();
        return conic;
    }

