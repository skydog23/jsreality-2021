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
import { PointSetFactory } from '../../core/geometry/PointSetFactory.js';
import { TestTool } from './TestTool.js';
import { ToolUtility } from '../../core/scene/tool/ToolUtility.js';
import { getLogger, setModuleLevel, Level, Category } from '../../core/util/LoggingSystem.js';
const logger = getLogger('jsreality.app.examples.ConicDemo');
setModuleLevel('jsreality.app.examples.ConicDemo', Level.FINER);
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
  _psf = null;

  getContent() {
    this._worldSGC = SceneGraphUtility.createFullSceneGraphComponent('world');
    
    this._conicSGC = SceneGraphUtility.createFullSceneGraphComponent('conic');
    this._fivePointSGC = SceneGraphUtility.createFullSceneGraphComponent('fivePoints');
    this.setupConic();
     
     // Define a local tool class that has closure access to ptSGC
     class MyTestTool extends TestTool {
      perform(tc) {
        super.perform(tc);
        const objMousePosition = ToolUtility.worldToLocal(tc, this._mousePosition);
         logger.fine(Category.ALL, 'pick:', tc.getCurrentPick());
        // ptSGC.setGeometry(Primitives.point(objMousePosition));
        tc.get
        tc.getViewer().renderAsync();   // <-- use the context’s viewer
      }
      deactivate(tc) {
        this.perform(tc);
        super.deactivate(tc);
       
      }
    }
    const tool = new MyTestTool();
    tool.setName("testTool");
    this._worldSGC.addTool(tool);
       
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

  this._psf = new PointSetFactory();
  this._psf.setVertexCount(this._fivePoints.length);
  this._psf.setVertexCoordinates(this._fivePoints);
  this._psf.update();
  this._fivePointSGC.setGeometry(this._psf.getPointSet());
  let ap = this._fivePointSGC.getAppearance();
  ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
  ap.setAttribute("pointShader."+CommonAttributes.POINT_RADIUS, 0.02);
  ap.setAttribute("pointShader."+CommonAttributes.DIFFUSE_COLOR, Color.RED);
  ap.setAttribute("pointShader."+CommonAttributes.SPHERES_DRAW, false);
  
  if (this._doSVD) {
      this._conic.setCoefficients(ConicUtils.solveConicFromPointsSVD(this._fivePoints));
  } else {
      this._conic.setCoefficients(ConicUtils.solveConicFromPoints(this._fivePoints));
  }
    this._conic.update();
    this._conicSGC.setGeometry(this._conic.getIndexedLineSet());
    ap = this._conicSGC.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute("lineShader."+CommonAttributes.TUBE_RADIUS, 0.005);
    ap.setAttribute("lineShader."+CommonAttributes.DIFFUSE_COLOR, Color.WHITE);
    ap.setAttribute("lineShader."+CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute("lineShader."+CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
  }
   
 
}
