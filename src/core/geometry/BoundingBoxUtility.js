/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's BoundingBoxUtility class (from BoundingBoxUtility.java)

import { BoundingBoxTraversal } from './BoundingBoxTraversal.js';
import { GeometryUtility } from './GeometryUtility.js';
import { PointSet } from '../scene/PointSet.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Sphere } from '../scene/Sphere.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { Rectangle3D } from '../util/Rectangle3D.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { fromDataList } from '../scene/data/DataUtility.js';

/**
 * A set of static methods for calculating rectangular bounding boxes in euclidean space
 */
export class BoundingBoxUtility {
  
  /**
   * Calculate the bounding box. Supports multiple overloaded signatures:
   * - calculateBoundingBox(SceneGraphComponent sgc)
   * - calculateBoundingBox(number[] initialMatrix, SceneGraphComponent sgc)
   * - calculateBoundingBox(number[][] verts)
   * - calculateBoundingBox(PointSet ps)
   * - calculateBoundingBox(Sphere sph)
   * 
   * @param {number[]|number[][]|SceneGraphComponent|PointSet|Sphere} arg1 - First argument (type determines behavior)
   * @param {SceneGraphComponent} [arg2] - Optional second argument (SceneGraphComponent if first is matrix)
   * @returns {Rectangle3D}
   */
  static calculateBoundingBox(arg1, arg2) {
    // Overload: calculateBoundingBox(SceneGraphComponent sgc)
    if (arg1 instanceof SceneGraphComponent) {
      const bbt = new BoundingBoxTraversal();
      bbt.traverse(arg1);
      const bbox = bbt.getBoundingBox();
      const bounds = bbox.getBounds();
      if (isNaN(bounds[0][0])) {
        throw new Error("NaN in calculateBoundingBox");
      }
      return bbox;
    }
    
    // Overload: calculateBoundingBox(double[] initialMatrix, SceneGraphComponent sgc)
    if (Array.isArray(arg1) && arg1.length === 16 && arg2 instanceof SceneGraphComponent) {
      const bbt = new BoundingBoxTraversal();
      bbt.setInitialMatrix(arg1);
      bbt.traverse(arg2);
      const bbox = bbt.getBoundingBox();
      const bounds = bbox.getBounds();
      if (isNaN(bounds[0][0])) {
        throw new Error("NaN in calculateBoundingBox");
      }
      console.log('bbox = ', bbox.toString());
      return bbox;
    }
    
    // Overload: calculateBoundingBox(double[][] verts)
    if (Array.isArray(arg1) && arg1.length > 0 && Array.isArray(arg1[0])) {
      return BoundingBoxUtility.calculateBoundingBoxFromVertices(arg1);
    }
    
    // Overload: calculateBoundingBox(PointSet ps)
    if (arg1 instanceof PointSet) {
      return BoundingBoxUtility.calculateBoundingBoxFromPointSet(arg1);
    }
    
    // Overload: calculateBoundingBox(Sphere sph)
    if (arg1 instanceof Sphere) {
      return BoundingBoxUtility.calculateBoundingBoxFromSphere(arg1);
    }
    
    throw new Error(`Invalid arguments to calculateBoundingBox: ${typeof arg1}, ${typeof arg2}`);
  }
  
  /**
   * Calculate the bounding box of the vertices <i>verts</i>. These may be
   * 3- or 4-d points.
   * @param {number[][]} verts - Array of vertices (3D or 4D)
   * @returns {Rectangle3D}
   * @see Pn for details on homogeneous coordinates
   * @private
   */
  static calculateBoundingBoxFromVertices(verts) {
    const bnds = [[], []];
    if (verts.length === 0) {
      return new Rectangle3D();
    }
    
    if (verts[0].length === 4) {
      Pn.calculateBounds(bnds, verts);
    } else {
      Rn.calculateBounds(bnds, verts);
    }
    const r3d = new Rectangle3D();
    r3d.setBounds(bnds);
    return r3d;
  }
  
  /**
   * Calculate the bounding box of a PointSet
   * @param {PointSet} ps - Point set to calculate bounding box for
   * @returns {Rectangle3D}
   */
  static calculateBoundingBoxFromPointSet(ps) {
    const bbox = ps.getGeometryAttribute(GeometryUtility.BOUNDING_BOX);
    if (bbox != null && bbox instanceof Rectangle3D) {
      console.warn("found bbox as GA");
      return bbox;
    }
    const coords = ps.getVertexAttribute(GeometryAttribute.COORDINATES);
    if (coords == null) {
      return new Rectangle3D();
    }
    const verts = fromDataList(coords);
    return BoundingBoxUtility.calculateBoundingBoxFromVertices(verts);
  }
  
  /**
   * Calculate the bounding box of a SceneGraphComponent
   * @param {SceneGraphComponent} sgc - Scene graph component to traverse
   * @returns {Rectangle3D}
   */
  static calculateBoundingBoxFromComponent(sgc) {
    return BoundingBoxUtility.calculateBoundingBox(null, sgc);
  }
  
  /**
   * Calculate the bounding box of a Sphere.
   * Note: This uses a unit cube bounding box. For a more accurate bounding box,
   * use SphereUtility.getSphereBoundingBox() when available.
   * @param {Sphere} sph - Sphere to calculate bounding box for
   * @returns {Rectangle3D}
   */
  static calculateBoundingBoxFromSphere(sph) {
    // TODO: Use SphereUtility.getSphereBoundingBox() when SphereUtility is translated
    // For now, return unit cube (same as BoundingBoxTraversal does)
    return Rectangle3D.unitCube.clone();
  }
  
  /**
   * Calculate the bounding box for the scene graph rooted at <i>sgc</i> but
   * do not apply the transformation, if any, attached to <i>sgc</i>.
   * @param {SceneGraphComponent} sgc - Scene graph component
   * @returns {Rectangle3D}
   */
  static calculateChildrenBoundingBox(sgc) {
    const tmp = new SceneGraphComponent();
    const childCount = sgc.getChildComponentCount();
    for (let i = 0; i < childCount; ++i) {
      tmp.addChild(sgc.getChildComponent(i));
    }
    tmp.setGeometry(sgc.getGeometry());
    return BoundingBoxUtility.calculateBoundingBox(null, tmp);
  }
  
  /**
   * Adds a small value to a dimension of zero extent
   * @param {Rectangle3D} r - Rectangle to modify
   * @returns {Rectangle3D} New rectangle with zero extents replaced
   */
  static removeZeroExtends(r) {
    const e = r.getExtent();
    const bounds = r.getBounds();
    
    if (e[0] < 1e-20) {
      bounds[0][0] = -1e-5;
      bounds[1][0] = 1e-5;
    }
    if (e[1] < 1e-20) {
      bounds[0][1] = -1e-5;
      bounds[1][1] = 1e-5;
    }
    if (e[2] < 1e-20) {
      bounds[0][2] = -1e-5;
      bounds[1][2] = 1e-5;
    }
    
    const result = new Rectangle3D();
    result.setBounds(bounds);
    return result;
  }
}

