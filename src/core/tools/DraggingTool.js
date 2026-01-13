/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.tools.DraggingTool.

import { Matrix } from '../math/Matrix.js';
import { MatrixBuilder } from '../math/MatrixBuilder.js';
import * as P3 from '../math/P3.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { Transformation } from '../scene/Transformation.js';
import { AbstractTool } from '../scene/tool/AbstractTool.js';
import { InputSlot } from '../scene/tool/InputSlot.js';
import { EffectiveAppearance } from '../shader/EffectiveAppearance.js';

/**
 * @typedef {import('../scene/tool/ToolContext.js').ToolContext} ToolContext
 * @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent
 */

export class DraggingTool extends AbstractTool {
  /** @type {boolean} */
  moveChildren = false;

  /** @type {boolean} */
  dragInViewDirection = false;

  static activationSlot = InputSlot.getDevice('DragActivation');
  static alongPointerSlot = InputSlot.getDevice('DragAlongViewDirection');
  static evolutionSlot = InputSlot.getDevice('PointerEvolution');

  /** @type {SceneGraphComponent|null} */
  comp = null;

  /** @type {EffectiveAppearance|null} */
  eap = null;

  /** @type {number} */
  metric = Pn.EUCLIDEAN;

  /** @type {Matrix} */
  result = new Matrix();

  /** @type {Matrix} */
  local2world = new Matrix();

  /** @type {Matrix|null} */
  dragFrame = null;

  /** @type {Matrix} */
  pointer = new Matrix();

  /**
   * Java overloads:
   * - DraggingTool(InputSlot ...activationSlots)
   * - DraggingTool() { this(activationSlot); addCurrentSlot(evolutionSlot); addCurrentSlot(alongPointerSlot); }
   *
   * @param  {...import('../scene/tool/InputSlot.js').InputSlot} activationSlots
   */
  constructor(...activationSlots) {
    if (activationSlots.length > 0) {
      super(...activationSlots);
    } else {
      super(DraggingTool.activationSlot);
      this.addCurrentSlot(DraggingTool.evolutionSlot);
      this.addCurrentSlot(DraggingTool.alongPointerSlot);
    }
  }

  /**
   * @param {ToolContext} tc
   */
  activate(tc) {
    console.log("dragging tool activate");
    const path = this.moveChildren ? tc.getRootToLocal() : tc.getRootToToolComponent();
    this.comp = path?.getLastComponent?.() || null;
    if (this.comp && this.comp.getTransformation() === null) {
      this.comp.setTransformation(new Transformation());
    }

    try {
      const state = tc.getAxisState(DraggingTool.alongPointerSlot);
      if (state && state.isPressed()) {
        this.dragInViewDirection = true;
      } else {
        this.dragInViewDirection = false;
      }
    } catch (err) {
      // no drag in zaxis
      this.dragInViewDirection = false;
    }
    this.dragInViewDirection = false; // avoid bug here
    const rootToTool = tc.getRootToToolComponent();
    if (rootToTool && (this.eap === null || !EffectiveAppearance.matches(this.eap, rootToTool))) {
      this.eap = EffectiveAppearance.createFromPath(rootToTool);
    }
    this.metric = this.eap ? this.eap.getAttribute('metric', Pn.EUCLIDEAN) : Pn.EUCLIDEAN;
  }

  /**
   * @param {ToolContext} tc
   */
  perform(tc) {
    console.log("dragging tool perform");
    // Special case: changes to "DragAlongViewDirection" update the mode and consume no motion.
    if (tc.getSource() === DraggingTool.alongPointerSlot) {
      const state = tc.getAxisState(DraggingTool.alongPointerSlot);
      if (state && state.isPressed()) {
        this.dragInViewDirection = true;
      } else {
        this.dragInViewDirection = false;
      }
      return;
    }
    this.dragInViewDirection = false;
    if (!this.comp) return;

    const evoArr = tc.getTransformationMatrix(DraggingTool.evolutionSlot);
    if (!evoArr) return;
    const evolution = new Matrix(evoArr);

    // need to convert from euclidean to possibly non-euclidean translation
    if (this.metric !== Pn.EUCLIDEAN) {
      MatrixBuilder.init(null, this.metric).translate(evolution.getColumn(3)).assignTo(evolution);
    }

    const path = this.moveChildren ? tc.getRootToLocal() : tc.getRootToToolComponent();
    path.getMatrix(this.local2world.getArray());
    if (Rn.isNan(this.local2world.getArray())) return;

    const trafoObj = this.comp.getTransformation();
    if (!trafoObj) return;
    trafoObj.getMatrix(this.result.getArray());

    if (this.dragInViewDirection) {
      const c2w = tc.getTransformationMatrix(InputSlot.getDevice('CameraToWorld'));
      if (!c2w) return;
      this.pointer.assignFrom(c2w);
      const dz = evolution.getEntry(0, 3) + evolution.getEntry(1, 3);
      const tlate = Rn.times(null, dz, this.pointer.getColumn(2));
      if (this.metric === Pn.EUCLIDEAN) tlate[3] = 1.0;
      MatrixBuilder.init(null, this.metric).translate(tlate).assignTo(evolution);
    }

    evolution.conjugateBy(this.local2world.getInverse());
    if (this.metric !== Pn.EUCLIDEAN) {
      P3.orthonormalizeMatrix(evolution.getArray(), evolution.getArray(), 10e-8, this.metric);
    }

    this.result.multiplyOnRight(evolution);
    if (Rn.isNan(this.result.getArray())) return;
    trafoObj.setMatrix(this.result.getArray());

    // jsReality currently needs an explicit render trigger from tools.
    tc.getViewer().renderAsync();
  }

  getMoveChildren() {
    return this.moveChildren;
  }

  setMoveChildren(moveChildren) {
    this.moveChildren = moveChildren;
  }
}


