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
import * as P3 from '../../core/math/P3.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { DiscreteGroupUtility } from '../core/DiscreteGroupUtility.js';
import { EuclideanGroup } from './EuclideanGroup.js';

export class Platycosm extends EuclideanGroup {
  static names = ['c1', 'c2', 'c3', 'c4', 'c6', 'c22', '+a1', '-a1', '+a2', '-a2'];

  static C1 = 0;
  static C2 = 1;
  static C3 = 2;
  static C4 = 3;
  static C6 = 4;
  static C22 = 5;
  static PA1 = 6;
  static MA1 = 7;
  static PA2 = 8;
  static MA2 = 9;

  static numGenerators = 0;

  static nameTable = new Map(Platycosm.names.map((n, i) => [n, i]));

  static standardTlate = [2, 0, 0];
  static st01 = [2, 0, 2];
  static st02 = [2, 0, -2];
  static xGlidePlane = [1, 0, 0, 1];
  static yGlidePlane = [0, 1, 0, -1];
  static yGlideVector = [0, -2, 0];

  static st = new Matrix();
  static st1 = new Matrix();
  static st2 = new Matrix();
  static gr = new Matrix();
  static gr1 = new Matrix();
  static gr2 = new Matrix();

  constructor() {
    super();
    this.dimension = 3;
  }

  getNames() {
    return Platycosm.names;
  }

  static initializeStatics() {
    MatrixBuilder.euclidean().translate(Platycosm.standardTlate).assignTo(Platycosm.st.getArray());
    MatrixBuilder.euclidean().translate(Platycosm.st01).assignTo(Platycosm.st1.getArray());
    MatrixBuilder.euclidean().translate(Platycosm.st02).assignTo(Platycosm.st2.getArray());
    MatrixBuilder.euclidean().reflect(Platycosm.xGlidePlane).translate(Platycosm.yGlideVector).assignTo(Platycosm.gr.getArray());
    MatrixBuilder.euclidean().reflect(Platycosm.yGlidePlane).translate(Platycosm.st01).assignTo(Platycosm.gr1.getArray());
    MatrixBuilder.euclidean().reflect(Platycosm.yGlidePlane).translate(Platycosm.st02).assignTo(Platycosm.gr2.getArray());
  }

  static instanceOfGroup(nameOrIndex) {
    const which = typeof nameOrIndex === 'string' ? Platycosm.nameTable.get(nameOrIndex) : nameOrIndex;
    if (which == null) throw new Error(`Unknown platycosm: ${nameOrIndex}`);
    return Platycosm.instanceOfIndex(which);
  }

  static instanceOfIndex(which) {
    let generators = null;
    const mk = (n) => {
      const g = new Array(n * 2);
      for (let i = 0; i < n; i += 1) {
        g[i] = new DiscreteGroupElement();
        g[i].setWord(DiscreteGroupUtility.genNames[i]);
      }
      return g;
    };

    switch (which) {
      case Platycosm.C1:
        Platycosm.numGenerators = 3;
        generators = mk(3);
        MatrixBuilder.euclidean().translate(2, 0, 0).assignTo(generators[0].getArray());
        MatrixBuilder.euclidean().translate(0, 2, 0).assignTo(generators[1].getArray());
        MatrixBuilder.euclidean().translate(0, 0, 2).assignTo(generators[2].getArray());
        break;
      case Platycosm.C2:
        Platycosm.numGenerators = 3;
        generators = mk(3);
        MatrixBuilder.euclidean().translate(2, 0, 0).assignTo(generators[0].getArray());
        MatrixBuilder.euclidean().translate(0, 2, 0).assignTo(generators[1].getArray());
        generators[2].setArray(Platycosm.screwMotion([0, 0, 0], [0, 0, 2], Math.PI));
        break;
      case Platycosm.C3:
        Platycosm.numGenerators = 3;
        generators = mk(3);
        MatrixBuilder.euclidean().translate(2, 0, 0).assignTo(generators[0].getArray());
        MatrixBuilder.euclidean().translate(2 * Math.cos(Math.PI / 3), 2 * Math.sin(Math.PI / 3), 0).assignTo(generators[1].getArray());
        generators[2].setArray(Platycosm.screwMotion([0, 0, 0], [0, 0, 2], (2 * Math.PI) / 3));
        break;
      case Platycosm.C4:
        Platycosm.numGenerators = 3;
        generators = mk(3);
        MatrixBuilder.euclidean().translate(2, 0, 0).assignTo(generators[0].getArray());
        MatrixBuilder.euclidean().translate(2 * Math.cos(Math.PI / 2), 2 * Math.sin(Math.PI / 2), 0).assignTo(generators[1].getArray());
        generators[2].setArray(Platycosm.screwMotion([0, 0, 0], [0, 0, 2], Math.PI / 2));
        break;
      case Platycosm.C6:
        Platycosm.numGenerators = 3;
        generators = mk(3);
        MatrixBuilder.euclidean().translate(2, 0, 0).assignTo(generators[0].getArray());
        MatrixBuilder.euclidean().translate(2 * Math.cos(Math.PI / 3), 2 * Math.sin(Math.PI / 3), 0).assignTo(generators[1].getArray());
        generators[2].setArray(Platycosm.screwMotion([0, 0, 0], [0, 0, 1], Math.PI / 3));
        break;
      case Platycosm.C22: {
        Platycosm.numGenerators = 12;
        generators = new Array(12);
        const points = [[1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0]];
        const rotator = P3.makeRotationMatrix(null, [1, 1, 1], (2 * Math.PI) / 3.0);
        const pointsAll = [points, Rn.matrixTimesVectorArray(null, rotator, points), null];
        pointsAll[2] = Rn.matrixTimesVectorArray(null, rotator, pointsAll[1]);
        for (let i = 0; i < 3; i += 1) {
          for (let j = 0; j < 2; j += 1) {
            generators[2 * i + j] = new DiscreteGroupElement();
            generators[2 * i + j].setArray(P3.makeScrewMotionMatrix(null, pointsAll[i][2 * j], pointsAll[i][2 * j + 1], Math.PI, Pn.EUCLIDEAN));
            generators[2 * i + j].setWord(DiscreteGroupUtility.genNames[2 * i + j]);
          }
        }
        for (let i = 0; i < 6; i += 1) generators[i + 6] = generators[i].getInverse();
        break;
      }
      case Platycosm.PA1:
      case Platycosm.MA1:
      case Platycosm.PA2:
      case Platycosm.MA2:
        Platycosm.numGenerators = 3;
        generators = mk(3);
        if (which === Platycosm.PA1) {
          Platycosm.st.assignTo(generators[0].getArray());
          Platycosm.gr.assignTo(generators[1].getArray());
          MatrixBuilder.euclidean().translate([0, 0, 2]).assignTo(generators[2].getArray());
        } else if (which === Platycosm.MA1) {
          Platycosm.st1.assignTo(generators[0].getArray());
          Platycosm.st2.assignTo(generators[1].getArray());
          Platycosm.gr.assignTo(generators[2].getArray());
        } else if (which === Platycosm.PA2) {
          MatrixBuilder.euclidean().translate([4, 0, 0]).assignTo(generators[0].getArray());
          Platycosm.gr.assignTo(generators[1].getArray());
          generators[2].setArray(P3.makeScrewMotionMatrix(null, [0, 0, 0], [0, 0, 2], Math.PI, Pn.EUCLIDEAN));
        } else {
          Platycosm.st.assignTo(generators[0].getArray());
          Platycosm.gr.assignTo(generators[1].getArray());
          generators[2].setArray(P3.makeScrewMotionMatrix(null, [-1, 0, 0], [-1, 0, 2], Math.PI, Pn.EUCLIDEAN));
        }
        break;
      default:
        throw new Error(`Not yet implemented ${Platycosm.names[which]}`);
    }

    // Append inverses when needed.
    if (generators && generators.length === Platycosm.numGenerators * 2 && generators[Platycosm.numGenerators] == null) {
      for (let i = 0; i < Platycosm.numGenerators; i += 1) {
        generators[i + Platycosm.numGenerators] = generators[i].getInverse();
      }
    }

    const g = new Platycosm();
    g.setGenerators(generators);
    g.setName(Platycosm.names[which]);
    return g;
  }

  // Maintains Java API compatibility.
  setChangeOfBasis(a, sc, x, y) {
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
    super.setChangeOfBasis(cob);
  }

  static screwMotion(from, to, phi) {
    return Rn.times(null, P3.makeRotationMatrix(null, from, to, phi, Pn.EUCLIDEAN), P3.makeTranslationMatrix(null, from, to, Pn.EUCLIDEAN));
  }

  static glideReflection(plane, from, to) {
    return Rn.times(null, P3.makeReflectionMatrix(null, plane, Pn.EUCLIDEAN), P3.makeTranslationMatrix(null, from, to, Pn.EUCLIDEAN));
  }
}

Platycosm.initializeStatics();

