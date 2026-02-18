/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as Pn from '../../core/math/Pn.js';
import { DiscreteGroup } from '../core/DiscreteGroup.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { DiscreteGroupSimpleConstraint } from '../core/DiscreteGroupSimpleConstraint.js';

/**
 * Port of the group construction portion of SimpleExample3D01.
 * This keeps the tutorial useful before the viewer/plugin layers are ported.
 */
export function createSimpleExample3D01({ maxDistance = 1.0, maxElements = 48 } = {}) {
  const dg = new DiscreteGroup();
  dg.setMetric(Pn.EUCLIDEAN);
  dg.setDimension(3);
  dg.setFinite(true);
  dg.setConstraint(new DiscreteGroupSimpleConstraint(maxDistance, -1, maxElements));

  const xplane = [1, 0, 0, 0];
  const yplane = [0, 1, 0, 0];
  const zplane = [0, 0, 1, 0];
  const gens = [
    new DiscreteGroupElement(Pn.EUCLIDEAN, MatrixBuilder.euclidean().reflect(xplane).getArray(), 'x'),
    new DiscreteGroupElement(Pn.EUCLIDEAN, MatrixBuilder.euclidean().reflect(yplane).getArray(), 'y'),
    new DiscreteGroupElement(Pn.EUCLIDEAN, MatrixBuilder.euclidean().reflect(zplane).getArray(), 'z'),
  ];
  dg.setGenerators(gens);
  dg.update();

  return {
    group: dg,
    elements: dg.getElementList(),
  };
}

