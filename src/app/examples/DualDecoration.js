import { AnimationUtility } from '../../anim/util/AnimationUtility.js';
import { GeometryUtility } from '../../core/geometry/GeometryUtility.js';
import { GeometryUtilityOverflow } from '../../core/geometry/GeometryUtilityOverflow.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import { Matrix } from '../../core/math/Matrix.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { Appearance } from '../../core/scene/Appearance.js';
import { fromDataList } from '../../core/scene/data/DataUtility.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { DragPointTool } from '../../core/tools/DragPointTool.js';
import { Color } from '../../core/util/Color.js';
import { DualizeSceneGraph } from '../../core/util/DualizeSceneGraph.js';
import { Rectangle3D } from '../../core/util/Rectangle3D.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';
import { IndexedLineSetUtility } from '../../core/geometry/IndexedLineSetUtility.js';

export class DualDecoration extends JSRApp {

  _worldSGC;
  _dualContainerSGC;
  _dualSGC;
  _standardSGC;
  _triSGC;
  _tri = null;
  _patternCollectorSGC = null;
  _newPatternSGC = null;
  _newPatternFactory = null;
  _patternSGC = new Array(3).fill(null);
  _numSteps = 12;
  _fanRadius = .2;
  _ilsfs = new Array(3).fill(null);
  _ap = new Appearance();

  getContent() {
    this._worldSGC = SceneGraphUtility.createFullSceneGraphComponent("world");
    this._standardSGC = SceneGraphUtility.createFullSceneGraphComponent("standard");
    this._dualContainerSGC = SceneGraphUtility.createFullSceneGraphComponent("dual");
    this._triSGC = SceneGraphUtility.createFullSceneGraphComponent("tri");
    const triFactory = Primitives.regularPolygonFactory(3, 0);
    const ecolors = [new Color(255, 70, 70), new Color(255, 255,0), new Color(70, 70, 255)];
    const vcolors = [ new Color(255, 150, 75), new Color(50, 255, 50), Color.PURPLE];
    triFactory.setVertexColors([ecolors[1],ecolors[2],ecolors[0]]);
    triFactory.setEdgeCount(3);
    triFactory.setEdgeIndices([[0,1], [1,2], [2,0]]);
    triFactory.setEdgeColors(ecolors);
    triFactory.update();

    this._triSGC.setGeometry(triFactory.getIndexedFaceSet());
    this._patternCollectorSGC = SceneGraphUtility.createFullSceneGraphComponent("patternCollector");
    this._newPatternSGC = SceneGraphUtility.createFullSceneGraphComponent("newPatternSGC");
    this._standardSGC.addChildren(this._triSGC, this._newPatternSGC);

    // MatrixBuilder.euclidean().scale(.99,.99,1.0).assignTo(this._patternCollectorSGC);
    MatrixBuilder.euclidean().translate(0,0,.01).assignTo(this._triSGC);
    this._ap = this._worldSGC.getAppearance();
    this._ap.setAttribute(CommonAttributes.FLIP_NORMALS_ENABLED, true);
    
    this._newPatternFactory = IndexedLineSetUtility.refineFactory(triFactory.getIndexedFaceSet(), this._numSteps);
    this._newPatternSGC.setGeometry(this._newPatternFactory.getIndexedLineSet());
    const nv = this._newPatternFactory.getVertexCount();
    console.log("nv", nv);
    const newIndices = new Array(nv).fill(null).map(() => [0,0]);
    const newEdgeColors = new Array(nv).fill(null).map(() => Color.WHITE);
    const newVertexColors = new Array(nv).fill(null).map(() => Color.WHITE);
    const jump = nv/3;
    console.log("jump", jump, "numSteps", this._numSteps);

    for (let i = 0; i < nv; ++i) {
      newIndices[i] = [i, (i+jump)%nv];
      newEdgeColors[i] = vcolors[(Math.floor(i/jump))%3];
      newVertexColors[i] = ecolors[(Math.floor(i/jump))%3];
    }
    this._newPatternFactory.setEdgeIndices(newIndices);
    this._newPatternFactory.setEdgeColors(newEdgeColors);
    this._newPatternFactory.setVertexColors(newVertexColors);
    this._newPatternFactory.update();
    let ap = this._newPatternSGC.getAppearance();
    ap.setAttribute(CommonAttributes.TUBE_RADIUS, .004);
   
    // for (let i = 0; i < 3; ++i) {
    //   this._patternSGC[i] = SceneGraphUtility.createFullSceneGraphComponent("patternSGC" + i);
    //    const ap = this._patternSGC[i].getAppearance();
    //   ap.setAttribute();
    //   ap.setAttribute("lineShader.diffuseColor", ecolors[i]);
    //   this._patternCollectorSGC.addChild(this._patternSGC[i]);
    //   this._ilsfs[i] = new IndexedLineSetFactory();
    // }    
    ap =  this._worldSGC.getAppearance();
    ap.setAttribute(GeometryUtility.BOUNDING_BOX, Rectangle3D.EMPTY_BOX);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute(CommonAttributes.FACE_DRAW, false);
    ap.setAttribute(CommonAttributes.SPHERES_DRAW, true);
    ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
    ap.setAttribute(CommonAttributes.TUBE_RADIUS, .012);
    ap.setAttribute(CommonAttributes.POINT_RADIUS, .025);
    ap.setAttribute(DualizeSceneGraph.FAN_RADIUS, this._fanRadius);
    ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
    ap = this._standardSGC.getAppearance();
    ap.setAttribute(DualizeSceneGraph.FAN_RADIUS, .3);
   this.update();

    this._triSGC.addTool(new DragPointTool());
    this._worldSGC.addChildren(this._standardSGC, this._dualContainerSGC);
    return this._worldSGC;
  }

  display() {
    super.display();
    const rootap = this.getViewer().getSceneRoot().getAppearance();
    rootap.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(0,0,0));
  }
  update() {
    const verts = fromDataList(this._triSGC.getGeometry().getVertexCoordinates());
    // for (let i = 0; i < 3; ++i) {
    //   this._ilsfs[i].setVertexCount((this._numSteps)*2);
    //   this._ilsfs[i].setEdgeCount(this._numSteps);
    //   this._ilsfs[i].setEdgeIndices(new Array(this._numSteps).fill(null).map((_,i) => [i, i+this._numSteps]));
    //   // this._patternSGC[i].setGeometry(this
    //   const j = (i+1)%3;
    //   const m = (i+2)%3;
    //   const p0 = verts[i];
    //   const p1 = verts[j];
    //   const p2 = verts[m];
    //   const pts4 = new Array(this._numSteps*2).fill([0,0,0,1]);
    //   for (let k = 0; k < this._numSteps; ++k) {
    //     const t = k/(this._numSteps-1);
    //     pts4[k] = AnimationUtility.linearInterpolationArray(t, 0, 1, p0, p1);
    //     pts4[this._numSteps+k] = AnimationUtility.linearInterpolationArray(t, 0, 1, p1, p2);
        
    //   }
    //   this._ilsfs[i].setVertexCoordinates(pts4);
    //   this._ilsfs[i].update();
    //   this._patternSGC[i].setGeometry(this._ilsfs[i].getIndexedLineSet());
    // }
    this._dualContainerSGC.removeAllChildren();
    this._dualSGC = DualizeSceneGraph.dualize(this._standardSGC);
    this._dualContainerSGC.addChild(this._dualSGC);
    // calclate a projectivity that maps the tri to the dual
    const triVerts = fromDataList(this._triSGC.getGeometry().getVertexCoordinates());
    const triVerts3 = triVerts.map( v => [v[0], v[1], v[3]])
    triVerts3.push(Rn.average(null, triVerts3));
    const pathToTrilateral = SceneGraphUtility.getPathsToNamedNodes(this._dualSGC, "dual points")[0];
    // console.log("path to trilateral", pathToTrilateral.toString());
    const dualTrilateral = pathToTrilateral.getLastComponent().getGeometry();
    let dualVerts = fromDataList(dualTrilateral.getVertexCoordinates());
    let dualVerts3 = dualVerts.map( v => [v[0], v[1], v[3]]);
    dualVerts3 = [dualVerts3[1], dualVerts3[2], dualVerts3 [0]];
    dualVerts3.push(Rn.average(null, dualVerts3));
    // console.log("tri verts", Rn.toStringArray(triVerts3));
    // console.log("dual verts", Rn.toStringArray(dualVerts3));
    const projectivity = Pn.projectivity(null, triVerts3, dualVerts3);
    // console.log("projectivity", Rn.matrixToString(projectivity));
    let projectivity4 = GeometryUtilityOverflow.convert33To44(projectivity);
    // console.log("projectivity4", Rn.matrixToString(projectivity4 ));
   projectivity4 = Rn.transpose(null, Rn.adjugate(null, projectivity4));
    // console.log("projectivity4", Rn.matrixToString(projectivity4));
    new Matrix(projectivity4).assignTo(this._dualContainerSGC);
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
      {
        type: DescriptorType.FLOAT,
        label: 'Fan Radius',
        getValue: () => this._fanRadius,
        setValue: (v) => {
          this._fanRadius = v;
          this._standardSGC.getAppearance().setAttribute(DualizeSceneGraph.FAN_RADIUS, this._fanRadius);
          this.update();
        },
        min: 0.01,
        max: 1.0,
        step: 0.1,
      },
    ];
  }
}
