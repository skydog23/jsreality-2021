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
  static evolution = InputSlot.getDevice('PointerEvolution');

  /** @type {import('../scene/SceneGraphComponent.js').SceneGraphComponent|null} */
  comp = null;
  local2world = new Matrix();
  evolution = new Matrix();

  constructor() {
    super(TranslateTool.activate);
    this.addCurrentSlot(TranslateTool.evolution);
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  activate(tc) {
    this.comp = tc.getRootToLocal().getLastComponent();
    if (this.comp && this.comp.getTransformation() === null) {
      this.comp.setTransformation(new Transformation());
    }
    const path = tc.getRootToLocal();
    this.local2world.assignFrom(path.getMatrix(null));
    console.log("local2world", this.local2world);
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  perform(tc) {
    if (!this.comp) return;
    const currentTform = this.comp.getTransformation();
    if (!currentTform) return;

    this.evolution.assignFrom(tc.getTransformationMatrix(TranslateTool.evolution));
    if (!this.evolution) return;
    console.log("evolution", this.evolution);
   this.evolution.conjugateBy(this.local2world);
    console.log("evolution", this.evolution);
     MatrixBuilder.euclidean(currentTform.getMatrix(null))
      .times(this.evolution)
      .assignTo(currentTform);

    // Ensure the viewer updates (jsReality doesn't yet have a central render trigger).
    tc.getViewer().renderAsync();
  }
}


