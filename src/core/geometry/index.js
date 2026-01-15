/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
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
export { BallAndStickFactory } from './BallAndStickFactory.js';
export { Snake } from './Snake.js';
export { PointCollector } from './projective/PointCollector.js';
export { LineUtility } from './projective/LineUtility.js';
export { Abstract1DExtentFactory } from './projective/Abstract1DExtentFactory.js';
export { PointRangeFactory } from './projective/PointRangeFactory.js';