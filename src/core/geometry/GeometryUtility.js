/**
 * Utility functions for geometry data processing
 */

import { DataList } from '../scene/data/DataList.js';
import { VariableDataList } from '../scene/data/VariableDataList.js';

/**
 * Create a DataList for vertex coordinates
 * @param {Array|Array<Array>} vertices - Vertex data (flat array or nested)
 * @param {number} [coordsPerVertex=4] - Number of coordinates per vertex (2D=2, 3D=3, 4D=4)
 * @returns {DataList}
 */
export function createVertexList(vertices, coordsPerVertex = 4) {
  const flatData = Array.isArray(vertices[0]) ? vertices.flat() : vertices;
  const numVertices = flatData.length / coordsPerVertex;
  
  if (flatData.length % coordsPerVertex !== 0) {
    throw new Error(`Vertex data length ${flatData.length} not divisible by ${coordsPerVertex}`);
  }
  
  return new DataList(flatData, [numVertices, coordsPerVertex], 'float64');
}

/**
 * Create a VariableDataList for polyline indices (for IndexedLineSet)
 * @param {Array<Array<number>>} polylines - Array of polylines, each with variable vertex indices
 * @returns {VariableDataList}
 */
export function createPolylineList(polylines) {
  if (!Array.isArray(polylines) || polylines.some(p => !Array.isArray(p))) {
    throw new Error('Polylines must be an array of arrays');
  }
  return new VariableDataList(polylines, 'int32');
}

/**
 * Create a VariableDataList for polygon indices (for IndexedFaceSet)
 * @param {Array<Array<number>>} faces - Array of polygons, each with variable vertex indices
 * @returns {VariableDataList}
 */
export function createMixedFaceList(faces) {
  if (!Array.isArray(faces) || faces.some(f => !Array.isArray(f))) {
    throw new Error('Faces must be an array of arrays');
  }
  return new VariableDataList(faces, 'int32');
}

/**
 * GeometryUtility - Collection of utility functions for geometry data processing
 */
export const GeometryUtility = {
  createVertexList,
  createPolylineList,
  createMixedFaceList
};

export default GeometryUtility;

