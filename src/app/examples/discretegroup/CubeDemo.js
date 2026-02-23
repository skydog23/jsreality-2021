/**
*
 * Copyright (c) 2025-2026, jsReality Contributors

 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRApp } from '../../JSRApp.js';
import { SceneGraphUtility } from '../../../core/util/SceneGraphUtility.js';
import * as CameraUtility from '../../../core/util/CameraUtility.js';
import * as CommonAttributes from '../../../core/shader/CommonAttributes.js';
import { MatrixBuilder } from '../../../core/math/MatrixBuilder.js';
import * as Pn from '../../../core/math/Pn.js';
import { Primitives } from '../../../core/geometry/Primitives.js';
import {
  DiscreteGroupSceneGraphRepresentation,
} from '../../../discretegroup/core/index.js';
import { Platycosm } from '../../../discretegroup/groups/Platycosm.js';
import { RotateTool } from '../../../core/tools/RotateTool.js';
import { Color } from '../../../core/util/Color.js';
/**
 * Port of de.jtem.discretegroup.tutorial.CubeExample.
 */
export class CubeDemo extends JSRApp {
  _flatten = false;
  _group = null;   // DiscreteGroup
  _representation = null; // DiscreteGroupSceneGraphRepresentation
  _root = null; // SceneGraphComponent

  getContent() {
    console.log('DiscreteGroupCubeApp getContent 1');
    this._group = Platycosm.instanceOfGroup('c1');
    
    console.log('DiscreteGroupCubeApp getContent 2',this._group.getElementList().length);
    this._representation = new DiscreteGroupSceneGraphRepresentation(this._group, true, 'Cube');
    const fundDom = SceneGraphUtility.createFullSceneGraphComponent('fundDomSGC');
    fundDom.setGeometry(Primitives.boxWithMetric(0.5, 0.6, 0.4, true, Pn.EUCLIDEAN));
    MatrixBuilder.euclidean().translate(0.1, 0.2, 0.3).assignTo(fundDom);
    this._representation.setWorldNode(fundDom);
    this._representation.update();

    this._root = this._representation.getRepresentationRoot();
    this._root.addTool(new RotateTool());
    if (this._flatten) {
      // Java used GeometryMergeFactory.mergeGeometrySets(root). Keep as future work.
      // The current representation path remains non-flattened.
    }

    const ap = this._root.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute(CommonAttributes.SMOOTH_SHADING, false);
    ap.setAttribute("polygonShader."+CommonAttributes.DIFFUSE_COLOR, new Color(255, 0, 0));
    console.log('DiscreteGroupCubeApp getContent');
    return this._root;
  }

  display() {
    this.setup3DCamera();
   
    super.display();
     console.log('DiscreteGroupCubeApp display',this._group.getElementList().length);
    const viewer = this.getViewer();
    // Match Java tutorial camera offset (avatar translated along +z).
    MatrixBuilder.euclidean().translate(0, 0, 60).assignTo(CameraUtility.getCameraNode(viewer));
    CameraUtility.encompass(viewer);
  }

  getHelpTitle() {
    return 'Box Tessellation Demo';
  }

  getHelpSummary() {
    return 'Platycosm c1 cube replicated by a Euclidean discrete group.';
  }
}

