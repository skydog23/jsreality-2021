// Import the required modules
require('../Quat.js');
require('../Rn.js');

// Use globalThis for accessing the modules
const Quat = globalThis.Quat;
const Rn = globalThis.Rn;

describe('Quaternion operations', () => {
    test('add', () => {
        const a = [1, 2, 3, 4];
        const b = [2, 3, 4, 5];
        const result = Quat.add(null, a, b);
        expect(result).toEqual([3, 5, 7, 9]);
    });

    test('subtract', () => {
        const a = [2, 3, 4, 5];
        const b = [1, 1, 1, 1];
        const result = Quat.subtract(null, a, b);
        expect(result).toEqual([1, 2, 3, 4]);
    });

    test('times (quaternion multiplication)', () => {
        const a = [1, 0, 0, 0]; // real quaternion
        const b = [0, 1, 0, 0]; // pure imaginary quaternion
        const result = Quat.times(null, a, b);
        expect(result).toEqual([0, 1, 0, 0]);

        // i * i = -1
        const i = [0, 1, 0, 0];
        const ii = Quat.times(null, i, i);
        expect(ii).toEqual([-1, 0, 0, 0]);
    });

    test('scale', () => {
        const q = [1, 2, 3, 4];
        const result = Quat.scale(null, 2, q);
        expect(result).toEqual([2, 4, 6, 8]);
    });

    test('invert', () => {
        const q = [1, 2, 3, 4];
        const inv = Quat.invert(null, q);
        const product = Quat.times(null, q, inv);
        // q * q^-1 should be approximately [1, 0, 0, 0]
        expect(product[0]).toBeCloseTo(1);
        expect(product[1]).toBeCloseTo(0);
        expect(product[2]).toBeCloseTo(0);
        expect(product[3]).toBeCloseTo(0);
    });

    test('length and lengthSquared', () => {
        const q = [1, 2, 3, 4];
        expect(Quat.lengthSquared(q)).toBe(30);
        expect(Quat.length(q)).toBeCloseTo(Math.sqrt(30));
    });

    test('real and imaginary parts', () => {
        const q = [1, 2, 3, 4];
        expect(Quat.re(q)).toBe(1);
        expect(Quat.im(q)).toEqual([2, 3, 4]);
    });
}); 