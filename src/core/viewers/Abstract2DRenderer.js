// Abstract base class for 2D renderers
// Handles device-independent scene graph traversal and state management
// Subclasses implement device-specific drawing operations

import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import * as Rn from '../math/Rn.js';
import { INHERITED } from '../scene/Appearance.js';
import * as CameraUtility from '../util/CameraUtility.js';
import { Color } from '../util/Color.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { EffectiveAppearance } from '../shader/EffectiveAppearance.js';
import { ShaderUtility } from '../shader/ShaderUtility.js';

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/Appearance.js').Appearance} Appearance */
/** @typedef {import('../scene/Transformation.js').Transformation} Transformation */
/** @typedef {import('../scene/Camera.js').Camera} Camera */
/** @typedef {import('./Abstract2DViewer.js').Abstract2DViewer} Abstract2DViewer */

/**
 * Abstract base class for 2D rendering visitors.
 * Handles scene graph traversal, appearance stack, and transformation stack.
 * Subclasses implement device-specific drawing operations.
 */
export class Abstract2DRenderer extends SceneGraphVisitor {

  /** @type {Abstract2DViewer} */
  #viewer;

  /** @type {Camera} */
  #camera;

  /** @type {EffectiveAppearance} Current effective appearance for hierarchical attribute resolution */
  #effectiveAppearance;

  /** @type {EffectiveAppearance[]} Stack of effective appearances for restoring after traversal */
  #effectiveAppearanceStack = [];

  /** @type {number[][]} Stack of transformation matrices for hierarchical transformations */
  #transformationStack = [];

  /** @type {number[]} Combined world-to-NDC transformation matrix */
  #world2ndc;

  /**
   * Create a new Abstract2DRenderer
   * @param {Abstract2DViewer} viewer - The viewer
   */
  constructor(viewer) {
    super();
    this.#viewer = viewer;
    this.#camera = viewer._getCamera();
    this.#world2ndc = new Array(16);
    // Initialize with an empty root EffectiveAppearance
    this.#effectiveAppearance = EffectiveAppearance.create();
  }

  // ============================================================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ============================================================================

  /**
   * Begin rendering - device-specific initial setup
   * Called after world2ndc is computed but before it's applied
   * Device should setup context, clear surface, draw background
   * @protected
   * @abstract
   */
  _beginRender() {
    throw new Error('Abstract method _beginRender() must be implemented by subclass');
  }

  /**
   * End rendering - device-specific cleanup
   * Called after scene traversal is complete
   * @protected
   * @abstract
   */
  _endRender() {
    throw new Error('Abstract method _endRender() must be implemented by subclass');
  }

  /**
   * Apply appearance attributes to device context
   * Called when an Appearance is visited, should set device-specific state
   * (Canvas2D: set ctx properties; SVG: cache values or set group attributes)
   * @protected
   * @abstract
   */
  _applyAppearance() {
    throw new Error('Abstract method _applyAppearance() must be implemented by subclass');
  }

  /**
   * Begin a nested group for a specific primitive type (point/line/face)
   * Allows setting type-specific appearance attributes
   * @protected
   * @abstract
   * @param {string} type - Primitive type: CommonAttributes.POINT, CommonAttributes.LINE, or CommonAttributes.POLYGON
   */
  _beginPrimitiveGroup(type) {
    throw new Error('Abstract method _beginPrimitiveGroup() must be implemented by subclass');
  }

  /**
   * End the nested group for a primitive type
   * @protected
   * @abstract
   */
  _endPrimitiveGroup() {
    throw new Error('Abstract method _endPrimitiveGroup() must be implemented by subclass');
  }

  /**
   * Push transformation state (device-specific)
   * @protected
   * @abstract
   */
  _pushTransformState() {
    throw new Error('Abstract method _pushTransformState() must be implemented by subclass');
  }

  /**
   * Pop transformation state (device-specific)
   * @protected
   * @abstract
   */
  _popTransformState() {
    throw new Error('Abstract method _popTransformState() must be implemented by subclass');
  }

  /**
   * Apply a transformation matrix (device-specific)
   * @protected
   * @abstract
   * @param {number[]} matrix - 4x4 transformation matrix
   */
  _applyTransform(matrix) {
    throw new Error('Abstract method _applyTransform() must be implemented by subclass');
  }

  /**
   * Draw a single point (device-specific primitive)
   * @protected
   * @abstract
   * @param {number[]} point - Point coordinates [x, y, z, w]
   */
  _drawPoint(point, color = null) {
    throw new Error('Abstract method _drawPoint() must be implemented by subclass');
  }

  /**
   * Draw a polyline through multiple points (device-specific primitive)
   * @protected
   * @abstract
   * @param {*} vertices - Vertex coordinate data
   * @param {number[]} indices - Array of vertex indices
   */
  _drawPolyline(vertices, colors, indices) {
    throw new Error('Abstract method _drawPolyline() must be implemented by subclass');
  }

  /**
   * Draw a filled polygon (device-specific primitive)
   * @protected
   * @abstract
   * @param {*} vertices - Vertex coordinate data
   * @param {number[]} indices - Array of vertex indices
   * @param {boolean} fill - Whether to fill the polygon
   */
  _drawPolygon(vertices, colors, indices, fill) {
    throw new Error('Abstract method _drawPolygon() must be implemented by subclass');
  }

  /**
   * Extract 2D point from vertex data (device-specific)
   * @protected
   * @abstract
   * @param {number[]} vertex - Vertex coordinates [x, y, z, w]
   * @returns {{x: number, y: number}} 2D point
   */
  _extractPoint(vertex) {
    return vertex;    // by default, return the vertex as is
  }

  // ============================================================================
  // PROTECTED GETTERS - Access to internal state
  // ============================================================================

  /**
   * Get the viewer
   * @protected
   * @returns {Abstract2DViewer}
   */
  _getViewer() {
    return this.#viewer;
  }

  /**
   * Get the camera
   * @protected
   * @returns {Camera}
   */
  _getCamera() {
    return this.#camera;
  }

  /**
   * Get the world-to-NDC transformation matrix
   * @protected
   * @returns {number[]}
   */
  _getWorld2NDC() {
    return this.#world2ndc;
  }

  /**
   * Get the current EffectiveAppearance (for subclass use)
   * @protected
   * @returns {EffectiveAppearance}
   */
  _getEffectiveAppearance() {
    return this.#effectiveAppearance;
  }
  
  /**
   * Get the hierarchy of appearances (for backwards compatibility)
   * Returns the appearance hierarchy from most specific (deepest) to least (root)
   * @protected
   * @returns {Appearance[]}
   */
  _getAppearanceHierarchy() {
    return this.#effectiveAppearance.getAppearanceHierarchy();
  }

  /**
   * Get the transformation stack
   * @protected
   * @returns {number[][]}
   */
  _getTransformationStack() {
    return this.#transformationStack;
  }

  // ============================================================================
  // IMPLEMENTED METHODS - Device-independent scene graph traversal
  // ============================================================================

  /**
   * Begin rendering - device-independent setup + world2ndc application
   * Computes world2ndc, calls device-specific _beginRender(), then applies world2ndc transform
   */
  beginRender() {
    const cameraPath = this.#viewer.getCameraPath();
    const sceneRoot = this.#viewer.getSceneRoot();

    if (!cameraPath || !sceneRoot) {
      return false;
    }

    // Compute world-to-NDC transformation
    const world2Cam = cameraPath.getInverseMatrix();
    const cam2ndc = CameraUtility.getCameraToNDC(this.#viewer);
    Rn.timesMatrix(this.#world2ndc, cam2ndc, world2Cam);
    this.#transformationStack = [this.#world2ndc.slice()]; // Clone the matrix

    // Device-specific setup (context, clear, background)
    this._beginRender();

    // Apply world2ndc transformation
    // This is device-independent: push state, apply transform
    this._pushTransformState();
    this._applyTransform(this.#world2ndc);

    return true;
  }

  /**
   * End rendering - device-independent cleanup
   * Pops the world2ndc transform state, then calls device-specific _endRender()
   */
  endRender() {
    // Pop the world2ndc transformation state
    this._popTransformState();

    // Device-specific cleanup
    this._endRender();
  }

  /**
   * Render the scene (device-independent orchestration)
   */
  render() {
    const sceneRoot = this.#viewer.getSceneRoot();

    if (!this.beginRender()) {
      return;
    }

    // Render the scene
    try {
      console.log('Calling sceneRoot.accept(this)');
      sceneRoot.accept(this);
      console.log('sceneRoot.accept(this) completed');
    } catch (error) {
      console.error('Rendering error:', error);
    }

    this.endRender();
  }

  /**
   * Get the current transformation matrix from the top of the stack
   * @returns {number[]} The current transformation matrix
   */
  getCurrentTransformation() {
    return this.#transformationStack[this.#transformationStack.length - 1];
  }

  /**
   * Visit a SceneGraphComponent - device-independent traversal
   * @param {SceneGraphComponent} component
   */
  visitComponent(component) {
    if (!component.isVisible()) {
      return;
    }

    // Push this component onto the path for transformation calculations
    this.pushPath(component);
    
    let hasTransformation = false;
    let hasAppearance = false;
    
    try {
      // Check if we need to save state for transformation
      const transformation = component.getTransformation();
      if (transformation) {
        hasTransformation = true;
        this._pushTransformState(); // Device-specific
      }
      
      // Check if we need to track appearance for cleanup
      const appearance = component.getAppearance();
      if (appearance) {
        hasAppearance = true;
      }
       
      // Let childrenAccept handle the actual visiting of transformation, appearance, and children
      component.childrenAccept(this);
    } finally {
      // Restore parent EffectiveAppearance if we visited an Appearance
      if (hasAppearance) {
        this.#effectiveAppearance = this.#effectiveAppearanceStack.pop();
      }

      // Restore transformation state and pop our tracking stack
      if (hasTransformation) {
        this._popTransformState(); // Device-specific
        this.#transformationStack.pop(); // Keep our stack in sync
      }
      
      // Pop the component from the path
      this.popPath();
    }
  }

  /**
   * Visit a Transformation node - update transformation stack
   * @param {Transformation} transformation
   */
  visitTransformation(transformation) {
    // Get the transformation matrix from the transformation object
    const transformMatrix = transformation.getMatrix();
    
    // Apply the transformation (device-specific)
    this._applyTransform(transformMatrix);
    
    // Keep our own stack for compatibility (but device may handle accumulation differently)
    const currentMatrix = this.#transformationStack[this.#transformationStack.length - 1];
    const newMatrix = new Array(16);
    Rn.timesMatrix(newMatrix, currentMatrix, transformMatrix);
    this.#transformationStack.push(newMatrix);
  }

  /**
   * Visit an Appearance node - create child effective appearance and apply to device
   * @param {Appearance} appearance
   */
  visitAppearance(appearance) {
    // Save current EffectiveAppearance (will be restored in visitComponent's finally block)
    this.#effectiveAppearanceStack.push(this.#effectiveAppearance);
    // Create a new child EffectiveAppearance
    this.#effectiveAppearance = this.#effectiveAppearance.createChild(appearance);
    // Apply appearance attributes to device context (set state once)
    this._applyAppearance();
  }

  /**
   * Get an attribute value using EffectiveAppearance with namespace support.
   * 
   * This method leverages EffectiveAppearance's automatic namespace stripping.
   * For example, querying "CommonAttributes.POINT_SHADERdiffuseColor" will try:
   *   1. "CommonAttributes.POINT_SHADERdiffuseColor" (full namespaced key)
   *   2. "diffuseColor" (base key)
   * 
   * @param {string} prefix - Namespace prefix (e.g., "CommonAttributes.POINT_SHADER", "line", "polygon")
   * @param {string} attribute - Base attribute name (e.g., "diffuseColor")
   * @param {*} defaultValue - Default value if not found
   * @returns {*} The attribute value
   */
  getAppearanceAttribute(prefix, attribute, defaultValue) {
    // Use ShaderUtility to create the namespaced key if prefix is provided
    const key = prefix ? ShaderUtility.nameSpace(prefix, attribute) : attribute;
    
    // EffectiveAppearance handles namespace stripping automatically
    return this.#effectiveAppearance.getAttribute(key, defaultValue);
  }

  /**
   * Convert a Color object to CSS string, or return string as-is
   * Delegates to Color.toCSSColor() static method
   * @param {*} colorValue - Color object or string
   * @returns {string} CSS color string
   */
  toCSSColor(colorValue) {
    return Color.toCSSColor(colorValue);
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

  // ============================================================================
  // GEOMETRY RENDERING - Device-independent rendering logic
  // ============================================================================

  /**
   * Visit a PointSet geometry - renders vertices as points
   * @param {PointSet} pointSet - The point set to render
   */
  visitPointSet(pointSet) {
    // PointSet only renders vertices as points (based on VERTEX_DRAW flag)
    this._renderVerticesAsPoints(pointSet);
  }

  /**
   * Visit an IndexedLineSet geometry - renders vertices and edges
   * @param {IndexedLineSet} lineSet - The line set to render
   */
  visitIndexedLineSet(lineSet) {
    // IndexedLineSet renders vertices as points (if VERTEX_DRAW), then edges as lines (if EDGE_DRAW)
    this._renderVerticesAsPoints(lineSet);
    this._renderEdgesAsLines(lineSet);
  }

  /**
   * Visit an IndexedFaceSet geometry - renders vertices, edges, and faces
   * @param {IndexedFaceSet} faceSet - The face set to render
   */
  visitIndexedFaceSet(faceSet) {
    // IndexedFaceSet renders all three primitive types based on draw flags:
    // 1. Vertices as points (if VERTEX_DRAW)
    // 2. Edges as lines (if EDGE_DRAW) 
    // 3. Faces as filled polygons (if FACE_DRAW)
    this._renderVerticesAsPoints(faceSet);
    this._renderEdgesAsLines(faceSet);
    this._renderFacesAsPolygons(faceSet);
  }

  /**
   * Helper method to render vertices as points for any geometry
   * @protected
   * @param {*} geometry - The geometry object
   */
  _renderVerticesAsPoints(geometry) {
    if (!this.getBooleanAttribute(CommonAttributes.VERTEX_DRAW, true)) {
      return;
    }

    const vertices = geometry.getVertexCoordinates();
    const colors = geometry.getVertexColors();
    if (!vertices) return;
    
    // Get point color with namespace fallback
    const pointColor = this.getAppearanceAttribute(CommonAttributes.POINT_SHADER, CommonAttributes.DIFFUSE_COLOR, '#ff0000');

    const numVertices = geometry.getNumPoints ? geometry.getNumPoints() : 
                       geometry.getNumVertices ? geometry.getNumVertices() : 
                       vertices.shape[0];
    
    // Begin nested group for points
    this._beginPrimitiveGroup(CommonAttributes.POINT);
    
    for (let i = 0; i < numVertices; i++) {
        this._drawPoint(vertices.getSlice(i), colors ? colors.getSlice(i) : null);
    }
    
    // End nested group for points
    this._endPrimitiveGroup();
  }

  /**
   * Helper method to render edges as lines for indexed geometries
   * @protected
   * @param {IndexedLineSet} geometry - The geometry object (IndexedLineSet or IndexedFaceSet)
   */
  _renderEdgesAsLines(geometry) {
    if (!this.getBooleanAttribute(CommonAttributes.EDGE_DRAW, true)) {
      return;
    }

    const vertices = geometry.getVertexCoordinates();
    
    // Get appropriate edge indices - try both convenience method and direct attribute access
    let indices = geometry.getEdgeIndices();
     // Fallback: try getting indices directly from edge attributes
    if (!indices && geometry.getEdgeAttributes) {
      const edgeAttrs = geometry.getEdgeAttributes();
      if (edgeAttrs && edgeAttrs.size > 0) {
        indices = geometry.getEdgeAttribute(GeometryAttribute.INDICES);
      }
    }
    const colors = geometry.getEdgeAttribute(GeometryAttribute.COLORS);
    
    this._beginPrimitiveGroup(CommonAttributes.LINE);
    
    // Render all edges
    if (indices) {
      // DataList of edge indices - use item() which works for both RegularDataList and VariableDataList
      for (let i = 0; i < indices.length(); i++) {
        this._drawPolyline(vertices, colors ? colors.item(i) : null, indices.item(i));
      }
    } else {
      // Handle flat array case
      console.warn('Edge indices format not supported yet');
    }
    
    // End nested group for lines
    this._endPrimitiveGroup();
  }

  /**
   * Helper method to render faces as filled polygons for indexed face sets
   * @protected
   * @param {*} geometry - The geometry object (IndexedFaceSet)
   */
  _renderFacesAsPolygons(geometry) {
    if (!this.getBooleanAttribute(CommonAttributes.FACE_DRAW, true)) {
      return;
    }

    const vertices = geometry.getVertexCoordinates();
    const indices = geometry.getFaceIndices();
    if (!vertices || !indices) return;

    const colors = geometry.getFaceAttribute(GeometryAttribute.COLORS);


    // Get appearance attributes
    const faceColor = this.getAppearanceAttribute(CommonAttributes.POLYGON_SHADER, CommonAttributes.DIFFUSE_COLOR, '#cccccc');

    // Begin nested group for faces
    this._beginPrimitiveGroup(CommonAttributes.POLYGON);
    
    // DataList of face indices - use item() which works for both RegularDataList and VariableDataList
    for (let i = 0; i < indices.length(); i++) {
      const faceIndices = indices.item(i);
      this._drawPolygon(vertices, colors ? colors.item(i) : null, faceIndices, true);
    }
    
    // End nested group for faces
    this._endPrimitiveGroup();
  }

  /**
   * Helper method to extract edge indices from face indices
   * @protected
   * @param {*} faceIndices - Face indices data
   * @param {number} numFaces - Number of faces
   * @returns {*} Edge indices data structure
   */
  _extractEdgesFromFaces(faceIndices, numFaces) {
    // For now, return null to disable edge rendering for faces
    // TODO: Implement proper edge extraction from face topology
    return faceIndices;
  }
}

