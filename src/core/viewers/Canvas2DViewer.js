// Canvas2D implementation of the Viewer interface
// Provides 2D rendering using HTML5 Canvas 2D context

import { Viewer, Dimension } from '../scene/Viewer.js';
import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import { Matrix } from '../math/Matrix.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import * as Rn from '../math/Rn.js';

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */
/** @typedef {import('../scene/Camera.js').Camera} Camera */
/** @typedef {import('../scene/PointSet.js').PointSet} PointSet */
/** @typedef {import('../scene/IndexedLineSet.js').IndexedLineSet} IndexedLineSet */
/** @typedef {import('../scene/IndexedFaceSet.js').IndexedFaceSet} IndexedFaceSet */

/**
 * A 2D Canvas-based viewer implementation for jReality scene graphs.
 * Renders geometry using HTML5 Canvas 2D context with simple projection.
 */
export class Canvas2DViewer extends Viewer {

  /** @type {HTMLCanvasElement} */
  #canvas;

  /** @type {CanvasRenderingContext2D} */
  #context;

  /** @type {SceneGraphComponent|null} */
  #sceneRoot = null;

  /** @type {SceneGraphPath|null} */
  #cameraPath = null;

  /** @type {boolean} */
  #autoResize = true;

  /** @type {number} */
  #pixelRatio = 1;

  /** @type {RenderSettings} */
  #renderSettings;

  /**
   * Create a new Canvas2D viewer
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.autoResize=true] - Whether to auto-resize canvas
   * @param {number} [options.pixelRatio] - Device pixel ratio (auto-detected if not provided)
   */
  constructor(canvas, options = {}) {
    super();
    
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Canvas2DViewer requires an HTMLCanvasElement');
    }

    this.#canvas = canvas;
    this.#context = canvas.getContext('2d');
    
    if (!this.#context) {
      throw new Error('Failed to get 2D context from canvas');
    }

    this.#autoResize = options.autoResize !== false;
    this.#pixelRatio = options.pixelRatio || window.devicePixelRatio || 1;

    this.#renderSettings = new RenderSettings();
    
    // Setup canvas
    this.#setupCanvas();
    
    // Setup resize handling
    if (this.#autoResize) {
      this.#setupResizeHandling();
    }
  }

  /**
   * Setup canvas with proper pixel ratio handling
   * @private
   */
  #setupCanvas() {
    const canvas = this.#canvas;
    const context = this.#context;
    const ratio = this.#pixelRatio;

    // Get display size
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Set actual canvas size in memory (scaled up for retina)
    canvas.width = displayWidth * ratio;
    canvas.height = displayHeight * ratio;

    // Scale the drawing context down
    context.scale(ratio, ratio);

    // Set CSS size to maintain correct display size
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
  }

  /**
   * Setup automatic canvas resizing
   * @private
   */
  #setupResizeHandling() {
    // Use ResizeObserver if available, otherwise fall back to window resize
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        this.#setupCanvas();
        this.render();
      });
      resizeObserver.observe(this.#canvas);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', () => {
        this.#setupCanvas();
        this.render();
      });
    }
  }

  // Viewer interface implementation

  getSceneRoot() {
    return this.#sceneRoot;
  }

  setSceneRoot(root) {
    this.#sceneRoot = root;
  }

  getCameraPath() {
    return this.#cameraPath;
  }

  setCameraPath(cameraPath) {
    this.#cameraPath = cameraPath;
  }

  render() {
    if (!this.#sceneRoot || !this.#cameraPath) {
      this.#clearCanvas();
      return;
    }

    // Clear canvas
    this.#clearCanvas();

    // Setup projection
    const camera = this.#getCamera();
    if (!camera) {
      console.warn('No camera found in camera path');
      return;
    }

    // Create rendering visitor
    const renderer = new Canvas2DRenderer(this.#context, this.#canvas, camera, this.#renderSettings);

    // Get world-to-camera transformation
    const cameraMatrix = this.#cameraPath.getMatrix();
    const projectionMatrix = this.#computeProjectionMatrix(camera);
    
    renderer.setTransformation(cameraMatrix, projectionMatrix);

    // Render the scene
    try {
      this.#sceneRoot.accept(renderer);
    } catch (error) {
      console.error('Rendering error:', error);
    }
  }

  hasViewingComponent() {
    return true;
  }

  getViewingComponent() {
    return this.#canvas;
  }

  getViewingComponentSize() {
    return new Dimension(this.#canvas.clientWidth, this.#canvas.clientHeight);
  }

  canRenderAsync() {
    return true;
  }

  renderAsync() {
    requestAnimationFrame(() => this.render());
  }

  // Additional Canvas2D-specific methods

  /**
   * Get render settings
   * @returns {RenderSettings}
   */
  getRenderSettings() {
    return this.#renderSettings;
  }

  /**
   * Set pixel ratio for high-DPI displays
   * @param {number} ratio - The pixel ratio
   */
  setPixelRatio(ratio) {
    this.#pixelRatio = ratio;
    this.#setupCanvas();
  }

  /**
   * Export canvas as image
   * @param {string} [format='image/png'] - Image format
   * @param {number} [quality] - Image quality (0-1 for lossy formats)
   * @returns {string} Data URL of the image
   */
  exportImage(format = 'image/png', quality) {
    return this.#canvas.toDataURL(format, quality);
  }

  // Private helper methods

  /**
   * Clear the canvas
   * @private
   */
  #clearCanvas() {
    const ctx = this.#context;
    const canvas = this.#canvas;
    
    ctx.fillStyle = this.#renderSettings.backgroundColor;
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  /**
   * Get camera from camera path
   * @private
   * @returns {Camera|null}
   */
  #getCamera() {
    if (!this.#cameraPath || this.#cameraPath.getLength() === 0) {
      return null;
    }
    
    const lastElement = this.#cameraPath.getLastElement();
    return lastElement && lastElement.constructor.name === 'Camera' ? lastElement : null;
  }

  /**
   * Compute projection matrix for the camera
   * @private
   * @param {Camera} camera
   * @returns {number[]} 4x4 projection matrix
   */
  #computeProjectionMatrix(camera) {
    const canvas = this.#canvas;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const aspect = width / height;

    const projMatrix = new Array(16);
    
    if (camera.isPerspective()) {
      // Perspective projection
      const fov = camera.getFieldOfView() * Math.PI / 180; // Convert to radians
      const near = camera.getNear();
      const far = camera.getFar();
      
      Matrix.assignPerspective(projMatrix, fov, aspect, near, far);
    } else {
      // Orthographic projection
      const size = 10; // Default orthographic size
      const left = -size * aspect;
      const right = size * aspect;
      const bottom = -size;
      const top = size;
      const near = camera.getNear();
      const far = camera.getFar();
      
      Matrix.assignOrthographic(projMatrix, left, right, bottom, top, near, far);
    }

    return projMatrix;
  }
}

/**
 * Render settings for Canvas2D viewer
 */
class RenderSettings {
  constructor() {
    this.backgroundColor = '#f0f0f0';
    this.pointSize = 3;
    this.lineWidth = 1;
    this.pointColor = '#ff0000';
    this.lineColor = '#000000';
    this.faceColor = '#cccccc';
    this.wireframe = false;
    this.showPoints = true;
    this.showLines = true;
    this.showFaces = true;
  }
}

/**
 * Canvas2D rendering visitor that traverses the scene graph and renders geometry
 */
class Canvas2DRenderer extends SceneGraphVisitor {

  /** @type {CanvasRenderingContext2D} */
  #context;

  /** @type {HTMLCanvasElement} */
  #canvas;

  /** @type {Camera} */
  #camera;

  /** @type {RenderSettings} */
  #settings;

  /** @type {number[]} World-to-camera transformation matrix */
  #cameraMatrix;

  /** @type {number[]} Projection matrix */
  #projectionMatrix;

  /** @type {number[]} Combined transformation matrix */
  #mvpMatrix;

  constructor(context, canvas, camera, settings) {
    super();
    this.#context = context;
    this.#canvas = canvas;
    this.#camera = camera;
    this.#settings = settings;
    this.#mvpMatrix = new Array(16);
  }

  setTransformation(cameraMatrix, projectionMatrix) {
    this.#cameraMatrix = cameraMatrix;
    this.#projectionMatrix = projectionMatrix;
    // Combine transformations: MVP = Projection * View
    Rn.timesMatrix(this.#mvpMatrix, projectionMatrix, cameraMatrix);
  }

  /**
   * Visit a SceneGraphComponent - this is the key method for traversal
   * @param {SceneGraphComponent} component
   */
  visitComponent(component) {
    // Push this component onto the path for transformation calculations
    this.pushPath(component);
    
    try {
      // Continue traversal to all children (sub-components, geometry, etc.)
      component.childrenAccept(this);
    } finally {
      // Pop the component from the path
      this.popPath();
    }
  }

  visitPointSet(pointSet) {
    if (!this.#settings.showPoints) return;

    const vertices = pointSet.getVertexAttribute(GeometryAttribute.COORDINATES);
    if (!vertices) return;

    const ctx = this.#context;
    ctx.fillStyle = this.#settings.pointColor;

    // Get current transformation from path
    const currentMatrix = this.getCurrentTransformation();
    
    for (let i = 0; i < pointSet.getNumPoints(); i++) {
      const vertex = vertices.getItem(i);
      if (vertex.length >= 3) {
        const projected = this.#projectPoint(vertex, currentMatrix);
        if (projected) {
          this.#drawPoint(projected.x, projected.y);
        }
      }
    }
  }

  visitIndexedLineSet(lineSet) {
    if (!this.#settings.showLines) return;

    const vertices = lineSet.getVertexAttribute(GeometryAttribute.COORDINATES);
    const indices = lineSet.getEdgeAttribute(GeometryAttribute.INDICES);
    
    if (!vertices || !indices) return;

    const ctx = this.#context;
    ctx.strokeStyle = this.#settings.lineColor;
    ctx.lineWidth = this.#settings.lineWidth;

    const currentMatrix = this.getCurrentTransformation();

    for (let i = 0; i < lineSet.getNumEdges(); i++) {
      const edgeIndices = indices.getRow(i);
      this.#drawPolyline(vertices, edgeIndices, currentMatrix);
    }
  }

  visitIndexedFaceSet(faceSet) {
    if (!this.#settings.showFaces && !this.#settings.wireframe) return;

    const vertices = faceSet.getVertexAttribute(GeometryAttribute.COORDINATES);
    const indices = faceSet.getFaceAttribute(GeometryAttribute.INDICES);
    
    if (!vertices || !indices) return;

    const ctx = this.#context;
    const currentMatrix = this.getCurrentTransformation();

    for (let i = 0; i < faceSet.getNumFaces(); i++) {
      const faceIndices = indices.getRow(i);
      
      if (this.#settings.showFaces && !this.#settings.wireframe) {
        ctx.fillStyle = this.#settings.faceColor;
        this.#drawPolygon(vertices, faceIndices, currentMatrix, true);
      }
      
      if (this.#settings.wireframe || !this.#settings.showFaces) {
        ctx.strokeStyle = this.#settings.lineColor;
        ctx.lineWidth = this.#settings.lineWidth;
        this.#drawPolygon(vertices, faceIndices, currentMatrix, false);
      }
    }
  }

  /**
   * Get current transformation matrix from the path
   * @private
   * @returns {number[]}
   */
  getCurrentTransformation() {
    // Compute the cumulative transformation from the current path
    const pathMatrix = new Array(16);
    Rn.setIdentityMatrix(pathMatrix);
    
    // Multiply transformations along the path
    for (const node of this.getCurrentPath()) {
      if (node.constructor.name === 'SceneGraphComponent') {
        const transformation = node.getTransformation();
        if (transformation) {
          Rn.timesMatrix(pathMatrix, pathMatrix, transformation.getMatrix());
        }
      }
    }
    
    const combined = new Array(16);
    Rn.timesMatrix(combined, this.#mvpMatrix, pathMatrix);
    return combined;
  }

  /**
   * Project a 3D point to 2D screen coordinates
   * @private
   * @param {number[]} vertex - 3D vertex [x, y, z] or [x, y, z, w]
   * @param {number[]} transformMatrix - Transformation matrix
   * @returns {{x: number, y: number}|null} Screen coordinates or null if behind camera
   */
  #projectPoint(vertex, transformMatrix) {
    // Apply transformation
    const x = vertex[0] || 0;
    const y = vertex[1] || 0;
    const z = vertex[2] || 0;
    const w = vertex[3] || 1;

    // Transform by MVP matrix
    const tx = transformMatrix[0]*x + transformMatrix[4]*y + transformMatrix[8]*z + transformMatrix[12]*w;
    const ty = transformMatrix[1]*x + transformMatrix[5]*y + transformMatrix[9]*z + transformMatrix[13]*w;
    const tz = transformMatrix[2]*x + transformMatrix[6]*y + transformMatrix[10]*z + transformMatrix[14]*w;
    const tw = transformMatrix[3]*x + transformMatrix[7]*y + transformMatrix[11]*z + transformMatrix[15]*w;

    // Perspective divide
    if (tw === 0) return null;
    const ndcX = tx / tw;
    const ndcY = ty / tw;
    const ndcZ = tz / tw;

    // Clip check
    if (ndcZ < -1 || ndcZ > 1) return null;

    // Convert to screen coordinates
    const canvas = this.#canvas;
    const screenX = (ndcX + 1) * 0.5 * canvas.clientWidth;
    const screenY = (1 - ndcY) * 0.5 * canvas.clientHeight; // Flip Y

    return { x: screenX, y: screenY };
  }

  /**
   * Draw a point on the canvas
   * @private
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  #drawPoint(x, y) {
    const ctx = this.#context;
    const size = this.#settings.pointSize;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.fill();
  }

  /**
   * Draw a polyline
   * @private
   * @param {*} vertices - Vertex data list
   * @param {number[]} indices - Vertex indices for the line
   * @param {number[]} transformMatrix - Transformation matrix
   */
  #drawPolyline(vertices, indices, transformMatrix) {
    const ctx = this.#context;
    ctx.beginPath();

    let firstPoint = true;
    for (const index of indices) {
      const vertex = vertices.getItem(index);
      const projected = this.#projectPoint(vertex, transformMatrix);
      if (projected) {
        if (firstPoint) {
          ctx.moveTo(projected.x, projected.y);
          firstPoint = false;
        } else {
          ctx.lineTo(projected.x, projected.y);
        }
      }
    }
    ctx.stroke();
  }

  /**
   * Draw a polygon (filled or wireframe)
   * @private
   * @param {*} vertices - Vertex data list
   * @param {number[]} indices - Vertex indices for the polygon
   * @param {number[]} transformMatrix - Transformation matrix
   * @param {boolean} fill - Whether to fill the polygon
   */
  #drawPolygon(vertices, indices, transformMatrix, fill) {
    const ctx = this.#context;
    ctx.beginPath();

    let firstPoint = true;
    for (const index of indices) {
      const vertex = vertices.getItem(index);
      const projected = this.#projectPoint(vertex, transformMatrix);
      if (projected) {
        if (firstPoint) {
          ctx.moveTo(projected.x, projected.y);
          firstPoint = false;
        } else {
          ctx.lineTo(projected.x, projected.y);
        }
      }
    }
    ctx.closePath();

    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }
}
