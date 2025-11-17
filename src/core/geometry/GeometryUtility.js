/**
 * Utility functions for geometry data processing
 */

import { VariableDataList } from '../scene/data/VariableDataList.js';

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
 * 
 * Note: createVertexList has been moved to DataUtility.toDataList()
 */
export const GeometryUtility = {
  createPolylineList,
  createMixedFaceList
};

export default GeometryUtility;

