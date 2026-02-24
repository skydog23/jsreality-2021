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
import {DiscreteGroupSceneGraphRepresentation, DiscreteGroupSimpleConstraint, DiscreteGroupColorPicker} from '../../../discretegroup/core/index.js';
import { Platycosm } from '../../../discretegroup/groups/Platycosm.js';
import { RotateTool } from '../../../core/tools/RotateTool.js';
import { Color } from '../../../core/util/Color.js';
import { Appearance } from '../../../core/scene/Appearance.js';
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
    this._group.setConstraint(new DiscreteGroupSimpleConstraint(-1, -1,10000));
    this._group.setColorPicker(new DiscreteGroupColorPicker.TranslationColorPicker(4));
    this._group.update();

    console.log('DiscreteGroupCubeApp getContent 2',this._group.getElementList().length);
    this._representation = new DiscreteGroupSceneGraphRepresentation(this._group, true, 'Cube');
    this._representation.setPickConstraint(new DiscreteGroupSimpleConstraint(-1, -1,500));
    this._representation.setAppList(this.getAppList());
    const fundDom = SceneGraphUtility.createFullSceneGraphComponent('fundDomSGC');
    fundDom.setGeometry(Primitives.boxWithMetric(0.5, 0.6, 0.4, false, Pn.EUCLIDEAN));
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

  getAppList() {
    const red = new Appearance();
    red.setAttribute(
      `polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 0, 0));
    red.setAttribute(
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(0, 255, 255));

    const blue = new Appearance();
    blue.setAttribute(
      `polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(0, 0, 255));
    blue.setAttribute(
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 0));

    const green = new Appearance();
    green.setAttribute(
      `polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(0, 255, 0));
    green.setAttribute(
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 0, 255));
    const white = new Appearance();
    white.setAttribute(
      `polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, Color.WHITE);
    white.setAttribute(
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 255));

    return [white, red, blue, green];
  }

  display() {
    this.setup3DCamera();
   
    super.display();
     console.log('DiscreteGroupCubeApp display',this._group.getElementList().length);
    const viewer = this.getViewer();
    // Match Java tutorial camera offset (avatar translated along +z).
    // MatrixBuilder.euclidean().translate(0, 0, 20).assignTo(CameraUtility.getCameraNode(viewer));
    //CameraUtility.encompass(viewer);
  }

  getHelpTitle() {
    return 'Box Tessellation Demo';
  }

  getHelpSummary() {
    return 'Platycosm c1 cube replicated by a Euclidean discrete group.';
  }
}

