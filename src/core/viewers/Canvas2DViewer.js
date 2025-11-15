// Canvas2D implementation of the Viewer interface
// Provides 2D rendering using HTML5 Canvas 2D context

import { Abstract2DViewer } from './Abstract2DViewer.js';
import { Abstract2DRenderer } from './Abstract2DRenderer.js';
import { Dimension } from '../scene/Viewer.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { INHERITED } from '../scene/Appearance.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import * as Rn from '../math/Rn.js';

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */
/** @typedef {import('../scene/Camera.js').Camera} Camera */
/** @typedef {import('../scene/Appearance.js').Appearance} Appearance */
/** @typedef {import('../scene/PointSet.js').PointSet} PointSet */
/** @typedef {import('../scene/IndexedLineSet.js').IndexedLineSet} IndexedLineSet */
/** @typedef {import('../scene/IndexedFaceSet.js').IndexedFaceSet} IndexedFaceSet */

/**
 * A 2D Canvas-based viewer implementation for jReality scene graphs.
 * Renders geometry using HTML5 Canvas 2D context with simple projection.
 */
export class Canvas2DViewer extends Abstract2DViewer {

  /** @type {HTMLCanvasElement} */
  #canvas;

  /** @type {CanvasRenderingContext2D} */
  #context;

  /** @type {boolean} */
  #autoResize = true;

  /** @type {number} */
  _pixelRatio = 1;



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
    this._pixelRatio = options.pixelRatio || window.devicePixelRatio || 1;

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
    const ratio = this._pixelRatio;

    // Get display size from CSS
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Set actual canvas size in memory (scaled up for retina)
    canvas.width = displayWidth * ratio;
    canvas.height = displayHeight * ratio;

    // Scale the drawing context so that 1 canvas unit = 1 CSS pixel
    this.#context.scale(ratio, ratio);

    // Note: We don't set canvas.style.width/height here to allow CSS to control sizing.
    // The canvas element should have its dimensions set via CSS (either inline or stylesheet).
    // Setting inline styles here would override CSS and break responsive layouts.
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
  // (getSceneRoot, setSceneRoot, getCameraPath, setCameraPath inherited from Abstract2DViewer)

  render() {
  
    // Note: Canvas is now cleared by renderer after appearance setup

    // Setup projection
    const camera = this._getCamera();
    if (!camera) {
      console.warn('No camera found in camera path');
      return;
    }

    // Create rendering visitor
    const renderer = new Canvas2DRenderer(this);

    renderer.render();
    
    }


  // hasViewingComponent() inherited from Abstract2DViewer

  getViewingComponent() {
    return this.#canvas;
  }

  getViewingComponentSize() {
    return new Dimension(this.#canvas.width, this.#canvas.height);
  }

  // canRenderAsync() and renderAsync() inherited from Abstract2DViewer

  // Additional Canvas2D-specific methods




  /**
   * Set pixel ratio for high-DPI displays
   * @param {number} ratio - The pixel ratio
   */
  setPixelRatio(ratio) {
    this._pixelRatio = ratio;
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



  // _getCamera() inherited from Abstract2DViewer

  /**
   * Get the viewing component (canvas)
   * @protected - Internal method for use by related classes
   * @returns {HTMLCanvasElement}
   */
  _getViewingComponent() {
    return this.#canvas;
  }

  /**
   * Compute projection matrix for the camera (Canvas-specific override)
   * @protected
   * @param {Camera} camera
   * @returns {number[]} 4x4 projection matrix
   */
_computeCam2NDCMatrix(camera) {
    const canvas = this.#canvas;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const aspect = width / height;

    // Call base class method with computed aspect ratio
    return super._computeCam2NDCMatrix(camera, aspect);
  }

  

 }



/**
 * Canvas2D rendering visitor that traverses the scene graph and renders geometry
 * Extends Abstract2DRenderer with Canvas-specific drawing operations
 */
class Canvas2DRenderer extends Abstract2DRenderer {

  /** @type {CanvasRenderingContext2D} */
  #context;

  /** @type {HTMLCanvasElement} */
  #canvas;

  /** @type {number} Cached point size from current appearance */
  #pointSize = 0.1;

  /**
   * Create a new Canvas2D renderer
   * @param {Canvas2DViewer} viewer - The viewer
   */
  constructor(viewer) {
    super(viewer);
    this.#canvas = viewer._getViewingComponent();
    this.#context = this.#canvas.getContext('2d');
  }

  // render() inherited from Abstract2DRenderer

  /**
   * Begin rendering - Canvas-specific setup (implements abstract method)
   * Sets up NDC-to-screen transform, clears canvas, draws background
   * Note: world2ndc is applied by Abstract2DRenderer.beginRender()
   * @protected
   */
  _beginRender() {
    this._setupCanvasTransform();
    this._clearCanvas();
  }

  /**
   * End rendering - Canvas-specific cleanup (implements abstract method)
   * @protected
   */
  _endRender() {
    // No cleanup needed for Canvas2D
  }

  /**
   * Apply appearance attributes to canvas context (implements abstract method)
   * Sets all drawing properties from current appearance stack
   * @protected
   */
  _applyAppearance() {
    // Cache appearance attributes - will be set per primitive type in _beginPrimitiveGroup
    this.#pointSize = this.getAppearanceAttribute(CommonAttributes.POINT_SHADER, CommonAttributes.POINT_SIZE, 0.1);
  }

  /**
   * Begin a primitive group - for Canvas, set appropriate context state (implements abstract method)
   * @protected
   * @param {string} type - Primitive type: 'point', 'line', or 'face'
   */
  _beginPrimitiveGroup(type) {
    const ctx = this.#context;
    
    if (type === CommonAttributes.POINT) {
      ctx.fillStyle = this.toCSSColor(
        this.getAppearanceAttribute(CommonAttributes.POINT_SHADER, CommonAttributes.DIFFUSE_COLOR, '#ff0000'));
    } else if (type === CommonAttributes.LINE) {
      ctx.strokeStyle = this.toCSSColor(
        this.getAppearanceAttribute(CommonAttributes.LINE_SHADER, CommonAttributes.DIFFUSE_COLOR, '#000000'));
      ctx.lineWidth = this.getAppearanceAttribute(CommonAttributes.LINE_SHADER, CommonAttributes.LINE_WIDTH, 1);
    } else if (type === CommonAttributes.POLYGON) {
      ctx.fillStyle = this.toCSSColor(
        this.getAppearanceAttribute(CommonAttributes.POLYGON_SHADER, CommonAttributes.DIFFUSE_COLOR, '#cccccc'));
    }
  }

  /**
   * End primitive group - no-op for Canvas (implements abstract method)
   * @protected
   */
  _endPrimitiveGroup() {
    // No action needed for Canvas2D - context state persists
  }

  // getCurrentTransformation() inherited from Abstract2DRenderer

  /**
   * Push transformation state - save canvas context (implements abstract method)
   * @protected
   */
  _pushTransformState() {
    this.#context.save();
  }

  /**
   * Pop transformation state - restore canvas context (implements abstract method)
   * @protected
   */
  _popTransformState() {
    this.#context.restore();
  }

  /**
   * Apply transformation matrix to canvas (implements abstract method)
   * @protected
   * @param {number[]} matrix - 4x4 transformation matrix
   */
  _applyTransform(matrix) {
    this.pushTransform(this.#context, matrix);
  }

  /**
   * Set up the Canvas 2D context transform to convert from NDC to screen coordinates
   * @private
   */
  _setupCanvasTransform() {
    const canvas = this.#canvas;
    const ctx = this.#context;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const viewer = this._getViewer();
    const ratio = viewer._pixelRatio;
    
    // Reset transform to identity, then reapply pixel ratio scaling
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    
    // Apply NDC-to-screen transformation:
    // NDC space [-1,1] x [-1,1] -> Screen space [0,width] x [0,height]
    // with Y-axis flip (NDC +Y up, Screen +Y down)
    ctx.transform(
      width / 2,   // X scale: [-1,1] -> [0,width]
      0,           // XY skew
      0,           // YX skew  
      -height / 2, // Y scale: [-1,1] -> [0,height] (flipped)
      width / 2,   // X translation: 0 -> center
      height / 2   // Y translation: 0 -> center
    );
    
    // Note: world2ndc is now applied by Abstract2DRenderer.beginRender()
    // via _pushTransformState() and _applyTransform()
  }

 /**
   * Apply a 4x4 transformation matrix to the canvas context
   * @param {CanvasRenderingContext2D} ctx - The canvas context
   * @param {number[]} matrix - 4x4 transformation matrix
   * @private
   */
 pushTransform(ctx, tform) {
// Extract the 2D transformation components from the 4x4 matrix
    // Canvas 2D uses: [a c e]  where a,c,e = scale/skew X, translate X
    //                 [b d f]        b,d,f = skew/scale Y, translate Y
    //                 [0 0 1]
    ctx.transform(
      tform[0], // a: x-scale
      tform[1], // b: y-skew  
      tform[4], // c: x-skew
      tform[5], // d: y-scale
      tform[3], // e: x-translate
      tform[7]
    );
  }

  /**
   * Internal method to clear canvas with appearance-based background color
   * @private
   */
  _clearCanvas() {
    const ctx = this.#context;
    const canvas = this.#canvas;
    
    // Temporarily reset transform to identity for clearing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // First, completely clear the canvas to transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get background color from scene root's appearance
    // Background color must be defined in the root appearance
    const sceneRoot = this._getViewer().getSceneRoot();
    let backgroundColor = CommonAttributes.BACKGROUND_COLOR_DEFAULT;
    
    if (sceneRoot && sceneRoot.getAppearance()) {
      const rootApp = sceneRoot.getAppearance();
      const bgColor = rootApp.getAttribute(CommonAttributes.BACKGROUND_COLOR);
      if (bgColor !== undefined && bgColor !== null && bgColor !== INHERITED) {
        backgroundColor = bgColor;
      }
    }
    
    ctx.fillStyle = this.toCSSColor(backgroundColor);
    console.log('backgroundColor', backgroundColor, this.toCSSColor(backgroundColor));
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Restore the NDC-to-screen transform
    this._setupCanvasTransform();
  }

  // visitComponent(), visitTransformation(), visitAppearance() inherited from Abstract2DRenderer
  // getAppearanceAttribute(), toCSSColor(), getBooleanAttribute(), getNumericAttribute() inherited from Abstract2DRenderer
  // visitPointSet(), visitIndexedLineSet(), visitIndexedFaceSet() inherited from Abstract2DRenderer
  // _renderVerticesAsPoints(), _renderEdgesAsLines(), _renderFacesAsPolygons() inherited from Abstract2DRenderer

  // ============================================================================
  // DEVICE-SPECIFIC DRAWING PRIMITIVES
  // ============================================================================

  /**
   * Extract 2D coordinates from vertex (canvas handles all transformations)
   * @protected
   * @param {number[]} vertex - 3D vertex [x, y, z] or [x, y, z, w]
   * @returns {{x: number, y: number}} 2D coordinates
   */
  _extractPoint(vertex) {
    // Canvas transformation handles all projection - just extract x,y coordinates
    return { x: vertex[0], y: vertex[1] };
  }

  /**
   * Draw a single point on the canvas (implements abstract method)
   * @protected
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  _drawPoint(x, y) {
    const ctx = this.#context;
    // Use cached point size and fillStyle already set by _applyAppearance()
    ctx.beginPath();
    ctx.arc(x, y, this.#pointSize / 2, 0, 2 * Math.PI);
    ctx.fill();
  }

  /**
   * Draw a polyline through multiple points (implements abstract method)
   * @protected
   * @param {*} vertices - Vertex data list
   * @param {number[]} indices - Vertex indices for the line
   */
  _drawPolyline(vertices, indices) {
    const ctx = this.#context;
    
    // Use strokeStyle and lineWidth already set by _applyAppearance()
    ctx.beginPath();
    let firstPoint = true;
    for (const index of indices) {
      const vertex = vertices.getSlice(index);
      const point = this._extractPoint(vertex);
      if (firstPoint) {
        ctx.moveTo(point.x, point.y);
        firstPoint = false;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.stroke();
  }

  /**
   * Draw a filled polygon (implements abstract method)
   * @protected
   * @param {*} vertices - Vertex data list
   * @param {number[]} indices - Vertex indices for the polygon
   * @param {boolean} fill - Whether to fill the polygon
   */
  _drawPolygon(vertices, indices, fill) {
    const ctx = this.#context;
    
    // fillStyle already set by _beginPrimitiveGroup('face')
    ctx.beginPath();
    let firstPoint = true;
    for (const index of indices) {
      const vertex = vertices.getSlice(index);
      const point = this._extractPoint(vertex);
      if (firstPoint) {
        ctx.moveTo(point.x, point.y);
        firstPoint = false;
      } else {
        ctx.lineTo(point.x, point.y);
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
