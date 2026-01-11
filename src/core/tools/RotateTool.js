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
import { Quaternion, convert44To33, rotationMatrixToQuaternion, quaternionToRotationMatrix, linearInterpolation } from '../math/Quaternion.js';
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

  /**
   * Enable simple damping / smoothing of the input rotation delta.
   * Implemented as exponential smoothing (half-life in ms) in quaternion space.
   * @type {boolean}
   */
  smoothingEnabled = true;

  /**
   * Smoothing half-life in milliseconds.
   * Smaller = snappier; larger = smoother.
   * @type {number}
   */
  smoothingHalfLifeMs = 30;

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

  /** @type {number} */
  #lastPerformTimeMs = 0;

  /** @type {number} */
  #lastPerformDtMs = 0;

  /** @type {boolean} */
  #hasSmoothedDelta = false;

  /** @type {Quaternion} */
  #smoothedDeltaQ = new Quaternion(1, 0, 0, 0);

  /** @type {Quaternion} */
  #tmpDeltaQ = new Quaternion(1, 0, 0, 0);

  /** @type {Quaternion} Last applied delta rotation (object space) */
  #lastAppliedDeltaQ = new Quaternion(1, 0, 0, 0);

  /** @type {number} Last applied delta angle in radians */
  #lastAppliedDeltaAngle = 0;

  /** @type {number[]} Last applied delta axis (length 3) */
  #lastAppliedDeltaAxis = [0, 0, 1];

  /** @type {number|null} */
  #inertiaRafId = null;

  /** @type {boolean} */
  #inertiaRunning = false;

  /** @type {number} */
  #inertiaLastTimeMs = 0;

  /** @type {number} Angular velocity (rad/ms) */
  #inertiaOmega = 0;

  /** @type {number[]} */
  #inertiaAxis = [0, 0, 1];

  /** @type {number[]} */
  #tmpRot16 = new Array(16);

  /**
   * Inertia decay half-life in ms. Larger = longer spin.
   * @type {number}
   */
  inertiaHalfLifeMs = 0;

  /**
   * Scale factor applied to the captured flick speed (matches Java's 0.05 heuristic).
   * @type {number}
   */
  inertiaGain = 0.2;

  /**
   * Stop inertia when angular velocity drops below this threshold (rad/ms).
   * @type {number}
   */
  inertiaStopThreshold = 1e-4;

  constructor() {
    super(RotateTool.activationSlot);
    this.addCurrentSlot(RotateTool.evolutionSlot);
  }

  /**
   * @private
   * @param {number} dtMs
   * @returns {number} alpha in [0,1]
   */
  #alphaFromHalfLife(dtMs) {
    const halfLife = Number(this.smoothingHalfLifeMs);
    if (!Number.isFinite(halfLife) || halfLife <= 0) return 1.0;
    const dt = Math.max(0, Number(dtMs) || 0);
    // alpha = 1 - 2^(-dt/halfLife)
    const a = 1.0 - Math.pow(0.5, dt / halfLife);
    return Math.max(0.0, Math.min(1.0, a));
  }

  /**
   * @private
   * @param {number} dtMs
   * @param {number} halfLifeMs
   * @returns {number} decay multiplier in (0,1]
   */
  #decayFromHalfLife(dtMs, halfLifeMs) {
    const hl = Number(halfLifeMs);
    if (!Number.isFinite(hl) || hl <= 0) return 1.0;
    const dt = Math.max(0, Number(dtMs) || 0);
    return Math.pow(0.5, dt / hl);
  }

  /**
   * @private
   * @param {Quaternion} qIn
   * @returns {{ axis: number[], angle: number }}
   */
  #quatToAxisAngle(qIn) {
    // Ensure shortest-arc representation.
    let w = qIn.re, x = qIn.x, y = qIn.y, z = qIn.z;
    if (w < 0) { w = -w; x = -x; y = -y; z = -z; }

    const ww = Math.max(-1.0, Math.min(1.0, w));
    const angle = 2.0 * Math.acos(ww); // [0, pi]
    const s = Math.sqrt(Math.max(0.0, 1.0 - ww * ww));

    if (s < 1e-8 || angle < 1e-8) {
      return { axis: [0, 0, 1], angle: 0.0 };
    }
    return { axis: [x / s, y / s, z / s], angle };
  }

  /**
   * @private
   */
  #stopInertia() {
    if (this.#inertiaRafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#inertiaRafId);
    }
    this.#inertiaRafId = null;
    this.#inertiaRunning = false;
    this.#inertiaOmega = 0;
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  activate(tc) {
    // User grabbed again -> stop inertial rotation immediately.
    this.#stopInertia();
    this.initializeInertia(tc);

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

    initializeInertia(tc) {
        this.startTime = tc.getTime();
        this.#lastPerformTimeMs = this.startTime;
        this.#lastPerformDtMs = 0;
        this.#hasSmoothedDelta = false;
        this.#smoothedDeltaQ.setValue(1, 0, 0, 0);
        this.#lastAppliedDeltaQ.setValue(1, 0, 0, 0);
        this.#lastAppliedDeltaAngle = 0;
        this.#lastAppliedDeltaAxis = [0, 0, 1];
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

    // Track dt for inertia and smoothing.
    const now = tc.getTime();
    const dt = now - this.#lastPerformTimeMs;
    this.#lastPerformTimeMs = now;
    this.#lastPerformDtMs = dt;

    // Optional damping/smoothing: filter the delta rotation in quaternion space.
    // This avoids jerky motion from uneven event timing and prevents matrix-averaging artifacts.
    if (this.smoothingEnabled) {
      const alpha = this.#alphaFromHalfLife(dt);

      // Extract 3x3 rotation (row-major) from the 4x4 delta matrix.
      const rot3 = convert44To33(this.evolution.getArray());
      rotationMatrixToQuaternion(this.#tmpDeltaQ, rot3);

      if (!this.#hasSmoothedDelta) {
        // First sample: snap to it.
        this.#smoothedDeltaQ.setValue(this.#tmpDeltaQ.re, this.#tmpDeltaQ.x, this.#tmpDeltaQ.y, this.#tmpDeltaQ.z);
        this.#hasSmoothedDelta = true;
      } else {
        // NLERP toward the new delta (robust + fast; Quaternion.linearInterpolation handles sign).
        linearInterpolation(this.#smoothedDeltaQ, this.#smoothedDeltaQ, this.#tmpDeltaQ, alpha);
      }

      // Convert filtered quaternion back to a pure rotation 4x4 and replace evolution.
      quaternionToRotationMatrix(this.#tmpRot16, this.#smoothedDeltaQ);
      this.evolution.assignFrom(this.#tmpRot16);
    }

    // Capture last applied delta as axis-angle for inertial animation.
    // Use the actual evolution matrix being applied (after smoothing).
    const rot3Now = convert44To33(this.evolution.getArray());
    rotationMatrixToQuaternion(this.#lastAppliedDeltaQ, rot3Now);
    const aa = this.#quatToAxisAngle(this.#lastAppliedDeltaQ);
    this.#lastAppliedDeltaAxis = aa.axis;
    this.#lastAppliedDeltaAngle = aa.angle;

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
    super.deactivate(tc);
    if (this.inertiaHalfLifeMs <= 0) return;

    const t = tc.getTime() - this.startTime;

    // Reset smoothing state (so next grab snaps cleanly).
    this.#lastPerformTimeMs = 0;
    this.#lastPerformDtMs = 0;
    this.#hasSmoothedDelta = false;
    this.#smoothedDeltaQ.setValue(1, 0, 0, 0);

    if (!this.animationEnabled) return;
    if (!this.comp) return;
    if (!this.success) return;
    if (!(t > this.animTimeMin && t < this.animTimeMax)) return;

    const dtMs = Math.max(1, Number(this.#lastPerformDtMs) || 0);
    const angle = Number(this.#lastAppliedDeltaAngle) || 0;
    if (!(angle > 1e-6)) return;

    const axis = this.#lastAppliedDeltaAxis;
    const omega0 = (angle / dtMs) * Number(this.inertiaGain);
    if (!(omega0 > this.inertiaStopThreshold)) return;

    this.#inertiaAxis = [axis[0], axis[1], axis[2]];
    this.#inertiaOmega = omega0;
    this.#inertiaRunning = true;
    this.#inertiaLastTimeMs = globalThis?.performance?.now ? globalThis.performance.now() : Date.now();

    const step = () => {
      if (!this.#inertiaRunning || !this.comp) return;

      const nowMs = globalThis?.performance?.now ? globalThis.performance.now() : Date.now();
      const dtAnim = Math.min(50, Math.max(0, nowMs - this.#inertiaLastTimeMs)); // clamp to avoid huge jumps
      this.#inertiaLastTimeMs = nowMs;

      // Exponential decay of angular velocity.
      const decay = this.#decayFromHalfLife(dtAnim, this.inertiaHalfLifeMs);
      this.#inertiaOmega *= decay;
      if (!(this.#inertiaOmega > this.inertiaStopThreshold)) {
        this.#stopInertia();
        return;
      }

      const dAngle = this.#inertiaOmega * dtAnim;
      if (!(dAngle > 0)) {
        this.#inertiaRafId = requestAnimationFrame(step);
        return;
      }

      // Optionally update center as in Java.
      if (!this.fixOrigin && this.updateCenter) {
        this.center = this.#getCenter(this.comp);
      }

      const currentTrafo = this.comp.getTransformation();
      if (!currentTrafo) {
        this.#stopInertia();
        return;
      }

      // Apply incremental rotation around the captured axis.
      // result = current * [center] * rot(dAngle) * [center^-1]
      this.result.assignFrom(currentTrafo.getMatrix(null));
      if (!this.fixOrigin) this.result.multiplyOnRight(this.center);
      MatrixBuilder.euclidean(this.result).rotateArray(dAngle, this.#inertiaAxis);
      if (!this.fixOrigin) this.result.multiplyOnRight(this.center.getInverse());
      if (!Rn.isNan(this.result.getArray())) {
        currentTrafo.setMatrix(this.result.getArray());
      }

      tc.getViewer().renderAsync();
      this.#inertiaRafId = requestAnimationFrame(step);
    };

    this.#inertiaRafId = requestAnimationFrame(step);
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


