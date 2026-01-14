/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Test program to investigate tessellatedIcosahedronSphere vertex/edge count issue

import { Primitives } from '../Primitives.js';
import { SphereUtility } from '../SphereUtility.js';
import { IndexedFaceSetUtility } from '../IndexedFaceSetUtility.js';
import { GeometryAttribute } from '../../scene/GeometryAttribute.js';
import { fromDataList } from '../../scene/data/DataUtility.js';
import { VariableDataList } from '../../scene/data/VariableDataList.js';

console.log('=== Testing tessellatedIcosahedronSphere ===\n');

// Test level 0 (original icosahedron)
console.log('--- Level 0 (original icosahedron) ---');
const ifs0 = SphereUtility.tessellatedIcosahedronSphere(0);
console.log(`Vertex count: ${ifs0.getNumPoints()}`);
console.log(`Edge count: ${ifs0.getNumEdges()}`);
console.log(`Face count: ${ifs0.getNumFaces()}`);

const verts0 = ifs0.getVertexAttribute(GeometryAttribute.COORDINATES);
if (verts0) {
  console.log(`Vertex coordinates shape: [${verts0.shape.join(', ')}]`);
  const verts0Array = fromDataList(verts0);
  console.log(`Vertex coordinates array length: ${verts0Array.length}`);
}

const edges0 = ifs0.getEdgeAttribute(GeometryAttribute.INDICES);
if (edges0) {
  console.log(`Edge indices shape: [${edges0.shape.join(', ')}]`);
  if (edges0 instanceof VariableDataList) {
    console.log(`Edge indices VariableDataList length: ${edges0.length}`);
  }
  const edges0Array = fromDataList(edges0);
  console.log(`Edge indices array length: ${edges0Array.length}`);
}

const faces0 = ifs0.getFaceAttribute(GeometryAttribute.INDICES);
if (faces0) {
  console.log(`Face indices shape: [${faces0.shape.join(', ')}]`);
  const faces0Array = fromDataList(faces0);
  console.log(`Face indices array length: ${faces0Array.length}`);
}

console.log('\n--- Level 1 (binary refined) ---');
const ifs1 = SphereUtility.tessellatedIcosahedronSphere(1);
console.log(`Vertex count: ${ifs1.getNumPoints()}`);
console.log(`Edge count: ${ifs1.getNumEdges()}`);
console.log(`Face count: ${ifs1.getNumFaces()}`);

const verts1 = ifs1.getVertexAttribute(GeometryAttribute.COORDINATES);
if (verts1) {
  console.log(`Vertex coordinates shape: [${verts1.shape.join(', ')}]`);
  const verts1Array = fromDataList(verts1);
  console.log(`Vertex coordinates array length: ${verts1Array.length}`);
} else {
  console.log('ERROR: No vertex coordinates!');
}

const edges1 = ifs1.getEdgeAttribute(GeometryAttribute.INDICES);
if (edges1) {
  console.log(`Edge indices shape: [${edges1.shape.join(', ')}]`);
  if (edges1 instanceof VariableDataList) {
    console.log(`Edge indices VariableDataList length: ${edges1.length}`);
  }
  const edges1Array = fromDataList(edges1);
  console.log(`Edge indices array length: ${edges1Array.length}`);
} else {
  console.log('ERROR: No edge indices!');
}

const faces1 = ifs1.getFaceAttribute(GeometryAttribute.INDICES);
if (faces1) {
  console.log(`Face indices shape: [${faces1.shape.join(', ')}]`);
  const faces1Array = fromDataList(faces1);
  console.log(`Face indices array length: ${faces1Array.length}`);
} else {
  console.log('ERROR: No face indices!');
}

// Test binaryRefine directly
console.log('\n--- Testing binaryRefine directly ---');
const baseIcosahedron = Primitives.icosahedron();
console.log(`Base icosahedron - Vertices: ${baseIcosahedron.getNumPoints()}, Edges: ${baseIcosahedron.getNumEdges()}, Faces: ${baseIcosahedron.getNumFaces()}`);

const refined = IndexedFaceSetUtility.binaryRefine(baseIcosahedron);
console.log(`After binaryRefine - Vertices: ${refined.getNumPoints()}, Edges: ${refined.getNumEdges()}, Faces: ${refined.getNumFaces()}`);

const refinedVerts = refined.getVertexAttribute(GeometryAttribute.COORDINATES);
if (refinedVerts) {
  const refinedVertsArray = fromDataList(refinedVerts);
  console.log(`Refined vertex coordinates array length: ${refinedVertsArray.length}`);
}

const refinedEdges = refined.getEdgeAttribute(GeometryAttribute.INDICES);
if (refinedEdges) {
  const refinedEdgesArray = fromDataList(refinedEdges);
  console.log(`Refined edge indices array length: ${refinedEdgesArray.length}`);
}

// Check what happens after setVertexCountAndAttribute
console.log('\n--- Testing setVertexCountAndAttribute on refined geometry ---');
const refinedCopy = refined; // Use the same reference
const vertsBefore = refinedCopy.getNumPoints();
const edgesBefore = refinedCopy.getNumEdges();
console.log(`Before setVertexCountAndAttribute - Vertices: ${vertsBefore}, Edges: ${edgesBefore}`);

// This is what SphereUtility does
const coordsData = refinedCopy.getVertexAttribute(GeometryAttribute.COORDINATES);
refinedCopy.setVertexCountAndAttribute(GeometryAttribute.COORDINATES, coordsData);

const vertsAfter = refinedCopy.getNumPoints();
const edgesAfter = refinedCopy.getNumEdges();
console.log(`After setVertexCountAndAttribute - Vertices: ${vertsAfter}, Edges: ${edgesAfter}`);

const edgesAfterData = refinedCopy.getEdgeAttribute(GeometryAttribute.INDICES);
if (edgesAfterData) {
  const edgesAfterArray = fromDataList(edgesAfterData);
  console.log(`Edge indices array length after: ${edgesAfterArray.length}`);
} else {
  console.log('ERROR: Edge indices disappeared after setVertexCountAndAttribute!');
}

