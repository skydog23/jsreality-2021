/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Simple test for Viewer abstract class functionality

import { Viewer, Dimension } from '../Viewer.js';
import { SceneGraphComponent } from '../SceneGraphComponent.js';
import { SceneGraphPath } from '../SceneGraphPath.js';
import { Camera } from '../Camera.js';

console.log('=== Viewer Abstract Class Test ===');

console.log('\n=== Testing Abstract Class Behavior ===');

// Test 1: Cannot instantiate abstract class directly
try {
  const viewer = new Viewer();
  console.log('ERROR: Should not be able to instantiate Viewer directly');
} catch (error) {
  console.log('✓ Correctly prevented direct instantiation:', error.message);
}

console.log('\n=== Testing Mock Viewer ===');

// Test 2: Mock viewer creation and basic functionality
const mockViewer = Viewer.createMockViewer({
  componentSize: new Dimension(1024, 768),
  supportsAsync: true
});

console.log('✓ Created mock viewer');
console.log('Has viewing component:', mockViewer.hasViewingComponent());
console.log('Can render async:', mockViewer.canRenderAsync());
console.log('Component size:', mockViewer.getViewingComponentSize());

// Test scene setup
const sceneRoot = new SceneGraphComponent();
sceneRoot.setName('root');

const camera = new Camera();
camera.setName('mainCamera');
sceneRoot.addChild(camera);

const cameraPath = new SceneGraphPath(sceneRoot, camera);

mockViewer.setSceneRoot(sceneRoot);
mockViewer.setCameraPath(cameraPath);

console.log('Scene root set:', mockViewer.getSceneRoot()?.getName());
console.log('Camera path set:', mockViewer.getCameraPath()?.toString());

// Test rendering
console.log('\n=== Testing Rendering ===');

const initialStats = mockViewer.getRenderStats();
console.log('Initial render stats:', initialStats);

mockViewer.render();
mockViewer.render();
mockViewer.renderAsync();

const finalStats = mockViewer.getRenderStats();
console.log('Final render stats:', finalStats);
console.log(`Rendered ${finalStats.renderCount} times, async ${finalStats.asyncRenderCount} times`);

console.log('\n=== Testing Interface Validation ===');

// Test 3: Valid implementation passes validation
try {
  Viewer.validateImplementation(mockViewer);
  console.log('✓ Mock viewer passes validation');
} catch (error) {
  console.log('ERROR: Mock viewer failed validation:', error.message);
}

console.log('\n=== Testing Custom Implementation ===');

// Test 4: Custom implementation
class WebGLViewer extends Viewer {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.sceneRoot = null;
    this.cameraPath = null;
  }

  getSceneRoot() { return this.sceneRoot; }
  setSceneRoot(root) { this.sceneRoot = root; }
  getCameraPath() { return this.cameraPath; }
  setCameraPath(path) { this.cameraPath = path; }
  
  render() {
    console.log('WebGL rendering to canvas:', this.canvas?.id || 'unnamed');
  }
  
  hasViewingComponent() { return !!this.canvas; }
  getViewingComponent() { return this.canvas; }
  getViewingComponentSize() {
    if (!this.canvas) return null;
    return new Dimension(this.canvas.width || 800, this.canvas.height || 600);
  }
  
  canRenderAsync() { return true; }
  renderAsync() {
    setTimeout(() => this.render(), 0); // Simulated async rendering
  }
}

const mockCanvas = { id: 'webgl-canvas', width: 1920, height: 1080 };
const webglViewer = new WebGLViewer(mockCanvas);

try {
  Viewer.validateImplementation(webglViewer);
  console.log('✓ WebGL viewer passes validation');
} catch (error) {
  console.log('ERROR: WebGL viewer failed validation:', error.message);
}

webglViewer.setSceneRoot(sceneRoot);
webglViewer.setCameraPath(cameraPath);
webglViewer.render();

console.log('WebGL viewer component size:', webglViewer.getViewingComponentSize());
console.log('WebGL viewer viewing component:', webglViewer.getViewingComponent().id);

console.log('\n=== Testing Invalid Implementation ===');

// Test 5: Invalid implementation fails validation
class IncompleteViewer extends Viewer {
  constructor() {
    super();
  }

  // Only implement some methods - missing others
  getSceneRoot() { return null; }
  setSceneRoot(root) { /* implemented */ }
  // Missing: getCameraPath, setCameraPath, render, etc.
}

const incompleteViewer = new IncompleteViewer();

try {
  Viewer.validateImplementation(incompleteViewer);
  console.log('ERROR: Incomplete viewer should have failed validation');
} catch (error) {
  console.log('✓ Correctly caught incomplete implementation:', error.message);
}

console.log('\n=== Testing Dimension Class ===');

const dimension = new Dimension(1600, 900);
console.log('Dimension created:', dimension);
console.log('Width:', dimension.width, 'Height:', dimension.height);

console.log('\n=== Viewer Test Complete ===');
