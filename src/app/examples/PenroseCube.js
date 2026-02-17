/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */


import { KeyFrameAnimatedDouble } from '../../anim/core/KeyFrameAnimatedDouble.js';
import { TimeDescriptor } from '../../anim/core/TimeDescriptor.js';
import { BoundaryModes, InterpolationTypes } from '../../anim/util/AnimationUtility.js';
import { ConicSection } from '../../core/geometry/ConicSection.js';
import { ConicUtils } from '../../core/geometry/ConicUtils.js';
import { PointSetFactory } from '../../core/geometry/PointSetFactory.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { PointRangeFactory } from '../../core/geometry/projective/PointRangeFactory.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as P2 from '../../core/math/P2.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { DataUtility } from '../../core/scene/data/DataUtility.js';
import { GeometryAttribute } from '../../core/scene/GeometryAttribute.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { ClickWheelCameraZoomTool } from '../../core/tools/ClickWheelCameraZoomTool.js';
import { DragPointTool } from '../../core/tools/DragPointTool.js';
import * as CameraUtility from '../../core/util/CameraUtility.js';
import { Color } from '../../core/util/Color.js';
import { getLogger, Level, setModuleLevel } from '../../core/util/LoggingSystem.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';

const logger = getLogger('jsreality.app.examples.PenroseCube'); 
setModuleLevel(logger.getModuleName(), Level.INFO);

export class PenroseCube extends JSRApp {
 
  getShowPanels() {
    return [true, true, false, true];
  }
  _colors = [Color.RED, Color.YELLOW, new Color(75, 75, 255)];
  _SjColors = [Color.GREEN, Color.PURPLE,new Color(255,128,0)];
  _conic = null;
  _conicSGC = null;
  _numDoubleLines = 3;
  _TiSGCs = new Array(this._numDoubleLines).fill(null);
  _S0TiDblLnSGCs = new Array(this._numDoubleLines).fill(null);
  _S0TiPtPairSGCs = new Array(this._numDoubleLines).fill(null);
  _S0TiDblLnArrays = new Array(this._numDoubleLines).fill([1,0,0,0,0,0]);
  _S0TiDblLnEqArrays = new Array(this._numDoubleLines).fill(null);
  _TiConics = new Array(this._numDoubleLines).fill(null);
  _TiCollectorSGCs = new Array(this._numDoubleLines).fill(null);
  _S0TiPtPairPSFs =  new Array(this._numDoubleLines).fill(null);
  _S0TiDblLnPRFs = new Array(this._numDoubleLines).fill(null);
  _SjSGCs = new Array(this._numDoubleLines).fill(null);
  _SjConics = new Array(this._numDoubleLines).fill(null);
  _SjTkDblLnConics = new Array(2*this._numDoubleLines).fill(null);
  _SjTkDblLnSGCs = new Array(2*this._numDoubleLines).fill(null);
  _T0Conic = null;
  _T0ConicSGC = null;
  _pipjs = new Array(this._numDoubleLines).fill(null);
  _centerSGC = null;
  _worldSGC = null;
  _fivePointSGC = null;
  _fivePointPSF = null;
   _whichMode = 0;
  _pointPairs = new Array(this._numDoubleLines).fill(null);
  _doDualCurve = false;
  _show5Pts = false;
  _showCenterPoint = false;
  _showS0TiCC = true;
  _showS0TiLines = true;
  _showTiSjCC = false;
  _dcParam = [.416,.416,.416];
  _aijs = [.5,.5,.5];
  _aijsRaw = new Array(3).fill(.5);
  _dis = [[1,1],[1,1],[1,1]];
  _rParam = .25;
  _animDub = null;
  _penroseCorners = new Array(8);

  getContent() {
    this._worldSGC = SceneGraphUtility.createFullSceneGraphComponent('wold');

    this._conicSGC = SceneGraphUtility.createFullSceneGraphComponent('conic');
    this._T0ConicSGC = SceneGraphUtility.createFullSceneGraphComponent('T0 conic');
    this._fivePointSGC = SceneGraphUtility.createFullSceneGraphComponent('fivePoints');
    this._centerSGC = SceneGraphUtility.createFullSceneGraphComponent('center');
    this._centerSGC.setVisible(this._showCenterPoint);
    this._fivePointSGC.setVisible(this._show5Pts);

    // set up point set factory for the five points
    this._fivePointPSF = new PointSetFactory();
    this._fivePointPSF.setVertexCount(5);
    this._fivePointPSF.setVertexCoordinates(this.unitCircle());
    this._fivePointPSF.update();
    this._fivePointSGC.setGeometry(this._fivePointPSF.getPointSet());

    this._conic = new ConicSection();
    this._conic.name = 'S0 conic';
     
    this._T0Conic = new ConicSection();
    this._T0Conic.name = 'T0 conic';
    this._T0ConicSGC = SceneGraphUtility.createFullSceneGraphComponent('T0 conic');
    this._T0ConicSGC.setGeometry(this._T0Conic.getIndexedLineSet());
   
    this.initPointPairs();
    let ap = null;
    for (let i = 0; i < this._numDoubleLines; i++) {
       this.initSceneGraphForTiPencils(i);
       this.initSceneGraphForSjPencils(i);
       this.initSceneGraphForSjTkDblLnConics(i);
    }

    this.initPenroseCorners();

    this.updatePipjs();
    this.updateDoubleContactPencils();
    this.updateT0Conic();

    this.updateConic();
   
    // this.setValueAtTime(.416);

    this._fivePointPSF.getPointSet().addGeometryListener((event) => {
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
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
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
  
    
    this._worldSGC.addChildren(this._conicSGC, 
      this._fivePointSGC, 
      this._centerSGC, 
      ...this._TiCollectorSGCs,
      ...this._SjSGCs,
      ...this._SjTkDblLnSGCs,
      this._T0ConicSGC);
    if (this._doDualCurve) this._worldSGC.addChildren(this._conic.getDualCurveSGC());
    
    return this._worldSGC;
  }

  _animatedParameter = null;
  

  display() {
    super.display();
    this.getViewer().getSceneRoot().getAppearance().setAttribute(CommonAttributes.BACKGROUND_COLOR, Color.BLACK);
   
    const cam = CameraUtility.getCamera(this.getViewer());
    cam.setFocus(4.5);
    cam.setFieldOfView(35);
    const vc = this.getViewer().getViewingComponent();
    
    this._animatedParameter = new KeyFrameAnimatedDouble(0);
    this._animatedParameter.setInterpolationType(InterpolationTypes.CUBIC_HERMITE);
    this._animatedParameter.setBoundaryMode(BoundaryModes.CLAMP);
    this._animatedParameter.setGivesWay(true);
    this._animatedParameter.setWritable(true);
    this._animatedParameter.setCurrentValue(0);
    this._animatedParameter.addKeyFrame(new TimeDescriptor(0));
    this._animatedParameter.setCurrentValue(.416);
    this._animatedParameter.addKeyFrame(new TimeDescriptor(.416));
    this._animatedParameter.setCurrentValue(.584);
    this._animatedParameter.addKeyFrame(new TimeDescriptor(.584));
    this._animatedParameter.setCurrentValue(1);
    this._animatedParameter.addKeyFrame(new TimeDescriptor(1)); 
    // this._animationPlugin.getAnimated().add(this._animatedParameter);
    // this.animationPlugin.setAnimateSceneGraph(false);
    // this.animationPlugin.setAnimateCamera(false);
    

    if (vc) {
      this._resizeObserver = new ResizeObserver(() => {
        logger.fine(-1, 'size changed');
        logger.fine(-1, 'width = ', vc.clientWidth, 'height = ', vc.clientHeight);
        logger.fine(-1, 'viewport = ', CameraUtility.getViewport(cam, vc.clientWidth / vc.clientHeight));
        this._conic.setViewport(CameraUtility.getViewport(cam, vc.clientWidth / vc.clientHeight));
        this.getViewer().renderAsync();
      });
      this._resizeObserver.observe(vc);
    }
    // viewport can also change with changes to camera
    cam.addCameraListener((event) => {
      logger.fine(-1, 'camera changed', event);
      this._conic.setViewport(CameraUtility.getViewport(cam, vc.clientWidth / vc.clientHeight));
      this.getViewer().renderAsync();
    });
   
  }

  setValueAtTime(time) {
    super.setValueAtTime(time);
    // Ensure this keyframed parameter is evaluated before we read it.
    // The animation plugin iterates a shared Set of Animated objects, and
    // this app instance can be visited before the parameter object.
    this._animatedParameter?.setValueAtTime(time);
    const fromAnimatedParameter = this._animatedParameter.getCurrentValue();
    // console.log('fromAnimatedParameter = ', fromAnimatedParameter);

    // const val = AnimationUtility.hermiteInterpolation(time, 0.0, 1.0, .5, .475);
    const val = fromAnimatedParameter;
    // this._T0ConicSGC.setVisible(time < .411 || time > 0.42);
    // logger.info(-1, 'time', time, 'val', val);
    for (let i = 0; i < this._numDoubleLines; i++) {
          this._aijsRaw[i] = val;
   }
    // }
   this.updateAijs();
    this.updateDoubleContactPencils();
    this.getViewer().renderAsync();
  }

  initPenroseCorners() {
    this._penroseCorners = [
      this._conicSGC,
      this._TiCollectorSGCs[0],
      this._TiCollectorSGCs[1],
      this._TiCollectorSGCs[2],
      this._SjSGCs[0],
      this._SjSGCs[1],
      this._SjSGCs[2],
      this._T0ConicSGC
    ];
  }


  updateAijs() {
    this._aijs = this._aijsRaw.map(val => this.#convert01ToR(val));
  } 

  updateConic() {
    
    let fivePoints = this.initFivePoints();
    logger.fine(-1, 'fivePoints = ', fivePoints.length);
    this._fivePointPSF.setVertexCoordinates(fivePoints);
    this._fivePointPSF.update();
    
    this._conic.setFromFivePoints(fivePoints);
    this._conicSGC.setGeometry(this._conic.getIndexedLineSet());

    this._centerSGC.setVisible(this._showCenterPoint && this._conic.rank === 3);
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
    this.updateT0Conic();
   }

   #p1parm(t) {
      const   x = 2 * (t - 0.5),
      y = 2 * ((t <= .5) ? t : 1.0 - t);
    // t = Math.PI*(1-t);
    // const [x,y] = [Math.cos(t), Math.sin(t)];
    return [x,y];
   }
  
   #ip1parm(t) {
    if (t === Infinity) return 1;
    if (t === -Infinity) return 0;  
    const sgn = Math.sign(t);
    const x = .5 + .5*(sgn*(t/(sgn+t)));
    return x;  
   }

   #dehom([x,y]) {
    return ( y === 0) ? x*1e10 : x/y;
   }

   #convert01ToR(val) {
    return this.#dehom(this.#p1parm(val));
   }

  updateDoubleContactTiPencil(which = 0) {
    let [x,y] = this.#p1parm(this._dcParam[which]);
    this._dis[which] = [x,y];  // the "di" parameter in Morten's determinant formulas
    // the formula is Ti = di*S0 - pi*pi, or homogenized  dix*S0 - diy*pi*pi
    const pencilArray = Rn.linearCombination(null, x,this._conic.coefficients, -y, this._S0TiDblLnArrays[which]);
    logger.fine(-1, 'Ti which = ', which, 'time = ', x,  's = ', y, 'pencilArray = ', pencilArray);
    logger.fine(-1, 'conic coefficients = ', this._conic.coefficients);
    logger.fine(-1, 'dblLineArrays = ', this._S0TiDblLnArrays[which]);
    this._TiConics[which].setFromCoefficients(pencilArray);
    this._TiSGCs[which].setGeometry(this._TiConics[which].getIndexedLineSet());
  }

  updateDoubleContactSjPencil(which = 0) {
   
    const [i,j,k] = [which, (which + 1) % this._numDoubleLines, (which + 2) % this._numDoubleLines];
    const ajk = this._aijs[i];
    const dbgp = this._aijs[j]
    let [djx, djy] = this._dis[j];
    let [dkx, dky] = this._dis[k];
    const S0 = this._conic.coefficients;
    const pj = this._S0TiDblLnArrays[j];
    const pk = this._S0TiDblLnArrays[k];
    const pjk = this._pipjs[which];
    const l2j = this._S0TiDblLnEqArrays[j];
    const l2k = this._S0TiDblLnEqArrays[k];
   
    // the formula is Sj = (djdk- ajk*ajk)S0 - dk*pj*pj + 2*aij*pj*pk - dj*pk*pk
    // when we dehomogenize by multiplying through by djy*dky we get
    const acc = new Array(6).fill(0); 
    let k1 = djx * dkx - djy * dky * ajk * ajk;
    for (let m = 0; m < 6; m++) {
      acc[m] = k1 * S0[m] - dkx*djy*pj[m] + 2*ajk*djy*dky*pjk[m] - djx*dky*pk[m];
      acc[m] = acc[m] / (djy*dky);
     }
     if (which == 0) {
      logger.fine(-1, "calculating S3");
      logger.fine(-1, "djx", djx, "djy", djy, "\n\tdkx", dkx, "dky", dky);
      logger.fine(-1, "ajk", ajk, "dbgp", dbgp);
      logger.fine(-1, "l2j", Rn.toString(l2j), "l2k", Rn.toString(l2k));
      logger.fine(-1, "pj ", Rn.matrixToString(ConicUtils.convertArrayToQ(...pj)));
      logger.fine(-1, "pk ", Rn.matrixToString(ConicUtils.convertArrayToQ(...pk)));
      logger.fine(-1, "pjk ", Rn.matrixToString(ConicUtils.convertArrayToQ(...pjk)));
      logger.fine(-1, "S3 ", Rn.matrixToString(ConicUtils.convertArrayToQ(...acc)));
    }
    this._SjConics[which].setFromCoefficients(acc);
    this._SjSGCs[which].setGeometry(this._SjConics[which].getIndexedLineSet());
    const sjQ = this._SjConics[which].Q;
    const intersections = ConicUtils.intersectLineWithConic(l2j, this._SjConics[which]);
      logger.fine(-1, "contact points = ", intersections);
      const evls = intersections.map(pt => Rn.innerProduct(pt,  l2j));
    logger.fine(-1, "incidence with polar line = ", evls);
    logger.fine(-1, "Sj conic in pencil = \n", Rn.matrixToString(sjQ));

     // calculate the double line on the edge Si-Tj
     const accjk = new Array(6).fill(0),
     acckj = new Array(6).fill(0);
     const kk = djx * dkx - djy * dky * ajk * ajk;
     for (let m = 0; m < 6; m++) {
       accjk[m] = kk * acc[m] - djx*dky*S0[m];
       acckj[m] = kk * acc[m] - dkx*djy*S0[m];
     }
     const accjk3 = new Array(3).fill(0),
     acckj3 = new Array(3).fill(0);
     for (let m = 0; m < 3; m++) {
       accjk3[m] = djy * ajk * l2j[m] - djx*l2k[m];
       acckj3[m] = dky * ajk * l2k[m] - dkx*l2j[m];
     }
     const dbljk3 = ConicUtils.convertQToArray(ConicUtils.buildQFromFactors(accjk3, accjk3));
     const dblkj3 = ConicUtils.convertQToArray(ConicUtils.buildQFromFactors(acckj3, acckj3));
     this._SjTkDblLnConics[2*which].setFromCoefficients(dbljk3);
     this._SjTkDblLnConics[2*which+1].setFromCoefficients(dblkj3);
     this._SjTkDblLnSGCs[2*which].setGeometry(this._SjTkDblLnConics[2*which].getIndexedLineSet());
     this._SjTkDblLnSGCs[2*which+1].setGeometry(this._SjTkDblLnConics[2*which+1].getIndexedLineSet());
  }

  updateT0Conic() {
    const [d1,d2,d3] = this._dis.map(x => this.#dehom(x));
    const [a1,a2,a3] = this._aijs;
    const [p1,p2,p3] = this._S0TiDblLnArrays;
    const [u1,u2,u3] = this._pipjs;
    const S0 = this._conic.coefficients;
    const acc = new Array(6).fill(0);
    const k0 = d1*d2*d3 - d1*a1*a1 - d2*a2*a2 - d3*a3*a3 + 2*a1*a2*a3,
    k1 = a1*a1 - d2*d3,
    k2 = a2*a2 - d1*d3,
    k3 = a3*a3 - d1*d2,
    k12 = 2*(a3*d3-a1*a2), 
    k13 = 2*(a2*d2-a1*a3),
    k23 = 2*(a1*d1-a2*a3);
    // console.log("d1 = ", d1, "d2 = ", d2, "d3 = ", d3);
    // console.log("a1 = ", a1, "a2 = ", a3, "a3 = ", a3);
    // console.log('k0 = ', k0, 'k1 = ', k1, 'k2 = ', k2, 'k3 = ', k3, 'k12 = ', k12, 'k13 = ', k13, 'k23 = ', k23);
    // console.log('p1 = ', Rn.matrixToString(ConicUtils.convertArrayToQ(...p1)), 'p2 = ', Rn.matrixToString(ConicUtils.convertArrayToQ(...p2)), 'p3 = ', Rn.matrixToString(ConicUtils.convertArrayToQ(...p3)));
    // console.log('u1 = ', Rn.matrixToString(ConicUtils.convertArrayToQ(...u1)), 'u2 = ', Rn.matrixToString(ConicUtils.convertArrayToQ(...u2)), 'u3 = ', Rn.matrixToString(ConicUtils.convertArrayToQ(...u3)));
    for (let i = 0; i<6; ++i) {
      acc[i] = k0 * S0[i] + k1 * p1[i] + k2 * p2[i] + k3 * p3[i] + k23 * u1[i] + k13 * u2[i] + k12 * u3[i];
    }
    this._T0Conic.setFromCoefficients(acc); 
    // console.log('T0 conic = ', Rn.matrixToString(this._T0Conic.Q));
    this._T0ConicSGC.setGeometry(this._T0Conic.getIndexedLineSet());
   }
  updatePipjs() {
    for (let i = 0; i < this._numDoubleLines; i++) {
      this.updatePipj(i);
    }
  }
  updatePipj(which) {
    const [i, j, k] = [which, (which + 1) % this._numDoubleLines, (which + 2) % this._numDoubleLines];
    const l2j = this._S0TiDblLnEqArrays[j];
    const l2k = this._S0TiDblLnEqArrays[k];
    const pjkq = ConicUtils.buildQFromFactors(l2j, l2k);
    this._pipjs[i] = ConicUtils.convertQToArray(pjkq);
  }

  initPointPairs() {
    const r = this._rParam, d = .8
    // const initPairs = [ [[d,r,0,1], [-d,-r,0,1]], [[-d,d,0,1],[d,-d,0,1]], [[d,d,0,1],[-d,-d,0,1]]];
    // const m = MatrixBuilder.euclidean().translate(r,0,0).getArray();
    // this._pointPairs = initPairs.map(pair => Rn.matrixTimesVector(null, m, pair));
    // // return this._pointPairs;

    const initPair = [[this._rParam, d, 0, 1], [this._rParam, -d, 0, 1]];
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
  }

  updatePointPairs()  {
    for (let i = 0; i < this._numDoubleLines; i++) {
      this._S0TiDblLnPRFs[i].setElement0(this._pointPairs[i][0]);
      this._S0TiDblLnPRFs[i].setElement1(this._pointPairs[i][1]);
      this._S0TiDblLnPRFs[i].update();
      this._S0TiPtPairPSFs[i].setVertexCoordinates(this._pointPairs[i]);
      this._S0TiPtPairPSFs[i].update();
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

    const conicColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.0));
    const doubleLineColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.5));
    const twoPointColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.50));

  
    this._TiConics[which] = new ConicSection(null, false);
    this._TiConics[which].name = 'pencil conic '+which;
    this._TiSGCs[which] = SceneGraphUtility.createFullSceneGraphComponent('dblCntPncl '+which);
    let ap = this._TiSGCs[which].getAppearance();
    
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, conicColor);
    this._TiCollectorSGCs[which] = SceneGraphUtility.createFullSceneGraphComponent('child '+which);
    const ppr4 = this._pointPairs[which];
    this._S0TiDblLnSGCs[which] = SceneGraphUtility.createFullSceneGraphComponent('p'+which);
    ap = this._S0TiDblLnSGCs[which].getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, doubleLineColor);
    this._S0TiPtPairSGCs[which] = SceneGraphUtility.createFullSceneGraphComponent('twoPoints '+which); 
    ap = this._S0TiPtPairSGCs[which].getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.02);
    ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, twoPointColor);
    ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, true);
    
    this._TiCollectorSGCs[which].addChildren(this._TiSGCs[which], this._S0TiDblLnSGCs[which], this._S0TiPtPairSGCs[which]); 
   
    this._S0TiPtPairPSFs[which] = new PointSetFactory();
    this._S0TiPtPairPSFs[which].setVertexCount(2);
    this._S0TiPtPairPSFs[which].setVertexCoordinates(ppr4);
    this._S0TiPtPairPSFs[which].update();
    this._S0TiPtPairSGCs[which].setGeometry(this._S0TiPtPairPSFs[which].getPointSet());
    const [l2d, coeffs] = this.#getLineFromTwoPoints(ppr4);
    this._S0TiDblLnArrays[which] = coeffs;
    this._S0TiDblLnEqArrays[which] = l2d;
    this._S0TiPtPairSGCs[which].addTool(new DragPointTool());
    
    this._S0TiDblLnPRFs[which] = new PointRangeFactory();
    this._S0TiDblLnPRFs[which].setElement0(ppr4[0]);
    this._S0TiDblLnPRFs[which].setElement1(ppr4[1]);
    this._S0TiDblLnPRFs[which].setFiniteSphere(false);
    this._S0TiDblLnPRFs[which].setNumberOfSamples(24);
    this._S0TiDblLnPRFs[which].update();
    this._S0TiDblLnSGCs[which].setGeometry(this._S0TiDblLnPRFs[which].getLine());

    this._S0TiPtPairPSFs[which].getPointSet().addGeometryListener((event) => {
        let vertices = event.source.getVertexAttribute(GeometryAttribute.COORDINATES);
        let twoPoints = DataUtility.fromDataList(vertices);
        if (twoPoints == null || twoPoints.length !== 2) { return; }

        this._S0TiDblLnPRFs[which].setElement0(twoPoints[0]);
        this._S0TiDblLnPRFs[which].setElement1(twoPoints[1]);
        this._S0TiDblLnPRFs[which].update();
        const [l2d, coeffs] = this.#getLineFromTwoPoints(twoPoints);
        this._S0TiDblLnArrays[which] = coeffs;
        this._S0TiDblLnEqArrays[which] = l2d;
        this.updatePipjs();
        this.updateDoubleContactPencils();
        this.getViewer().renderAsync();
    });
  }

  initSceneGraphForSjPencils(w = 0) {
    const which = w;
    const lcolor = this._SjColors[which]; 
    const fcolor = lcolor.toFloatArray();

    const conicColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.5));
    const doubleLineColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.25));
    const twoPointColor = Color.fromFloatArray(this.#saturateColor(fcolor, 0.0));
    
    this._SjConics[which] = new ConicSection(null, false);
    this._SjConics[which].name = 'S'+which;
    this._SjSGCs[which] = SceneGraphUtility.createFullSceneGraphComponent('Sj conic '+which);
    let ap = this._SjSGCs[which].getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, conicColor);
    this._SjSGCs[which].setGeometry(this._SjConics[which].getIndexedLineSet());
  }

  initSceneGraphForSjTkDblLnConics(w = 0) {
    const which = w;
    const [i,j,k] = [which, (which + 1) % this._numDoubleLines, (which + 2) % this._numDoubleLines];
    const [li,lj,lk] = [i+1,j+1,k+1];
    
    const lcolorj = this._colors[j];
    const lcolork = this._colors[k];

    const fcolorj = lcolorj.toFloatArray();
    const fcolork = lcolork.toFloatArray();

    const doubleLineColorj = Color.fromFloatArray(this.#saturateColor(fcolorj, 0.5));
    const doubleLineColork = Color.fromFloatArray(this.#saturateColor(fcolork, 0.5));
    

    this._SjTkDblLnConics[2*which] = new ConicSection(null, false);
    this._SjTkDblLnConics[2*which].name = 'Sj-Tk DL '+li+'-'+lj;
    this._SjTkDblLnSGCs[2*which] = SceneGraphUtility.createFullSceneGraphComponent('Sj-Tk DL '+li+'-'+lj);
    let ap = this._SjTkDblLnSGCs[2*which].getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, doubleLineColorj);
    this._SjTkDblLnSGCs[2*which].setGeometry(this._SjTkDblLnConics[2*which].getIndexedLineSet());
    this._SjTkDblLnConics[2*which+1] = new ConicSection(null, false);
    this._SjTkDblLnConics[2*which+1].name = 'Tk-Sj DL '+lk+'-'+li;
    this._SjTkDblLnSGCs[2*which+1] = SceneGraphUtility.createFullSceneGraphComponent('Sk-Tj DL '+lk+'-'+li);
    ap = this._SjTkDblLnSGCs[2*which+1].getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, doubleLineColork);
    this._SjTkDblLnSGCs[2*which+1].setGeometry(this._SjTkDblLnConics[2*which+1].getIndexedLineSet());
    this._SjTkDblLnSGCs[2*which].setVisible(this._showTiSjCC);
    this._SjTkDblLnSGCs[2*which+1].setVisible(this._showTiSjCC);
  }


  #getLineFromTwoPoints(twoPoints) {
    const twoPoints3 = twoPoints.map(p => Rn.convert4To3(null,p));
    const l2d = Pn.normalize(null, P2.lineFromPoints(...twoPoints3), Pn.ELLIPTIC);
    const newQ = ConicUtils.buildQFromFactors(l2d, l2d);
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
                this._whichMode = 0; this.updateConic();
                this.getViewer().renderAsync();}
            },
            {
              type: DescriptorType.BUTTON,
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
          containerLabel: 'Visibility',
          direction: 'column',
          items: [
            {
              type: DescriptorType.CONTAINER,
              label: '',
              direction: 'row',
              items: [
                {
                  type: DescriptorType.TOGGLE,
                  label: '',
                  getValue: () => this._penroseCorners[0].isVisible(),
                  setValue: (val) => {
                     const sgc = this._penroseCorners[0];
                    sgc.setVisible(val);
                    this.getViewer().renderAsync();
                  }
                },
                {
                  type: DescriptorType.TOGGLE,
                  label: '',
                  getValue: () => this._penroseCorners[1].isVisible(),
                  setValue: (val) => {
                    const sgc = this._penroseCorners[1];
                    sgc.setVisible(val);
                    this.getViewer().renderAsync();
                  }
                },
                {
                  type: DescriptorType.TOGGLE,
                  label: '',
                  getValue: () => this._penroseCorners[2].isVisible(),
                  setValue: (val) => {
                    const sgc = this._penroseCorners[2];
                    sgc.setVisible(val);
                    this.getViewer().renderAsync();
                  }
                },
                {
                  type: DescriptorType.TOGGLE,
                  label: '',
                  getValue: () => this._penroseCorners[3].isVisible(),
                  setValue: (val) => {
                    const sgc = this._penroseCorners[3];
                    sgc.setVisible(val);
                    this.getViewer().renderAsync();
                  }
                }
              ]
            },
            {
              type: DescriptorType.CONTAINER,
              label: '',
              direction: 'row',
              items: [
                {
                  type: DescriptorType.TOGGLE,
                  label: '',
                  getValue: () => this._penroseCorners[4].isVisible(),
                  setValue: (val) => {
                    const sgc = this._penroseCorners[4];
                    sgc.setVisible(val);

                    this.getViewer().renderAsync();
                  }
                },
                {
                  type: DescriptorType.TOGGLE,
                  label: '',
                  getValue: () => this._penroseCorners[5].isVisible(),
                  setValue: (val) => {
                    const sgc = this._penroseCorners[5];
                    sgc.setVisible(val);

                    this.getViewer().renderAsync();
                  }
                },
                {
                  type: DescriptorType.TOGGLE,
                  label: '',
                  getValue: () => this._penroseCorners[6].isVisible(),
                  setValue: (val) => {
                    const sgc = this._penroseCorners[6];
                    sgc.setVisible(val);

                    this.getViewer().renderAsync();
                  }
                },
                {
                  type: DescriptorType.TOGGLE,
                  label: '',
                  getValue: () => this._penroseCorners[7].isVisible(),
                  setValue: (val) => {
                    const sgc = this._penroseCorners[7];
                    sgc.setVisible(val);

                    this.getViewer().renderAsync();
                  }
                }
              ]
            }
          ]
        },
        {
          type: DescriptorType.CONTAINER,
          direction: 'column',
          containerLabel: 'Determinant parameters', 
          items: [
            {
              type: DescriptorType.TEXT_SLIDER,
              min: 0, max: 1, value: this._dcParam[0],
              scale: 'linear',
              label: 'd1',
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
              label: 'd2',
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
              label: 'd3',
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
                  min: 0, max: 1, value: this._aijsRaw[0],
                  scale: 'linear',
                  label: 'a23',
                  valueType: 'float',
                  getValue: () => this._aijsRaw[0],
                  setValue: (val) => {
                    this._aijsRaw[0] = val;
                    this._aijs[0] = this.#convert01ToR(val);
                    //console.log('a23 = ', this._aijsRaw[0], 'val = ', val);
                    this.updateDoubleContactPencils();
                    this.getViewer().renderAsync();
                  }
                },
                {
                  type: DescriptorType.TEXT_SLIDER,
                  min: 0, max: 1, value: this._aijsRaw[1],
                  scale: 'linear',
                  label: 'a13',
                  valueType: 'float',
                  getValue: () => this._aijsRaw[1],
                  setValue: (val) => {
                    this._aijsRaw[1] = val;
                    this._aijs[1] = this.#convert01ToR(val);
                    this.updateDoubleContactPencils();
                    this.getViewer().renderAsync();
                  }
                },
                {
                  type: DescriptorType.TEXT_SLIDER,
                  min: 0, max: 1, value: this._aijsRaw[2],
                  scale: 'linear',
                  label: 'a12',
                  valueType: 'float',
                  getValue: () => this._aijsRaw[2],
                  setValue: (val) => {
                    this._aijsRaw[2] = val;
                    this._aijs[2] = this.#convert01ToR(val);
                    this.updateDoubleContactPencils();
                    this.getViewer().renderAsync();
                  }
                }
              ],
            },
            {
              type: DescriptorType.CONTAINER,
              direction: 'row',
             items: [
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
                this.updatePipjs();
                this.updateDoubleContactPencils();
                this.getViewer().renderAsync();
              }
            }
            ]
        },
        {
          type: DescriptorType.CONTAINER,
          direction: 'row',
          items: [
            {
              type: DescriptorType.BUTTON,
              label: 'S0-Ti CC',
              action: () => {
                this._showS0TiCC = !this._showS0TiCC;
                this._S0TiPtPairSGCs.map(sgc => sgc.setVisible(this._showS0TiCC));
                this._S0TiDblLnSGCs.map(sgc => sgc.setVisible(this._showS0TiCC));
                this.getViewer().renderAsync();
              }
            },{
              type: DescriptorType.BUTTON,
              label: 'S0-Ti Lines',
              action: () => {
                this._showS0TiLines = !this._showS0TiLines;
                this._S0TiDblLnSGCs.map(sgc => sgc.setVisible(this._showS0TiLines));
                this.getViewer().renderAsync();
              }
            },
            {
              type: DescriptorType.BUTTON,
              label: 'Ti-Sj CC',
              action: () => {
                this._showTiSjCC = !this._showTiSjCC;
                this._SjTkDblLnSGCs.map(sgc => sgc.setVisible(this._showTiSjCC));
        
                this.getViewer().renderAsync();
              }
            }
          ]
        },
        {
          type: DescriptorType.CONTAINER,
          direction: 'column',
          containerLabel: 'Conic degeneracy tolerance',
          items: [
            {
              type: DescriptorType.TEXT_SLIDER,
              min: 1, max: 10, value: -Math.log10(ConicUtils.getDegenConicTolerance()),
              scale: 'linear',
              label: 'tolerance',
              valueType: 'integer',
              step: 1,
              getValue: () => -Math.log10(ConicUtils.getDegenConicTolerance()),
              setValue: (val) => {
                ConicUtils.setDegenConicTolerance(Math.pow(10, -val));
                // console.log("conic degeneracy tolerance set to ", Math.pow(10, -val));
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
  