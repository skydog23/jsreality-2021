/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
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

