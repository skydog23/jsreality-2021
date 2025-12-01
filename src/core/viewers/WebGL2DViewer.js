/**
 * WebGL implementation of the Viewer interface.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// WebGL implementation of the Viewer interface
// Provides 2D rendering using WebGL/WebGL2 for hardware acceleration

import { Abstract2DViewer } from './Abstract2DViewer.js';
import { Abstract2DRenderer } from './Abstract2DRenderer.js';
import { Dimension } from '../scene/Viewer.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { INHERITED } from '../scene/Appearance.js';
import { Color } from '../util/Color.js';

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */
/** @typedef {import('../scene/Camera.js').Camera} Camera */

/**
 * A 2D WebGL-based viewer implementation for jReality scene graphs.
 * Renders geometry using WebGL/WebGL2 for hardware-accelerated rendering.
 */
export class WebGL2DViewer extends Abstract2DViewer {

  /** @type {HTMLCanvasElement} */
  #canvas;

  /** @type {WebGLRenderingContext|WebGL2RenderingContext} */
  #gl;

  /** @type {boolean} */
  #autoResize = true;

  /** @type {number} */
  _pixelRatio = 1;

  /** @type {WebGL2DRenderer|null} */
  #renderer = null;

  /**
   * Create a new WebGL2D viewer
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.autoResize=true] - Whether to auto-resize canvas
   * @param {number} [options.pixelRatio] - Device pixel ratio (auto-detected if not provided)
   * @param {boolean} [options.webgl2=true] - Whether to prefer WebGL2 over WebGL1
   */
  constructor(canvas, options = {}) {
    super();
    
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('WebGL2DViewer requires an HTMLCanvasElement');
    }

    this.#canvas = canvas;
    
    // Try to get WebGL2 context first, fall back to WebGL1
    const preferWebGL2 = options.webgl2 !== false;
    let gl = null;
    
    if (preferWebGL2) {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        antialias: true,
        depth: false, // 2D rendering doesn't need depth buffer
        stencil: false,
        preserveDrawingBuffer: true // Required for toDataURL() to work
      });
    }
    
    if (!gl) {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: true // Required for toDataURL() to work
      });
    }
    
    if (!gl) {
      throw new Error('Failed to get WebGL context from canvas. WebGL may not be supported.');
    }

    this.#gl = gl;
    this.#autoResize = options.autoResize !== false;
    this._pixelRatio = options.pixelRatio || window.devicePixelRatio || 1;
    
    // Setup resize handling first - it will trigger setupCanvas when canvas has dimensions
    if (this.#autoResize) {
      this.#setupResizeHandling();
    } else {
      // Only setup canvas immediately if not auto-resizing
      // (auto-resize will be triggered by ResizeObserver when canvas has size)
      this.#setupCanvas();
    }
  }

  /**
   * Setup canvas with proper pixel ratio handling
   * @private
   */
  #setupCanvas() {
    const canvas = this.#canvas;
    const ratio = this._pixelRatio;

    // Get display size from CSS
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    // If canvas has no size yet, skip (ResizeObserver will call us again)
    if (displayWidth === 0 || displayHeight === 0) {
      return;
    }

    // Set actual canvas buffer size (scaled up for retina)
    canvas.width = displayWidth * ratio;
    canvas.height = displayHeight * ratio;
    
    // Set viewport to match canvas buffer size
    this.#gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Note: We don't set canvas.style.width/height here to allow CSS to control sizing.
    // The canvas element should have its dimensions set via CSS (either inline or stylesheet).
    // Setting inline styles here would override CSS and break responsive layouts.
  }

  /**
   * Setup automatic canvas resizing
   * @private
   */
  #setupResizeHandling() {
    const resizeObserver = new ResizeObserver(() => {
      this.#setupCanvas();
      // Note: We don't call render() here. The ResizeObserver fires during initialization
      // before the viewer is selected, and we don't want to render inactive viewers.
      // The caller is responsible for triggering render() when needed.
    });

    resizeObserver.observe(this.#canvas);
  }

  /**
   * Get the WebGL context
   * @returns {WebGLRenderingContext|WebGL2RenderingContext}
   */
  getGL() {
    return this.#gl;
  }

  /**
   * Check if WebGL2 is available
   * @returns {boolean}
   */
  isWebGL2() {
    return this.#gl instanceof WebGL2RenderingContext;
  }

  /**
   * Get the viewing component (canvas)
   * @returns {HTMLCanvasElement}
   */
  getViewingComponent() {
    return this.#canvas;
  }

  /**
   * Get the viewing component size
   * @returns {Dimension}
   */
  getViewingComponentSize() {
    return {
      width: this.#canvas.clientWidth,
      height: this.#canvas.clientHeight
    };
  }

  /**
   * Render the scene using WebGL
   */
  render() {
    if (!this.#renderer) {
      this.#renderer = new WebGL2DRenderer(this);
    }
    this.#renderer.render();
  }

  /**
   * Override camera-to-NDC matrix computation for 2D
   * @protected
   * @param {Camera} camera - The camera
   * @returns {number[]} 4x4 camera-to-NDC transformation matrix
   */
  _computeCam2NDCMatrix(camera) {
    const size = this.getViewingComponentSize();
    const aspect = size.width / size.height;

    return super._computeCam2NDCMatrix(camera, aspect);
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
}

/**
 * WebGL2D rendering visitor that traverses the scene graph and renders geometry
 * Extends Abstract2DRenderer with WebGL-specific drawing operations
 */
class WebGL2DRenderer extends Abstract2DRenderer {

  /** @type {WebGLRenderingContext|WebGL2RenderingContext} */
  #gl;

  /** @type {HTMLCanvasElement} */
  #canvas;

  /** @type {WebGLProgram|null} */
  #program = null;

  /** @type {WebGLBuffer|null} */
  #vertexBuffer = null;

  /** @type {WebGLBuffer|null} */
  #colorBuffer = null;

  /** @type {WebGLBuffer|null} */
  #indexBuffer = null;

  /** @type {WebGLBuffer|null} */
  #distanceBuffer = null;

  /** @type {number} Current primitive type being rendered */
  #currentPrimitiveType = null;

  /** @type {number[]} Current color for rendering */
  #currentColor = [1.0, 1.0, 1.0, 1.0];

  /** @type {Object} Cached WebGL capabilities */
  #capabilities = null;

  /** @type {number[]} Batched vertices for lines (to combine multiple edges into single draw call) */
  #batchedVertices = [];

  /** @type {number[]} Batched colors for lines */
  #batchedColors = [];

  /** @type {number[]} Batched indices for lines */
  #batchedIndices = [];

  /** @type {number} Current vertex offset for batched indices */
  #batchedVertexOffset = 0;

  /** @type {number[]|null} Current batched line color */
  #currentBatchedLineColor = null;

  /** @type {number} Current batched half width for lines */
  #currentBatchedHalfWidth = 0;

  /**
   * Create a new WebGL2D renderer
   * @param {WebGL2DViewer} viewer - The viewer
   */
  constructor(viewer) {
    super(viewer);
    this.#canvas = viewer.getViewingComponent();
    this.#gl = viewer.getGL();
    
    // Initialize WebGL resources
    this.#initWebGL();
  }

  /**
   * Initialize WebGL shaders and buffers
   * @private
   */
  #initWebGL() {
    const gl = this.#gl;
    
    // Cache WebGL capabilities at startup
    this.#capabilities = this.#queryWebGLCapabilities(gl);
    
    // Create shader program
    this.#program = this.#createShaderProgram();
    
    if (!this.#program) {
      throw new Error('Failed to create WebGL shader program');
    }
    
    // Create buffers
    this.#vertexBuffer = gl.createBuffer();
    this.#colorBuffer = gl.createBuffer();
    this.#indexBuffer = gl.createBuffer();
    this.#distanceBuffer = gl.createBuffer();
    
    if (!this.#vertexBuffer || !this.#colorBuffer || !this.#indexBuffer || !this.#distanceBuffer) {
      throw new Error('Failed to create WebGL buffers');
    }
    
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  /**
   * Query and cache WebGL capabilities at startup
   * @private
   * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
   * @returns {Object} Cached capabilities object
   */
  #queryWebGLCapabilities(gl) {
    const caps = {
      // Drawing mode constants
      TRIANGLES: (gl.TRIANGLES !== undefined && gl.TRIANGLES !== null) ? gl.TRIANGLES : 0x0004,
      LINE_STRIP: (gl.LINE_STRIP !== undefined && gl.LINE_STRIP !== null) ? gl.LINE_STRIP : 0x0003,
      POINTS: (gl.POINTS !== undefined && gl.POINTS !== null) ? gl.POINTS : 0x0000,
      
      // Line width capabilities
      maxLineWidth: 1.0,
      supportsWideLines: false,
      
      // Point size capabilities
      maxPointSize: 1.0,
      minPointSize: 1.0,
      
      // Index type constants
      UNSIGNED_SHORT: gl.UNSIGNED_SHORT
    };
    
    // Query point size range
    const pointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    if (pointSizeRange && pointSizeRange.length >= 2) {
      caps.minPointSize = pointSizeRange[0];
      caps.maxPointSize = pointSizeRange[1];
    }
    
    // Query maximum line width (many implementations only support 1.0)
    const maxLineWidthRange = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE);
    if (maxLineWidthRange && maxLineWidthRange.length >= 2) {
      caps.maxLineWidth = maxLineWidthRange[1]; // Maximum supported width
      caps.supportsWideLines = maxLineWidthRange[1] > 1.0;
    } else {
      // Fallback: try to query directly (some implementations)
      try {
        const maxWidth = gl.getParameter(gl.MAX_LINE_WIDTH);
        if (maxWidth !== null && maxWidth !== undefined) {
          caps.maxLineWidth = maxWidth;
          caps.supportsWideLines = maxWidth > 1.0;
        }
      } catch (e) {
        // If query fails, assume only 1.0 is supported
        caps.maxLineWidth = 1.0;
        caps.supportsWideLines = false;
      }
    }
    
    return caps;
  }

  /**
   * Create WebGL shader program for 2D rendering
   * @private
   * @returns {WebGLProgram|null}
   */
  #createShaderProgram() {
    const gl = this.#gl;
    
    // Vertex shader source
    const vertexShaderSource = `
      attribute vec4 a_position;
      attribute vec4 a_color;
      // NOTE: Edge smoothing disabled - see fragment shader for re-enabling instructions
      // attribute float a_distance; // Distance from centerline (for line edge smoothing)
      
      uniform mat4 u_transform;
      uniform float u_pointSize;
      
      varying vec4 v_color;
      // NOTE: Edge smoothing disabled - see fragment shader for re-enabling instructions
      // varying float v_distance; // Pass distance to fragment shader
      
      void main() {
        // a_position is vec4, can be 2D, 3D, or 4D depending on gl.vertexAttribPointer size
        // For 2D: a_position.xy is used, z defaults to 0.0, w defaults to 0.0
        // For 3D: a_position.xyz is used, w defaults to 0.0
        // For 4D: a_position.xyzw is used
        vec4 position = a_position;
        // Ensure w is 1.0 if not provided (for 2D/3D points where w=0.0 indicates padding)
        // This handles homogeneous coordinates correctly
        if (position.w == 0.0) {
          position.w = 1.0;
        }
        // u_transform already includes world2ndc transformation
        position = u_transform * position;
        gl_Position = position;
        gl_PointSize = u_pointSize;
        v_color = a_color;
        // NOTE: Edge smoothing disabled - uncomment to re-enable
        // v_distance = a_distance;
      }
    `;
    
    // Fragment shader source
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec4 v_color;
      // NOTE: Edge smoothing disabled - uncomment to re-enable
      // varying float v_distance;
      
      // NOTE: Edge smoothing disabled - uncomment to re-enable
      // uniform float u_lineHalfWidth; // Half width of the line (for edge smoothing)
      
      void main() {
        // ========================================================================
        // EDGE SMOOTHING (ANTI-ALIASING) - DISABLED
        // ========================================================================
        // To re-enable edge smoothing for lines:
        // 1. Uncomment the a_distance attribute in vertex shader
        // 2. Uncomment v_distance varying in both shaders
        // 3. Uncomment u_lineHalfWidth uniform in fragment shader
        // 4. Uncomment the edge smoothing code below
        // 5. Update #drawPolylineAsQuads to generate distance values
        // 6. Update #drawGeometry to bind distance buffer
        // 7. Update #updateUniforms to set u_lineHalfWidth uniform
        //
        // Edge smoothing code (uncomment to enable):
        // float dist = abs(v_distance);
        // float alpha = 1.0;
        // if (u_lineHalfWidth > 0.0) {
        //   float edgeFade = 0.1; // Fade over 10% of line width
        //   float fadeStart = u_lineHalfWidth * (1.0 - edgeFade);
        //   alpha = 1.0 - smoothstep(fadeStart, u_lineHalfWidth, dist);
        // }
        // gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
        //
        // Current code (edge smoothing disabled):
        // For point rendering, gl_PointCoord is available but we use solid color for now
        gl_FragColor = v_color;
      }
    `;
    
    // Create and compile shaders
    const vertexShader = this.#compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.#compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
      return null;
    }
    
    // Create program and link
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('WebGL program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }

  /**
   * Compile a WebGL shader
   * @private
   * @param {number} type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
   * @param {string} source - Shader source code
   * @returns {WebGLShader|null}
   */
  #compileShader(type, source) {
    const gl = this.#gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('WebGL shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  /**
   * Begin rendering - WebGL-specific setup (implements abstract method)
   * @protected
   */
  _beginRender() {
    const gl = this.#gl;
    const canvas = this.#canvas;
    
    // Set viewport first (before clearing)
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Get background color using shared method from Abstract2DRenderer
    const backgroundColor = this._getBackgroundColor();
    
    // Convert to WebGL color format [0-1]
    const webglColor = this.#toWebGLColor(backgroundColor);
    // Preserve the original alpha value for transparency support
    // If alpha is not provided, default to 1.0 (opaque)
    const clearColor = [
      webglColor[0], 
      webglColor[1], 
      webglColor[2], 
      webglColor[3] !== undefined ? webglColor[3] : 1.0
    ];
    
    // Clear the canvas with background color
    // Note: With alpha: true canvas, transparent backgrounds are supported
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Use our shader program
    gl.useProgram(this.#program);
  }

  /**
   * End rendering - WebGL-specific cleanup (implements abstract method)
   * @protected
   */
  _endRender() {
    // No cleanup needed for WebGL
  }

  /**
   * Apply appearance attributes to WebGL context (implements abstract method)
   * @protected
   */
  _applyAppearance() {
    // Appearance attributes are applied per-primitive in _beginPrimitiveGroup
  }

  /**
   * Begin a primitive group - set WebGL state (implements abstract method)
   * @protected
   * @param {string} type - Primitive type: 'point', 'line', or 'face'
   */
  _beginPrimitiveGroup(type) {
    const gl = this.#gl;
    
    // Get color from appearance
    const color = this.getAppearanceAttribute(
      type === CommonAttributes.POINT ? CommonAttributes.POINT_SHADER :
      type === CommonAttributes.LINE ? CommonAttributes.LINE_SHADER :
      CommonAttributes.POLYGON_SHADER,
      CommonAttributes.DIFFUSE_COLOR,
      [1.0, 1.0, 1.0, 1.0]
    );
    
    // Convert color to WebGL format [0-1]
    this.#currentColor = this.#toWebGLColor(color);
    
    // Set primitive type
    this.#currentPrimitiveType = type;
    
    // Initialize batching for lines
    if (type === CommonAttributes.LINE) {
      this.#batchedVertices = [];
      this.#batchedColors = [];
      this.#batchedIndices = [];
      this.#batchedVertexOffset = 0;
      this.#currentBatchedLineColor = null;
      this.#currentBatchedHalfWidth = 0;
    }
  }

  /**
   * End the nested group for a primitive type (implements abstract method)
   * @protected
   */
  _endPrimitiveGroup() {
    // Flush any batched line data before ending the group
    if (this.#currentPrimitiveType === CommonAttributes.LINE && this.#batchedVertices.length > 0) {
      this.#flushBatchedLines();
    }
  }

  /**
   * Push transformation state (implements abstract method)
   * @protected
   */
  _pushTransformState() {
    // WebGL uses uniform matrices, so we push to the transformation stack
    // The actual matrix is applied in _applyTransform
  }

  /**
   * Pop transformation state (implements abstract method)
   * @protected
   */
  _popTransformState() {
    // Transformation stack is managed by Abstract2DRenderer
  }

  /**
   * Apply a transformation matrix (implements abstract method)
   * @protected
   * @param {number[]} matrix - 4x4 transformation matrix
   */
  _applyTransform(matrix) {
    // Transformation is applied via uniform in _drawGeometry
    // The transformation stack is managed by Abstract2DRenderer
    // We just need to ensure uniforms are updated when drawing
  }
  
  /**
   * Update WebGL uniforms with current transformation matrices
   * @private
   * @param {number} [lineHalfWidth=0] - Half width of line for edge smoothing in world space (0 for non-lines)
   * @param {number} [pointSize=1.0] - Size of points in pixels (1.0 for non-points)
   */
  #updateUniforms(lineHalfWidth = 0, pointSize = 1.0) {
    const gl = this.#gl;
    const program = this.#program;
    
    // Get uniform location for transformation matrix
    const transformLoc = gl.getUniformLocation(program, 'u_transform');
    
    // Get current transformation from stack (includes all accumulated transforms including world2ndc)
    const currentTransform = this.getCurrentTransformation();
    
    // WebGL expects column-major matrices, but JavaScript arrays are row-major
    // Set transpose to true so WebGL transposes the matrices for us
    gl.uniformMatrix4fv(transformLoc, true, currentTransform);
    
    // Set point size uniform
    const pointSizeLoc = gl.getUniformLocation(program, 'u_pointSize');
    if (pointSizeLoc !== null) {
      gl.uniform1f(pointSizeLoc, pointSize);
    }
    
    // NOTE: Edge smoothing disabled - uniform not set
    // To re-enable: uncomment this block and update shaders (see fragment shader comments)
    // Set line half width for edge smoothing (0 disables smoothing for non-lines)
    // Note: Both distance attribute and halfWidth are in world space, so they match correctly
    // const lineHalfWidthLoc = gl.getUniformLocation(program, 'u_lineHalfWidth');
    // if (lineHalfWidthLoc !== null) {
    //   gl.uniform1f(lineHalfWidthLoc, lineHalfWidth);
    // }
  }

  /**
   * Draw a single point (implements abstract method)
   * Supports two rendering modes based on spheresDraw attribute:
   * 1. spheresDraw=true: Draw as quad using pointRadius (world space)
   * 2. spheresDraw=false: Draw as native GL point using pointSize (pixel space, no NDC conversion)
   * 
   * Supports 2D, 3D, and 4D points natively by using vec4 in the shader and setting
   * the appropriate component count in gl.vertexAttribPointer.
   * 
   * @protected
   * @param {number[]} point - Point coordinates [x, y] or [x, y, z] or [x, y, z, w]
   * @param {*} color - Optional color override
   */
  _drawPoint(point, color = null) {
    const gl = this.#gl;
    
    // Use pass-through _extractPoint to get the point (unchanged)
    const extractedPoint = this._extractPoint(point);
    
    // Detect point dimension from array length
    const pointDim = extractedPoint.length;
    if (pointDim < 2) {
      console.warn('WebGL2DRenderer: Point must have at least 2 coordinates');
      return;
    }
    
    // Clamp dimension to valid range (2, 3, or 4)
    const validDim = Math.min(Math.max(pointDim, 2), 4);
    
    // Check spheresDraw attribute to determine rendering mode
    const spheresDrawValue = this.getAppearanceAttribute(
      CommonAttributes.POINT_SHADER,
      CommonAttributes.SPHERES_DRAW,
      CommonAttributes.SPHERES_DRAW_DEFAULT
    );
    const spheresDraw = Boolean(spheresDrawValue);
    
    if (spheresDraw) {
      // Draw as quad using pointRadius (world space)
      const pointRadius = this.getAppearanceAttribute(
        CommonAttributes.POINT_SHADER,
        CommonAttributes.POINT_RADIUS,
        CommonAttributes.POINT_RADIUS_DEFAULT
      );
      
      // Extract 2D coordinates for quad rendering
      const x = extractedPoint[0];
      const y = extractedPoint[1];
      const halfSize = pointRadius; // / 2.0;
      
      // Create 2 triangles forming an axis-oriented square centered at the point
      // Triangle 1: bottom-left, bottom-right, top-left
      // Triangle 2: bottom-right, top-right, top-left
      const vertices = new Float32Array([
        x - halfSize, y - halfSize,  // 0: bottom-left
        x + halfSize, y - halfSize,  // 1: bottom-right
        x - halfSize, y + halfSize,  // 2: top-left
        x + halfSize, y + halfSize   // 3: top-right
      ]);
      
      // Indices for 2 triangles
      const indices = new Uint16Array([
        0, 1, 2,  // Triangle 1: bottom-left, bottom-right, top-left
        1, 3, 2   // Triangle 2: bottom-right, top-right, top-left
      ]);
      
      // Get color
      const pointColor = color ? this.#toWebGLColor(color) : this.#currentColor;
      const colors = new Float32Array([
        ...pointColor, ...pointColor, ...pointColor, ...pointColor
      ]);
      
      // Draw using standard triangle rendering
      this.#updateUniforms(0, 1.0); // pointSize not used for quad rendering
      this.#drawGeometry(vertices, colors, indices, this.#capabilities.TRIANGLES);
    } else {
      // Draw as native GL point using pointSize (pixel space, no NDC conversion)
      const pointSize = this.getAppearanceAttribute(
        CommonAttributes.POINT_SHADER,
        CommonAttributes.POINT_SIZE,
        CommonAttributes.POINT_SIZE_DEFAULT
      );
      
      // Create vertex array with appropriate dimension
      let coords;
      if (validDim === 2) {
        coords = [extractedPoint[0], extractedPoint[1]];
      } else if (validDim === 3) {
        coords = [extractedPoint[0], extractedPoint[1], extractedPoint[2]];
      } else { // validDim === 4
        coords = [extractedPoint[0], extractedPoint[1], extractedPoint[2], extractedPoint[3]];
      }
      
      // Create vertex array
      const vertices = new Float32Array(coords);
      
      // Get color
      const pointColor = color ? this.#toWebGLColor(color) : this.#currentColor;
      const colors = new Float32Array(pointColor);
      
      // Use native WebGL point rendering
      // Update uniforms with point size (direct pixel value, no conversion)
      this.#updateUniforms(0, pointSize);
      
      // Bind buffers
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      
      const positionLoc = gl.getAttribLocation(this.#program, 'a_position');
      if (positionLoc === -1) {
        console.error('WebGL2DRenderer: a_position attribute not found in shader');
        return;
      }
      gl.enableVertexAttribArray(positionLoc);
      // Use the detected dimension to set the component count (2, 3, or 4)
      // The shader uses vec4, but we tell GL how many components to read
      gl.vertexAttribPointer(positionLoc, validDim, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
      
      const colorLoc = gl.getAttribLocation(this.#program, 'a_color');
      if (colorLoc === -1) {
        console.error('WebGL2DRenderer: a_color attribute not found in shader');
        return;
      }
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
      
      // Draw using native WebGL points
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.drawArrays(this.#capabilities.POINTS, 0, 1);
    }
  }

  /**
   * Draw a polyline through multiple points (implements abstract method)
   * @protected
   * @param {*} vertices - Vertex coordinate data
   * @param {*} colors - Vertex color data
   * @param {number[]} indices - Array of vertex indices
   */
  _drawPolyline(vertices, colors, indices) {
    const gl = this.#gl;
    
    if (!indices || indices.length === 0) {
      return;
    }
    
    // Check if we should draw as tubes (quads) or simple lines (LINE_STRIP)
    const tubeDraw = this.getAppearanceAttribute(
      CommonAttributes.LINE_SHADER,
      CommonAttributes.TUBES_DRAW,
      CommonAttributes.TUBES_DRAW_DEFAULT
    );
    
    if (tubeDraw) {
      // Draw as quads using TUBE_RADIUS (batch same-color edges)
      const tubeRadius = this.getAppearanceAttribute(
        CommonAttributes.LINE_SHADER,
        CommonAttributes.TUBE_RADIUS,
        CommonAttributes.TUBE_RADIUS_DEFAULT
      );
      const halfWidth = tubeRadius;
      const edgeColor = colors ? this.#toWebGLColor(colors) : this.#currentColor;
      
      // Check if we can batch this edge with the current batch
      const canBatch = this.#currentBatchedLineColor !== null &&
                       this.#arraysEqual(edgeColor, this.#currentBatchedLineColor) &&
                       Math.abs(halfWidth - this.#currentBatchedHalfWidth) < 1e-6;
      
      if (canBatch) {
        // Add to current batch
        this.#addPolylineToBatch(vertices, indices, edgeColor, halfWidth);
      } else {
        // Flush current batch and start new one
        if (this.#batchedVertices.length > 0) {
          this.#flushBatchedLines();
        }
        this.#currentBatchedLineColor = edgeColor;
        this.#currentBatchedHalfWidth = halfWidth;
        this.#addPolylineToBatch(vertices, indices, edgeColor, halfWidth);
      }
    } else {
      // Draw as simple LINE_STRIP using LINE_WIDTH (no batching for now)
      const lineWidth = this.getAppearanceAttribute(
        CommonAttributes.LINE_SHADER,
        CommonAttributes.LINE_WIDTH,
        CommonAttributes.LINE_WIDTH_DEFAULT
      );
      this.#drawPolylineAsLineStrip(vertices, colors, indices, lineWidth);
    }
  }
  
  /**
   * Add a polyline to the current batch
   * @private
   * @param {*} vertices - Vertex coordinate data
   * @param {number[]} indices - Array of vertex indices for the polyline
   * @param {number[]} edgeColor - Color as [r, g, b, a]
   * @param {number} halfWidth - Half width of the line
   * @returns {boolean} True if the polyline was added, false if batch was flushed due to overflow
   */
  #addPolylineToBatch(vertices, indices, edgeColor, halfWidth) {
    // Uint16Array can only hold indices up to 65535
    // Each quad uses 4 vertices, so we can batch up to ~16383 quads before overflow
    // Flush when we're close to the limit (leave some headroom)
    const MAX_VERTICES = 60000; // Leave some headroom before 65535 limit
    
    // Draw each line segment as a quad
    for (let i = 0; i < indices.length - 1; i++) {
      // Check if adding this quad would exceed the limit
      if (this.#batchedVertexOffset + 4 > MAX_VERTICES) {
        // Flush current batch before overflow
        // Preserve color/width so we can continue batching after flush
        this.#flushBatchedLines(true);
      }
      
      const idx0 = indices[i];
      const idx1 = indices[i + 1];
      
      const v0 = vertices[idx0];
      const v1 = vertices[idx1];
      const p0 = this._extractPoint(v0);
      const p1 = this._extractPoint(v1);
      
      // Calculate direction vector and perpendicular
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len === 0) continue; // Skip zero-length segments
      
      // Normalize and get perpendicular (rotate 90 degrees)
      const nx = -dy / len;
      const ny = dx / len;
      
      // Create quad vertices (4 corners of the rectangle)
      const quadVertices = [
        p0[0] + nx * halfWidth, p0[1] + ny * halfWidth,  // 0: left of p0
        p0[0] - nx * halfWidth, p0[1] - ny * halfWidth,  // 1: right of p0
        p1[0] + nx * halfWidth, p1[1] + ny * halfWidth,  // 2: left of p1
        p1[0] - nx * halfWidth, p1[1] - ny * halfWidth   // 3: right of p1
      ];
      
      // Add vertices
      this.#batchedVertices.push(...quadVertices);
      
      // Add colors (same color for all 4 vertices of the quad)
      this.#batchedColors.push(...edgeColor, ...edgeColor, ...edgeColor, ...edgeColor);
      
      // Add indices for 2 triangles forming the quad
      this.#batchedIndices.push(
        this.#batchedVertexOffset + 0, this.#batchedVertexOffset + 1, this.#batchedVertexOffset + 2,  // Triangle 1
        this.#batchedVertexOffset + 1, this.#batchedVertexOffset + 3, this.#batchedVertexOffset + 2   // Triangle 2
      );
      
      this.#batchedVertexOffset += 4;
    }
    
    return true;
  }
  
  /**
   * Flush batched line data into a single WebGL draw call
   * @private
   * @param {boolean} [preserveColor=false] - If true, preserve color/width for continued batching
   */
  #flushBatchedLines(preserveColor = false) {
    if (this.#batchedVertices.length === 0) {
      return;
    }
    
    const vertexArray = new Float32Array(this.#batchedVertices);
    const colorArray = new Float32Array(this.#batchedColors);
    const indexArray = new Uint16Array(this.#batchedIndices);
    
    // Single draw call for all batched edges
    this.#drawGeometry(vertexArray, colorArray, indexArray, this.#capabilities.TRIANGLES, null, 0);
    
    // Reset batching arrays and vertex offset
    this.#batchedVertices = [];
    this.#batchedColors = [];
    this.#batchedIndices = [];
    this.#batchedVertexOffset = 0;
    
    // Only reset color/width if we're not preserving for continued batching
    if (!preserveColor) {
      this.#currentBatchedLineColor = null;
      this.#currentBatchedHalfWidth = 0;
    }
  }
  
  /**
   * Check if two arrays are equal (for color comparison)
   * @private
   * @param {number[]} a - First array
   * @param {number[]} b - Second array
   * @returns {boolean}
   */
  #arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > 1e-6) return false;
    }
    return true;
  }
  
  /**
   * Draw a polyline using gl.LINE_STRIP (simple line rendering)
   * @private
   * @param {*} vertices - Vertex coordinate data
   * @param {*} colors - Vertex color data
   * @param {number[]} indices - Array of vertex indices for the polyline
   * @param {number} lineWidth - Line width in pixels
   */
  #drawPolylineAsLineStrip(vertices, colors, indices, lineWidth) {
    const gl = this.#gl;
    
    if (indices.length < 2) {
      return; // Need at least 2 points for a line
    }
    
    // Convert vertices to Float32Array
    const vertexArray = this.#verticesToFloat32Array(vertices, indices);
    const colorArray = this.#colorsToFloat32Array(colors, indices, this.#currentColor);
    
    // Set line width using cached capabilities
    // Clamp to maximum supported width
    const clampedWidth = Math.min(lineWidth, this.#capabilities.maxLineWidth);
    gl.lineWidth(clampedWidth);
    
    // Draw using LINE_STRIP mode (use cached constant)
    // Note: We need sequential indices since vertexArray is compacted
    const sequentialIndices = new Uint16Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
      sequentialIndices[i] = i;
    }
    
    this.#drawGeometry(vertexArray, colorArray, sequentialIndices, this.#capabilities.LINE_STRIP);
  }
  
  /**
   * Draw a polyline as a series of quads (rectangles) for wide lines
   * @private
   * @param {*} vertices - Vertex coordinate data
   * @param {*} colors - Vertex color data
   * @param {number[]} indices - Array of vertex indices for the polyline
   * @param {number} halfWidth - Half the line width in NDC space
   */
  #drawPolylineAsQuads(vertices, colors, indices, halfWidth) {
    const gl = this.#gl;
    
    if (indices.length < 2) {
      return; // Need at least 2 points for a line
    }
    
    const allQuadVertices = [];
    const allQuadColors = [];
    // NOTE: Edge smoothing disabled - distance array not generated
    // const allQuadDistances = []; // Distance from centerline for edge smoothing
    const allQuadIndices = [];
    let vertexOffset = 0;
    
    // Get the color for this edge (or use current color)
    const edgeColor = colors ? this.#toWebGLColor(colors) : this.#currentColor;
    
    // Draw each line segment as a quad
    for (let i = 0; i < indices.length - 1; i++) {
      const idx0 = indices[i];
      const idx1 = indices[i + 1];
      
      const v0 = vertices[idx0];
      const v1 = vertices[idx1];
      const p0 = this._extractPoint(v0);
      const p1 = this._extractPoint(v1);
      
      // Calculate direction vector and perpendicular
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len === 0) continue; // Skip zero-length segments
      
      // Normalize and get perpendicular (rotate 90 degrees)
      const nx = -dy / len;
      const ny = dx / len;
      
      // Create quad vertices (4 corners of the rectangle)
      const quadVertices = [
        p0[0] + nx * halfWidth, p0[1] + ny * halfWidth,  // 0: left of p0
        p0[0] - nx * halfWidth, p0[1] - ny * halfWidth,  // 1: right of p0
        p1[0] + nx * halfWidth, p1[1] + ny * halfWidth,  // 2: left of p1
        p1[0] - nx * halfWidth, p1[1] - ny * halfWidth   // 3: right of p1
      ];
      
      // NOTE: Edge smoothing disabled - distance calculation commented out
      // To re-enable: uncomment this block and update shaders (see fragment shader comments)
      // Distance from centerline: -halfWidth for left side, +halfWidth for right side
      // const quadDistances = [
      //   -halfWidth,  // 0: left of p0
      //   halfWidth,   // 1: right of p0
      //   -halfWidth,  // 2: left of p1
      //   halfWidth    // 3: right of p1
      // ];
      
      // Add vertices
      allQuadVertices.push(...quadVertices);
      
      // Add colors (same color for all 4 vertices of the quad)
      allQuadColors.push(...edgeColor, ...edgeColor, ...edgeColor, ...edgeColor);
      
      // NOTE: Edge smoothing disabled - distance not added
      // allQuadDistances.push(...quadDistances);
      
      // Add indices for 2 triangles forming the quad
      allQuadIndices.push(
        vertexOffset + 0, vertexOffset + 1, vertexOffset + 2,  // Triangle 1
        vertexOffset + 1, vertexOffset + 3, vertexOffset + 2   // Triangle 2
      );
      
      vertexOffset += 4;
    }
    
    // Draw all quads as triangles
    if (allQuadVertices.length > 0) {
      const vertexArray = new Float32Array(allQuadVertices);
      const colorArray = new Float32Array(allQuadColors);
      // NOTE: Edge smoothing disabled - distance array not passed
      // const distanceArray = new Float32Array(allQuadDistances);
      const indexArray = new Uint16Array(allQuadIndices);
      // Use cached TRIANGLES constant
      // NOTE: Edge smoothing disabled - pass null for distances and 0 for lineHalfWidth
      this.#drawGeometry(vertexArray, colorArray, indexArray, this.#capabilities.TRIANGLES, null, 0);
    }
  }

  /**
   * Draw a filled polygon (implements abstract method)
   * @protected
   * @param {*} vertices - Vertex coordinate data
   * @param {*} colors - Vertex color data
   * @param {number[]} indices - Array of vertex indices
   * @param {boolean} fill - Whether to fill the polygon
   */
  _drawPolygon(vertices, color, indices, fill) {
    const gl = this.#gl;
    // console.error('🔵 WebGL2DRenderer._drawPolygon CALLED - color:', color);
    if (color != null) color = color.map(c => c/255);
    // Convert vertices to Float32Array (creates compacted array)
    const vertexArray = this.#verticesToFloat32Array(vertices, indices);
    // colors is a single color per face (or null) - replicate it for all vertices
    const colorArray =  (color != null) ? this.#colorsToFloat32Array(color, indices, this.#currentColor) : this.#colorsToFloat32Array(this.#currentColor, indices, this.#currentColor);
  
    // Debug: log vertex count for polygons with more than 3 vertices
   
    // Triangulate using sequential indices (0, 1, 2, ...) since vertexArray is already compacted
    // The vertexArray contains vertices in the order they appear in indices
    const numVertices = indices.length;
    const indexArray = this.#triangulatePolygonSequential(numVertices);
    
    // Use cached TRIANGLES constant
    this.#drawGeometry(vertexArray, colorArray, indexArray, this.#capabilities.TRIANGLES);
  }

  /**
   * Draw geometry using WebGL
   * @private
   * @param {Float32Array} vertices - Vertex positions
   * @param {Float32Array} colors - Vertex colors
   * @param {Uint16Array|null} indices - Index array (null for non-indexed)
   * @param {number} mode - WebGL drawing mode (TRIANGLES, LINE_STRIP, etc.)
   * @param {Float32Array|null} [distances=null] - Distance from centerline for edge smoothing (null for non-lines)
   * @param {number} [lineHalfWidth=0] - Half width of line for edge smoothing (0 for non-lines)
   */
  #drawGeometry(vertices, colors, indices, mode, distances = null, lineHalfWidth = 0) {
    const gl = this.#gl;
    const program = this.#program;
    
    // Validate inputs
    if (!vertices || vertices.length === 0) {
      console.warn('WebGL2DRenderer: No vertices to draw');
      return;
    }
    
    if (vertices.length % 2 !== 0) {
      console.warn('WebGL2DRenderer: Invalid vertex array length (must be multiple of 2)');
      return;
    }
    
    // Ensure program is active
    gl.useProgram(program);
    
    // Update uniforms with current transformation and line width (point size = 1.0 for non-points)
    this.#updateUniforms(lineHalfWidth, 1.0);
    
    // Bind buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    if (positionLoc === -1) {
      console.error('WebGL2DRenderer: a_position attribute not found in shader');
      return;
    }
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
    
    const colorLoc = gl.getAttribLocation(program, 'a_color');
    if (colorLoc === -1) {
      console.error('WebGL2DRenderer: a_color attribute not found in shader');
      return;
    }
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    
    // NOTE: Edge smoothing disabled - distance buffer handling commented out
    // To re-enable: uncomment this block and update shaders (see fragment shader comments)
    // const distanceLoc = gl.getAttribLocation(program, 'a_distance');
    // if (distanceLoc !== -1) {
    //   if (distances && distances.length > 0) {
    //     gl.bindBuffer(gl.ARRAY_BUFFER, this.#distanceBuffer);
    //     gl.bufferData(gl.ARRAY_BUFFER, distances, gl.DYNAMIC_DRAW);
    //     gl.enableVertexAttribArray(distanceLoc);
    //     gl.vertexAttribPointer(distanceLoc, 1, gl.FLOAT, false, 0, 0);
    //   } else {
    //     // Disable distance attribute if not provided (for non-line primitives)
    //     gl.disableVertexAttribArray(distanceLoc);
    //     gl.vertexAttrib1f(distanceLoc, 0.0);
    //   }
    // }
    
    // Draw
    // Note: We don't validate mode here because gl.POINTS, gl.LINE_STRIP, etc. should always be valid
    // The INVALID_ENUM error might be from something else (like gl.UNSIGNED_SHORT)
    if (indices && indices.length > 0) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
      
      // Use cached UNSIGNED_SHORT constant
      const indexType = this.#capabilities.UNSIGNED_SHORT;
      if (indexType === undefined || indexType === null) {
        console.error('WebGL2DRenderer: gl.UNSIGNED_SHORT is not available');
        return;
      }
      
      gl.drawElements(mode, indices.length, indexType, 0);
    } else {
      const vertexCount = vertices.length / 2;
      // Ensure mode is a number (not undefined), default to cached LINE_STRIP
      const drawMode = (typeof mode === 'number' && !isNaN(mode)) ? mode : this.#capabilities.LINE_STRIP;
      
      // IMPORTANT: Unbind ELEMENT_ARRAY_BUFFER when using drawArrays
      // If ELEMENT_ARRAY_BUFFER is bound from previous drawElements call (e.g., from face rendering),
      // it can interfere with drawArrays
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      
      gl.drawArrays(drawMode, 0, vertexCount);
    }
    
    // Check for WebGL errors immediately after draw call
    // const error = gl.getError();
    // if (error !== gl.NO_ERROR) {
    //   const errorNames = {
    //     [gl.INVALID_ENUM]: 'INVALID_ENUM',
    //     [gl.INVALID_VALUE]: 'INVALID_VALUE',
    //     [gl.INVALID_OPERATION]: 'INVALID_OPERATION',
    //     [gl.INVALID_FRAMEBUFFER_OPERATION]: 'INVALID_FRAMEBUFFER_OPERATION',
    //     [gl.OUT_OF_MEMORY]: 'OUT_OF_MEMORY'
    //   };
    //   console.error('WebGL error in #drawGeometry:', errorNames[error] || error, 
    //     'mode:', mode, 'mode type:', typeof mode,
    //     'hasIndices:', !!(indices && indices.length > 0),
    //     'vertexCount:', vertices.length / 2,
    //     'indicesLength:', indices ? indices.length : 0,
    //     'gl.LINE_STRIP:', gl.LINE_STRIP,
    //     'gl.TRIANGLES:', gl.TRIANGLES);
    // }
  }

  /**
   * Extract point from vertex data (overrides abstract method)
   * Pass-through implementation: returns the vertex unchanged.
   * The dimension is detected in _drawPoint and used to set the appropriate
   * gl.vertexAttribPointer size (2, 3, or 4 components).
   * 
   * @protected
   * @param {number[]} vertex - Vertex coordinates [x, y] or [x, y, z] or [x, y, z, w]
   * @returns {number[]} Vertex unchanged (pass-through)
   */
  _extractPoint(vertex) {
    // Pass-through: return vertex as-is
    return [vertex[0], vertex[1]];
  }

  /**
   * Convert vertices to Float32Array
   * @private
   * @param {*} vertices - Vertex data
   * @param {number[]} indices - Vertex indices
   * @returns {Float32Array}
   */
  #verticesToFloat32Array(vertices, indices) {
    const result = [];
    for (const index of indices) {
      const vertex = vertices[index];
      const point = this._extractPoint(vertex);
      result.push(point[0], point[1]);
    }
    return new Float32Array(result);
  }

  /**
   * Convert colors to Float32Array
   * @private
   * @param {*} colors - Color data (can be a single color for the whole face/line, or per-vertex colors array)
   * @param {number[]} indices - Vertex indices
   * @param {number[]} defaultColor - Default color if no colors provided
   * @returns {Float32Array}
   */
  #colorsToFloat32Array(colors, indices, defaultColor) {
    const result = [];
    
    // Check if colors is a single color value (not an array indexed by vertex indices)
    // Single color: Color object, CSS string, or single array [r,g,b,a]
    // Per-vertex colors: Array where colors[index] exists for each index
    const isSingleColor = colors && (
      typeof colors === 'string' || // CSS string
      (colors.getRed && typeof colors.getRed === 'function') || // Color object
      (Array.isArray(colors) && colors.length <= 4 && typeof colors[0] === 'number') // [r,g,b] or [r,g,b,a]
    );
    
    if (isSingleColor) {
      // Single color for entire face/line - apply to all vertices
      const color = this.#toWebGLColor(colors);
      for (let i = 0; i < indices.length; i++) {
        result.push(...color);
      }
    } else if (colors && Array.isArray(colors)) {
      // Per-vertex colors array - use colors[index] for each vertex
      for (const index of indices) {
        let color = defaultColor;
        if (colors[index] !== undefined && colors[index] !== null) {
          color = this.#toWebGLColor(colors[index]);
        }
        result.push(...color);
      }
    } else {
      // No colors provided - use default for all vertices
      for (let i = 0; i < indices.length; i++) {
        result.push(...defaultColor);
      }
    }
    
    return new Float32Array(result);
  }

  /**
   * Triangulate a polygon using sequential indices (for compacted vertex arrays)
   * @private
   * @param {number} numVertices - Number of vertices in the polygon
   * @returns {Uint16Array}
   */
  #triangulatePolygonSequential(numVertices) {
    const result = [];
    // Fan triangulation: triangle fan from vertex 0
    for (let i = 1; i < numVertices - 1; i++) {
      result.push(0, i, i + 1);
    }
    return new Uint16Array(result);
  }

  /**
   * Convert color to WebGL format [r, g, b, a] in range [0, 1]
   * @private
   * @param {*} color - Color (Color object, array, or CSS string)
   * @returns {number[]}
   */
  #toWebGLColor(color) {
    if (color instanceof Color) {
    return color.toFloatArray();
    } else if (Array.isArray(color)) {
      return color;
    } else return [1.0, 1.0, 1.0, 1.0];
  }
}

