/**
 * JavaScript port/translation of jReality's PickUtility class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Appearance, INHERITED } from '../scene/Appearance.js';
import { Geometry } from '../scene/Geometry.js';
import { IndexedFaceSet } from '../scene/IndexedFaceSet.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import { AABBTree } from '../scene/pick/AABBTree.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';

/**
 * Utility class for picking operations.
 */
export class PickUtility {
  /**
   * Geometry attribute key for AABB tree
   * @type {string}
   */
  static AABB_TREE = 'AABBTree';
  
  /**
   * Default triangles per box
   * @type {number}
   */
  static DEFAULT_TRIANGLES_PER_BOX = 10;
  
  /**
   * Private constructor - all methods are static
   */
  constructor() {
    throw new Error('PickUtility is a static utility class');
  }
  
  /**
   * Assign AABB tree to a face set
   * @param {IndexedFaceSet} ifs - Face set
   */
  static assignFaceAABBTree(ifs) {
    PickUtility.assignFaceAABBTree(ifs, PickUtility.DEFAULT_TRIANGLES_PER_BOX);
  }
  
  /**
   * Assign AABB tree to a face set with custom max triangles per box
   * @param {IndexedFaceSet} ifs - Face set
   * @param {number} maxTrianglesPerBox - Maximum triangles per box
   */
  static assignFaceAABBTree(ifs, maxTrianglesPerBox) {
    if (ifs.getNumFaces() === 0) return;
    const tree = AABBTree.construct(ifs, maxTrianglesPerBox);
    ifs.setGeometryAttribute(PickUtility.AABB_TREE, tree);
  }
  
  /**
   * Assign AABB trees to all face sets in a component tree
   * @param {SceneGraphComponent} comp - Root component
   */
  static assignFaceAABBTrees(comp) {
    PickUtility.assignFaceAABBTrees(comp, PickUtility.DEFAULT_TRIANGLES_PER_BOX);
  }
  
  /**
   * Assign AABB trees to all face sets in a component tree with custom max triangles per box
   * @param {SceneGraphComponent} comp - Root component
   * @param {number} maxTrianglesPerBox - Maximum triangles per box
   */
  static assignFaceAABBTrees(comp, maxTrianglesPerBox) {
    comp.accept(new class extends SceneGraphVisitor {
      visit(c) {
        if (c.getGeometry() !== null) {
          if (c.getGeometry() instanceof IndexedFaceSet) {
            PickUtility.assignFaceAABBTree(c.getGeometry(), maxTrianglesPerBox);
          }
        }
        c.childrenAccept(this);
      }
    });
  }
  
  /**
   * Set pickable attribute on a component (deprecated - use SceneGraphComponent.setPickable)
   * Can be called with 2 or 4 arguments:
   * - setPickable(cmp, pickable) - Simple boolean
   * - setPickable(cmp, pickPoints, pickEdges, pickFaces) - Separate flags
   * 
   * @deprecated Use SceneGraphComponent.setPickable(boolean)
   * @param {SceneGraphComponent} cmp - Component
   * @param {boolean} arg2 - Whether component is pickable, or pickPoints if 4 args
   * @param {boolean} [arg3] - pickEdges (if 4 args)
   * @param {boolean} [arg4] - pickFaces (if 4 args)
   */
  static setPickable(cmp, arg2, arg3, arg4) {
    if (cmp.getAppearance() === null) {
      cmp.setAppearance(new Appearance());
    }
    
    if (arg3 === undefined && arg4 === undefined) {
      // Called as setPickable(cmp, pickable)
      cmp.getAppearance().setAttribute(CommonAttributes.PICKABLE, arg2);
    } else {
      // Called as setPickable(cmp, pickPoints, pickEdges, pickFaces)
      cmp.getAppearance().setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.PICKABLE, arg2);
      cmp.getAppearance().setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.PICKABLE, arg3);
      cmp.getAppearance().setAttribute(CommonAttributes.POLYGON_SHADER + '.' + CommonAttributes.PICKABLE, arg4);
    }
  }
  
  /**
   * Set pickable attribute on geometry
   * @param {Geometry} g - Geometry
   * @param {boolean} pickable - Whether geometry is pickable
   */
  static setGeometryPickable(g, pickable) {
    g.setGeometryAttribute(CommonAttributes.PICKABLE, pickable);
  }
}

