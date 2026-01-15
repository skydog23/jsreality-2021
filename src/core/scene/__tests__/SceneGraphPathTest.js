/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Simple test for SceneGraphPath functionality

import { SceneGraphPath } from '../SceneGraphPath.js';
import { SceneGraphComponent } from '../SceneGraphComponent.js';
import { Transformation } from '../Transformation.js';
import { Camera } from '../Camera.js';
import { PointSet } from '../PointSet.js';
import { Matrix } from '../../math/Matrix.js';
import * as Rn from '../../math/Rn.js';

console.log('=== SceneGraphPath Test ===');

// Create a simple scene graph hierarchy
const root = new SceneGraphComponent();
root.setName('root');

const childA = new SceneGraphComponent();
childA.setName('childA');

const childB = new SceneGraphComponent();
childB.setName('childB');

const camera = new Camera();
camera.setName('camera1');

const geometry = new PointSet(100);
geometry.setName('points');

// Build hierarchy: root -> childA -> childB -> geometry
//                      |-> camera
root.addChild(childA);
root.addChild(camera);
childA.addChild(childB);
childB.setGeometry(geometry);

// Add some transformations
const rootTransform = new Transformation();
const identityMatrix = new Array(16);
Rn.setIdentityMatrix(identityMatrix);
// Scale by 2
identityMatrix[0] = 2; identityMatrix[5] = 2; identityMatrix[10] = 2;
rootTransform.setMatrix(identityMatrix);
root.setTransformation(rootTransform);

const childTransform = new Transformation();
const translateMatrix = new Array(16);
Rn.setIdentityMatrix(translateMatrix);
// Translate by (5, 0, 0)
translateMatrix[12] = 5;
childTransform.setMatrix(translateMatrix);
childA.setTransformation(childTransform);

console.log('\n=== Testing Path Construction ===');

// Test 1: Empty path
const emptyPath = new SceneGraphPath();
console.log('Empty path:', emptyPath.toString());
console.log('Empty path length:', emptyPath.getLength());
console.log('Empty path is valid:', emptyPath.isValid());

// Test 2: Path to geometry
const geometryPath = new SceneGraphPath(root, childA, childB, geometry);
console.log('Path to geometry:', geometryPath.toString());
console.log('Path length:', geometryPath.getLength());
console.log('Path is valid:', geometryPath.isValid());

// Test 3: Path to camera
const cameraPath = new SceneGraphPath(root, camera);
console.log('Path to camera:', cameraPath.toString());
console.log('Camera path is valid:', cameraPath.isValid());

console.log('\n=== Testing Path Operations ===');

// Test push/pop
const buildPath = new SceneGraphPath();
buildPath.push(root);
buildPath.push(childA);
buildPath.push(childB);
console.log('Built path:', buildPath.toString());

const poppedNode = buildPath.pop();
console.log('Popped node:', poppedNode?.getName());
console.log('Path after pop:', buildPath.toString());

// Test immutable operations
const newPath = buildPath.pushNew(geometry);
console.log('Original path unchanged:', buildPath.toString());
console.log('New path with geometry:', newPath.toString());

const shorterPath = newPath.popNew();
console.log('New path after popNew:', shorterPath.toString());

console.log('\n=== Testing Path Utilities ===');

// Test startsWith
const prefixPath = new SceneGraphPath(root, childA);
console.log('Geometry path starts with prefix:', geometryPath.startsWith(prefixPath));
console.log('Camera path starts with prefix:', cameraPath.startsWith(prefixPath));

// Test contains
console.log('Geometry path contains childB:', geometryPath.contains(childB));
console.log('Camera path contains childB:', cameraPath.contains(childB));

// Test getLastComponent
console.log('Last component in geometry path:', geometryPath.getLastComponent()?.getName());
console.log('Last component in camera path:', cameraPath.getLastComponent()?.getName());

console.log('\n=== Testing Matrix Computation ===');

// Test matrix calculation
const pathMatrix = geometryPath.getMatrix();
console.log('Cumulative transformation matrix:');
for (let i = 0; i < 4; i++) {
  const row = pathMatrix.slice(i * 4, (i + 1) * 4);
  console.log(`  [${row.map(x => x.toFixed(2)).join(', ')}]`);
}

// Test partial matrix (just root transform)
const rootMatrix = geometryPath.getMatrixRange(null, 0, 0);
console.log('Root-only transformation matrix:');
for (let i = 0; i < 4; i++) {
  const row = rootMatrix.slice(i * 4, (i + 1) * 4);
  console.log(`  [${row.map(x => x.toFixed(2)).join(', ')}]`);
}

console.log('\n=== Testing Path Equality ===');

const path1 = new SceneGraphPath(root, childA);
const path2 = new SceneGraphPath(root, childA);
const path3 = new SceneGraphPath(root, camera);

console.log('path1 equals path2:', path1.equals(path2));
console.log('path1 equals path3:', path1.equals(path3));

console.log('\n=== Testing Iteration ===');

console.log('Forward iteration over geometry path:');
for (const node of geometryPath) {
  console.log(`  - ${node.getName()}`);
}

console.log('Reverse iteration over geometry path:');
for (const node of geometryPath.reverseIterator()) {
  console.log(`  - ${node.getName()}`);
}

console.log('\n=== SceneGraphPath Test Complete ===');
