/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as Rn from '../../core/math/Rn.js';
import { getLogger } from '../../core/util/LoggingSystem.js';
import { DiscreteGroupElement } from './DiscreteGroupElement.js';
import { DiscreteGroupSimpleConstraint } from './DiscreteGroupSimpleConstraint.js';

export class DiscreteGroupUtility {
  static genNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];

  static genInvNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

  static bigSquare = [
    [5.0, 5.0, 1.0],
    [-5.0, 5.0, 1.0],
    [-5.0, -5.0, 1.0],
    [5.0, -5.0, 1.0],
  ];

  static logger = getLogger('DiscreteGroupUtility');

  static latestDup = null;

  static applyConstraint(dgc, list) {
    if (dgc == null) return list;
    const max = dgc.getMaxNumberElements();
    const out = [];
    for (const dge of list) {
      if (dgc.acceptElement(dge)) out.push(dge);
      if (out.length > max) break;
    }
    return out;
  }

  /**
   * @param {DiscreteGroupElement[]} gens
   * @param {string} word
   * @returns {DiscreteGroupElement}
   */
  static getElementForWord(gens, word) {
    const nameTable = new Map(gens.map((g) => [g.getWord(), g]));
    const ret = new DiscreteGroupElement();
    for (let i = 0; i < word.length; ++i) {
      const gen = nameTable.get(word.substring(i, i + 1));
      if (gen) ret.multiplyOnRight(gen);
    }
    ret.setWord(word);
    return ret;
  }

  static generateElements(dg, constraint = null, dupList = null) {
    const generators = dg.getGenerators();
    if (!generators) {
      DiscreteGroupUtility.logger.warn('No generators');
      return dg.elementList;
    }
    if (constraint == null) constraint = DiscreteGroupSimpleConstraint.defaultConstraint;
    else constraint.update();

    const metric = dg.getMetric();
    const fsa = dg.getFsa();
    const maxNumberElements = constraint.getMaxNumberElements();
    const biglist = [];
    const identity = new DiscreteGroupElement(metric, Rn.identityMatrix(4), '');
    biglist.push(identity);

    let length = 1;
    let oldLength = 0;
    let old2Length = 0;
    const mat = new Array(16).fill(0);
    const dgen = new DiscreteGroupElement();
    dgen.setMetric(metric);

    while (length > oldLength && length < maxNumberElements) {
      oldLength = length;
      for (let i = old2Length; i < oldLength; ++i) {
        const dge = biglist[i];
        for (let j = 0; j < generators.length; ++j) {
          const nextWord = (dge.getWord() || '') + (generators[j].getWord() || '');
          if (DiscreteGroupUtility.trivialDup(dge.getWord() || '', generators[j].getWord() || '')) continue;
          dgen.setWord(nextWord);
          dgen.setColorIndex(dge.getColorIndex() + generators[j].getColorIndex());
          if (fsa && !fsa.accepts(nextWord)) continue;
          Rn.times(mat, dge.getArray(), generators[j].getArray());
          dgen.setArray(mat);
          if (dg.isProjective() && mat[15] < 0) Rn.times(mat, -1, mat);
          if (constraint && !constraint.acceptElement(dgen)) continue;

          if (fsa == null || dupList != null) {
            const dup = DiscreteGroupUtility.isDuplicate(dgen, biglist, dg.isProjective(), false);
            if (dup) {
              if (dupList && DiscreteGroupUtility.latestDup) {
                dupList.push(nextWord + DiscreteGroupUtility.invertWord(dg, DiscreteGroupUtility.latestDup.getWord()));
              }
              continue;
            }
          }
          biglist.push(DiscreteGroupElement.from(dgen));
          length = biglist.length;
          if (length >= maxNumberElements) break;
        }
        if (length >= maxNumberElements) break;
      }
      length = biglist.length;
      old2Length = oldLength;
    }

    dg.setHasChanged(false);
    return biglist;
  }

  static invertWord(dg, word) {
    const n = word.length;
    const invWord = new Array(n);
    for (let i = 0; i < n; ++i) {
      const oneLetter = word.substring(i, i + 1);
      const inverseLetter = dg.getGeneratorInverseWord(oneLetter);
      invWord[n - i - 1] = inverseLetter.charAt(0);
    }
    return invWord.join('');
  }

  static getDuplicates(dg, dgc) {
    const dupList = [];
    DiscreteGroupUtility.generateElements(dg, dgc, dupList);
    return dupList;
  }

  static trivialDup(word, word2) {
    if (word.length === 0) return false;
    if (!word.endsWith(word2)) {
      if (word.endsWith(word2.toLowerCase()) || word.endsWith(word2.toUpperCase())) return true;
    }
    return false;
  }

  static isDuplicate(dgex, list, isProjective, _printDiff) {
    const inv = new Array(16).fill(0);
    const tmp = new Array(16).fill(0);
    const mat = dgex.getArray();
    Rn.inverse(inv, mat);
    for (let i = 0; i < list.length; ++i) {
      const dge = list[i];
      Rn.times(tmp, inv, dge.getArray());
      if (Rn.isIdentityMatrix(tmp, 1e-4) || (isProjective && Rn.isIdentityMatrix(Rn.times(tmp, -1, tmp), 1e-4))) {
        DiscreteGroupUtility.latestDup = dge;
        return true;
      }
    }
    return false;
  }

  static elementFromWord(dg, word) {
    if (dg.genTable == null) dg.buildGeneratorHashTable();
    const dge = new DiscreteGroupElement();
    dge.setWord(word);
    for (let i = 0; i < word.length; ++i) {
      const g = word.substring(i, i + 1);
      const gen = dg.genTable.get(g);
      if (gen != null) dge.multiplyOnLeft(gen);
    }
    return dge;
  }

  static conjugate(dg, conj) {
    const gens = dg.getGenerators();
    if (gens) {
      for (const gen of gens) {
        gen.setArray(Rn.conjugateByMatrix(null, gen.getArray(), conj.getArray()));
      }
      dg.setGenerators(gens);
      dg.update();
      return;
    }
    const ellist = dg.getElementList();
    for (const el of ellist) {
      el.setArray(Rn.conjugateByMatrix(null, el.getArray(), conj.getArray()));
    }
    dg.setElementList(ellist);
  }
}

