/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { ConicSection } from '../../core/geometry/ConicSection.js';
import { ConicUtils } from '../../core/geometry/ConicUtils.js';
import { JSRApp } from '../JSRApp.js';
import { Color } from '../../core/util/Color.js';
/**
 * Minimal app demonstrating AnimationPlugin driving a KeyFrameAnimatedTransformation.
 * The app contributes its own inspector button to start playback.
 */
export class ConicDemo extends JSRApp {
 
  getShowPanels() {
    return [true, true, false, true];
  }
  _conicSGC = null;
  _worldSGC = null;
  getContent() {
    this._worldSGC = SceneGraphUtility.createFullSceneGraphComponent('world');
    
    const conicSGC = SceneGraphUtility.createFullSceneGraphComponent('conic');
    conicSGC.setGeometry(ConicUtils.createConic(1).getIndexedLineSet());
    const ap = conicSGC.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute("lineShader."+CommonAttributes.TUBE_RADIUS, 0.005);
    ap.setAttribute("lineShader."+CommonAttributes.DIFFUSE_COLOR, Color.WHITE);
    ap.setAttribute("lineShader."+CommonAttributes.TUBES_DRAW, true);
     ap.setAttribute("lineShader."+CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    this._worldSGC.addChild(conicSGC);
    this._conicSGC = conicSGC;
    return this._worldSGC;
  }

  display() {
    super.display();
    console.log('ConicDemo display');
    this._animationPlugin.setAnimateSceneGraph(true);
    this._animationPlugin.setAnimateCamera(false);
    console.log('animated list', this._animationPlugin.getAnimated());
    // set up animation keyframes
  }


}

