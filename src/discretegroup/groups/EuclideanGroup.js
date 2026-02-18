/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as Pn from '../../core/math/Pn.js';
import { DiscreteGroup } from '../core/DiscreteGroup.js';

export class EuclideanGroup extends DiscreteGroup {
  static COB_ROTATE = 1;
  static COB_XSCALE = 2;
  static COB_YSCALE = 4;
  static COB_ZSCALE = 8;
  static COB_SHEAR = 6;
  static COB_SCALE = 16;

  constructor() {
    super();
    this.translationSubgroup = null;
    this.oneCell = null;
    this.allowedChangeOfBasis = 0;
  }

  init() {
    super.init();
    this.metric = Pn.EUCLIDEAN;
    this.centerPoint = [0, 0, 0, 1];
  }

  setChangeOfBasis(transform) {
    super.setChangeOfBasis(transform);
    if (this.translationSubgroup != null) {
      this.translationSubgroup.setChangeOfBasis(this.getChangeOfBasis());
    }
  }

  setConstraint(constraint) {
    super.setConstraint(constraint);
    if (this.translationSubgroup != null) {
      this.translationSubgroup.setConstraint(constraint);
    }
  }

  getAllowedChangeOfBasis() {
    return this.allowedChangeOfBasis;
  }

  setAllowedChangeOfBasis(allowedChangeOfBasis) {
    this.allowedChangeOfBasis = allowedChangeOfBasis;
  }
}

