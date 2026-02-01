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
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as P2 from '../../core/math/P2.js';
import * as Rn from '../../core/math/Rn.js';
import { DataUtility } from '../../core/scene/data/DataUtility.js';
import { GeometryAttribute } from '../../core/scene/GeometryAttribute.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import * as CameraUtility from '../../core/util/CameraUtility.js';
import { Color } from '../../core/util/Color.js';
import { getLogger, Level, setModuleLevel } from '../../core/util/LoggingSystem.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';
import { DragPointTool } from './DragPointTool.js';

const logger = getLogger('jsreality.app.examples.ConicDemo'); 
setModuleLevel(logger.getModuleName(), Level.INFO);

export class ConicDemo extends JSRApp {
 
  getShowPanels() {
    return [true, true, false, true];
  }
  _colors = [Color.RED, Color.GREEN, Color.BLUE];
  _SjColors = [Color.YELLOW, Color.CYAN, Color.MAGENTA];
  _conicSGC = null;
  _numDoubleLines = 3;
  _conicInPencilSGC = new Array(this._numDoubleLines).fill(null);
  _doubleContactLineSGC = new Array(this._numDoubleLines).fill(null);
  _dblLineArrays = new Array(this._numDoubleLines).fill([1,0,0,0,0,0]);
  _dblLineEqArrays = new Array(this._numDoubleLines).fill(null);
  _conicInPencil = new Array(this._numDoubleLines).fill(null);
  _TiSGCs = new Array(this._numDoubleLines).fill(null);
  _psfTwoPoints =  new Array(this._numDoubleLines).fill(null);
  _prfDCLine = new Array(this._numDoubleLines).fill(null);
  _SjSGCs = new Array(this._numDoubleLines).fill(null);
  _SjConicInPencil = new Array(this._numDoubleLines).fill(null);
  _centerSGC = null;
  _worldSGC = null;
  _fivePointSGC = null;
  _fivePointPSF = null;
  _conic = null;
  _whichMode = 0;
  _pointPairs = new Array(this._numDoubleLines).fill(null);
  _doDualCurve = false;
  _dcParam = [.5, .5, .5];
  _aijs = [1,1,1];
  _dis = [[1,1],[1,1],[1,1]];
  _rParam = .4;
  
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

    
    this.initPointPairs();
    // console.log('point pairs = ', this._pointPairs);
    let ap = null;
    for (let i = 0; i < this._numDoubleLines; i++) {
       this.initSceneGraphForTiPencils(i);
       this.initSceneGraphForSjPencils(i);
    }
    this.updateDoubleContactPencils();

    this.updateConic();
   
    this.setValueAtTime(.5);

    this._fivePointPSF.getPointSet().addGeometryListener((event) => {
      // console.log('geometry changed for five points', event);
        let vertices = event.source.getVertexAttribute(GeometryAttribute.COORDINATES);
        let fivePoints = DataUtility.fromDataList(vertices);
        if (fivePoints == null || fivePoints.length !== 5) { return; }
        this._conic.setFromFivePoints(fivePoints);
        if (this._doDualCurve) this._conic.getDualCurveSGC();
        this._conicSGC.setGeometry(this._conic.getIndexedLineSet());
        this._centerSGC.setGeometry(Primitives.point(ConicUtils.getCenterPoint(this._conic)));
        this.updateDoubleContactPencils();
    });
    
      
    ap = this._worldSGC.getAppearance();
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
    this._TiSGCs[0].setVisible(false);
    this._SjSGCs[1].setVisible(false);
    this._SjSGCs[2].setVisible(false);
    
    this._worldSGC.addChildren(this._conicSGC, 
      this._fivePointSGC, 
      this._centerSGC, 
      ...this._TiSGCs,
      ...this._SjSGCs);
    if (this._doDualCurve) this._worldSGC.addChildren(this._conic.getDualCurveSGC());
    
    return this._worldSGC;
  }

  display() {
    super.display();
    this.getViewer().getSceneRoot().getAppearance().setAttribute(CommonAttributes.BACKGROUND_COLOR, Color.BLACK);
    // console.log('ConicDemo display');
    const cam = CameraUtility.getCamera(this.getViewer());
    const vc = this.getViewer().getViewingComponent();
    
    // console.log('animated list = ', this._animationPlugin.getAnimated());
    // this.animationPlugin.setAnimateSceneGraph(false);
    // this.animationPlugin.setAnimateCamera(false);
    

    if (vc) {
      this._resizeObserver = new ResizeObserver(() => {
        // update layout / camera / viewport as needed
        // console.log('size changed');
        // console.log('width = ', vc.clientWidth, 'height = ', vc.clientHeight);
        // console.log('viewport = ', CameraUtility.getViewport(cam, vc.clientWidth / vc.clientHeight));
        // this._conic.setViewport(CameraUtility.getViewport(cam, vc.clientWidth / vc.clientHeight));
        this.getViewer().renderAsync();
      });
      this._resizeObserver.observe(vc);
    }
    // viewport can also change with changes to camera
    cam.addCameraListener((event) => {
      // console.log('camera changed', event);
      this._conic.setViewport(CameraUtility.getViewport(cam, vc.clientWidth / vc.clientHeight));
      this.getViewer().renderAsync();
    });
   
  }

  setValueAtTime(time) {
    super.setValueAtTime(time);
    // console.log('setValueAtTime', time);
    for (let i = 0; i < this._numDoubleLines; i++) {
      this._dcParam[i] = time;
    }
    this.updateDoubleContactPencils();
    this.getViewer().renderAsync();
  }

  updateConic() {
    
    let fivePoints = this.initFivePoints();
    // console.log('fivePoints = ', fivePoints.length);
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
    //console.log('updateDoubleContactPencils');
    for (let i = 0; i < this._numDoubleLines; i++) {
      this.updateDoubleContactTiPencil(i);
    } 
    for (let i = 0; i < this._numDoubleLines; i++) {
      this.updateDoubleContactSjPencil(i);
    }
   }

  
  updateDoubleContactTiPencil(which = 0) {
    const u = 1- this._dcParam[which],
    // generate homogenous coordinates (x,y) running from [-inf, inf] when u runs from 0 to 1
      x = -2 * (u - 0.5),
      y = (u <= .5) ? u : 1.0 - u;
    this._dis[which] = [x,y];  // the "di" parameter in Morten's determinant formulas
    // the formula is Ti = di*S0 - pi*pi, or homogenized  dix*S0 - diy*pi*pi
    const pencilArray = Rn.linearCombination(null, x,this._conic.coefficients, -y, this._dblLineArrays[which]);
    // console.log('Ti which = ', which, 'time = ', x,  's = ', y, 'pencilArray = ', pencilArray);
    // console.log('conic coefficients = ', this._conic.coefficients);
    // console.log('dblLineArrays = ', this._dblLineArrays[which]);
    this._conicInPencil[which].setFromCoefficients(pencilArray);
    this._conicInPencilSGC[which].setGeometry(this._conicInPencil[which].getIndexedLineSet());
  }

  updateDoubleContactSjPencil(which = 0) {
   
    const [i,j,k] = [which, (which + 1) % this._numDoubleLines, (which + 2) % this._numDoubleLines];
    const ajk = this._aijs[i],
    [djx, djy] = this._dis[j],
    [dkx, dky] = this._dis[k];
    const S0 = this._conic.coefficients,
        pj = this._dblLineArrays[j],
        pk = this._dblLineArrays[k],
        l2j = this._dblLineEqArrays[j],
        l2k = this._dblLineEqArrays[k], 
        pjk =  ConicUtils.convertQToArray(ConicUtils.getQFromFactors(l2j, l2k));
    // the formula is Sj = (djdk- ajk*ajk)S0 - dk*pj*pj + 2*aij*pj*pk - dj*pk*pk
    // when we dehomogenize by multiplying through by djy*dky we get
    for (let m = 0; m < 6; m++) {
      acc[m] =(djx * dkx - djy * dky * ajk * ajk) * S0[m] - dkx*djy*pj[m] + 
          2*djy*dky*ajk*pjk[m] - djx*dky*pk[m];
      // console.log('acc[m] = ', acc[m]);
    }
    // const qj = Rn.add(null, Rn.times(null, djy*aijs[i], l2j),Rn.times(null, -dkx, l2k));
    // console.log("i = ",which," qj = ",qj);
    // const qjdblln = 

    this._SjConicInPencil[which].setFromCoefficients(acc);
    this._SjSGCs[which].setGeometry(this._SjConicInPencil[which].getIndexedLineSet());
  }

  initPointPairs() {
    const initPair = [[this._rParam, -.5, 0, 1], [this._rParam, .5, 0, 1]];
    const tts = new Array(this._numDoubleLines);
    tts.fill(0).map((_, i) => (2 * Math.PI * i) / this._numDoubleLines);
    // console.log('tts = ', tts);
    let mi = MatrixBuilder.euclidean().rotateZ(2 * Math.PI / this._numDoubleLines).getArray(),
      acc = Rn.identityMatrix(4);
    // console.log('mi = ', mi);
    const ret = [];
    for (let i = 0; i < tts.length; i++) {
      const t = tts[i];
      ret.push(Rn.matrixTimesVector(null, acc, initPair))
      acc = Rn.timesMatrix(null, acc, mi);
    }
    // console.log('point pairs = ', ret);
      this._pointPairs = ret;
    return ret;  
  }

  updatePointPairs()  {
    // console.log('updatePointPairs', this._pointPairs);
    for (let i = 0; i < this._numDoubleLines; i++) {
      this._prfDCLine[i].setElement0(this._pointPairs[i][0]);
      this._prfDCLine[i].setElement1(this._pointPairs[i][1]);
      this._prfDCLine[i].update();
      this._psfTwoPoints[i].setVertexCoordinates(this._pointPairs[i]);
      this._psfTwoPoints[i].update();
    }
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

  // each double line together with the main conic generates a double contact pencil.
  // this method initializes the scene graph for a double contact pencil.
  // it creates the conic section for the pencil, the double contact line, and the two points.
  // it also adds the scene graph components to the childSGCs array.
  // it returns the childSGCs array.
  initSceneGraphForTiPencils(w = 0) {
    const which = w;
    const lcolor = this._colors[which]; 
    const fcolor = lcolor.toFloatArray();

    const conicColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.5));
    const doubleLineColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.25));
    const twoPointColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.0));

    // console.log('conicColor = ', conicColor);
    // console.log('doubleLineColor = ', doubleLineColor);
    // console.log('twoPointColor = ', twoPointColor);

    this._conicInPencil[which] = new ConicSection();
    this._conicInPencil[which].name = 'pencil conic '+which;
    this._conicInPencilSGC[which] = SceneGraphUtility.createFullSceneGraphComponent('dblCntPncl '+which);
    let ap = this._conicInPencilSGC[which].getAppearance();
    
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, conicColor);
    this._TiSGCs[which] = SceneGraphUtility.createFullSceneGraphComponent('child '+which);
    const ppr4 = this._pointPairs[which];
    // console.log('ppr4 = ', ppr4); 
    this._doubleContactLineSGC[which] = SceneGraphUtility.createFullSceneGraphComponent('dblCntLn '+which);
    ap = this._doubleContactLineSGC[which].getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, doubleLineColor);
    const twoPointSGC = SceneGraphUtility.createFullSceneGraphComponent('twoPoints '+which); 
    ap = twoPointSGC.getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.02);
    ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, twoPointColor);
    ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, true);
    
    this._TiSGCs[which].addChildren(this._conicInPencilSGC[which], this._doubleContactLineSGC[which], twoPointSGC); 
   
    this._psfTwoPoints[which] = new PointSetFactory();
    this._psfTwoPoints[which].setVertexCount(2);
    this._psfTwoPoints[which].setVertexCoordinates(ppr4);
    this._psfTwoPoints[which].update();
    twoPointSGC.setGeometry(this._psfTwoPoints[which].getPointSet());
    const [l2d, coeffs] = this.#getLineFromTwoPoints(ppr4);
    this._dblLineArrays[which] = coeffs;
    this._dblLineEqArrays[which] = l2d;
    twoPointSGC.addTool(new DragPointTool());
    
    this._prfDCLine[which] = new PointRangeFactory();
    this._prfDCLine[which].setElement0(ppr4[0]);
    this._prfDCLine[which].setElement1(ppr4[1]);
    this._prfDCLine[which].setFiniteSphere(false);
    this._prfDCLine[which].setNumberOfSamples(24);
    this._prfDCLine[which].update();
    this._doubleContactLineSGC[which].setGeometry(this._prfDCLine[which].getLine());

    this._psfTwoPoints[which].getPointSet().addGeometryListener((event) => {
      // console.log('geometry changed for double contact line', event, ' ', which);
        let vertices = event.source.getVertexAttribute(GeometryAttribute.COORDINATES);
        let twoPoints = DataUtility.fromDataList(vertices);
        if (twoPoints == null || twoPoints.length !== 2) { return; }

        this._prfDCLine[which].setElement0(twoPoints[0]);
        this._prfDCLine[which].setElement1(twoPoints[1]);
        this._prfDCLine[which].update();
        const [l2d, coeffs] = this.#getLineFromTwoPoints(twoPoints);
        this._dblLineArrays[which] = coeffs;
        this._dblLineEqArrays[which] = l2d;
        this.updateDoubleContactTiPencil(which);
    });
    return this._TiSGCs[which];
  }

  initSceneGraphForSjPencils(w = 0) {
    const which = w;
    const lcolor = this._SjColors[which]; 
    const fcolor = lcolor.toFloatArray();

    const conicColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.5));
    const doubleLineColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.25));
    const twoPointColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.0));


    this._SjConicInPencil[which] = new ConicSection();
    this._SjConicInPencil[which].name = 'T pencil conic '+which;
    this._SjSGCs[which] = SceneGraphUtility.createFullSceneGraphComponent('Sj conic '+which);
    let ap = this._SjSGCs[which].getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, conicColor);
    this._SjSGCs[which].setGeometry(this._SjConicInPencil[which].getIndexedLineSet());
    return this._SjSGCs[which];
  }

  #getLineFromTwoPoints(twoPoints) {
    const twoPoints3 = twoPoints.map(p => Rn.convert4To3(null,p));
    const l2d = P2.lineFromPoints(...twoPoints3);
    const newQ = ConicUtils.getQFromFactors(l2d, l2d);
    return [l2d, ConicUtils.convertQToArray(newQ)];
  }

  #saturateColor(c, saturate) {
     return c.map(x => saturate + (1-saturate)*x);
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
                // console.log('button whichMode = 0');
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
          direction: 'column',
          containerLabel: 'Double Contact Pencils', 
          items: [
            {
              type: DescriptorType.TEXT_SLIDER,
              min: 0, max: 1, value: this._dcParam[0],
              scale: 'linear',
              label: 'Pencil 0',
              valueType: 'float',
              getValue: () => this._dcParam[0],
              setValue: (val) => {
                this._dcParam[0] = val;
                this.updateDoubleContactPencils();
                this.getViewer().renderAsync();
              }
            },
            {
              type: DescriptorType.TEXT_SLIDER,
              min: 0, max: 1, value: this._dcParam[1],
              scale: 'linear',
              label: 'Pencil 1',
              valueType: 'float',
              getValue: () => this._dcParam[1],
              setValue: (val) => {
                this._dcParam[1] = val;
                this.updateDoubleContactPencils();
                this.getViewer().renderAsync();
              }
            },
            {
              type: DescriptorType.TEXT_SLIDER,
              min: 0, max: 1, value: this._dcParam[2],
              scale: 'linear',
              label: 'Pencil 2',
              valueType: 'float',
              getValue: () => this._dcParam[2],
              setValue: (val) => {
                this._dcParam[2] = val;
                this.updateDoubleContactPencils();
                this.getViewer().renderAsync();
              }
            },
               {
                  type: DescriptorType.TEXT_SLIDER,
                  min: 0, max: 1, value: this._aijs[0],
                  scale: 'linear',
                  label: 'a12',
                  valueType: 'float',
                  getValue: () => this._aijs[0],
                  setValue: (val) => {
                    this._aijs[0] = val;
                    this.updateDoubleContactSjPencil(0);
                    this.getViewer().renderAsync();
                  }
                },
                {
                  type: DescriptorType.TEXT_SLIDER,
                  min: 0, max: 1, value: this._aijs[1],
                  scale: 'linear',
                  label: 'a02',
                  valueType: 'float',
                  getValue: () => this._aijs[1],
                  setValue: (val) => {
                    this._aijs[1] = val;
                    this.updateDoubleContactSjPencil(1);
                    this.getViewer().renderAsync();
                  }
                },
                {
                  type: DescriptorType.TEXT_SLIDER,
                  min: 0, max: 1, value: this._aijs[2],
                  scale: 'linear',
                  label: 'a01',
                  valueType: 'float',
                  getValue: () => this._aijs[2],
                  setValue: (val) => {
                    this._aijs[2] = val;
                    this.updateDoubleContactSjPencil(2);
                    this.getViewer().renderAsync();
                  }
                },
            {
              type: DescriptorType.TEXT_SLIDER,
              min: 0, max: 1, value: this._rParam,
              scale: 'linear',
              label: 'dblln dist',
              valueType: 'float',
              getValue: () => this._rParam ,
              setValue: (val) => {
                this._rParam = val;
                this.initPointPairs();
                this.updatePointPairs();
                this.updateDoubleContactPencils();
                this.getViewer().renderAsync();
              }
            }
          ]
        }
      ];
    }
  }

  //  // Add markers at the corners of the viewport
  //  const dim = this.getViewer().getViewingComponentSize();
  //  console.log('dimension', dim);
  //  const vp = CameraUtility.getViewport(cam, dim.width / dim.height);
  //  console.log('viewport', vp);
  //  const verts = [[vp.x, vp.y, 1], [vp.x + vp.width, vp.y, 1], [vp.x + vp.width, vp.y + vp.height, 1], [vp.x, vp.y + vp.height, 1]];
  //  const psf = new PointSetFactory();
  //  psf.setVertexCount(verts.length);
  //  psf.setVertexCoordinates(verts);
  //  psf.update();
  //  const psgc = SceneGraphUtility.createFullSceneGraphComponent('viewport');
  //  // psgc.setGeometry(psf.getPointSet());
  //  this._worldSGC.addChildren(psgc);
  