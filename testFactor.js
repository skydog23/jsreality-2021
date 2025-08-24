import * as Rn from './Rn.js';
import { debugLog } from './debugLog.js';

const TOLERANCE = 1e-8;  // Match Rn's tolerance

/**
 * A small helper function for robust floating-point comparison.
 * @param {number} a
 * @returns {boolean}
 */
function isZero(a) {
    return Math.abs(a) < TOLERANCE;
}

/**
 * Factors a quadratic form P(x,y) = ax^2 + 2hxy + by^2 + 2gx + 2fy + c into two linear factors.
 * The function returns the coefficients of the two linear factors ((A, B, C) and (A', B', C')).
 *
 * @param {object} coeffs An object containing the coefficients {a, h, b, g, f, c}.
 * @returns {Array<[number, number, number]> | null} An array containing two arrays of coefficients,
 * or null if the quadratic form does not represent two real straight lines.
 */
export function factor(coeffs) {
    let { a, h, b, g, f, c } = coeffs;
    let swapped = false;

    // Ensure 'a' is non-zero to simplify the main factorization logic.
    // If 'a' is zero, but 'b' is not, we can swap x and y variables.
    if (isZero(a) && !isZero(b)) {
        [a, b] = [b, a];
        [g, f] = [f, g];
        swapped = true;
    }

    // The condition for a general second-degree equation to represent a pair of straight lines
    // is that the determinant of the 3x3 matrix of coefficients is zero.
    const determinant = a * b * c + 2 * f * g * h - a * f * f - b * g * g - c * h * h;
    if (!isZero(determinant)) {
        throw new Error("The given quadratic form does not represent a pair of straight lines (determinant != 0).");
    }

    // The nature of the lines (intersecting or parallel) depends on the discriminant
    // of the quadratic part: h^2 - ab.
    const discriminant = h * h - a * b;

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
        return [[B1, A1, C1], [B2, A2, C2]];
      } else {
        return [[A1, B1, C1], [A2, B2, C2]];
      }
    }
    
    // Case 2: Parallel or Coincident Lines (h^2 - ab = 0)
    else if (isZero(discriminant)) {
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
        throw new Error("The quadratic form represents two imaginary parallel lines.");
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
        return [[B1, A1, C1], [B2, A2, C2]];
      } else {
        return [[A1, B1, C1], [A2, B2, C2]];
      }
    }
  
    // Case 3: No real factors (h^2 - ab < 0)
    else {
      throw new Error("The quadratic form represents an ellipse or circle, not two lines.");
    }
  }
  
  // --- Example Usage ---
  
  // // Example 1: Intersecting lines (x^2 - y^2 = 0 => y=x and y=-x)
  // const intersectingCoeffs = { a: 1, h: 0, b: -1, g: 0, f: 0, c: 0 };
  // console.log("Intersecting Lines Example:");
  // const intersectingFactors = factor(intersectingCoeffs);
  // if (intersectingFactors) {
  //   console.log("Factors (A, B, C) and (A', B', C'):", intersectingFactors);
  //   // Expected output is something equivalent to [[1, -1, 0], [1, 1, 0]]
  // }
  
  // // Example 2: Parallel lines (x^2 + 2x + 1 = 0 => (x+1)^2 = 0)
  // const parallelCoeffs = { a: 1, h: 0, b: 0, g: 1, f: 0, c: 1 };
  // console.log("\nParallel/Coincident Lines Example:");
  // const parallelFactors = factor(parallelCoeffs);
  // if (parallelFactors) {
  //   console.log("Factors (A, B, C) and (A', B', C'):", parallelFactors);
  //   // Expected output is something equivalent to [[1, 0, 1], [1, 0, 1]]
  // }
  
  // // Example 3: A non-factorable quadratic (a circle)
  // const circleCoeffs = { a: 1, h: 0, b: 1, g: 0, f: 0, c: -4 };
  // console.log("\nNon-factorable Example (Circle):");
  // const circleFactors = factor(circleCoeffs);
  // if (circleFactors) {
  //   console.log("Factors:", circleFactors);
  // }
  