import { Decimal } from '../../vendor/decimal/decimal.mjs';
import { getLogger, Level, setModuleLevel } from '../util/LoggingSystem.js';
import * as P2 from './P2.js';
import * as Rn from './Rn.js';
const logger = getLogger('jsreality.core.math.SVDUtil');
setModuleLevel(logger.getModuleName(), Level.INFO);



// Configure Decimal for high precision (used in svdDecompositionHP).
Decimal.set({ precision: 40 });
    
function toDecimal(x) {
    return new Decimal(x);
}

function fromDecimal(d) {
    return d.toNumber();
}

export class SVDUtil {

    

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


static svdDecomposition(matrix, type = 'std') {
    if (type === 'std') {
        return this.svdDecompositionStd(matrix);
    } else if (type === 'hp') {
        return this.svdDecompositionHP(matrix);
    } else {
        throw new Error('Invalid SVD type');
    }
}

// /**
//  * Shortened Sylvester Transformation using a standard LA library
//  */
// static getSortedSylvesterTransform(Q) {
//     // 1. Eigen-decomposition: Q = V * diag(eigenvals) * V^T
//     const { values, vectors } = SVDUtil.eigenDecomposition3x3(Q); 

//     // 2. Pair eigenvalues with their column vectors for sorting
//     let pairs = values.map((val, i) => ({
//         val: val,
//         vec: vectors[i]
//     }));

//     // 3. Sort pairs: Positive (2) > Negative (1) > Zero (0)
//     const score = (v) => Math.abs(v) < 1e-12 ? 0 : (v > 0 ? 2 : 1);
//     pairs.sort((a, b) => score(b.val) - score(a.val));

//     // 4. Create the T matrix (columns are scaled eigenvectors)
//     let T_cols = pairs.map(p => {
//         const scale = Math.abs(p.val) > 1e-12 ? 1 / Math.sqrt(Math.abs(p.val)) : 1;
//         return Rn.times(null, scale, p.vec);
//     });

//     // 5. Package into a 3x3 matrix T
//     return Rn.transpose(null, T_cols.flat());
// }
// /**
//  * Computes eigenvalues and eigenvectors for a symmetric 3x3 matrix Q.
//  * Uses the analytical trigonometric method for the cubic characteristic equation.
//  */
// static eigenDecomposition3x3(Q) {
//     const a = Q[0][0], d = Q[0][1], f = Q[0][2];
//     const b = Q[1][1], e = Q[1][2];
//     const c = Q[2][2];

//     // 1. Compute coefficients of the characteristic polynomial
//     const m = (a + b + c) / 3;
//     const K = [
//         [a - m, d, f],
//         [d, b - m, e],
//         [f, e, c - m]
//     ];
    
//     // Q is the sum of squares of off-diagonals and variances
//     const q = (Math.pow(K[0][0], 2) + Math.pow(K[1][1], 2) + Math.pow(K[2][2], 2) + 
//                2 * (Math.pow(d, 2) + Math.pow(f, 2) + Math.pow(e, 2))) / 6;
    
//     const detK = K[0][0] * (K[1][1] * K[2][2] - e * e) - 
//                  K[0][1] * (K[0][1] * K[2][2] - e * f) + 
//                  K[0][2] * (K[0][1] * e - K[1][1] * f);
                 
//     const r = detK / 2;

//     // 2. Find Eigenvalues using the trigonometric method
//     let eigenvalues = [];
//     if (q === 0) {
//         eigenvalues = [m, m, m];
//     } else {
//         const phi = Math.acos(Math.max(-1, Math.min(1, r / Math.pow(q, 1.5)))) / 3;
//         const sqrtQ = Math.sqrt(q);
        
//         eigenvalues[0] = m + 2 * sqrtQ * Math.cos(phi);
//         eigenvalues[1] = m + 2 * sqrtQ * Math.cos(phi + (2 * Math.PI / 3));
//         eigenvalues[2] = m + 2 * sqrtQ * Math.cos(phi + (4 * Math.PI / 3));
//     }

//     logger.info(-1, 'eigenvalues = ', eigenvalues);
//     // 3. Find Eigenvectors using Cross Products (Inverse Iteration or Nullspace)
//     // For each lambda, we solve (Q - lambda*I)v = 0
//     const vectors = eigenvalues.map(lambda => {
//         const M = [
//             [a - lambda, d, f],
//             [d, b - lambda, e],
//             [f, e, c - lambda]
//         ];
        
//         // Use cross products of rows to find the null space
//         const r1 = M[0], r2 = M[1], r3 = M[2];
//         let v = P2.crossProduct(r1, r2);
//         if (Rn.euclideanNorm(v) < 1e-8) v = P2.crossProduct(r1, r3);
//         if (Rn.euclideanNorm(v) < 1e-8) v = P2.crossProduct(r2, r3);
//         if (Rn.euclideanNorm(v) < 1e-8) v = [1, 0, 0]; // Degenerate case (multiplicity)

//         return Rn.normalize(null,v);
//     });

//     return { values: eigenvalues, vectors: vectors };
// }

//  // Compute Sylvester's canonical form: Q = PDP^(-1)
//  static sylvesterDecomposition(Q) {
//     // First get eigendecomposition using Jacobi method
//     const jacobi = SVDUtil.svdDecompositionStd(Q);
//     const eigenVectors = jacobi.V;
//     const eigenValues = jacobi.S.map(s => s * Math.sign(s)); // Get signed values
    
//     // Create D matrix with normalized entries (1, -1, or 0)
//     const D = [
//         [0, 0, 0],
//         [0, 0, 0],
//         [0, 0, 0]
//     ];
    
//     const tolerance = 1e-10;
//     for (let i = 0; i < 3; i++) {
//         if (Math.abs(eigenValues[i]) > tolerance) {
//             D[i][i] = Math.sign(eigenValues[i]);
//         }
//     }
    
//     // P is the matrix of eigenvectors
//     const P = eigenVectors;
    
//     // Compute P^(-1)
//     const Pinv = [
//         [0, 0, 0],
//         [0, 0, 0],
//         [0, 0, 0]
//     ];
    
//     // Simple 3x3 matrix inverse
//     const det = P[0][0] * (P[1][1] * P[2][2] - P[1][2] * P[2][1])
//              - P[0][1] * (P[1][0] * P[2][2] - P[1][2] * P[2][0])
//              + P[0][2] * (P[1][0] * P[2][1] - P[1][1] * P[2][0]);
    
//     const invDet = 1.0 / det;
    
//     Pinv[0][0] = (P[1][1] * P[2][2] - P[1][2] * P[2][1]) * invDet;
//     Pinv[0][1] = (P[0][2] * P[2][1] - P[0][1] * P[2][2]) * invDet;
//     Pinv[0][2] = (P[0][1] * P[1][2] - P[0][2] * P[1][1]) * invDet;
//     Pinv[1][0] = (P[1][2] * P[2][0] - P[1][0] * P[2][2]) * invDet;
//     Pinv[1][1] = (P[0][0] * P[2][2] - P[0][2] * P[2][0]) * invDet;
//     Pinv[1][2] = (P[0][2] * P[1][0] - P[0][0] * P[1][2]) * invDet;
//     Pinv[2][0] = (P[1][0] * P[2][1] - P[1][1] * P[2][0]) * invDet;
//     Pinv[2][1] = (P[0][1] * P[2][0] - P[0][0] * P[2][1]) * invDet;
//     Pinv[2][2] = (P[0][0] * P[1][1] - P[0][1] * P[1][0]) * invDet;
    
//     // Verify decomposition
//     const PD = SVDUtil.matrixMultiply(P, D);
//     const reconstructedQ = SVDUtil.matrixMultiply(PD, Pinv);
    
//     // Convert input Q to 2D array for comparison
//     const Q2D = [
//         [Q[0], Q[1], Q[2]],
//         [Q[3], Q[4], Q[5]],
//         [Q[6], Q[7], Q[8]]
//     ];
    
//     const isCorrect = SVDUtil.matrixEqual(reconstructedQ, Q2D);
//     logger.fine(-1, 'Sylvester decomposition verification:', {
//         original: Q2D,
//         reconstructed: reconstructedQ,
//         isCorrect: isCorrect
//     });
    
//     if (!isCorrect) {
//         logger.warn(-1, 'Sylvester decomposition verification failed!');
//         logger.fine(-1, 'Original Q:', Q2D);
//         logger.fine(-1, 'Reconstructed Q:', reconstructedQ);
//         logger.fine(-1, 'P:', P);
//         logger.fine(-1, 'D:', D);
//         logger.fine(-1, 'Pinv:', Pinv);
//     }
    
//     return {
//         P: P,
//         D: D,
//         Pinv: Pinv,
//         signature: {
//             positive: D.filter((row, i) => row[i] === 1).length,
//             negative: D.filter((row, i) => row[i] === -1).length,
//             zero: D.filter((row, i) => row[i] === 0).length
//         },
//         isCorrect: isCorrect
//     };
// }

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