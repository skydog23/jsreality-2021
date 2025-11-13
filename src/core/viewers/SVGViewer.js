// SVG implementation of the Viewer interface
// Provides vector rendering using SVG DOM

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
 * An SVG-based viewer implementation for jReality scene graphs.
 * Renders geometry as vector graphics using SVG DOM elements.
 */
export class SVGViewer extends Viewer {

  /** @type {SVGSVGElement} */
  #svgElement;

  /** @type {SceneGraphComponent|null} */
  #sceneRoot = null;

  /** @type {SceneGraphPath|null} */
  #cameraPath = null;

  /** @type {number} */
  #width = 800;

  /** @type {number} */
  #height = 600;

  /**
   * Create a new SVG viewer
   * @param {HTMLElement} container - The container element for the SVG
   * @param {Object} [options] - Configuration options
   * @param {number} [options.width=800] - SVG width
   * @param {number} [options.height=600] - SVG height
   */
  constructor(container, options = {}) {
    super();
    
    if (!(container instanceof HTMLElement)) {
      throw new Error('SVGViewer requires an HTMLElement container');
    }

    this.#width = options.width || 800;
    this.#height = options.height || 600;

    this.#svgElement = this.#createSVG();
    container.appendChild(this.#svgElement);
  }

  /**
   * Create the SVG element
   * @private
   * @returns {SVGSVGElement}
   */
  #createSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', this.#width);
    svg.setAttribute('height', this.#height);
    svg.setAttribute('viewBox', `0 0 ${this.#width} ${this.#height}`);
    svg.style.border = '1px solid #ccc';
    return svg;
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
    console.log('SVGViewer.render() called');
    console.log('  - Scene root:', this.#sceneRoot?.getName());
    console.log('  - Camera path:', this.#cameraPath);
    console.log('  - SVG element:', this.#svgElement);
    
    // Clear previous content
    while (this.#svgElement.firstChild) {
      this.#svgElement.removeChild(this.#svgElement.firstChild);
    }
    console.log('  - SVG element cleared');

    // Get camera
    const camera = this._getCamera();
    console.log('  - Camera:', camera);
    if (!camera) {
      console.warn('No camera found in camera path');
      return;
    }

    // Create rendering visitor
    console.log('  - Creating SVGRenderer...');
    const renderer = new SVGRenderer(this);
    console.log('  - Calling renderer.render()...');
    renderer.render();
    console.log('SVGViewer.render() complete');
  }

  hasViewingComponent() {
    return true;
  }

  getViewingComponent() {
    return this.#svgElement;
  }

  getViewingComponentSize() {
    return new Dimension(this.#width, this.#height);
  }

  canRenderAsync() {
    return false; // SVG rendering is synchronous
  }

  renderAsync() {
    this.render();
  }

  // SVG-specific methods

  /**
   * Export the SVG as a string
   * @returns {string} SVG markup
   */
  exportSVG() {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(this.#svgElement);
  }

  /**
   * Get the SVG element
   * @protected
   * @returns {SVGSVGElement}
   */
  _getSVGElement() {
    return this.#svgElement;
  }

  /**
   * Get camera from camera path
   * @protected
   * @returns {Camera|null}
   */
  _getCamera() {
    console.log('_getCamera() called');
    console.log('  - cameraPath:', this.#cameraPath);
    
    if (!this.#cameraPath || this.#cameraPath.getLength() === 0) {
      console.log('  - No camera path or empty path');
      return null;
    }
    
    console.log('  - cameraPath length:', this.#cameraPath.getLength());
    const lastElement = this.#cameraPath.getLastElement();
    console.log('  - lastElement:', lastElement);
    console.log('  - lastElement type:', lastElement?.constructor?.name);
    
    // The last element is typically a SceneGraphComponent that contains the camera
    if (lastElement && lastElement.getCamera) {
      const camera = lastElement.getCamera();
      console.log('  - Camera from component:', camera);
      return camera;
    }
    
    // Fallback: check if the element itself is a Camera
    if (lastElement && lastElement.constructor.name === 'Camera') {
      console.log('  - lastElement is directly a Camera');
      return lastElement;
    }
    
    console.log('  - No camera found');
    return null;
  }

  /**
   * Get width
   * @protected
   * @returns {number}
   */
  _getWidth() {
    return this.#width;
  }

  /**
   * Get height
   * @protected
   * @returns {number}
   */
  _getHeight() {
    return this.#height;
  }

  /**
   * Compute projection matrix for the camera
   * @protected
   * @param {Camera} camera
   * @returns {number[]} 4x4 projection matrix
   */
  _computeCam2NDCMatrix(camera) {
    const width = this.#width;
    const height = this.#height;
    const aspect = width / height;

    const projMatrix = new Array(16);
    
    if (camera.isPerspective()) {
      // Perspective projection
      const fov = camera.getFieldOfView() * Math.PI / 180;
      const near = camera.getNear();
      const far = camera.getFar();
      
      P3.makePerspectiveProjectionMatrix(projMatrix, fov, aspect, near, far);
    } else {
      // Orthographic projection
      const size = 5;
      const left = -size * aspect;
      const right = size * aspect;
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
 * SVG rendering visitor that traverses the scene graph and renders geometry as SVG
 */
class SVGRenderer extends SceneGraphVisitor {

  /** @type {SVGViewer} */
  #viewer;

  /** @type {SVGSVGElement} */
  #svgElement;

  /** @type {Camera} */
  #camera;

  /** @type {Appearance[]} Stack of appearances for hierarchical attribute resolution */
  #appearanceStack = [];

  /** @type {SVGGElement[]} Stack of SVG group elements for hierarchical transforms */
  #groupStack = [];

  /** @type {number[]} World-to-NDC transformation matrix */
  #world2ndc;

  /** @type {number} SVG viewport width */
  #width;

  /** @type {number} SVG viewport height */
  #height;

  /**
   * Create a new SVG renderer
   * @param {SVGViewer} viewer - The viewer
   */
  constructor(viewer) {
    super();
    this.#viewer = viewer;
    this.#svgElement = viewer._getSVGElement();
    this.#camera = viewer._getCamera();
    this.#width = viewer._getWidth();
    this.#height = viewer._getHeight();
    this.#world2ndc = new Array(16);
  }

  render() {
    console.log('SVGRenderer.render() called');
    
    const cameraPath = this.#viewer.getCameraPath();
    const sceneRoot = this.#viewer.getSceneRoot();
    
    console.log('  - Camera path:', cameraPath);
    console.log('  - Scene root:', sceneRoot?.getName());

    if (!cameraPath || !sceneRoot) {
      console.warn('SVGRenderer: Missing camera path or scene root');
      return;
    }

    // Get world-to-camera transformation
    console.log('  - Computing transformations...');
    const world2Cam = cameraPath.getInverseMatrix();
    console.log('  - world2Cam matrix:', world2Cam);
    const cam2ndc = this.#viewer._computeCam2NDCMatrix(this.#camera);
    console.log('  - cam2ndc matrix:', cam2ndc);
    Rn.timesMatrix(this.#world2ndc, cam2ndc, world2Cam);
    console.log('  - world2ndc matrix:', this.#world2ndc);

    // Create root group with NDC-to-screen transform
    console.log('  - Creating root group...');
    const rootGroup = this.#createRootGroup();
    this.#svgElement.appendChild(rootGroup);
    this.#groupStack.push(rootGroup);
    console.log('  - Root group created and added to SVG');

    // Render background
    console.log('  - Rendering background...');
    this.#renderBackground();

    // Render the scene
    try {
      console.log('  - Starting scene traversal...');
      console.log('  - Scene root has', sceneRoot.getChildComponents().length, 'children');
      sceneRoot.accept(this);
      console.log('  - Scene traversal completed');
      console.log('  - Total SVG children:', this.#svgElement.children.length);
    } catch (error) {
      console.error('SVG rendering error:', error);
      console.error('Stack trace:', error.stack);
    }
    
    console.log('SVGRenderer.render() complete');
  }

  /**
   * Create the root SVG group with coordinate transform
   * @private
   * @returns {SVGGElement}
   */
  #createRootGroup() {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Apply NDC-to-screen transformation
    // NDC space [-1,1] x [-1,1] -> Screen space [0,width] x [0,height]
    // with Y-axis flip (NDC +Y up, Screen +Y down)
    const scaleX = this.#width / 2;
    const scaleY = -this.#height / 2;
    const translateX = this.#width / 2;
    const translateY = this.#height / 2;
    
    g.setAttribute('transform', 
      `translate(${translateX}, ${translateY}) scale(${scaleX}, ${scaleY})`);
    
    return g;
  }

  /**
   * Render background rectangle
   * @private
   */
  #renderBackground() {
    this.#appearanceStack.push(this.#viewer.getSceneRoot().getAppearance());
    
    const backgroundColor = this.getAppearanceAttribute(null, 
      CommonAttributes.BACKGROUND_COLOR, CommonAttributes.BACKGROUND_COLOR_DEFAULT);
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '-1');
    rect.setAttribute('y', '-1');
    rect.setAttribute('width', '2');
    rect.setAttribute('height', '2');
    rect.setAttribute('fill', this.toCSSColor(backgroundColor));
    
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    currentGroup.appendChild(rect);
    
    this.#appearanceStack.pop();
  }

  /**
   * Visit a SceneGraphComponent
   * @param {SceneGraphComponent} component
   */
  visitComponent(component) {
    console.log('SVGRenderer.visitComponent:', component.getName());
    
    if (!component.isVisible()) {
      console.log('  - Component not visible, skipping');
      return;
    }

    this.pushPath(component);
    
    let hasTransformation = false;
    let hasAppearance = false;
    let transformGroup = null;
    
    try {
      // Check for transformation
      const transformation = component.getTransformation();
      if (transformation) {
        hasTransformation = true;
        transformGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const currentGroup = this.#groupStack[this.#groupStack.length - 1];
        currentGroup.appendChild(transformGroup);
        this.#groupStack.push(transformGroup);
      }
      
      // Check for appearance
      const appearance = component.getAppearance();
      if (appearance) {
        hasAppearance = true;
      }
      
      // Visit children
      component.childrenAccept(this);
    } finally {
      // Pop appearance from stack
      if (hasAppearance) {
        this.#appearanceStack.pop();
      }

      // Pop transform group
      if (hasTransformation) {
        this.#groupStack.pop();
      }
      
      this.popPath();
    }
  }

  /**
   * Visit a Transformation node
   * @param {Transformation} transformation
   */
  visitTransformation(transformation) {
    // Get the transformation matrix
    const matrix = transformation.getMatrix();
    
    // Apply world-to-NDC transform to get final NDC coordinates
    const finalMatrix = new Array(16);
    Rn.timesMatrix(finalMatrix, this.#world2ndc, matrix);
    
    // Convert to SVG transform format (2D affine)
    // SVG uses: matrix(a b c d e f)
    // which represents: [a c e]  [x]
    //                   [b d f]  [y]
    //                   [0 0 1]  [1]
    const a = finalMatrix[0];
    const b = finalMatrix[1];
    const c = finalMatrix[4];
    const d = finalMatrix[5];
    const e = finalMatrix[3];
    const f = finalMatrix[7];
    
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    currentGroup.setAttribute('transform', `matrix(${a} ${b} ${c} ${d} ${e} ${f})`);
  }

  /**
   * Visit an Appearance node
   * @param {Appearance} appearance
   */
  visitAppearance(appearance) {
    this.#appearanceStack.push(appearance);
  }

  /**
   * Get an attribute value from the appearance stack
   * @param {string} prefix - Namespace prefix
   * @param {string} attribute - Attribute name
   * @param {*} defaultValue - Default value
   * @returns {*}
   */
  getAppearanceAttribute(prefix, attribute, defaultValue) {
    for (let i = this.#appearanceStack.length - 1; i >= 0; i--) {
      const appearance = this.#appearanceStack[i];
      
      if (prefix) {
        const namespacedKey = prefix + '.' + attribute;
        const namespacedValue = appearance.getAttribute(namespacedKey);
        if (namespacedValue !== INHERITED) {
          return namespacedValue;
        }
      }
      
      const baseValue = appearance.getAttribute(attribute);
      if (baseValue !== INHERITED) {
        return baseValue;
      }
    }
    
    return defaultValue;
  }

  /**
   * Convert a Color object to CSS string
   * @param {*} colorValue - Color object or string
   * @returns {string}
   */
  toCSSColor(colorValue) {
    if (colorValue && typeof colorValue.toCSSString === 'function') {
      return colorValue.toCSSString();
    }
    return String(colorValue);
  }

  /**
   * Get a boolean appearance attribute
   * @param {string} attribute - Attribute name
   * @param {boolean} defaultValue - Default value
   * @returns {boolean}
   */
  getBooleanAttribute(attribute, defaultValue) {
    return Boolean(this.getAppearanceAttribute(null, attribute, defaultValue));
  }

  /**
   * Get a numeric appearance attribute
   * @param {string} attribute - Attribute name
   * @param {number} defaultValue - Default value
   * @returns {number}
   */
  getNumericAttribute(attribute, defaultValue) {
    const ret = this.getAppearanceAttribute(null, attribute, defaultValue);
    return Number(ret);
  }

  visitPointSet(pointSet) {
    console.log('SVGRenderer.visitPointSet - numPoints:', pointSet.getNumPoints());
    this.#renderVerticesAsPoints(pointSet);
  }

  visitIndexedLineSet(lineSet) {
    console.log('SVGRenderer.visitIndexedLineSet - numPoints:', lineSet.getNumPoints());
    this.#renderVerticesAsPoints(lineSet);
    this.#renderEdgesAsLines(lineSet);
  }

  visitIndexedFaceSet(faceSet) {
    console.log('SVGRenderer.visitIndexedFaceSet - numFaces:', faceSet.getNumFaces());
    this.#renderVerticesAsPoints(faceSet);
    this.#renderEdgesAsLines(faceSet);
    this.#renderFacesAsPolygons(faceSet);
  }

  /**
   * Render vertices as SVG circles
   * @private
   * @param {*} geometry
   */
  #renderVerticesAsPoints(geometry) {
    if (!this.getBooleanAttribute(CommonAttributes.VERTEX_DRAW, true)) {
      return;
    }

    const vertices = geometry.getVertexCoordinates();
    if (!vertices) return;

    const pointColor = this.getAppearanceAttribute('point', CommonAttributes.DIFFUSE_COLOR, '#ff0000');
    const pointSize = this.getNumericAttribute(CommonAttributes.POINT_SIZE, 0.1);

    const numVertices = geometry.getNumPoints ? geometry.getNumPoints() : 
                       geometry.getNumVertices ? geometry.getNumVertices() : 
                       vertices.shape[0];
    
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    
    for (let i = 0; i < numVertices; i++) {
      const vertex = vertices.getSlice(i);
      if (vertex.length >= 2) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', vertex[0]);
        circle.setAttribute('cy', vertex[1]);
        circle.setAttribute('r', pointSize / 2);
        circle.setAttribute('fill', this.toCSSColor(pointColor));
        currentGroup.appendChild(circle);
      }
    }
  }

  /**
   * Render edges as SVG polylines
   * @private
   * @param {IndexedLineSet} geometry
   */
  #renderEdgesAsLines(geometry) {
    if (!this.getBooleanAttribute(CommonAttributes.EDGE_DRAW, true)) {
      return;
    }

    const vertices = geometry.getVertexCoordinates();
    let indices = null;
    
    if (geometry.getEdgeIndices) {
      indices = geometry.getEdgeIndices();
    }
    
    if (!indices && geometry.getEdgeAttributes().size > 0) {
      indices = geometry.getEdgeAttribute(GeometryAttribute.INDICES) || 
                geometry.getEdgeAttribute('indices');
    }
    
    if (!indices) return;

    const lineColor = this.getAppearanceAttribute('line', CommonAttributes.DIFFUSE_COLOR, '#000000');
    const lineWidth = this.getNumericAttribute(CommonAttributes.LINE_WIDTH, 1);
    
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    
    for (let i = 0; i < indices.rows.length; i++) {
      const edgeIndices = indices.getRow(i);
      const points = [];
      
      for (const index of edgeIndices) {
        const vertex = vertices.getSlice(index);
        points.push(`${vertex[0]},${vertex[1]}`);
      }
      
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', points.join(' '));
      polyline.setAttribute('stroke', this.toCSSColor(lineColor));
      polyline.setAttribute('stroke-width', lineWidth * 0.01); // Scale for NDC space
      polyline.setAttribute('fill', 'none');
      currentGroup.appendChild(polyline);
    }
  }

  /**
   * Render faces as SVG polygons
   * @private
   * @param {*} geometry
   */
  #renderFacesAsPolygons(geometry) {
    if (!this.getBooleanAttribute(CommonAttributes.FACE_DRAW, true)) {
      return;
    }

    const vertices = geometry.getVertexCoordinates();
    const indices = geometry.getFaceIndices();
    if (!vertices || !indices) return;

    const faceColor = this.getAppearanceAttribute('polygon', CommonAttributes.DIFFUSE_COLOR, '#cccccc');
    
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    
    for (let i = 0; i < geometry.getNumFaces(); i++) {
      const faceIndices = indices.getRow(i);
      const points = [];
      
      for (const index of faceIndices) {
        const vertex = vertices.getSlice(index);
        points.push(`${vertex[0]},${vertex[1]}`);
      }
      
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', points.join(' '));
      polygon.setAttribute('fill', this.toCSSColor(faceColor));
      polygon.setAttribute('stroke', 'none');
      currentGroup.appendChild(polygon);
    }
  }
}

