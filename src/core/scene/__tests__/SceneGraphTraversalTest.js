/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Test to demonstrate proper scene graph traversal with the visitor pattern

import { Canvas2DViewer } from '../../viewers/Canvas2DViewer.js';
import { SceneGraphComponent, SceneGraphPath, SceneGraphVisitor } from '../index.js';
import { Camera } from '../Camera.js';
import { PointSet } from '../PointSet.js';
import { Transformation } from '../Transformation.js';
import { toDataList } from '../data/DataUtility.js';
import { Matrix } from '../../math/Matrix.js';

/**
 * A simple visitor that logs the scene graph structure
 */
class LoggingVisitor extends SceneGraphVisitor {
  constructor() {
    super();
    this.indent = 0;
  }

  visitComponent(component) {
    const indentStr = '  '.repeat(this.indent);
    console.log(`${indentStr}Component: ${component.getName()}`);
    
    this.indent++;
    component.childrenAccept(this);
    this.indent--;
  }

  visitPointSet(pointSet) {
    const indentStr = '  '.repeat(this.indent);
    console.log(`${indentStr}PointSet: ${pointSet.getName()} (${pointSet.getNumPoints()} points)`);
  }

  visitCamera(camera) {
    const indentStr = '  '.repeat(this.indent);
    console.log(`${indentStr}Camera: ${camera.getName()}`);
  }

  visitTransformation(transformation) {
    const indentStr = '  '.repeat(this.indent);
    console.log(`${indentStr}Transformation: (matrix present)`);
  }
}

/**
 * Create a hierarchical test scene with multiple levels
 */
function createHierarchicalScene() {
  console.log('=== Creating Hierarchical Scene ===');

  // Root component
  const sceneRoot = new SceneGraphComponent();
  sceneRoot.setName('root');

  // Camera branch
  const cameraComponent = new SceneGraphComponent();
  cameraComponent.setName('cameraNode');
  
  const camera = new Camera();
  camera.setName('mainCamera');
  camera.setFieldOfView(60);
  camera.setNear(0.1);
  camera.setFar(100);
  
  // Position camera back
  const cameraTransform = new Transformation();
  const cameraMatrix = new Array(16);
  Rn.setIdentityMatrix(cameraMatrix);
  cameraMatrix[14] = -15; // Move back 15 units
  cameraTransform.setMatrix(cameraMatrix);
  
  cameraComponent.setTransformation(cameraTransform);
  cameraComponent.addChild(camera);
  sceneRoot.addChild(cameraComponent);

  // Geometry hierarchy: root -> group1 -> group2 -> geometry
  const group1 = new SceneGraphComponent();
  group1.setName('group1');
  
  // Transform group1
  const group1Transform = new Transformation();
  const group1Matrix = new Array(16);
  Rn.setIdentityMatrix(group1Matrix);
  group1Matrix[12] = 2; // Translate right 2 units
  group1Transform.setMatrix(group1Matrix);
  group1.setTransformation(group1Transform);
  
  sceneRoot.addChild(group1);

  const group2 = new SceneGraphComponent();
  group2.setName('group2');
  
  // Transform group2 
  const group2Transform = new Transformation();
  const group2Matrix = new Array(16);
  Rn.setIdentityMatrix(group2Matrix);
  group2Matrix[13] = 1; // Translate up 1 unit
  group2Transform.setMatrix(group2Matrix);
  group2.setTransformation(group2Transform);
  
  group1.addChild(group2);

  // Add geometry to group2
  const pointSet = new PointSet(4);
  pointSet.setName('hierarchicalPoints');
  
  // 2D array - toDataList will auto-detect fiber length
  const vertices = toDataList([
    [0, 0, 0],     // Center
    [1, 0, 0],     // Right
    [0, 1, 0],     // Up
    [-1, -1, 0]    // Bottom-left
  ]);
  
  pointSet.setVertexAttribute('coordinates', vertices);
  group2.setGeometry(pointSet);

  // Add another branch with geometry directly on group1
  const directPointSet = new PointSet(3);
  directPointSet.setName('directPoints');
  
  // 2D array - toDataList will auto-detect fiber length
  const directVertices = toDataList([
    [-2, 0, 0],    // Left
    [-2, 2, 0],    // Left-up
    [-2, -2, 0]    // Left-down
  ]);
  
  directPointSet.setVertexAttribute('coordinates', directVertices);

  const directGeomComponent = new SceneGraphComponent();
  directGeomComponent.setName('directGeometry');
  directGeomComponent.setGeometry(directPointSet);
  
  group1.addChild(directGeomComponent);

  const cameraPath = new SceneGraphPath(sceneRoot, cameraComponent, camera);

  return { sceneRoot, cameraPath };
}

/**
 * Test scene graph traversal
 */
export function testSceneGraphTraversal() {
  console.log('=== Scene Graph Traversal Test ===');

  // Create hierarchical scene
  const { sceneRoot, cameraPath } = createHierarchicalScene();

  // Test 1: Log the scene structure
  console.log('\n=== Scene Graph Structure ===');
  const logger = new LoggingVisitor();
  sceneRoot.accept(logger);

  // Test 2: Create canvas and render
  let canvas = document.getElementById('traversal-test-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'traversal-test-canvas';
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.border = '2px solid #007bff';
    canvas.style.display = 'block';
    canvas.style.margin = '20px auto';
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = 'Scene Graph Traversal Test';
    title.style.textAlign = 'center';
    document.body.appendChild(title);
    document.body.appendChild(canvas);
  }

  try {
    const viewer = new Canvas2DViewer(canvas);
    
    // Configure for better visibility
    const settings = viewer.getRenderSettings();
    settings.pointSize = 8;
    settings.pointColor = '#ff0000';
    settings.backgroundColor = '#f8f9fa';
    
    viewer.setSceneRoot(sceneRoot);
    viewer.setCameraPath(cameraPath);
    viewer.render();

    console.log('\n=== Rendering Complete ===');
    console.log('You should see:');
    console.log('  - 4 points in the center-right area (from hierarchicalPoints)');
    console.log('  - 3 points on the left side (from directPoints)');
    console.log('  - All points should be transformed according to their hierarchy');

    // Add controls
    const controls = document.createElement('div');
    controls.style.textAlign = 'center';
    controls.style.margin = '10px';
    
    const logButton = document.createElement('button');
    logButton.textContent = 'Log Scene Structure';
    logButton.addEventListener('click', () => {
      console.log('\n=== Scene Structure (re-logged) ===');
      const newLogger = new LoggingVisitor();
      sceneRoot.accept(newLogger);
    });
    
    const renderButton = document.createElement('button');
    renderButton.textContent = 'Re-render';
    renderButton.addEventListener('click', () => {
      viewer.render();
      console.log('Re-rendered scene');
    });
    
    controls.appendChild(logButton);
    controls.appendChild(renderButton);
    canvas.parentNode.insertBefore(controls, canvas.nextSibling);

    return { viewer, sceneRoot, cameraPath };

  } catch (error) {
    console.error('Scene graph traversal test failed:', error);
    throw error;
  }
}

// Auto-run test
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testSceneGraphTraversal);
  } else {
    testSceneGraphTraversal();
  }
}
