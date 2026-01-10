/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.tools.RotateTool (simplified: no animation scheduling).

import { BoundingBoxUtility } from '../geometry/BoundingBoxUtility.js';
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
 * RotateTool applies a trackball-style rotation to the transformation of the
 * selected scene graph component.
 *
 * It expects a virtual device to provide `TrackballTransformation` (see
 * `VirtualRotation` / tool system configuration).
 */
export class RotateTool extends AbstractTool {
  static activationSlot = InputSlot.ROTATE_ACTIVATION;
  static evolutionSlot = InputSlot.TRACKBALL_TRANSFORMATION;

  /** @type {boolean} */
  fixOrigin = true;

  /** @type {boolean} */
  rotateOnPick = false;

  /** @type {boolean} */
  animationEnabled = true; // retained for API compatibility (unused)

  /** @type {boolean} */
  moveChildren = false;

  /** @type {boolean} */
  updateCenter = false;

  /** @type {number} */
  animTimeMin = 250;

  /** @type {number} */
  animTimeMax = 750;

  /** @type {import('../scene/SceneGraphComponent.js').SceneGraphComponent|null} */
  comp = null;

  /** @type {Matrix} */
  center = new Matrix();

  /** @type {EffectiveAppearance|null} */
  eap = null;

  /** @type {number} */
  metric = Pn.EUCLIDEAN;

  /** @type {Matrix} */
  result = new Matrix();

  /** @type {Matrix} */
  evolution = new Matrix();

  /** @type {number} */
  startTime = 0;

  /** @type {boolean} */
  success = false;

  constructor() {
    super(RotateTool.activationSlot);
    this.addCurrentSlot(RotateTool.evolutionSlot);
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  activate(tc) {
     this.startTime = tc.getTime();

    const path = this.moveChildren ? tc.getRootToLocal() : tc.getRootToToolComponent();
    this.comp = path?.getLastComponent?.() || null;

    if (this.comp && this.comp.getTransformation() === null) {
      this.comp.setTransformation(new Transformation());
    }

    if (!this.fixOrigin) {
      const currentPick = tc.getCurrentPick();
      if (this.rotateOnPick && currentPick !== null) {
        this.center = this.#getRotationPoint(tc);
      } else if (this.comp) {
        this.center = this.#getCenter(this.comp);
      }
    }

    const rootToTool = tc.getRootToToolComponent();
    if (rootToTool && (this.eap === null || !EffectiveAppearance.matches(this.eap, rootToTool))) {
      this.eap = EffectiveAppearance.createFromPath(rootToTool);
    }
    this.metric = this.eap ? this.eap.getAttribute('metric', Pn.EUCLIDEAN) : Pn.EUCLIDEAN;
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  perform(tc) {
    // console.log('perform() called, tc:', tc, 'pick:', tc.getCurrentPick());
    this.success = false;
    if (!this.comp) return;

    const path = this.moveChildren ? tc.getRootToLocal() : tc.getRootToToolComponent();
    if (!path) return;

    // object2avatar: orientation-only inverse matrix of the component path.
    const object2avatar = new Matrix(path.getInverseMatrix(null));
    if (Rn.isNan(object2avatar.getArray())) return;

    try {
      object2avatar.assignFrom(
        P3.extractOrientationMatrix(null, object2avatar.getArray(), P3.originP3, this.metric)
      );
    } catch (e) {
      // Set identity matrix
      MatrixBuilder.euclidean().assignToMatrix(object2avatar);
    }

    const evoArr = tc.getTransformationMatrix(RotateTool.evolutionSlot);
    if (!evoArr) return;
    this.evolution.assignFrom(evoArr);
    this.evolution.conjugateBy(object2avatar);

    if (!this.fixOrigin && this.updateCenter) {
      const currentPick = tc.getCurrentPick();
      if (this.rotateOnPick && currentPick !== null) {
        this.center = this.#getRotationPoint(tc);
      } else {
        this.center = this.#getCenter(this.comp);
      }
    }

    if (this.metric !== Pn.EUCLIDEAN) {
      P3.orthonormalizeMatrix(this.evolution.getArray(), this.evolution.getArray(), 1e-7, this.metric);
    }
    // console.log('evolution:', this.evolution);
    // result = currentTransformation * [center] * evolution * [center^-1]
    const currentTrafo = this.comp.getTransformation();
    if (!currentTrafo) return;
    this.result.assignFrom(currentTrafo.getMatrix(null));
    if (!this.fixOrigin) this.result.multiplyOnRight(this.center);
    this.result.multiplyOnRight(this.evolution);
    if (!this.fixOrigin) this.result.multiplyOnRight(this.center.getInverse());
    if (Rn.isNan(this.result.getArray())) return;

    this.success = true;
    currentTrafo.setMatrix(this.result.getArray());
    tc.getViewer().renderAsync();
  }

  /**
   * No animation support (yet). Keeps the signature for parity with Java.
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  deactivate(tc) {
    // Intentionally left blank for now.
    // Java version optionally schedules an inertial animation here.
  }

  /**
   * @param {import('../scene/SceneGraphComponent.js').SceneGraphComponent} comp
   * @returns {Matrix}
   */
  #getCenter(comp) {
    const centerTranslation = new Matrix();
    if (this.metric !== Pn.ELLIPTIC) {
      const bb = BoundingBoxUtility.calculateChildrenBoundingBox(comp);
      MatrixBuilder.init(null, this.metric)
        .translate(bb.getCenter())
        .assignToMatrix(centerTranslation);
    }
    return centerTranslation;
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   * @returns {Matrix}
   */
  #getRotationPoint(tc) {
    const currentPick = tc.getCurrentPick();
    if (!currentPick) return new Matrix();

    const obj = currentPick.getObjectCoordinates();
    const pickMatr = currentPick.getPickPath().getMatrix(null);

    const compPath = this.moveChildren ? tc.getRootToLocal() : tc.getRootToToolComponent();
    const compMatrInv = compPath.getInverseMatrix(null);

    const matr = Rn.timesMatrix(null, compMatrInv, pickMatr);
    const rotationPoint = Rn.matrixTimesVector(null, matr, obj);

    const centerTranslation = new Matrix();
    MatrixBuilder.init(null, this.metric)
      .translate(rotationPoint)
      .assignToMatrix(centerTranslation);
    return centerTranslation;
  }

  // ---------------------------------------------------------------------------
  // Java-style getters/setters (API parity)
  // ---------------------------------------------------------------------------

  getMoveChildren() { return this.moveChildren; }
  setMoveChildren(moveChildren) { this.moveChildren = moveChildren; }

  getAnimTimeMax() { return this.animTimeMax; }
  setAnimTimeMax(animTimeMax) { this.animTimeMax = animTimeMax; }

  getAnimTimeMin() { return this.animTimeMin; }
  setAnimTimeMin(animTimeMin) { this.animTimeMin = animTimeMin; }

  isUpdateCenter() { return this.updateCenter; }
  setUpdateCenter(updateCenter) {
    this.updateCenter = updateCenter;
    if (!updateCenter) this.center = new Matrix();
  }

  isFixOrigin() { return this.fixOrigin; }
  setFixOrigin(fixOrigin) { this.fixOrigin = fixOrigin; }

  isRotateOnPick() { return this.rotateOnPick; }
  setRotateOnPick(rotateOnPick) { this.rotateOnPick = rotateOnPick; }

  isAnimationEnabled() { return this.animationEnabled; }
  setAnimationEnabled(animationEnabled) { this.animationEnabled = animationEnabled; }
}


