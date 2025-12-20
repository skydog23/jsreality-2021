/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRApp } from '../JSRApp.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { FactoredMatrix } from '../../core/math/FactoredMatrix.js';
import { TimeDescriptor } from '../../anim/core/TimeDescriptor.js';
import { KeyFrame } from '../../anim/core/KeyFrame.js';
import { SortedKeyFrameList } from '../../anim/core/SortedKeyFrameList.js';
import { KeyFrameAnimatedTransformation } from '../../anim/scenegraph/KeyFrameAnimatedTransformation.js';
import * as Pn from '../../core/math/Pn.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';

/**
 * Minimal app demonstrating AnimationPlugin driving a KeyFrameAnimatedTransformation.
 * The app contributes its own inspector button to start playback.
 */
export class TestAnimApp extends JSRApp {
  /** @type {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent|null} */
  #squareSGC = null;

  /** @type {import('../../anim/scenegraph/KeyFrameAnimatedTransformation.js').KeyFrameAnimatedTransformation|null} */
  #squareAnimator = null;

  getShowPanels() {
    // Show left panel only (like other test apps); right panel holds shrink panels.
    return [true, true, false, false];
  }

  getContent() {
    const world = SceneGraphUtility.createFullSceneGraphComponent('world');

    const squareSGC = SceneGraphUtility.createFullSceneGraphComponent('square');
    squareSGC.setGeometry(Primitives.regularPolygon(4, 0));
    const ap = squareSGC.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute(`polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(0, 0, 255));

    world.addChild(squareSGC);
    this.#squareSGC = squareSGC;
    return world;
  }

  /**
   * Build an inspector panel for the app with a single "Play" button.
   * @returns {Array<import('../../core/inspect/descriptors/DescriptorTypes.js').InspectorDescriptor>}
   */
  getInspectorDescriptors() {
    return [
      {
        type: DescriptorType.BUTTON,
        label: 'Play animation',
        variant: 'primary',
        action: () => void this.#play()
      }
    ];
  }

  async #play() {
    const controller = this.context?.getController?.();
    if (!controller) return;

    /** @type {import('../plugins/AnimationPlugin.js').AnimationPlugin|null} */
    const animPlugin = controller.getPlugin?.('animation') ?? null;
    if (!animPlugin) {
      console.warn('TestAnimApp: AnimationPlugin not available');
      return;
    }

    const ap = animPlugin.getAnimationPanel?.();
    if (!ap) {
      console.warn('TestAnimApp: AnimationPanel not available');
      return;
    }

    if (!this.#squareSGC) {
      console.warn('TestAnimApp: square scene graph component not available');
      return;
    }

    if (!this.#squareAnimator) {
      const tform = this.#squareSGC.getTransformation();
      if (!tform) {
        console.warn('TestAnimApp: square has no transformation');
        return;
      }

      this.#squareAnimator = KeyFrameAnimatedTransformation.withTransformation(tform, Pn.EUCLIDEAN);
      this.#squareAnimator.setName?.('squareRotation');

      // Register animator with AnimationPlugin so its AnimationPanelListenerImpl will drive it.
      animPlugin.getAnimated()?.push(this.#squareAnimator);
    }

    // Ensure the AnimationPanel has a basic timeline so playback can run.
    // (The panel drives time; the Animated instances respond to setValueAtTime(t).)
    const panelKeys = new SortedKeyFrameList();
    panelKeys.add(new KeyFrame(new TimeDescriptor(0.0), {}));
    panelKeys.add(new KeyFrame(new TimeDescriptor(1.0), {}));
    ap.setKeyFrames?.(panelKeys);
    ap.setInspectedKeyFrame?.(0);

    // Programmatically define two keyframes: identity at t=0, 90 degrees about Z at t=1.
    // This mimics the Java workflow but avoids manual keyframe editing for this demo.
    const fm0 = new FactoredMatrix(Pn.EUCLIDEAN);
    fm0.setRotation(0, [0, 0, 1]);

    const fm1 = new FactoredMatrix(Pn.EUCLIDEAN);
    fm1.setRotation(Math.PI / 2, [0, 0, 1]);

    this.#squareAnimator.setCurrentValue(fm0);
    this.#squareAnimator.addKeyFrame(new TimeDescriptor(0.0));

    this.#squareAnimator.setCurrentValue(fm1);
    this.#squareAnimator.addKeyFrame(new TimeDescriptor(1.0));

    // Start playback via AnimationPlugin's panel model.
    ap.setCurrentTime?.(0.0);
    ap.inspectKeyFrame?.();
    ap.setPaused?.(true);
    ap.togglePlay?.();
  }
}

