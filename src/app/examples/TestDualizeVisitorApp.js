/**
* 
 * Copyright (c) 2025-2026, jsReality Contributors
 
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { GeometryUtility } from '../../core/geometry/GeometryUtility.js';
import { IndexedLineSetFactory } from '../../core/geometry/IndexedLineSetFactory.js';
import { IndexedLineSetUtility } from '../../core/geometry/IndexedLineSetUtility.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { Matrix } from '../../core/math/Matrix.js';
import * as Rn from '../../core/math/Rn.js';
import { fromDataList } from '../../core/scene/data/DataUtility.js';
import { GeometryAttribute } from '../../core/scene/GeometryAttribute.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { TranslateShapeTool } from '../../core/tools/TranslateShapeTool.js';
import { Color, WHITE } from '../../core/util/Color.js';
import { DualizeSceneGraph } from '../../core/util/DualizeSceneGraph.js';
import { Rectangle3D } from '../../core/util/Rectangle3D.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';

/**
 * Port of ProjectiveGeometry TestDualizeVisitor as a JSRApp demo.
 * Keyboard:
 * - 1: cycle which child curve is visible
 * - 2: cycle visibility mode (standard, dual, both)
 * - H: print help
 */
export class TestDualizeVisitorApp extends JSRApp {
  /** @type {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent|null} */
  _standardSGC = null;
  /** @type {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent|null} */
  _dualSGC = null;
  /** @type {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent|null} */
  _childSGC = null;
  /** @type {import('../../core/scene/SceneGraphComponent.js').SceneGraphComponent|null} */
  _world = null;
  /** @type {number} */
  _showWhich = 1;
  /** @type {number} */
  _which = 0;
  /** @type {(e: KeyboardEvent) => void | null} */
  _keyHandler = null;

  getContent() {
    this._world = SceneGraphUtility.createFullSceneGraphComponent('world');
    this._standardSGC = SceneGraphUtility.createFullSceneGraphComponent('standard');

    let ap = this._world.getAppearance();
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.SPHERES_DRAW, true);
    ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute("lineShader."+CommonAttributes.TUBE_RADIUS, 0.003);
    ap.setAttribute("pointShader."+CommonAttributes.POINT_RADIUS, 0.01);
    ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
    ap = this._standardSGC.getAppearance();
    ap.setAttribute(DualizeSceneGraph.DO_FANS, true);
    ap.setAttribute(DualizeSceneGraph.FAN_RADIUS, 0.15);

    if (false) {
      const ilsf = IndexedLineSetUtility.circleFactory(3, 0, 0, 1);
      const sq3 = Math.sqrt(3.0)/2;
      // const ilsf = new IndexedLineSetFactory();
      // ilsf.setVertexCount(3);
      // ilsf.setVertexCoordinates([[.5, sq3, 0, 1], [-.5, sq3, 0, 1], [0, -1, 0, 1]]);
      ilsf.setEdgeCount(3);
      ilsf.setEdgeIndices([[0, 1], [1, 2], [2, 0]]);
      ilsf.setVertexColors([Color.RED, Color.GREEN, Color.BLUE]);
      ilsf.setEdgeColors([Color.BLUE, Color.RED, Color.GREEN]);
      ilsf.update();
      this._standardSGC.setGeometry(ilsf.getIndexedLineSet());
  
    } else {
  
      const circle1 = IndexedLineSetUtility.circleFactory(12, 0, 0, 1);
      const verts = fromDataList(circle1.getIndexedLineSet().getVertexAttribute(GeometryAttribute.COORDINATES));
      const clrs = [
        [0, 0, 1, 1], [1, 0, 0, 1], [0, 1, 0, 1], [0, 1, 1, 1], [1, 1, 0, 1], [0, 0, 0, 1],
        [0, 0, 1, 1], [1, 0, 0, 1], [0, 1, 0, 1], [0, 1, 1, 1], [1, 1, 0, 1], [0, 0, 0, 1]
      ];

      for (let i = 0; i < 7; ++i) {
        this._childSGC = SceneGraphUtility.createFullSceneGraphComponent();
        this._standardSGC.addChild(this._childSGC);
        const circle = new IndexedLineSetFactory();
        circle.setVertexCount(verts.length);
        circle.setVertexCoordinates(verts);
        if (i === 0) {
          circle.setVertexColors(clrs);
        } else {
          const vcolors = new Array(12);
          const remainder = 12 % i;
          const edgesize = remainder === 0 ? (12 / i) : 12;
          const edgec = Math.floor(12 / edgesize);
          console.log(i, ' edgec', edgec);
          const edges = new Array(edgec);
          const ecolors = new Array(edgec);
          const skip = edgec === 1 ? i : edgec;
          for (let j = 0; j < edgec; ++j) {
            edges[j] = new Array(edgesize + 1);
            for (let k = 0; k < edgesize; ++k) {
              edges[j][k] = (j + k * skip) % 12;
              vcolors[(j + k * skip) % 12] = clrs[j];
            }
            edges[j][edgesize] = edges[j][0];
            ecolors[j] = clrs[j];
          }
          if (edgesize > 1) {
            circle.setEdgeCount(edgec);
            circle.setEdgeIndices(edges);
            circle.setEdgeColors(ecolors);
          }
          circle.setVertexColors(vcolors);
        }
        circle.update();
        circle.getIndexedLineSet().setName('Circle');
        this._childSGC.setGeometry(circle.getIndexedLineSet());
        this._childSGC.setName('standardSGC' + i);
      }
    }


    this._dualSGC = DualizeSceneGraph.dualize(this._standardSGC);
    ap =  this._dualSGC.getAppearance();
    ap.setAttribute(GeometryUtility.BOUNDING_BOX, Rectangle3D.EMPTY_BOX);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.SPHERES_DRAW, true);
    ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute("lineShader."+CommonAttributes.TUBE_RADIUS, 0.002);
    //ap.setAttribute("pointShader."+CommonAttributes.POINT_RADIUS, 0.005);
 
    this._updateVisible();

    const dummySGC = SceneGraphUtility.createFullSceneGraphComponent('dummy');
    dummySGC.getAppearance().setAttribute(CommonAttributes.EDGE_DRAW, false);
    dummySGC.getAppearance().setAttribute(CommonAttributes.VERTEX_DRAW, false);
    dummySGC.getAppearance().setAttribute(CommonAttributes.TRANSPARENCY, 1.0);
    dummySGC.getAppearance().setAttribute(CommonAttributes.TRANSPARENCY_ENABLED, true);
    dummySGC.setGeometry(Primitives.regularPolygon(20));

    // Caveat: Java TranslateShapeTool is not ported yet. Use local equivalent.
    dummySGC.addTool(new TranslateShapeTool(dummySGC));
    dummySGC.getTransformation().addTransformationListener(() => {
      const m = new Matrix(dummySGC.getTransformation().getMatrix());
      m.assignTo(this._standardSGC);
      let mat = m.getArray();
      mat = Rn.transpose(null, Rn.inverse(null, mat));
      new Matrix(mat).assignTo(this._dualSGC);
    });

    this._world.addChildren(this._standardSGC, this._dualSGC, dummySGC);
    
    return this._world;
  }

  display() {
    super.display();
    this.getViewer().getSceneRoot().getAppearance().setAttribute(CommonAttributes.BACKGROUND_COLOR, WHITE);
    const vc = this.getViewer().getViewingComponent();
    if (!vc) return;
    if (vc.tabIndex < 0) vc.tabIndex = 0;
    vc.focus?.();
    if (this._keyHandler == null) {
      this._keyHandler = (e) => {
        if (e.repeat) return;
        switch (e.code) {
          case 'KeyH':
            console.log('  1: cycle selection');
            console.log('  2: cycle dual');
            break;
          case 'Digit1':
            this._which = (this._which + 1);
            this._updateVisible();
            console.log('which', this._which);
            this.getViewer().renderAsync();
            break;
          case 'Digit2':
            this._showWhich++;
            this._updateVisible();
            this.getViewer().renderAsync();
            break;
          default:
            break;
        }
      };
      vc.addEventListener('keydown', this._keyHandler);
    }
  }

  _updateVisible() {
    if (!this._standardSGC || !this._dualSGC) return;
    this._which = this._which % (this._standardSGC.getChildComponentCount()+1);
    for (const child of this._standardSGC.getChildComponents()) child.setVisible(this._which === 7 ); 
    const dualTop = this._dualSGC.getChildComponent(0);
    if (dualTop) {
      for (const child of dualTop.getChildComponents()) child.setVisible(this._which === 7);
      const dualChild = dualTop.getChildComponent(this._which);
      if (dualChild) dualChild.setVisible(true);
    }
    this._standardSGC.getChildComponent(this._which)?.setVisible(true);
    this._showWhich = this._showWhich % 4;
    if (this._showWhich === 0) this._showWhich++;
    this._standardSGC.setVisible((this._showWhich & 1) !== 0);
    this._dualSGC.setVisible((this._showWhich & 2) !== 0);
  }

  dispose() {
    const vc = this.getViewer()?.getViewingComponent?.();
    if (vc && this._keyHandler) vc.removeEventListener('keydown', this._keyHandler);
    this._keyHandler = null;
    super.dispose();
  }
}

