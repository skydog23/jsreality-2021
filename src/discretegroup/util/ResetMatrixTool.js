/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
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

