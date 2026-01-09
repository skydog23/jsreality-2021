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
import * as Rn from '../../core/math/Rn.js';
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
  _fivePointSGC = null;
  _fivePoints = null;
  _conic = null;
  _whichMode = 1;
  _doSVD = true;

  getContent() {
    this._worldSGC = SceneGraphUtility.createFullSceneGraphComponent('world');
    
    this._conicSGC = SceneGraphUtility.createFullSceneGraphComponent('conic');
    this._fivePointSGC = SceneGraphUtility.createFullSceneGraphComponent('fivePoints');
    this.setupConic();
    this._conicSGC.setGeometry(this._conic.getIndexedLineSet());
    let ap = this._conicSGC.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute("lineShader."+CommonAttributes.TUBE_RADIUS, 0.005);
    ap.setAttribute("lineShader."+CommonAttributes.DIFFUSE_COLOR, Color.WHITE);
    ap.setAttribute("lineShader."+CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute("lineShader."+CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap = this._fivePointSGC.getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute("pointShader."+CommonAttributes.POINT_RADIUS, 0.005);
    ap.setAttribute("pointShader."+CommonAttributes.DIFFUSE_COLOR, Color.RED);
    ap.setAttribute("lineShader."+CommonAttributes.SPHERES_DRAW, false);
    
    this._worldSGC.addChildren(this._conicSGC, this._fivePointSGC);
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

  setupConic() {
    this._conic = new ConicSection();
    console.log('Creating initial conic');


  if (this._whichMode == 0) {
      this._fivePoints = [];
      for (let i = 0; i < 5; i++) {
          const angle = (2 * Math.PI * i) / 5;
          const x = Math.cos(angle);
          const y = Math.sin(angle);
          this._fivePoints.push([x, y, 1]);
      }
      logger.fine(-1, 'Using normal conic mode - 5 points on unit circle');
  } else  {
      this._fivePoints = [
          [Math.random()*2-1, Math.random()*2-1,  1],
          [Math.random()*2-1, Math.random()*2-1, 1],
          [Math.random()*2-1, Math.random()*2-1,  1],
          [Math.random()*2-1, Math.random()*2-1, 1],
          [Math.random()*2-1, Math.random()*2-1, 1]
      ];
      if (this._whichMode == 2) {
        this._fivePoints[4] = Rn.add(null, Rn.times(null, .4, this._fivePoints[0]), Rn.times(null, .6, this._fivePoints[1]));
      }
  }

  if (this._doSVD) {
      this._conic.setCoefficients(ConicUtils.solveConicFromPointsSVD(this._fivePoints));
  } else {
      this._conic.setCoefficients(ConicUtils.solveConicFromPoints(this._fivePoints));
  }
    this._conic.update();
  }

}
