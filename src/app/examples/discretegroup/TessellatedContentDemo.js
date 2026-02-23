/**
 * Port of de.jtem.discretegroup.tutorial.TessellatedContentExample.
 *
 * 2D wallpaper group "333" with a colored regular polygon as the
 * fundamental domain.  Uses TessellatedApp for constraint management
 * and inspector descriptors.
 *
 * Copyright (c) 2008-2026, Charles Gunn
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 */

import { TessellatedApp } from '../../TessellatedApp.js';
import * as CameraUtility from '../../../core/util/CameraUtility.js';
import * as CommonAttributes from '../../../core/shader/CommonAttributes.js';
import { MatrixBuilder } from '../../../core/math/MatrixBuilder.js';
import { Primitives } from '../../../core/geometry/Primitives.js';
import { Color } from '../../../core/util/Color.js';
import { Appearance } from '../../../core/scene/Appearance.js';
import { WallpaperGroup } from '../../../discretegroup/groups/WallpaperGroup.js';
import { DiscreteGroupColorPicker } from '../../../discretegroup/core/DiscreteGroupColorPicker.js';
import { DiscreteGroupSimpleConstraint } from '../../../discretegroup/core/DiscreteGroupSimpleConstraint.js';
import { DraggingTool } from '../../../core/tools/DraggingTool.js';
import { SceneGraphComponent } from '../../../core/scene/SceneGraphComponent.js';

export class TessellatedContentDemo extends TessellatedApp {

  constructor(options) {
    super(options);
    this._copycat = false;
    this._masterConstraint = new DiscreteGroupSimpleConstraint(-1, -1, 50);
  }

  createGroup() {
    const dg = WallpaperGroup.instanceOfGroup('333');
    dg.setConstraint(this._masterConstraint);
    dg.setColorPicker(new DiscreteGroupColorPicker.RotationColorPicker(3));
    return dg;
  }

  setupFundamentalDomain() {
    this._fundDomSGC.setGeometry(Primitives.regularPolygon(4, 0.5));
    MatrixBuilder.euclidean().translate(0.5, 0.3, 0).scale(0.3).assignTo(this._fundDomSGC);
    this._contentNode= new SceneGraphComponent("wrapper");
		this._contentNode.addChild(this._fundDomSGC);
		this._contentNode.addTool(new DraggingTool());
		return this._contentNode;

  }

  getAppList() {
    const red = new Appearance();
    red.setAttribute(
      `polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 0, 0));
    red.setAttribute(
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 0));

    const blue = new Appearance();
    blue.setAttribute(
      `polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(0, 0, 255));
    blue.setAttribute(
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(0, 255, 0));

    const green = new Appearance();
    green.setAttribute(
      `polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(0, 255, 0));
    green.setAttribute(
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 0));

    return [red, blue, green];
  }

  display() {
    this.setup3DCamera();

    const ap = this.getRepresentationRoot().getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
    ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
    ap.setAttribute(CommonAttributes.SMOOTH_SHADING, false);

    super.display();

    CameraUtility.encompass(this.getViewer());
  }

  getHelpTitle() {
    return 'Tessellated Content Demo';
  }

  getHelpSummary() {
    return 'WallpaperGroup 333 with colored polygon, TessellatedApp proof of concept.';
  }
}
