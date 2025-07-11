import * as Pn from '../Pn.js';
import { matrixTimesVector, subtract, normalize, crossProduct } from '../Rn.js';

describe('dragTowards', () => {
    test('drags point in Euclidean space', () => {
        const p0 = [0, 0, 0, 1];  // Origin
        const p1 = [1, 0, 0, 1];  // Point on x-axis
        const length = 2;
        const result = Pn.dragTowards(null, p0, p1, length, Pn.EUCLIDEAN);
        expect(result).toEqual([2, 0, 0, 1]);
    });

    test('drags point in hyperbolic space', () => {
        const p0 = [0, 0, 0, 1];
        const p1 = [1, 0, 0, 1];
        const length = 1;
        const result = Pn.dragTowards(null, p0, p1, length, Pn.HYPERBOLIC);
        // Point should lie on hyperbolic geodesic
        expect(Pn.innerProduct(result, result, Pn.HYPERBOLIC)).toBeLessThan(0);
        // Distance should be approximately length
        expect(Pn.distanceBetween(p0, result, Pn.HYPERBOLIC)).toBeCloseTo(length);
    });
});

describe('projectToTangentSpace', () => {
    test('projects vector in Euclidean space', () => {
        const point = [1, 0, 0, 1];
        const vector = [1, 1, 0, 1];
        const result = Pn.projectToTangentSpace(null, point, vector, Pn.EUCLIDEAN);
        // Last coordinate should be 0 for Euclidean tangent vector
        expect(result[3]).toBe(0);
    });

    test('projects vector in hyperbolic space', () => {
        const point = [0, 0, 0, 1];
        const vector = [1, 0, 0, 1];
        const result = Pn.projectToTangentSpace(null, point, vector, Pn.HYPERBOLIC);
        // Result should be orthogonal to point
        expect(Pn.innerProduct(point, result, Pn.HYPERBOLIC)).toBeCloseTo(0);
    });
});

describe('abs', () => {
    test('returns absolute values', () => {
        const src = [-1, 2, -3, 4];
        const result = Pn.abs(null, src);
        expect(result).toEqual([1, 2, 3, 4]);
    });
});

describe('isZero', () => {
    test('detects zero vector', () => {
        expect(Pn.isZero([0, 0, 0, 0])).toBe(true);
        expect(Pn.isZero([1e-9, 0, 0, 0])).toBe(true);
        expect(Pn.isZero([0.1, 0, 0, 0])).toBe(false);
    });
});

describe('manhattanNorm', () => {
    test('calculates L1 norm', () => {
        expect(Pn.manhattanNorm([1, -2, 3, -4])).toBe(10);
        expect(Pn.manhattanNorm([1, 1, 1, 1])).toBe(4);
    });
});

describe('manhattanNormDistance', () => {
    test('calculates L1 distance', () => {
        const u = [1, 2, 3, 4];
        const v = [0, 2, 4, 6];
        expect(Pn.manhattanNormDistance(u, v)).toBe(4);
    });
});

describe('planeParallelToPassingThrough', () => {
    test('creates plane equation', () => {
        const dir = [1, 0, 0];
        const point = [0, 1, 2];
        const result = Pn.planeParallelToPassingThrough(null, dir, point);
        // Plane equation: x + 0y + 0z + 0 = 0
        expect(result).toEqual([1, 0, 0, 0]);
    });
});

describe('polarizePlane', () => {
    test('converts point to direction in Euclidean space', () => {
        const point = [1, 2, 3, 1];
        const result = Pn.polarizePlane(null, point, Pn.EUCLIDEAN);
        expect(result).toEqual([1, 2, 3, 0]);
    });

    test('handles hyperbolic polarization', () => {
        const point = [1, 2, 3, 1];
        const result = Pn.polarizePlane(null, point, Pn.HYPERBOLIC);
        expect(result).toEqual([1, 2, 3, -1]);
    });
});

describe('completeBasis', () => {
    test('completes partial basis to full basis', () => {
        const partial = [
            [1, 0, 0],  // x-axis
            [0, 1, 0]   // y-axis
        ];
        const result = Pn.completeBasis(null, partial);
        
        // Should add z-axis to complete basis
        expect(result[2][2]).toBeCloseTo(1);
        
        // Vectors should be orthogonal
        expect(Pn.innerProduct(result[0], result[1])).toBeCloseTo(0);
        expect(Pn.innerProduct(result[1], result[2])).toBeCloseTo(0);
        expect(Pn.innerProduct(result[2], result[0])).toBeCloseTo(0);
    });
});

describe('permutationMatrix', () => {
    test('creates valid permutation matrix', () => {
        const perm = [1, 2, 0];  // Cyclic permutation
        const result = Pn.permutationMatrix(null, perm);
        
        // Test permutation effect
        const point = [1, 2, 3];
        const transformed = Pn.matrixTimesVector(null, result, point);
        expect(transformed).toEqual([2, 3, 1]);
    });
});

describe('extractOrientationMatrix', () => {
    test('extracts orientation part', () => {
        // Create a matrix with translation and rotation
        const translation = [1, 2, 3];
        const angle = Math.PI / 3;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const m = [
            c, -s, 0, translation[0],
            s, c, 0, translation[1],
            0, 0, 1, translation[2],
            0, 0, 0, 1
        ];
        
        const point = [0, 0, 0, 1];  // Origin
        const result = Pn.extractOrientationMatrix(null, m, point, Pn.EUCLIDEAN);
        
        // Result should have no translation
        expect(result[12]).toBeCloseTo(0);
        expect(result[13]).toBeCloseTo(0);
        expect(result[14]).toBeCloseTo(0);
        
        // But should preserve rotation
        expect(result[0]).toBeCloseTo(c);
        expect(result[1]).toBeCloseTo(s);
        expect(result[4]).toBeCloseTo(-s);
        expect(result[5]).toBeCloseTo(c);
    });
}); 