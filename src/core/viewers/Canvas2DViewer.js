// Canvas2D implementation of the Viewer interface
// Provides 2D rendering using HTML5 Canvas 2D context

import { Abstract2DViewer } from './Abstract2DViewer.js';
import { Abstract2DRenderer } from './Abstract2DRenderer.js';
import { Dimension } from '../scene/Viewer.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
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

    // Get display size
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Set actual canvas size in memory (scaled up for retina)
    canvas.width = displayWidth * ratio;
    canvas.height = displayHeight * ratio;

    // Scale the drawing context so that 1 canvas unit = 1 CSS pixel
    this.#context.scale(ratio, ratio);

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
   * Setup Canvas-specific rendering context (implements abstract method)
   * @protected
   */
  _setupRendering() {
    this._setupCanvasTransform();
  }

  /**
   * Clear canvas and draw background (implements abstract method)
   * @protected
   */
  _clearSurface() {
    this._clearCanvas();
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
    
    // Apply the base world-to-NDC transformation
    // This will be the foundation that all scene transformations build upon
    const world2ndc = this._getWorld2NDC();
    this.pushTransform(ctx, world2ndc);
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
    const appearanceStack = this._getAppearanceStack();
    const viewer = this._getViewer();
    appearanceStack.push(viewer.getSceneRoot().getAppearance());
    // Temporarily reset transform to identity for clearing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // First, completely clear the canvas to transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Then apply the background color (which may have alpha < 1.0)
    const backgroundColor = this.getAppearanceAttribute(null, CommonAttributes.BACKGROUND_COLOR, CommonAttributes.BACKGROUND_COLOR_DEFAULT);
    ctx.fillStyle = this.toCSSColor(backgroundColor);
    console.log('backgroundColor', backgroundColor, this.toCSSColor(backgroundColor));
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    appearanceStack.pop();

    // Restore the NDC-to-screen transform
    this._setupCanvasTransform();
  }

  // visitComponent(), visitTransformation(), visitAppearance() inherited from Abstract2DRenderer

  // getAppearanceAttribute(), toCSSColor(), getBooleanAttribute(), getNumericAttribute() inherited from Abstract2DRenderer

  visitPointSet(pointSet) {
    // PointSet only renders vertices as points (based on VERTEX_DRAW flag)
    this.#renderVerticesAsPoints(pointSet);
  }

  visitIndexedLineSet(lineSet) {
    // IndexedLineSet renders vertices as points (if VERTEX_DRAW), then edges as lines (if EDGE_DRAW)
    this.#renderVerticesAsPoints(lineSet);
    this.#renderEdgesAsLines(lineSet);
  }

  visitIndexedFaceSet(faceSet) {
    // IndexedFaceSet renders all three primitive types based on draw flags:
    // 1. Vertices as points (if VERTEX_DRAW)
    // 2. Edges as lines (if EDGE_DRAW) 
    // 3. Faces as filled polygons (if FACE_DRAW)
    this.#renderVerticesAsPoints(faceSet);
    this.#renderEdgesAsLines(faceSet);
    this.#renderFacesAsPolygons(faceSet);
  }

  /**
   * Helper method to render vertices as points for any geometry
   * @private
   * @param {*} geometry - The geometry object
   */
  #renderVerticesAsPoints(geometry) {
    if (!this.getBooleanAttribute(CommonAttributes.VERTEX_DRAW, true)) {
      return;
    }

    const vertices = geometry.getVertexCoordinates();
    if (!vertices) return;

    const ctx = this.#context;
    
    // Get point color with namespace fallback
    const pointColor = this.getAppearanceAttribute('point', CommonAttributes.DIFFUSE_COLOR, '#ff0000');
    ctx.fillStyle = this.toCSSColor(pointColor);

    const numVertices = geometry.getNumPoints ? geometry.getNumPoints() : 
                       geometry.getNumVertices ? geometry.getNumVertices() : 
                       vertices.shape[0];
    
    for (let i = 0; i < numVertices; i++) {
      const vertex = vertices.getSlice(i);
      if (vertex.length >= 3) {
        const point = this.#extractPoint(vertex);
        this.#drawPoint(point.x, point.y);
      }
    }
  }

  /**
   * Helper method to render edges as lines for indexed geometries
   * @private
   * @param {IndexedLineSet} geometry - The geometry object (IndexedLineSet or IndexedFaceSet)
   */
  #renderEdgesAsLines(geometry) {
    if (!this.getBooleanAttribute(CommonAttributes.EDGE_DRAW, true)) {
      return;
    }

    const vertices = geometry.getVertexCoordinates();
    let indices = null;
    
    // Get appropriate edge indices - try both convenience method and direct attribute access
    if (geometry.getEdgeIndices) {
      indices = geometry.getEdgeIndices();
    }
    
    // Fallback: try getting indices directly from edge attributes
    if (!indices && geometry.getEdgeAttributes().size > 0) {
      indices = geometry.getEdgeAttribute(GeometryAttribute.INDICES) || 
                geometry.getEdgeAttribute('indices');
    }
    
    // console.log('geometry',vertices, ' shape: ', vertices.shape);
    // console.log('indices', indices, ' shape: ', indices.rows.length);
    const ctx = this.#context;
    
    // Get line appearance attributes with namespace fallback
    const lineColor = this.getAppearanceAttribute('line', CommonAttributes.DIFFUSE_COLOR, '#000000');
    const lineWidth = this.getNumericAttribute(CommonAttributes.LINE_WIDTH, 1);
    
    ctx.strokeStyle = this.toCSSColor(lineColor);
    ctx.lineWidth = lineWidth;

    // Render all edges
    if (indices) {
      // 2D array of edge indices
      for (let i = 0; i < indices.rows.length; i++) {
        const edgeIndices = indices.getRow(i);
        this.#drawPolyline(vertices, edgeIndices);
      }
    } else {
      // Handle flat array case
      console.warn('Edge indices format not supported yet');
    }
  }

  /**
   * Helper method to render faces as filled polygons for indexed face sets
   * @private
   * @param {*} geometry - The geometry object (IndexedFaceSet)
   */
  #renderFacesAsPolygons(geometry) {
    if (!this.getBooleanAttribute(CommonAttributes.FACE_DRAW, true)) {
      return;
    }

    const vertices = geometry.getVertexCoordinates();
    const indices = geometry.getFaceIndices();
    if (!vertices || !indices) return;

    const ctx = this.#context;

    // Get appearance attributes
    const faceColor = this.getAppearanceAttribute('polygon', CommonAttributes.DIFFUSE_COLOR, '#cccccc');

    for (let i = 0; i < geometry.getNumFaces(); i++) {
      const faceIndices = indices.getRow(i);
      
      // Fill faces
      ctx.fillStyle = this.toCSSColor(faceColor);
      this.#drawPolygon(vertices, faceIndices, true);
    }
  }

  /**
   * Helper method to extract edge indices from face indices
   * @private
   * @param {*} faceIndices - Face indices data
   * @param {number} numFaces - Number of faces
   * @returns {*} Edge indices data structure
   */
  #extractEdgesFromFaces(faceIndices, numFaces) {
    // For now, return null to disable edge rendering for faces
    // TODO: Implement proper edge extraction from face topology
    return faceIndices;
  }

 

  /**
   * Extract 2D coordinates from vertex (canvas handles all transformations)
   * @private
   * @param {number[]} vertex - 3D vertex [x, y, z] or [x, y, z, w]
   * @returns {{x: number, y: number}} 2D coordinates
   */
  #extractPoint(vertex) {
    // Canvas transformation handles all projection - just extract x,y coordinates
    return { x: vertex[0], y: vertex[1] };
  }

  /**
   * Draw a point on the canvas
   * @private
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  #drawPoint(x, y) {
    const ctx = this.#context;
    const size = this.getNumericAttribute(CommonAttributes.POINT_SIZE, .1);
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.fill();
  }

  /**
   * Draw a polyline
   * @private
   * @param {*} vertices - Vertex data list
   * @param {number[]} indices - Vertex indices for the line
   */
  #drawPolyline(vertices, indices) {
    const ctx = this.#context;
    ctx.beginPath();

    let firstPoint = true;
    for (const index of indices) {
      const vertex = vertices.getSlice(index);
      const point = this.#extractPoint(vertex);
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
   * Draw a polygon (filled or wireframe)
   * @private
   * @param {*} vertices - Vertex data list
   * @param {number[]} indices - Vertex indices for the polygon
   * @param {boolean} fill - Whether to fill the polygon
   */
  #drawPolygon(vertices, indices, fill) {
    const ctx = this.#context;
    ctx.beginPath();

    let firstPoint = true;
    for (const index of indices) {
      const vertex = vertices.getSlice(index);
      const point = this.#extractPoint(vertex);
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
