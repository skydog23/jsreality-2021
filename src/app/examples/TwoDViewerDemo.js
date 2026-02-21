/**
* 
 * Copyright (c) 2025-2026, jsReality Contributors
 
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SphereUtility } from '../../core/geometry/SphereUtility.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import { Transformation } from '../../core/scene/Transformation.js';
import { IndexedLineSetFactory } from '../../core/geometry/IndexedLineSetFactory.js';
import { PointSetFactory } from '../../core/geometry/PointSetFactory.js';
import { IndexedFaceSetFactory } from '../../core/geometry/IndexedFaceSetFactory.js';   
import { Primitives } from '../../core/geometry/Primitives.js';
import { IndexedLineSetUtility } from '../../core/geometry/IndexedLineSetUtility.js';
import {SceneGraphComponent} from '../../core/scene/SceneGraphComponent.js';
import {Appearance} from '../../core/scene/Appearance.js';
/**
 * Abstract base class for jsReality applications.
 * Subclasses must implement getContent() to provide the scene graph content.
 * 
 * @abstract
 */
export class TwoDViewerDemo extends JSRApp {

  getContent() {
    const worldSGC = SceneGraphUtility.createFullSceneGraphComponent('world');
  
    const ap = worldSGC.getAppearance();
    ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute("lineShader." + CommonAttributes.TUBES_DRAW, false);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, Color.BLUE);
    ap.setAttribute("lineShader." + CommonAttributes.TUBE_RADIUS, 0.02);
    ap.setAttribute("lineShader." + CommonAttributes.LINE_WIDTH, 5);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, new Color(255, 165, 0));
    ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, false);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_SIZE, 5.0);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.04);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_SPRITE, true);
    ap.setAttribute("pointShader." + CommonAttributes.EDGE_FADE, 0.1);

   
    const mat = MatrixBuilder.euclidean().rotateZ(Math.PI/4).scale(.5,.5,1).getArray();
    worldSGC.setTransformation(new Transformation(mat));
  
    createTestGeometryFactories(worldSGC);
    addMiscGeometry(worldSGC);
    return worldSGC;
  }


  /**
   * Called after initialization and before rendering to set up application
   * specific attributes.
   */
  display() {
    super.display();

    const ap = this.getViewer().getSceneRoot().getAppearance();
    ap.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(200, 175, 150));

    this.getViewer().render();
  }

  setValueAtTime(t) {
    console.log(t);
  }

}
function createTestGeometryFactories(parent) {
    initGridFactory(parent);
    createTestPointsFactory(parent);
    createTestLinesFactory(parent);
    createTestTriangleFactory(parent);
  }
/**
 * Create grid using IndexedLineSetFactory
 */
function initGridFactory(parent) {
    const size = 10, incr = .5;
    const xmin = -size / 2, xmax = size / 2, ymin = -size / 2, ymax = size / 2;
    const num = size / incr + 1;
    const topV = Array(num).fill(0).map((_, i) => [xmin + i * incr, ymax, 0, 1]);
    const bottomV = Array(num).fill(0).map((_, i) => [xmin + i * incr, ymin, 0, 1]);
    const leftH = Array(num).fill(0).map((_, i) => [xmin, ymin + i * incr, 0, 1]);
    const rightH = Array(num).fill(0).map((_, i) => [xmax, ymin + i * incr, 0, 1]);
    const verts = [...topV, ...bottomV, ...leftH, ...rightH];
    const indup = Array(num).fill(0).map((_, i) => [i, i + num]);
    const indlr = Array(num).fill(0).map((_, i) => [2 * num + i, 2 * num + i + num]);
    const inds = [...indup, ...indlr];
    
    const factory = new IndexedLineSetFactory();
    factory.setVertexCount(verts.length);
    factory.setVertexCoordinates(verts);
    factory.setEdgeCount(inds.length);
    factory.setEdgeIndices(inds);
    factory.update();
    
    const gridIFS = factory.getIndexedLineSet();
    const gridComponent = new SceneGraphComponent();
    gridComponent.setName('grid');
    gridComponent.setGeometry(gridIFS);
    const ap = new Appearance();
    ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(50,50,50));
    ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.TUBE_RADIUS, 0.01);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    gridComponent.setAppearance(ap);
    
    parent.addChild(gridComponent);
  }
  
  /**
   * Create test points using PointSetFactory
   */
  function createTestPointsFactory(parent) {
    const pointsComponent = SceneGraphUtility.createFullSceneGraphComponent('testPoints');
  
    const factory = new PointSetFactory();
    factory.setVertexCount(5);
    
    // Create vertex data: 5 points in 3D
    const vertices = [
      [0, 0, 0,1],      // Center
      [2, 0, 0,1],      // Right
      [-2, 0, 0,1],     // Left  
      [0, 2, 0,1],      // Up
      [0, -2, 0,1]      // Down
    ];
    
    const colors = [
      Color.RED,
      Color.GREEN,
      Color.BLUE,
      Color.YELLOW,
      Color.PURPLE  // PURPLE is an alias for MAGENTA
    ];
    
    factory.setVertexCoordinates(vertices);
    factory.setVertexColors(colors);
    factory.update();
    
    const pointSet = factory.getPointSet();
    pointsComponent.setGeometry(pointSet);
  
    // Position points component
    const transform = pointsComponent.getTransformation();
    transform.setMatrix(MatrixBuilder.euclidean().translate(-2,0,0).scale(.5,.5,1).getArray());
    
    const ap = pointsComponent.getAppearance();
    ap.setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(255,255,0));
    ap.setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.POINT_RADIUS, .1);
    
    parent.addChild(pointsComponent);
  }
  
  /**
   * Create test lines using IndexedLineSetFactory
   */
  function createTestLinesFactory(parent) {
    const linesComponent = SceneGraphUtility.createFullSceneGraphComponent('testLines');
  
    // Create vertices for a simple cross pattern
    const vertices = [
      [-1, -1, 0,1],    // 0: bottom-left
      [1, 1, 0,1],      // 1: top-right
      [-1, 1, 0,1],     // 2: top-left
      [1, -1, 0,1]      // 3: bottom-right
    ];
  
    // Create edge indices for two lines forming an X
    // 
    const edges = [
      [0, 1],         // Diagonal line 1
      [2, 3],          // Diagonal line 2
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2]
    ];
  
    const ecolors = [Color.BLACK, Color.WHITE, Color.RED, Color.BLUE, Color.GREEN, Color.YELLOW];
  
    const factory = new IndexedLineSetFactory();
    factory.setVertexCount(4);
    factory.setVertexCoordinates(vertices);
    // factory.setEdgeCount(2);
    factory.setEdgeIndices(edges);
    factory.setEdgeColors(ecolors);
    factory.update();
    
    const lineSet = factory.getIndexedLineSet();
    linesComponent.setGeometry(lineSet);
  
    const ap = linesComponent.getAppearance();
    ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(255,0,255));
    ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.TUBE_RADIUS, .02);
  
    parent.addChild(linesComponent);
  }
  
  /**
   * Create test triangle using IndexedFaceSetFactory
   */
  function createTestTriangleFactory(parent) {
    const triangleComponent = SceneGraphUtility.createFullSceneGraphComponent('testTriangle');
  
    // Create vertices for a triangle
    const vertices = [
      [0, 1, 0,1],      // 0: top
      [-1, -1, 0,1],    // 1: bottom-left
      [1, -1, 0,1],     // 2: bottom-right
      [0, -2, 0,1]      // 3: bottom
    ];
  
    // Create face indices
    const faces = [
      [0, 1, 2],        // Triangle face
      [3, 2, 1]         // Triangle face
    ];
    
    // Create edge indices
    const edges = [
      [0, 1, 2,0],
      [3, 1, 2,3]
    ];
    
    
    const fcolors = [Color.RED, Color.BLUE];
  
    const factory = new IndexedFaceSetFactory();
    factory.setVertexCount(4);
    factory.setVertexCoordinates(vertices);
    factory.setFaceCount(2);
    factory.setFaceIndices(faces);
    // factory.setEdgeCount(2);
    factory.setEdgeIndices(edges);
    factory.setFaceColors(fcolors);
    factory.update();
    
    const faceSet = factory.getIndexedFaceSet();
    triangleComponent.setGeometry(faceSet);
    
    const ap = triangleComponent.getAppearance();
    ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(0, 0, 120));
    ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.TUBE_RADIUS, .02);
  
    // Position triangle to the right
    const transform = triangleComponent.getTransformation();
    const matrix = MatrixBuilder.euclidean().translate(2,0,0).getArray();
    transform.setMatrix(matrix);
  
    parent.addChild(triangleComponent);
  }
  
  const geomList = new Array(3);
  geomList[0] = IndexedLineSetUtility.circle(100, 0, 0, 1);
  geomList[1] = Primitives.regularPolygon(13, .5);
  // geomList[2] = Primitives.getSharedIcosahedron();
  geomList[2] = SphereUtility.tessellatedIcosahedronSphere(2)
  
  function addMiscGeometry(parent) {
    // const geomList = [Primitives.tetrahedron(), 
    //   Primitives.icosahedron(), 
    //   Primitives.octahedron()];
    //   let i = 0;
      const components = [];
    let i = 0
    geomList.forEach(geom => {
      const miscComponent = SceneGraphUtility.createFullSceneGraphComponent('misc');
      miscComponent.setGeometry(geom);
      const ap = miscComponent.getAppearance();
      const matrix = MatrixBuilder.euclidean().translate(i*2-2,2,0).getArray();
      miscComponent.getTransformation().setMatrix(matrix);
      if (i==2) {
        const ap = miscComponent.getAppearance();
        ap.setAttribute(CommonAttributes.FACE_DRAW, false);
        // const matrix = MatrixBuilder.euclidean().translate(0,0,0).scale(3).getArray();
        // miscComponent.getTransformation().setMatrix(matrix);
    
         ap.setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.POINT_RADIUS, .003);
        ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.TUBE_RADIUS, .0125);
      }
      parent.addChild(miscComponent);
      components.push(miscComponent);
      i++;
    });
    
    // Add a test case for implode shader (on the regular polygon)
    if (components.length > 1) {
      const implodeComponent = components[1]; // Use the regular polygon (index 1)
      const ap = implodeComponent.getAppearance();
      // Set implode shader
      ap.setAttribute(CommonAttributes.POLYGON_SHADER, 'implode');
      ap.setAttribute(CommonAttributes.POLYGON_SHADER + '.' + 'implodeFactor', 0.6);
      ap.setAttribute(CommonAttributes.POLYGON_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(255, 200, 0)); // Orange
      // Position it separately
      const matrix = MatrixBuilder.euclidean().translate(0, -2, 0).getArray();
      implodeComponent.getTransformation().setMatrix(matrix);
    }
    
    return components;
  }