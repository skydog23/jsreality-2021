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

  #tform = null;

  getContent() {
    const world = SceneGraphUtility.createFullSceneGraphComponent('world');
    this.#tform = world.getTransformation();

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

  display() {
    super.display();
    // set up animation keyframes
  }

  setValueAtTime(t) {
    console.log('setValueAtTime', t);
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

  #play() {
    console.log('play');
  }
 
}

