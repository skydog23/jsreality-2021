// Test and demo for Canvas2DViewer

import * as Rn from '../../math/Rn.js';
import { Camera } from '../../scene/Camera.js';
import { toDataList, fromDataList } from '../../scene/data/DataUtility.js';
import { IndexedFaceSet, IndexedLineSet, PointSet, SceneGraphComponent, SceneGraphPath } from '../../scene/index.js';
import { Transformation } from '../../scene/Transformation.js';
import * as CommonAttributes from '../../shader/CommonAttributes.js';
import { Color } from '../../util/Color.js';
import { SceneGraphUtility } from '../../util/SceneGraphUtility.js';
import { Canvas2DViewer } from '../Canvas2DViewer.js';
import { MatrixBuilder } from '../../math/MatrixBuilder.js';
import { Appearance } from '../../scene/Appearance.js';
import { GeometryAttribute } from '../../scene/GeometryAttribute.js';
import { PointSetFactory, IndexedLineSetFactory, IndexedFaceSetFactory } from '../../geometry/index.js';
import { IndexedLineSetUtility } from '../../geometry/IndexedLineSetUtility.js';
import { Primitives } from '../../geometry/Primitives.js';
import { SphereUtility } from '../../geometry/SphereUtility.js';
import { IndexedFaceSetUtility } from '../../geometry/IndexedFaceSetUtility.js';
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
  rootAppearance.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(200,200,150));
  
  // Point rendering attributes
  rootAppearance.setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(255,150, 60)); // Red points
  rootAppearance.setAttribute(CommonAttributes.POINT_SHADER + '.' + CommonAttributes.POINT_RADIUS, .05);
  rootAppearance.setAttribute(CommonAttributes.VERTEX_DRAW, true);
  
  // Line rendering attributes  
  rootAppearance.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(0, 0, 255)); // Black lines
  rootAppearance.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.TUBE_RADIUS, .01);
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

 
  const mat = MatrixBuilder.euclidean().scale(.5,.5,1).getArray();
  worldSGC.setTransformation(new Transformation(mat));

  // Create some test geometry
  // createTestGeometry(worldSGC);
  createTestGeometryFactories(worldSGC);
  const miscComponents = addMiscGeometry(worldSGC);
  return { sceneRoot, cameraPath, miscComponents };
}

function createTestGeometry(parent) {
  initGrid(parent);
  createTestPoints(parent);
  createTestLines(parent);
  createTestTriangle(parent);
}

/**
 * Create the same test geometry using geometry factories instead of direct construction.
 * This method mirrors createTestGeometry() but uses PointSetFactory, IndexedLineSetFactory,
 * and IndexedFaceSetFactory to create the geometry.
 */
function createTestGeometryFactories(parent) {
  initGridFactory(parent);
  createTestPointsFactory(parent);
  createTestLinesFactory(parent);
  createTestTriangleFactory(parent);
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
  ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.TUBE_RADIUS, 0.01);
  ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
  gridComponent.setAppearance(ap);
  
  parent.addChild(gridComponent);
}

/**
 * Create test points
 */
function createTestPoints(parent) {
  const pointsComponent = SceneGraphUtility.createFullSceneGraphComponent('testPoints');

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
  
  const colors = [
    Color.RED,
    Color.GREEN,
    Color.BLUE,
    Color.YELLOW,
    Color.PURPLE  // PURPLE is an alias for MAGENTA
  ];
  pointSet.setVertexColors(colors);
  pointSet.setVertexCoordinates(vertices);
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
 * Create test lines
 */
function createTestLines(parent) {
        const linesComponent = SceneGraphUtility.createFullSceneGraphComponent('testLines');

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

  const ecolors = [Color.BLACK, Color.WHITE];

  const lineSet = new IndexedLineSet(4, 2);
  lineSet.setVertexCoordinates( vertices, 4);
  lineSet.setEdgeIndices(edges);
  lineSet.setEdgeAttribute(GeometryAttribute.COLORS, toDataList(ecolors));
  linesComponent.setGeometry(lineSet);


  const ap = linesComponent.getAppearance();
  ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(255,0,255));
  ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.TUBE_RADIUS, .04);

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
    [1, -1, 0,1],     // 2: bottom-right
    [0, -2, 0,1]      // 2: bottom-right
  ];

  // Create face indices
  const faces = [
    [0, 1, 2],        // Triangle face
    [3, 2, 1]        // Triangle face
  ];
 // Create face indices
  const edges = [
    [0, 1, 2,0],
    [3, 1, 2,3]       // Triangle face
];
  const fcolors = [Color.RED, Color.BLUE];

  const faceSet = new IndexedFaceSet(3, 1);
  faceSet.setVertexCoordinates(vertices, 4);
  faceSet.setFaceIndices(faces);
  faceSet.setEdgeIndices(edges);
  faceSet.setFaceAttribute(GeometryAttribute.COLORS, toDataList(fcolors));
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

// ============================================================================
// Factory-based geometry creation methods
// ============================================================================

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
  const edges = [
    [0, 1],         // Diagonal line 1
    [2, 3]          // Diagonal line 2
  ];

  const ecolors = [Color.BLACK, Color.WHITE];

  const factory = new IndexedLineSetFactory();
  factory.setVertexCount(4);
  factory.setVertexCoordinates(vertices);
  factory.setEdgeCount(2);
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
  factory.setEdgeCount(2);
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
geomList[2] = Primitives.getSharedIcosahedron();
geomList[2] = SphereUtility.tessellatedIcosahedronSphere(5)

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
      const matrix = MatrixBuilder.euclidean().translate(0,2,0).scale(3).getArray();
      miscComponent.getTransformation().setMatrix(matrix);
  
       // ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(255,0,255));
      ap.setAttribute(CommonAttributes.LINE_SHADER + '.' + CommonAttributes.TUBE_RADIUS, .005);
    }
    parent.addChild(miscComponent);
    components.push(miscComponent);
    i++;
  });
  return components;
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
    const { sceneRoot, cameraPath, miscComponents } = createTestScene();
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

    // Setup animation timer for one of the misc geometry components
    // Using requestAnimationFrame for smooth, browser-synced animation
    let animationStartTime = null;
    let animationId = null;
    
    // Select the misc component to animate (index 2 is the icosahedron)
    const animatedComponent = miscComponents[2];
    const icoverts = fromDataList(geomList[2].getVertexAttribute(GeometryAttribute.COORDINATES));
    
    // Performance profiling: enable to see detailed timing in DevTools Performance tab
    const ENABLE_PROFILING = true; // Set to false to disable profiling overhead
    
    function animate(timestamp) {
      if (ENABLE_PROFILING) {
        performance.mark('animate-start');
      }
      
      // Initialize start time on first call
      if (animationStartTime === null) {
        animationStartTime = timestamp;
      }
      
      // Calculate elapsed time in seconds
      const elapsedSeconds = (timestamp - animationStartTime) / 1000;
      
      if (ENABLE_PROFILING) {
        performance.mark('matrix-build-start');
      }
      
      // Apply rotation transformation (rotating around Y-axis)
      const rotationAngle = elapsedSeconds * Math.PI * 0.125; // Rotate at 0.5 rad/s
      const matrix = MatrixBuilder.euclidean()
        .rotateY(rotationAngle)
        .getArray();
      
      if (ENABLE_PROFILING) {
        performance.mark('matrix-build-end');
        performance.mark('transform-vertices-start');
      }
      
      const transformedIcoverts = Rn.matrixTimesVectorArray(null, matrix, icoverts); 
      
      if (ENABLE_PROFILING) {
        performance.mark('transform-vertices-end');
        performance.mark('update-geometry-start');
      }
      
      // Use setVertexAttribute instead of setVertexCoordinates to avoid updating vertex count
      // which can cause edge data to be invalidated
      const coordList = toDataList(transformedIcoverts);
      geomList[2].setVertexAttribute(GeometryAttribute.COORDINATES, coordList);
      
      if (ENABLE_PROFILING) {
        performance.mark('update-geometry-end');
        performance.mark('render-start');
      }
      
      viewer.render();
      
      if (ENABLE_PROFILING) {
        performance.mark('render-end');
        performance.mark('animate-end');
        
        // Create measurements for DevTools Performance panel
        performance.measure('matrix-build', 'matrix-build-start', 'matrix-build-end');
        performance.measure('transform-vertices', 'transform-vertices-start', 'transform-vertices-end');
        performance.measure('update-geometry', 'update-geometry-start', 'update-geometry-end');
        performance.measure('render', 'render-start', 'render-end');
        performance.measure('total-frame', 'animate-start', 'animate-end');
        
        // Log frame time occasionally (every 60 frames ~= once per second at 60fps)
        if (Math.floor(elapsedSeconds * 60) % 60 === 0 && Math.floor(elapsedSeconds * 60) > 0) {
          const measures = performance.getEntriesByType('measure');
          const lastFrame = measures.filter(m => m.name === 'total-frame').slice(-1)[0];
          if (lastFrame) {
            console.log(`Frame time: ${lastFrame.duration.toFixed(2)}ms`);
          }
        }
      }
      
      // Schedule next frame (requestAnimationFrame automatically syncs with browser refresh rate)
      animationId = requestAnimationFrame(animate);
    }
    
    // Start animation after a short delay
    setTimeout(() => {
      console.log('✓ Starting animation using requestAnimationFrame');
      animationStartTime = null; // Reset for clean start
      animationId = requestAnimationFrame(animate);
    }, 1500);

    console.log('✓ Canvas2D viewer test complete');
    console.log('You should see:');
    console.log('  - Red points on the left');
    console.log('  - Blue X-shaped lines in the center');
    console.log('  - Green triangle on the right');
    console.log('  - Animated rotating circle in the top-left');

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
