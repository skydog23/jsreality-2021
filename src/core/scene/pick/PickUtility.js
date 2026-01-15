/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { Appearance, INHERITED } from '../Appearance.js';
import { Geometry } from '../Geometry.js';
import { IndexedFaceSet } from '../IndexedFaceSet.js';
import { SceneGraphComponent } from '../SceneGraphComponent.js';
import { SceneGraphVisitor } from '../SceneGraphVisitor.js';
import { AABBTree } from './AABBTree.js';
import * as CommonAttributes from '../../shader/CommonAttributes.js';

/**
 * Utility class for picking operations.
 * Provides methods for assigning AABB trees to geometries and managing pickable attributes.
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
   * Assign AABB tree to a face set.
   * @param {IndexedFaceSet} ifs - Face set
   * @param {number} [maxTrianglesPerBox=DEFAULT_TRIANGLES_PER_BOX] - Maximum triangles per box
   */
  static assignFaceAABBTree(ifs, maxTrianglesPerBox = PickUtility.DEFAULT_TRIANGLES_PER_BOX) {
    if (ifs.getNumFaces() === 0) return;
    ifs.setGeometryAttribute(PickUtility.AABB_TREE, AABBTree.construct(ifs, maxTrianglesPerBox));
  }
  
  /**
   * Assign AABB trees to all face sets in a component tree.
   * @param {SceneGraphComponent} comp - Root component
   * @param {number} [maxTrianglesPerBox=DEFAULT_TRIANGLES_PER_BOX] - Maximum triangles per box
   */
  static assignFaceAABBTrees(comp, maxTrianglesPerBox = PickUtility.DEFAULT_TRIANGLES_PER_BOX) {
    comp.accept(new class extends SceneGraphVisitor {
      visitComponent(c) {
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
   * Set pickable attributes. Can be called in three ways:
   * 1. setPickable(cmp, pickable) - Simple boolean for SceneGraphComponent (deprecated)
   * 2. setPickable(cmp, pickPoints, pickEdges, pickFaces) - Separate flags for SceneGraphComponent
   * 3. setPickable(geometry, pickable) - For Geometry objects
   * 
   * @param {SceneGraphComponent|Geometry} firstArg - Component or Geometry
   * @param {boolean} arg2 - Pickable flag, or pickPoints if 4 args
   * @param {boolean} [arg3] - pickEdges (if 4 args)
   * @param {boolean} [arg4] - pickFaces (if 4 args)
   */
  static setPickable(firstArg, arg2, arg3, arg4) {
    // Check if first argument is Geometry (has setGeometryAttribute method)
    if (firstArg && typeof firstArg.setGeometryAttribute === 'function') {
      // Case 3: setPickable(Geometry, boolean)
      firstArg.setGeometryAttribute(CommonAttributes.PICKABLE, arg2);
      return;
    }
    
    // Otherwise, firstArg is SceneGraphComponent
    const cmp = firstArg;
    if (cmp.getAppearance() === null) {
      cmp.setAppearance(new Appearance());
    }
    
    if (arg3 === undefined && arg4 === undefined) {
      // Case 1: setPickable(cmp, pickable) - deprecated
      cmp.getAppearance().setAttribute(CommonAttributes.PICKABLE, arg2);
    } else {
      // Case 2: setPickable(cmp, pickPoints, pickEdges, pickFaces)
      cmp.getAppearance().setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.PICKABLE, arg2);
      cmp.getAppearance().setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.PICKABLE, arg3);
      cmp.getAppearance().setAttribute(CommonAttributes.POLYGON_SHADER + '.' + CommonAttributes.PICKABLE, arg4);
    }
  }

  /**
   * Recursively clears all pickable appearance attributes in a scene graph component.
   * Sets all pickable attributes to INHERITED, effectively resetting them.
   * 
   * @param {SceneGraphComponent} cmp - Root component to clear
   */
  static clearPickableAttributes(cmp) {
    cmp.accept(new class extends SceneGraphVisitor {
      visitAppearance(a) {
        a.setAttribute('pointShader.' + CommonAttributes.PICKABLE, INHERITED);
        a.setAttribute('lineShader.' + CommonAttributes.PICKABLE, INHERITED);
        a.setAttribute('polygonShader.' + CommonAttributes.PICKABLE, INHERITED);
        a.setAttribute(CommonAttributes.PICKABLE, INHERITED);
      }
      
      visitComponent(c) {
        c.childrenAccept(this);
      }
    });
  }
}

