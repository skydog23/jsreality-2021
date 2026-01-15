/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

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
import { getLogger, Category } from '../util/LoggingSystem.js';
import { WebGL2Renderer } from './WebGL2Renderer.js';

const logger = getLogger('jsreality.core.viewers.WebGL2Viewer');

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */
/** @typedef {import('../scene/Camera.js').Camera} Camera */

/**
 * A 2D WebGL-based viewer implementation for jReality scene graphs.
 * Renders geometry using WebGL/WebGL2 for hardware-accelerated rendering.
 */
export class WebGL2Viewer extends Abstract2DViewer {
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

  /** @type {WebGL2Renderer|null} */
  #renderer = null;

  /**
   * Create a new WebGL2 viewer
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
      throw new Error('WebGL2Viewer requires an HTMLCanvasElement');
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
      this.#renderer = new WebGL2Renderer(this);
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
   * Render the current WebGL2 view into an offscreen canvas at the given size.
   *
   * This implementation does not modify the on-screen canvas. It creates a
   * temporary off-screen WebGL2Viewer whose viewing component is sized to the
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
      WebGL2Viewer,
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
          logger.info(Category.ALL, '[WebGL2 offscreen] size diagnostics', {
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
            '[WebGL2 offscreen] drawingBuffer smaller than canvas backing store; export will be limited/clamped by GPU allocation',
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
