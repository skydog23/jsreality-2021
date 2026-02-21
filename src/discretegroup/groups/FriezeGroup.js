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
import { DiscreteGroup } from '../core/DiscreteGroup.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';

const INFINITY = '\u221e';

export class FriezeGroup extends DiscreteGroup {
  static friezeNames = [`${INFINITY}${INFINITY}`, `*${INFINITY}${INFINITY}`, `22${INFINITY}`, `${INFINITY}X`, `${INFINITY}*`, `2*${INFINITY}`, `*22${INFINITY}`];

  static nameTable = new Map(FriezeGroup.friezeNames.map((name, i) => [name, i]));

  constructor() {
    super();
    this.unitWidth = 0.5;
    this.horizontalMirror = false;
    this.changeOfBasisParameters = [0, 1, 0, 1];
    this.setDimension(2);
  }

  static instanceOfGroup(nameOrIndex, d = 0.3, metric = Pn.EUCLIDEAN) {
    const idx = typeof nameOrIndex === 'number' ? nameOrIndex : FriezeGroup.nameTable.get(nameOrIndex);
    if (idx == null || idx < 0 || idx > 6) return null;
    const group = new FriezeGroup();
    group.setMetric(metric);
    group.setUnitWidth(d);
    group.#init(idx);
    return group;
  }

  #init(num) {
    let generators = null;
    let vec = [this.unitWidth, 0, 0, 1];
    vec = Pn.dragTowards(null, [0, 0, 0, 1], vec, this.unitWidth, this.metric);
    const twice = Pn.dragTowards(null, [0, 0, 0, 1], vec, 2 * this.unitWidth, this.metric);
    const vecUp = [...vec];
    vecUp[2] = 1.0;
    const xmirror = [vec[3], 0, 0, 0];
    const mirror = [vec[3], 0, 0, -vec[0]];
    const mirror2 = [twice[3], 0, 0, -twice[0]];
    const horizMirror = [0, 1, 0, 0];
    const originUp = [0, 0, 1, 1];

    switch (num) {
      case 0:
        generators = [new DiscreteGroupElement(), null];
        MatrixBuilder.init(null, this.metric).translate(vec).assignTo(generators[0].getArray());
        break;
      case 1:
        generators = [new DiscreteGroupElement(), new DiscreteGroupElement(), null, null];
        MatrixBuilder.init(null, this.metric).reflect(xmirror).assignTo(generators[0].getArray());
        MatrixBuilder.init(null, this.metric).reflect(mirror).assignTo(generators[1].getArray());
        break;
      case 2:
        generators = [new DiscreteGroupElement(), new DiscreteGroupElement(), null, null];
        MatrixBuilder.init(null, this.metric).rotate([0, 0, 0, 1], originUp, Math.PI).assignTo(generators[0].getArray());
        MatrixBuilder.init(null, this.metric).rotate(vec, vecUp, Math.PI).assignTo(generators[1].getArray());
        break;
      case 3:
        generators = [new DiscreteGroupElement(), null];
        MatrixBuilder.init(null, this.metric).translate(vec).reflect(horizMirror).assignTo(generators[0].getArray());
        break;
      case 4:
        generators = [new DiscreteGroupElement(), new DiscreteGroupElement(), null, null];
        MatrixBuilder.init(null, this.metric).translate(vec).assignTo(generators[0].getArray());
        MatrixBuilder.init(null, this.metric).reflect(horizMirror).assignTo(generators[1].getArray());
        this.horizontalMirror = true;
        break;
      case 5:
        generators = [new DiscreteGroupElement(), new DiscreteGroupElement(), null, null];
        MatrixBuilder.init(null, this.metric).rotate(vec, vecUp, Math.PI).assignTo(generators[0].getArray());
        MatrixBuilder.init(null, this.metric).reflect(mirror2).assignTo(generators[1].getArray());
        break;
      case 6:
        generators = [new DiscreteGroupElement(), new DiscreteGroupElement(), new DiscreteGroupElement(), null, null, null];
        MatrixBuilder.init(null, this.metric).reflect(xmirror).assignTo(generators[0].getArray());
        MatrixBuilder.init(null, this.metric).reflect(mirror).assignTo(generators[1].getArray());
        MatrixBuilder.init(null, this.metric).reflect(horizMirror).assignTo(generators[2].getArray());
        this.horizontalMirror = true;
        break;
      default:
        throw new Error(`Unsupported frieze group index: ${num}`);
    }

    const n = generators.length / 2;
    for (let i = 0; i < n; ++i) generators[i + n] = generators[i].getInverse();
    this.setGenerators(generators);
    this.setName(FriezeGroup.friezeNames[num]);
    this.update();
  }

  getUnitWidth() {
    return this.unitWidth;
  }

  setUnitWidth(unitWidth) {
    this.unitWidth = unitWidth;
  }

  isHorizontalMirror() {
    return this.horizontalMirror;
  }

  setHorizontalMirror(horizontalMirror) {
    this.horizontalMirror = horizontalMirror;
  }
}

