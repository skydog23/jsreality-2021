/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Utility functions for geometry data processing
 * 
 * Note: Data conversion functions (createVertexList, createPolylineList, createMixedFaceList)
 * have been moved to DataUtility.toDataList()
 */

/**
 * GeometryUtility - Collection of utility functions for geometry data processing
 * 
 * Contains constants for geometry attributes and utility methods.
 */
export const GeometryUtility = {};

/**
 * For setting the bounding box of the geometry.
 * Value: {@link Rectangle3D}
 * @see Geometry#setGeometryAttribute
 */
GeometryUtility.BOUNDING_BOX = "boundingBox";

/**
 * For identifying this IndexedFaceSet as a QuadMesh.
 * Value: {@link Dimension} (width, height)
 * @see Geometry#setGeometryAttribute
 * @see QuadMeshFactory
 */
GeometryUtility.QUAD_MESH_SHAPE = "quadMesh";

/**
 * For identifying this IndexedFaceSet as a QuadMesh with a single
 * value at each point (z-value on a regular x-y 2D domain).
 * Value: {@link Rectangle2D} identifies the 2D domain.
 * @see Geometry#setGeometryAttribute
 * @see HeightFieldFactory
 */
GeometryUtility.HEIGHT_FIELD_SHAPE = "heightField";

/**
 * For setting the metric ({@link Pn}) of the geometry.
 * Value: {@link number} (Integer: Pn.EUCLIDEAN, Pn.HYPERBOLIC, etc.)
 * @see Geometry#setGeometryAttribute
 */
GeometryUtility.METRIC = "metric";

/**
 * For storing the factory that created this geometry.
 * Value: {@link AbstractGeometryFactory}
 * @see Geometry#setGeometryAttribute
 */
GeometryUtility.FACTORY = "factory";

export default GeometryUtility;

