/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Minimal replacement for Java TranslateShapeTool used by TestDualizeVisitor.
 * Drag with primary mouse button to translate target in the view plane.
 */
import { AbstractTool } from '../scene/tool/AbstractTool.js';
import { InputSlot } from '../scene/tool/InputSlot.js';

export class TranslateShapeTool extends AbstractTool {
  /**
   * @param {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent} target
   * @param {number} [scale=2.0]
   */
  constructor(target, scale = 2.0) {
    super(InputSlot.LEFT_BUTTON);
    this._target = target;
    this._scale = scale;
    this._startPointer = [0, 0];
    this._startMatrix = null;
    this.addCurrentSlot(InputSlot.POINTER_TRANSFORMATION, 'Pointer position for translation');
  }

  /**
   * @param {import('../../core/scene/tool/ToolContext.js').ToolContext} tc
   */
  activate(tc) {
    const ptr = tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION);
    this._startPointer[0] = ptr ? ptr[3] : 0;
    this._startPointer[1] = ptr ? ptr[7] : 0;
    this._startMatrix = this._target.getTransformation().getMatrix();
  }

  /**
   * @param {import('../../core/scene/tool/ToolContext.js').ToolContext} tc
   */
  perform(tc) {
    if (!this._startMatrix) return;
    const ptr = tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION);
    if (!ptr) return;
    const dx = (ptr[3] - this._startPointer[0]) * this._scale;
    const dy = (ptr[7] - this._startPointer[1]) * this._scale;
    const next = this._startMatrix.slice();
    next[3] = this._startMatrix[3] + dx;
    next[7] = this._startMatrix[7] + dy;
    this._target.getTransformation().setMatrix(next);
    tc.getViewer().renderAsync();
  }
}


