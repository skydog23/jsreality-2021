/**
 * Port of de.jtem.discretegroup.tutorial.TessellatedContentExample3D.
 *
 * 3D space group "8o2" (full cubic symmetry) with a Dirichlet domain
 * as the fundamental domain.  Uses TessellatedApp for constraint management,
 * lights, fly tool, and inspector descriptors.
 *
 * Copyright (c) 2008-2026, Charles Gunn
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 */

import { TessellatedApp } from '../../TessellatedApp.js';
import * as CameraUtility from '../../../core/util/CameraUtility.js';
import * as CommonAttributes from '../../../core/shader/CommonAttributes.js';
import { Primitives } from '../../../core/geometry/Primitives.js';
import { Color } from '../../../core/util/Color.js';
import { Appearance, INHERITED } from '../../../core/scene/Appearance.js';
import { SceneGraphUtility } from '../../../core/util/SceneGraphUtility.js';
import { SpaceGroup } from '../../../discretegroup/groups/SpaceGroup.js';
import { DirichletDomain } from '../../../discretegroup/core/DirichletDomain.js';
import { DiscreteGroupSimpleConstraint } from '../../../discretegroup/core/DiscreteGroupSimpleConstraint.js';
import { RotateTool } from '../../../core/tools/RotateTool.js';

export class TessellatedContent3DDemo extends TessellatedApp {

  _wrapper = SceneGraphUtility.createFullSceneGraphComponent('wrapper');

  constructor(options) {
    super(options);
    this._copycat = false;
  }

  createGroup() {
    const dg = SpaceGroup.instanceOfGroup(SpaceGroup._8o2);
    const constraint = new DiscreteGroupSimpleConstraint(1, -1, 200);
    constraint.setManhattan(true);
    dg.setConstraint(constraint);
    dg.update();
    console.log('TessellatedContent3DDemo.createGroup', dg.getElementList().length);
    return dg;
  }

  setupFundamentalDomain() {
    const dd = new DirichletDomain(this._group ?? this.createGroup());
    dd.update();

    this._fundDomSGC.setGeometry(dd.getDirichletDomain());
    
  }
  getContent() {
    this._copycat = true;
    this.setGroup(this.createGroup());
    this.setupFundamentalDomain();
    
    const repnRoot = this.getRepresentationRoot();
    const ap = repnRoot.getAppearance();
    ap.setAttribute(`lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 0));
    ap.setAttribute(`pointShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 0));
    ap.setAttribute("pointShader."+CommonAttributes.POINT_RADIUS, 0.025);
    ap.setAttribute("lineShader."+CommonAttributes.TUBE_RADIUS, 0.025);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);

    this._wrapper.setGeometry(Primitives.cube());
    this._wrapper.getAppearance().setAttribute(CommonAttributes.FACE_DRAW, false);
    this._wrapper.getAppearance().setAttribute(
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 255));
    repnRoot.addChild(this._wrapper);
    repnRoot.addTool(new RotateTool());
    return repnRoot;
  }

  display() {
   
    super.display();
    const viewer = this.getViewer();
    const camera = CameraUtility.getCamera(viewer);
    camera.setFar(30);
    camera.setNear(0.1);

    const rootAp = viewer.getSceneRoot().getAppearance();
    rootAp.setAttribute('backgroundColors', INHERITED);
    rootAp.setAttribute('backgroundColor', new Color(0, 0, 0, 0));

    this.setFlySpeed(0.5);
    this.setScale(1.0);
    this.setFollowsCamera(false);
    this.setClipToCamera(false);

    CameraUtility.encompass(viewer);
  }

  getHelpTitle() {
    return 'Tessellated Content 3D Demo';
  }

  getHelpSummary() {
    return 'SpaceGroup 8o2 with Dirichlet domain, 3D tessellation proof of concept.';
  }
}
