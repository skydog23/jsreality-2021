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
    return dg;
  }

  setupFundamentalDomain() {
    const dd = new DirichletDomain(this._group ?? this.createGroup());
    dd.update();

    this._fundDomSGC.setGeometry(dd.getDirichletDomain());
    const ap = this._fundDomSGC.getAppearance();
    if (ap) {
      ap.setAttribute(`pointShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 0));
    }
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
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 0));

    const green = new Appearance();
    green.setAttribute(
      `polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(0, 255, 0));
    green.setAttribute(
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 0));

    return [red, blue, green];
  }

  getContent() {
    const group = this.createGroup();
    this._group = group;
    this.setupFundamentalDomain();
    this.setGroup(group);

    const repnRoot = this.getRepresentationRoot();

    this._wrapper.setGeometry(Primitives.cube());
    this._wrapper.getAppearance().setAttribute(CommonAttributes.FACE_DRAW, false);
    this._wrapper.getAppearance().setAttribute(
      `lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(255, 255, 255));
    repnRoot.addChild(this._wrapper);

    return repnRoot;
  }

  display() {
    this.setup3DCamera();

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

    super.display();

    CameraUtility.encompass(viewer);
    viewer.render();
  }

  getHelpTitle() {
    return 'Tessellated Content 3D Demo';
  }

  getHelpSummary() {
    return 'SpaceGroup 8o2 with Dirichlet domain, 3D tessellation proof of concept.';
  }
}
