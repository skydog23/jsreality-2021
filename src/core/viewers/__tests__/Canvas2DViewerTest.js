// Test and demo for Canvas2DViewer

import { Canvas2DViewer } from '../Canvas2DViewer.js';
import { SceneGraphComponent, SceneGraphPath } from '../../scene/index.js';
import { Camera } from '../../scene/Camera.js';
import { PointSet, IndexedLineSet, IndexedFaceSet } from '../../scene/index.js';
import { Transformation } from '../../scene/Transformation.js';
import { createVertexList, createPolylineList, createPolygonList } from '../../scene/data/index.js';
import { Matrix } from '../../math/Matrix.js';
import * as Rn from '../../math/Rn.js';

/**
 * Create a simple test scene with various geometric shapes
 * @returns {{sceneRoot: SceneGraphComponent, cameraPath: SceneGraphPath}}
 */
function createTestScene() {
  // Create scene root
  const sceneRoot = new SceneGraphComponent();
  sceneRoot.setName('root');

  // Create camera
  const camera = new Camera();
  camera.setName('mainCamera');
  camera.setFieldOfView(60);
  camera.setNear(0.1);
  camera.setFar(100);
  
  // Position camera back from origin
  const cameraComponent = new SceneGraphComponent();
  cameraComponent.setName('cameraNode');
  cameraComponent.addChild(camera);
  
  const cameraTransform = new Transformation();
  const cameraMatrix = new Array(16);
  Rn.setIdentityMatrix(cameraMatrix);
  // Translate camera back 10 units
  cameraMatrix[14] = -10;
  cameraTransform.setMatrix(cameraMatrix);
  cameraComponent.setTransformation(cameraTransform);
  
  sceneRoot.addChild(cameraComponent);
  
  const cameraPath = new SceneGraphPath(sceneRoot, cameraComponent, camera);

  // Create some test geometry
  createTestPoints(sceneRoot);
  createTestLines(sceneRoot);
  createTestTriangle(sceneRoot);

  return { sceneRoot, cameraPath };
}

/**
 * Create test points
 */
function createTestPoints(parent) {
  const pointsComponent = new SceneGraphComponent();
  pointsComponent.setName('testPoints');

  // Create a point set with some 3D points
  const pointSet = new PointSet(5);
  
  // Create vertex data: 5 points in 3D
  const vertices = createVertexList([
    [0, 0, 0],      // Center
    [2, 0, 0],      // Right
    [-2, 0, 0],     // Left  
    [0, 2, 0],      // Up
    [0, -2, 0]      // Down
  ]);
  
  pointSet.setVertexAttribute('coordinates', vertices);
  pointsComponent.setGeometry(pointSet);

  // Position points component
  const transform = new Transformation();
  const matrix = new Array(16);
  Rn.setIdentityMatrix(matrix);
  // Translate points to the left
  matrix[12] = -3;
  transform.setMatrix(matrix);
  pointsComponent.setTransformation(transform);

  parent.addChild(pointsComponent);
}

/**
 * Create test lines
 */
function createTestLines(parent) {
  const linesComponent = new SceneGraphComponent();
  linesComponent.setName('testLines');

  // Create vertices for a simple cross pattern
  const vertices = createVertexList([
    [-1, -1, 0],    // 0: bottom-left
    [1, 1, 0],      // 1: top-right
    [-1, 1, 0],     // 2: top-left
    [1, -1, 0]      // 3: bottom-right
  ]);

  // Create edge indices for two lines forming an X
  const edges = createPolylineList([
    [0, 1],         // Diagonal line 1
    [2, 3]          // Diagonal line 2
  ]);

  const lineSet = new IndexedLineSet(4, 2);
  lineSet.setVertexAttribute('coordinates', vertices);
  lineSet.setEdgeAttribute('indices', edges);
  linesComponent.setGeometry(lineSet);

  // Position lines component in the center
  const transform = new Transformation();
  const matrix = new Array(16);
  Rn.setIdentityMatrix(matrix);
  // No translation - stays at origin
  transform.setMatrix(matrix);
  linesComponent.setTransformation(transform);

  parent.addChild(linesComponent);
}

/**
 * Create test triangle
 */
function createTestTriangle(parent) {
  const triangleComponent = new SceneGraphComponent();
  triangleComponent.setName('testTriangle');

  // Create vertices for a triangle
  const vertices = createVertexList([
    [0, 1, 0],      // 0: top
    [-1, -1, 0],    // 1: bottom-left
    [1, -1, 0]      // 2: bottom-right
  ]);

  // Create face indices
  const faces = createPolygonList([
    [0, 1, 2]       // Triangle face
  ]);

  const faceSet = new IndexedFaceSet(3, 1);
  faceSet.setVertexAttribute('coordinates', vertices);
  faceSet.setFaceAttribute('indices', faces);
  triangleComponent.setGeometry(faceSet);

  // Position triangle to the right
  const transform = new Transformation();
  const matrix = new Array(16);
  Rn.setIdentityMatrix(matrix);
  // Translate triangle to the right
  matrix[12] = 3;
  transform.setMatrix(matrix);
  triangleComponent.setTransformation(transform);

  parent.addChild(triangleComponent);
}

/**
 * Run the Canvas2D viewer test
 */
export function runCanvas2DTest() {
  console.log('=== Canvas2D Viewer Test ===');

  // Create or find canvas element
  let canvas = document.getElementById('canvas2d-test');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'canvas2d-test';
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.border = '1px solid #ccc';
    canvas.style.display = 'block';
    canvas.style.margin = '20px auto';
    document.body.appendChild(canvas);
  }

  try {
    // Create viewer
    const viewer = new Canvas2DViewer(canvas);
    console.log('✓ Canvas2D viewer created');

    // Validate viewer implementation
    viewer.constructor.validateImplementation(viewer);
    console.log('✓ Viewer implementation validated');

    // Create test scene
    const { sceneRoot, cameraPath } = createTestScene();
    console.log('✓ Test scene created');

    // Setup viewer
    viewer.setSceneRoot(sceneRoot);
    viewer.setCameraPath(cameraPath);
    console.log('✓ Scene and camera set');

    // Configure render settings
    const settings = viewer.getRenderSettings();
    settings.pointSize = 6;
    settings.lineWidth = 2;
    settings.pointColor = '#ff0000';
    settings.lineColor = '#0000ff';
    settings.faceColor = '#00ff0080'; // Semi-transparent green
    settings.wireframe = false;
    console.log('✓ Render settings configured');

    // Initial render
    viewer.render();
    console.log('✓ Initial render complete');

    // Test component info
    console.log('Viewer has component:', viewer.hasViewingComponent());
    console.log('Component size:', viewer.getViewingComponentSize());
    console.log('Can render async:', viewer.canRenderAsync());

    // Setup interactive controls
    setupInteractiveControls(viewer, canvas);

    // Test async rendering
    setTimeout(() => {
      viewer.renderAsync();
      console.log('✓ Async render triggered');
    }, 1000);

    console.log('✓ Canvas2D viewer test complete');
    console.log('You should see:');
    console.log('  - Red points on the left');
    console.log('  - Blue X-shaped lines in the center');
    console.log('  - Green triangle on the right');

    return viewer;

  } catch (error) {
    console.error('Canvas2D viewer test failed:', error);
    throw error;
  }
}

/**
 * Setup interactive controls for the viewer
 */
function setupInteractiveControls(viewer, canvas) {
  // Add some basic interaction
  const controls = document.createElement('div');
  controls.style.textAlign = 'center';
  controls.style.margin = '10px';

  // Wireframe toggle
  const wireframeBtn = document.createElement('button');
  wireframeBtn.textContent = 'Toggle Wireframe';
  wireframeBtn.addEventListener('click', () => {
    const settings = viewer.getRenderSettings();
    settings.wireframe = !settings.wireframe;
    viewer.render();
  });

  // Show/hide faces
  const facesBtn = document.createElement('button');
  facesBtn.textContent = 'Toggle Faces';
  facesBtn.addEventListener('click', () => {
    const settings = viewer.getRenderSettings();
    settings.showFaces = !settings.showFaces;
    viewer.render();
  });

  // Show/hide points
  const pointsBtn = document.createElement('button');
  pointsBtn.textContent = 'Toggle Points';
  pointsBtn.addEventListener('click', () => {
    const settings = viewer.getRenderSettings();
    settings.showPoints = !settings.showPoints;
    viewer.render();
  });

  // Export image
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export Image';
  exportBtn.addEventListener('click', () => {
    const dataUrl = viewer.exportImage();
    const link = document.createElement('a');
    link.download = 'canvas2d-export.png';
    link.href = dataUrl;
    link.click();
  });

  controls.appendChild(wireframeBtn);
  controls.appendChild(facesBtn);
  controls.appendChild(pointsBtn);
  controls.appendChild(exportBtn);

  // Insert controls after canvas
  canvas.parentNode.insertBefore(controls, canvas.nextSibling);
}

// Auto-run test if this script is loaded directly
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runCanvas2DTest);
} else if (typeof window !== 'undefined') {
  runCanvas2DTest();
}
