/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { AbstractTool } from '../scene/tool/AbstractTool.js';
import { InputSlot } from '../scene/tool/InputSlot.js';
import * as Rn from '../math/Rn.js';

/**
 * Translates the camera in its local XY plane to follow pointer drag motion,
 * providing a "hand / pan" interaction.
 *
 * Designed to be registered on the scene root so that the pick-based depth
 * selection activates it only when the user clicks on empty space (no geometry
 * hit).  When geometry is hit, deeper tools such as RotateTool take priority.
 */
export class PanCameraTool extends AbstractTool {
  #startPointer = [0, 0];
  #startCameraMatrix = null;
  #cameraComponent = null;
  #speed = 1.0;

  constructor() {
    super(InputSlot.ROTATE_ACTIVATION);
    this.addCurrentSlot(InputSlot.POINTER_TRANSFORMATION, 'Pointer position for panning');
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  activate(tc) {
    const ptr = tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION);
    if (!ptr) return;
    this.#startPointer = [ptr[3], ptr[7]];
    this.#cameraComponent = tc.getViewer().getCameraPath().getLastComponent();
    if (this.#cameraComponent?.getTransformation()) {
      this.#startCameraMatrix = this.#cameraComponent.getTransformation().getMatrix().slice();
    }
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  perform(tc) {
    if (!this.#startCameraMatrix || !this.#cameraComponent) return;
    const ptr = tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION);
    if (!ptr) return;


    const dx = ptr[3] - this.#startPointer[0];
    const dy = ptr[7] - this.#startPointer[1];
    const tx = -dx * this.#speed;
    const ty = -dy * this.#speed;

    const s = this.#startCameraMatrix;
    const next = s.slice();
    // Right-multiply by T(tx, ty, 0): translate in camera-local frame
    next[3]  = s[0] * tx + s[1] * ty + s[3];
    next[7]  = s[4] * tx + s[5] * ty + s[7];
    next[11] = s[8] * tx + s[9] * ty + s[11];
    next[15] = s[12] * tx + s[13] * ty + s[15];

    this.#cameraComponent.getTransformation().setMatrix(next);
  }

  /** @returns {number} */
  getSpeed() { return this.#speed; }

  /** @param {number} speed */
  setSpeed(speed) { this.#speed = speed; }
}
