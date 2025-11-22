// SVG implementation of the Viewer interface
// Provides vector rendering using SVG DOM

import { Viewer, Dimension } from '../scene/Viewer.js';
import { Abstract2DViewer } from './Abstract2DViewer.js';
import { Abstract2DRenderer } from './Abstract2DRenderer.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { INHERITED } from '../scene/Appearance.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import * as Rn from '../math/Rn.js';
import * as Pn from '../math/Pn.js';
import { Color } from '../util/Color.js';

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
    
    // Note: Final formatting is now handled by SVGRenderer._endRender()
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
 * Extends Abstract2DRenderer with SVG-specific drawing operations
 */
class SVGRenderer extends Abstract2DRenderer {

  /** @type {SVGSVGElement} */
  #svgElement;

  /** @type {SVGGElement[]} Stack of SVG group elements for hierarchical transforms */
  #groupStack = [];

  /** @type {number} Current indentation level for formatted output */
  #indentLevel = 0;

  /** @type {number} SVG viewport width */
  #width;

  /** @type {number} SVG viewport height */
  #height;

  // Cached appearance attributes
  /** @type {string} Cached point color */
  #pointColor = '#ff0000';
  
  /** @type {number} Cached point radius */
  #pointRadius = 0.1;
  
  /** @type {string} Cached line color */
  #lineColor = '#000000';
  
  /** @type {number} Cached tube radius */
  #tubeRadius = 0.05;
  
  /** @type {string} Cached polygon/face color */
  #faceColor = '#cccccc';

  /**
   * Create a new SVG renderer
   * @param {SVGViewer} viewer - The viewer
   */
  constructor(viewer) {
    super(viewer);
    this.#svgElement = viewer._getSVGElement();
    this.#width = viewer._getWidth();
    this.#height = viewer._getHeight();
  }

  // render() inherited from Abstract2DRenderer

  /**
   * Begin rendering - SVG-specific setup (implements abstract method)
   * Creates root group with NDC-to-screen transform, draws background
   * Note: world2ndc is applied by Abstract2DRenderer.beginRender()
   * @protected
   */
  _beginRender() {
    console.log('SVGRenderer._beginRender()');
    const rootGroup = this.#createRootGroup();
    
    // Add comment for root group
    const comment = document.createComment(' Root group: NDC to screen transform ');
    this.#svgElement.appendChild(document.createTextNode('\n  '));
    this.#svgElement.appendChild(comment);
    this.#svgElement.appendChild(document.createTextNode('\n  '));
    this.#svgElement.appendChild(rootGroup);
    
    this.#groupStack.push(rootGroup);
    this.#indentLevel = 1; // Start at indent level 1 (inside root group)
    
    // Render background
    this.#renderBackground();
  }

  /**
   * End rendering - SVG-specific cleanup (implements abstract method)
   * Adds final formatting newlines
   * @protected
   */
  _endRender() {
    console.log('SVGRenderer._endRender()');
    // Add final closing newline for root group
    const rootGroup = this.#groupStack[0]; // Should be the root group
    if (rootGroup) {
      rootGroup.appendChild(document.createTextNode('\n  '));
    }
    this.#svgElement.appendChild(document.createTextNode('\n'));
  }

  /**
   * Apply appearance attributes - cache values from current appearance stack (implements abstract method)
   * @protected
   */
  _applyAppearance() {
    // Cache appearance attributes - will be used in _beginPrimitiveGroup
    this.#pointColor = this.toCSSColor(
      this.getAppearanceAttribute(CommonAttributes.POINT_SHADER, CommonAttributes.DIFFUSE_COLOR, '#ff0000'));
    this.#pointRadius = Number(this.getAppearanceAttribute(CommonAttributes.POINT_SHADER, CommonAttributes.POINT_RADIUS, 0.1));
    
    this.#lineColor = this.toCSSColor(
      this.getAppearanceAttribute(CommonAttributes.LINE_SHADER, CommonAttributes.DIFFUSE_COLOR, '#000000'));
    this.#tubeRadius = Number(this.getAppearanceAttribute(CommonAttributes.LINE_SHADER, CommonAttributes.TUBE_RADIUS, 0.05));
    
    this.#faceColor = this.toCSSColor(
      this.getAppearanceAttribute(CommonAttributes.POLYGON_SHADER, CommonAttributes.DIFFUSE_COLOR, '#cccccc'));
  }

  /**
   * Begin a nested primitive group with type-specific appearance (implements abstract method)
   * @protected
   * @param {string} type - Primitive type: 'point', 'line', or 'face'
   */
  _beginPrimitiveGroup(type) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    
    // Add comment showing primitive type
    const comment = document.createComment(` ${type} group `);
    currentGroup.appendChild(document.createTextNode(this.#getIndent()));
    currentGroup.appendChild(comment);
    
    // Add newline and indentation before group
    const indent = '\n' + '  '.repeat(this.#indentLevel + 1);
    currentGroup.appendChild(document.createTextNode(indent));
    
    // Set type-specific attributes on the group
    if (type === CommonAttributes.POINT) {
      g.setAttribute('fill', this.#pointColor);
    } else if (type === CommonAttributes.LINE) {
      g.setAttribute('stroke', this.#lineColor);
      // TUBE_RADIUS is a radius, but SVG stroke-width expects diameter, so multiply by 2
      g.setAttribute('stroke-width', (this.#tubeRadius * 2).toFixed(4));
      g.setAttribute('fill', 'none');
    } else if (type === CommonAttributes.POLYGON) {
      g.setAttribute('fill', this.#faceColor);
      g.setAttribute('stroke', 'none');
    }
    
    currentGroup.appendChild(g);
    this.#groupStack.push(g);
    this.#indentLevel++;
  }

  /**
   * End the nested primitive group (implements abstract method)
   * @protected
   */
  _endPrimitiveGroup() {
    this.#groupStack.pop();
    this.#indentLevel--;
    
    // Add newline and indentation after closing group
    const indent = '\n' + '  '.repeat(this.#indentLevel + 1);
    const parentGroup = this.#groupStack[this.#groupStack.length - 1];
    parentGroup.appendChild(document.createTextNode(indent));
  }

  /**
   * Push transformation state - create new SVG group (implements abstract method)
   * @protected
   */
  _pushTransformState() {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    
    // Add newline and indentation before group
    const indent = '\n' + '  '.repeat(this.#indentLevel + 1);
    currentGroup.appendChild(document.createTextNode(indent));
    currentGroup.appendChild(g);
    
    this.#groupStack.push(g);
    this.#indentLevel++;
  }

  /**
   * Pop transformation state - remove SVG group from stack (implements abstract method)
   * @protected
   */
  _popTransformState() {
    const poppedGroup = this.#groupStack.pop();
    this.#indentLevel--;
    
    // Add newline and indentation after closing group
    const indent = '\n' + '  '.repeat(this.#indentLevel + 1);
    const parentGroup = this.#groupStack[this.#groupStack.length - 1];
    parentGroup.appendChild(document.createTextNode(indent));
  }

  /**
   * Apply transformation matrix to current SVG group (implements abstract method)
   * @protected
   * @param {number[]} matrix - 4x4 transformation matrix (incremental)
   */
  _applyTransform(matrix) {
    // Use the incremental transformation (not accumulated)
    // SVG groups nest, so transforms compose automatically through the DOM hierarchy
    // 
    // Convert to SVG transform format (2D affine)
    // Extract the 2D affine part from the 4x4 matrix (row-major layout)
    // 
    // 4x4 matrix in row-major:
    // [  0   1   2   3  ]  <- Row 0: [m00 m01 m02 tx]
    // [  4   5   6   7  ]  <- Row 1: [m10 m11 m12 ty]
    // [  8   9  10  11 ]  <- Row 2: [m20 m21 m22 tz]
    // [ 12  13  14  15 ]  <- Row 3: [  0   0   0  1]
    //
    // SVG matrix(a b c d e f) represents:
    // [a c e]  [x]     [a c e]
    // [b d f]  [y]  =  [b d f]
    // [0 0 1]  [1]     [0 0 1]
    const a = matrix[0];  // X scale
    const b = matrix[4];  // Y skew
    const c = matrix[1];  // X skew
    const d = matrix[5];  // Y scale
    const e = matrix[3];  // X translation
    const f = matrix[7];  // Y translation
    
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    const transformStr = `matrix(${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${d.toFixed(4)} ${e.toFixed(4)} ${f.toFixed(4)})`;
    currentGroup.setAttribute('transform', transformStr);
    
    // Add comment showing the transform
    const comment = document.createComment(` Transform: ${transformStr} `);
    const parent = currentGroup.parentNode;
    parent.insertBefore(comment, currentGroup);
    parent.insertBefore(document.createTextNode('\n' + '  '.repeat(this.#indentLevel)), currentGroup);
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
    // Get background color using shared method from Abstract2DRenderer
    const backgroundColor = this._getBackgroundColor();
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '-1');
    rect.setAttribute('y', '-1');
    rect.setAttribute('width', '2');
    rect.setAttribute('height', '2');
    rect.setAttribute('fill', this.toCSSColor(backgroundColor));
    
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    currentGroup.appendChild(rect);
  }

  // visitComponent(), visitTransformation(), visitAppearance() inherited from Abstract2DRenderer
  // getAppearanceAttribute(), toCSSColor(), getBooleanAttribute(), getNumericAttribute() inherited from Abstract2DRenderer
  // visitPointSet(), visitIndexedLineSet(), visitIndexedFaceSet() inherited from Abstract2DRenderer
  // _renderVerticesAsPoints(), _renderEdgesAsLines(), _renderFacesAsPolygons() inherited from Abstract2DRenderer

  // ============================================================================
  // DEVICE-SPECIFIC DRAWING PRIMITIVES
  // ============================================================================

  /**
   * Get current indentation string
   * @private
   * @returns {string} Indentation string
   */
  #getIndent() {
    return '\n' + '  '.repeat(this.#indentLevel + 1);
  }

  
  /**
   * Draw a single point as SVG circle (implements abstract method)
   * @protected
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  _drawPoint(point, color = null) {
    // Appearance attributes inherited from group (set in _applyAppearance)
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    
    // Add indentation before element
    currentGroup.appendChild(document.createTextNode(this.#getIndent()));
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx',point[0].toFixed(4));
    circle.setAttribute('cy',point[1].toFixed(4));
    circle.setAttribute('r', this.#pointRadius.toFixed(4));
    // Override fill color if vertex color is provided
    if (color) {
      circle.setAttribute('fill', this.toCSSColor(color));
    }
    // Otherwise fill inherited from group
    currentGroup.appendChild(circle);
  }

  /**
   * Draw a polyline through multiple points (implements abstract method)
   * @protected
   * @param {*} vertices - Vertex coordinate data
   * @param {number[]} indices - Array of vertex indices
   */
  _drawPolyline(vertices, colors, indices) {
    // Appearance attributes inherited from primitive group (set in _beginPrimitiveGroup)
    const points = [];
    for (const index of indices) {
      const vertex = vertices[index];
      const point = this._extractPoint(vertex);
      points.push(`${point[0].toFixed(4)},${point[1].toFixed(4)}`);
    }
    
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    
    // Add indentation before element
    currentGroup.appendChild(document.createTextNode(this.#getIndent()));
    
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', points.join(' '));
    // Override stroke color if edge color is provided
    if (colors) {
      polyline.setAttribute('stroke', this.toCSSColor(colors));
    }
    // Otherwise stroke, stroke-width, fill inherited from primitive group
    currentGroup.appendChild(polyline);
  }

  /**
   * Draw a filled polygon (implements abstract method)
   * @protected
   * @param {*} vertices - Vertex coordinate data
   * @param {number[]} indices - Array of vertex indices
   * @param {boolean} fill - Whether to fill the polygon
   */
  _drawPolygon(vertices, colors, indices, fill) {
    // Appearance attributes inherited from primitive group (set in _beginPrimitiveGroup)
    const points = [];
    for (const index of indices) {
      const vertex = vertices[index];
      const point = this._extractPoint(vertex);
      points.push(`${point[0].toFixed(4)},${point[1].toFixed(4)}`);
    }
    
    const currentGroup = this.#groupStack[this.#groupStack.length - 1];
    
    // Add indentation before element
    currentGroup.appendChild(document.createTextNode(this.#getIndent()));
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points.join(' '));
    // Override color if face color is provided
    if (colors) {
      if (fill) {
        polygon.setAttribute('fill', this.toCSSColor(colors));
      } else {
        polygon.setAttribute('stroke', this.toCSSColor(colors));
      }
    }
    // Otherwise fill and stroke inherited from primitive group
    
    currentGroup.appendChild(polygon);
  }
}

