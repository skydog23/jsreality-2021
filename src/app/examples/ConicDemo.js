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
import { PointRangeFactory } from '../../core/geometry/projective/PointRangeFactory.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import * as P2 from '../../core/math/P2.js';
import * as Rn from '../../core/math/Rn.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import { DataUtility } from '../../core/scene/data/DataUtility.js';
import { GeometryAttribute } from '../../core/scene/GeometryAttribute.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { ClickWheelCameraZoomTool } from '../../core/tools/ClickWheelCameraZoomTool.js';
import * as CameraUtility from '../../core/util/CameraUtility.js';
import { Color } from '../../core/util/Color.js';
import { getLogger, Level, setModuleLevel } from '../../core/util/LoggingSystem.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';
import { DragPointTool } from './DragPointTool.js';
import { lineFromPoints } from '../../core/math/PlueckerLineGeometry.js';
import { Appearance } from '../../core/scene/Appearance.js';

const logger = getLogger('jsreality.app.examples.ConicDemo'); 
setModuleLevel(logger.getModuleName(), Level.INFO);

// const buggyQ = 0
const buggyFivePoints = [
  [1, 0, 1],
  [-0.07594863468024297, -0.35442696184113437, 1],
  [-0.8090169943749473, 0.5877852522924732, 1],
  [-0.8090169943749476, -0.587785252292473, 1],
  [0.30901699437494723, -0.9510565162951536, 1]
];

export class ConicDemo extends JSRApp {
 
  getShowPanels() {
    return [true, true, false, true];
  }
  _colors = [Color.RED, Color.GREEN, Color.BLUE];
  _conicSGC = null;
  _numDoubleLines = 1;
  _conicInPencilSGC = new Array(this._numDoubleLines).fill(null);
  _doubleContactLineSGC = new Array(this._numDoubleLines).fill(null);
  _dblLineArrays = new Array(this._numDoubleLines).fill([1,0,0,0,0,0]);
  _conicInPencil = new Array(this._numDoubleLines).fill(null);
  _childSGCs = new Array(this._numDoubleLines).fill(null);
  _centerSGC = null;
  _worldSGC = null;
  _fivePointSGC = null;
  _fivePointPSF = null;
  _conic = null;
  _whichMode = 0;
  _pointPairs = null;
  _doDualCurve = false;
  _dcParam = new Array(this._numDoubleLines).fill(0.4);
  
  getContent() {
    this._worldSGC = SceneGraphUtility.createFullSceneGraphComponent('world');

    this._conicSGC = SceneGraphUtility.createFullSceneGraphComponent('conic');
    this._fivePointSGC = SceneGraphUtility.createFullSceneGraphComponent('fivePoints');
    this._centerSGC = SceneGraphUtility.createFullSceneGraphComponent('center');

    // set up point set factory for the five points
    this._fivePointPSF = new PointSetFactory();
    this._fivePointPSF.setVertexCount(5);
    this._fivePointPSF.setVertexCoordinates(this.unitCircle());
    this._fivePointPSF.update();
    this._fivePointSGC.setGeometry(this._fivePointPSF.getPointSet());

    this._conic = new ConicSection();
    this._conic.name = 'fixed conic';

    
    this._pointPairs = this.initPointPairs();
    console.log('point pairs = ', this._pointPairs);
    for (let i = 0; i < this._numDoubleLines; i++) {
      this._conicInPencil[i] = new ConicSection();
      this._conicInPencil[i].name = 'pencil conic '+i;
      this._conicInPencilSGC[i] = SceneGraphUtility.createFullSceneGraphComponent('dblCntPncl '+i);
      this._doubleContactLineSGC[i] = this.sceneGraphForDoubleLine(i);
      this._childSGCs[i] = SceneGraphUtility.createFullSceneGraphComponent('child '+i);
      this._childSGCs[i].addChildren(this._conicInPencilSGC[i], this._doubleContactLineSGC[i]); 
      this.updateDoubleContactPencil(i);
    }

    this.updateConic();

    this._fivePointPSF.getPointSet().addGeometryListener((event) => {
      // console.log('geometry changed', event);
        let vertices = event.source.getVertexAttribute(GeometryAttribute.COORDINATES);
        let fivePoints = DataUtility.fromDataList(vertices);
        if (fivePoints == null || fivePoints.length !== 5) { return; }
        this._conic.setFromFivePoints(fivePoints);
        if (this._doDualCurve) this._conic.getDualCurveSGC();
        this._conicSGC.setGeometry(this._conic.getIndexedLineSet());
        this._centerSGC.setGeometry(Primitives.point(ConicUtils.getCenterPoint(this._conic)));
        this.updateDoubleContactPencils();
    });
    
      
    let ap = this._worldSGC.getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute("lineShader." + CommonAttributes.TUBE_RADIUS, 0.005);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, Color.WHITE);
    ap.setAttribute("lineShader." + CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.005);
    ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, Color.WHITE);
    ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, true);
    ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
    ap.setAttribute(CommonAttributes.FLIP_NORMALS, true);
     
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
 
    const tool = new DragPointTool();
    tool.setName("dragPointTool");
    this._fivePointSGC.addTool(tool);

   
    // const clickWheelTool = new ClickWheelCameraZoomTool();
    // clickWheelTool.setName("clickWheelTool");
    // this._worldSGC.addTool(clickWheelTool);

    // const encompassTool = new EncompassTool();
    // encompassTool.setName("encompassTool");
    // this._worldSGC.addTool(encompassTool);
    this._worldSGC.addChildren(this._conicSGC, this._fivePointSGC, this._centerSGC, ...this._childSGCs);
    if (this._doDualCurve) this._worldSGC.addChildren(this._conic.getDualCurveSGC());
    
    return this._worldSGC;
  }

  display() {
    super.display();
    this.getViewer().getSceneRoot().getAppearance().setAttribute(CommonAttributes.BACKGROUND_COLOR, Color.BLACK);
    console.log('ConicDemo display');
    const cam = CameraUtility.getCamera(this.getViewer());
    const vc = this.getViewer().getViewingComponent();
    
    // Add markers at the corners of the viewport
    const dim = this.getViewer().getViewingComponentSize();
    console.log('dimension', dim);
    const vp = CameraUtility.getViewport(cam, dim.width / dim.height);
    console.log('viewport', vp);
    const verts = [[vp.x, vp.y, 1], [vp.x + vp.width, vp.y, 1], [vp.x + vp.width, vp.y + vp.height, 1], [vp.x, vp.y + vp.height, 1]];
    const psf = new PointSetFactory();
    psf.setVertexCount(verts.length);
    psf.setVertexCoordinates(verts);
    psf.update();
    const psgc = SceneGraphUtility.createFullSceneGraphComponent('viewport');
    // psgc.setGeometry(psf.getPointSet());
    this._worldSGC.addChildren(psgc);

    if (vc) {
      this._resizeObserver = new ResizeObserver(() => {
        // update layout / camera / viewport as needed
        console.log('size changed');
        console.log('width = ', vc.clientWidth, 'height = ', vc.clientHeight);
        console.log('viewport = ', CameraUtility.getViewport(cam, vc.clientWidth / vc.clientHeight));
        this._conic.setViewport(CameraUtility.getViewport(cam, vc.clientWidth / vc.clientHeight));
        this.getViewer().renderAsync();
      });
      this._resizeObserver.observe(vc);
    }
    // viewport can also change with changes to camera
    cam.addCameraListener((event) => {
      console.log('camera changed', event);
      this._conic.setViewport(CameraUtility.getViewport(cam, vc.clientWidth / vc.clientHeight));
      this.getViewer().renderAsync();
    });
   
  }

  updateConic() {
    
    let fivePoints = this.initFivePoints();
    console.log('fivePoints = ', fivePoints.length);
    this._fivePointPSF.setVertexCoordinates(fivePoints);
    this._fivePointPSF.update();
    
    this._conic.setFromFivePoints(fivePoints);
    this._conicSGC.setGeometry(this._conic.getIndexedLineSet());

    this._centerSGC.setVisible(this._conic.rank === 3);
    this._centerSGC.setGeometry(Primitives.point(ConicUtils.getCenterPoint(this._conic)));
    if (this._doDualCurve) this._dualCurveSGC = this._conic.getDualCurveSGC();

    this.updateDoubleContactPencils();
     
   }

   updateDoubleContactPencils() {
    for (let i = 0; i < this._numDoubleLines; i++) {
      this.updateDoubleContactPencil(i);
    }
   }

   updateDoubleContactPencil(which = 0) {

    const t = 2*(this._dcParam[which] - 0.5),
    sign = t < 0 ? -1 : 1;
    const pencilArray = Rn.linearCombination(null, t, this._dblLineArrays[which], sign * (1-Math.abs(t)),  this._conic.coefficients);
    
    this._conicInPencil[which].setCoefficients(pencilArray);
    
    this._conicInPencilSGC[which].setGeometry(this._conicInPencil[which].getIndexedLineSet());
   }

  initPointPairs() { 
     const initPair = [[.4, -.5, 0, 1], [.4, .5, 0, 1]];
     const tts = new Array(this._numDoubleLines).map((_, i) => (2 * Math.PI * i) / this._numDoubleLines);
     console.log('tts = ', tts);
     const ret = tts.map((t) => {
      let mi = MatrixBuilder.euclidean().rotateZ(t).getArray();
      let pp = Rn.matrixTimesVector(null, mi, initPair);
      console.log('pp = ', pp);
      return Pn.dehomogenize(null, pp)
    });
    console.log('point pairs = ', ret);
    return [initPair];
  }

  initFivePoints() {
    let fivePoints = [];
    if (this._whichMode == 0) {
      fivePoints = this.unitCircle();
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
    } else {
      // arrange all points on line through origin
        fivePoints = new Array(5);
        const alpha = Math.PI * .25; //Math.random();
        fivePoints[0] = [Math.random() * 2 - 1, Math.random() * 2 - 1, 1];
        fivePoints[1] = [Math.random() * 2 - 1, Math.random() * 2 - 1, 1],
        fivePoints[2] = Rn.add(null, Rn.times(null, .2, fivePoints[0]), Rn.times(null, .8, fivePoints[1]));
        fivePoints[3] = Rn.add(null, Rn.times(null, .4, fivePoints[0]), Rn.times(null, .6, fivePoints[1]));
        fivePoints[4] = Rn.add(null, Rn.times(null, .6, fivePoints[0]), Rn.times(null, .4, fivePoints[1]));[Math.random() * 2 - 1, Math.random() * 2 - 1, 1];
        if (this._whichMode == 3) fivePoints[4] = [Math.random() * 2 - 1, Math.random() * 2 - 1, 1];
          
      }
    return fivePoints;
    }

  unitCircle(fivePoints) {
    fivePoints = [];
    for (let i = 0; i < 5; i++) {
      const angle = (2 * Math.PI * i) / 5;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      fivePoints.push([x, y, 1]);
    }
    return fivePoints;
  }

  sceneGraphForDoubleLine(which = 0) {
    const ppr4 = this._pointPairs[which];
    console.log('ppr4 = ', ppr4); 
    const lcolor = this._colors[which]; 
    const doubleContactLineSGC = SceneGraphUtility.createFullSceneGraphComponent('dblCntLn '+which);
    const ap = doubleContactLineSGC.getAppearance();
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, lcolor);
    const twoPointSGC = SceneGraphUtility.createFullSceneGraphComponent('twoPoints '+which); 
   
    const psfTwoPoints = new PointSetFactory();
    psfTwoPoints.setVertexCount(2);
    psfTwoPoints.setVertexCoordinates(ppr4);
    psfTwoPoints.update();
    twoPointSGC.setGeometry(psfTwoPoints.getPointSet());
    twoPointSGC.addTool(new DragPointTool());
    doubleContactLineSGC.addChild(twoPointSGC);
    
    const prf = new PointRangeFactory();
    prf.set2DLine(P2.lineFromPoints(...ppr4.map(p => Rn.convert4To3(null,p))));
    prf.setFiniteSphere(false);
    prf.update();
    doubleContactLineSGC.setGeometry(prf.getLine());

    psfTwoPoints.getPointSet().addGeometryListener((event) => {
      // console.log('geometry changed', event);
        let vertices = event.source.getVertexAttribute(GeometryAttribute.COORDINATES);
        let twoPoints = DataUtility.fromDataList(vertices);
        if (twoPoints == null || twoPoints.length !== 2) { return; }
        const twoPoints3 = ppr4.map(p => Rn.convert4To3(null,p));
        console.log('twoPoints3 = ', twoPoints3);
        const l2d = P2.lineFromPoints(...twoPoints3);
        prf.set2DLine(l2d);
        prf.update();
        const newQ = ConicUtils.symmetricOuterProduct(l2d, l2d);
        this._dblLineArrays[which] =  ConicUtils.convertQToArray(newQ);
        console.log('newQ = ', this._dblLineArrays[which]);
        this.updateDoubleContactPencil(which);
    });

    return doubleContactLineSGC;
    
  }

    getInspectorDescriptors() {
      return [
        {
          type: DescriptorType.CONTAINER,
          containerLabel: '# Collinear points',
          direction: 'row',
          items: [
            {
              type: DescriptorType.BUTTON,
              label: '\u2299',
              action: () => {
                console.log('button whichMode = 0');
                this._whichMode = 0; this.updateConic();
                this.getViewer().renderAsync();}
            },
            {
              type: DescriptorType.BUTTON,
              // comment out experimental icon support for now
              // label: '',
              // iconSrc: '../src/assets/images/icons/fav_icon.png',
              label: '2',
              action: () => {this._whichMode = 1; this.updateConic();
                this.getViewer().renderAsync();}
            },
            {
              type: DescriptorType.BUTTON,
              label: '3',
              action: () => {this._whichMode = 2; this.updateConic();
                this.getViewer().renderAsync();}
            },
            {
              type: DescriptorType.BUTTON,
              label: '4',
              action: () => {this._whichMode = 3; this.updateConic();
                this.getViewer().renderAsync();}
            },
            {
              type: DescriptorType.BUTTON,
              label: '5',
              action: () => {this._whichMode =43; this.updateConic();
                this.getViewer().renderAsync();}
            }
          ]
        },
        {
          type: DescriptorType.CONTAINER,
          direction: 'row',
          containerLabel: 'Double Contact Pencil', 
          items: [
            {
              type: DescriptorType.TEXT_SLIDER,
              min: 0, max: 1, value: 0.5,
              scale: 'linear',
              label: '',
              setValue: (value) => {
                this._dcParam = value;
                this.updateDoubleContactPencil(0);
                this.getViewer().renderAsync();}
            }
          ]
        }
      ];
    }
  }
  