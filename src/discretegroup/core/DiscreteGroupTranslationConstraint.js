/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { DiscreteGroupConstraint } from './DiscreteGroupConstraint.js';
import { DiscreteGroupSimpleConstraint } from './DiscreteGroupSimpleConstraint.js';

export class DiscreteGroupTranslationConstraint extends DiscreteGroupConstraint {
  /**
   * @param {number[]} dims
   * @param {string} gens
   */
  constructor(dims, gens = 'abc') {
    super();
    this.dims = [...dims];
    this.dim = dims.length;
    this.gens = gens;
    this.inv = gens.toUpperCase();
    this.max = DiscreteGroupSimpleConstraint.globalMaxNumberElements;
  }

  acceptElement(dge) {
    const counts = this.#countGens(dge.getWord() || '');
    if (counts[0] < 0) return false;
    for (let i = 0; i < this.dim; ++i) {
      if (counts[i] >= this.dims[i]) return false;
    }
    return true;
  }

  getMaxNumberElements() {
    return this.max;
  }

  setMaxNumberElements(i) {
    this.max = i;
  }

  #countGens(word) {
    const cnt = new Array(this.dim).fill(0);
    let valid = true;
    for (let i = 0; i < word.length && valid; ++i) {
      for (let j = 0; j < this.dim; ++j) {
        if (word[i] === this.gens[j]) cnt[j] += 1;
        else if (word[i] === this.inv[j]) {
          valid = false;
          break;
        }
      }
    }
    if (!valid) return new Array(this.dim).fill(-1);
    return cnt;
  }

  update() {}
}

