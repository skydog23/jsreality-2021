/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { EuclideanGroup } from './EuclideanGroup.js';
import { WallpaperGroup } from './WallpaperGroup.js';

export class CrystallographicGroup extends EuclideanGroup {
  constructor() {
    super();
    this.dimension = 3;
  }

  static instanceOfGroup(nameOrIndex) {
    const wg = WallpaperGroup.instanceOfGroup(nameOrIndex);
    if (!wg) return null;
    return CrystallographicGroup.convert2DTo3D(wg);
  }

  static convert2DTo3D(wg) {
    const cg = new CrystallographicGroup();
    cg.setName(`3D${wg.getName()}`);
    cg.setMetric(Pn.EUCLIDEAN);
    cg.setDimension(3);

    const dgel = wg.getGenerators();
    const ngen = new Array(dgel.length + 2);
    for (let i = 0; i < dgel.length; ++i) ngen[i] = dgel[i];

    ngen[dgel.length] = new DiscreteGroupElement();
    ngen[dgel.length].setWord('z');
    MatrixBuilder.euclidean().reflect([0, 0, 1, 0.5]).assignTo(ngen[dgel.length].getArray());

    ngen[dgel.length + 1] = new DiscreteGroupElement();
    ngen[dgel.length + 1].setWord('t');
    MatrixBuilder.euclidean().translate(0, 0, 1).assignTo(ngen[dgel.length + 1].getArray());

    cg.setGenerators(ngen);
    return cg;
  }

  setChangeOfBasisParameters(a, sc, x, y) {
    const cob = Rn.identityMatrix(4);
    const angle = (this.getAllowedChangeOfBasis() & EuclideanGroup.COB_ROTATE) !== 0 ? a : 0.0;
    const ynewx = (this.getAllowedChangeOfBasis() & EuclideanGroup.COB_XSCALE) !== 0 ? x : 0.0;
    const ynewy = (this.getAllowedChangeOfBasis() & EuclideanGroup.COB_YSCALE) !== 0 ? y : 1.0;
    const scale = (this.getAllowedChangeOfBasis() & EuclideanGroup.COB_SCALE) !== 0 ? sc : 1.0;
    const c = scale * Math.cos(angle);
    const s = scale * Math.sin(angle);
    cob[0] = c;
    cob[4] = s;
    cob[1] = ynewx * c - ynewy * s;
    cob[5] = ynewx * s + ynewy * c;
    this.setChangeOfBasis(cob);
  }
}

