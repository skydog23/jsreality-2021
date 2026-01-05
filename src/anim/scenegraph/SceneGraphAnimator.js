/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * Phase-1 port of `charlesgunn.anim.jreality.SceneGraphAnimator`.
 *
 * Goal (Phase 1): build a list of KeyFrameAnimatedTransformation instances for
 * writable Transformations in a SceneGraphComponent tree and forward
 * keyframe/playback calls to them.
 *
 * NOTE: The `animated` / `localAnimated` appearance flags and metric overrides
 * (CommonAttributes.METRIC) are intentionally postponed to the next step.
 */

import { getLogger } from '../../core/util/LoggingSystem.js';
import { InterpolationTypes } from '../util/AnimationUtility.js';
import { KeyFrameAnimatedTransformation } from './KeyFrameAnimatedTransformation.js';
import { Transformation } from '../../core/scene/Transformation.js';
import * as Pn from '../../core/math/Pn.js';

/** @typedef {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../../core/scene/Viewer.js').Viewer} Viewer */
/** @typedef {import('../core/KeyFrameAnimated.js').KeyFrameAnimated<any>} KeyFrameAnimated */
/** @typedef {import('../core/TimeDescriptor.js').TimeDescriptor} TimeDescriptor */

const logger = getLogger('jsreality.anim.scenegraph.SceneGraphAnimator');

export class SceneGraphAnimator {
  static ANIMATED = 'animated';
  static LOCAL_ANIMATED = 'localAnimated';

  /** @type {string} */
  #name = 'sceneGraphAnimator';

  /** @type {SceneGraphComponent|null} */
  #root = null;

  /** @type {KeyFrameAnimated[]} */
  #animated = [];

  /** @type {boolean} */
  #animateCamera = false;

  /** @type {boolean} */
  #createTransforms = false;

  /** @type {boolean} */
  #fromViewer = false;

  /** @type {InterpolationTypes} */
  #defaultInterp = InterpolationTypes.CUBIC_HERMITE;

  /** @type {boolean} */
  #writable = true;

  /** @type {boolean} */
  #givesWay = true;

  /**
   * @param {SceneGraphComponent|Viewer|null} [sceneRootOrViewer]
   */
  constructor(sceneRootOrViewer = null) {
    if (sceneRootOrViewer && typeof sceneRootOrViewer.getSceneRoot === 'function') {
      this.#fromViewer = true;
      this.#root = sceneRootOrViewer.getSceneRoot();
    } else {
      this.#root = sceneRootOrViewer;
    }
  }

  getName() {
    return this.#name;
  }

  setName(name) {
    this.#name = typeof name === 'string' ? name : String(name);
  }

  /**
   * Access to the composed list (primarily for debugging).
   * @returns {KeyFrameAnimated[]}
   */
  getAnimated() {
    return this.#animated;
  }

  isWritable() {
    return this.#writable;
  }

  setWritable(b) {
    this.#writable = Boolean(b);
  }

  isGivesWay() {
    return this.#givesWay;
  }

  setGivesWay(b) {
    this.#givesWay = Boolean(b);
    for (const a of this.#animated) {
      a?.setGivesWay?.(this.#givesWay);
    }
  }

  getDefaultInterp() {
    return this.#defaultInterp;
  }

  setDefaultInterp(defaultInterp) {
    this.#defaultInterp = defaultInterp;
    for (const a of this.#animated) {
      // KeyFrameAnimatedIsometry exposes setInterpolationType().
      a?.setInterpolationType?.(defaultInterp);
    }
  }

  isAnimateCamera() {
    return this.#animateCamera;
  }

  setAnimateCamera(animateCamera) {
    this.#animateCamera = Boolean(animateCamera);
  }

  isCreateTransforms() {
    return this.#createTransforms;
  }

  setCreateTransforms(createTransforms) {
    this.#createTransforms = Boolean(createTransforms);
  }

  /**
   * Build the internal list of KeyFrameAnimated* objects by traversing the scene graph.
   */
  init() {
    this.#animated.length = 0;

    if (!this.#root) {
      logger.warn(-1, 'SceneGraphAnimator.init(): no root SceneGraphComponent');
      return;
    }

    // Phase 1: do not implement camera animation yet.
    if (this.#fromViewer && this.#animateCamera) {
      logger.warn(-1, 'SceneGraphAnimator: animateCamera requested but not implemented in Phase 1');
    }

    const visited = new Set();
    this.#visitComponent(this.#root, visited, Pn.EUCLIDEAN);
    logger.fine(-1, 'SceneGraphAnimator init', { count: this.#animated.length });
  }

  /**
   * Forward: add keyframe at time.
   * @param {TimeDescriptor} td
   */
  addKeyFrame(td) {
    for (const a of this.#animated) {
      a?.addKeyFrame?.(td);
      // Optional debug: uncomment if you want per-animator dumps.
      // a?.printState?.();
    }
    logger.fine(-1, 'SceneGraphAnimator addKeyFrame', td);
    // this.printState();
  }

  /**
   * Forward: delete keyframe at time.
   * @param {TimeDescriptor} td
   */
  deleteKeyFrame(td) {
    for (const a of this.#animated) a?.deleteKeyFrame?.(td);
  }

  /**
   * Forward: set current value (mostly unused for transformations in Phase 1).
   * @param {any} value
   */
  setCurrentValue(value) {
    for (const a of this.#animated) a?.setCurrentValue?.(value);
  }

  /**
   * Forward: set value at numeric time.
   * @param {number} t
   */
  setValueAtTime(t) {
    for (const a of this.#animated) a?.setValueAtTime?.(t);
  }

  startAnimation() {
    for (const a of this.#animated) a?.startAnimation?.();
  }

  endAnimation() {
    for (const a of this.#animated) a?.endAnimation?.();
  }

  printState() {
    for (const a of this.#animated) a?.printState?.();
  }

  // ---------------------------------------------------------------------------
  // Internal traversal
  // ---------------------------------------------------------------------------

  /**
   * @param {SceneGraphComponent} component
   * @param {Set<SceneGraphComponent>} visited
   * @param {number} metric
   * @private
   */
  #visitComponent(component, visited, metric) {
    if (!component || visited.has(component)) {
      return;
    }
    visited.add(component);
    logger.fine(-1, 'SceneGraphAnimator visit', component.getName?.());
    // Phase 1: ignore ANIMATED / LOCAL_ANIMATED flags and metric changes.

    let tform = component.getTransformation?.() ?? null;
    if (!tform && this.#createTransforms) {
      tform = new Transformation();
      component.setTransformation?.(tform);
    }
    logger.fine(-1, 'SceneGraphAnimator tform', tform);
    if (tform && typeof tform.isReadOnly === 'function' && !tform.isReadOnly()) {
      const kfat = KeyFrameAnimatedTransformation.withTransformation(tform, metric);
      kfat.setInterpolationType?.(this.#defaultInterp);
      kfat.setGivesWay?.(this.#givesWay);
      const cname = component.getName?.() || 'component';
      kfat.setName?.(`${cname} Tform`);
      logger.fine(-1, 'SceneGraphAnimator kfat', kfat);
      this.#animated.push(kfat);
    }

    const children = component.getChildComponents?.() ?? [];
    for (const child of children) {
      this.#visitComponent(child, visited, metric);
    }
  }
}

