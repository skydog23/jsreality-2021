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
import { InputSlot } from '../../core/scene/tool/InputSlot.js';
import { DraggingTool } from '../../core/tools/DraggingTool.js';

/**
 * Port of de.jtem.discretegroup.util.TranslateTool.
 * Restricts DraggingTool to translations in the xy-plane.
 */
export class TranslateTool extends DraggingTool {
  static activationSlot = InputSlot.getDevice('RotateActivation');
  static evolutionSlot = InputSlot.getDevice('PointerEvolution');

  constructor(...activation) {
    super(...(activation.length > 0 ? activation : [TranslateTool.activationSlot]));
    this.addCurrentSlot(TranslateTool.evolutionSlot);
  }

  perform(tc) {
    super.perform(tc);
    if (this.dragInViewDirection) return;
    this.result.getArray()[11] = 0.0; // Force z-translation to zero.
    if (this.metric === Pn.EUCLIDEAN) {
      const tmp = Rn.identityMatrix(4);
      tmp[3] = this.result.getArray()[3];
      tmp[7] = this.result.getArray()[7];
      this.result = new Matrix(tmp);
    }
    if (this.comp?.getTransformation()) {
      this.comp.getTransformation().setMatrix(this.result.getArray());
      tc.getViewer()?.renderAsync?.();
    }
  }
}

