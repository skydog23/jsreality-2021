/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import { AbstractTool } from '../../core/scene/tool/AbstractTool.js';

/**
 * Port of de.jtem.discretegroup.util.ResetMatrixTool.
 */
export class ResetMatrixTool extends AbstractTool {
  constructor(...act) {
    super(...act);
    this.comp = null;
  }

  activate(tc) {
    this.comp = tc.getRootToToolComponent()?.getLastComponent?.() ?? null;
    if (this.comp) {
      MatrixBuilder.euclidean().assignTo(this.comp);
      tc.getViewer()?.renderAsync?.();
    }
  }
}

