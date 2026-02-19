/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { TriangleGroup } from './TriangleGroup.js';
import * as Pn from '../../core/math/Pn.js';

/**
 * Java source for TetrahedralGroup is structurally identical to TriangleGroup
 * in this code line, with a reduced name set. We keep behavior by inheriting
 * and overriding group-name construction.
 */
export class TetrahedralGroup extends TriangleGroup {
  static names = ['333', '*333', '334', '*334'];

  static trinames = ['333', '*333', '334', '*334'];

  static nameTable = new Map(TetrahedralGroup.names.map((n, i) => [n, i]));

  static getNames() {
    return TetrahedralGroup.names;
  }

  static instanceOf(ip, iq, ir, mirror, name) {
    const tg = new TetrahedralGroup();
    tg.p = ip;
    tg.q = iq;
    tg.r = ir;
    tg.mirrorGroup = !!mirror;
    tg.vertices = Array.from({ length: 3 }, () => [0, 0, 0, 1]);
    tg.reflectionPlanes = new Array(3).fill(null);
    tg.weights = [0, 0, 0];
    tg.dimension = 2;
    tg.setName(name);
    tg.update();
    return tg;
  }

  static instanceOfGroup(name) {
    let atoms;
    if (name.includes(' ')) atoms = name.split(' ');
    else atoms = Array.from(name);
    if (atoms.length < 3 || atoms.length > 4) {
      throw new Error('Invalid name for tetrahedral group');
    }
    let m = false;
    let idx = 0;
    if (atoms[0].startsWith('*')) {
      m = true;
      idx += 1;
    }
    const ip = Number.parseInt(atoms[idx], 10);
    const iq = Number.parseInt(atoms[idx + 1], 10);
    const ir = Number.parseInt(atoms[idx + 2], 10);
    return TetrahedralGroup.instanceOf(ip, iq, ir, m, name);
  }

  convertToProjective() {
    if (!(this.metric === Pn.EUCLIDEAN && this.dimension === 3)) return this;
    const tg = TetrahedralGroup.instanceOf(this.p, this.q, this.r, this.mirrorGroup, this.name);
    return this._convertToProjective(tg);
  }
}

