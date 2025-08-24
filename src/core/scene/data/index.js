// JavaScript DataList system for jReality scene graph
// Simplified multidimensional array storage for geometry data

export { DataList } from './DataList.js';
export { VariableDataList } from './VariableDataList.js';

export {
  createVertexList,
  createIndexList,
  createNormalList,
  createColorList,
  createTextureCoordList,
  createQuadMesh,
  createEdgeList,
  createStringList,
  createObjectList,
  createFromNestedArray,
  createPolygonList,
  createPolylineList,
  createMixedFaceList,
  createAdjacencyList,
  createVariableStringList,
  createFaceListFromRegular,
  flattenData
} from './DataListFactory.js';
