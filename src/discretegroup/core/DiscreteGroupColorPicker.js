/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { FactoredMatrix } from '../../core/math/FactoredMatrix.js';
import * as P3 from '../../core/math/P3.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { Appearance } from '../../core/scene/Appearance.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import Color from '../../core/util/Color.js';
import { DiscreteGroupElement } from './DiscreteGroupElement.js';

const REFLECTION_MATRIX = P3.makeScaleMatrix(null, -1, -1, -1);

/**
 * Port of de.jtem.discretegroup.core.DiscreteGroupColorPicker.
 */
export class DiscreteGroupColorPicker {
  static colors = [
    Color.GREEN,
    Color.BLUE,
    Color.RED,
    Color.MAGENTA,
    Color.CYAN,
    Color.YELLOW,
  ];

  static appearanceList = DiscreteGroupColorPicker.colors.map((c) => {
    const ap = new Appearance();
    ap.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, c);
    return ap;
  });

  calculateColorIndexForElement(_dge) {
    throw new Error('DiscreteGroupColorPicker.calculateColorIndexForElement() must be implemented');
  }

  assignColorIndices(elist) {
    if (!elist) return;
    for (const dge of elist) {
      dge.setColorIndex(this.calculateColorIndexForElement(dge));
    }
  }
}

export class ReflectionColorPicker extends DiscreteGroupColorPicker {
  calculateColorIndexForElement(dge) {
    return Rn.determinant(dge.getArray()) > 0 ? 0 : 1;
  }
}

export class RotationColorPicker extends DiscreteGroupColorPicker {
  constructor(c = 2) {
    super();
    this.cycleSize = c;
  }

  calculateColorIndexForElement(dge) {
    let m = dge.getArray();
    const det = Rn.determinant(m);
    if (det < 0) {
      const refl = P3.makeReflectionMatrix(null, [0, 1, 0, 0], Pn.EUCLIDEAN);
      m = Rn.times(null, m, refl);
    }
    const fm = new FactoredMatrix(m);
    let angle = (fm.getRotationAngle() * this.cycleSize) / (2 * Math.PI);
    if (angle < 0) angle += 2 * Math.PI;
    return Math.floor(angle + 0.01);
  }
}

export class RotationReflectionColorPicker extends RotationColorPicker {
  constructor(c = 2) {
    super(c);
  }

  calculateColorIndexForElement(dge) {
    const noref = DiscreteGroupElement.from(dge);
    noref.setArray(Rn.times(null, dge.getArray(), REFLECTION_MATRIX));
    const n = super.calculateColorIndexForElement(noref);
    const d = Rn.determinant(dge.getArray());
    return (d > 0 ? 0 : this.cycleSize) + n;
  }
}

export class LinearFunctionColorPicker extends DiscreteGroupColorPicker {
  constructor(gens, coefficients) {
    super();
    this.gens = gens;
    this.coefficients = coefficients;
    this.genNames = (gens || []).map((g) => (g.getWord() || '?').charAt(0)).join('');
  }

  calculateColorIndexForElement(dge) {
    const word = dge.getWord() || '';
    let count = 0;
    for (let i = 0; i < word.length; i += 1) {
      for (let j = 0; j < this.genNames.length; j += 1) {
        if (word.charAt(i) === this.genNames.charAt(j)) {
          count += this.coefficients[j % this.coefficients.length];
        }
      }
    }
    return count;
  }
}

// Java-style nested-class access compatibility.
DiscreteGroupColorPicker.ReflectionColorPicker = ReflectionColorPicker;
DiscreteGroupColorPicker.RotationColorPicker = RotationColorPicker;
DiscreteGroupColorPicker.RotationReflectionColorPicker = RotationReflectionColorPicker;
DiscreteGroupColorPicker.LinearFunctionColorPicker = LinearFunctionColorPicker;

