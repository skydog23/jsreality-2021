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
import { DiscreteGroup } from '../core/DiscreteGroup.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { DiscreteGroupUtility } from '../core/DiscreteGroupUtility.js';
import { FiniteStateAutomaton } from '../core/FiniteStateAutomaton.js';

export class BorromeanUtility {
  static __POWERS__ = '__POWERS__';

  static fsaTemplate = `_RWS := rec(
isRWS := true,
ordering := "shortlex",
generatorOrder := [a,A,b,B,c,C,d,D,e,E,f,F],
inverses := [A,a,B,b,C,c,D,d,E,e,F,f],
equations := [${BorromeanUtility.__POWERS__} [c*a*d*A,IdWord],[d*b*c*B,IdWord],[e*c*f*C,IdWord],[e*B*E*A,IdWord],[f*d*e*D,IdWord],[f*A*F*B,IdWord]]);`;

  static gens = ['a', 'b', 'c', 'd', 'e', 'f'];

  static borromColors = [
    [0.3, 0.5, 1.0],
    [0.3, 1.0, 0.5],
    [1.0, 0.2, 0.2],
    [0.7, 0.6, 0.6],
  ];

  static prettier = P3.makeRotationMatrixX(null, Math.PI / 2);

  static powerRelnsForOrder(n) {
    if (n === -1) return '';
    let s = '';
    for (let i = 0; i < 6; i += 1) {
      s += '[';
      const g = BorromeanUtility.gens[i];
      for (let j = 0; j < n; j += 1) {
        s += g;
        if (j !== n - 1) s += '*';
      }
      s += ',IdWord],';
    }
    return s;
  }

  /**
   * Browser-safe fallback: we cannot run external kbmag/autgroup in JS runtime.
   * Returns an empty automaton placeholder.
   */
  static fsaForBorromeanOrder(_n) {
    return new FiniteStateAutomaton();
  }

  static borromeanLimitGenerators() {
    const para = [-1, -2, 0, 2, 2, 1, 0, -2, 0, 0, 1, 0, -2, -2, 0, 3];
    return BorromeanUtility.generateGeneratorsFromSingleMotion(para, Pn.HYPERBOLIC);
  }

  static borromeanGroupOfOrder(n) {
    const tg = new DiscreteGroup();
    tg.setName(`borromean-${n}`);
    tg.setGenerators(BorromeanUtility.borromeanGenerators(n));
    tg.setFsa(BorromeanUtility.fsaForBorromeanOrder(n));
    tg.setMetric(n === 2 ? Pn.EUCLIDEAN : Pn.HYPERBOLIC);
    tg.setDimension(3);
    tg.setFinite(false);
    return tg;
  }

  static colorEdges(we) {
    const edges = we.getEdgeList();
    const ecolors = new Array(edges.length);
    for (let i = 0; i < edges.length; i += 1) {
      const edge = edges[i];
      const dge1 = edge?.fL?.source;
      const dge2 = edge?.fR?.source;
      let index = 3;
      if (dge1 && dge2) {
        const product = Rn.times(null, dge1.getArray(), dge2.getArray());
        if (Rn.isIdentityMatrix(product, 1e-7)) {
          const w = dge1.getWord();
          if (w === 'a' || w === 'A' || w === 'b' || w === 'B') index = 0;
          else if (w === 'c' || w === 'C' || w === 'd' || w === 'D') index = 1;
          else if (w === 'e' || w === 'E' || w === 'f' || w === 'F') index = 2;
        }
      }
      ecolors[i] = BorromeanUtility.borromColors[index];
    }
    we.setEdgeColors(ecolors);
  }

  static colorFaces(we) {
    const faces = we.getFaceList();
    const fcolors = new Array(faces.length);
    for (let i = 0; i < faces.length; i += 1) {
      const dge1 = faces[i]?.source;
      let index = 0;
      if (dge1) {
        const w = dge1.getWord();
        if (w === 'a' || w === 'A' || w === 'b' || w === 'B') index = 0;
        else if (w === 'c' || w === 'C' || w === 'd' || w === 'D') index = 1;
        else if (w === 'e' || w === 'E' || w === 'f' || w === 'F') index = 2;
      }
      fcolors[i] = BorromeanUtility.borromColors[index];
    }
    we.setFaceColors(fcolors);
  }

  static borromeanGenerators(order) {
    if (order === -1) return BorromeanUtility.borromeanLimitGenerators();
    if (order === 2) {
      const p0 = [1, -1, 0, 1];
      const p1 = [1, 1, 0, 1];
      const rot = P3.makeRotationMatrix(null, p1, p0, Math.PI, Pn.EUCLIDEAN);
      return BorromeanUtility.generateGeneratorsFromSingleMotion(rot, Pn.EUCLIDEAN);
    }
    const angle = (2 * Math.PI) / order;
    const ca = Math.cos(angle);
    const d = (ca - 3) / (ca - 1);
    const b = (d - Math.sqrt(d * d - 4)) / 2;
    const a = Math.sqrt(1 - b);
    const p0 = [a, a * b, 0, 1];
    const p1 = [a, -a * b, 0, 1];
    const rot = P3.makeRotationMatrix(null, p1, p0, angle, Pn.HYPERBOLIC);
    return BorromeanUtility.generateGeneratorsFromSingleMotion(rot, Pn.HYPERBOLIC);
  }

  static generateGeneratorsFromSingleMotion(rot, sig) {
    const gens = new Array(sig === Pn.EUCLIDEAN ? 6 : 12);
    const syms = BorromeanUtility.getS3Group();
    let count = 0;
    for (let i = 0; i < 6; i += 1) {
      const rotc = Rn.conjugateByMatrix(null, rot, syms[i]);
      gens[count] = new DiscreteGroupElement(sig, rotc);
      gens[count].setWord(DiscreteGroupUtility.genNames[i]);
      gens[count].setColorIndex(i);
      if (sig !== Pn.EUCLIDEAN) {
        gens[count + 6] = gens[count].getInverse();
        gens[count + 6].setWord(DiscreteGroupUtility.genInvNames[i]);
      }
      count += 1;
    }
    for (let i = 0; i < gens.length; i += 1) {
      gens[i].setArray(Rn.conjugateByMatrix(null, gens[i].getArray(), BorromeanUtility.prettier));
    }
    return gens;
  }

  static getS3Group() {
    const syms = [new Array(3), new Array(3)];
    const rets = new Array(6);
    syms[0][0] = syms[1][0] = Rn.identityMatrix(4);
    const p0 = [0, -1, 0, 1];
    const p1 = [0, 1, 0, 1];
    syms[0][1] = P3.makeRotationMatrix(null, p0, p1, Math.PI, Pn.EUCLIDEAN);
    syms[1][2] = P3.makeRotationMatrix(null, [1, 1, 1], (2 * Math.PI) / 3);
    syms[1][1] = Rn.times(null, syms[1][2], syms[1][2]);
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 2; j += 1) {
        rets[2 * i + j] = Rn.times(null, syms[1][i], syms[0][j]);
      }
    }
    return rets;
  }

  static getS3Group2() {
    const syms = [new Array(3), new Array(3)];
    const rets = new Array(12);
    syms[0][0] = syms[1][0] = Rn.identityMatrix(4);
    const p0 = [1, -1, 0, 1];
    const p1 = [1, 1, 0, 1];
    syms[0][1] = P3.makeRotationMatrix(null, p0, p1, Math.PI, Pn.EUCLIDEAN);
    syms[1][2] = P3.makeRotationMatrix(null, [1, 1, 1], (2 * Math.PI) / 3);
    syms[1][1] = Rn.times(null, syms[1][2], syms[1][2]);

    const rot2 = new Array(16).fill(0);
    MatrixBuilder.euclidean().translate(-2, -2, -2).reflect([0, 0, 1, -1]).assignTo(rot2);
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 2; j += 1) {
        rets[2 * i + j] = Rn.times(null, syms[1][i], syms[0][j]);
        rets[2 * i + j + 6] = Rn.times(null, syms[1][i], Rn.times(null, rot2, syms[0][j]));
      }
    }
    return rets;
  }
}

