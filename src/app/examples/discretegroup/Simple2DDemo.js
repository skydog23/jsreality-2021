/**
* 
 * Copyright (c) 2025-2026, jsReality Contributors
 
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRApp } from '../../JSRApp.js';
import { SceneGraphUtility } from '../../../core/util/SceneGraphUtility.js';
import * as CommonAttributes from '../../../core/shader/CommonAttributes.js';
import { Color } from '../../../core/util/Color.js';
import { Matrix } from '../../../core/math/Matrix.js';
import { MatrixBuilder } from '../../../core/math/MatrixBuilder.js';
import * as Pn from '../../../core/math/Pn.js';
import * as Rn from '../../../core/math/Rn.js';
import { DirichletDomain } from '../../../discretegroup/core/DirichletDomain.js';
import { DiscreteGroupSceneGraphRepresentation } from '../../../discretegroup/core/DiscreteGroupSceneGraphRepresentation.js';
import { DiscreteGroup } from '../../../discretegroup/core/DiscreteGroup.js';
import { DiscreteGroupElement } from '../../../discretegroup/core/DiscreteGroupElement.js';
import { DiscreteGroupSimpleConstraint } from '../../../discretegroup/core/DiscreteGroupSimpleConstraint.js';
import { DiscreteGroupUtility } from '../../../discretegroup/core/DiscreteGroupUtility.js';
import { WallpaperGroup } from '../../../discretegroup/groups/WallpaperGroup.js';

/**
 * Minimal JSRApp demo for the ported discrete-group stack.
 *
 * It follows the logical setup of `discretegroup/tutorial/SimpleExample2D`
 * and visualizes one Dirichlet fundamental region under the group action.
 */
export class Simple2DDemo extends JSRApp {
  _maxElements = 50;
  _skewit = true;

  _group = null;
  _dirichletDomain = null;
  _dgsgr = null;

  getContent() {
    const group = this.#createSimpleExample2D({
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

  #createSimpleExample2D({ skewit = true, maxElements = 50 } = {}) {
    let dg = new DiscreteGroup();
    dg.setMetric(Pn.EUCLIDEAN);
    dg.setDimension(2);

    const gens = new Array(4);
    const planes = [
      [1, 0, 0, 0],
      [1, 0, 0, -1],
      [0, 1, 0, 0],
      [0, 1, 0, -1],
    ];
    for (let i = 0; i < 4; ++i) {
      const matrix = MatrixBuilder.euclidean().reflect(planes[i]).getArray();
      gens[i] = new DiscreteGroupElement(Pn.EUCLIDEAN, matrix, DiscreteGroupUtility.genNames[i]);
    }
    dg.setGenerators(gens);
    dg.setConstraint(new DiscreteGroupSimpleConstraint(-1, -1, maxElements));
    dg.update();

    if (skewit) {
      dg = WallpaperGroup.instanceOfGroup('O');
      dg.setConstraint(new DiscreteGroupSimpleConstraint(-1, -1, maxElements));
      const g2 = dg.getGenerators();
      const cob = new Matrix();
      cob.setColumn(0, [1, 0, 0, 0]);
      cob.setColumn(1, [0.5, Math.sqrt(3) / 2.0, 0, 0]);
      for (let i = 0; i < g2.length; ++i) {
        const g = Rn.conjugateByMatrix(null, g2[i].getArray(), cob.getArray());
        g2[i].setArray(g);
      }
      dg.update();
    }

    return dg;
  }

  display() {
    super.display();
    this.setup3DCamera();
  }

  getHelpTitle() {
    return '2D Wallpaper Group';
  }

  getHelpSummary() {
    return 'Euclidean wallpaper group with Dirichlet fundamental domain.';
  }
}

