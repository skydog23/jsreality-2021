/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Geometric primitives and operations for jsReality
// Port of de.jreality.geometry package

export { GeometryUtility} from './GeometryUtility.js';
export { PointSetFactory } from './PointSetFactory.js';
export { IndexedLineSetFactory } from './IndexedLineSetFactory.js';
export { IndexedFaceSetFactory } from './IndexedFaceSetFactory.js';
export { QuadMeshFactory } from './QuadMeshFactory.js';
export { ParametricSurfaceFactory } from './ParametricSurfaceFactory.js';
export { TubeFactory } from './TubeFactory.js';
export { PolygonalTubeFactory } from './PolygonalTubeFactory.js';
export { FrameFieldType, FrameInfo, octagonalCrossSection, diamondCrossSection, getNgon } from './TubeUtility.js';
export { getSceneGraphRepresentation, getXYZAxes } from './TubeFactorySceneGraph.js';
export { BoundingBoxTraversal } from './BoundingBoxTraversal.js';
export { BoundingBoxUtility } from './BoundingBoxUtility.js';
export { IndexedLineSetUtility } from './IndexedLineSetUtility.js'; 
export { GeometryMergeFactory } from './GeometryMergeFactory.js';
export { BallAndStickFactory } from './BallAndStickFactory.js';
export { Snake } from './Snake.js';
export { PointCollector } from './projective/PointCollector.js';
export { LineUtility } from './projective/LineUtility.js';
export { Abstract1DExtentFactory } from './projective/Abstract1DExtentFactory.js';
export { PointRangeFactory } from './projective/PointRangeFactory.js';export { LinePencilFactory } from './projective/LinePencilFactory.js';
