// Factory functions for creating common DataList types
// Provides convenient constructors for typical geometry data

import { DataList } from './DataList.js';
import { VariableDataList } from './VariableDataList.js';

/**
 * Create a DataList for vertex coordinates
 * @param {Array|Array<Array>} vertices - Vertex data (flat array or nested)
 * @param {number} [coordsPerVertex=3] - Number of coordinates per vertex (2D=2, 3D=3, 4D=4)
 * @returns {DataList}
 */
export function createVertexList(vertices, coordsPerVertex = 3) {
  const flatData = Array.isArray(vertices[0]) ? vertices.flat() : vertices;
  const numVertices = flatData.length / coordsPerVertex;
  
  if (flatData.length % coordsPerVertex !== 0) {
    throw new Error(`Vertex data length ${flatData.length} not divisible by ${coordsPerVertex}`);
  }
  
  return new DataList(flatData, [numVertices, coordsPerVertex], 'float64');
}

/**
 * Create a DataList for face indices
 * @param {Array|Array<Array>} indices - Index data (flat array or nested)
 * @param {number} [verticesPerFace=3] - Number of vertices per face (triangles=3, quads=4)
 * @returns {DataList}
 */
export function createIndexList(indices, verticesPerFace = 3) {
  const flatData = Array.isArray(indices[0]) ? indices.flat() : indices;
  const numFaces = flatData.length / verticesPerFace;
  
  if (flatData.length % verticesPerFace !== 0) {
    throw new Error(`Index data length ${flatData.length} not divisible by ${verticesPerFace}`);
  }
  
  return new DataList(flatData, [numFaces, verticesPerFace], 'int32');
}

/**
 * Create a DataList for vertex normals
 * @param {Array|Array<Array>} normals - Normal data (flat array or nested)
 * @returns {DataList}
 */
export function createNormalList(normals) {
  return createVertexList(normals, 3);  // Normals are always 3D
}

/**
 * Create a DataList for vertex colors
 * @param {Array|Array<Array>} colors - Color data (flat array or nested)
 * @param {number} [componentsPerColor=3] - RGB=3, RGBA=4
 * @returns {DataList}
 */
export function createColorList(colors, componentsPerColor = 3) {
  const flatData = Array.isArray(colors[0]) ? colors.flat() : colors;
  const numColors = flatData.length / componentsPerColor;
  
  if (flatData.length % componentsPerColor !== 0) {
    throw new Error(`Color data length ${flatData.length} not divisible by ${componentsPerColor}`);
  }
  
  return new DataList(flatData, [numColors, componentsPerColor], 'float64');
}

/**
 * Create a DataList for texture coordinates
 * @param {Array|Array<Array>} texCoords - Texture coordinate data
 * @param {number} [dimensions=2] - 2D or 3D texture coordinates
 * @returns {DataList}
 */
export function createTextureCoordList(texCoords, dimensions = 2) {
  return createVertexList(texCoords, dimensions);
}

/**
 * Create a DataList for a quadrilateral mesh
 * @param {number} rows - Number of rows in the mesh
 * @param {number} cols - Number of columns in the mesh
 * @param {number} [coordsPerVertex=3] - Coordinates per vertex
 * @param {Array} [data] - Optional initial data (flat array)
 * @returns {DataList}
 */
export function createQuadMesh(rows, cols, coordsPerVertex = 3, data = null) {
  const totalSize = rows * cols * coordsPerVertex;
  const meshData = data || new Array(totalSize).fill(0);
  
  if (meshData.length !== totalSize) {
    throw new Error(`Data size ${meshData.length} doesn't match mesh size ${totalSize}`);
  }
  
  return new DataList(meshData, [rows, cols, coordsPerVertex], 'float64');
}

/**
 * Create a DataList for edge indices (line segments)
 * @param {Array|Array<Array>} edges - Edge data (flat array or nested pairs)
 * @returns {DataList}
 */
export function createEdgeList(edges) {
  return createIndexList(edges, 2);  // Edges always have 2 vertices
}

/**
 * Create a DataList for string attributes
 * @param {Array<string>} strings - Array of strings
 * @returns {DataList}
 */
export function createStringList(strings) {
  return new DataList(strings, [strings.length], 'string');
}

/**
 * Create a DataList for arbitrary object attributes
 * @param {Array} objects - Array of objects
 * @returns {DataList}
 */
export function createObjectList(objects) {
  return new DataList(objects, [objects.length], 'object');
}

/**
 * Create a DataList from nested arrays, automatically detecting shape
 * @param {Array} nestedArray - Nested array structure
 * @param {string} [dataType='float64'] - Data type for the elements
 * @returns {DataList}
 */
export function createFromNestedArray(nestedArray, dataType = 'float64') {
  if (!Array.isArray(nestedArray)) {
    throw new Error('Input must be an array');
  }
  
  // Detect shape by traversing the nested structure
  const shape = [];
  let current = nestedArray;
  
  while (Array.isArray(current)) {
    shape.push(current.length);
    if (current.length === 0) break;
    current = current[0];
  }
  
  // Flatten the nested array
  const flatData = nestedArray.flat(shape.length - 1);
  
  return new DataList(flatData, shape, dataType);
}

/**
 * Create a VariableDataList for polygon indices with variable face sizes
 * @param {Array<Array<number>>} polygons - Array of polygons, each with variable vertex indices
 * @returns {VariableDataList}
 */
export function createPolygonList(polygons) {
  if (!Array.isArray(polygons) || polygons.some(p => !Array.isArray(p))) {
    throw new Error('Polygons must be an array of arrays');
  }
  return new VariableDataList(polygons, 'int32');
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
 * Create a VariableDataList for mixed triangle/quad faces
 * @param {Array<Array<number>>} faces - Mixed triangles ([a,b,c]) and quads ([a,b,c,d])
 * @returns {VariableDataList}
 */
export function createMixedFaceList(faces) {
  return createPolygonList(faces);
}

/**
 * Create a VariableDataList for adjacency information
 * @param {Array<Array<number>>} adjacency - Each row contains neighbor indices for a vertex/face
 * @returns {VariableDataList}
 */
export function createAdjacencyList(adjacency) {
  return new VariableDataList(adjacency, 'int32');
}

/**
 * Create a VariableDataList for string attributes with variable lengths
 * @param {Array<Array<string>>} stringLists - Array of string arrays
 * @returns {VariableDataList}
 */
export function createVariableStringList(stringLists) {
  return new VariableDataList(stringLists, 'string');
}

/**
 * Convert regular triangular/quad faces to variable-length format
 * @param {Array|Array<Array>} faces - Regular face data
 * @param {number} verticesPerFace - Fixed number of vertices per face
 * @returns {VariableDataList}
 */
export function createFaceListFromRegular(faces, verticesPerFace) {
  const flatData = Array.isArray(faces[0]) ? faces : [];
  
  if (flatData.length === 0) {
    // Convert flat array to nested
    const flat = faces;
    for (let i = 0; i < flat.length; i += verticesPerFace) {
      flatData.push(flat.slice(i, i + verticesPerFace));
    }
  }
  
  return createPolygonList(flatData);
}

/**
 * Utility to validate and convert input data to flat format
 * @param {Array|Array<Array>} data - Input data
 * @param {number} expectedItemSize - Expected size of each item
 * @returns {Array} Flat array
 */
export function flattenData(data, expectedItemSize) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }
  
  if (data.length === 0) {
    return [];
  }
  
  // Check if already flat
  if (typeof data[0] === 'number') {
    if (data.length % expectedItemSize !== 0) {
      throw new Error(`Flat data length ${data.length} not divisible by item size ${expectedItemSize}`);
    }
    return data;
  }
  
  // Flatten nested array
  const flatData = data.flat();
  if (flatData.length % expectedItemSize !== 0) {
    throw new Error(`Flattened data length ${flatData.length} not divisible by item size ${expectedItemSize}`);
  }
  
  return flatData;
}
