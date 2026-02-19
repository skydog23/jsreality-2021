/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRApp } from '../JSRApp.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { createSimpleExample2D } from '../../discretegroup/tutorial/SimpleExample2D.js';
import { DirichletDomain } from '../../discretegroup/core/DirichletDomain.js';
import { DiscreteGroupSceneGraphRepresentation } from '../../discretegroup/core/DiscreteGroupSceneGraphRepresentation.js';

/**
 * Minimal JSRApp demo for the ported discrete-group stack.
 *
 * It follows the logical setup of `discretegroup/tutorial/SimpleExample2D`
 * and visualizes one Dirichlet fundamental region under the group action.
 */
export class DiscreteGroupSimple2DApp extends JSRApp {
  _maxElements = 50;
  _skewit = true;

  _group = null;
  _dirichletDomain = null;
  _dgsgr = null;

  getContent() {
    const { group } = createSimpleExample2D({
      skewit: this._skewit,
      maxElements: this._maxElements,
    });
    this._group = group;

    this._dirichletDomain = new DirichletDomain(group);
    this._dirichletDomain.setDirichletDomainOrbit(this._maxElements);
    this._dirichletDomain.update();

    const fundamentalDomainNode = SceneGraphUtility.createFullSceneGraphComponent('fundamentalDomain');
    fundamentalDomainNode.setGeometry(this._dirichletDomain.getDirichletDomain());
    const ap = fundamentalDomainNode.getAppearance();
    ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, true);
    ap.setAttribute(CommonAttributes.FACE_DRAW, true);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute(`polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(170, 210, 245));
    ap.setAttribute(`lineShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(200, 50,50));
    ap.setAttribute(CommonAttributes.TRANSPARENCY_ENABLED, false);

    this._dgsgr = new DiscreteGroupSceneGraphRepresentation(group, false, 'Simple2D');
    this._dgsgr.setWorldNode(fundamentalDomainNode);
    this._dgsgr.update();

    return this._dgsgr.getRepresentationRoot();
  }

  display() {
    super.display();
    this.setup3DCamera();
    this.getViewer().render();
  }
}

