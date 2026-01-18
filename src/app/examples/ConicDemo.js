/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { ConicSection } from '../../core/geometry/ConicSection.js';
import { ConicUtils } from '../../core/geometry/ConicUtils.js';
import { PointSetFactory } from '../../core/geometry/PointSetFactory.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import * as Rn from '../../core/math/Rn.js';
import { DataUtility } from '../../core/scene/data/DataUtility.js';
import { GeometryAttribute } from '../../core/scene/GeometryAttribute.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { getLogger, Level, setModuleLevel } from '../../core/util/LoggingSystem.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';
import { DragPointTool } from './DragPointTool.js';
import * as CameraUtility from '../../core/util/CameraUtility.js';
const logger = getLogger('jsreality.app.examples.ConicDemo');
setModuleLevel(logger.getModuleName(), Level.INFO);
/**
 * Minimal app demonstrating AnimationPlugin driving a KeyFrameAnimatedTransformation.
 * The app contributes its own inspector button to start playback.
 */
export class ConicDemo extends JSRApp {
 
  getShowPanels() {
    return [true, false, false, true];
  }
  _conicSGC = null;
  _worldSGC = null;
  _fivePointSGC = null;
   _conic = null;
  _whichMode = 0;
  _doSVD = true;
  _psf = null;

  getContent() {
    this._worldSGC = SceneGraphUtility.createFullSceneGraphComponent('world');
    
    this._conicSGC = SceneGraphUtility.createFullSceneGraphComponent('conic');
    this._fivePointSGC = SceneGraphUtility.createFullSceneGraphComponent('fivePoints');
    this._centerSGC = SceneGraphUtility.createFullSceneGraphComponent('center');
    
    this.setupConic();
     
    let ap = this._conicSGC.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute("lineShader." + CommonAttributes.TUBE_RADIUS, 0.005);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, Color.WHITE);
    ap.setAttribute("lineShader." + CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);

    ap = this._fivePointSGC.getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.02);
    ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, Color.RED);
    ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, true);

    ap = this._centerSGC.getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.03);
    ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, Color.GREEN);
    ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, true);

    ap = this._worldSGC.getAppearance();
    ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
    ap.setAttribute(CommonAttributes.FLIP_NORMALS, true);
  
    const tool = new DragPointTool();
    tool.setName("dragPointTool");
    this._fivePointSGC.addTool(tool);
    
    class MyEncompassTool extends AbstractTool {
      
    
      static encompassSlot = InputSlot.getDevice('EncompassActivation');
    
      constructor() {
        super();
        this.addCurrentSlot(MyEncompassTool.encompassSlot);
      }

      perform(tc) {
        console.log('MyEncompassTool.perform()', tc);
        CameraUtility.encompass(tc.getViewer());
        tc.getViewer().renderAsync();
      }
    }
    this._worldSGC.addTool(new MyEncompassTool());

    this._worldSGC.addChildren(this._conicSGC, this._fivePointSGC, this._centerSGC);
    return this._worldSGC;
  }

  display() {
    super.display();
    console.log('ConicDemo display');
    const cam = CameraUtility.getCamera(this.getViewer());
    const vc = this.getViewer().getViewingComponent();
    if (vc) {
      this._resizeObserver = new ResizeObserver(() => {
        // update layout / camera / viewport as needed
        console.log('size changed');
        console.log('width = ', vc.clientWidth, 'height = ', vc.clientHeight);
        console.log('viewport = ', CameraUtility.getViewport(cam, vc.clientWidth / vc.clientHeight));
        this.getViewer().renderAsync();
      });
      this._resizeObserver.observe(vc);
    }
   
  }

  setupConic() {
    
    this._conic = new ConicSection();
    let fivePoints = this.initFivePoints();
    ConicUtils.getConicThroughFivePoints(fivePoints, this._conic, this._doSVD);
    this._conicSGC.setGeometry(this._conic.getIndexedLineSet());
   
     // set up point set factory for the five points
    this._psf = new PointSetFactory();
    this._psf.setVertexCount(fivePoints.length);
    this._psf.setVertexCoordinates(fivePoints);
    this._psf.update();
    this._fivePointSGC.setGeometry(this._psf.getPointSet());
    
    this._centerSGC.setGeometry(Primitives.point(this._conic.centerPoint));

    this._psf.getPointSet().addGeometryListener((event) => {
      // console.log('geometry changed', event);
      let vertices = event.source.getVertexAttribute(GeometryAttribute.COORDINATES);
      let fivePoints = DataUtility.fromDataList(vertices);
      ConicUtils.getConicThroughFivePoints(fivePoints, this._conic, this._doSVD);
      this._conicSGC.setGeometry(this._conic.getIndexedLineSet());
      this._centerSGC.setGeometry(Primitives.point(this._conic.centerPoint));
    });
     
   }

  initFivePoints() {
    let fivePoints = [];
    if (this._whichMode == 0) {
      fivePoints = [];
      for (let i = 0; i < 5; i++) {
        const angle = (2 * Math.PI * i) / 5;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        fivePoints.push([x, y, 1]);
      }
      logger.fine(-1, 'Using normal conic mode - 5 points on unit circle');
    } else if (this._whichMode == 1 || this._whichMode == 2) {
      fivePoints = [
        [Math.random() * 2 - 1, Math.random() * 2 - 1, 1],
        [Math.random() * 2 - 1, Math.random() * 2 - 1, 1],
        [Math.random() * 2 - 1, Math.random() * 2 - 1, 1],
        [Math.random() * 2 - 1, Math.random() * 2 - 1, 1],
        [Math.random() * 2 - 1, Math.random() * 2 - 1, 1]
      ];
      // make it rank-2 (a line pair)
      if (this._whichMode == 2) fivePoints[4] = Rn.add(null, Rn.times(null, .6, fivePoints[0]), Rn.times(null, .4, fivePoints[1]));
    } else if (this._whichMode == 3) {
      // arrange all points on line through origin
        fivePoints = new Array(5);
        const alpha = Math.PI * .25; //Math.random();
        fivePoints[0] = [0, 0, 1];
        fivePoints[1] = [Math.random() * 2 - 1, Math.random() * 2 - 1, 1],
        fivePoints[2] = Rn.add(null, Rn.times(null, .2, fivePoints[0]), Rn.times(null, .8, fivePoints[1]));
        fivePoints[3] = Rn.add(null, Rn.times(null, .4, fivePoints[0]), Rn.times(null, .6, fivePoints[1]));
        fivePoints[4] = Rn.add(null, Rn.times(null, .6, fivePoints[0]), Rn.times(null, .4, fivePoints[1]));
      }
    return fivePoints;
    }
  }
