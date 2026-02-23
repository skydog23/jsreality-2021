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
  animTimeMin = 100;

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

  /** @type {Quaternion} Last *raw* delta (pre-smoothing), used for Java-style inertia scheduling */
  #lastRawDeltaQ = new Quaternion(1, 0, 0, 0);

  /** @type {Quaternion} Last applied delta rotation (object space), for inertia scheduling */
  #lastAppliedDeltaQ = new Quaternion(1, 0, 0, 0);

  /** @type {number|null} */
  #animRafId = null;

  /** @type {boolean} */
  #animRunning = false;

  /** @type {number} */
  #animLastTimeMs = 0;

  /** @type {number} */
  #animRotAngle = 0;
  
  /** @type {number} */
  // Inertia scale factor.
  // We intentionally use dt in **milliseconds** (DOM event timeStamp / performance.now()).
  // Keeping dtMs here avoids accidental 1000x unit mistakes.
  #animAngleFactor = 0.05;

  /** @type {number[]} */
  #animAxis = [0, 0, 1];

  /** @type {Matrix|null} */
  #animCenter = null;

  /** @type {import('../scene/SceneGraphComponent.js').SceneGraphComponent|null} */
  #animComp = null;

  /** @type {import('../viewers/Abstract2DViewer.js').Abstract2DViewer|null} */
  #animViewer = null;

  /** @type {number[]} */
  #tmpRot16 = new Array(16);

  // NOTE: we intentionally do not expose extra inertia knobs.
  // Java RotateTool uses a fixed factor (0.05) and runs until descheduled.

  constructor() {
    super(RotateTool.activationSlot);
    this.addCurrentSlot(RotateTool.evolutionSlot);
  }

  

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  activate(tc) {
    // User grabbed again -> stop inertial rotation immediately.
    this.#stopInertia();
    this.startTime = tc.getTime();
    this.#lastPerformTimeMs = this.startTime;
    this.#lastPerformDtMs = 0;
    this.#hasSmoothedDelta = false;
    this.#smoothedDeltaQ.setValue(1, 0, 0, 0);
    this.#lastAppliedDeltaQ.setValue(1, 0, 0, 0);

    const path = this.moveChildren ? tc.getRootToLocal() : tc.getRootToToolComponent();
    this.comp = path?.getLastComponent?.() || null;

    if (this.comp && this.comp.getTransformation() === null) {
      this.comp.setTransformation(new Transformation());
    }
    // console.log('comp:', this.comp.getName());

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

    const root2toComp = new Matrix(tc.getRootToToolComponent().getInverseMatrix(null));
    const array = new Matrix(root2toComp).getArray();		
//		System.err.println("root2component "+Rn.toString(new Matrix(root2toComp).getColumn(3)));
		if (array[15] < 0) root2toComp.times(-1);
//		System.err.println("quad path"+Rn.matrixToString(P3.getTransformedAbsolute(array, metric)));
//		System.err.println("quad select"+Rn.matrixToString(P3.getTransformedAbsolute(selectedComponent.getTransformation().getMatrix(), metric)));
		root2toComp.assignFrom(P3.extractOrientationMatrix(null, root2toComp.getArray(), P3.originP3, this.metric));
		// console.log('root2toComp:', Rn.matrixToString(root2toComp.getArray()));
    this.evolution.assignFrom(tc.getTransformationMatrix(RotateTool.evolutionSlot));
		this.evolution.conjugateBy(root2toComp);
		this.result.assignFrom(this.comp.getTransformation().getMatrix(null));
		this.result.multiplyOnRight(this.evolution);
		this.comp.getTransformation().setMatrix(this.result.getArray()); //P3.orthonormalizeMatrix(null, this.result.getArray(), 10 ^ -6, this.metric)); //this.result.getArray());
    this.success = true;

    // const path = this.moveChildren ? tc.getRootToLocal() : tc.getRootToToolComponent();
    // if (!path) return;

    // // object2avatar: orientation-only inverse matrix of the component path.
    // const object2avatar = new Matrix(path.getInverseMatrix(null));
    // if (Rn.isNan(object2avatar.getArray())) return;

    // try {
    //   object2avatar.assignFrom(
    //     P3.extractOrientationMatrix(null, object2avatar.getArray(), P3.originP3, this.metric)
    //   );
    // } catch (e) {
    //   // Set identity matrix
    //   MatrixBuilder.euclidean().assignTo(object2avatar);
    // }

    // const evoArr = tc.getTransformationMatrix(RotateTool.evolutionSlot);
    // if (!evoArr) return;
    // this.evolution.assignFrom(evoArr);
    // this.evolution.conjugateBy(object2avatar);

    // Track dt for inertia and smoothing.
    const now = tc.getTime();
    const dt = now - this.#lastPerformTimeMs;
    this.#lastPerformTimeMs = now;
    this.#lastPerformDtMs = dt;

    // Always capture the *raw* delta (pre-smoothing) for Java-style inertia scheduling.
    // This mirrors Java, where `evolution` is used directly (no smoothing).
    {
      const rot3Raw = convert44To33(this.evolution.getArray());
      rotationMatrixToQuaternion(this.#tmpDeltaQ, rot3Raw);
      this.#lastRawDeltaQ.setValue(this.#tmpDeltaQ.re, this.#tmpDeltaQ.x, this.#tmpDeltaQ.y, this.#tmpDeltaQ.z);
    }

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
    // rotationMatrixToQuaternion(this.#lastAppliedDeltaQ, rot3Now);
    rotationMatrixToQuaternion(this.#lastAppliedDeltaQ, rot3Now);

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
    // const currentTrafo = this.comp.getTransformation();
    // if (!currentTrafo) return;
    // this.result.assignFrom(currentTrafo.getMatrix(null));
    // if (!this.fixOrigin) this.result.multiplyOnRight(this.center);
    // this.result.multiplyOnRight(this.evolution);
    // if (!this.fixOrigin) this.result.multiplyOnRight(this.center.getInverse());
    // if (Rn.isNan(this.result.getArray())) return;

    // this.success = true;
    // currentTrafo.setMatrix(this.result.getArray());
    // tc.getViewer().renderAsync();
  }

  /**
   * No animation support (yet). Keeps the signature for parity with Java.
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  deactivate(tc) {
    const t = tc.getTime() - this.startTime;
    if (t > 10000) {
      this.#stopInertia();
      return;
    }

    // Reset smoothing state (so next grab snaps cleanly).
    this.#lastPerformTimeMs = 0;
    this.#lastPerformDtMs = 0;
    this.#hasSmoothedDelta = false;
    this.#smoothedDeltaQ.setValue(1, 0, 0, 0);

    // Java: only schedule if gesture duration is within [animTimeMin, animTimeMax].
    if (!this.animationEnabled) {
      return;
    }
    if (!(t > this.animTimeMin && t < this.animTimeMax)) {
      return;
    }
    if (!this.comp) {
      return;
    }
    if (!this.success) {
      return;
    }

    // Java: FactoredMatrix(evolution).getRotationAngle/getRotationAxis; then:
    // if (rotAngle > PI) rotAngle = -2*PI + rotAngle;
    // Use the last *applied* delta (post-smoothing), so inertia matches what the user actually saw.
    const aa = this.#quatToAxisAngle(this.#lastAppliedDeltaQ);
    let rotAngle = aa.angle;
    if (rotAngle > Math.PI) rotAngle = -2 * Math.PI + rotAngle;
 
    // Java: Matrix cen = new Matrix(center); SceneGraphComponent c = comp;
    this.#animCenter = new Matrix(this.center);
    this.#animAxis = aa.axis;
    this.#animRotAngle = rotAngle;
    this.#animComp = this.comp;
    this.#animViewer = tc.getViewer();

    this.#animRunning = true;
    this.#animLastTimeMs = globalThis?.performance?.now ? globalThis.performance.now() : Date.now();
    const step = () => {
      // if (!this.#animRunning || !this.#animComp || !this.#animViewer) return;

      const nowMs = globalThis?.performance?.now ? globalThis.performance.now() : Date.now();
      const dtMs = Math.max(0, nowMs - this.#animLastTimeMs);
      this.#animLastTimeMs = nowMs;

      // Java uses `0.05 * dt * rotAngle` with dt effectively in milliseconds.
      const dAngle = this.#animAngleFactor * dtMs * this.#animRotAngle;

      // Java: if (updateCenter) cen = getCenter(c);
      let cen = this.#animCenter;
      if (this.updateCenter) {
        cen = this.#getCenter(this.#animComp);
        this.#animCenter = cen;
      }

      const currentTrafo = this.#animComp.getTransformation();
      if (!currentTrafo) {
        this.#stopInertia();
        return;
      }

      const before = currentTrafo.getMatrix(null);

      // Java:
      // MatrixBuilder m = MatrixBuilder.euclidean(c.getTransformation());
      // m.times(cen);
      // m.rotate(0.05*dt*rotAngle, axis);
      // m.times(cen.getInverse());
      // m.assignTo(c);
      this.result.assignFrom(currentTrafo.getMatrix(null));
      MatrixBuilder.euclidean(this.result)
        .times(cen)
        .rotate(dAngle, this.#animAxis)
        .times(cen.getInverse());

      if (!Rn.isNan(this.result.getArray())) {
        currentTrafo.setMatrix(this.result.getArray());
      }

      this.#animRafId = requestAnimationFrame(step);
    };

    this.#animRafId = requestAnimationFrame(step);
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
        .assignTo(centerTranslation);
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

    const matr = Rn.times(null, compMatrInv, pickMatr);
    const rotationPoint = Rn.matrixTimesVector(null, matr, obj);

    const centerTranslation = new Matrix();
    MatrixBuilder.init(null, this.metric)
      .translate(rotationPoint)
      .assignTo(centerTranslation);
    return centerTranslation;
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
   * @param {Quaternion} qIn
   * @returns {{ axis: number[], angle: number }}
   */
  #quatToAxisAngle(qIn) {
    // Java RotateTool uses FactoredMatrix.getRotationAngle/getRotationAxis.
    // We approximate this from quaternion as axis-angle with angle in [0, 2π).
    const w = Number(qIn.re) || 0;
    const x = Number(qIn.x) || 0;
    const y = Number(qIn.y) || 0;
    const z = Number(qIn.z) || 0;

    const v = Math.sqrt(x * x + y * y + z * z);
    const angle = 2.0 * Math.atan2(v, w); // [0, 2π)

    if (v < 1e-8 || angle < 1e-8) {
      return { axis: [0, 0, 1], angle: 0.0 };
    }
    return { axis: [x / v, y / v, z / v], angle };
  }

  /**
   * @private
   */
  #stopInertia() {
    if (this.#animRafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#animRafId);
    }
    this.#animRafId = null;
    this.#animRunning = false;
    this.#animViewer = null;
    this.#animComp = null;
    this.#animCenter = null;
    this.#animRotAngle = 0;
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


