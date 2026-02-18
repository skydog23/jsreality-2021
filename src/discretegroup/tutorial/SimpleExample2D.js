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
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { DiscreteGroup } from '../core/DiscreteGroup.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { DiscreteGroupSimpleConstraint } from '../core/DiscreteGroupSimpleConstraint.js';
import { DiscreteGroupUtility } from '../core/DiscreteGroupUtility.js';
import { WallpaperGroup } from '../groups/WallpaperGroup.js';

/**
 * Port of the logical part of SimpleExample2D.
 * Returns the group and generated elements.
 */
export function createSimpleExample2D({ skewit = true, maxElements = 50 } = {}) {
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

  return {
    group: dg,
    elements: dg.getElementList(),
  };
}

