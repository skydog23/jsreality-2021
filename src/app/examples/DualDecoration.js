import { AnimationUtility } from '../../anim/util/AnimationUtility.js';
import { GeometryUtility } from '../../core/geometry/GeometryUtility.js';
import { IndexedLineSetFactory } from '../../core/geometry/IndexedLineSetFactory.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import { Appearance } from '../../core/scene/Appearance.js';
import { fromDataList } from '../../core/scene/data/DataUtility.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { DragPointTool } from '../../core/tools/DragPointTool.js';
import { DualizeSceneGraph } from '../../core/util/DualizeSceneGraph.js';
import { Rectangle3D } from '../../core/util/Rectangle3D.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';
import { Color } from '../../core/util/Color.js';
export class DualDecoration extends JSRApp {

  _worldSGC;
  _dualSGC;
  _standardSGC;
  _triSGC;
  _tri = null;
  _patternCollectorSGC = null;
  _patternSGC = new Array(3).fill(null);
  _numSteps = 6;
  _ilsfs = new Array(3).fill(null);
  _ap = new Appearance();

  getContent() {
    this._worldSGC = SceneGraphUtility.createFullSceneGraphComponent("world");
    this._standardSGC = SceneGraphUtility.createFullSceneGraphComponent("standard");
    this._dualSGC = SceneGraphUtility.createFullSceneGraphComponent("dual");
    this._triSGC = SceneGraphUtility.createFullSceneGraphComponent("tri");
    this._tri = Primitives.regularPolygon(3, 0);
    this._triSGC.setGeometry(this._tri);
    this._patternCollectorSGC = SceneGraphUtility.createFullSceneGraphComponent("patternCollector");
    this._standardSGC.addChildren(this._triSGC, this._patternCollectorSGC);

    this._ap = this._worldSGC.getAppearance();
    this._ap.setAttribute(CommonAttributes.FLIP_NORMALS_ENABLED, true);
    
    for (let i = 0; i < 3; ++i) {
      this._patternSGC[i] = SceneGraphUtility.createFullSceneGraphComponent("patternSGC" + i);
      this._patternCollectorSGC.addChild(this._patternSGC[i]);
      this._ilsfs[i] = new IndexedLineSetFactory();
    }

    this._triSGC.addTool(new DragPointTool());
    this.update();

    let ap = this._worldSGC.getAppearance();
    ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
    ap.setAttribute(CommonAttributes.FACE_DRAW, false);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute(CommonAttributes.TUBE_RADIUS, .004);
    ap = this._standardSGC.getAppearance();
    ap.setAttribute("pointShader.diffuseColor", new Color(255,0,0));
    ap.setAttribute("lineShader.diffuseColor", new Color(0,0,255));
    
    ap =  this._dualSGC.getAppearance();
    ap.setAttribute(GeometryUtility.BOUNDING_BOX, Rectangle3D.EMPTY_BOX);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.SPHERES_DRAW, true);
    ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
  

    this._worldSGC.addChildren(this._standardSGC, this._dualSGC);
    return this._worldSGC;
  }

  update() {
    const verts = fromDataList(this._triSGC.getGeometry().getVertexCoordinates());
    for (let i = 0; i < 3; ++i) {
      this._ilsfs[i].setVertexCount((this._numSteps)*2);
      this._ilsfs[i].setEdgeCount(this._numSteps);
      this._ilsfs[i].setEdgeIndices(new Array(this._numSteps).fill(null).map((_,i) => [i, i+this._numSteps]));
      // this._patternSGC[i].setGeometry(this
      const j = (i+1)%3;
      const m = (i+2)%3;
      const p0 = verts[i];
      const p1 = verts[j];
      const p2 = verts[m];
      const pts4 = new Array(this._numSteps*2).fill([0,0,0,1]);
      for (let k = 0; k < this._numSteps; ++k) {
        const t = k/(this._numSteps-1);
        pts4[k] = AnimationUtility.linearInterpolationArray(t, 0, 1, p0, p1);
        pts4[this._numSteps+k] = AnimationUtility.linearInterpolationArray(t, 0, 1, p1, p2);
        
      }
      this._ilsfs[i].setVertexCoordinates(pts4);
      this._ilsfs[i].update();
      this._patternSGC[i].setGeometry(this._ilsfs[i].getIndexedLineSet());
    }
    this._dualSGC.removeAllChildren();
    this._dualSGC.addChild(DualizeSceneGraph.dualize(this._standardSGC));
  }

  getInspectorDescriptors() {
    return [
      {
        type: DescriptorType.INT,
        label: 'Number of Steps',
        getValue: () => this._numSteps,
        setValue: (v) => {
          this._numSteps = v;
          this.update();
        },
        min: 1,
        max: 20,
        step: 1,
      },
    ];
  }
}
