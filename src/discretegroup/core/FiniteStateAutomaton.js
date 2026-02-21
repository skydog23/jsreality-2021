/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { FiniteStateAutomatonUtility } from './FiniteStateAutomatonUtility.js';

export class FiniteStateAutomaton {
  constructor(genNames = null, transitions = null) {
    this.transitions = transitions ?? [];
    this.lookupTable = new Array(52).fill(0);
    this.numStates = transitions ? transitions.length : 0;
    this.numLetters = transitions && transitions.length > 0 ? transitions[0].length : 0;
    this.nameTable = new Map();
    if (genNames) this.#setupNameTable(genNames);
  }

  /**
   * Parse a kbmag .wa file payload.
   * @param {string} text
   */
  initializeFromText(text) {
    const lines = text.split(/\r?\n/);
    let inAlphabet = false;
    let inStates = false;
    let inTransitions = false;
    let row = 0;
    let column = 0;

    for (const line of lines) {
      const tokens = line.trim().split(/\s+/).filter(Boolean);
      for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (inTransitions) {
          const nums = token.replace(/[^0-9]/g, ' ').trim().split(/\s+/).filter(Boolean);
          for (const n of nums) {
            const value = Number.parseInt(n, 10);
            this.transitions[row][column] = value;
            column += 1;
            if (column === this.numLetters) {
              column = 0;
              row += 1;
              if (row === this.numStates) inTransitions = false;
            }
          }
          continue;
        }
        if (token === 'alphabet') {
          inAlphabet = true;
          continue;
        }
        if (token === 'states') {
          inAlphabet = false;
          inStates = true;
          continue;
        }
        if (token === 'transitions') {
          inStates = false;
          inTransitions = true;
          i += 1; // skip := token
          this.transitions = Array.from({ length: this.numStates }, () => new Array(this.numLetters).fill(0));
          continue;
        }
        if (token === 'size') {
          i += 1; // skip :=
          const num = Number.parseInt(tokens[i + 1].replace(',', ''), 10);
          i += 1;
          if (inAlphabet) this.numLetters = num;
          else if (inStates) this.numStates = num;
          continue;
        }
        if (token === 'names' && inAlphabet) {
          i += 1; // skip :=
          const names = tokens[i + 1].replace(/[^a-zA-Z]/g, '');
          i += 1;
          this.#setupNameTable(names);
        }
      }
    }
  }

  #setupNameTable(genNames) {
    this.nameTable.clear();
    this.lookupTable.fill(0);
    for (let i = 0; i < genNames.length; i += 1) {
      const c = genNames.substring(i, i + 1);
      this.nameTable.set(c, i);
      this.lookupTable[FiniteStateAutomatonUtility.intForChar(c)] = i;
    }
  }

  /**
   * @param {string} word
   * @returns {boolean}
   */
  accepts(word) {
    const STATE_FAIL = 0;
    let state = 1;
    for (let i = 0; i < word.length; i += 1) {
      const gen = this.lookupTable[FiniteStateAutomatonUtility.intForChar(word.charAt(i))];
      state = this.transitions[state - 1][gen];
      if (state === STATE_FAIL) return false;
    }
    return true;
  }

  getTransitions() {
    return this.transitions;
  }

  setTransitions(t) {
    this.transitions = t;
  }

  getNumStates() {
    return this.numStates;
  }

  setNumStates(n) {
    this.numStates = n;
  }
}

