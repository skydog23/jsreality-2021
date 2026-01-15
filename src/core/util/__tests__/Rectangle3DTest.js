/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * Tests for Rectangle3D class
 */

import { Rectangle3D } from '../Rectangle3D.js';

console.log('Testing Rectangle3D...');

// Test 1: Default constructor
const box1 = new Rectangle3D();
console.log('Empty box isEmpty():', box1.isEmpty());

// Test 2: Constructor with dimensions
const box2 = new Rectangle3D(2, 4, 6);
console.log('Box with dimensions (2,4,6):');
console.log('  Center:', box2.getCenter());
console.log('  Extent:', box2.getExtent());
console.log('  isEmpty():', box2.isEmpty());

// Test 3: Static constants
console.log('Unit cube:');
console.log('  Center:', Rectangle3D.unitCube.getCenter());
console.log('  Extent:', Rectangle3D.unitCube.getExtent());

// Test 4: Union operation
const box3 = new Rectangle3D(1, 1, 1);
const box4 = box2.unionWith(box3, null);
console.log('Union result extent:', box4.getExtent());

// Test 5: Transform by identity matrix
const identity = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];
const transformedBox = box2.transformByMatrix(null, identity);
console.log('Transformed box center:', transformedBox.getCenter());

// Test 6: Compute from vertex list
const vertices = [
    [0, 0, 0],
    [1, 1, 1],
    [-1, -1, -1]
];
const box5 = new Rectangle3D(vertices);
console.log('Box from vertices:');
console.log('  Center:', box5.getCenter());
console.log('  Extent:', box5.getExtent());

console.log('Rectangle3D tests completed successfully!');
