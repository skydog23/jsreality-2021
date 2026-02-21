/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

export class FiniteStateAutomatonUtility {
  static intForChar(c) {
    if (c >= 'a' && c <= 'z') return c.charCodeAt(0) - 'a'.charCodeAt(0);
    return 26 + (c.charCodeAt(0) - 'A'.charCodeAt(0));
  }

  static insertStars(word) {
    return word.split('').join('*');
  }

  /**
   * Toggle case for each letter, preserving order.
   * @param {string} gens
   * @returns {string}
   */
  static invertString(gens) {
    let result = '';
    for (const c of gens) {
      if (c === ',') {
        result += c;
      } else if (c >= 'a' && c <= 'z') {
        result += c.toUpperCase();
      } else {
        result += c.toLowerCase();
      }
    }
    return result;
  }

  /**
   * @param {import('./DiscreteGroupElement.js').DiscreteGroupElement[]} gens
   * @returns {string}
   */
  static generatorsAsString(gens) {
    const set = new Set(gens.map((g) => g.getWord()));
    return `[${[...set].join(',')}]`;
  }

  /**
   * @param {string[]} relationStrings
   * @returns {string}
   */
  static relationsAsString(relationStrings) {
    let first = true;
    let result = '';
    for (const reln of relationStrings) {
      result += `${first ? '[' : ',['}${FiniteStateAutomatonUtility.insertStars(reln)},IdWord]`;
      first = false;
    }
    return result;
  }
}

