/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's BoundingBoxTraversal class (from BoundingBoxTraversal.java)

import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Transformation } from '../scene/Transformation.js';
import { Geometry } from '../scene/Geometry.js';
import { PointSet } from '../scene/PointSet.js';
import { Cylinder } from '../scene/Cylinder.js';
import { Sphere } from '../scene/Sphere.js';
import { ClippingPlane } from '../scene/ClippingPlane.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { GeometryUtility } from './GeometryUtility.js';
import { Rectangle2D } from '../util/Rectangle2D.js';
import { Rectangle3D } from '../util/Rectangle3D.js';
import * as Rn from '../math/Rn.js';
import * as Pn from '../math/Pn.js';
import { fromDataList } from '../scene/data/DataUtility.js';

/**
 * This class traverses a scene graph starting from the given "root" scene
 * graph component and calculates the 3D bounding box.
 * 
 * At any point of the traversal, there is a current transformation representing
 * the transformation from the root. Call this <i>M</i>. It can be initialized
 * to a value using {@link #setInitialMatrix}. For the following,
 * let the current state of the bounding box during the traversal be denoted by <i>B</i>.
 * 
 * Only instances of {@link Geometry} currently contribute to the bounding box.
 * They can do this in three ways:
 * <ul>
 * <li>When an instance of {@link PointSet} is found,
 * <i>M</i> is applied to its vertices, and <i>B</i> is set to the union of 
 * the bounding box of these points is union-ed with <i>B</i>.</li>
 * <li>Instances of built-in geometries such as {@link Sphere} have built-in bounding boxes
 * which are transformed and union-ed with <i>B</i>
 * <li>If an instance of {@link Geometry} has a geometry attribute with key {@link GeometryUtility#BOUNDING_BOX}
 * then this value is expected to be an instance of {@link Rectangle3D} and is 
 * union-ed with <i>B</i>. This overrides the first option given above.
 * </ul>
 * 
 * One can obtain the bounding box using the methods {@link #getXmin}, etc, or all at once using
 * {@link #getBoundingBox}.
 */
export class BoundingBoxTraversal extends SceneGraphVisitor {
  
  /**
   * @type {Bound} Internal bounding box state
   */
  #bound;
  
  /**
   * @type {number[]} Temporary vector for calculations
   */
  #tmpVec = new Array(4);
  
  /**
   * @type {number[]} Initial transformation matrix
   */
  #initialTrafo = null;
  
  /**
   * @type {number[]} Current transformation matrix
   */
  #currentTrafo = null;
  
  /**
   * @type {BoundingBoxTraversal} Reclaimable subcontext for traversal
   */
  #reclaimableSubcontext = null;
  
  /**
   * Create a new BoundingBoxTraversal
   * @param {BoundingBoxTraversal} [parentContext] - Optional parent context for subcontext creation
   */
  constructor(parentContext = null) {
    super();
    if (parentContext != null) {
      this.initializeFromParentContext(parentContext);
    } else {
      this.#bound = new Bound();
    }
  }
  
  /**
   * Initialize from parent context
   * @param {BoundingBoxTraversal} parentContext - Parent context
   * @protected
   */
  initializeFromParentContext(parentContext) {
    this.#currentTrafo = this.#initialTrafo = parentContext.#currentTrafo;
    this.#bound = parentContext.#bound;
  }
  
  /**
   * Set the initial transformation matrix
   * @param {number[]} initialMatrix - 4x4 transformation matrix (16 elements)
   */
  setInitialMatrix(initialMatrix) {
    this.#initialTrafo = initialMatrix;
  }
  
  /**
   * Get or create a subcontext for traversal
   * @returns {BoundingBoxTraversal}
   * @protected
   */
  subContext() {
    if (this.#reclaimableSubcontext != null) {
      this.#reclaimableSubcontext.initializeFromParentContext(this);
      return this.#reclaimableSubcontext;
    } else {
      return this.#reclaimableSubcontext = new BoundingBoxTraversal(this);
    }
  }
  
  /**
   * Start the traversal of a SceneGraph starting from root
   * @param {SceneGraphComponent} root - Root component to traverse
   */
  traverse(root) {
    if (this.#initialTrafo == null) {
      this.#initialTrafo = new Array(16);
      Rn.setIdentityMatrix(this.#initialTrafo);
    }
    this.#currentTrafo = this.#initialTrafo;
    this.visitComponent(root);
  }
  
  /**
   * Visit a SceneGraphComponent
   * @param {SceneGraphComponent} c - Component to visit
   */
  visitComponent(c) {
    const appearance = c.getAppearance();
    if (appearance != null) {
      const obj = appearance.getAttribute(GeometryUtility.BOUNDING_BOX);
      if (obj != null && obj instanceof Rectangle3D) {
        this.unionBox(obj);
        return;
      }
    }
    if (c.isVisible()) {
      c.childrenAccept(this.subContext());
    }
  }
  
  /**
   * Visit a Transformation
   * @param {Transformation} t - Transformation to visit
   */
  visitTransformation(t) {
    if (this.#initialTrafo === this.#currentTrafo) {
      this.#currentTrafo = new Array(16);
    }
    Rn.copy(this.#currentTrafo, this.#initialTrafo);
    const matrix = t.getMatrix();
    if (Rn.isNan(matrix)) {
      return;
    }
    // Java uses `Rn.times(dst, a, b)` for matrix multiplication.
    // In the JS port, matrix multiplication is `Rn.timesMatrix`.
    Rn.timesMatrix(this.#currentTrafo, this.#currentTrafo, matrix);
  }
  
  /**
   * Visit a Geometry
   * @param {Geometry} g - Geometry to visit
   */
  visitGeometry(g) {
    this.checkForBoundingBox(g);
  }
  
  /**
   * Visit a ClippingPlane (does nothing for bounding box)
   * @param {ClippingPlane} p - Clipping plane to visit
   */
  visitClippingPlane(p) {
    // Clipping planes don't contribute to bounding box
  }
  
  /**
   * Visit a Cylinder
   * @param {Cylinder} c - Cylinder to visit
   */
  visitCylinder(c) {
    // TODO: better to make this by transforming center and a
    // point on the sphere or something like that...
    this.unionBox(Rectangle3D.unitCube);
  }
  
  /**
   * Check if geometry has a bounding box attribute
   * @param {Geometry} g - Geometry to check
   * @returns {boolean} True if bounding box was found and unioned
   * @private
   */
  checkForBoundingBox(g) {
    const bbox = g.getGeometryAttribute(GeometryUtility.BOUNDING_BOX);
    if (bbox != null && bbox instanceof Rectangle3D) {
      const box = bbox;
      if (box === Rectangle3D.EMPTY_BOX) return true;
      this.unionBox(box);
      return true;
    }
    return false;
  }
  
  /**
   * Visit a PointSet
   * @param {PointSet} p - Point set to visit
   */
  visitPointSet(p) {
    // Following code should only be activated if we have listeners installed to update 
    // the bounding box when it goes out of date.
    if (this.checkForBoundingBox(p)) return;
    
    const domain = p.getGeometryAttribute(GeometryUtility.HEIGHT_FIELD_SHAPE);
    if (domain != null && domain instanceof Rectangle2D) {
      const box = domain;
      const coords = p.getVertexAttribute(GeometryAttribute.COORDINATES);
      if (coords == null) return;
      
      const data = fromDataList(coords);
      if (data == null || data.length === 0) return;
      
      // Calculate z bounds from data
      // Java version uses `new double[2][1]` here, because height field coordinates are
      // expected to be 1D (z-values) over a 2D domain. Our Rn.calculateBounds requires
      // bounds[0].length >= fiber length, so initialize with 1D vectors.
      const zbnds = [[0], [0]];
      Rn.calculateBounds(zbnds, data);
      
      // Combine xyz bounds
      const xyzbnds = [[], []];
      xyzbnds[0][0] = box.getMinX();
      xyzbnds[1][0] = box.getMaxX();
      xyzbnds[0][1] = box.getMinY();
      xyzbnds[1][1] = box.getMaxY();
      xyzbnds[0][2] = zbnds[0][0];
      xyzbnds[1][2] = zbnds[1][0];
      
      if (isNaN(xyzbnds[0][0])) {
        throw new Error("NaN");
      }
      const box3 = new Rectangle3D(xyzbnds);
      this.unionBox(box3);
      return;
    }
    
    const vv = p.getVertexAttribute(GeometryAttribute.COORDINATES);
    if (vv == null) {
      // Signal error
      return;
    }
    this.unionVectors(vv);
  }
  
  /**
   * Visit a Sphere
   * @param {Sphere} s - Sphere to visit
   */
  visitSphere(s) {
    // TODO: better to make this by transforming center and a
    // point on the sphere or something like that...
    this.unionBox(Rectangle3D.unitCube);
  }
  
  /**
   * Union vectors from a DataList into the bounding box
   * @param {DataList} dl - DataList containing vertex coordinates
   * @private
   */
  unionVectors(dl) {
    const data = fromDataList(dl);
    if (data == null || data.length === 0) return;
    
    // Java version uses `new double[2][3]` here.
    // Our Rn.calculateBounds requires bounds[0].length >= vector length.
    const tmpVec = [[0, 0, 0], [0, 0, 0]];
    const length = data.length;
    if (length === 0) return;
    
    const vectorLength = data[0].length;
    if (vectorLength < 3 || vectorLength > 4) return;
    
    // Transform vertices by current transformation (modify in place like Java)
    // Java: Rn.matrixTimesVector(data, currentTrafo, data) modifies data in place
    for (let i = 0; i < length; i++) {
      const v = data[i];
      if (vectorLength === 4) {
        // Modify in place: pass v as both dst and src
        Rn.matrixTimesVector(v, this.#currentTrafo, v);
      } else {
        // Extend 3D to 4D homogeneous, transform, then copy back to 3D
        const v4 = [v[0], v[1], v[2], 1];
        const transformed = Rn.matrixTimesVector(null, this.#currentTrafo, v4);
        v[0] = transformed[0];
        v[1] = transformed[1];
        v[2] = transformed[2];
      }
    }
    
    try {
      if (vectorLength === 4) {
        Pn.calculateBounds(tmpVec, data);
      } else if (vectorLength === 3) {
        Rn.calculateBounds(tmpVec, data);
      }
    } catch (e) {
      console.error(e);
    }
    
    if (Rn.isNan(tmpVec[0]) || Rn.isNan(tmpVec[1])) return;
    
    const bound = this.#bound;
    bound.xmin = Math.min(bound.xmin, tmpVec[0][0]);
    bound.xmax = Math.max(bound.xmax, tmpVec[1][0]);
    bound.ymin = Math.min(bound.ymin, tmpVec[0][1]);
    bound.ymax = Math.max(bound.ymax, tmpVec[1][1]);
    bound.zmin = Math.min(bound.zmin, tmpVec[0][2]);
    bound.zmax = Math.max(bound.zmax, tmpVec[1][2]);
  }
  
  /**
   * Union a Rectangle3D bounding box into the current bounding box
   * @param {Rectangle3D} bbox - Bounding box to union
   * @private
   */
  unionBox(bbox) {
    if (bbox.isEmpty()) return;
    const tbox = bbox.transformByMatrix(null, this.#currentTrafo);
    const bnds = tbox.getBounds();
    
    const bound = this.#bound;
    bound.xmin = Math.min(bound.xmin, bnds[0][0]);
    bound.xmax = Math.max(bound.xmax, bnds[1][0]);
    bound.ymin = Math.min(bound.ymin, bnds[0][1]);
    bound.ymax = Math.max(bound.ymax, bnds[1][1]);
    bound.zmin = Math.min(bound.zmin, bnds[0][2]);
    bound.zmax = Math.max(bound.zmax, bnds[1][2]);
  }
  
  /**
   * Get the maximum X coordinate
   * @returns {number}
   */
  getXmax() {
    return this.#bound.xmax;
  }
  
  /**
   * Get the minimum X coordinate
   * @returns {number}
   */
  getXmin() {
    return this.#bound.xmin;
  }
  
  /**
   * Get the maximum Y coordinate
   * @returns {number}
   */
  getYmax() {
    return this.#bound.ymax;
  }
  
  /**
   * Get the minimum Y coordinate
   * @returns {number}
   */
  getYmin() {
    return this.#bound.ymin;
  }
  
  /**
   * Get the maximum Z coordinate
   * @returns {number}
   */
  getZmax() {
    return this.#bound.zmax;
  }
  
  /**
   * Get the minimum Z coordinate
   * @returns {number}
   */
  getZmin() {
    return this.#bound.zmin;
  }
  
  /**
   * Get the center of the bounding box
   * @param {number[]} [c] - Optional array to store result (created if null)
   * @returns {number[]} Center coordinates [x, y, z]
   */
  getBoundingBoxCenter(c) {
    if (c == null) c = new Array(3);
    const bound = this.#bound;
    c[0] = (bound.xmin + bound.xmax) / 2.0;
    c[1] = (bound.ymin + bound.ymax) / 2.0;
    c[2] = (bound.zmin + bound.zmax) / 2.0;
    return c;
  }
  
  /**
   * Convert result into Rectangle3D instance
   * @returns {Rectangle3D}
   */
  getBoundingBox() {
    const rect3d = new Rectangle3D();
    const bnds = rect3d.getBounds();
    const bound = this.#bound;
    
    bnds[0][0] = this.getXmin();
    bnds[1][0] = this.getXmax();
    bnds[0][1] = this.getYmin();
    bnds[1][1] = this.getYmax();
    bnds[0][2] = this.getZmin();
    bnds[1][2] = this.getZmax();
    
    rect3d.setBounds(bnds);
    if (Rn.isNan(bnds[0]) || Rn.isNan(bnds[1])) {
      return Rectangle3D.EMPTY_BOX;
    }
    
    return rect3d;
  }
  
  /**
   * Static convenience method to get bounding box
   * @param {number[]} [initialMatrix] - Optional initial transformation matrix
   * @param {SceneGraphComponent} sgc - Scene graph component to traverse
   * @returns {Rectangle3D}
   */
  static getBoundingBox(initialMatrix, sgc) {
    const bt = new BoundingBoxTraversal();
    if (initialMatrix != null) bt.setInitialMatrix(initialMatrix);
    bt.traverse(sgc);
    return bt.getBoundingBox();
  }
}

/**
 * Internal class for storing bounding box bounds
 * @private
 */
class Bound {
  constructor() {
    this.xmin = this.ymin = this.zmin = Number.MAX_VALUE;
    this.xmax = this.ymax = this.zmax = -Number.MAX_VALUE;
  }
}

