/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Appearance } from '../../core/scene/Appearance.js';
import { SceneGraphComponent } from '../../core/scene/SceneGraphComponent.js';
import { Transformation } from '../../core/scene/Transformation.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import Color from '../../core/util/Color.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as Pn from '../../core/math/Pn.js';
import { RotateTool } from '../../core/tools/RotateTool.js';
import {
  DirichletDomain,
  DiscreteGroup,
  DiscreteGroupElement,
  DiscreteGroupSceneGraphRepresentation,
  DiscreteGroupSimpleConstraint,
  DiscreteGroupUtility,
} from '../core/index.js';

/**
 * Port of tutorial/ConstraintExample.java.
 */
export function createConstraintExample() {
  const dg = new DiscreteGroup();
  dg.setMetric(Pn.EUCLIDEAN);
  dg.setDimension(2);

  const gens = new Array(4);
  const tlates = [[1, 0, 0], [0.5, 1, 0]];
  for (let i = 0; i < 2; i += 1) {
    const matrix = MatrixBuilder.euclidean().translate(tlates[i]).getArray();
    gens[i] = new DiscreteGroupElement(Pn.EUCLIDEAN, matrix, DiscreteGroupUtility.genNames[i]);
    gens[i + 2] = gens[i].getInverse();
  }
  dg.setGenerators(gens);

  const dgsc = new DiscreteGroupSimpleConstraint(6.0, -1, 200);
  dgsc.setManhattan(true);
  dg.setConstraint(dgsc);
  dg.update();

  const dgsgr = new DiscreteGroupSceneGraphRepresentation(dg);
  const fundDomSGC = new SceneGraphComponent('fundDomSGC');
  const red = new Appearance();
  fundDomSGC.setAppearance(red);
  red.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.RED);
  red.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.YELLOW);
  fundDomSGC.setTransformation(new Transformation());

  const dirdom = new DirichletDomain(dg);
  dirdom.update();
  fundDomSGC.setGeometry(dirdom.getDirichletDomain());
  fundDomSGC.addTool(new RotateTool());
  dgsgr.setWorldNode(fundDomSGC);
  dgsgr.update();

  return {
    group: dg,
    representation: dgsgr,
    root: dgsgr.getRepresentationRoot(),
  };
}

