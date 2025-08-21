// Import the Rn module
require('../src-core/de/jreality/math/Rn.js');

// Use globalThis.Rn for all tests
const Rn = globalThis.Rn;

describe('Rn (Euclidean Vector Space)', () => {
    describe('identityMatrix', () => {
        test('creates correct 2x2 identity matrix', () => {
            const matrix = Rn.identityMatrix(2);
            expect(matrix).toEqual([1, 0, 0, 1]);
        });

        test('creates correct 3x3 identity matrix', () => {
            const matrix = Rn.identityMatrix(3);
            expect(matrix).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
        });

        test('creates correct 4x4 identity matrix', () => {
            const matrix = Rn.identityMatrix(4);
            expect(matrix).toEqual([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
        });
    });

    describe('add', () => {
        test('adds two vectors correctly', () => {
            const v1 = [1, 2, 3];
            const v2 = [4, 5, 6];
            const result = Rn.add(null, v1, v2);
            expect(result).toEqual([5, 7, 9]);
        });

        test('handles vectors of different lengths', () => {
            const v1 = [1, 2, 3];
            const v2 = [4, 5];
            const result = Rn.add(null, v1, v2);
            expect(result).toEqual([5, 7, 3]);
        });

        test('reuses destination array', () => {
            const dst = [0, 0, 0];
            const v1 = [1, 2, 3];
            const v2 = [4, 5, 6];
            const result = Rn.add(dst, v1, v2);
            expect(result).toBe(dst);
            expect(result).toEqual([5, 7, 9]);
        });

        test('handles zero vectors', () => {
            const v1 = [0, 0, 0];
            const v2 = [1, 2, 3];
            const result = Rn.add(null, v1, v2);
            expect(result).toEqual([1, 2, 3]);
        });

        test('handles empty vectors', () => {
            const v1 = [];
            const v2 = [1, 2, 3];
            const result = Rn.add(null, v1, v2);
            expect(result).toEqual([1, 2, 3]);
        });
    });

    describe('subtract', () => {
        test('subtracts two vectors correctly', () => {
            const v1 = [4, 5, 6];
            const v2 = [1, 2, 3];
            const result = Rn.subtract(null, v1, v2);
            expect(result).toEqual([3, 3, 3]);
        });

        test('handles vectors of different lengths', () => {
            const v1 = [4, 5, 6];
            const v2 = [1, 2];
            const result = Rn.subtract(null, v1, v2);
            expect(result).toEqual([3, 3, 6]);
        });

        test('handles zero vectors', () => {
            const v1 = [1, 2, 3];
            const v2 = [0, 0, 0];
            const result = Rn.subtract(null, v1, v2);
            expect(result).toEqual([1, 2, 3]);
        });
    });

    describe('innerProduct', () => {
        test('calculates dot product correctly', () => {
            const v1 = [1, 2, 3];
            const v2 = [4, 5, 6];
            const result = Rn.innerProduct(v1, v2);
            expect(result).toBe(1*4 + 2*5 + 3*6);
        });

        test('handles vectors of different lengths', () => {
            const v1 = [1, 2, 3];
            const v2 = [4, 5];
            const result = Rn.innerProduct(v1, v2);
            expect(result).toBe(1*4 + 2*5);
        });

        test('handles orthogonal vectors', () => {
            const v1 = [1, 0, 0];
            const v2 = [0, 1, 0];
            const result = Rn.innerProduct(v1, v2);
            expect(result).toBe(0);
        });

        test('handles parallel vectors', () => {
            const v1 = [1, 2, 3];
            const v2 = [2, 4, 6];
            const result = Rn.innerProduct(v1, v2);
            expect(result).toBe(28); // 2*(1*1 + 2*2 + 3*3)
        });
    });

    describe('euclideanNorm', () => {
        test('calculates vector length correctly', () => {
            const v = [3, 4];
            const result = Rn.euclideanNorm(v);
            expect(result).toBe(5); // 3-4-5 triangle
        });

        test('handles zero vector', () => {
            const v = [0, 0, 0];
            const result = Rn.euclideanNorm(v);
            expect(result).toBe(0);
        });

        test('handles unit vectors', () => {
            const v = [1, 0, 0];
            const result = Rn.euclideanNorm(v);
            expect(result).toBe(1);
        });

        test('handles negative components', () => {
            const v = [-3, -4];
            const result = Rn.euclideanNorm(v);
            expect(result).toBe(5);
        });
    });

    describe('times', () => {
        test('multiplies vector by scalar correctly', () => {
            const v = [1, 2, 3];
            const result = Rn.times(null, 2, v);
            expect(result).toEqual([2, 4, 6]);
        });

        test('handles zero scalar', () => {
            const v = [1, 2, 3];
            const result = Rn.times(null, 0, v);
            expect(result).toEqual([0, 0, 0]);
        });

        test('handles negative scalar', () => {
            const v = [1, 2, 3];
            const result = Rn.times(null, -1, v);
            expect(result).toEqual([-1, -2, -3]);
        });

        test('handles fractional scalar', () => {
            const v = [2, 4, 6];
            const result = Rn.times(null, 0.5, v);
            expect(result).toEqual([1, 2, 3]);
        });
    });

    describe('normalize', () => {
        test('normalizes vector to unit length', () => {
            const v = [3, 4];
            const result = Rn.normalize(null, v);
            expect(result[0]).toBeCloseTo(0.6);
            expect(result[1]).toBeCloseTo(0.8);
        });

        test('handles zero vector', () => {
            const v = [0, 0];
            const result = Rn.normalize(null, v);
            expect(result).toEqual([0, 0]);
        });

        test('handles unit vector', () => {
            const v = [1, 0, 0];
            const result = Rn.normalize(null, v);
            expect(result).toEqual([1, 0, 0]);
        });

        test('handles negative components', () => {
            const v = [-3, -4];
            const result = Rn.normalize(null, v);
            expect(result[0]).toBeCloseTo(-0.6);
            expect(result[1]).toBeCloseTo(-0.8);
        });
    });

    describe('matrixTimesVector', () => {
        test('multiplies matrix by vector correctly', () => {
            const m = [1, 2, 3, 4]; // 2x2 matrix [[1,2],[3,4]]
            const v = [5, 6];
            const result = Rn.matrixTimesVector(null, m, v);
            expect(result).toEqual([
                1*5 + 2*6,  // First row
                3*5 + 4*6   // Second row
            ]);
        });

        test('handles implicit homogeneous coordinate', () => {
            const m = [1, 0, 2,
                      0, 1, 3,
                      0, 0, 1]; // 3x3 matrix with translation
            const v = [4, 5]; // 2D point
            const result = Rn.matrixTimesVector(null, m, v);
            expect(result).toEqual([
                4 + 2,  // x + tx
                5 + 3,  // y + ty
                1       // w
            ]);
        });

        test('throws error for non-square matrix', () => {
            const m = [1, 2, 3]; // Not a square matrix
            const v = [4, 5];
            expect(() => Rn.matrixTimesVector(null, m, v)).toThrow();
        });

        test('handles identity matrix', () => {
            const m = [1, 0, 0,
                      0, 1, 0,
                      0, 0, 1];
            const v = [1, 2, 3];
            const result = Rn.matrixTimesVector(null, m, v);
            expect(result).toEqual([1, 2, 3]);
        });

        test('handles rotation matrix', () => {
            // 90-degree rotation matrix
            const m = [0, -1, 0,
                      1,  0, 0,
                      0,  0, 1];
            const v = [1, 0, 1];
            const result = Rn.matrixTimesVector(null, m, v);
            expect(result[0]).toBeCloseTo(0);
            expect(result[1]).toBeCloseTo(1);
            expect(result[2]).toBeCloseTo(1);
        });
    });
}); 

// Test file for the newly added Rn.js functions
// Run this in Node.js or browser console

// Load the Rn.js module (adjust path as needed)
// In browser: just include the script tag
// In Node.js: require('./src-core/de/jreality/math/Rn.js')

function testInverseFunction() {
    console.log('Testing Rn.inverse()...');
    
    // Test 2x2 matrix inverse
    const mat2x2 = [1, 2, 3, 4]; // [[1,2],[3,4]]
    const inv2x2 = Rn.inverse(null, mat2x2);
    console.log('2x2 matrix:', mat2x2);
    console.log('2x2 inverse:', inv2x2);
    
    // Verify: mat * inv = identity
    const identity2 = Rn.timesMatrix(null, mat2x2, inv2x2);
    console.log('2x2 verification (should be identity):', identity2);
    
    // Test 3x3 matrix inverse
    const mat3x3 = [
        1, 0, 0,
        0, 2, 0, 
        0, 0, 3
    ]; // diagonal matrix
    const inv3x3 = Rn.inverse(null, mat3x3);
    console.log('3x3 diagonal matrix:', mat3x3);
    console.log('3x3 inverse:', inv3x3);
    
    const identity3 = Rn.timesMatrix(null, mat3x3, inv3x3);
    console.log('3x3 verification (should be identity):', identity3);
}

function testCofactorFunction() {
    console.log('\nTesting Rn.cofactor()...');
    
    // Test 3x3 matrix cofactor
    const mat = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    console.log('3x3 matrix:', mat);
    
    // Calculate some cofactors
    const cof00 = Rn.cofactor(mat, 0, 0);
    const cof01 = Rn.cofactor(mat, 0, 1);
    const cof11 = Rn.cofactor(mat, 1, 1);
    
    console.log('Cofactor(0,0):', cof00);
    console.log('Cofactor(0,1):', cof01);
    console.log('Cofactor(1,1):', cof11);
}

function testadjugateFunction() {
    console.log('\nTesting Rn.adjugate()...');
    
    // Test 2x2 matrix adjugate
    const mat = [1, 2, 3, 4];
    const adj = Rn.adjugate(null, mat);
    console.log('2x2 matrix:', mat);
    console.log('2x2 adjugate:', adj);
    
    // For 2x2 matrix [[a,b],[c,d]], adjugate should be [[d,-b],[-c,a]]
    const expected = [4, -2, -3, 1];
    console.log('Expected adjugate:', expected);
    console.log('Match:', Rn.equals(adj, expected, 1e-10));
}

function testPermutationMatrix() {
    console.log('\nTesting Rn.permutationMatrix()...');
    
    // Test permutation [1, 0, 2] (swaps first two elements)
    const perm = [1, 0, 2];
    const permMat = Rn.permutationMatrix(null, perm);
    console.log('Permutation:', perm);
    console.log('Permutation matrix:', permMat);
    console.log('Matrix formatted:');
    console.log(Rn.matrixToString(permMat));
}

function runAllTests() {
    console.log('=== Testing newly added Rn.js functions ===\n');
    
    try {
        testCofactorFunction();
        testadjugateFunction();
        testInverseFunction();
        testPermutationMatrix();
        
        console.log('\n=== All tests completed ===');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Export for Node.js or run immediately in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllTests };
} else {
    // Browser environment - run tests
    runAllTests();
} 