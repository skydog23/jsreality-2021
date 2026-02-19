/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Matrix } from '../../core/math/Matrix.js';
import * as Rn from '../../core/math/Rn.js';
import { SceneGraphComponent } from '../../core/scene/SceneGraphComponent.js';
import Color from '../../core/util/Color.js';
import {
  DirichletDomain,
  DiscreteGroupSceneGraphRepresentation,
  DiscreteGroupSimpleConstraint,
} from '../core/index.js';
import { WallpaperGroup } from '../groups/WallpaperGroup.js';
import { TranslateTool } from '../util/TranslateTool.js';

/**
 * Port of tutorial/ConjugateGeneratorsExample.java.
 */
export function createConjugateGeneratorsExample() {
  const dg = WallpaperGroup.instanceOfGroup('O');
  dg.setConstraint(new DiscreteGroupSimpleConstraint(6.0, -1, 500));
  const gens = dg.getGenerators();

  const cob = new Matrix();
  cob.setColumn(0, [1, 0, 0, 0]);
  cob.setColumn(1, [0.5, Math.sqrt(3) / 2.0, 0, 0]);

  for (let i = 0; i < gens.length; i += 1) {
    const g = Rn.conjugateByMatrix(null, gens[i].getArray(), cob.getArray());
    gens[i].setArray(g);
  }
  dg.update();

  const dgsgr = new DiscreteGroupSceneGraphRepresentation(dg);
  const fundDomSGC = new SceneGraphComponent('fundDomSGC');
  const fundDom2SGC = new SceneGraphComponent('fundDom2SGC');
  fundDomSGC.addChild(fundDom2SGC);
  const dd = new DirichletDomain(dg);
  dd.update();
  fundDom2SGC.setGeometry(dd.getDirichletDomain());
  fundDomSGC.addTool(new TranslateTool());
  dgsgr.setWorldNode(fundDomSGC);
  dgsgr.getRepresentationRoot().getAppearance().setAttribute('polygonShader.diffuseColor', Color.WHITE);
  dgsgr.update();

  return {
    group: dg,
    representation: dgsgr,
    root: dgsgr.getRepresentationRoot(),
  };
}

