/**
 * JavaScript port/translation of jReality's AABBPickSystem class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Our pick system implementation. Uses Brute-force as default
 * and AABBTrees if available.
 * 
 * @author Steffen Weissmann
 */

import { Matrix } from '../../math/Matrix.js';
import * as P3 from '../../math/P3.js';
import * as Pn from '../../math/Pn.js';
import * as Rn from '../../math/Rn.js';
import { Appearance, INHERITED } from '../Appearance.js';
import { Camera } from '../Camera.js';
import { Cylinder } from '../Cylinder.js';
import { Geometry } from '../Geometry.js';
import { IndexedFaceSet } from '../IndexedFaceSet.js';
import { IndexedLineSet } from '../IndexedLineSet.js';
import { PointSet } from '../PointSet.js';
import { SceneGraphComponent } from '../SceneGraphComponent.js';
import { SceneGraphPath } from '../SceneGraphPath.js';
import { SceneGraphVisitor } from '../SceneGraphVisitor.js';
import { Sphere } from '../Sphere.js';
import { Viewer } from '../Viewer.js';
import * as CommonAttributes from '../../shader/CommonAttributes.js';
import * as CameraUtility from '../../util/CameraUtility.js';
import { PickUtility } from '../../util/PickUtility.js';
import { Graphics3D } from './Graphics3D.js';
import { AABBTree } from './AABBTree.js';
import { Hit } from './Hit.js';
import { PickResult } from './PickResult.js';
import { HitFilter } from './HitFilter.js';
import * as BruteForcePicking from './BruteForcePicking.js';
import { getLogger, Category } from '../../util/LoggingSystem.js';

// Module-level logger shared by AABBPickSystem and Impl
const logger = getLogger('AABBPickSystem');

/**
 * Simple scaling factor calculation for world coordinates.
 * For now, returns 1.0 (Euclidean metric).
 * TODO: Implement proper scaling for non-Euclidean metrics
 * @param {number[]} o2w - Object to world transformation matrix
 * @param {number} metric - Metric type
 * @returns {number} Scaling factor
 */
function getScalingFactor(o2w, metric) {
  // For Euclidean metric, scaling is 1.0
  // For other metrics, this would need proper implementation
  if (metric === Pn.EUCLIDEAN) {
    return 1.0;
  }
  // TODO: Implement proper scaling for HYPERBOLIC and ELLIPTIC metrics
  // For now, return 1.0 as approximation
  return 1.0;
}

/**
 * PickInfo class - avoids using effective appearance by directly reading Appearances
 * @private
 */
class PickInfo {
  /**
   * @type {boolean}
   */
  pickPoints = true;
  
  /**
   * @type {boolean}
   */
  drawVertices = true;
  
  /**
   * @type {boolean}
   */
  pickEdges = true;
  
  /**
   * @type {boolean}
   */
  drawEdges = true;
  
  /**
   * @type {boolean}
   */
  pickFaces = true;
  
  /**
   * @type {boolean}
   */
  drawFaces = true;
  
  /**
   * @type {boolean}
   */
  pointRadiiWorldCoords = false;
  
  /**
   * @type {boolean}
   */
  tubeRadiiWorldCoords = false;
  
  /**
   * @type {boolean}
   */
  hasNewPickInfo = false;
  
  /**
   * @type {number}
   */
  tubeRadius = CommonAttributes.TUBE_RADIUS_DEFAULT;
  
  /**
   * @type {number}
   */
  pointRadius = CommonAttributes.POINT_RADIUS_DEFAULT;
  
  /**
   * @type {number}
   */
  metric;
  
  /**
   * Create a new PickInfo
   * @param {PickInfo|null} old - Previous pick info (for inheritance)
   * @param {Appearance|null} ap - Appearance to read from
   * @param {number} defaultMetric - Default metric
   */
  constructor(old, ap, defaultMetric) {
    if (old !== null) {
      this.drawVertices = old.drawVertices;
      this.drawEdges = old.drawEdges;
      this.drawFaces = old.drawFaces;
      this.pickPoints = old.pickPoints;
      this.pickEdges = old.pickEdges;
      this.pickFaces = old.pickFaces;
      this.tubeRadius = old.tubeRadius;
      this.pointRadius = old.pointRadius;
      this.pointRadiiWorldCoords = old.pointRadiiWorldCoords;
      this.tubeRadiiWorldCoords = old.tubeRadiiWorldCoords;
      this.metric = old.metric;
    } else {
      this.metric = defaultMetric;
    }
    
    if (ap === null) return;
    
    let foo = ap.getAttribute(CommonAttributes.VERTEX_DRAW, Boolean);
    if (foo !== INHERITED) {
      this.hasNewPickInfo = true;
      this.pickPoints = this.drawVertices = Boolean(foo);
    }
    
    foo = ap.getAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.PICKABLE, Boolean);
    if (foo !== INHERITED) {
      this.hasNewPickInfo = true;
      this.pickPoints = Boolean(foo);
    }
    
    foo = ap.getAttribute(CommonAttributes.EDGE_DRAW, Boolean);
    if (foo !== INHERITED) {
      this.hasNewPickInfo = true;
      this.pickEdges = this.drawEdges = Boolean(foo);
    }
    if (this.drawEdges) {
      foo = ap.getAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.PICKABLE, Boolean);
      if (foo !== INHERITED) {
        this.hasNewPickInfo = true;
        this.pickEdges = Boolean(foo);
      }
    }
    
    foo = ap.getAttribute(CommonAttributes.FACE_DRAW, Boolean);
    if (foo !== INHERITED) {
      this.hasNewPickInfo = true;
      this.pickFaces = this.drawFaces = Boolean(foo);
    }
    if (this.drawFaces) {
      foo = ap.getAttribute(CommonAttributes.POLYGON_SHADER + '.' + CommonAttributes.PICKABLE, Boolean);
      if (foo !== INHERITED) {
        this.hasNewPickInfo = true;
        this.pickFaces = Boolean(foo);
      }
    }
    
    foo = ap.getAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.POINT_RADIUS, Number);
    if (foo !== INHERITED) {
      this.hasNewPickInfo = true;
      this.pointRadius = Number(foo);
    } else {
      foo = ap.getAttribute(CommonAttributes.POINT_RADIUS, Number);
      if (foo !== INHERITED) {
        this.hasNewPickInfo = true;
        this.pointRadius = Number(foo);
      }
    }
    
    foo = ap.getAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.TUBE_RADIUS, Number);
    if (foo !== INHERITED) {
      this.hasNewPickInfo = true;
      this.tubeRadius = Number(foo);
    } else {
      foo = ap.getAttribute(CommonAttributes.TUBE_RADIUS, Number);
      if (foo !== INHERITED) {
        this.hasNewPickInfo = true;
        this.tubeRadius = Number(foo);
      }
    }
    
    foo = ap.getAttribute(CommonAttributes.METRIC, Number);
    if (foo !== INHERITED) {
      this.hasNewPickInfo = true;
      this.metric = Number(foo);
    }
    
    foo = ap.getAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.RADII_WORLD_COORDINATES, Boolean);
    if (foo !== INHERITED) {
      this.hasNewPickInfo = true;
      this.pointRadiiWorldCoords = Boolean(foo);
    }
    
    foo = ap.getAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.RADII_WORLD_COORDINATES, Boolean);
    if (foo !== INHERITED) {
      this.hasNewPickInfo = true;
      this.tubeRadiiWorldCoords = Boolean(foo);
    }
    
    foo = ap.getAttribute(CommonAttributes.RADII_WORLD_COORDINATES, Boolean);
    if (foo !== INHERITED) {
      this.hasNewPickInfo = true;
      this.pointRadiiWorldCoords = Boolean(foo);
      this.tubeRadiiWorldCoords = Boolean(foo);
    }
  }
  
  /**
   * String representation
   * @returns {string}
   */
  toString() {
    return `Pick vef = ${this.pickPoints} ${this.pickEdges} ${this.pickFaces} ${this.pointRadius} ${this.tubeRadius}`;
  }
}

/**
 * Implementation of PickSystem using AABB trees for optimization.
 * @implements {PickSystem}
 */
export class AABBPickSystem {
  /**
   * @type {Impl|null}
   */
  #impl = null;
  
  /**
   * @type {SceneGraphComponent|null}
   */
  #root = null;
  
  /**
   * @type {Hit[]}
   */
  #hits = [];
  
  /**
   * @type {Map<IndexedFaceSet, AABBTree>}
   */
  #aabbTreeExists = new Map();
  
  /**
   * @type {Map<Geometry, boolean>}
   */
  #isPickableMap = new Map();
  
  /**
   * @type {Function}
   */
  #cmp = Hit.HitComparator.prototype.compare.bind(new Hit.HitComparator());
  
  /**
   * @type {number[]|null}
   */
  #from = null;
  
  /**
   * @type {number[]|null}
   */
  #to = null;
  
  /**
   * @type {number}
   */
  #pointRadiusFactor = 1.0;
  
  /**
   * @type {number}
   */
  #tubeRadiusFactor = 1.0;
  
  /**
   * @type {number}
   */
  #metric = Pn.EUCLIDEAN;
  /**
   * Set the scene root
   * @param {SceneGraphComponent} root - Scene root
   */
  setSceneRoot(root) {
    this.#impl = new Impl(this);
    this.#root = root;
  }
  
  /**
   * Compute pick results
   * @param {number[]} f - Ray start point in world coordinates
   * @param {number[]} t - Ray end point in world coordinates
   * @returns {PickResult[]} List of pick results sorted by distance
   */
  computePick(f, t) {
    this.#from = [...f];
    this.#to = [...t];
    this.#hits = [];
    
    // Get metric from root appearance
    if (this.#root.getAppearance() !== null) {
      const sig = this.#root.getAppearance().getAttribute(CommonAttributes.METRIC, Number);
      if (typeof sig === 'number') {
        this.#metric = sig;
      }
    } else {
      this.#metric = Pn.EUCLIDEAN;
    }
    
    // Start traversal of the scene graph. We deliberately avoid overriding
    // SceneGraphVisitor.visit() to prevent infinite recursion via
    // Transformation.accept -> visitor.visitTransformation -> visitor.visit().
    this.#impl.startTraversal();
    
    logger.fine(Category.SCENE, `computePick: hits: ${this.#hits.length}`);

    if (this.#hits.length === 0) {
      return [];
    }
    
    // Sort hits by distance
    this.#hits.sort(this.#cmp);
    return [...this.#hits];
  }
  
  /**
   * Get hits array (for internal use)
   * @returns {Hit[]}
   */
  getHits() {
    return this.#hits;
  }
  
  /**
   * Get from point (for internal use)
   * @returns {number[]}
   */
  getFrom() {
    return this.#from;
  }
  
  /**
   * Get to point (for internal use)
   * @returns {number[]}
   */
  getTo() {
    return this.#to;
  }
  
  /**
   * Get metric (for internal use)
   * @returns {number}
   */
  getMetric() {
    return this.#metric;
  }
  
  /**
   * Get point radius factor (for internal use)
   * @returns {number}
   */
  getPointRadiusFactor() {
    return this.#pointRadiusFactor;
  }
  
  /**
   * Set point radius factor (for internal use)
   * @param {number} factor - Factor
   */
  setPointRadiusFactor(factor) {
    this.#pointRadiusFactor = factor;
  }
  
  /**
   * Get tube radius factor (for internal use)
   * @returns {number}
   */
  getTubeRadiusFactor() {
    return this.#tubeRadiusFactor;
  }
  
  /**
   * Set tube radius factor (for internal use)
   * @param {number} factor - Factor
   */
  setTubeRadiusFactor(factor) {
    this.#tubeRadiusFactor = factor;
  }
  
  /**
   * Get AABB tree cache (for internal use)
   * @returns {Map<IndexedFaceSet, AABBTree>}
   */
  getAABBTreeCache() {
    return this.#aabbTreeExists;
  }
  
  /**
   * Get pickable map (for internal use)
   * @returns {Map<Geometry, boolean>}
   */
  getPickableMap() {
    return this.#isPickableMap;
  }
  
  /**
   * Get root (for internal use)
   * @returns {SceneGraphComponent|null}
   */
  getRoot() {
    return this.#root;
  }
}

/**
 * Scene graph visitor implementation for picking
 * @private
 */
class Impl extends SceneGraphVisitor {
  /**
   * @type {AABBPickSystem}
   */
  #pickSystem;
  
  /**
   * @type {PickInfo[]}
   */
  #appStack = [];
  
  /**
   * @type {PickInfo|null}
   */
  #currentPI = null;
  
  /**
   * @type {SceneGraphPath}
   */
  #path = new SceneGraphPath();
  
  /**
   * @type {Hit[]}
   */
  #localHits = [];
  
  /**
   * @type {Matrix}
   */
  #m = new Matrix();
  
  /**
   * @type {Matrix}
   */
  #mInv = new Matrix();
  
  /**
   * @type {Matrix[]}
   */
  #matrixStack = new Array(256);
  
  /**
   * @type {number}
   */
  #stackCounter = 0;
  
  /**
   * Create new Impl
   * @param {AABBPickSystem} pickSystem - Pick system instance
   */
  constructor(pickSystem) {
    super();
    this.#pickSystem = pickSystem;
    this.#appStack.push(this.#currentPI = new PickInfo(null, null, pickSystem.getMetric()));
  }
  
  /**
   * Visit scene graph component
   * @param {SceneGraphComponent} c - Component
   */
  visitComponent(c) {
    if (!c.isVisible() || !c.isPickable()) {
      return;
    }
    // Log under the SCENE category (Category.PICKING does not exist in LoggingSystem,
    // which would otherwise cause all such messages to be filtered out).
    logger.fine(Category.SCENE, `visitComponent: ${c.getName()} this.#stackCounter: ${this.#stackCounter}`);
    let pickInfo = null;
    this.#path.push(c);
    
    if (c.getTransformation() !== null) {
      // Ensure the next matrix on the stack is allocated. The array is initially
      // filled with undefined entries, so we must treat both null and undefined
      // as "not initialized" here.
      if (!this.#matrixStack[this.#stackCounter + 1]) {
        this.#matrixStack[this.#stackCounter + 1] = new Matrix();
      }
      const nextMatrix = this.#matrixStack[this.#stackCounter + 1].getArray();
      const currentMatrix = this.#matrixStack[this.#stackCounter].getArray();
      const transformMatrix = c.getTransformation().getMatrix();
      Rn.timesMatrix(nextMatrix, currentMatrix, transformMatrix);
      this.#stackCounter++;
      this.#m = this.#matrixStack[this.#stackCounter];
      this.#mInv = this.#m.getInverse();
    }
    
    if (c.getAppearance() !== null) {
  
      
      pickInfo = new PickInfo(this.#currentPI, c.getAppearance(), this.#pickSystem.getMetric());
      logger.fine(Category.SCENE, `pickInfo: ${pickInfo.toString()}`);
      if (pickInfo.hasNewPickInfo) {
        this.#appStack.push(this.#currentPI = pickInfo);
      }
      
      if (pickInfo.pointRadiiWorldCoords) {
        const o2w = this.#path.getMatrix();
        const factor = getScalingFactor(o2w, pickInfo.metric);
        this.#pickSystem.setPointRadiusFactor(1.0 / factor);
      }
      if (pickInfo.tubeRadiiWorldCoords) {
        const o2w = this.#path.getMatrix();
        const factor = getScalingFactor(o2w, pickInfo.metric);
        this.#pickSystem.setTubeRadiusFactor(1.0 / factor);
      }
    }
    
    if (this.#currentPI.pointRadiiWorldCoords) {
      const o2w = this.#path.getMatrix();
      const factor = getScalingFactor(o2w, this.#currentPI.metric);
      this.#pickSystem.setPointRadiusFactor(1.0 / factor);
    } else {
      this.#pickSystem.setPointRadiusFactor(1.0);
    }
    
    if (this.#currentPI.tubeRadiiWorldCoords) {
      const o2w = this.#path.getMatrix();
      const factor = getScalingFactor(o2w, this.#currentPI.metric);
      this.#pickSystem.setTubeRadiusFactor(1.0 / factor);
    } else {
      this.#pickSystem.setTubeRadiusFactor(1.0);
    }
    
    c.childrenAccept(this);
    
    if (c.getAppearance() !== null && pickInfo !== null && pickInfo.hasNewPickInfo) {
      this.#appStack.pop();
      this.#currentPI = this.#appStack[this.#appStack.length - 1];
    }
    
    if (c.getTransformation() !== null) {
      this.#stackCounter--;
      this.#m = this.#matrixStack[this.#stackCounter];
      this.#mInv = this.#m.getInverse();
    }
    
    this.#path.pop();
  }
  
  /**
   * Check if geometry is pickable
   * @private
   * @param {Geometry} g - Geometry
   * @returns {boolean}
   */
  #isPickable(g) {
    const boo = this.#pickSystem.getPickableMap().get(g);
    if (boo === undefined) {
      const o = g.getGeometryAttribute(CommonAttributes.PICKABLE);
      const isPickable = !(o !== null && o === false);
      this.#pickSystem.getPickableMap().set(g, isPickable);
      return isPickable;
    }
    return boo;
  }
  
  /**
   * Start visiting the scene graph from the pick system's root.
   * We use a dedicated entrypoint instead of overriding SceneGraphVisitor.visit()
   * to avoid recursive calls from Transformation.accept/visitTransformation.
   */
  startTraversal() {
    this.#stackCounter = 0;
    this.#matrixStack[0] = new Matrix();
    this.#pickSystem.getAABBTreeCache().clear();
    this.#pickSystem.getPickableMap().clear();
    this.#path.clear();
    const root = this.#pickSystem.getRoot();
    if (root !== null) {
      this.visitComponent(root);
    }
  }
  
  /**
   * Get root (for internal use)
   * @returns {SceneGraphComponent|null}
   */
  getRoot() {
    return this.#pickSystem.getRoot();
  }
  
  /**
   * Visit sphere
   * @param {Sphere} s - Sphere
   */
  visitSphere(s) {
    if (!this.#currentPI.pickFaces || !this.#isPickable(s)) {
      return;
    }
    
    this.#localHits = [];
    BruteForcePicking.intersectSphere(s, this.#pickSystem.getMetric(), this.#path, this.#m, this.#mInv,
      this.#pickSystem.getFrom(), this.#pickSystem.getTo(), this.#localHits);
    this.#extractHits(this.#localHits);
  }
  
  /**
   * Visit cylinder
   * @param {Cylinder} c - Cylinder
   */
  visitCylinder(c) {
    if (!this.#currentPI.pickFaces || !this.#isPickable(c)) {
      return;
    }
    
    this.#localHits = [];
    BruteForcePicking.intersectCylinder(c, this.#pickSystem.getMetric(), this.#path, this.#m, this.#mInv,
      this.#pickSystem.getFrom(), this.#pickSystem.getTo(), this.#localHits);
    this.#extractHits(this.#localHits);
  }
  
  /**
   * Visit indexed face set
   * @param {IndexedFaceSet} ifs - Face set
   */
  visitIndexedFaceSet(ifs) {
    if (!this.#isPickable(ifs)) {
      return;
    }
    logger.fine(Category.SCENE, `visitIndexedFaceSet: ${ifs.getName()}`);
    // Visit as line set (for edges)
    this.visitIndexedLineSet(ifs);
    
    if (!this.#currentPI.pickFaces) {
      return;
    }
    
    let tree = this.#pickSystem.getAABBTreeCache().get(ifs);
    if (tree === undefined) {
      // Not yet processed
      tree = ifs.getGeometryAttribute(PickUtility.AABB_TREE);
      if (tree === null || tree === undefined) {
        tree = AABBTree.nullTree;
      }
      this.#pickSystem.getAABBTreeCache().set(ifs, tree);
    }
    
    this.#localHits = [];
    logger.fine(Category.SCENE, `visitIndexedFaceSet: tree: ${tree}`);
    if (tree === AABBTree.nullTree) {
      BruteForcePicking.intersectPolygons(ifs, this.#pickSystem.getMetric(), this.#path, this.#m, this.#mInv,
        this.#pickSystem.getFrom(), this.#pickSystem.getTo(), this.#localHits);
    } else {
      tree.intersect(ifs, this.#pickSystem.getMetric(), this.#path, this.#m, this.#mInv,
        this.#pickSystem.getFrom(), this.#pickSystem.getTo(), this.#localHits);
    }
    logger.fine(Category.SCENE, `visitIndexedFaceSet: localHits: ${this.#localHits.length}`);
    this.#extractHits(this.#localHits);
  }
  
  /**
   * Visit indexed line set
   * @param {IndexedLineSet} ils - Line set
   */
  visitIndexedLineSet(ils) {
    if (!this.#isPickable(ils)) {
      return;
    }
    
    // Visit as point set (for points)
    this.visitPointSet(ils);
    
    if (!this.#currentPI.pickEdges) {
      return;
    }
    
    this.#localHits = [];
    BruteForcePicking.intersectEdges(ils, this.#pickSystem.getMetric(), this.#path, this.#m, this.#mInv,
      this.#pickSystem.getFrom(), this.#pickSystem.getTo(),
      this.#currentPI.tubeRadius * this.#pickSystem.getTubeRadiusFactor(), this.#localHits);
    this.#extractHits(this.#localHits);
  }
  
  /**
   * Visit point set
   * @param {PointSet} ps - Point set
   */
  visitPointSet(ps) {
    if (!this.#currentPI.pickPoints || !this.#isPickable(ps)) {
      return;
    }
    
    this.#localHits = [];
    BruteForcePicking.intersectPoints(ps, this.#pickSystem.getMetric(), this.#path, this.#m, this.#mInv,
      this.#pickSystem.getFrom(), this.#pickSystem.getTo(),
      this.#currentPI.pointRadius * this.#pickSystem.getPointRadiusFactor(), this.#localHits);
    this.#extractHits(this.#localHits);
  }
  
  /**
   * Extract hits from local hits list (filter by affine coordinate)
   * @private
   * @param {Hit[]} l - Local hits
   */
  #extractHits(l) {
    for (const h of l) {
      if (h.getAffineCoordinate() < 0) {
        continue;
      }
      this.#pickSystem.getHits().push(h);
    }
  }
}

/**
 * Calculate the segment of the line spanned by from and to which lies within the viewing frustum.
 * We assume the from lies on the near plane of the frustum. from and to are assumed to be in world coordinates.
 * @param {number[]} from - Ray start point
 * @param {number[]} to - Ray end point
 * @param {Viewer} viewer - Viewer
 */
export function getFrustumInterval(from, to, viewer) {
  const cam = CameraUtility.getCamera(viewer);
  if (!cam.isPerspective()) {
    return;
  }
  
  const c2w = viewer.getCameraPath().getMatrix();
  const eyeW = Rn.matrixTimesVector(null, c2w, cam.isPerspective() ? P3.originP3 : Pn.zDirectionP3);
  const gc = new Graphics3D(viewer);
  const w2ndc = gc.getWorldToNDC();
  const fromndc = Rn.matrixTimesVector(null, w2ndc, from);
  Pn.dehomogenize(fromndc, fromndc);
  const tondc = Rn.matrixTimesVector(null, w2ndc, to);
  Pn.dehomogenize(tondc, tondc);
  const v = Rn.subtract(null, tondc, fromndc);
  const zto = v[2];
  const tondc2 = Rn.linearCombination(null, zto, fromndc, 2, v);
  const ndc2w = gc.getNDCToWorld();
  Pn.dehomogenize(to, Rn.matrixTimesVector(null, ndc2w, tondc2));
  const weights = P3.barycentricCoordinates(null, from, to, eyeW);
  if (weights[0] * weights[1] > 0) {
    Rn.times(to, -1, to);
  }
}

/**
 * Filter pick results using a hit filter
 * @param {HitFilter} hf - Hit filter
 * @param {number[]} from - Ray start point
 * @param {number[]} to - Ray end point
 * @param {PickResult[]} list - List of pick results (modified in place)
 */
export function filterList(hf, from, to, list) {
  const rejected = [];
  for (const h of list) {
    if (!hf.accept(from, to, h)) {
      rejected.push(h);
    }
  }
  for (const h of rejected) {
    const index = list.indexOf(h);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }
}

