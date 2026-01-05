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

import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { Dimension } from '../scene/Viewer.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { Color } from '../util/Color.js';
import { Abstract2DRenderer } from './Abstract2DRenderer.js';
import { Abstract2DViewer } from './Abstract2DViewer.js';
import { getLogger, Category } from '../util/LoggingSystem.js';

const logger = getLogger('jsreality.core.viewers.WebGL2DViewer');

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */
/** @typedef {import('../scene/Camera.js').Camera} Camera */

// Log GL size/capability diagnostics only once per page load to avoid spamming
// during offscreen rendering (recording creates a temporary WebGL viewer per frame).
let didLogWebGLCaps = false;

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

  /** @type {ResizeObserver|null} */
  #resizeObserver = null;

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
   * @param {boolean} [options.alpha=true] - Whether the drawing buffer has an alpha channel
   * @param {boolean} [options.antialias=true] - Whether the default framebuffer is multisampled (MSAA)
   * @param {boolean} [options.preserveDrawingBuffer=true] - Keep drawing buffer after presenting
   * @param {boolean} [options.depth=true] - Whether to request a depth buffer
   * @param {boolean} [options.stencil=false] - Whether to request a stencil buffer
   * @param {boolean|{ enabled?: boolean, everyNFrames?: number, logFn?: Function }} [options.debugPerf=false]
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
    const contextAttributes = {
      alpha: options.alpha !== false,
      antialias: options.antialias !== false,
      depth: options.depth !== false,
      stencil: options.stencil === true,
      preserveDrawingBuffer: options.preserveDrawingBuffer !== false
    };
    
    if (preferWebGL2) {
      gl = canvas.getContext('webgl2', {
        ...contextAttributes
      });
    }
    
    if (!gl) {
      gl = canvas.getContext('webgl', {
        ...contextAttributes
      });
    }
    
    if (!gl) {
      throw new Error('Failed to get WebGL context from canvas. WebGL may not be supported.');
    }

    this.#gl = gl;
    this.#autoResize = options.autoResize !== false;
    this._pixelRatio = options.pixelRatio || window.devicePixelRatio || 1;

    // Optional perf debug logging (counts cache hits, GL uploads/draws, etc.)
    if (options.debugPerf) {
      this.setDebugPerf(options.debugPerf);
    }
    
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
    let displayWidth = canvas.clientWidth;
    let displayHeight = canvas.clientHeight;
    
    if (displayWidth === 0)   displayWidth = 800;  // If canvas has no size yet, set a default width (ResizeObserver will call us again)
    if (displayHeight === 0)  displayHeight = 600;  // If canvas has no size yet, set a default height (ResizeObserver will call us again)
   
    // if (displayWidth === 0 || displayHeight === 0) {
    //   return;
    // }

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
    this.#resizeObserver = new ResizeObserver(() => {
      this.#setupCanvas();
      // Note: We don't call render() here. The ResizeObserver fires during initialization
      // before the viewer is selected, and we don't want to render inactive viewers.
      // The caller is responsible for triggering render() when needed.
    });

    this.#resizeObserver.observe(this.#canvas);
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
    this.#setupCanvas();
    if (!this.#renderer) {
      this.#renderer = new WebGL2DRenderer(this);
    }
    this.#renderer.render();
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

  /**
   * Dispose viewer resources (ResizeObserver, GPU context).
   * Called by ViewerSwitch on teardown.
   */
  dispose() {
    if (this.#resizeObserver) {
      try {
        this.#resizeObserver.disconnect();
      } finally {
        this.#resizeObserver = null;
      }
    }

    // Drop renderer reference (releases JS-side caches).
    this.#renderer = null;

    // Attempt to release GPU resources aggressively.
    // Safe to ignore if extension is unavailable.
    try {
      const loseExt = this.#gl?.getExtension?.('WEBGL_lose_context');
      loseExt?.loseContext?.();
    } catch {
      // ignore
    }
  }

  /**
   * Render the current WebGL2D view into an offscreen canvas at the given size.
   *
   * This implementation does not modify the on-screen canvas. It creates a
   * temporary off-screen WebGL2DViewer whose viewing component is sized to the
   * requested export dimensions so that camera/projection are computed for the
   * correct aspect ratio, then rasterizes that into the returned 2D canvas.
   * Callers are responsible for any download/export logic.
   *
   * NOTE ON MAX EXPORT SIZE:
   * Even if WebGL reports generous size limits (e.g. MAX_TEXTURE_SIZE and
   * MAX_RENDERBUFFER_SIZE are often 16384), Chrome/driver may clamp the
   * *default framebuffer* (gl.drawingBufferWidth/Height) to a smaller size
   * due to GPU memory/tiling constraints. In our tests on one machine, asking
   * for an 8192x8192 export produced a canvas backing store of 8192x8192, but
   * the WebGL drawing buffer was clamped to ~5725x5794, causing truncation.
   *
   * Mitigations tried:
   * - Disabling MSAA (context antialias=false) and requesting no depth/stencil
   *   did not change the clamp on that machine.
   * - Avoiding devicePixelRatio multiplication in export helped mitigate the
   *   issue (smaller backing-store request).
   *
   * Next steps (not implemented):
   * - Render to an offscreen framebuffer/texture (FBO) instead of relying on
   *   the default framebuffer, then read back/blit to a 2D canvas.
   * - Tiled rendering (split the requested export into tiles) to stay below
   *   the per-drawing-buffer allocation ceiling.
   *
   * @param {number} width
   * @param {number} height
   * @param {{ antialias?: number, includeAlpha?: boolean }} [options]
   * @returns {Promise<HTMLCanvasElement>}
   */
  async renderOffscreen(width, height, options = {}) {
    const { includeAlpha = true } = options;
    return await this._renderOffscreen(
      'webGL',
      WebGL2DViewer,
      width,
      height,
      options,
      {
        webgl2: this.isWebGL2(),
        // For large exports, MSAA on the default framebuffer can drastically
        // increase memory usage and reduce the maximum allocatable size.
        // Supersampling (our antialias factor) already provides anti-aliasing.
        antialias: false,
        // If the caller doesn't need alpha, request an opaque drawing buffer to
        // reduce memory footprint.
        alpha: includeAlpha,
        preserveDrawingBuffer: true,
        depth: true,
        stencil: false
      },
      (tempViewer, tempCanvas, info) => {
        const gl = tempViewer?.getGL?.();
        if (!gl) return;

        const targetW = Math.floor(info.exportWidth * info.pixelRatio * info.aa);
        const targetH = Math.floor(info.exportHeight * info.pixelRatio * info.aa);

        const actualCanvasW = tempCanvas.width;
        const actualCanvasH = tempCanvas.height;
        const actualDBW = gl.drawingBufferWidth;
        const actualDBH = gl.drawingBufferHeight;

        // Only log when something looks suspicious (clamping/truncation),
        // or when exporting very large images where limits are likely.
        const large = info.exportWidth >= 4096 || info.exportHeight >= 4096;
        const mismatch =
          actualCanvasW !== targetW ||
          actualCanvasH !== targetH ||
          actualDBW !== actualCanvasW ||
          actualDBH !== actualCanvasH;

        if (large || mismatch) {
          logger.info(Category.ALL, '[WebGL2D offscreen] size diagnostics', {
            requestedCSS: { w: info.exportWidth, h: info.exportHeight },
            antialias: info.aa,
            pixelRatio: info.pixelRatio,
            targetBackingStore: { w: targetW, h: targetH },
            canvasBackingStore: { w: actualCanvasW, h: actualCanvasH },
            drawingBuffer: { w: actualDBW, h: actualDBH },
            MAX_TEXTURE_SIZE: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            MAX_RENDERBUFFER_SIZE: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            MAX_VIEWPORT_DIMS: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
          });
        }

        // Hard warning when Chrome/driver clamps drawing buffer smaller than canvas.
        if (actualDBW !== actualCanvasW || actualDBH !== actualCanvasH) {
          logger.warn(
            Category.ALL,
            '[WebGL2D offscreen] drawingBuffer smaller than canvas backing store; export will be limited/clamped by GPU allocation',
            {
            canvasBackingStore: { w: actualCanvasW, h: actualCanvasH },
            drawingBuffer: { w: actualDBW, h: actualDBH }
            }
          );
        }
      }
    );
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

  /** @type {WebGLProgram|null} Program for instanced point-quads (WebGL2) */
  #pointProgram = null;

  /** @type {WebGLProgram|null} Program for instanced 3D spheres (WebGL2) */
  #sphereProgram = null;

  /** @type {WebGLProgram|null} Program for instanced tube segments (WebGL2) */
  #tubeProgram = null;

  /** @type {WebGLBuffer|null} */
  #pointCornerBuffer = null; // vec2 corners for the base quad

  /** @type {WebGLBuffer|null} */
  #pointIndexBuffer = null; // indices for base quad

  /** @type {WebGLBuffer|null} */
  #pointCenterBuffer = null; // per-instance vec4 center

  /** @type {WebGLBuffer|null} */
  #pointColorInstBuffer = null; // per-instance vec4 color

  /** @type {Map<number, { vbo: WebGLBuffer, ibo: WebGLBuffer, indexCount: number }>} */
  #sphereMeshCache = new Map();

  /** @type {WebGLBuffer|null} Per-instance center buffer for spheres (vec3) */
  #sphereCenterBuffer = null;

  /** @type {WebGLBuffer|null} Per-instance color buffer for spheres (vec4) */
  #sphereColorInstBuffer = null;

  /** @type {WeakMap<object, { coordsDL: any, colorsDL: any, centers: Float32Array, colors: Float32Array, count: number }>} */
  #sphereInstanceCache = new WeakMap();

  /** @type {WebGLBuffer|null} Base tube vertex buffer: interleaved (circleX, circleY, t) */
  #tubeVertexBuffer = null;

  /** @type {WebGLBuffer|null} Base tube index buffer */
  #tubeIndexBuffer = null;

  /** @type {WebGLBuffer|null} Per-instance p0 buffer (vec3) */
  #tubeP0Buffer = null;

  /** @type {WebGLBuffer|null} Per-instance p1 buffer (vec3) */
  #tubeP1Buffer = null;

  /** @type {WebGLBuffer|null} Per-instance color buffer (vec4) */
  #tubeColorInstBuffer = null;

  /** @type {number} */
  #tubeIndexCount = 0;

  /** @type {WeakMap<object, { coordsDL: any, colorsDL: any, centers: Float32Array, colors: Float32Array, count: number }>} */
  #pointInstanceCache = new WeakMap();

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

  /** @type {boolean} Whether the underlying WebGL context has a depth buffer */
  #hasDepthBuffer = false;

  /** @type {number} Debug frame counter (independent of viewer renderCallCount timing) */
  #debugFrame = 0;

  /** @type {null|{ bufferDataArray: number, bufferDataElement: number, drawElements: number, drawArrays: number }} */
  #debugGL = null;

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

  /** @type {number[]} Batched distances from centerline for edge smoothing */
  #batchedDistances = [];

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
    // Determine whether 32-bit element indices are usable.
    // WebGL2: core support via UNSIGNED_INT
    // WebGL1: requires OES_element_index_uint
    try {
      const isWebGL2 = (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext;
      if (isWebGL2) {
        this.#capabilities.supportsUint32Indices = true;
      } else {
        const ext = gl.getExtension?.('OES_element_index_uint');
        this.#capabilities.supportsUint32Indices = Boolean(ext);
      }
    } catch {
      this.#capabilities.supportsUint32Indices = false;
    }
    
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

    // Create instanced point resources (WebGL2 only).
    if (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) {
      this.#pointProgram = this.#createInstancedPointProgram();
      this.#pointCornerBuffer = gl.createBuffer();
      this.#pointIndexBuffer = gl.createBuffer();
      this.#pointCenterBuffer = gl.createBuffer();
      this.#pointColorInstBuffer = gl.createBuffer();

      // Base quad corners in local space (scaled by u_pointRadius in shader).
      // 4 vertices, vec2 each: (-1,-1), (1,-1), (-1,1), (1,1)
      const corners = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
      ]);
      const quadIndices = new Uint16Array([0, 1, 2, 1, 3, 2]);

      if (this.#pointCornerBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#pointCornerBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
      }
      if (this.#pointIndexBuffer) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#pointIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadIndices, gl.STATIC_DRAW);
      }

      // Create instanced sphere resources (WebGL2 only).
      this.#sphereProgram = this.#createInstancedSphereProgram();
      this.#sphereCenterBuffer = gl.createBuffer();
      this.#sphereColorInstBuffer = gl.createBuffer();

      // Create instanced tube resources (WebGL2 only).
      this.#tubeProgram = this.#createInstancedTubeProgram();
      this.#tubeVertexBuffer = gl.createBuffer();
      this.#tubeIndexBuffer = gl.createBuffer();
      this.#tubeP0Buffer = gl.createBuffer();
      this.#tubeP1Buffer = gl.createBuffer();
      this.#tubeColorInstBuffer = gl.createBuffer();

      // Base tube mesh: a unit-radius cylinder along the segment from p0->p1, represented as:
      // - circle basis (cx, cy) in local cross-section plane
      // - t in [0,1] along the segment
      //
      // The shader expands this into world-space using p0/p1 and u_radius.
      const SEG = 12; // cross-section resolution (12-gon). Tune for quality/perf.
      const base = new Float32Array(SEG * 2 * 3); // (cx,cy,t) * (2 rings)
      let o = 0;
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * Math.PI * 2;
        const cx = Math.cos(a);
        const cy = Math.sin(a);
        // ring at t=0
        base[o++] = cx; base[o++] = cy; base[o++] = 0.0;
        // ring at t=1
        base[o++] = cx; base[o++] = cy; base[o++] = 1.0;
      }
      const idx = new Uint16Array(SEG * 6);
      let io = 0;
      for (let i = 0; i < SEG; i++) {
        const i0 = 2 * i;
        const i1 = i0 + 1;
        const j0 = 2 * ((i + 1) % SEG);
        const j1 = j0 + 1;
        // two triangles for quad between segment i and i+1
        idx[io++] = i0; idx[io++] = i1; idx[io++] = j0;
        idx[io++] = i1; idx[io++] = j1; idx[io++] = j0;
      }
      this.#tubeIndexCount = idx.length;
      if (this.#tubeVertexBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#tubeVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, base, gl.STATIC_DRAW);
      }
      if (this.#tubeIndexBuffer) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#tubeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      }
    }
    
    if (!this.#vertexBuffer || !this.#colorBuffer || !this.#indexBuffer || !this.#distanceBuffer) {
      throw new Error('Failed to create WebGL buffers');
    }
    
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Depth is opt-in (the viewer can request a depth buffer via options.depth=true).
    // If present, enable depth testing so 3D scenes render correctly.
    try {
      this.#hasDepthBuffer = Boolean(gl.getContextAttributes?.().depth);
    } catch {
      this.#hasDepthBuffer = false;
    }
    if (this.#hasDepthBuffer) {
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clearDepth(1.0);
      gl.depthMask(true);
    }
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
      UNSIGNED_SHORT: gl.UNSIGNED_SHORT,
      UNSIGNED_INT: gl.UNSIGNED_INT,
      supportsUint32Indices: false
    };

    // -------------------------------------------------------------------------
    // Memory / size-related limits (useful for diagnosing export failures).
    // Note: WebGL doesn't expose direct "GPU memory" numbers, but these limits
    // strongly constrain maximum renderable image sizes.
    // -------------------------------------------------------------------------
    try {
      caps.MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    } catch (e) {
      caps.MAX_TEXTURE_SIZE = null;
    }
    try {
      caps.MAX_RENDERBUFFER_SIZE = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    } catch (e) {
      caps.MAX_RENDERBUFFER_SIZE = null;
    }
    try {
      caps.MAX_VIEWPORT_DIMS = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    } catch (e) {
      caps.MAX_VIEWPORT_DIMS = null;
    }
    // WebGL2 only
    if (gl.MAX_SAMPLES !== undefined) {
      try {
        caps.MAX_SAMPLES = gl.getParameter(gl.MAX_SAMPLES);
      } catch (e) {
        caps.MAX_SAMPLES = null;
      }
    }

    // Log once at startup for easier debugging of size limits.
    try {
      if (!didLogWebGLCaps) {
        didLogWebGLCaps = true;
        logger.fine(Category.ALL, '[WebGL2D] Capabilities / size limits', {
          isWebGL2: (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext,
          MAX_TEXTURE_SIZE: caps.MAX_TEXTURE_SIZE,
          MAX_RENDERBUFFER_SIZE: caps.MAX_RENDERBUFFER_SIZE,
          MAX_VIEWPORT_DIMS: caps.MAX_VIEWPORT_DIMS,
          MAX_SAMPLES: caps.MAX_SAMPLES ?? '(n/a)',
          ALIASED_POINT_SIZE_RANGE: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
          ALIASED_LINE_WIDTH_RANGE: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)
        });
      }
    } catch (e) {
      // Logging should never break rendering.
    }
    
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
      // Distance from centerline (for line edge smoothing)
      attribute float a_distance;
      
      uniform mat4 u_transform;
      uniform float u_pointSize;
      
      varying vec4 v_color;
      // Pass distance to fragment shader
      varying float v_distance;
      
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
        // Pass through distance for edge smoothing
        v_distance = a_distance;
      }
    `;
    
    // Fragment shader source
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec4 v_color;
      // NOTE: Edge smoothing disabled - uncomment to re-enable
      varying float v_distance;
      
      // NOTE: Edge smoothing disabled - uncomment to re-enable
      uniform float u_lineHalfWidth; // Half width of the line (for edge smoothing)
      
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
        float dist = abs(v_distance);
        float alpha = 1.0;
        if (u_lineHalfWidth > 0.0) {
          float edgeFade = 0.1; // Fade over 10% of line width
          float fadeStart = u_lineHalfWidth * (1.0 - edgeFade);
          alpha = 1.0 - smoothstep(fadeStart, u_lineHalfWidth, dist);
        }
        gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
        
        // Current code (edge smoothing disabled):
        // For point rendering, gl_PointCoord is available but we use solid color for now
        // gl_FragColor = v_color;
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
   * WebGL2-only: program for instanced point quads.
   * @private
   * @returns {WebGLProgram|null}
   */
  #createInstancedPointProgram() {
    const gl = this.#gl;
    if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)) {
      return null;
    }

    const vs = `#version 300 es
      precision mediump float;
      in vec2 a_corner;      // base quad corner in [-1,1]^2
      in vec4 a_center;      // per-instance center (x,y,z,w)
      in vec4 a_color;       // per-instance color

      uniform mat4 u_transform;
      uniform float u_pointRadius;

      out vec4 v_color;

      void main() {
        vec4 center = a_center;
        if (center.w == 0.0) center.w = 1.0;
        vec4 p = center + vec4(a_corner * u_pointRadius, 0.0, 0.0);
        gl_Position = u_transform * p;
        v_color = a_color;
      }`;

    const fs = `#version 300 es
      precision mediump float;
      in vec4 v_color;
      out vec4 outColor;
      void main() {
        outColor = v_color;
      }`;

    const vsh = this.#compileShader(gl.VERTEX_SHADER, vs);
    const fsh = this.#compileShader(gl.FRAGMENT_SHADER, fs);
    if (!vsh || !fsh) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vsh);
    gl.attachShader(program, fsh);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('WebGL instanced point program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  /**
   * WebGL2-only: program for instanced 3D spheres.
   * We instance a pre-tessellated unit icosphere mesh and translate/scale it per point.
   * @private
   * @returns {WebGLProgram|null}
   */
  #createInstancedSphereProgram() {
    const gl = this.#gl;
    if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)) {
      return null;
    }

    const vs = `#version 300 es
      precision mediump float;

      in vec3 a_pos;       // unit sphere position
      in vec3 a_center;    // per-instance center
      in vec4 a_color;     // per-instance color

      uniform mat4 u_transform;
      uniform float u_radius;

      out vec4 v_color;

      void main() {
        vec3 p = a_center + a_pos * u_radius;
        gl_Position = u_transform * vec4(p, 1.0);
        v_color = a_color;
      }`;

    const fs = `#version 300 es
      precision mediump float;
      in vec4 v_color;
      out vec4 outColor;
      void main() {
        outColor = v_color;
      }`;

    const vsh = this.#compileShader(gl.VERTEX_SHADER, vs);
    const fsh = this.#compileShader(gl.FRAGMENT_SHADER, fs);
    if (!vsh || !fsh) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vsh);
    gl.attachShader(program, fsh);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('WebGL instanced sphere program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  /**
   * Create (or fetch) an icosphere mesh uploaded to GPU buffers.
   * @private
   * @param {number} level - subdivision level (0..4 recommended)
   * @returns {{ vbo: WebGLBuffer, ibo: WebGLBuffer, indexCount: number } | null}
   */
  #getOrCreateSphereMesh(level) {
    const gl = this.#gl;
    const isWebGL2 = (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext;
    if (!isWebGL2) return null;

    const lvl = Math.max(0, Math.min(4, level | 0));
    const cached = this.#sphereMeshCache.get(lvl);
    if (cached) return cached;

    const mesh = this.#buildIcoSphere(lvl);
    if (!mesh) return null;

    const vbo = gl.createBuffer();
    const ibo = gl.createBuffer();
    if (!vbo || !ibo) return null;

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    const entry = { vbo, ibo, indexCount: mesh.indices.length };
    this.#sphereMeshCache.set(lvl, entry);
    return entry;
  }

  /**
   * Build an icosphere (tessellated icosahedron) in JS.
   * Returns unit-radius positions (Float32Array) and triangle indices (Uint16Array).
   * @private
   * @param {number} level
   * @returns {{ positions: Float32Array, indices: Uint16Array } | null}
   */
  #buildIcoSphere(level) {
    const t = (1 + Math.sqrt(5)) / 2;
    let verts = [
      [-1,  t,  0], [ 1,  t,  0], [-1, -t,  0], [ 1, -t,  0],
      [ 0, -1,  t], [ 0,  1,  t], [ 0, -1, -t], [ 0,  1, -t],
      [ t,  0, -1], [ t,  0,  1], [-t,  0, -1], [-t,  0,  1]
    ];
    // normalize to unit sphere
    for (let i = 0; i < verts.length; i++) {
      const x = verts[i][0], y = verts[i][1], z = verts[i][2];
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      verts[i] = [x / len, y / len, z / len];
    }

    let faces = [
      [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
      [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
      [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
      [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
    ];

    const midpointCache = new Map(); // "a,b" -> index
    const midpoint = (a, b) => {
      const i0 = Math.min(a, b);
      const i1 = Math.max(a, b);
      const key = `${i0},${i1}`;
      const hit = midpointCache.get(key);
      if (hit !== undefined) return hit;
      const v0 = verts[a];
      const v1 = verts[b];
      const mx = (v0[0] + v1[0]) * 0.5;
      const my = (v0[1] + v1[1]) * 0.5;
      const mz = (v0[2] + v1[2]) * 0.5;
      const len = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
      const idx = verts.length;
      verts.push([mx / len, my / len, mz / len]);
      midpointCache.set(key, idx);
      return idx;
    };

    const lvl = Math.max(0, level | 0);
    for (let s = 0; s < lvl; s++) {
      midpointCache.clear();
      const next = [];
      for (const f of faces) {
        const a = f[0], b = f[1], c = f[2];
        const ab = midpoint(a, b);
        const bc = midpoint(b, c);
        const ca = midpoint(c, a);
        next.push([a, ab, ca]);
        next.push([b, bc, ab]);
        next.push([c, ca, bc]);
        next.push([ab, bc, ca]);
      }
      faces = next;
    }

    if (verts.length > 65535) {
      // Keep WebGL2 mesh indices in Uint16 for now (levels 0..4 are safe).
      return null;
    }

    const positions = new Float32Array(verts.length * 3);
    for (let i = 0; i < verts.length; i++) {
      positions[i * 3 + 0] = verts[i][0];
      positions[i * 3 + 1] = verts[i][1];
      positions[i * 3 + 2] = verts[i][2];
    }
    const indices = new Uint16Array(faces.length * 3);
    let o = 0;
    for (const f of faces) {
      indices[o++] = f[0];
      indices[o++] = f[1];
      indices[o++] = f[2];
    }
    return { positions, indices };
  }

  /**
   * WebGL2-only: program for instanced tube segments (true 3D tubes).
   *
   * We instance one unit cylinder cross-section along each segment (p0->p1).
   * Per-instance attributes provide endpoints and color; the vertex shader builds
   * an orthonormal frame on the fly and expands the tube in 3D.
   *
   * @private
   * @returns {WebGLProgram|null}
   */
  #createInstancedTubeProgram() {
    const gl = this.#gl;
    if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)) {
      return null;
    }

    const vs = `#version 300 es
      precision mediump float;

      // Base mesh vertex: (circleX, circleY, t)
      in vec3 a_circleT;

      // Per-instance segment endpoints (world/object space)
      in vec3 a_p0;
      in vec3 a_p1;

      // Per-instance color
      in vec4 a_color;

      uniform mat4 u_transform;
      uniform float u_radius;

      out vec4 v_color;

      // Build a stable basis from a direction vector.
      void makeBasis(in vec3 dir, out vec3 bx, out vec3 by) {
        // Choose an "up" that isn't parallel to dir.
        vec3 up = (abs(dir.z) < 0.999) ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
        bx = normalize(cross(dir, up));
        by = cross(bx, dir);
      }

      void main() {
        vec3 p0 = a_p0;
        vec3 p1 = a_p1;
        vec3 d = p1 - p0;
        float len = length(d);
        // Avoid NaNs for degenerate segments.
        vec3 dir = (len > 0.0) ? (d / len) : vec3(0.0, 0.0, 1.0);

        vec3 bx, by;
        makeBasis(dir, bx, by);

        float t = a_circleT.z;
        vec2 c = a_circleT.xy;
        vec3 center = mix(p0, p1, t);
        vec3 offset = (bx * c.x + by * c.y) * u_radius;
        vec4 worldPos = vec4(center + offset, 1.0);
        gl_Position = u_transform * worldPos;
        v_color = a_color;
      }`;

    const fs = `#version 300 es
      precision mediump float;
      in vec4 v_color;
      out vec4 outColor;
      void main() {
        outColor = v_color;
      }`;

    const vsh = this.#compileShader(gl.VERTEX_SHADER, vs);
    const fsh = this.#compileShader(gl.FRAGMENT_SHADER, fs);
    if (!vsh || !fsh) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vsh);
    gl.attachShader(program, fsh);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('WebGL instanced tube program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  /**
   * WebGL override: batch edge rendering.
   * - If tubesDraw is enabled, batch all polylines into one triangle draw via existing batching arrays.
   * - Otherwise fall back to the base behavior (line strips).
   *
   * @protected
   * @param {*} geometry
   */
  _renderEdgesAsLines(geometry) {
    const showLines = this.getBooleanAttribute?.(CommonAttributes.EDGE_DRAW, true);
    if (!showLines) return;

    const vertices = this._cacheGetVertexCoordsArray(geometry);
    if (!vertices) return;

    // Indices and optional per-edge colors
    const indices = this._cacheGetEdgeIndicesArray(geometry);
    const edgeColors = this._cacheGetEdgeColorsArray(geometry);
    if (!indices || indices.length === 0) return;

    // Decide tube vs line strip
    const tubeDraw = Boolean(this.getAppearanceAttribute(
      CommonAttributes.LINE_SHADER,
      CommonAttributes.TUBES_DRAW,
      CommonAttributes.TUBES_DRAW_DEFAULT
    ));

    this._beginPrimitiveGroup(CommonAttributes.LINE);

    if (tubeDraw) {
      const tubeRadius = this.getAppearanceAttribute(
        CommonAttributes.LINE_SHADER,
        CommonAttributes.TUBE_RADIUS,
        CommonAttributes.TUBE_RADIUS_DEFAULT
      );
      const edgeColorDefault = this.#currentColor;

      const gl = this.#gl;
      const isWebGL2 = (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext;
      const canInstanceTubes = Boolean(isWebGL2 && this.#tubeProgram && this.#tubeVertexBuffer && this.#tubeIndexBuffer && this.#tubeP0Buffer && this.#tubeP1Buffer && this.#tubeColorInstBuffer && this.#tubeIndexCount > 0);

      if (canInstanceTubes) {
        // Instanced true-3D tube segments: one instance per polyline segment.
        // Build instance arrays of p0/p1/color for all segments and draw once.
        let segCount = 0;
        for (let i = 0; i < indices.length; i++) {
          const poly = indices[i];
          if (poly && poly.length >= 2) segCount += (poly.length - 1);
        }
        if (segCount > 0) {
          const p0s = new Float32Array(segCount * 3);
          const p1s = new Float32Array(segCount * 3);
          const cols = new Float32Array(segCount * 4);

          let s = 0;
          for (let i = 0; i < indices.length; i++) {
            const poly = indices[i];
            if (!poly || poly.length < 2) continue;
            const c = edgeColors ? edgeColors[i] : null;
            const edgeColor = c ? this.#toWebGLColor(c) : edgeColorDefault;
            for (let j = 0; j < poly.length - 1; j++) {
              const idx0 = poly[j];
              const idx1 = poly[j + 1];
              const v0 = vertices[idx0];
              const v1 = vertices[idx1];
              const p0 = this._extractPoint(v0);
              const p1 = this._extractPoint(v1);
              const o0 = s * 3;
              const oc = s * 4;
              p0s[o0 + 0] = Number(p0[0] ?? 0) || 0;
              p0s[o0 + 1] = Number(p0[1] ?? 0) || 0;
              p0s[o0 + 2] = Number(p0[2] ?? 0) || 0;
              p1s[o0 + 0] = Number(p1[0] ?? 0) || 0;
              p1s[o0 + 1] = Number(p1[1] ?? 0) || 0;
              p1s[o0 + 2] = Number(p1[2] ?? 0) || 0;
              cols[oc + 0] = edgeColor[0];
              cols[oc + 1] = edgeColor[1];
              cols[oc + 2] = edgeColor[2];
              cols[oc + 3] = edgeColor[3];
              s++;
            }
          }

          gl.useProgram(this.#tubeProgram);
          const transformLoc = gl.getUniformLocation(this.#tubeProgram, 'u_transform');
          gl.uniformMatrix4fv(transformLoc, true, this.getCurrentTransformation());
          const radiusLoc = gl.getUniformLocation(this.#tubeProgram, 'u_radius');
          gl.uniform1f(radiusLoc, tubeRadius);

          const circleTLoc = gl.getAttribLocation(this.#tubeProgram, 'a_circleT');
          const p0Loc = gl.getAttribLocation(this.#tubeProgram, 'a_p0');
          const p1Loc = gl.getAttribLocation(this.#tubeProgram, 'a_p1');
          const colorLoc = gl.getAttribLocation(this.#tubeProgram, 'a_color');

          // Base mesh
          gl.bindBuffer(gl.ARRAY_BUFFER, this.#tubeVertexBuffer);
          gl.enableVertexAttribArray(circleTLoc);
          gl.vertexAttribPointer(circleTLoc, 3, gl.FLOAT, false, 0, 0);
          gl.vertexAttribDivisor(circleTLoc, 0);

          // Per-instance p0
          gl.bindBuffer(gl.ARRAY_BUFFER, this.#tubeP0Buffer);
          gl.bufferData(gl.ARRAY_BUFFER, p0s, gl.DYNAMIC_DRAW);
          if (this.#debugGL) this.#debugGL.bufferDataArray++;
          gl.enableVertexAttribArray(p0Loc);
          gl.vertexAttribPointer(p0Loc, 3, gl.FLOAT, false, 0, 0);
          gl.vertexAttribDivisor(p0Loc, 1);

          // Per-instance p1
          gl.bindBuffer(gl.ARRAY_BUFFER, this.#tubeP1Buffer);
          gl.bufferData(gl.ARRAY_BUFFER, p1s, gl.DYNAMIC_DRAW);
          if (this.#debugGL) this.#debugGL.bufferDataArray++;
          gl.enableVertexAttribArray(p1Loc);
          gl.vertexAttribPointer(p1Loc, 3, gl.FLOAT, false, 0, 0);
          gl.vertexAttribDivisor(p1Loc, 1);

          // Per-instance color
          gl.bindBuffer(gl.ARRAY_BUFFER, this.#tubeColorInstBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, cols, gl.DYNAMIC_DRAW);
          if (this.#debugGL) this.#debugGL.bufferDataArray++;
          gl.enableVertexAttribArray(colorLoc);
          gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
          gl.vertexAttribDivisor(colorLoc, 1);

          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#tubeIndexBuffer);
          gl.drawElementsInstanced(gl.TRIANGLES, this.#tubeIndexCount, gl.UNSIGNED_SHORT, 0, segCount);
          if (this.#debugGL) this.#debugGL.drawElements++;

          this._getViewer()?._incrementEdgesRendered?.(indices.length);
          this._endPrimitiveGroup();
          return;
        }
      }

      // Fallback: batched quads (CPU-expanded)
      const halfWidth = tubeRadius;
      for (let i = 0; i < indices.length; i++) {
        const poly = indices[i];
        const c = edgeColors ? edgeColors[i] : null;
        const edgeColor = c ? this.#toWebGLColor(c) : edgeColorDefault;
        this.#addPolylineToBatch(vertices, poly, edgeColor, halfWidth);
      }
      // Flush happens in _endPrimitiveGroup()
    } else {
      // Fallback: still per-polyline line strips.
      const lineWidth = this.getAppearanceAttribute(
        CommonAttributes.LINE_SHADER,
        CommonAttributes.LINE_WIDTH,
        CommonAttributes.LINE_WIDTH_DEFAULT
      );
      for (let i = 0; i < indices.length; i++) {
        this.#drawPolylineAsLineStrip(vertices, edgeColors ? edgeColors[i] : null, indices[i], lineWidth);
      }
    }

    this._getViewer()?._incrementEdgesRendered?.(indices.length);
    this._endPrimitiveGroup();
  }

  /**
   * WebGL override: batch point rendering.
   * - If spheresDraw is true and WebGL2 is available, use instanced quad rendering.
   * - Otherwise batch GL_POINTS into one drawArrays.
   *
   * @protected
   * @param {*} geometry
   */
  _renderVerticesAsPoints(geometry) {
    const showPoints = this.getBooleanAttribute?.(CommonAttributes.VERTEX_DRAW, true);
    if (!showPoints) return;

    const vertsDL = geometry?.getVertexCoordinates?.() || null;
    if (!vertsDL) return;

    const shape = vertsDL.shape;
    const fiber = Array.isArray(shape) && shape.length >= 2 ? shape[shape.length - 1] : 0;
    const positionFiber = fiber || 3;
    const vertsFlat = typeof vertsDL.getFlatData === 'function' ? vertsDL.getFlatData() : null;
    if (!vertsFlat) {
      return super._renderVerticesAsPoints(geometry);
    }

    const numPoints = typeof geometry.getNumPoints === 'function' ? geometry.getNumPoints() : (shape?.[0] ?? 0);
    if (!numPoints) return;

    this._beginPrimitiveGroup(CommonAttributes.POINT);

    const spheresDraw = Boolean(this.getAppearanceAttribute(
      CommonAttributes.POINT_SHADER,
      CommonAttributes.SPHERES_DRAW,
      CommonAttributes.SPHERES_DRAW_DEFAULT
    ));

    const gl = this.#gl;
    const isWebGL2 = (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext;

    // WebGL2 + spheresDraw: draw instanced real 3D spheres (icospheres).
    if (spheresDraw && isWebGL2 && this.#sphereProgram && this.#sphereCenterBuffer && this.#sphereColorInstBuffer) {
      const pointRadius = this.getAppearanceAttribute(
        CommonAttributes.POINT_SHADER,
        CommonAttributes.POINT_RADIUS,
        CommonAttributes.POINT_RADIUS_DEFAULT
      );

      // Sphere tessellation level (coarse default; clamp to keep vertex counts sane).
      const sphereRes = this.getAppearanceAttribute(
        CommonAttributes.POINT_SHADER,
        CommonAttributes.SPHERE_RESOLUTION,
        2
      );
      const sphereLevel = Math.max(0, Math.min(4, (sphereRes == null ? 2 : sphereRes) | 0));
      const sphereMesh = this.#getOrCreateSphereMesh(sphereLevel);
      if (!sphereMesh) {
        // If we can’t build/upload a sphere mesh, fall back to old quad instancing if available.
        // (keeps behavior functional on platforms with partial WebGL2 support).
      } else {
        // Prepare (or reuse) instance arrays per geometry, only rebuilding when DataList identity changes.
        const colorsDL = geometry?.getVertexColors?.() || null;
        const cached = this.#sphereInstanceCache.get(geometry);
        if (!cached || cached.coordsDL !== vertsDL || cached.colorsDL !== colorsDL || cached.count !== numPoints) {
          const centers = new Float32Array(numPoints * 3);
          const colors = new Float32Array(numPoints * 4);

          // Centers: copy from vertex coords (xyz).
          for (let i = 0; i < numPoints; i++) {
            const src = i * positionFiber;
            const dst = i * 3;
            centers[dst + 0] = Number(vertsFlat[src + 0] ?? 0);
            centers[dst + 1] = Number(vertsFlat[src + 1] ?? 0);
            centers[dst + 2] = Number(vertsFlat[src + 2] ?? 0);
          }

          // Colors: per-vertex if present, else current color
          const defaultColor = this.#currentColor;
          if (colorsDL && typeof colorsDL.getFlatData === 'function') {
            const cFlat = colorsDL.getFlatData();
            const cShape = colorsDL.shape;
            const cFiber = Array.isArray(cShape) && cShape.length >= 2 ? cShape[cShape.length - 1] : 0;
            const cf = cFiber || 4;
            for (let i = 0; i < numPoints; i++) {
              const src = i * cf;
              const dst = i * 4;
              const r0 = cFlat[src + 0] ?? 255;
              const g0 = cFlat[src + 1] ?? 255;
              const b0 = cFlat[src + 2] ?? 255;
              const a0 = cf >= 4 ? (cFlat[src + 3] ?? 255) : 255;
              const max = Math.max(r0, g0, b0, a0);
              if (max > 1.0) {
                colors[dst + 0] = r0 / 255;
                colors[dst + 1] = g0 / 255;
                colors[dst + 2] = b0 / 255;
                colors[dst + 3] = a0 / 255;
              } else {
                colors[dst + 0] = r0;
                colors[dst + 1] = g0;
                colors[dst + 2] = b0;
                colors[dst + 3] = a0;
              }
            }
          } else {
            for (let i = 0; i < numPoints; i++) {
              const dst = i * 4;
              colors[dst + 0] = defaultColor[0];
              colors[dst + 1] = defaultColor[1];
              colors[dst + 2] = defaultColor[2];
              colors[dst + 3] = defaultColor[3];
            }
          }

          this.#sphereInstanceCache.set(geometry, { coordsDL: vertsDL, colorsDL, centers, colors, count: numPoints });
        }

        const inst = this.#sphereInstanceCache.get(geometry);
        gl.useProgram(this.#sphereProgram);

        // uniforms
        const transformLoc = gl.getUniformLocation(this.#sphereProgram, 'u_transform');
        gl.uniformMatrix4fv(transformLoc, true, this.getCurrentTransformation());
        const radiusLoc = gl.getUniformLocation(this.#sphereProgram, 'u_radius');
        gl.uniform1f(radiusLoc, pointRadius);

        // attributes
        const posLoc = gl.getAttribLocation(this.#sphereProgram, 'a_pos');
        const centerLoc = gl.getAttribLocation(this.#sphereProgram, 'a_center');
        const colorLoc = gl.getAttribLocation(this.#sphereProgram, 'a_color');

        // base sphere positions
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereMesh.vbo);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(posLoc, 0);

        // per-instance center
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#sphereCenterBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, inst.centers, gl.DYNAMIC_DRAW);
        if (this.#debugGL) this.#debugGL.bufferDataArray++;
        gl.enableVertexAttribArray(centerLoc);
        gl.vertexAttribPointer(centerLoc, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(centerLoc, 1);

        // per-instance color
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#sphereColorInstBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, inst.colors, gl.DYNAMIC_DRAW);
        if (this.#debugGL) this.#debugGL.bufferDataArray++;
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(colorLoc, 1);

        // draw instanced sphere
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereMesh.ibo);
        gl.drawElementsInstanced(gl.TRIANGLES, sphereMesh.indexCount, gl.UNSIGNED_SHORT, 0, numPoints);

        if (this.#debugGL) this.#debugGL.drawElements++;
        this._getViewer()?._incrementPointsRendered?.(numPoints);
        this._endPrimitiveGroup();
        return;
      }
    }

    // Legacy WebGL2 instanced point-quads (kept as fallback).
    if (spheresDraw && isWebGL2 && this.#pointProgram && this.#pointCornerBuffer && this.#pointIndexBuffer && this.#pointCenterBuffer && this.#pointColorInstBuffer) {
      const pointRadius = this.getAppearanceAttribute(
        CommonAttributes.POINT_SHADER,
        CommonAttributes.POINT_RADIUS,
        CommonAttributes.POINT_RADIUS_DEFAULT
      );

      // Prepare (or reuse) instance arrays per geometry, only rebuilding when DataList identity changes.
      const colorsDL = geometry?.getVertexColors?.() || null;
      const cached = this.#pointInstanceCache.get(geometry);
      if (!cached || cached.coordsDL !== vertsDL || cached.colorsDL !== colorsDL || cached.count !== numPoints) {
        const centers = new Float32Array(numPoints * 4);
        const colors = new Float32Array(numPoints * 4);

        // Centers: copy from vertex coords, pad to vec4.
        for (let i = 0; i < numPoints; i++) {
          const src = i * positionFiber;
          const dst = i * 4;
          centers[dst + 0] = Number(vertsFlat[src + 0] ?? 0);
          centers[dst + 1] = Number(vertsFlat[src + 1] ?? 0);
          centers[dst + 2] = Number(vertsFlat[src + 2] ?? 0);
          // w: if provided use it, else 1
          centers[dst + 3] = Number(positionFiber >= 4 ? (vertsFlat[src + 3] ?? 1) : 1);
        }

        // Colors: per-vertex if present, else current color
        const defaultColor = this.#currentColor;
        if (colorsDL && typeof colorsDL.getFlatData === 'function') {
          const cFlat = colorsDL.getFlatData();
          const cShape = colorsDL.shape;
          const cFiber = Array.isArray(cShape) && cShape.length >= 2 ? cShape[cShape.length - 1] : 0;
          const cf = cFiber || 4;
          for (let i = 0; i < numPoints; i++) {
            const src = i * cf;
            const dst = i * 4;
            const r0 = cFlat[src + 0] ?? 255;
            const g0 = cFlat[src + 1] ?? 255;
            const b0 = cFlat[src + 2] ?? 255;
            const a0 = cf >= 4 ? (cFlat[src + 3] ?? 255) : 255;
            const max = Math.max(r0, g0, b0, a0);
            if (max > 1.0) {
              colors[dst + 0] = r0 / 255;
              colors[dst + 1] = g0 / 255;
              colors[dst + 2] = b0 / 255;
              colors[dst + 3] = a0 / 255;
            } else {
              colors[dst + 0] = r0;
              colors[dst + 1] = g0;
              colors[dst + 2] = b0;
              colors[dst + 3] = a0;
            }
          }
        } else {
          for (let i = 0; i < numPoints; i++) {
            const dst = i * 4;
            colors[dst + 0] = defaultColor[0];
            colors[dst + 1] = defaultColor[1];
            colors[dst + 2] = defaultColor[2];
            colors[dst + 3] = defaultColor[3];
          }
        }

        this.#pointInstanceCache.set(geometry, { coordsDL: vertsDL, colorsDL, centers, colors, count: numPoints });
      }

      const inst = this.#pointInstanceCache.get(geometry);

      gl.useProgram(this.#pointProgram);
      // uniforms
      const transformLoc = gl.getUniformLocation(this.#pointProgram, 'u_transform');
      gl.uniformMatrix4fv(transformLoc, true, this.getCurrentTransformation());
      const radiusLoc = gl.getUniformLocation(this.#pointProgram, 'u_pointRadius');
      gl.uniform1f(radiusLoc, pointRadius);

      // attributes
      const cornerLoc = gl.getAttribLocation(this.#pointProgram, 'a_corner');
      const centerLoc = gl.getAttribLocation(this.#pointProgram, 'a_center');
      const colorLoc = gl.getAttribLocation(this.#pointProgram, 'a_color');

      // bind base quad
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#pointCornerBuffer);
      gl.enableVertexAttribArray(cornerLoc);
      gl.vertexAttribPointer(cornerLoc, 2, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(cornerLoc, 0);

      // bind per-instance center
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#pointCenterBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, inst.centers, gl.DYNAMIC_DRAW);
      if (this.#debugGL) this.#debugGL.bufferDataArray++;
      gl.enableVertexAttribArray(centerLoc);
      gl.vertexAttribPointer(centerLoc, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(centerLoc, 1);

      // bind per-instance color
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#pointColorInstBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, inst.colors, gl.DYNAMIC_DRAW);
      if (this.#debugGL) this.#debugGL.bufferDataArray++;
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(colorLoc, 1);

      // draw instanced quad
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#pointIndexBuffer);
      gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, numPoints);

      if (this.#debugGL) this.#debugGL.drawElements++;
      this._getViewer()?._incrementPointsRendered?.(numPoints);
      this._endPrimitiveGroup();
      return;
    }

    // Fallback: batch GL_POINTS in one draw.
    const pointSize = this.getAppearanceAttribute(
      CommonAttributes.POINT_SHADER,
      CommonAttributes.POINT_SIZE,
      CommonAttributes.POINT_SIZE_DEFAULT
    );
    // Build compact positions as Float32Array [numPoints, positionSize]
    const positionSize = Math.min(Math.max(positionFiber || 2, 2), 4);
    const vertexArray = new Float32Array(numPoints * positionSize);
    for (let i = 0; i < numPoints; i++) {
      const src = i * positionFiber;
      const dst = i * positionSize;
      for (let k = 0; k < positionSize; k++) {
        const val = (k < positionFiber) ? vertsFlat[src + k] : (k === 3 ? 1.0 : 0.0);
        vertexArray[dst + k] = Number(val) || 0.0;
      }
    }
    const colorArray = new Float32Array(numPoints * 4);
    const colorsDL = geometry?.getVertexColors?.() || null;
    if (colorsDL && typeof colorsDL.getFlatData === 'function') {
      const cFlat = colorsDL.getFlatData();
      const cShape = colorsDL.shape;
      const cFiber = Array.isArray(cShape) && cShape.length >= 2 ? cShape[cShape.length - 1] : 0;
      const cf = cFiber || 4;
      for (let i = 0; i < numPoints; i++) {
        const src = i * cf;
        const dst = i * 4;
        const r0 = cFlat[src + 0] ?? 255;
        const g0 = cFlat[src + 1] ?? 255;
        const b0 = cFlat[src + 2] ?? 255;
        const a0 = cf >= 4 ? (cFlat[src + 3] ?? 255) : 255;
        const max = Math.max(r0, g0, b0, a0);
        if (max > 1.0) {
          colorArray[dst + 0] = r0 / 255;
          colorArray[dst + 1] = g0 / 255;
          colorArray[dst + 2] = b0 / 255;
          colorArray[dst + 3] = a0 / 255;
        } else {
          colorArray[dst + 0] = r0;
          colorArray[dst + 1] = g0;
          colorArray[dst + 2] = b0;
          colorArray[dst + 3] = a0;
        }
      }
    } else {
      const c = this.#currentColor;
      for (let i = 0; i < numPoints; i++) {
        const dst = i * 4;
        colorArray[dst + 0] = c[0];
        colorArray[dst + 1] = c[1];
        colorArray[dst + 2] = c[2];
        colorArray[dst + 3] = c[3];
      }
    }

    // Use existing geometry path with POINTS.
    this.#drawGeometry(vertexArray, colorArray, null, this.#capabilities.POINTS, null, 0, positionSize);
    this._getViewer()?._incrementPointsRendered?.(numPoints);
    this._endPrimitiveGroup();
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

    // Setup per-frame debug counters if enabled.
    const dbg = this._getViewer()?.getDebugPerfOptions?.();
    if (dbg?.enabled) {
      this.#debugGL = {
        bufferDataArray: 0,
        bufferDataElement: 0,
        drawElements: 0,
        drawArrays: 0
      };
    } else {
      this.#debugGL = null;
    }
    
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
    gl.clear(this.#hasDepthBuffer ? (gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT) : gl.COLOR_BUFFER_BIT);
    
    // Use our shader program
    gl.useProgram(this.#program);
  }

  /**
   * End rendering - WebGL-specific cleanup (implements abstract method)
   * @protected
   */
  _endRender() {
    // Optional perf logging (every N frames).
    const viewer = this._getViewer?.();
    const dbg = viewer?.getDebugPerfOptions?.();
    if (dbg?.enabled && typeof dbg.logFn === 'function') {
      this.#debugFrame++;
      const every = Math.max(1, dbg.everyNFrames | 0);
      if (this.#debugFrame % every === 0) {
        const r = viewer.getRenderStatistics?.();
        const cpu = this._debugPerfGetCpuCounters?.();
        const glc = this.#debugGL;

        dbg.logFn('[WebGL2D debugPerf]', {
          frame: this.#debugFrame,
          renderMs: r?.renderDurationMs,
          avgRenderMs: r?.avgRenderDurationMs,
          primitives: {
            points: r?.pointsRendered,
            edges: r?.edgesRendered,
            faces: r?.facesRendered
          },
          cpuCache: cpu,
          gl: glc,
          // Note: we intentionally removed per-typed-array GPU buffer caching once batching/instancing
          // reduced us to a handful of uploads per frame.
        });
      }
    }
  }

  /**
   * Apply appearance attributes to WebGL context (implements abstract method)
   * @protected
   */
  _applyAppearance() {
    // Appearance attributes are applied per-primitive in _beginPrimitiveGroup
  }

  /**
   * WebGL override: batch face rendering for IndexedFaceSet into a single mesh draw.
   *
   * This dramatically reduces draw calls compared to per-face `_drawPolygon()` calls.
   * We intentionally keep this as a coarse, always-batched implementation for now.
   *
   * Note: This implementation supports per-face colors by expanding vertices
   * (duplicate vertices per face). This keeps correct "flat" face coloring.
   *
   * @protected
   * @param {*} geometry
   */
  _renderFaces(geometry) {
    // Respect FACE_DRAW flag (effective appearance).
    // Use the base class resolver so we don’t need direct access to its private state.
    const showFaces = this.getBooleanAttribute?.(CommonAttributes.FACE_DRAW, true);
    if (!showFaces) return;

    // Require face indices + vertex coords.
    const vertsDL = geometry?.getVertexCoordinates?.() || null;
    const facesDL = geometry?.getFaceIndices?.() || null;
    if (!vertsDL || !facesDL) return;

    // Extract vertex coordinate storage (prefer flat typed data).
    const shape = vertsDL.shape;
    const fiber = Array.isArray(shape) && shape.length >= 2 ? shape[shape.length - 1] : 0;
    const positionSize = Math.min(Math.max(fiber || 3, 2), 4);
    const vertsFlat = typeof vertsDL.getFlatData === 'function' ? vertsDL.getFlatData() : null;
    if (!vertsFlat || !fiber) {
      // Fallback: if the data list doesn’t provide flat data, fall back to the default behavior.
      return super._renderFaces(geometry);
    }

    // Face indices: prefer VariableDataList.rows to avoid allocation.
    const faceRows = Array.isArray(facesDL.rows) ? facesDL.rows : (typeof facesDL.toNestedArray === 'function' ? facesDL.toNestedArray() : null);
    if (!faceRows || faceRows.length === 0) return;

    // Face colors (optional).
    const faceColorsDL = geometry?.getFaceAttribute?.(GeometryAttribute.COLORS) || null;
    const faceColorsFlat = faceColorsDL && typeof faceColorsDL.getFlatData === 'function' ? faceColorsDL.getFlatData() : null;
    const faceColorsShape = faceColorsDL?.shape;
    const faceColorChannels = Array.isArray(faceColorsShape) && faceColorsShape.length >= 2 ? faceColorsShape[faceColorsShape.length - 1] : 0;

    // Helper to read face color i -> normalized RGBA
    const defaultColor = this.#currentColor; // already normalized 0..1
    const getFaceColor = (i) => {
      if (!faceColorsFlat || !faceColorChannels) return defaultColor;
      const base = i * faceColorChannels;
      const r0 = faceColorsFlat[base + 0] ?? 255;
      const g0 = faceColorsFlat[base + 1] ?? 255;
      const b0 = faceColorsFlat[base + 2] ?? 255;
      const a0 = faceColorChannels >= 4 ? (faceColorsFlat[base + 3] ?? 255) : 255;
      const max = Math.max(r0, g0, b0, a0);
      if (max > 1.0) {
        return [r0 / 255, g0 / 255, b0 / 255, a0 / 255];
      }
      return [r0, g0, b0, a0];
    };

    // Batch faces. If we can use 32-bit indices, we can draw the whole expanded mesh in one go.
    // Otherwise, chunk into <=65535 expanded vertices per draw (still only a few draw calls).
    const supportsUint32 = Boolean(this.#capabilities?.supportsUint32Indices);
    const MAX_UINT16_VERTS = 65535;

    this._beginPrimitiveGroup(CommonAttributes.POLYGON);
    let f0 = 0;
    while (f0 < faceRows.length) {
      // Determine batch end (first pass: count verts/tris)
      let f1 = f0;
      let batchVerts = 0;
      let batchTris = 0;
      while (f1 < faceRows.length) {
        const row = faceRows[f1];
        const len = row?.length ?? 0;
        if (len >= 3) {
          if (!supportsUint32 && batchVerts > 0 && (batchVerts + len) > MAX_UINT16_VERTS) break;
          batchVerts += len;
          batchTris += (len - 2);
        }
        f1++;
        // If we can't use uint32 and we hit the limit exactly, stop this batch.
        if (!supportsUint32 && batchVerts >= MAX_UINT16_VERTS) break;
      }
      if (batchVerts === 0 || batchTris === 0) {
        // This can happen if we advanced over only degenerate faces.
        f0 = f1;
        continue;
      }

      const vertexArray = new Float32Array(batchVerts * positionSize);
      const colorArray = new Float32Array(batchVerts * 4);
      const indexArray = supportsUint32 ? new Uint32Array(batchTris * 3) : new Uint16Array(batchTris * 3);

      let vOut = 0; // vertex index within this batch
      let vFloat = 0;
      let cFloat = 0;
      let iOut = 0;

      // Second pass: fill
      for (let f = f0; f < f1; f++) {
        const row = faceRows[f];
        const len = row?.length ?? 0;
        if (len < 3) continue;

        const faceColor = getFaceColor(f);
        const startVertex = vOut;

        for (let j = 0; j < len; j++) {
          const vid = row[j] | 0;
          const srcBase = vid * fiber;

          for (let k = 0; k < positionSize; k++) {
            let val;
            if (k < fiber) {
              val = vertsFlat[srcBase + k];
            } else if (k === 3) {
              val = 1.0;
            } else {
              val = 0.0;
            }
            vertexArray[vFloat++] = Number(val) || 0.0;
          }

          colorArray[cFloat++] = faceColor[0];
          colorArray[cFloat++] = faceColor[1];
          colorArray[cFloat++] = faceColor[2];
          colorArray[cFloat++] = faceColor[3];

          vOut++;
        }

        for (let j = 1; j < len - 1; j++) {
          indexArray[iOut++] = startVertex;
          indexArray[iOut++] = startVertex + j;
          indexArray[iOut++] = startVertex + j + 1;
        }
      }

      this.#drawGeometry(vertexArray, colorArray, indexArray, this.#capabilities.TRIANGLES, null, 0, positionSize);
      f0 = f1;
    }
    this._endPrimitiveGroup();

    this._getViewer()?._incrementFacesRendered?.(faceRows.length);
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
    
    // Set edge fade uniform
    const edgeFade = this.getAppearanceAttribute(
      CommonAttributes.LINE_SHADER,
      CommonAttributes.LINE_EDGE_FADE,
      CommonAttributes.LINE_EDGE_FADE_DEFAULT
    );
     const edgeFadeLoc = gl.getUniformLocation(program, 'u_edgeFade');
     if (edgeFadeLoc !== null) {
       gl.uniform1f(edgeFadeLoc, edgeFade);
     }
  
    // Set line half width for edge smoothing (0 disables smoothing for non-lines)
    // Note: Both distance attribute and halfWidth are intended to be in the same
    // coordinate space (world space in the current implementation).
    const lineHalfWidthLoc = gl.getUniformLocation(program, 'u_lineHalfWidth');
    if (lineHalfWidthLoc !== null) {
      gl.uniform1f(lineHalfWidthLoc, lineHalfWidth);
    }
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
      // Draw as quads using TUBE_RADIUS and enable edge smoothing
      const tubeRadius = this.getAppearanceAttribute(
        CommonAttributes.LINE_SHADER,
        CommonAttributes.TUBE_RADIUS,
        CommonAttributes.TUBE_RADIUS_DEFAULT
      );
      const halfWidth = tubeRadius;
      this.#drawPolylineAsQuads(vertices, colors, indices, halfWidth);
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

      // Preserve depth: carry through the original Z coordinate (if present) for p0/p1.
      // Note: we still compute the quad offset in XY for now (2D-style thickening),
      // but the resulting quad vertices are 3D so depth testing works correctly.
      const z0 = Number(p0[2] ?? 0.0) || 0.0;
      const z1 = Number(p1[2] ?? 0.0) || 0.0;

      // Create quad vertices (4 corners of the rectangle), as (x,y,z) triplets
      const quadVertices = [
        p0[0] + nx * halfWidth, p0[1] + ny * halfWidth, z0,  // 0: left of p0
        p0[0] - nx * halfWidth, p0[1] - ny * halfWidth, z0,  // 1: right of p0
        p1[0] + nx * halfWidth, p1[1] + ny * halfWidth, z1,  // 2: left of p1
        p1[0] - nx * halfWidth, p1[1] - ny * halfWidth, z1   // 3: right of p1
      ];
      
      // Add vertices
      this.#batchedVertices.push(...quadVertices);
      
      // Add colors (same color for all 4 vertices of the quad)
      this.#batchedColors.push(...edgeColor, ...edgeColor, ...edgeColor, ...edgeColor);

      // Distance from centerline: -halfWidth for left side, +halfWidth for right side
      const quadDistances = [
        -halfWidth,  // 0: left of p0
        halfWidth,   // 1: right of p0
        -halfWidth,  // 2: left of p1
        halfWidth    // 3: right of p1
      ];
      this.#batchedDistances.push(...quadDistances);
      
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
    const distanceArray = new Float32Array(this.#batchedDistances);
    
    // Single draw call for all batched edges
    // Batched quads are generated in 3D (x,y,z) so positionSize is 3
    this.#drawGeometry(
      vertexArray,
      colorArray,
      indexArray,
      this.#capabilities.TRIANGLES,
      distanceArray,
      this.#currentBatchedHalfWidth,
      3
    );
    
    // Reset batching arrays without allocating new arrays (reduces GC churn).
    this.#batchedVertices.length = 0;
    this.#batchedColors.length = 0;
    this.#batchedIndices.length = 0;
    this.#batchedDistances.length = 0;
    this.#batchedVertexOffset = 0;
    
    // Only reset color/width if we're not preserving for continued batching
    if (!preserveColor) {
      this.#currentBatchedLineColor = null;
      this.#currentBatchedHalfWidth = 0;
    }
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
    
    // Convert vertices to Float32Array (preserve dimension for GPU)
    const { array: vertexArray, size: positionSize } = this.#verticesToFloat32Array(vertices, indices);
    const colorArray = this.#colorsToFloat32Array(colors, indices, this.#currentColor);
    
    // Set line width using cached capabilities
    // Clamp to maximum supported width
    const clampedWidth = Math.min(lineWidth, this.#capabilities.maxLineWidth);
    gl.lineWidth(clampedWidth);
    
    // Draw using LINE_STRIP mode (use cached constant)
    // Note: We need sequential indices since vertexArray is compacted
    const sequentialIndices = this.#getSequentialIndices(indices.length);
    this.#drawGeometry(vertexArray, colorArray, sequentialIndices, this.#capabilities.LINE_STRIP, null, 0, positionSize);
  }

  /**
   * Get a cached Uint16Array [0..n-1] view.
   * Grows the cache as needed and reuses it across draws to reduce allocations.
   * @private
   * @param {number} n
   * @returns {Uint16Array}
   */
  #getSequentialIndices(n) {
    const count = Math.max(0, n | 0);
    if (count === 0) return new Uint16Array(0);
    if (count > 65535) return new Uint16Array(0);
    const result = new Uint16Array(count);
    for (let i = 0; i < count; i++) result[i] = i;
    return result;
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

    // Get the color for this edge (or use current color)
    const edgeColor = colors ? this.#toWebGLColor(colors) : this.#currentColor;
    
    const allQuadVertices = [];
    const allQuadColors = [];
    const allQuadDistances = []; // Distance from centerline for edge smoothing
    const allQuadIndices = [];
    let vertexOffset = 0;
    
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

      const z0 = Number(p0[2] ?? 0.0) || 0.0;
      const z1 = Number(p1[2] ?? 0.0) || 0.0;

      // Create quad vertices (4 corners of the rectangle), as (x,y,z) triplets
      const quadVertices = [
        p0[0] + nx * halfWidth, p0[1] + ny * halfWidth, z0,  // 0: left of p0
        p0[0] - nx * halfWidth, p0[1] - ny * halfWidth, z0,  // 1: right of p0
        p1[0] + nx * halfWidth, p1[1] + ny * halfWidth, z1,  // 2: left of p1
        p1[0] - nx * halfWidth, p1[1] - ny * halfWidth, z1   // 3: right of p1
      ];
      
      // Distance from centerline: -halfWidth for left side, +halfWidth for right side
      const quadDistances = [
        -halfWidth,  // 0: left of p0
        halfWidth,   // 1: right of p0
        -halfWidth,  // 2: left of p1
        halfWidth    // 3: right of p1
      ];
      
      // Add vertices
      allQuadVertices.push(...quadVertices);
      
      // Add colors (same color for all 4 vertices of the quad)
      allQuadColors.push(...edgeColor, ...edgeColor, ...edgeColor, ...edgeColor);
      
      // Add distances
      allQuadDistances.push(...quadDistances);
      
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
      const distanceArray = new Float32Array(allQuadDistances);
      const indexArray = new Uint16Array(allQuadIndices);
      // Use cached TRIANGLES constant
      // Quads are generated in 3D (x,y,z) so positionSize is 3
      this.#drawGeometry(
        vertexArray,
        colorArray,
        indexArray,
        this.#capabilities.TRIANGLES,
        distanceArray,
        halfWidth,
        3
      );
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
    // Convert vertices to Float32Array (creates compacted array, preserve dimension)
    const { array: vertexArray, size: positionSize } = this.#verticesToFloat32Array(vertices, indices);
    // colors is a single color per face (or null) - replicate it for all vertices
    const colorArray =  (color != null) ? this.#colorsToFloat32Array(color, indices, this.#currentColor) : this.#colorsToFloat32Array(this.#currentColor, indices, this.#currentColor);
  
    // Debug: log vertex count for polygons with more than 3 vertices
   
    // Triangulate using sequential indices (0, 1, 2, ...) since vertexArray is already compacted
    // The vertexArray contains vertices in the order they appear in indices
    const numVertices = indices.length;
    const indexArray = this.#triangulatePolygonSequential(numVertices);
    
    // Use cached TRIANGLES constant
    this.#drawGeometry(vertexArray, colorArray, indexArray, this.#capabilities.TRIANGLES, null, 0, positionSize);
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
   * @param {number} [positionSize=2] - Number of components per vertex position (2, 3, or 4)
   */
  #drawGeometry(vertices, colors, indices, mode, distances = null, lineHalfWidth = 0, positionSize = 2) {
    const gl = this.#gl;
    const program = this.#program;
    
    // Validate inputs
    if (!vertices || vertices.length === 0) {
      console.warn('WebGL2DRenderer: No vertices to draw');
      return;
    }

    // Validate that the vertex array length is compatible with the component count
    if (positionSize <= 0 || positionSize > 4 || vertices.length % positionSize !== 0) {
      console.warn('WebGL2DRenderer: Invalid vertex array length or positionSize', {
        length: vertices.length,
        positionSize
      });
      return;
    }
    
    // Ensure program is active
    gl.useProgram(program);
    
    // Update uniforms with current transformation and line width (point size = 1.0 for non-points)
    this.#updateUniforms(lineHalfWidth, 1.0);

    // -----------------------------------------------------------------------
    // Vertex buffer
    // -----------------------------------------------------------------------
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    if (this.#debugGL) this.#debugGL.bufferDataArray++;
    
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    if (positionLoc === -1) {
      console.error('WebGL2DRenderer: a_position attribute not found in shader');
      return;
    }
    gl.enableVertexAttribArray(positionLoc);
    // Use the provided component count so 3D/4D vertices reach the shader intact
    gl.vertexAttribPointer(positionLoc, positionSize, gl.FLOAT, false, 0, 0);
    // Important for WebGL2: instanced rendering (points) sets attribute divisors, and
    // divisors are sticky per-attribute-index across programs. Ensure non-instanced
    // draws use divisor=0 so per-vertex attributes advance correctly.
    if (typeof gl.vertexAttribDivisor === 'function') {
      gl.vertexAttribDivisor(positionLoc, 0);
    }
    
    // -----------------------------------------------------------------------
    // Color buffer
    // -----------------------------------------------------------------------
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
    if (this.#debugGL) this.#debugGL.bufferDataArray++;
    
    const colorLoc = gl.getAttribLocation(program, 'a_color');
    if (colorLoc === -1) {
      console.error('WebGL2DRenderer: a_color attribute not found in shader');
      return;
    }
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    if (typeof gl.vertexAttribDivisor === 'function') {
      gl.vertexAttribDivisor(colorLoc, 0);
    }
    
    // Handle distance attribute for edge smoothing (optional)
    const distanceLoc = gl.getAttribLocation(program, 'a_distance');
    if (distanceLoc !== -1) {
      if (distances && distances.length > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#distanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, distances, gl.DYNAMIC_DRAW);
        if (this.#debugGL) this.#debugGL.bufferDataArray++;
        gl.enableVertexAttribArray(distanceLoc);
        gl.vertexAttribPointer(distanceLoc, 1, gl.FLOAT, false, 0, 0);
        if (typeof gl.vertexAttribDivisor === 'function') {
          gl.vertexAttribDivisor(distanceLoc, 0);
        }
      } else {
        // Disable distance attribute if not provided (for non-line primitives)
        gl.disableVertexAttribArray(distanceLoc);
        gl.vertexAttrib1f(distanceLoc, 0.0);
        if (typeof gl.vertexAttribDivisor === 'function') {
          gl.vertexAttribDivisor(distanceLoc, 0);
        }
      }
    }
    
    // Draw
    // Note: We don't validate mode here because gl.POINTS, gl.LINE_STRIP, etc. should always be valid
    // The INVALID_ENUM error might be from something else (like gl.UNSIGNED_SHORT)
    if (indices && indices.length > 0) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
      if (this.#debugGL) this.#debugGL.bufferDataElement++;
      
      // Choose index type based on typed array
      let indexType = this.#capabilities.UNSIGNED_SHORT;
      if (indices instanceof Uint32Array) {
        if (!this.#capabilities?.supportsUint32Indices || this.#capabilities.UNSIGNED_INT === undefined) {
          console.error('WebGL2DRenderer: Uint32 indices requested but UNSIGNED_INT indices are not supported by this context');
          return;
        }
        indexType = this.#capabilities.UNSIGNED_INT;
      }
      
      gl.drawElements(mode, indices.length, indexType, 0);
      if (this.#debugGL) this.#debugGL.drawElements++;
    } else {
      const vertexCount = vertices.length / positionSize;
      // Ensure mode is a number (not undefined), default to cached LINE_STRIP
      const drawMode = (typeof mode === 'number' && !isNaN(mode)) ? mode : this.#capabilities.LINE_STRIP;
      
      // IMPORTANT: Unbind ELEMENT_ARRAY_BUFFER when using drawArrays
      // If ELEMENT_ARRAY_BUFFER is bound from previous drawElements call (e.g., from face rendering),
      // it can interfere with drawArrays
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      
      gl.drawArrays(drawMode, 0, vertexCount);
      if (this.#debugGL) this.#debugGL.drawArrays++;
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
   *
   * NOTE: For WebGL we want access to the full 3D/4D coordinate so it can be
   * passed through to the GPU. Call sites that perform 2D-only math simply
   * use point[0] and point[1], ignoring any additional components.
   * 
   * @protected
   * @param {number[]} vertex - Vertex coordinates [x, y] or [x, y, z] or [x, y, z, w]
   * @returns {number[]} Vertex unchanged (pass-through)
   */
  _extractPoint(vertex) {
    // Pass-through: return vertex as-is
    return vertex;
  }

  /**
   * Convert vertices to Float32Array, preserving their full dimension.
   * @private
   * @param {*} vertices - Vertex data
   * @param {number[]} indices - Vertex indices
   * @returns {{ array: Float32Array, size: number }} vertices array and component count per vertex
   */
  #verticesToFloat32Array(vertices, indices) {
    if (!indices || indices.length === 0) {
      return { array: new Float32Array(0), size: 3 };
    }

    // Determine component count from first vertex (clamped to [2, 4])
    const firstVertex = this._extractPoint(vertices[indices[0]]);
    const size = Math.min(Math.max(firstVertex.length || 3, 3), 4);

    const array = new Float32Array(indices.length * size);
    let out = 0;
    for (const index of indices) {
      const vertex = vertices[index];
      const point = this._extractPoint(vertex);
      for (let i = 0; i < size; i++) {
        // If the vertex has fewer components than size, pad with sensible defaults
        const value = (point && i < point.length) ? point[i] : (i === 3 ? 1.0 : 0.0);
        array[out++] = Number(value) || 0.0;
      }
    }

    return { array, size };
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
    const n = Math.max(0, numVertices | 0);
    if (n < 3) return new Uint16Array(0);

    // Fan triangulation: triangle fan from vertex 0
    const arr = new Uint16Array((n - 2) * 3);
    let out = 0;
    for (let i = 1; i < n - 1; i++) {
      arr[out++] = 0;
      arr[out++] = i;
      arr[out++] = i + 1;
    }
    return arr;
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
      // Coarse normalization: if values look like 0..255 bytes, convert to 0..1.
      // This keeps caching stable and avoids per-call `map(c=>c/255)` allocations.
      let max = 0;
      for (let i = 0; i < Math.min(color.length, 4); i++) {
        const v = Number(color[i]);
        if (Number.isFinite(v)) max = Math.max(max, v);
      }
      if (max > 1.0) {
        const r = (color[0] ?? 255) / 255;
        const g = (color[1] ?? 255) / 255;
        const b = (color[2] ?? 255) / 255;
        const a = (color.length >= 4 ? (color[3] ?? 255) : 255) / 255;
        return [r, g, b, a];
      }
      return color.length === 4 ? color : [color[0] ?? 1.0, color[1] ?? 1.0, color[2] ?? 1.0, color[3] ?? 1.0];
    } else return [1.0, 1.0, 1.0, 1.0];
  }
}

