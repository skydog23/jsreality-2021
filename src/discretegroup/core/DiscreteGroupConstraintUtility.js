/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import * as Rn from '../../core/math/Rn.js';

/**
 * Port of `de.jtem.discretegroup.core.DiscreteGroupConstraintUtility`.
 */
export class DiscreteGroupConstraintUtility {
  static directIsometryConstraint(onlyDirect) {
    const od = !!onlyDirect;
    let max = -1;
    return {
      acceptElement(dge) {
        if (od) return Rn.determinant(dge.getArray()) > 0;
        return true;
      },
      getMaxNumberElements() {
        return max;
      },
      setMaxNumberElements(i) {
        max = i;
      },
      update() {},
    };
  }

  static wordLengthConstraint(n) {
    if (n < 0) {
      let max = 1;
      return {
        acceptElement(_dge) {
          return true;
        },
        getMaxNumberElements() {
          return max;
        },
        setMaxNumberElements(i) {
          max = i;
        },
        update() {},
      };
    }

    let max = 120;
    return {
      acceptElement(dge) {
        return (dge.getWord() || '').length <= n;
      },
      getMaxNumberElements() {
        return 120;
      },
      setMaxNumberElements(i) {
        max = i;
      },
      update() {},
      // keep parity with Java (value is currently unused there as well)
      _maxInternal() {
        return max;
      },
    };
  }
}

