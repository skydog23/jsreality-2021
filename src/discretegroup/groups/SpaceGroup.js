/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as P3 from '../../core/math/P3.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { DiscreteGroupUtility } from '../core/DiscreteGroupUtility.js';
import { EuclideanGroup } from './EuclideanGroup.js';

export class SpaceGroup extends EuclideanGroup {
  static basenames = ['8o', '4-', '4o', '4+', '2-', '2o', '2+', '1o', '8o2', '4-2', '4o2', '4+2', '2-2', '2o2', '2+2', '1o2'];

  static of = 8;

  static _8o = 0;
  static _4m = 1;
  static _4o = 2;
  static _4p = 3;
  static _2m = 4;
  static _2o = 5;
  static _2p = 6;
  static _1o = 7;
  static _8o2 = 0 + SpaceGroup.of;
  static _4m2 = 1 + SpaceGroup.of;
  static _4o2 = 2 + SpaceGroup.of;
  static _4p2 = 3 + SpaceGroup.of;
  static _2m2 = 4 + SpaceGroup.of;
  static _2o2 = 5 + SpaceGroup.of;
  static _2p2 = 6 + SpaceGroup.of;
  static _1o2 = 7 + SpaceGroup.of;

  static instanceOfGroup(num) {
    const sg = new SpaceGroup();
    sg.setMetric(Pn.EUCLIDEAN);
    sg.setDimension(3);
    sg.setFinite(false);

    let generators = null;
    const reflPlanes = [[0, 1, 0, 0], [0, 1, -1, 0], [-1, 0, 1, 0], [-1, 0, 0, 1]];
    const points = [[0, 0, 0, 1], [1, 0, 0, 1], [1, 0, 1, 1], [1, 1, 1, 1]];

    switch (num) {
      case SpaceGroup._8o2: {
        generators = new Array(1 + reflPlanes.length);
        for (let i = 0; i < reflPlanes.length; i += 1) {
          generators[i] = new DiscreteGroupElement();
          MatrixBuilder.euclidean().reflect(reflPlanes[i]).assignTo(generators[i].getArray());
          generators[i].setWord(DiscreteGroupUtility.genNames[i]);
        }
        generators[4] = new DiscreteGroupElement();
        const m1 = Rn.times(null, 0.5, Rn.add(null, points[0], points[3]));
        const m2 = Rn.times(null, 0.5, Rn.add(null, points[1], points[2]));
        const m = P3.makeRotationMatrix(null, m1, m2, Math.PI, Pn.EUCLIDEAN);
        generators[4].setArray(m);
        generators[4].setWord(DiscreteGroupUtility.genNames[4]);
        sg.setCenterPoint([0.375, 0.125, 0.25, 1]);
        break;
      }
      case SpaceGroup._4m2: {
        generators = new Array(reflPlanes.length);
        for (let i = 0; i < reflPlanes.length; i += 1) {
          generators[i] = new DiscreteGroupElement();
          MatrixBuilder.euclidean().reflect(reflPlanes[i]).assignTo(generators[i].getArray());
          generators[i].setWord(DiscreteGroupUtility.genNames[i]);
        }
        sg.setCenterPoint([0.75, 0.25, 0.5, 1]);
        break;
      }
      case SpaceGroup._2m2: {
        const rPlanes = [[0, 1, 1, 0], [0, 1, -1, 0], [-1, 0, 1, 0], [-1, 0, 0, 1]];
        generators = new Array(reflPlanes.length);
        for (let i = 0; i < reflPlanes.length; i += 1) {
          generators[i] = new DiscreteGroupElement();
          MatrixBuilder.euclidean().reflect(rPlanes[i]).assignTo(generators[i].getArray());
          generators[i].setWord(DiscreteGroupUtility.genNames[i]);
        }
        sg.setCenterPoint([0.75, 0.0, 0.5, 1.0]);
        break;
      }
      default: {
        const rPlanes1 = [[0, 1, 1, 0], [0, 1, -1, 0], [-1, 0, 1, 0], [1, 0, 1, -2]];
        const pts1 = [[0, 0, 0, 1], [1, -1, 1, 1], [2, 0, 0, 1], [1, 1, 1, 1]];
        generators = new Array(reflPlanes.length);
        for (let i = 0; i < reflPlanes.length; i += 1) {
          generators[i] = new DiscreteGroupElement();
          MatrixBuilder.euclidean().reflect(rPlanes1[i]).assignTo(generators[i].getArray());
          generators[i].setWord(DiscreteGroupUtility.genNames[i]);
        }
        let cp = [1, 0, 0.5, 1.0];
        if (num === SpaceGroup._2o2 || num === SpaceGroup._2p2 || num === SpaceGroup._4o2 || num === SpaceGroup._4p2) {
          let m;
          if (num === SpaceGroup._4o2) {
            const p1 = [1, 0, 0, 1];
            const p2 = [1, 0, 1, 1];
            const pl = [0, 0, 1, -0.5];
            const rot = P3.makeRotationMatrix(null, p1, p2, Math.PI / 2, Pn.EUCLIDEAN);
            const ref = P3.makeReflectionMatrix(null, pl, Pn.EUCLIDEAN);
            m = Rn.times(null, ref, rot);
            generators[0].setArray(m);
            generators[3].setArray(Rn.times(null, m, m));
            cp = [0.75, 0.25, 0.5, 1];
          } else {
            let i1; let i2; let j1; let j2;
            if (num === SpaceGroup._2o2) {
              i1 = 0; i2 = 2; j1 = 1; j2 = 3;
            } else {
              i1 = 0; i2 = 3; j1 = 1; j2 = 2;
            }
            const m1 = Rn.times(null, 0.5, Rn.add(null, pts1[i1], pts1[i2]));
            const m2 = Rn.times(null, 0.5, Rn.add(null, pts1[j1], pts1[j2]));
            m = P3.makeRotationMatrix(null, m1, m2, Math.PI, Pn.EUCLIDEAN);
            generators[3].setArray(m);
            cp = [0.9, 0, 0.25, 1.0];
            if (num === SpaceGroup._4p2) {
              i1 = 0; i2 = 1; j1 = 2; j2 = 3;
              const mm1 = Rn.times(null, 0.5, Rn.add(null, pts1[i1], pts1[i2]));
              const mm2 = Rn.times(null, 0.5, Rn.add(null, pts1[j1], pts1[j2]));
              generators[0].setArray(P3.makeRotationMatrix(null, mm1, mm2, Math.PI, Pn.EUCLIDEAN));
              cp = [1, 0.25, 0.5, 1];
            }
          }
        }
        sg.setCenterPoint(cp);
      }
        break;
    }

    sg.setGenerators(generators);
    sg.setName(SpaceGroup.basenames[num] ?? `space-${num}`);
    sg.update();
    return sg;
  }
}

