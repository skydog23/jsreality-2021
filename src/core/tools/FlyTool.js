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
import { MatrixBuilder } from '../math/MatrixBuilder.js';
import { Transformation } from '../scene/Transformation.js';

/**
 * Practical JS fly-camera/object tool compatible with ProjectiveGeometry imports.
 */
export class FlyTool extends AbstractTool {
  static activation = InputSlot.LEFT_BUTTON;
  static pointerEvolution = InputSlot.POINTER_EVOLUTION;

  moveSpeed = 0.03;
  turnSpeed = 1.0;
  comp = null;

  constructor() {
    super(FlyTool.activation);
    this.setName('fly');
    this.addCurrentSlot(FlyTool.pointerEvolution);
    this.addCurrentSlot(InputSlot.VK_W);
    this.addCurrentSlot(InputSlot.VK_A);
    this.addCurrentSlot(InputSlot.VK_S);
    this.addCurrentSlot(InputSlot.VK_D);
  }

  activate(tc) {
    this.comp = tc.getRootToToolComponent()?.getLastComponent?.() ?? tc.getRootToLocal()?.getLastComponent?.() ?? null;
    if (this.comp && this.comp.getTransformation() == null) {
      this.comp.setTransformation(new Transformation());
    }
  }

  perform(tc) {
    if (!this.comp) return;
    const t = this.comp.getTransformation();
    if (!t) return;
    const pm = tc.getTransformationMatrix(FlyTool.pointerEvolution);
    let dx = 0;
    let dy = 0;
    if (pm) {
      dx = pm[3] ?? 0;
      dy = pm[7] ?? 0;
    }
    const m = MatrixBuilder.euclidean(t.getMatrix(null));
    if (dx !== 0) m.rotateY(this.turnSpeed * dx);
    if (dy !== 0) m.rotateX(this.turnSpeed * dy);
    const w = tc.getAxisState?.(InputSlot.VK_W)?.isPressed?.() ?? false;
    const a = tc.getAxisState?.(InputSlot.VK_A)?.isPressed?.() ?? false;
    const s = tc.getAxisState?.(InputSlot.VK_S)?.isPressed?.() ?? false;
    const d = tc.getAxisState?.(InputSlot.VK_D)?.isPressed?.() ?? false;
    const tx = (d ? 1 : 0) - (a ? 1 : 0);
    const tz = (s ? 1 : 0) - (w ? 1 : 0);
    if (tx !== 0 || tz !== 0) m.translate(this.moveSpeed * tx, 0, this.moveSpeed * tz);
    m.assignTo(t);
    tc.getViewer().renderAsync();
  }
}

