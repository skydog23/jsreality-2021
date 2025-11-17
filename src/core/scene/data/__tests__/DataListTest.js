// Simple test/example file for DataList functionality
// This demonstrates how to use the DataList system

import { 
  DataList, 
  VariableDataList
} from '../index.js';

import {
  createVertexList,
  createPolylineList,
  createMixedFaceList
} from '../../../geometry/GeometryUtility.js';

/**
 * Basic DataList examples
 */
export function testDataList() {
  console.log('=== DataList Test ===');
  
  // Test 1: Simple 1D array
  console.log('\n1. Simple 1D array:');
  const simple1D = new DataList([1, 2, 3, 4, 5], [5], 'int32');
  console.log(simple1D.toString());
  console.log('Item 2:', simple1D.getItem(2)); // Should be 3
  
  // Test 2: 2D array (curve of 3D points)
  console.log('\n2. Curve of 3D points:');
  const curve = new DataList([
    0,0,0,  1,0,0,  2,0,0,  3,0,0
  ], [4, 3], 'float64');
  console.log(curve.toString());
  console.log('Point 1:', curve.getSlice(1)); // Should be [1,0,0]
  console.log('Y coord of point 2:', curve.getItem(2, 1)); // Should be 0
  
  // Test 3: 3D array (quad mesh)
  console.log('\n3. Quad mesh (2x3 grid of 3D points):');
  const mesh = new DataList([
    // Row 0: 3 points
    0,0,0,  1,0,0,  2,0,0,
    // Row 1: 3 points  
    0,1,0,  1,1,0,  2,1,0
  ], [2, 3, 3], 'float64');
  console.log(mesh.toString());
  console.log('Point at row 1, col 2:', mesh.getSlice(1, 2)); // Should be [2,1,0]
  console.log('Entire row 0:', mesh.getSlice(0)); // Should be [0,0,0,1,0,0,2,0,0]
  
  return true;
}

/**
 * Factory function examples
 */
export function testFactories() {
  console.log('\n=== Factory Function Test ===');
  
  // Test vertex list creation
  console.log('\n1. Vertex list from nested array:');
  const vertices = createVertexList([
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0]
  ]);
  console.log(vertices.toString());
  console.log('Vertices as nested array:', vertices.toNestedArray());
  
  // Test creating index data directly
  console.log('\n2. Triangle indices (using DataList directly):');
  const indices = new DataList([0, 1, 2], [1, 3], 'int32');
  console.log(indices.toString());
  console.log('Triangle:', indices.getSlice(0));
  
  // Test quad mesh creation (using DataList directly)
  console.log('\n3. Empty quad mesh (using DataList directly):');
  const quadMesh = new DataList(new Array(3 * 4 * 3).fill(0), [3, 4, 3], 'float64');
  console.log(quadMesh.toString());
  
  // Set some values in the mesh
  quadMesh.setSlice([1, 1, 1], 1, 2); // Set point at row 1, col 2
  console.log('After setting point (1,2):', quadMesh.getSlice(1, 2));
  
  return true;
}

/**
 * Variable-length DataList examples
 */
export function testVariableDataList() {
  console.log('\n=== Variable DataList Test ===');
  
  // Test 1: Mixed polygon faces
  console.log('\n1. Mixed polygon faces (triangles and quads):');
  const mixedFaces = createMixedFaceList([
    [0, 1, 2],        // Triangle
    [3, 4, 5, 6],     // Quad
    [7, 8, 9],        // Triangle
    [10, 11, 12, 13, 14]  // Pentagon
  ]);
  
  console.log(mixedFaces.toString());
  console.log('Face 0 (triangle):', mixedFaces.getRow(0));
  console.log('Face 1 (quad):', mixedFaces.getRow(1));
  console.log('Face 3 (pentagon):', mixedFaces.getRow(3));
  console.log('Stats:', mixedFaces.getStats());
  
  // Test 2: Direct VariableDataList usage
  console.log('\n2. Direct VariableDataList creation:');
  const adjacency = new VariableDataList([
    [1, 3, 5],           // Vertex 0 connected to vertices 1, 3, 5
    [0, 2, 4, 6],        // Vertex 1 connected to 0, 2, 4, 6
    [1, 7],              // Vertex 2 connected to 1, 7
    [0, 8, 9, 10, 11]    // Vertex 3 connected to 0, 8, 9, 10, 11
  ], 'int32');
  
  console.log(adjacency.toString());
  console.log('Vertex 1 neighbors:', adjacency.getRow(1));
  console.log('First neighbor of vertex 3:', adjacency.getItem(3, 0));
  
  // Test 3: Modifying variable data
  console.log('\n3. Modifying variable data:');
  mixedFaces.setItem(1, 2, 99); // Change third vertex of quad
  console.log('Modified quad:', mixedFaces.getRow(1));
  
  mixedFaces.addRow([20, 21, 22]); // Add new triangle
  console.log('After adding triangle:', mixedFaces.getStats());
  console.log('New triangle:', mixedFaces.getRow(mixedFaces.length() - 1));
  
  return true;
}

/**
 * Error handling examples
 */
export function testErrorHandling() {
  console.log('\n=== Error Handling Test ===');
  
  try {
    // Test bounds checking
    const data = new DataList([1, 2, 3, 4], [2, 2]);
    console.log('Valid access:', data.getItem(1, 1));
    
    // This should throw an error
    data.getItem(2, 0); // Row 2 doesn't exist
  } catch (error) {
    console.log('Caught expected error:', error.message);
  }
  
  try {
    // Test size mismatch
    new DataList([1, 2, 3], [2, 2]); // 3 elements, but shape expects 4
  } catch (error) {
    console.log('Caught expected size error:', error.message);
  }
  
  return true;
}

/**
 * Run all tests
 */
export function runAllTests() {
  console.log('Running DataList Tests...\n');
  
  const results = [
    testDataList(),
    testFactories(),
    testVariableDataList(),
    testErrorHandling()
  ];
  
  const passed = results.filter(r => r).length;
  console.log(`\n=== Test Results: ${passed}/${results.length} passed ===`);
  
  return passed === results.length;
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
