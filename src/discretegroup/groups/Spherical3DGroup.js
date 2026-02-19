/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as P3 from '../../core/math/P3.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { DiscreteGroup } from '../core/DiscreteGroup.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { DiscreteGroupUtility } from '../core/DiscreteGroupUtility.js';

export class Spherical3DGroup {
  static names = ['333', '334', '343', '433', '335', '533'];

  static instanceOf(name) {
    if (name === '335') return Spherical3DGroup.the600Cell();
    throw new Error(`Not yet implemented: ${name}`);
  }

  static the600Cell() {
    const cc = [
      [1, -1, 1, 4 / 0.944272],
      [-1, 1, 1, 4 / 0.944272],
      [1, 1, -1, 4 / 0.944272],
      [-1, -1, -1, 4 / 0.944272],
    ];
    const gens = new Array(14);
    let count = 0;
    for (let i = 0; i < 4; i += 1) {
      for (let j = i; j < 4; j += 1) {
        if (i === j) continue;
        const screw = P3.makeScrewMotionMatrix(null, cc[i], cc[j], Math.PI / 5, Pn.ELLIPTIC);
        gens[count] = new DiscreteGroupElement(Pn.ELLIPTIC, screw);
        gens[count].setWord(DiscreteGroupUtility.genNames[count]);
        gens[count + 6] = gens[count].getInverse();
        count += 1;
      }
    }
    const screw = P3.makeRotationMatrix(null, cc[0], cc[1], (2 * Math.PI) / 5, Pn.ELLIPTIC);
    gens[12] = new DiscreteGroupElement(Pn.ELLIPTIC, screw);
    gens[12].setWord(DiscreteGroupUtility.genNames[count]);
    gens[13] = gens[12].getInverse();

    const dg = new DiscreteGroup();
    dg.setDimension(3);
    dg.setMetric(Pn.ELLIPTIC);
    dg.setGenerators(gens);
    dg.setFinite(true);
    dg.update();
    return dg;
  }

  static towerOfTetrahedra() {
    const dg = new DiscreteGroup();
    dg.setDimension(3);
    dg.setMetric(Pn.ELLIPTIC);
    dg.setFinite(true);
    dg.setName('tetrahedraTower');
    const ogens = Spherical3DGroup.the600Cell().getGenerators();
    dg.setGenerators([ogens[3]]);
    dg.update();

    const justTen = dg.getElementList();
    const allThirty = new Array(30);
    const order5 = [
      Rn.identityMatrix(4),
      ogens[12].getArray(),
      Rn.times(null, ogens[12].getArray(), ogens[12].getArray()),
    ];
    for (let i = 0; i < justTen.length; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        const m = Rn.times(null, justTen[i].getArray(), order5[j]);
        const el = new DiscreteGroupElement(Pn.ELLIPTIC, m);
        el.setColorIndex(j);
        el.setWord(`${i}:${j}`);
        allThirty[i + j * 10] = el;
      }
    }
    dg.setElementList(allThirty);
    dg.setGenerators(null);
    return dg;
  }
}

