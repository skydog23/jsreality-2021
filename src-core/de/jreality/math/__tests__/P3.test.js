// Import the required modules
require('../P3.js');
require('../Rn.js');

// Use globalThis for accessing the modules
const P3 = globalThis.P3;
const { matrixTimesVector, subtract, normalize, crossProduct } = globalThis.Rn;

describe('Line coordinates', () => {
    test('lineFromPoints creates Plücker coordinates', () => {
        const p1 = [0, 0, 0, 1];  // Origin
        const p2 = [0, 0, 1, 1];  // Point on z-axis
        const line = P3.lineFromPoints(null, p1, p2);
        
        expect(line[0]).toBe(0);  // xy component
        expect(line[1]).toBe(0);  // xz component
        expect(line[2]).toBe(1);  // xw component
        expect(line[3]).toBe(0);  // yz component
        expect(line[4]).toBe(0);  // yw component
        expect(line[5]).toBe(0);  // zw component
    });

    test('linesIntersect detects intersection', () => {
        // Two lines that intersect at origin
        const l1 = P3.lineFromPoints(null, [0, 0, 0, 1], [1, 0, 0, 1]);  // x-axis
        const l2 = P3.lineFromPoints(null, [0, 0, 0, 1], [0, 1, 0, 1]);  // y-axis
        expect(P3.linesIntersect(l1, l2)).toBe(true);

        // Two skew lines
        const l3 = P3.lineFromPoints(null, [0, 0, 0, 1], [1, 0, 0, 1]);  // x-axis
        const l4 = P3.lineFromPoints(null, [0, 1, 0, 1], [0, 1, 1, 1]);  // parallel to z-axis
        expect(P3.linesIntersect(l3, l4)).toBe(false);
    });
});

describe('Perspective transformations', () => {
    test('perspectiveMatrix creates valid projection', () => {
        const near = 0.1;
        const far = 100;
        const fovy = Math.PI/4;  // 45 degrees
        const aspect = 1.0;
        
        const proj = P3.perspectiveMatrix(null, near, far, fovy, aspect);
        
        // Test a point at (0,0,-near)
        const point = [0, 0, -near, 1];
        const transformed = matrixTimesVector(null, proj, point);
        // Point should project to (0,0,-1) in clip space
        expect(transformed[2]/transformed[3]).toBeCloseTo(-1);
    });
    
    test('lookAt creates valid view matrix', () => {
        const eye = [0, 0, 5];    // Camera position
        const center = [0, 0, 0]; // Look at point
        const up = [0, 1, 0];     // Up vector
        
        const view = P3.lookAt(null, eye, center, up);
        
        // Test point at center should map to (0,0,-5)
        const point = [0, 0, 0, 1];
        const transformed = matrixTimesVector(null, view, point);
        expect(transformed[2]).toBeCloseTo(-5);
    });
});

describe('Rotation', () => {
    test('rotationMatrix creates valid rotation', () => {
        const angle = Math.PI/2;  // 90 degrees
        const axis = [0, 0, 1];   // Rotate around z-axis
        
        const rot = P3.rotationMatrix(null, axis, angle);
        
        // Test rotating point on x-axis
        const point = [1, 0, 0, 1];
        const transformed = matrixTimesVector(null, rot, point);
        // Should rotate to y-axis
        expect(transformed[0]).toBeCloseTo(0);
        expect(transformed[1]).toBeCloseTo(1);
        expect(transformed[2]).toBeCloseTo(0);
    });
}); 