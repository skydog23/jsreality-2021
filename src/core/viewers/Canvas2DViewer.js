// Canvas2D implementation of the Viewer interface
// Provides 2D rendering using HTML5 Canvas 2D context

import { Viewer, Dimension } from '../scene/Viewer.js';
import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import { Matrix } from '../math/Matrix.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import * as Rn from '../math/Rn.js';
import * as Pn from '../math/Pn.js';
import * as P3 from '../math/P3.js';
import { Camera, Rectangle2D } from '../scene/Camera.js';
import { INHERITED } from '../scene/Appearance.js';

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


  hasViewingComponent() {
    return true;
  }

  getViewingComponent() {
    return this.#canvas;
  }

  getViewingComponentSize() {
    return new Dimension(this.#canvas.width, this.#canvas.height);
  }

  canRenderAsync() {
    return true;
  }

  renderAsync() {
    requestAnimationFrame(() => this.render());
  }

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



  /**
   * Get camera from camera path
   * @protected - Internal method for use by related classes
   * @returns {Camera|null}
   */
  _getCamera() {
    if (!this.#cameraPath || this.#cameraPath.getLength() === 0) {
      return null;
    }
    
    const lastElement = this.#cameraPath.getLastElement();
    return lastElement && lastElement.constructor.name === 'Camera' ? lastElement : null;
  }

  /**
   * Get the viewing component (canvas)
   * @protected - Internal method for use by related classes
   * @returns {HTMLCanvasElement}
   */
  _getViewingComponent() {
    return this.#canvas;
  }

  /**
   * Compute projection matrix for the camera
   * @private
   * @param {Camera} camera
   * @returns {number[]} 4x4 projection matrix
   */
_computeCam2NDCMatrix(camera) {
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
      
      P3.makePerspectiveProjectionMatrix(projMatrix, fov, aspect, near, far);
    } else {
      // Orthographic projection
      const size = 5; //camera.getViewPort().width; 
      const left = -size; // * aspect;
      const right = size; // * aspect;
      const bottom = -size;
      const top = size;
      const near = camera.getNear();
      const far = camera.getFar();
      const vp = new Rectangle2D(left, bottom, right - left, top - bottom);
      P3.makeOrthographicProjectionMatrix(projMatrix, vp, near, far);
    }

    return projMatrix;
  }

  

 }



/**
 * Canvas2D rendering visitor that traverses the scene graph and renders geometry
 */
class Canvas2DRenderer extends SceneGraphVisitor {

  /** @type {Canvas2DViewer} */
  #viewer;

  /** @type {CanvasRenderingContext2D} */
  #context;

  /** @type {HTMLCanvasElement} */
  #canvas;

  /** @type {Camera} */
  #camera;

  /** @type {Appearance[]} Stack of appearances for hierarchical attribute resolution */
  #appearanceStack = [];

  /** @type {number[][]} Stack of transformation matrices for hierarchical transformations */
  #transformationStack = [];

  /** @type {number[]} World-to-camera transformation matrix */
  #world2Cam;

  /** @type {number[]} Camera-to-NDC transformation matrix */
  #cam2ndc;

  /** @type {number[]} NDC-to-screen transformation matrix */
  #ndc2screen;

  /** @type {number[]} Combined world-to-NDC transformation matrix */
  #world2ndc;

  /**
   * Create a new Canvas2D renderer
   * @param {Canvas2DViewer} viewer - The viewer
   */
  constructor(viewer) {
    super();
    this.#viewer = viewer;
    this.#canvas = viewer._getViewingComponent();
    this.#context = this.#canvas.getContext('2d');
    this.#camera = viewer._getCamera();
    this.#world2ndc = new Array(16);
  }

  render() {
    const cameraPath = this.#viewer.getCameraPath();
    const sceneRoot = this.#viewer.getSceneRoot();

    if (!cameraPath || !sceneRoot) {
      return;
    }

    // Get world-to-camera transformation
    const world2Cam = cameraPath.getInverseMatrix();
    const cam2ndc = this.#viewer._computeCam2NDCMatrix(this.#camera);
    Rn.timesMatrix(this.#world2ndc, cam2ndc, world2Cam);
    // console.log('world2ndc', this.#world2ndc);
    // console.log('world2Cam', world2Cam);
    // console.log('cam2ndc', cam2ndc);
    // // Initialize transformation stack with the world-to-NDC matrix
    this.#transformationStack = [this.#world2ndc.slice()]; // Clone the matrix

    this._setupCanvasTransform();
    // Clear canvas with proper background color
    this._clearCanvas();

      // Render the scene
    try {
      
      sceneRoot.accept(this);
 
    } catch (error) {
      console.error('Rendering error:', error);
    }
  }

  initializeMatrixStack(cameraMatrix, cam2ndcMatrix) {
    this.#world2Cam = cameraMatrix;
    this.#cam2ndc = cam2ndcMatrix;
    // Combine world-to-camera and camera-to-NDC transformations
    Rn.timesMatrix(this.#world2ndc, this.#cam2ndc, this.#world2Cam);
    // Initialize transformation stack with the world-to-NDC matrix
    this.#transformationStack = [this.#world2ndc.slice()]; // Clone the matrix
    }

  /**
   * Get the current transformation matrix from the top of the stack
   * @returns {number[]} The current transformation matrix
   */
  getCurrentTransformation() {
    return this.#transformationStack[this.#transformationStack.length - 1];
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
    const ratio = this.#viewer._pixelRatio;
    
    // Reset transform to identity, then reapply pixel ratio scaling
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    
    // Apply NDC-to-screen transformation:
    // NDC space [-1,1] x [-1,1] -> Screen space [0,width] x [0,height]
    // with Y-axis flip (NDC +Y up, Screen +Y down)
    // Note: width/height are in CSS pixels, context is already scaled by ratio
    const aspect  = height < width ? height / width : width / height;
    ctx.transform(
      aspect * width / 2,   // X scale: [-1,1] -> [0,width]
      0,           // XY skew
      0,           // YX skew  
      -height / 2, // Y scale: [-1,1] -> [0,height] (flipped)
      width / 2,   // X translation: 0 -> center
      height / 2   // Y translation: 0 -> center
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
    
    // Get background color from appearance stack, fall back to default
    const backgroundColor = this.getAppearanceAttribute(null, CommonAttributes.BACKGROUND_COLOR, '#00c000');
    ctx.fillStyle = this.toCSSColor(backgroundColor);
    // Clear using the full bitmap dimensions
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Restore the NDC-to-screen transform
    this._setupCanvasTransform();
  }

  /**
   * Visit a SceneGraphComponent - this is the key method for traversal
   * @param {SceneGraphComponent} component
   */
  visitComponent(component) {
    // Push this component onto the path for transformation calculations
    this.pushPath(component);
    
    let hasTransformation = false;
    
    try {
      // Check if this component has a transformation
      const transformation = component.getTransformation();
      if (transformation) {
        hasTransformation = true;
        // Visit the transformation (this will push onto transformation stack)
        transformation.accept(this);
      }
      
       // Push root scene's appearance if it exists
       const appearance = component.getAppearance();
       if (appearance ) {
         appearance.accept(this);
       }
       
     
      // Continue traversal to all children (sub-components, geometry, etc.)
      component.childrenAccept(this);
    } finally {

      if (component.getAppearance) {
        this.#appearanceStack.pop();
      }

      // Pop the transformation from the stack if we pushed one
      if (hasTransformation) {
        this.#transformationStack.pop();
      }
      
      // Pop the component from the path
      this.popPath();
    }
  }

  /**
   * Visit a Transformation node - multiply current transformation and push onto stack
   * @param {Transformation} transformation
   */
  visitTransformation(transformation) {
    // Get the current transformation matrix from the top of the stack
    const currentMatrix = this.#transformationStack[this.#transformationStack.length - 1];
    // Get the transformation matrix from the transformation object
    const transformMatrix = transformation.getMatrix();
    // Multiply current transformation on the right: newMatrix = currentMatrix * transformMatrix
    const newMatrix = new Array(16);
    Rn.timesMatrix(newMatrix, currentMatrix, transformMatrix);
    // Push the new combined transformation onto the stack
    this.#transformationStack.push(newMatrix);
  }

   /**
   * Visit an Appearance node - push it onto the appearance stack
   * @param {Appearance} appearance
   */
  visitAppearance(appearance) {
    this.#appearanceStack.push(appearance);
  }

  /**
   * Get an attribute value from the appearance stack with namespace support
   * @param {string} prefix - Namespace prefix (e.g., "point", "line", "polygon")
   * @param {string} attribute - Base attribute name (e.g., "diffuseColor")
   * @param {*} defaultValue - Default value if not found
   * @returns {*} The attribute value
   */
  getAppearanceAttribute(prefix, attribute, defaultValue) {
    // Search from top of stack (most specific) to bottom (most general)
    for (let i = this.#appearanceStack.length - 1; i >= 0; i--) {
      const appearance = this.#appearanceStack[i];
      
      // First try namespaced attribute (e.g., "point.diffuseColor")
      if (prefix) {
        const namespacedKey = prefix + '.' + attribute;
        const namespacedValue = appearance.getAttribute(namespacedKey);
        if (namespacedValue !== INHERITED) {
          return namespacedValue;
        }
      }
      
      // Then try base attribute (e.g., "diffuseColor")
      const baseValue = appearance.getAttribute(attribute);
      if (baseValue !== INHERITED) {
        return baseValue;
      }
    }
    
    // Return default if not found in any appearance
    return defaultValue;
  }

  /**
   * Convert a Color object to CSS string, or return string as-is
   * @param {*} colorValue - Color object or string
   * @returns {string} CSS color string
   */
  toCSSColor(colorValue) {
    if (colorValue && typeof colorValue.toCSSString === 'function') {
      return colorValue.toCSSString();
    }
    return String(colorValue);
  }

  /**
   * Get a boolean appearance attribute with fallback
   * @param {string} attribute - Attribute name
   * @param {boolean} defaultValue - Default value
   * @returns {boolean}
   */
  getBooleanAttribute(attribute, defaultValue) {
    return Boolean(this.getAppearanceAttribute(null, attribute, defaultValue));
  }

  /**
   * Get a numeric appearance attribute with fallback
   * @param {string} attribute - Attribute name
   * @param {number} defaultValue - Default value
   * @returns {number}
   */
  getNumericAttribute(attribute, defaultValue) {
    const ret = this.getAppearanceAttribute(null, attribute, defaultValue);
     return Number(ret);
  }

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

    // Get current transformation from path
    const currentMatrix = this.getCurrentTransformation();
    
    const numVertices = geometry.getNumPoints ? geometry.getNumPoints() : 
                       geometry.getNumVertices ? geometry.getNumVertices() : 
                       vertices.shape[0];
    
    for (let i = 0; i < numVertices; i++) {
      const vertex = vertices.getSlice(i);
      if (vertex.length >= 3) {
        const projected = this.#projectPoint(vertex, currentMatrix);
        if (projected) {
          this.#drawPoint(projected.x, projected.y);
        }
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

    const currentMatrix = this.getCurrentTransformation();

    // Render all edges
    if (indices) {
      // 2D array of edge indices
      for (let i = 0; i < indices.rows.length; i++) {
        const edgeIndices = indices.getRow(i);
        this.#drawPolyline(vertices, edgeIndices, currentMatrix);
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
    const currentMatrix = this.getCurrentTransformation();

    // Get appearance attributes
    const faceColor = this.getAppearanceAttribute('polygon', CommonAttributes.DIFFUSE_COLOR, '#cccccc');

    for (let i = 0; i < geometry.getNumFaces(); i++) {
      const faceIndices = indices.getRow(i);
      
      // Fill faces
      ctx.fillStyle = this.toCSSColor(faceColor);
      this.#drawPolygon(vertices, faceIndices, currentMatrix, true);
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
   * Project a 3D point to 2D NDC coordinates
   * @private
   * @param {number[]} vertex - 3D vertex [x, y, z] or [x, y, z, w]
   * @param {number[]} transformMatrix - Transformation matrix
   * @returns {{x: number, y: number}|null} NDC coordinates [-1,1] or null if behind camera
   */
  #projectPoint(vertex, transformMatrix) {
    // Apply transformation to get NDC coordinates
    let tvertex = Rn.matrixTimesVector(null, transformMatrix, vertex);
    Pn.dehomogenize(tvertex, tvertex);
    
    const ndcX = tvertex[0];  
    const ndcY = tvertex[1];
    const ndcZ = tvertex[2];

    // Clip check - reject points outside NDC cube
    // if (ndcZ < -1 || ndcZ > 1) return null;

    // Return NDC coordinates - Canvas transform will handle screen conversion
    return { x: ndcX, y: ndcY };
  }

  /**
   * Draw a point on the canvas
   * @private
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  #drawPoint(x, y) {
    const ctx = this.#context;
    const size = this.getNumericAttribute(CommonAttributes.POINT_SIZE, .03);
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
      const vertex = vertices.getSlice(index);
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
      const vertex = vertices.getSlice(index);
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
