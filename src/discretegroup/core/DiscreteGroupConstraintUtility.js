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

