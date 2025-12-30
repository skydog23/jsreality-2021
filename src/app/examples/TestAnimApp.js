/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Primitives } from '../../core/geometry/Primitives.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';
import { SphereUtility } from '../../core/geometry/SphereUtility.js';

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
    return [true, false, false, true];
  }

  #tform = null;

  _worldSGC = null;
  getContent() {
    this._worldSGC = SceneGraphUtility.createFullSceneGraphComponent('world');
    this.#tform = this._worldSGC.getTransformation();

    const squareSGC = SceneGraphUtility.createFullSceneGraphComponent('square');
    squareSGC.setGeometry(SphereUtility.tessellatedIcosahedronSphere(4)); //Primitives.regularPolygon(4, 0));
    const ap = squareSGC.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute(`polygonShader.${CommonAttributes.DIFFUSE_COLOR}`, new Color(0, 0, 255));

    this._worldSGC.addChild(squareSGC);
    this.#squareSGC = squareSGC;
    return this._worldSGC;
  }

  display() {
    super.display();
    console.log('TestAnimApp display',this._animationPlugin);
    this._animationPlugin.setAnimateSceneGraph(true);
    this._animationPlugin.setAnimateCamera(false);
    console.log('animated list', this._animationPlugin.getAnimated());
    // set up animation keyframes
  }

  setValueAtTime(t) {
    // console.log('TestAnimApp setValueAtTime', t);
    // const mat = MatrixBuilder.euclidean().translate(t,0,0).getArray(); //rotateZ(Math.PI/2 * t).getArray();
    // console.log('TestAnimApp setValueAtTime matrix', mat);
    // this._worldSGC.getTransformation().setMatrix(mat);
    // console.log('TestAnimApp setValueAtTime matrix', this._worldSGC.getTransformation().getMatrix());
    // this.getJSRViewer().render();
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

