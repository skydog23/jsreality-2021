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
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { DiscreteGroupSimpleConstraint } from '../core/DiscreteGroupSimpleConstraint.js';
import { DiscreteGroupUtility } from '../core/DiscreteGroupUtility.js';
import { EuclideanGroup } from './EuclideanGroup.js';

/**
 * Initial JS port: currently includes the Conway "O" (pure translations) wallpaper group.
 * The remaining wallpaper families are intentionally deferred to the next pass.
 */
export class WallpaperGroup extends EuclideanGroup {
  static names = ['O', '2222', '333', '244', '236', 'XX', '**', '*2222', '22*', '22X', '*X', '2*22', '3*3', '*333', '4*2', '*244', '*236', 'c12', 'd24'];

  constructor() {
    super();
    this.dimension = 2;
    this.changeOfBasisParameters = [0, 1, 0, 1];
  }

  static instanceOfGroup(nameOrIndex) {
    const index = typeof nameOrIndex === 'number' ? nameOrIndex : WallpaperGroup.names.indexOf(nameOrIndex);
    if (index < 0) return null;
    if (index !== 0) {
      throw new Error(`WallpaperGroup ${WallpaperGroup.names[index]} not ported yet. Currently only "O" is implemented.`);
    }
    return WallpaperGroup.#makeO();
  }

  static #makeO() {
    const group = new WallpaperGroup();
    const tx1 = 1.0;
    const ty1 = 0.0;
    const tx2 = 0.0;
    const ty2 = 1.0;
    const generators = new Array(4);
    for (let i = 0; i < 2; i += 1) {
      generators[i] = new DiscreteGroupElement();
      generators[i].setWord(DiscreteGroupUtility.genNames[i]);
    }
    MatrixBuilder.euclidean().translate(tx1, ty1, 0).assignTo(generators[0].getArray());
    MatrixBuilder.euclidean().translate(tx2, ty2, 0).assignTo(generators[1].getArray());
    generators[2] = generators[0].getInverse();
    generators[3] = generators[1].getInverse();

    group.setGenerators(generators);
    group.setAllowedChangeOfBasis(EuclideanGroup.COB_SHEAR | EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE);
    group.setName('O');
    group.setConstraint(new DiscreteGroupSimpleConstraint(50));
    return group;
  }

  /**
   * Placeholder for Java compatibility.
   * Full edge-pair identification is implemented in later wallpaper port phases.
   */
  static storeEdgeIds(_dg, _ifs) {
    // no-op in initial discretegroup port
  }
}

