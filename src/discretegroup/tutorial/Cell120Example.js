/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as Pn from '../../core/math/Pn.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import Color from '../../core/util/Color.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import {
  DirichletDomain,
  DiscreteGroupSceneGraphRepresentation,
  DiscreteGroupSimpleConstraint,
  ImportGroup,
} from '../core/index.js';

/**
 * `.gens`-based port of Cell120Example.
 * Returns an object containing the generated group and scene graph root.
 */
export async function createCell120Example() {
  const dg = await ImportGroup.initFromResource('resources/groups/120cell.gens', Pn.ELLIPTIC);
  dg.setFinite(true);
  dg.setName('120 cell');
  dg.setDimension(3);
  dg.setMetric(Pn.ELLIPTIC);
  // Java used `new DiscreteGroupSimpleConstraint(13)` as max-elements shorthand.
  dg.setConstraint(new DiscreteGroupSimpleConstraint(-1, -1, 13));
  dg.update();

  const dirdom = new DirichletDomain(dg);
  dirdom.update();

  const world = SceneGraphUtility.createFullSceneGraphComponent ('cell120-fundamental-domain');
  world.setGeometry(dirdom.getDirichletDomain());
  const ap = world.getAppearance();
  ap.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.WHITE);
  ap.setAttribute(CommonAttributes.METRIC, Pn.ELLIPTIC);
  ap.setAttribute(CommonAttributes.USE_GLSL, true);
  ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
  ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
  ap.setAttribute(CommonAttributes.TEXT_SCALE, 0.01);

  const dgsgr = new DiscreteGroupSceneGraphRepresentation(dg);
  dgsgr.setWorldNode(world);
  dgsgr.update();

  return {
    group: dg,
    dirichletDomain: dirdom,
    representation: dgsgr,
    root: dgsgr.getRepresentationRoot(),
  };
}

