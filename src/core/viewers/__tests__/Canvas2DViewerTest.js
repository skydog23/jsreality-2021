// Test and demo for Canvas2DViewer

import * as Rn from '../../math/Rn.js';
import { Camera } from '../../scene/Camera.js';
import { toDataList } from '../../scene/data/DataUtility.js';
import { IndexedFaceSet, IndexedLineSet, PointSet, SceneGraphComponent, SceneGraphPath } from '../../scene/index.js';
import { Transformation } from '../../scene/Transformation.js';
import * as CommonAttributes from '../../shader/CommonAttributes.js';
import { Color } from '../../util/Color.js';
import { SceneGraphUtility } from '../../util/SceneGraphUtility.js';
import { Canvas2DViewer } from '../Canvas2DViewer.js';
import { MatrixBuilder } from '../../math/MatrixBuilder.js';
import { Appearance } from '../../scene/Appearance.js';

/**
 * Create a simple test scene with various geometric shapes
 * @returns {{sceneRoot: SceneGraphComponent, cameraPath: SceneGraphPath}}
 */
function createTestScene() {
  // Create scene root 
  const sceneRoot = SceneGraphUtility.createFullSceneGraphComponent("root");
  // Create and configure appearance with namespaced attributes
  const rootAppearance = new Appearance('rootAppearance');
  
  // Background color
  rootAppearance.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(100,255,100));
  
  // Point rendering attributes
  rootAppearance.setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(255, 0, 0)); // Red points
  rootAppearance.setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.POINT_SIZE, .1);
  rootAppearance.setAttribute(CommonAttributes.VERTEX_DRAW, true);
  
  // Line rendering attributes  
  rootAppearance.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(0, 0, 255)); // Black lines
  rootAppearance.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.LINE_WIDTH, .01);
  rootAppearance.setAttribute(CommonAttributes.EDGE_DRAW, true);
  
  // Polygon/face rendering attributes
  rootAppearance.setAttribute(CommonAttributes.POLYGON_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(0, 255, 0, 220)); // Light gray faces
  rootAppearance.setAttribute(CommonAttributes.FACE_DRAW, true);
  
  // General rendering settings
  rootAppearance.setAttribute(CommonAttributes.LIGHTING_ENABLED, false); // Disable lighting for 2D
  
  sceneRoot.setAppearance(rootAppearance);

  // Create camera
  const camera = new Camera();
  camera.setName('mainCamera');
  camera.setFieldOfView(60);
  camera.setNear(-5);
  camera.setFar(5);
  camera.setPerspective(false);
  
  // Position camera back from origin
  const cameraComponent = new SceneGraphComponent();
  cameraComponent.setName('cameraNode');
  cameraComponent.addChild(camera);
  
  const cameraTransform = new Transformation();
  const cameraMatrix = MatrixBuilder.euclidean().translate(0,0,-1).getArray();
  cameraTransform.setMatrix(cameraMatrix);
  cameraComponent.setTransformation(cameraTransform);
  
  sceneRoot.addChild(cameraComponent);
  
  const cameraPath = new SceneGraphPath(sceneRoot, cameraComponent, camera);

  const worldSGC = SceneGraphUtility.createFullSceneGraphComponent('world');
  sceneRoot.addChild(worldSGC);

  initGrid(worldSGC);

  const mat = MatrixBuilder.euclidean().scale(.5,.5,1).getArray();
  worldSGC.setTransformation(new Transformation(mat));

  // Create some test geometry
  createTestPoints(worldSGC);
  createTestLines(worldSGC);
  createTestTriangle(worldSGC);

  return { sceneRoot, cameraPath };
}


function initGrid(parent) {
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
  const gridIFS = new IndexedLineSet(verts.length, inds.length);
  // verts is a 2D array, so toDataList will auto-detect fiber length
  gridIFS.setVertexAttribute('coordinates', toDataList(verts));
  gridIFS.setEdgeAttribute('indices', toDataList(inds, null, 'int32'));
  const gridComponent = new SceneGraphComponent();
  gridComponent.setName('grid');
  gridComponent.setGeometry(gridIFS);
  const ap = new Appearance();
  ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(50,50,50));
  ap.setAttribute(CommonAttributes.LINE_WIDTH, 0.01);
  ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
  gridComponent.setAppearance(ap);
  
  parent.addChild(gridComponent);
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
  const vertices = [
    [0, 0, 0,1],      // Center
    [2, 0, 0,1],      // Right
    [-2, 0, 0,1],     // Left  
    [0, 2, 0,1],      // Up
    [0, -2, 0,1]      // Down
  ];
  
  pointSet.setVertexCoordinates(vertices);
  pointsComponent.setGeometry(pointSet);

  // Position points component
  const transform = new Transformation();
  transform.setMatrix(MatrixBuilder.euclidean().translate(-3,0,0).getArray());
  pointsComponent.setTransformation(transform);

  const ap = new Appearance();
  ap.setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(255,255,0));
  ap.setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.POINT_SIZE, .1);
  pointsComponent.setAppearance(ap);
 
  parent.addChild(pointsComponent);
}

/**
 * Create test lines
 */
function createTestLines(parent) {
  const linesComponent = new SceneGraphComponent();
  linesComponent.setName('testLines');

  // Create vertices for a simple cross pattern
  const vertices = [
    [-1, -1, 0,1],    // 0: bottom-left
    [1, 1, 0,1],      // 1: top-right
    [-1, 1, 0,1],     // 2: top-left
    [1, -1, 0,1]      // 3: bottom-right
  ];

  // Create edge indices for two lines forming an X
  const edges = [
    [0, 1],         // Diagonal line 1
    [2, 3]          // Diagonal line 2
  ];

  const lineSet = new IndexedLineSet(4, 2);
  lineSet.setVertexCoordinates( vertices, 4);
  lineSet.setEdgeIndices(edges);
  linesComponent.setGeometry(lineSet);

  // Position lines component in the center
  const transform = new Transformation();
  linesComponent.setTransformation(transform);

  const ap = new Appearance();
  ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(255,0,255));
  ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.LINE_WIDTH, .04);
  linesComponent.setAppearance(ap);

  parent.addChild(linesComponent);
}

/**
 * Create test triangle
 */
function createTestTriangle(parent) {
  const triangleComponent = SceneGraphUtility.createFullSceneGraphComponent('testTriangle');

  // Create vertices for a triangle
  const vertices = [
    [0, 1, 0,1],      // 0: top
    [-1, -1, 0,1],    // 1: bottom-left
    [1, -1, 0,1]      // 2: bottom-right
  ];

  // Create face indices
  const faces = [
    [0, 1, 2]       // Triangle face
  ];
 // Create face indices
 const edges = [
  [0, 1, 2,0]       // Triangle face
];

  const faceSet = new IndexedFaceSet(3, 1);
  faceSet.setVertexCoordinates(vertices, 4);
  faceSet.setFaceIndices(faces);
  faceSet.setEdgeIndices(edges);
  triangleComponent.setGeometry(faceSet);
  const ap = triangleComponent.getAppearance();
  ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(0, 0, 120));
  ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.LINE_WIDTH, .02);

  // Position triangle to the right
  const transform = new Transformation();
  const matrix = MatrixBuilder.euclidean().translate(2,0,0).getArray();
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
  
  // Check if test has already been run on this canvas
  if (canvas && canvas.dataset.testRun === 'true') {
    console.log('Test already run on this canvas, skipping...');
    return;
  }
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'canvas2d-test';
    // Don't set width/height here - let CSS control the size
    // Canvas2DViewer will set the bitmap dimensions based on clientWidth/clientHeight
    canvas.style.border = '1px solid #ccc';
    canvas.style.display = 'block';
    canvas.style.margin = '20px auto';
    canvas.style.width = '100%';      // Fill available width
    canvas.style.height = '600px';    // Fixed height (can be changed via CSS)
    canvas.style.maxWidth = '100%';   // Don't exceed container
    document.body.appendChild(canvas);
  }

  try {
    const { sceneRoot, cameraPath } = createTestScene();
    console.log('✓ Test scene created');

   
    // Create viewer
    const viewer = new Canvas2DViewer(canvas);
    console.log('✓ Canvas2D viewer created');

    // Validate viewer implementation
    viewer.constructor.validateImplementation(viewer);
    console.log('✓ Viewer implementation validated');

       // Setup viewer
    viewer.setSceneRoot(sceneRoot);
    viewer.setCameraPath(cameraPath);
    console.log('✓ Scene and camera set');

    // Initial render
    viewer.render();
    console.log('✓ Initial render complete');

    // Test component info
    console.log('Viewer has component:', viewer.hasViewingComponent());
    console.log('Component size:', viewer.getViewingComponentSize());
    console.log('Can render async:', viewer.canRenderAsync());

    // Mark canvas as having been tested to prevent duplicate runs
    canvas.dataset.testRun = 'true';

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


// Auto-run test if this script is loaded directly (not as a module import)
// Check if we're being imported as a module by looking for existing canvas
if (typeof window !== 'undefined' && !document.getElementById('canvas2d-test')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runCanvas2DTest);
  } else {
    runCanvas2DTest();
  }
}
