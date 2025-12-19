/**
 * Abstract base class for 2D viewers.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Abstract base class for 2D viewers
// Handles device-independent scene graph and camera management
// Subclasses implement device-specific rendering

import { Viewer, Dimension } from '../scene/Viewer.js';
import * as P3 from '../math/P3.js';
import { Rectangle2D } from '../scene/Camera.js';
import * as CameraUtility from '../util/CameraUtility.js';

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */
/** @typedef {import('../scene/Camera.js').Camera} Camera */

/**
 * Abstract base class for 2D rendering viewers.
 * Handles scene graph management, camera setup, and projection computation.
 * Subclasses implement device-specific rendering methods.
 */
export class Abstract2DViewer extends Viewer {

  /** @type {SceneGraphComponent|null} */
  #sceneRoot = null;

  /** @type {SceneGraphPath|null} */
  #cameraPath = null;

  /** @type {number} Counter for render calls */
  #renderCallCount = 0;

  /** @type {number} Number of points rendered in current render call */
  #pointsRendered = 0;

  /** @type {number} Number of edges rendered in current render call */
  #edgesRendered = 0;

  /** @type {number} Number of faces rendered in current render call */
  #facesRendered = 0;

  /**
   * Create a new Abstract2DViewer
   */
  constructor() {
    super();
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

  /**
   * Render the scene
   * Subclasses should override to create their specific renderer
   */
  render() {
    throw new Error('Abstract method render() must be implemented by subclass');
  }

  /**
   * Get render statistics (for internal use by renderer)
   * @protected
   * @returns {{renderCallCount: number, pointsRendered: number, edgesRendered: number, facesRendered: number}}
   */
  _getRenderStatistics() {
    return {
      renderCallCount: this.#renderCallCount,
      pointsRendered: this.#pointsRendered,
      edgesRendered: this.#edgesRendered,
      facesRendered: this.#facesRendered
    };
  }

  /**
   * Get render statistics (public API for inspector)
   * @returns {{renderCallCount: number, pointsRendered: number, edgesRendered: number, facesRendered: number}}
   */
  getRenderStatistics() {
    return this._getRenderStatistics();
  }

  /**
   * Reset render statistics for a new render call
   * @protected
   */
  _resetRenderStatistics() {
    this.#pointsRendered = 0;
    this.#edgesRendered = 0;
    this.#facesRendered = 0;
  }

  /**
   * Increment points rendered count
   * @protected
   * @param {number} count - Number of points rendered
   */
  _incrementPointsRendered(count) {
    this.#pointsRendered += count;
  }

  /**
   * Increment edges rendered count
   * @protected
   * @param {number} count - Number of edges rendered
   */
  _incrementEdgesRendered(count) {
    this.#edgesRendered += count;
  }

  /**
   * Increment faces rendered count
   * @protected
   * @param {number} count - Number of faces rendered
   */
  _incrementFacesRendered(count) {
    this.#facesRendered += count;
  }

  /**
   * Finalize render statistics (called after render completes)
   * @protected
   */
  _finalizeRenderStatistics() {
    this.#renderCallCount++;
    
    // Print statistics after every 100th render call
    if (this.#renderCallCount % 100 === 0) {
      console.log(`[Render Statistics - Call #${this.#renderCallCount}]`, {
        points: this.#pointsRendered,
        edges: this.#edgesRendered,
        faces: this.#facesRendered,
        total: this.#pointsRendered + this.#edgesRendered + this.#facesRendered
      });
    }
  }

  hasViewingComponent() {
    return true;
  }

  /**
   * Get the viewing component (device-specific)
   * @returns {*} The viewing component (canvas, SVG, etc.)
   */
  getViewingComponent() {
    throw new Error('Abstract method getViewingComponent() must be implemented by subclass');
  }

  /**
   * Get the viewing component size (device-specific)
   * @returns {Dimension}
   */
  getViewingComponentSize() {
    throw new Error('Abstract method getViewingComponentSize() must be implemented by subclass');
  }

  canRenderAsync() {
    return true;
  }

  renderAsync() {
    requestAnimationFrame(() => this.render());
  }

  /**
   * Render the current scene into an offscreen buffer.
   *
   * Default implementation throws; concrete 2D viewers (Canvas, WebGL, SVG)
   * should override this. This method MUST NOT resize or otherwise disturb
   * the visible viewer; callers are responsible for any file export.
   *
   * @param {number} width  - target width in pixels
   * @param {number} height - target height in pixels
   * @param {{ antialias?: number, includeAlpha?: boolean }} [options]
   * @returns {Promise<HTMLCanvasElement>} A canvas containing the rendered image
   */
  async renderOffscreen(width, height, options = {}) {
    throw new Error(`${this.constructor.name}.renderOffscreen() not implemented`);
  }

  // Protected helper methods for subclasses

  /**
   * Shared helper for Canvas2D/WebGL offscreen rendering.
   *
   * This avoids duplicating the "create temp canvas → create temp viewer →
   * render → downsample into output canvas" logic across viewers.
   *
   * NOTE: We intentionally do NOT import concrete viewer classes here to avoid
   * circular module dependencies. Subclasses should pass their own constructor.
   *
   * @protected
   * @template {new (canvas: HTMLCanvasElement, options?: any) => any} TViewerCtor
   * @param {'canvas2d'|'webGL'} backend
   * @param {TViewerCtor} ViewerCtor
   * @param {number} width
   * @param {number} height
   * @param {{ antialias?: number, includeAlpha?: boolean }} [options]
   * @param {Object} [viewerOptions] - Extra options forwarded to the temp viewer ctor
   * @returns {Promise<HTMLCanvasElement>}
   */
  async _renderOffscreen(backend, ViewerCtor, width, height, options = {}, viewerOptions = {}) {
    if (backend !== 'canvas2d' && backend !== 'webGL') {
      throw new Error(`Unsupported backend "${backend}" for _renderOffscreen`);
    }

    const { antialias = 1, includeAlpha = true } = options;
    const exportWidth = Math.max(1, Math.floor(width));
    const exportHeight = Math.max(1, Math.floor(height));
    const aa = antialias > 0 ? antialias : 1;

    const pixelRatio = typeof this._pixelRatio === 'number' ? this._pixelRatio : 1;

    // Create a temporary off-screen canvas and viewer so that the
    // camera/projection are computed for the requested aspect ratio.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.style.width = `${exportWidth}px`;
    tempCanvas.style.height = `${exportHeight}px`;
    tempCanvas.style.position = 'absolute';
    tempCanvas.style.left = '-9999px';
    tempCanvas.style.top = '-9999px';
    document.body.appendChild(tempCanvas);

    try {
      const tempViewer = new ViewerCtor(tempCanvas, {
        autoResize: false,
        pixelRatio: pixelRatio * aa,
        ...viewerOptions
      });
      tempViewer.setSceneRoot?.(this.getSceneRoot());
      tempViewer.setCameraPath?.(this.getCameraPath());
      tempViewer.render?.();

      const src = tempCanvas;
      const out = document.createElement('canvas');
      out.width = exportWidth;
      out.height = exportHeight;

      const ctx = out.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get 2D context for offscreen output canvas');
      }
      if (!includeAlpha) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, out.width, out.height);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, out.width, out.height);

      return out;
    } finally {
      if (tempCanvas.parentNode) {
        tempCanvas.parentNode.removeChild(tempCanvas);
      }
    }
  }

  /**
   * Get camera from camera path
   * Uses CameraUtility.getCamera()
   * @protected
   * @returns {Camera|null}
   */
  _getCamera() {
    try {
      return CameraUtility.getCamera(this);
    } catch (e) {
      // CameraUtility throws if no camera is found
      return null;
    }
  }


}

