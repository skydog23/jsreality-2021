/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import * as Pn from '../Pn.js';

describe('Pn (Projective Geometry)', () => {
    describe('Constants', () => {
        test('metric constants are defined correctly', () => {
            expect(Pn.ELLIPTIC).toBe(1);
            expect(Pn.EUCLIDEAN).toBe(0);
            expect(Pn.HYPERBOLIC).toBe(-1);
            expect(Pn.PROJECTIVE).toBe(2);
        });

        test('zDirectionP3 is defined correctly', () => {
            expect(Pn.zDirectionP3).toEqual([0, 0, 1, 0]);
        });
    });

    describe('Hyperbolic Functions', () => {
        test('cosh', () => {
            expect(Pn.cosh(0)).toBe(1);
            expect(Pn.cosh(1)).toBeCloseTo(1.5430806348152437);
        });

        test('sinh', () => {
            expect(Pn.sinh(0)).toBe(0);
            expect(Pn.sinh(1)).toBeCloseTo(1.1752011936438014);
        });

        test('tanh', () => {
            expect(Pn.tanh(0)).toBe(0);
            expect(Pn.tanh(1)).toBeCloseTo(0.7615941559557649);
        });

        test('acosh', () => {
            expect(Pn.acosh(1)).toBe(0);
            expect(Pn.acosh(2)).toBeCloseTo(1.3169578969248166);
        });

        test('asinh', () => {
            expect(Pn.asinh(0)).toBe(0);
            expect(Pn.asinh(1)).toBeCloseTo(0.8813735870195429);
        });

        test('atanh', () => {
            expect(Pn.atanh(0)).toBe(0);
            expect(Pn.atanh(0.5)).toBeCloseTo(0.5493061443340548);
        });
    });

    describe('dehomogenize', () => {
        test('dehomogenizes 2D point correctly', () => {
            const p = [2, 4, 2];  // Point (1,2) in homogeneous coordinates
            const result = Pn.dehomogenize(null, p);
            expect(result).toEqual([1, 2]);
        });

        test('dehomogenizes 3D point correctly', () => {
            const p = [2, 4, 6, 2];  // Point (1,2,3) in homogeneous coordinates
            const result = Pn.dehomogenize(null, p);
            expect(result).toEqual([1, 2, 3]);
        });

        test('handles point at infinity', () => {
            const p = [1, 2, 0];  // Point at infinity
            const result = Pn.dehomogenize(null, p);
            expect(result[0]).toBe(Infinity);
            expect(result[1]).toBe(Infinity);
        });

        test('handles zero homogeneous coordinate', () => {
            const p = [0, 0, 0];
            const result = Pn.dehomogenize(null, p);
            expect(result).toEqual([0, 0]);
        });

        test('reuses destination array', () => {
            const dst = [0, 0];
            const p = [2, 4, 2];
            const result = Pn.dehomogenize(dst, p);
            expect(result).toBe(dst);
            expect(result).toEqual([1, 2]);
        });
    });

    describe('homogenize', () => {
        test('homogenizes 2D point correctly', () => {
            const p = [1, 2];
            const result = Pn.homogenize(null, p);
            expect(result).toEqual([1, 2, 1]);
        });

        test('homogenizes 3D point correctly', () => {
            const p = [1, 2, 3];
            const result = Pn.homogenize(null, p);
            expect(result).toEqual([1, 2, 3, 1]);
        });

        test('handles zero point', () => {
            const p = [0, 0];
            const result = Pn.homogenize(null, p);
            expect(result).toEqual([0, 0, 1]);
        });

        test('reuses destination array', () => {
            const dst = [0, 0, 0];
            const p = [1, 2];
            const result = Pn.homogenize(dst, p);
            expect(result).toBe(dst);
            expect(result).toEqual([1, 2, 1]);
        });
    });

    describe('distanceBetween', () => {
        test('calculates Euclidean distance correctly', () => {
            const p1 = [0, 0, 1];
            const p2 = [3, 4, 1];
            const result = Pn.distanceBetween(p1, p2, Pn.EUCLIDEAN);
            expect(result).toBe(5); // 3-4-5 triangle
        });

        test('handles homogeneous coordinates', () => {
            const p1 = [0, 0, 2];  // Point (0,0) with w=2
            const p2 = [6, 8, 2];  // Point (3,4) with w=2
            const result = Pn.distanceBetween(p1, p2, Pn.EUCLIDEAN);
            expect(result).toBe(5);
        });

        test('calculates hyperbolic distance', () => {
            const p1 = [1, 0, 1];  // Point on hyperbolic plane
            const p2 = [2, 0, 2];  // Same point with different w
            const result = Pn.distanceBetween(p1, p2, Pn.HYPERBOLIC);
            expect(result).toBeCloseTo(0);
        });

        test('handles points at infinity', () => {
            const p1 = [1, 0, 0];  // Point at infinity
            const p2 = [0, 1, 1];  // Finite point
            const result = Pn.distanceBetween(p1, p2, Pn.EUCLIDEAN);
            expect(result).toBe(Infinity);
        });
    });

    describe('perpendicularBisector', () => {
        test('calculates perpendicular bisector in Euclidean space', () => {
            const p1 = [0.5, 0, 1];
            const p2 = [0, 0.5, 1];
            const result = Pn.perpendicularBisector(null, p1, p2, Pn.EUCLIDEAN);
            // The perpendicular bisector should be equidistant from both points
            const d1 = Pn.distanceBetween(p1, result, Pn.EUCLIDEAN);
            const d2 = Pn.distanceBetween(p2, result, Pn.EUCLIDEAN);
            expect(d1).toBeCloseTo(d2);
        });

        test('handles homogeneous coordinates', () => {
            const p1 = [1, 0, 2];  // Point (0.5,0)
            const p2 = [0, 1, 2];  // Point (0,0.5)
            const result = Pn.perpendicularBisector(null, p1, p2, Pn.EUCLIDEAN);
            // Result should be normalized
            const norm = Math.sqrt(result[0]*result[0] + result[1]*result[1] + result[2]*result[2]);
            expect(norm).toBeCloseTo(1);
        });

        test('handles coincident points', () => {
            const p1 = [1, 1, 1];
            const p2 = [1, 1, 1];
            expect(() => {
                Pn.perpendicularBisector(null, p1, p2, Pn.EUCLIDEAN);
            }).toThrow();
        });
    });

    describe('pointFromLines', () => {
        test('calculates intersection of two lines', () => {
            const l1 = [1, 0, 0];  // Vertical line x=0
            const l2 = [0, 1, 0];  // Horizontal line y=0
            const result = Pn.pointFromLines(null, l1, l2);
            // Result should be the origin [0,0,1] up to scale
            expect(result[0]/result[2]).toBeCloseTo(0);
            expect(result[1]/result[2]).toBeCloseTo(0);
        });

        test('handles parallel lines', () => {
            const l1 = [1, 0, 0];  // x=0
            const l2 = [1, 0, 1];  // x=1
            const result = Pn.pointFromLines(null, l1, l2);
            // Result should be a point at infinity
            expect(result[2]).toBeCloseTo(0);
        });

        test('handles coincident lines', () => {
            const l1 = [1, 0, 0];
            const l2 = [2, 0, 0];  // Same line as l1
            expect(() => {
                Pn.pointFromLines(null, l1, l2);
            }).toThrow();
        });

        test('reuses destination array', () => {
            const dst = [0, 0, 0];
            const l1 = [1, 0, 0];
            const l2 = [0, 1, 0];
            const result = Pn.pointFromLines(dst, l1, l2);
            expect(result).toBe(dst);
        });
    });

    describe('lineFromPoints', () => {
        test('calculates line through two points', () => {
            const p1 = [0, 0, 1];  // Origin
            const p2 = [1, 1, 1];  // Point (1,1)
            const result = Pn.lineFromPoints(null, p1, p2);
            // Line should pass through both points
            expect(Pn.innerProduct(result, p1)).toBeCloseTo(0);
            expect(Pn.innerProduct(result, p2)).toBeCloseTo(0);
        });

        test('handles points at infinity', () => {
            const p1 = [1, 0, 0];  // Point at infinity
            const p2 = [0, 0, 1];  // Origin
            const result = Pn.lineFromPoints(null, p1, p2);
            // Line should be vertical (x=0)
            expect(result[0]).not.toBe(0);
            expect(result[1]).toBeCloseTo(0);
        });

        test('handles coincident points', () => {
            const p1 = [1, 1, 1];
            const p2 = [1, 1, 1];
            expect(() => {
                Pn.lineFromPoints(null, p1, p2);
            }).toThrow();
        });

        test('reuses destination array', () => {
            const dst = [0, 0, 0];
            const p1 = [0, 0, 1];
            const p2 = [1, 1, 1];
            const result = Pn.lineFromPoints(dst, p1, p2);
            expect(result).toBe(dst);
        });
    });

    describe('innerProduct', () => {
        const v1 = [1, 0, 1];
        const v2 = [0, 1, 1];

        test('Euclidean metric', () => {
            const result = Pn.innerProduct(v1, v2, Pn.EUCLIDEAN);
            expect(result).toBe(0); // Vectors are orthogonal in Euclidean space
        });

        test('Hyperbolic metric', () => {
            const result = Pn.innerProduct(v1, v2, Pn.HYPERBOLIC);
            expect(result).toBe(-1); // Last coordinate gets negative weight
        });

        test('Elliptic metric', () => {
            const result = Pn.innerProduct(v1, v2, Pn.ELLIPTIC);
            expect(result).toBe(1); // Last coordinate gets positive weight
        });
    });

    describe('normalize', () => {
        test('normalizes vector in Euclidean metric', () => {
            const v = [3, 4, 0];
            const result = Pn.normalize(null, v, Pn.EUCLIDEAN);
            expect(result[0]).toBeCloseTo(0.6);
            expect(result[1]).toBeCloseTo(0.8);
            expect(result[2]).toBe(0);
        });

        test('normalizes vector in Hyperbolic metric', () => {
            const v = [1, 1, 2];
            const result = Pn.normalize(null, v, Pn.HYPERBOLIC);
            // The norm in hyperbolic metric is sqrt(x²+y²-w²)
            const norm = Math.sqrt(Math.abs(1 + 1 - 4));
            expect(result[0]).toBeCloseTo(1/norm);
            expect(result[1]).toBeCloseTo(1/norm);
            expect(result[2]).toBeCloseTo(2/norm);
        });
    });

    describe('angleBetween', () => {
        test('calculates angle in Euclidean metric', () => {
            const v1 = [1, 0, 1];
            const v2 = [0, 1, 1];
            const angle = Pn.angleBetween(v1, v2, Pn.EUCLIDEAN);
            expect(angle).toBeCloseTo(Math.PI/2); // 90 degrees
        });

        test('handles parallel vectors', () => {
            const v1 = [1, 0, 1];
            const v2 = [2, 0, 2];
            const angle = Pn.angleBetween(v1, v2, Pn.EUCLIDEAN);
            expect(angle).toBeCloseTo(0); // 0 degrees
        });

        test('handles zero vector', () => {
            const v1 = [0, 0, 0];
            const v2 = [1, 0, 1];
            const angle = Pn.angleBetween(v1, v2, Pn.EUCLIDEAN);
            expect(angle).toBe(Number.MAX_VALUE);
        });
    });

    describe('normSquared', () => {
        test('calculates Euclidean norm squared correctly', () => {
            const v = [3, 4, 1];  // homogeneous coordinates
            const result = Pn.normSquared(v, Pn.EUCLIDEAN);
            expect(result).toBe(25); // 3^2 + 4^2
        });

        test('calculates hyperbolic norm squared correctly', () => {
            const v = [3, 4, 5];  // point in hyperbolic space
            const result = Pn.normSquared(v, Pn.HYPERBOLIC);
            expect(result).toBe(25 - 25); // (3^2 + 4^2) - 5^2
        });

        test('calculates elliptic norm squared correctly', () => {
            const v = [3, 4, 5];  // point in elliptic space
            const result = Pn.normSquared(v, Pn.ELLIPTIC);
            expect(result).toBe(25 + 25); // (3^2 + 4^2) + 5^2
        });

        test('handles zero vector', () => {
            const v = [0, 0, 0];
            const result = Pn.normSquared(v, Pn.EUCLIDEAN);
            expect(result).toBe(0);
        });
    });

    describe('setToLength', () => {
        test('sets Euclidean vector to specified length', () => {
            const v = [3, 4, 1];  // length 5 vector
            const result = Pn.setToLength(null, v, 10, Pn.EUCLIDEAN);
            expect(result[0]).toBe(6);  // 3 * (10/5)
            expect(result[1]).toBe(8);  // 4 * (10/5)
            expect(result[2]).toBe(2);  // 1 * (10/5)
        });

        test('sets hyperbolic vector to specified length', () => {
            const v = [0, 0, 1];  // unit vector in hyperbolic space
            const result = Pn.setToLength(null, v, 2, Pn.HYPERBOLIC);
            // Length in hyperbolic space is more complex, just verify the scaling
            const newLength = Math.sqrt(Math.abs(Pn.normSquared(result, Pn.HYPERBOLIC)));
            expect(newLength).toBeCloseTo(2);
        });

        test('reuses destination array', () => {
            const dst = [0, 0, 0];
            const v = [3, 4, 1];
            const result = Pn.setToLength(dst, v, 10, Pn.EUCLIDEAN);
            expect(result).toBe(dst);
        });

        test('throws error for zero vector', () => {
            const v = [0, 0, 0];
            expect(() => {
                Pn.setToLength(null, v, 1, Pn.EUCLIDEAN);
            }).toThrow('Cannot set length of zero vector');
        });
    });

    describe('isValidCoordinate', () => {
        test('validates coordinates in Euclidean metric', () => {
            expect(Pn.isValidCoordinate([1, 2, 3], Pn.EUCLIDEAN)).toBe(true);
            expect(Pn.isValidCoordinate([0, 0, 0], Pn.EUCLIDEAN)).toBe(false);
        });

        test('validates coordinates in hyperbolic metric', () => {
            expect(Pn.isValidCoordinate([1, 0, 1], Pn.HYPERBOLIC)).toBe(true);
            expect(Pn.isValidCoordinate([1, 1, 0], Pn.HYPERBOLIC)).toBe(false);
        });

        test('validates coordinates in elliptic metric', () => {
            expect(Pn.isValidCoordinate([1, 0, 0], Pn.ELLIPTIC)).toBe(true);
            expect(Pn.isValidCoordinate([0, 0, 0], Pn.ELLIPTIC)).toBe(false);
        });

        test('throws error for invalid metric', () => {
            expect(() => {
                Pn.isValidCoordinate([1, 2, 3], 999); // Use a number that's definitely not a valid metric
            }).toThrow('Invalid metric');
        });
    });

    describe('matrixTimesVector', () => {
        test('multiplies matrix by vector', () => {
            const matrix = [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ];
            const vector = [1, 0, 1];
            const result = Pn.matrixTimesVector(null, matrix, vector);
            expect(result).toEqual([4, 10, 16]);
        });

        test('reuses destination array', () => {
            const matrix = [[1, 2], [3, 4]];
            const vector = [1, 1];
            const dst = new Array(2);
            const result = Pn.matrixTimesVector(dst, matrix, vector);
            expect(result).toBe(dst);
            expect(result).toEqual([3, 7]);
        });
    });

    describe('matrixTimesMatrix', () => {
        test('multiplies two matrices', () => {
            const m1 = [
                [1, 2],
                [3, 4]
            ];
            const m2 = [
                [5, 6],
                [7, 8]
            ];
            const result = Pn.matrixTimesMatrix(null, m1, m2);
            expect(result).toEqual([
                [19, 22],
                [43, 50]
            ]);
        });

        test('reuses destination matrix', () => {
            const m1 = [[1, 2], [3, 4]];
            const m2 = [[5, 6], [7, 8]];
            const dst = [new Array(2), new Array(2)];
            const result = Pn.matrixTimesMatrix(dst, m1, m2);
            expect(result).toBe(dst);
            expect(result).toEqual([[19, 22], [43, 50]]);
        });
    });

    describe('transpose', () => {
        test('transposes a square matrix', () => {
            const matrix = [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ];
            const result = Pn.transpose(null, matrix);
            expect(result).toEqual([
                [1, 4, 7],
                [2, 5, 8],
                [3, 6, 9]
            ]);
        });

        test('transposes a rectangular matrix', () => {
            const matrix = [
                [1, 2, 3],
                [4, 5, 6]
            ];
            const result = Pn.transpose(null, matrix);
            expect(result).toEqual([
                [1, 4],
                [2, 5],
                [3, 6]
            ]);
        });

        test('reuses destination matrix', () => {
            const matrix = [[1, 2], [3, 4]];
            const dst = [new Array(2), new Array(2)];
            const result = Pn.transpose(dst, matrix);
            expect(result).toBe(dst);
            expect(result).toEqual([[1, 3], [2, 4]]);
        });
    });

    describe('determinant', () => {
        test('calculates 1x1 determinant', () => {
            expect(Pn.determinant([[5]])).toBe(5);
        });

        test('calculates 2x2 determinant', () => {
            const matrix = [
                [1, 2],
                [3, 4]
            ];
            expect(Pn.determinant(matrix)).toBe(-2); // 1*4 - 2*3
        });

        test('calculates 3x3 determinant', () => {
            const matrix = [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ];
            expect(Pn.determinant(matrix)).toBe(0);
        });

        test('calculates non-zero 3x3 determinant', () => {
            const matrix = [
                [2, -3, 1],
                [2, 0, -1],
                [1, 4, 5]
            ];
            expect(Pn.determinant(matrix)).toBe(49);
        });
    });
}); 