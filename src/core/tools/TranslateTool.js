/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.tools.TranslateTool.

import { Matrix } from '../math/Matrix.js';
import { MatrixBuilder } from '../math/MatrixBuilder.js';
import { Transformation } from '../scene/Transformation.js';
import { AbstractTool } from '../scene/tool/AbstractTool.js';
import { InputSlot } from '../scene/tool/InputSlot.js';

/**
 * TranslateTool applies incremental translations to a component transformation.
 *
 * It expects the tool infrastructure to provide:
 * - `PointerTranslation` (translation-only matrix extracted from PointerTransformation)
 * - `DeltaTranslation` (delta between successive PointerTranslation matrices)
 */
export class TranslateTool extends AbstractTool {
  static activate = InputSlot.RIGHT_BUTTON; // (Java uses middle button directly)
  static trafo = InputSlot.DELTA_TRANSLATION;

  /** @type {import('../scene/SceneGraphComponent.js').SceneGraphComponent|null} */
  comp = null;

  constructor() {
    super(TranslateTool.activate);
    this.addCurrentSlot(TranslateTool.trafo);
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  activate(tc) {
    this.comp = tc.getRootToLocal().getLastComponent();
    if (this.comp && this.comp.getTransformation() === null) {
      this.comp.setTransformation(new Transformation());
    }
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  perform(tc) {
    if (!this.comp) return;
    const trafoObj = this.comp.getTransformation();
    if (!trafoObj) return;

    const delta = tc.getTransformationMatrix(TranslateTool.trafo);
    if (!delta) return;

    // MatrixBuilder.euclidean(comp.getTransformation()) is not available in JS,
    // so we seed a Matrix from the transformation matrix array.
    const current = new Matrix(trafoObj.getMatrix(null));
    MatrixBuilder.euclidean(current)
      .times(delta)
      .assignTo(trafoObj);

    // Ensure the viewer updates (jsReality doesn't yet have a central render trigger).
    tc.getViewer().renderAsync();
  }
}


