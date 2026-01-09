/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SphereUtility } from '../../core/geometry/SphereUtility.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';

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


  #state = {
    alpha: 0.5,
    beta: 2,
    enabled: true,
    name: "demo"
  };
  updateState() {
    // Test app: no dedicated DOM state panel here.
    // Keeping this hook for parity with descriptor examples.
  }
  /**
   * Build an inspector panel for the app with a single "Play" button.
   * @returns {Array<import('../../core/inspect/descriptors/DescriptorTypes.js').InspectorDescriptor>}
   */
  getInspectorDescriptors() {
      // IMPORTANT:
      // JSRApp expects getInspectorDescriptors() to return a *flat array of descriptors*.
      // DescriptorUtility wraps these into a single group internally.
      return [{
        key: "groups-container",
        type: DescriptorType.CONTAINER,
        direction: "column",
        border: true,
        containerLabel: "Groups",
        items: [
          {
            key: "row-controls",
            type: DescriptorType.CONTAINER,
            direction: "column",
            justify: "space-between",
            border: true,
            containerLabel: "Row Controls",
            items: [
              {
                 label: "Alpha",
                type: DescriptorType.TEXT_SLIDER,
                valueType: 'float',
                min: 0,
                max: 1,
                getValue: () => this.#state.alpha,
                setValue: (v) => {
                  this.#state.alpha = Number(v);
                  this.updateState();
                }
              },
              {
                label: "Beta",
                type: DescriptorType.TEXT_SLIDER,
                valueType: 'int',
                min: 0,
                max: 10,
                getValue: () => this.#state.beta,
                setValue: (v) => {
                  this.#state.beta = Number(v) | 0;
                  this.updateState();
                }
              }
            ]
          },
          {
             label: "Enabled",
            type: DescriptorType.TOGGLE,
            getValue: () => this.#state.enabled,
            setValue: (v) => {
              this.#state.enabled = Boolean(v);
              this.updateState();
            }
          },
          {
             label: "Name",
            type: DescriptorType.TEXT,
            getValue: () => this.#state.name,
            setValue: (v) => {
              this.#state.name = String(v ?? "");
              this.updateState();
            }
          }
        ]
      }];
    }

  #play() {
    console.log('play');
  }
 
}

