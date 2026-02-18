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
import { DiscreteGroupElement } from './DiscreteGroupElement.js';
import { DiscreteGroupUtility } from './DiscreteGroupUtility.js';
import { FiniteStateAutomatonUtility } from './FiniteStateAutomatonUtility.js';

export class DiscreteGroup {
  static debug = false;

  constructor() {
    this.name = 'Unknown discrete Group';
    this.metric = Pn.EUCLIDEAN;
    this.dimension = 3;
    this.maxDirDomOrbitSize = 75;

    this.isFiniteValue = false;
    this.isFreeValue = false;
    this.hasGenerators = true;
    this.isProjectiveValue = false;

    this.generators = null;
    this.elementList = null;
    this.masterList = null;
    this.fsa = null;
    this.changeOfBasis = new Matrix();
    this.theConstraint = null;
    this.centerPoint = Rn.copy(null, [0, 0, 0, 1]);
    this.colorPicker = null;
    this.changed = true;
    this.generatorRepresentations = null;
    this.fundamentalRegion = null;

    this.inverseTable = null;
    this.genTable = null;
  }

  init() {}

  calculateGenerators() {}

  update() {
    if (this.generators == null && this.hasGenerators) this.calculateGenerators();
    this.generateElements();
  }

  generateElements() {
    if (this.generators == null || !this.hasGenerators) return;
    this.elementList = DiscreteGroupUtility.generateElements(this, this.getConstraint());
  }

  getDefaultFundamentalRegion() {
    if (this.isChanged()) this.update();
    return this.fundamentalRegion;
  }

  setDefaultFundamentalDomain(g) {
    this.fundamentalRegion = g;
  }

  setGenerators(transforms) {
    this.generators = transforms;
    this.genTable = null;
    this.setChanged(true);
    if (this.generators == null) this.hasGenerators = false;
  }

  getGenerators() {
    return this.generators;
  }

  isDebug() {
    return DiscreteGroup.debug;
  }

  setDebug(b) {
    DiscreteGroup.debug = b;
  }

  getCenterPoint() {
    return this.centerPoint;
  }

  setCenterPoint(ds) {
    if (!ds) return;
    this.centerPoint[3] = 1.0;
    for (let i = 0; i < Math.min(4, ds.length); i += 1) this.centerPoint[i] = ds[i];
  }

  getMetric() {
    return this.metric;
  }

  setMetric(i) {
    this.metric = i;
  }

  getChangeOfBasis() {
    return this.changeOfBasis;
  }

  setChangeOfBasis(transform) {
    if (this.changeOfBasis === transform) return;
    if (transform instanceof Matrix) this.changeOfBasis = transform;
    else if (Array.isArray(transform)) this.setChangeOfBasisFromArray(transform);
    this.setChanged(true);
  }

  setChangeOfBasisFromArray(m) {
    const arr = this.changeOfBasis.getArray();
    for (let i = 0; i < 16; i += 1) arr[i] = m[i];
    this.setChanged(true);
  }

  getConstraint() {
    return this.theConstraint;
  }

  setConstraint(constraint) {
    this.theConstraint = constraint;
    this.setChanged(true);
  }

  getFsa() {
    return this.fsa;
  }

  setFsa(automaton) {
    this.fsa = automaton;
  }

  getColorPicker() {
    return this.colorPicker;
  }

  setColorPicker(picker) {
    this.colorPicker = picker;
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;
  }

  isFinite() {
    return this.isFiniteValue;
  }

  setFinite(b) {
    this.isFiniteValue = b;
  }

  getDimension() {
    return this.dimension;
  }

  setDimension(i) {
    this.dimension = i;
  }

  isProjective() {
    return this.isProjectiveValue;
  }

  setProjective(isProjective) {
    this.isProjectiveValue = isProjective;
  }

  hasChanged() {
    return this.isChanged();
  }

  setHasChanged(b) {
    this.setChanged(b);
  }

  getElementList() {
    if (this.isChanged()) this.update();
    return this.elementList;
  }

  setElementList(elementList, hasGenerators = this.generators != null) {
    this.elementList = elementList;
    this.hasGenerators = hasGenerators;
  }

  getGeneratorRepresentations() {
    return this.generatorRepresentations;
  }

  setGeneratorRepresentations(gr) {
    this.generatorRepresentations = gr;
  }

  isFree() {
    return this.isFreeValue;
  }

  setFree(isFree) {
    this.isFreeValue = isFree;
  }

  buildGeneratorHashTable() {
    if (this.genTable == null) this.genTable = new Map();
    if (this.generators == null) return;
    for (const g of this.generators) this.genTable.set(g.getWord(), g);
  }

  getGeneratorInverseWord(w) {
    if (this.genTable == null) this.buildGeneratorHashTable();
    const dgc = this.genTable.get(w);
    const inv = this.getGeneratorInverse(dgc);
    return inv.getWord();
  }

  getGeneratorInverse(dge) {
    if (this.inverseTable == null) {
      this.inverseTable = new Map();
      for (const gen of this.generators) {
        if (this.inverseTable.has(gen)) continue;
        const iw = FiniteStateAutomatonUtility.invertString(gen.getWord());
        let found = false;
        for (const gen2 of this.generators) {
          if (gen2.getWord() === iw) {
            this.inverseTable.set(gen, gen2);
            this.inverseTable.set(gen2, gen);
            found = true;
            break;
          }
        }
        if (!found) {
          const m2 = Rn.times(null, gen.getArray(), gen.getArray());
          if (!Rn.isIdentityMatrix(m2, 1e-7)) throw new Error(`No inverse generator for ${gen.getWord()}`);
          this.inverseTable.set(gen, gen);
        }
      }
    }
    return this.inverseTable.get(dge);
  }

  isChanged() {
    return this.changed;
  }

  setChanged(changed) {
    this.changed = changed;
  }

  getMaxDirDomOrbitSize() {
    return this.maxDirDomOrbitSize;
  }

  setMaxDirDomOrbitSize(maxDirDomOrbitSize) {
    this.maxDirDomOrbitSize = maxDirDomOrbitSize;
  }
}

