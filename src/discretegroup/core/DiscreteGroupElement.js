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
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';

export class DiscreteGroupElement {
  static dgeID = new DiscreteGroupElement();

  /**
   * @param {number} metric
   * @param {number[] | Matrix | null} m
   * @param {string} word
   */
  constructor(metric = Pn.EUCLIDEAN, m = null, word = '?') {
    this.matrix = m == null ? new Matrix() : new Matrix(m);
    this.word = word;
    this.colorIndex = 0;
    this.visible = true;
    this.mapsToNegativeW = false;
    this.metric = metric;
  }

  /**
   * @param {DiscreteGroupElement} dge
   * @returns {DiscreteGroupElement}
   */
  static from(dge) {
    const copy = new DiscreteGroupElement(dge.getMetric(), dge.getMatrix(), dge.getWord());
    copy.setColorIndex(dge.getColorIndex());
    copy.setVisible(dge.isVisible());
    return copy;
  }

  /**
   * @returns {DiscreteGroupElement}
   */
  getInverse() {
    const inv = new DiscreteGroupElement(this.metric, this.matrix.getInverse().getArray());
    inv.setWord(DiscreteGroupElement.invertWord(this.word || ''));
    inv.setColorIndex(this.colorIndex);
    return inv;
  }

  /**
   * @param {string} word
   * @returns {string}
   */
  static invertWord(word) {
    const n = word.length;
    const invWord = new Array(n);
    for (let i = 0; i < n; ++i) {
      const c = word[i];
      invWord[n - i - 1] = c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase();
    }
    return invWord.join('');
  }

  getArray() {
    return this.matrix.getArray();
  }

  /**
   * @param {number[]} m
   */
  setArray(m) {
    const target = this.matrix.getArray();
    for (let i = 0; i < 16; i += 1) target[i] = m[i];
  }

  getMatrix() {
    return this.matrix;
  }

  /**
   * @param {Matrix} m
   */
  setMatrix(m) {
    this.matrix = m;
  }

  getWord() {
    return this.word;
  }

  /**
   * @param {string} word
   */
  setWord(word) {
    this.word = word;
  }

  getColorIndex() {
    return this.colorIndex;
  }

  /**
   * @param {number} c
   */
  setColorIndex(c) {
    this.colorIndex = c;
  }

  /**
   * @param {boolean} b
   */
  setVisible(b) {
    this.visible = b;
  }

  isVisible() {
    return this.visible;
  }

  getMetric() {
    return this.metric;
  }

  /**
   * @param {number} metric
   */
  setMetric(metric) {
    this.metric = metric;
  }

  isMapsToNegativeW() {
    return this.matrix.getArray()[15] < 0;
  }

  /**
   * @param {boolean} mapsToNegativeW
   */
  setMapsToNegativeW(mapsToNegativeW) {
    this.mapsToNegativeW = mapsToNegativeW;
  }

  /**
   * @param {DiscreteGroupElement} el
   */
  multiplyOnRight(el) {
    this.matrix.multiplyOnRight(el.getArray());
    this.setWord((this.getWord() || '') + (el.getWord() || ''));
  }

  /**
   * @param {DiscreteGroupElement} el
   */
  multiplyOnLeft(el) {
    this.matrix.multiplyOnLeft(el.getArray());
    this.setWord((el.getWord() || '') + (this.getWord() || ''));
  }

  /**
   * @param {DiscreteGroupElement[] | null} pro
   * @param {DiscreteGroupElement[] | null} u
   * @param {DiscreteGroupElement[] | null} v
   * @returns {DiscreteGroupElement[] | null}
   */
  static cartesianProduct(pro, u, v) {
    if (!u || !v) return null;
    const product = pro && pro.length === u.length * v.length ? pro : new Array(u.length * v.length);
    for (let i = 0; i < u.length; ++i) {
      for (let j = 0; j < v.length; ++j) {
        const dge = new DiscreteGroupElement();
        dge.setArray(Rn.times(null, u[i].getArray(), v[j].getArray()));
        dge.setWord((u[i].getWord() || '') + (v[j].getWord() || ''));
        product[i * v.length + j] = dge;
      }
    }
    return product;
  }
}

