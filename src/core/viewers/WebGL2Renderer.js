/**
 * WebGL2 rendering visitor that traverses the scene graph and renders geometry.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { Color } from '../util/Color.js';
import { Abstract2DRenderer } from './Abstract2DRenderer.js';
import { getLogger, Category } from '../util/LoggingSystem.js';
import * as Rn from '../math/Rn.js';
import {
  compileShader as compileShaderUtil,
  queryWebGLCapabilities,
  createMainProgram,
  createUnifiedLitProgram,
  createInstancedPointProgram,
  createInstancedSphereProgram,
  createInstancedTubeProgram
} from './webgl/WebGL2Programs.js';
import {
  buildIcoSphere,
  getOrCreateSphereMesh,
  buildTubeBaseMesh
} from './webgl/WebGL2Meshes.js';
import {
  verticesToFloat32Array as verticesToFloat32ArrayUtil,
  colorsToFloat32Array as colorsToFloat32ArrayUtil,
  triangulatePolygonSequential as triangulatePolygonSequentialUtil,
  addPolylineToBatch as addPolylineToBatchUtil
} from './webgl/WebGL2Batching.js';

const logger = getLogger('jsreality.core.viewers.WebGL2Renderer');

// Log GL size/capability diagnostics only once per page load to avoid spamming
// during offscreen rendering (recording creates a temporary WebGL viewer per frame).
const webglCapsLogOnce = { didLog: false };

export class WebGL2Renderer extends Abstract2DRenderer {

  /** @type {WebGLRenderingContext|WebGL2RenderingContext} */
  #gl;

  /** @type {HTMLCanvasElement} */
  #canvas;

  /** @type {WebGLProgram|null} */
  #program = null;

  /** @type {WebGLProgram|null} WebGL2-only unified lit program (polygons + instanced spheres/tubes) */
  #unifiedProgram = null;

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
  #normalBuffer = null;

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
  /** @type {boolean} */
  #debugDidLogPolygonDiffuseThisFrame = false;

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
   * Create a new WebGL2 renderer
   * @param {WebGL2Viewer} viewer - The viewer
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
    
    // Create shader programs:
    // - #program: WebGL1-compatible fallback
    // - #unifiedProgram: WebGL2-only unified program (preferred when available)
    this.#program = this.#createShaderProgram();
    this.#unifiedProgram = this.#createUnifiedLitProgram();

    // Only fail if we have *no* usable program.
    if (!this.#program && !this.#unifiedProgram) {
      throw new Error('Failed to create any WebGL shader program (main + unified both failed to compile/link). See console for shader logs.');
    }
    
    // Create buffers
    this.#vertexBuffer = gl.createBuffer();
    this.#colorBuffer = gl.createBuffer();
    this.#normalBuffer = gl.createBuffer();
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

      // Base tube mesh (unit radius). Shader expands into world-space using p0/p1 and u_radius.
      const base = buildTubeBaseMesh(12);
      this.#tubeIndexCount = base.indices.length;
      if (this.#tubeVertexBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#tubeVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, base.vertices, gl.STATIC_DRAW);
      }
      if (this.#tubeIndexBuffer) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#tubeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, base.indices, gl.STATIC_DRAW);
      }
    }
    
    if (!this.#vertexBuffer || !this.#colorBuffer || !this.#normalBuffer || !this.#indexBuffer || !this.#distanceBuffer) {
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
    return queryWebGLCapabilities(gl, { logger, Category, logOnceRef: webglCapsLogOnce });
  }

  /**
   * Create WebGL shader program for 2D rendering
   * @private
   * @returns {WebGLProgram|null}
   */
  #createShaderProgram() {
    return createMainProgram(this.#gl);
  }

  /**
   * WebGL2-only: unified program that supports polygons + instanced spheres/tubes with consistent lighting.
   * @private
   * @returns {WebGLProgram|null}
   */
  #createUnifiedLitProgram() {
    return createUnifiedLitProgram(this.#gl);
  }

  /**
   * @private
   * @returns {WebGLProgram|null}
   */
  #getMainProgramForDraw() {
    return this.#unifiedProgram || this.#program;
  }

  /**
   * WebGL2-only: program for instanced point quads.
   * @private
   * @returns {WebGLProgram|null}
   */
  #createInstancedPointProgram() {
    return createInstancedPointProgram(this.#gl);
  }

  /**
   * WebGL2-only: program for instanced 3D spheres.
   * We instance a pre-tessellated unit icosphere mesh and translate/scale it per point.
   * @private
   * @returns {WebGLProgram|null}
   */
  #createInstancedSphereProgram() {
    return createInstancedSphereProgram(this.#gl);
  }

  /**
   * Create (or fetch) an icosphere mesh uploaded to GPU buffers.
   * @private
   * @param {number} level - subdivision level (0..4 recommended)
   * @returns {{ vbo: WebGLBuffer, ibo: WebGLBuffer, indexCount: number } | null}
   */
  #getOrCreateSphereMesh(level) {
    return getOrCreateSphereMesh(this.#gl, this.#sphereMeshCache, level);
  }

  /**
   * Build an icosphere (tessellated icosahedron) in JS.
   * Returns unit-radius positions (Float32Array) and triangle indices (Uint16Array).
   * @private
   * @param {number} level
   * @returns {{ positions: Float32Array, indices: Uint16Array } | null}
   */
  #buildIcoSphere(level) {
    return buildIcoSphere(level);
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
    return createInstancedTubeProgram(this.#gl);
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
      const canUnifiedLitTubes = Boolean(isWebGL2 && this.#unifiedProgram && this.#tubeVertexBuffer && this.#tubeIndexBuffer && this.#tubeP0Buffer && this.#tubeP1Buffer && this.#tubeColorInstBuffer && this.#tubeIndexCount > 0);
      const canInstanceTubes = Boolean(isWebGL2 && this.#tubeProgram && this.#tubeVertexBuffer && this.#tubeIndexBuffer && this.#tubeP0Buffer && this.#tubeP1Buffer && this.#tubeColorInstBuffer && this.#tubeIndexCount > 0);

      if (canUnifiedLitTubes) {
        // Instanced true-3D tube segments using the unified lit shader: one instance per polyline segment.
        // Build instance arrays of p0/p1/color for all segments and draw once.
        let segCount = 0;
        for (let i = 0; i < indices.length; i++) {
          const poly = indices[i];
          if (poly && poly.length >= 2) segCount += (poly.length - 1);
        }
        if (segCount > 0) {
          const p0s = new Float32Array(segCount * 3);
          const p1s = new Float32Array(segCount * 3);
          const hasEdgeColors = Boolean(edgeColors);
          const cols = hasEdgeColors ? new Float32Array(segCount * 4) : null;

          let s = 0;
          for (let i = 0; i < indices.length; i++) {
            const poly = indices[i];
            if (!poly || poly.length < 2) continue;
            const c = edgeColors ? edgeColors[i] : null;
            // Edge colors coming from geometry attributes should already be float RGBA in [0,1].
            const edgeColor = c ?? edgeColorDefault;
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
              if (cols) {
                cols[oc + 0] = edgeColor[0];
                cols[oc + 1] = edgeColor[1];
                cols[oc + 2] = edgeColor[2];
                cols[oc + 3] = edgeColor[3];
              }
              s++;
            }
          }

          const program = this.#unifiedProgram;
          gl.useProgram(program);

          const lightingHint = this.getBooleanAttribute?.(CommonAttributes.LIGHTING_ENABLED, CommonAttributes.LIGHTING_ENABLED_DEFAULT);
          const flipNormals = this.getBooleanAttribute?.(CommonAttributes.FLIP_NORMALS_ENABLED, false);
          this.#updateUniforms(program, 0, 1.0, Boolean(lightingHint), Boolean(flipNormals));

          const modeLoc = gl.getUniformLocation(program, 'u_mode');
          if (modeLoc !== null) gl.uniform1i(modeLoc, 2);
          const tubeRadiusLoc = gl.getUniformLocation(program, 'u_tubeRadius');
          if (tubeRadiusLoc !== null) gl.uniform1f(tubeRadiusLoc, tubeRadius);
          const pointRadiusLoc = gl.getUniformLocation(program, 'u_pointRadius');
          if (pointRadiusLoc !== null) gl.uniform1f(pointRadiusLoc, 0.0);

          const posLoc = gl.getAttribLocation(program, 'a_position');
          const colorLoc = gl.getAttribLocation(program, 'a_color');
          const p0Loc = gl.getAttribLocation(program, 'a_p0');
          const p1Loc = gl.getAttribLocation(program, 'a_p1');
          const centerLoc = gl.getAttribLocation(program, 'a_center');
          const normalLoc = gl.getAttribLocation(program, 'a_normal');
          const distLoc = gl.getAttribLocation(program, 'a_distance');

          // Base tube mesh positions (cx, cy, t) -> a_position.xyz, divisor 0
          gl.bindBuffer(gl.ARRAY_BUFFER, this.#tubeVertexBuffer);
          gl.enableVertexAttribArray(posLoc);
          gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
          gl.vertexAttribDivisor(posLoc, 0);

          // Disable unused per-vertex attributes
          if (normalLoc !== -1) {
            gl.disableVertexAttribArray(normalLoc);
            gl.vertexAttrib3f(normalLoc, 0.0, 0.0, 1.0);
            gl.vertexAttribDivisor(normalLoc, 0);
          }
          if (distLoc !== -1) {
            gl.disableVertexAttribArray(distLoc);
            gl.vertexAttrib1f(distLoc, 0.0);
            gl.vertexAttribDivisor(distLoc, 0);
          }
          if (centerLoc !== -1) {
            gl.disableVertexAttribArray(centerLoc);
            gl.vertexAttrib3f(centerLoc, 0.0, 0.0, 0.0);
            gl.vertexAttribDivisor(centerLoc, 0);
          }

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

          // Color: per-edge if provided, otherwise constant from lineShader.diffuseColor (#currentColor).
          if (!cols) {
            gl.disableVertexAttribArray(colorLoc);
            gl.vertexAttrib4f(colorLoc, edgeColorDefault[0], edgeColorDefault[1], edgeColorDefault[2], edgeColorDefault[3]);
            gl.vertexAttribDivisor(colorLoc, 0);
          } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.#tubeColorInstBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, cols, gl.DYNAMIC_DRAW);
            if (this.#debugGL) this.#debugGL.bufferDataArray++;
            gl.enableVertexAttribArray(colorLoc);
            gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(colorLoc, 1);
          }

          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#tubeIndexBuffer);
          gl.drawElementsInstanced(gl.TRIANGLES, this.#tubeIndexCount, gl.UNSIGNED_SHORT, 0, segCount);
          if (this.#debugGL) this.#debugGL.drawElements++;

          this._getViewer()?._incrementEdgesRendered?.(indices.length);
          this._endPrimitiveGroup();
          return;
        }
      } else if (canInstanceTubes) {
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
            // Edge colors coming from geometry attributes should already be float RGBA in [0,1].
            const edgeColor = c ?? edgeColorDefault;
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
        // Edge colors coming from geometry attributes should already be float RGBA in [0,1].
        const edgeColor = c ?? edgeColorDefault;
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
      const edgeFade = Number(this.getAppearanceAttribute(
        CommonAttributes.LINE_SHADER,
        CommonAttributes.EDGE_FADE,
        CommonAttributes.EDGE_FADE_DEFAULT
      ));
      for (let i = 0; i < indices.length; i++) {
        const c = edgeColors ? edgeColors[i] : null;
        // Edge colors coming from geometry attributes should already be float RGBA in [0,1].
        const edgeColor = c ?? this.#currentColor;
        // If the platform doesn't support wide hardware lines (very common), render screen-space quads
        // so `lineWidth` behaves as pixel width. Also use quads when edgeFade is requested.
        if (!this.#capabilities?.supportsWideLines || lineWidth > 1.0 || edgeFade > 0.0) {
          this.#drawPolylineAsScreenSpaceQuads(vertices, edgeColor, indices[i], lineWidth);
        } else {
          this.#drawPolylineAsLineStrip(vertices, c, indices[i], lineWidth);
        }
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

    // WebGL2 + spheresDraw: draw instanced real 3D spheres (icospheres), preferably using the unified lit shader.
    if (spheresDraw && isWebGL2 && this.#sphereCenterBuffer && this.#sphereColorInstBuffer) {
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

          // Colors:
          // With the updated DataList contract, color DataLists should already be packed float RGBA in [0,1].
          // We keep a tiny legacy fallback for [n,3] normalized RGB by padding alpha=1.
          const defaultColor = this.#currentColor;
          if (colorsDL && typeof colorsDL.getFlatData === 'function') {
            const cFlat = colorsDL.getFlatData();
            const cShape = colorsDL.shape;
            const cFiber = Array.isArray(cShape) && cShape.length >= 2 ? cShape[cShape.length - 1] : 0;
            const cf = cFiber || 4;

            if (cf === 4 && cFlat && cFlat.length >= numPoints * 4) {
              // Fast path: packed RGBA.
              colors.set(cFlat.subarray(0, numPoints * 4));
            } else if (cf === 3 && cFlat && cFlat.length >= numPoints * 3) {
              // Legacy normalized RGB: pad alpha=1.
            for (let i = 0; i < numPoints; i++) {
                const src = i * 3;
              const dst = i * 4;
                colors[dst + 0] = Number(cFlat[src + 0] ?? 0);
                colors[dst + 1] = Number(cFlat[src + 1] ?? 0);
                colors[dst + 2] = Number(cFlat[src + 2] ?? 0);
                colors[dst + 3] = 1.0;
              }
              } else {
              // Unexpected layout: fall back to the shader diffuse color.
              for (let i = 0; i < numPoints; i++) {
                const dst = i * 4;
                colors[dst + 0] = defaultColor[0];
                colors[dst + 1] = defaultColor[1];
                colors[dst + 2] = defaultColor[2];
                colors[dst + 3] = defaultColor[3];
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
        // Unified-lit instanced spheres (preferred)
        if (this.#unifiedProgram) {
          const program = this.#unifiedProgram;
          gl.useProgram(program);

          const lightingHint = this.getBooleanAttribute?.(CommonAttributes.LIGHTING_ENABLED, CommonAttributes.LIGHTING_ENABLED_DEFAULT);
          const flipNormals = this.getBooleanAttribute?.(CommonAttributes.FLIP_NORMALS_ENABLED, false);
          this.#updateUniforms(program, 0, 1.0, Boolean(lightingHint), Boolean(flipNormals));

          const modeLoc = gl.getUniformLocation(program, 'u_mode');
          if (modeLoc !== null) gl.uniform1i(modeLoc, 1);
          const prLoc = gl.getUniformLocation(program, 'u_pointRadius');
          if (prLoc !== null) gl.uniform1f(prLoc, pointRadius);
          const trLoc = gl.getUniformLocation(program, 'u_tubeRadius');
          if (trLoc !== null) gl.uniform1f(trLoc, 0.0);

          const posLoc = gl.getAttribLocation(program, 'a_position');
          const normLoc = gl.getAttribLocation(program, 'a_normal');
          const centerLoc = gl.getAttribLocation(program, 'a_center');
          const colorLoc = gl.getAttribLocation(program, 'a_color');
          const p0Loc = gl.getAttribLocation(program, 'a_p0');
          const p1Loc = gl.getAttribLocation(program, 'a_p1');
          const distLoc = gl.getAttribLocation(program, 'a_distance');

          // Base sphere positions; normals are identical for a unit sphere, so bind the same VBO.
          gl.bindBuffer(gl.ARRAY_BUFFER, sphereMesh.vbo);
          gl.enableVertexAttribArray(posLoc);
          gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
          gl.vertexAttribDivisor(posLoc, 0);
          if (normLoc !== -1) {
            gl.enableVertexAttribArray(normLoc);
            gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(normLoc, 0);
          }

          // Disable unused attributes for this mode.
          if (p0Loc !== -1) { gl.disableVertexAttribArray(p0Loc); gl.vertexAttrib3f(p0Loc, 0, 0, 0); gl.vertexAttribDivisor(p0Loc, 0); }
          if (p1Loc !== -1) { gl.disableVertexAttribArray(p1Loc); gl.vertexAttrib3f(p1Loc, 0, 0, 0); gl.vertexAttribDivisor(p1Loc, 0); }
          if (distLoc !== -1) { gl.disableVertexAttribArray(distLoc); gl.vertexAttrib1f(distLoc, 0.0); gl.vertexAttribDivisor(distLoc, 0); }

          // Per-instance center
          gl.bindBuffer(gl.ARRAY_BUFFER, this.#sphereCenterBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, inst.centers, gl.DYNAMIC_DRAW);
          if (this.#debugGL) this.#debugGL.bufferDataArray++;
          gl.enableVertexAttribArray(centerLoc);
          gl.vertexAttribPointer(centerLoc, 3, gl.FLOAT, false, 0, 0);
          gl.vertexAttribDivisor(centerLoc, 1);

          // Color:
          // - if vertex colors exist on the geometry, use per-instance color buffer
          // - otherwise, use a constant attribute from pointShader.diffuseColor (#currentColor)
          const hasVertexColors = Boolean(colorsDL && typeof colorsDL.getFlatData === 'function');
          if (!hasVertexColors) {
            gl.disableVertexAttribArray(colorLoc);
            gl.vertexAttrib4f(colorLoc, this.#currentColor[0], this.#currentColor[1], this.#currentColor[2], this.#currentColor[3]);
            gl.vertexAttribDivisor(colorLoc, 0);
          } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.#sphereColorInstBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, inst.colors, gl.DYNAMIC_DRAW);
            if (this.#debugGL) this.#debugGL.bufferDataArray++;
            gl.enableVertexAttribArray(colorLoc);
            gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(colorLoc, 1);
          }

          // Draw instanced sphere
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereMesh.ibo);
          gl.drawElementsInstanced(gl.TRIANGLES, sphereMesh.indexCount, gl.UNSIGNED_SHORT, 0, numPoints);
          if (this.#debugGL) this.#debugGL.drawElements++;

          this._getViewer()?._incrementPointsRendered?.(numPoints);
          this._endPrimitiveGroup();
          return;
        }

        // Legacy instanced spheres program (flat color; kept as fallback)
        if (this.#sphereProgram) {
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

          const hasVertexColors = Boolean(colorsDL && typeof colorsDL.getFlatData === 'function');
          if (!hasVertexColors) {
            gl.disableVertexAttribArray(colorLoc);
            gl.vertexAttrib4f(colorLoc, this.#currentColor[0], this.#currentColor[1], this.#currentColor[2], this.#currentColor[3]);
            gl.vertexAttribDivisor(colorLoc, 0);
          } else {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#sphereColorInstBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, inst.colors, gl.DYNAMIC_DRAW);
        if (this.#debugGL) this.#debugGL.bufferDataArray++;
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(colorLoc, 1);
          }

        // draw instanced sphere
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereMesh.ibo);
        gl.drawElementsInstanced(gl.TRIANGLES, sphereMesh.indexCount, gl.UNSIGNED_SHORT, 0, numPoints);

        if (this.#debugGL) this.#debugGL.drawElements++;
        this._getViewer()?._incrementPointsRendered?.(numPoints);
        this._endPrimitiveGroup();
        return;
        }
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

        // Colors:
        // With the updated DataList contract, color DataLists should already be packed float RGBA in [0,1].
        // We keep a tiny legacy fallback for [n,3] normalized RGB by padding alpha=1.
        const defaultColor = this.#currentColor;
        if (colorsDL && typeof colorsDL.getFlatData === 'function') {
          const cFlat = colorsDL.getFlatData();
          const cShape = colorsDL.shape;
          const cFiber = Array.isArray(cShape) && cShape.length >= 2 ? cShape[cShape.length - 1] : 0;
          const cf = cFiber || 4;

          if (cf === 4 && cFlat && cFlat.length >= numPoints * 4) {
            colors.set(cFlat.subarray(0, numPoints * 4));
          } else if (cf === 3 && cFlat && cFlat.length >= numPoints * 3) {
          for (let i = 0; i < numPoints; i++) {
              const src = i * 3;
            const dst = i * 4;
              colors[dst + 0] = Number(cFlat[src + 0] ?? 0);
              colors[dst + 1] = Number(cFlat[src + 1] ?? 0);
              colors[dst + 2] = Number(cFlat[src + 2] ?? 0);
              colors[dst + 3] = 1.0;
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

      if (cf === 4 && cFlat && cFlat.length >= numPoints * 4) {
        colorArray.set(cFlat.subarray(0, numPoints * 4));
      } else if (cf === 3 && cFlat && cFlat.length >= numPoints * 3) {
      for (let i = 0; i < numPoints; i++) {
          const src = i * 3;
        const dst = i * 4;
          colorArray[dst + 0] = Number(cFlat[src + 0] ?? 0);
          colorArray[dst + 1] = Number(cFlat[src + 1] ?? 0);
          colorArray[dst + 2] = Number(cFlat[src + 2] ?? 0);
          colorArray[dst + 3] = 1.0;
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
    this.#drawGeometry(vertexArray, colorArray, null, null, this.#capabilities.POINTS, null, 0, positionSize);
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
    return compileShaderUtil(this.#gl, type, source, 'WebGL2Renderer');
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
    this.#debugDidLogPolygonDiffuseThisFrame = false;
    
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
    
    // Use our main shader program (unified WebGL2 program if available, else WebGL1-compatible main).
    gl.useProgram(this.#getMainProgramForDraw());
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

        dbg.logFn('[WebGL2 debugPerf]', {
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

    // Normals (optional): prefer face normals for flat shading, else use vertex normals.
    const faceNormalsDL = geometry?.getFaceAttribute?.(GeometryAttribute.NORMALS) || null;
    const faceNormalsFlat = faceNormalsDL && typeof faceNormalsDL.getFlatData === 'function' ? faceNormalsDL.getFlatData() : null;
    const faceNormalsShape = faceNormalsDL?.shape;
    const faceNormalFiber = Array.isArray(faceNormalsShape) && faceNormalsShape.length >= 2 ? faceNormalsShape[faceNormalsShape.length - 1] : 0;

    const vertexNormalsDL = geometry?.getVertexAttribute?.(GeometryAttribute.NORMALS) || null;
    const vertexNormalsFlat = vertexNormalsDL && typeof vertexNormalsDL.getFlatData === 'function' ? vertexNormalsDL.getFlatData() : null;
    const vertexNormalsShape = vertexNormalsDL?.shape;
    const vertexNormalFiber = Array.isArray(vertexNormalsShape) && vertexNormalsShape.length >= 2 ? vertexNormalsShape[vertexNormalsShape.length - 1] : 0;

    // Respect DefaultPolygonShader.smoothShading: choose vertex normals for smooth shading,
    // otherwise prefer face normals for flat shading.
    const smoothShadingEnabled = Boolean(this.getAppearanceAttribute(
      CommonAttributes.POLYGON_SHADER,
      CommonAttributes.SMOOTH_SHADING,
      CommonAttributes.SMOOTH_SHADING_DEFAULT
    ));
    const hasFaceNormals = Boolean(faceNormalsFlat && faceNormalFiber >= 3);
    const hasVertexNormals = Boolean(vertexNormalsFlat && vertexNormalFiber >= 3);

    // Important: begin the polygon primitive group *before* capturing defaultColor.
    // Otherwise, the fallback defaultColor can accidentally come from the previous primitive
    // group (e.g., green point color), which makes faces render with the wrong color when
    // face colors are missing.
    this._beginPrimitiveGroup(CommonAttributes.POLYGON);

    // Helper to read face color i -> normalized RGBA (DataList contract: float RGBA in [0,1])
    const defaultColor = this.#currentColor; // already normalized 0..1
    const getFaceColor = (i) => {
      if (!faceColorsFlat || !faceColorChannels) return defaultColor;
      const base = i * faceColorChannels;
      const r = Number(faceColorsFlat[base + 0] ?? defaultColor[0]);
      const g = Number(faceColorsFlat[base + 1] ?? defaultColor[1]);
      const b = Number(faceColorsFlat[base + 2] ?? defaultColor[2]);
      const a = faceColorChannels >= 4 ? Number(faceColorsFlat[base + 3] ?? defaultColor[3]) : 1.0;
      return [r, g, b, a];
    };

    // Batch faces. If we can use 32-bit indices, we can draw the whole expanded mesh in one go.
    // Otherwise, chunk into <=65535 expanded vertices per draw (still only a few draw calls).
    const supportsUint32 = Boolean(this.#capabilities?.supportsUint32Indices);
    const MAX_UINT16_VERTS = 65535;

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
      const normalArray = hasFaceNormals || hasVertexNormals
        ? new Float32Array(batchVerts * 3)
        : null;

      let vOut = 0; // vertex index within this batch
      let vFloat = 0;
      let cFloat = 0;
      let nFloat = 0;
      let iOut = 0;

      // Second pass: fill
      for (let f = f0; f < f1; f++) {
        const row = faceRows[f];
        const len = row?.length ?? 0;
        if (len < 3) continue;

        const faceColor = getFaceColor(f);
        const faceNormalBase = hasFaceNormals ? (f * faceNormalFiber) : -1;
        const fnx = faceNormalBase >= 0 ? Number(faceNormalsFlat[faceNormalBase + 0] ?? 0) : 0;
        const fny = faceNormalBase >= 0 ? Number(faceNormalsFlat[faceNormalBase + 1] ?? 0) : 0;
        const fnz = faceNormalBase >= 0 ? Number(faceNormalsFlat[faceNormalBase + 2] ?? 1) : 1;
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

          if (normalArray) {
            if (smoothShadingEnabled) {
              if (hasVertexNormals) {
                const nb = vid * vertexNormalFiber;
                normalArray[nFloat++] = Number(vertexNormalsFlat[nb + 0] ?? 0);
                normalArray[nFloat++] = Number(vertexNormalsFlat[nb + 1] ?? 0);
                normalArray[nFloat++] = Number(vertexNormalsFlat[nb + 2] ?? 1);
              } else if (hasFaceNormals) {
              normalArray[nFloat++] = fnx;
              normalArray[nFloat++] = fny;
              normalArray[nFloat++] = fnz;
              } else {
                // Keep array consistent.
                normalArray[nFloat++] = 0;
                normalArray[nFloat++] = 0;
                normalArray[nFloat++] = 1;
              }
            } else {
              // Flat shading: prefer face normals.
              if (hasFaceNormals) {
                normalArray[nFloat++] = fnx;
                normalArray[nFloat++] = fny;
                normalArray[nFloat++] = fnz;
              } else if (hasVertexNormals) {
              const nb = vid * vertexNormalFiber;
              normalArray[nFloat++] = Number(vertexNormalsFlat[nb + 0] ?? 0);
              normalArray[nFloat++] = Number(vertexNormalsFlat[nb + 1] ?? 0);
              normalArray[nFloat++] = Number(vertexNormalsFlat[nb + 2] ?? 1);
            } else {
              normalArray[nFloat++] = 0;
              normalArray[nFloat++] = 0;
              normalArray[nFloat++] = 1;
              }
            }
          }

          vOut++;
        }

        for (let j = 1; j < len - 1; j++) {
          indexArray[iOut++] = startVertex;
          indexArray[iOut++] = startVertex + j;
          indexArray[iOut++] = startVertex + j + 1;
        }
      }

      this.#drawGeometry(vertexArray, colorArray, normalArray, indexArray, this.#capabilities.TRIANGLES, null, 0, positionSize);
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
    // Use CommonAttributes defaults so EffectiveAppearance always yields a consistent value
    // even if no Appearance explicitly sets the attribute.
    const defaultDiffuseColor =
      type === CommonAttributes.POINT ? CommonAttributes.POINT_DIFFUSE_COLOR_DEFAULT :
      type === CommonAttributes.LINE ? CommonAttributes.LINE_DIFFUSE_COLOR_DEFAULT :
      CommonAttributes.DIFFUSE_COLOR_DEFAULT;
    const color = this.getAppearanceAttribute(
      type === CommonAttributes.POINT ? CommonAttributes.POINT_SHADER :
      type === CommonAttributes.LINE ? CommonAttributes.LINE_SHADER :
      CommonAttributes.POLYGON_SHADER,
      CommonAttributes.DIFFUSE_COLOR,
      defaultDiffuseColor
    );

    // Debug: report resolved polygon diffuseColor (helps diagnose unexpected fallback colors).
    // We only log when debugPerf is enabled (and at most once per frame).
    try {
      const dbg = this._getViewer?.()?.getDebugPerfOptions?.();
      if (dbg?.enabled && typeof dbg.logFn === 'function' && type === CommonAttributes.POLYGON && !this.#debugDidLogPolygonDiffuseThisFrame) {
        this.#debugDidLogPolygonDiffuseThisFrame = true;
        dbg.logFn('[WebGL2 debug] polygonShader.diffuseColor resolved', {
          raw: color,
          webgl: this.#toWebGLColor(color),
          key: `${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`,
          fallback: defaultDiffuseColor
        });
      }
    } catch {
      // ignore logging failures
    }
    
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
  #updateUniforms(program, lineHalfWidth = 0, pointSize = 1.0, lightingEnabled = false, flipNormals = false) {
    const gl = this.#gl;
    
    // Get uniform location for transformation matrix
    const transformLoc = gl.getUniformLocation(program, 'u_transform');
    
    // Get current transformation from stack (includes all accumulated transforms including world2ndc)
    const currentTransform = this.getCurrentTransformation();
    
    // WebGL expects column-major matrices, but JavaScript arrays are row-major
    // Set transpose to true so WebGL transposes the matrices for us
    gl.uniformMatrix4fv(transformLoc, true, currentTransform);

    // ModelView + normal matrix for lighting (camera light at origin in view space).
    const modelViewLoc = gl.getUniformLocation(program, 'u_modelView');
    const normalMatLoc = gl.getUniformLocation(program, 'u_normalMatrix');
    const lightingLoc = gl.getUniformLocation(program, 'u_lightingEnabled');
    const flipNormalsLoc = gl.getUniformLocation(program, 'u_flipNormals');
    const ambientCoeffLoc = gl.getUniformLocation(program, 'u_ambientCoefficient');
    const diffuseCoeffLoc = gl.getUniformLocation(program, 'u_diffuseCoefficient');
    const ambientColorLoc = gl.getUniformLocation(program, 'u_ambientColor');

    // Compute modelView = world2cam * object2world only when lighting is enabled.
    // Matrices are row-major arrays; we upload with transpose=true.
    if (lightingEnabled && modelViewLoc !== null && normalMatLoc !== null) {
      const o2w = this._getCurrentObject2World?.();
      const w2c = this._getWorld2Cam?.();
      if (o2w && w2c) {
        const mv = new Array(16);
        // world2cam * object2world
        Rn.times(mv, w2c, o2w);
        gl.uniformMatrix4fv(modelViewLoc, true, mv);

        // Normal matrix: inverse-transpose of upper-left 3x3 of modelView.
        const m3 = [
          mv[0], mv[1], mv[2],
          mv[4], mv[5], mv[6],
          mv[8], mv[9], mv[10]
        ];
        const inv3 = Rn.inverse(null, m3);
        const n3 = Rn.transpose(null, inv3);
        logger.fine(Category.ALL, 'n3:', n3);
        gl.uniformMatrix3fv(normalMatLoc, true, new Float32Array(n3));
      }
    }

    if (lightingLoc !== null) {
      gl.uniform1f(lightingLoc, lightingEnabled ? 1.0 : 0.0);
    }
    if (flipNormalsLoc !== null) {
      gl.uniform1f(flipNormalsLoc, flipNormals ? 1.0 : 0.0);
    }
    // Polygon shader lighting parameters (jReality-style): Cs = Ka*ambientColor + Kd*(N·L)*diffuseColor.
    // Here diffuseColor is already provided via v_color (from face/vertex colors or polygonShader.diffuseColor),
    // so we only upload Ka, Kd and ambientColor.
    const ambientCoeff = Number(this.getAppearanceAttribute(
      CommonAttributes.POLYGON_SHADER,
      CommonAttributes.AMBIENT_COEFFICIENT,
      CommonAttributes.AMBIENT_COEFFICIENT_DEFAULT
    ));
    const diffuseCoeff = Number(this.getAppearanceAttribute(
      CommonAttributes.POLYGON_SHADER,
      CommonAttributes.DIFFUSE_COEFFICIENT,
      CommonAttributes.DIFFUSE_COEFFICIENT_DEFAULT
    ));
    const specularCoeff = Number(this.getAppearanceAttribute(
      CommonAttributes.POLYGON_SHADER,
      CommonAttributes.SPECULAR_COEFFICIENT,
      CommonAttributes.SPECULAR_COEFFICIENT_DEFAULT
    ));
    const specularExponent = Number(this.getAppearanceAttribute(
      CommonAttributes.POLYGON_SHADER,
      CommonAttributes.SPECULAR_EXPONENT,
      CommonAttributes.SPECULAR_EXPONENT_DEFAULT
    ));
    const ambientColorValue = this.getAppearanceAttribute(
      CommonAttributes.POLYGON_SHADER,
      CommonAttributes.AMBIENT_COLOR,
      CommonAttributes.AMBIENT_COLOR_DEFAULT
    );
    const specularColorValue = this.getAppearanceAttribute(
      CommonAttributes.POLYGON_SHADER,
      CommonAttributes.SPECULAR_COLOR,
      CommonAttributes.SPECULAR_COLOR_DEFAULT
    );
    const ambientRGBA = this.#toWebGLColor(ambientColorValue);
    const specularRGBA = this.#toWebGLColor(specularColorValue);

    if (ambientCoeffLoc !== null) {
      gl.uniform1f(ambientCoeffLoc, ambientCoeff);
    }
    if (diffuseCoeffLoc !== null) {
      gl.uniform1f(diffuseCoeffLoc, diffuseCoeff);
    }
    if (ambientColorLoc !== null) {
      gl.uniform3f(ambientColorLoc, ambientRGBA[0], ambientRGBA[1], ambientRGBA[2]);
    }

    const specularCoeffLoc = gl.getUniformLocation(program, 'u_specularCoefficient');
    if (specularCoeffLoc !== null) {
      gl.uniform1f(specularCoeffLoc, specularCoeff);
    }
    const specularExpLoc = gl.getUniformLocation(program, 'u_specularExponent');
    if (specularExpLoc !== null) {
      gl.uniform1f(specularExpLoc, specularExponent);
    }
    const specularColorLoc = gl.getUniformLocation(program, 'u_specularColor');
    if (specularColorLoc !== null) {
      gl.uniform3f(specularColorLoc, specularRGBA[0], specularRGBA[1], specularRGBA[2]);
    }
    
    // Set point size uniform
    const pointSizeLoc = gl.getUniformLocation(program, 'u_pointSize');
    if (pointSizeLoc !== null) {
      gl.uniform1f(pointSizeLoc, pointSize);
    }

    // Point sprite (round points) controls: use pointShader.pointSprite and pointShader.edgeFade.
    // These only affect GL_POINTS draws (SPHERES_DRAW=false path).
    const pointSpriteLoc = gl.getUniformLocation(program, 'u_pointSprite');
    if (pointSpriteLoc !== null) {
      const pointSprite = Boolean(this.getAppearanceAttribute(
        CommonAttributes.POINT_SHADER,
        CommonAttributes.POINT_SPRITE,
        false
      ));
      gl.uniform1f(pointSpriteLoc, pointSprite ? 1.0 : 0.0);
    }
    const pointEdgeFadeLoc = gl.getUniformLocation(program, 'u_pointEdgeFade');
    if (pointEdgeFadeLoc !== null) {
      const pointEdgeFade = Number(this.getAppearanceAttribute(
        CommonAttributes.POINT_SHADER,
        CommonAttributes.EDGE_FADE,
        0.1
      ));
      gl.uniform1f(pointEdgeFadeLoc, pointEdgeFade);
    }
    
    // Set edge fade uniform (for screen-space line quads and similar AA)
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
      console.warn('WebGL2Renderer: Point must have at least 2 coordinates');
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
      
      // Get color (geometry colors are float RGBA arrays; appearance colors are Color objects)
      const pointColor = color ? this.#toRGBA(color) : this.#currentColor;
      const colors = new Float32Array([
        ...pointColor, ...pointColor, ...pointColor, ...pointColor
      ]);
      
      // Draw using standard triangle rendering
      this.#updateUniforms(this.#getMainProgramForDraw(), 0, 1.0); // pointSize not used for quad rendering
      this.#drawGeometry(vertices, colors, null, indices, this.#capabilities.TRIANGLES);
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
      
      // Get color (geometry colors are float RGBA arrays; appearance colors are Color objects)
      const pointColor = color ? this.#toRGBA(color) : this.#currentColor;
      const colors = new Float32Array(pointColor);
      
      // Use native WebGL point rendering
      // Update uniforms with point size (direct pixel value, no conversion)
      const program = this.#getMainProgramForDraw();
      gl.useProgram(program);
      // Ensure unified program is in polygon mode for this draw.
      if (program === this.#unifiedProgram) {
        const modeLoc = gl.getUniformLocation(program, 'u_mode');
        if (modeLoc !== null) gl.uniform1i(modeLoc, 0);
        const prLoc = gl.getUniformLocation(program, 'u_pointRadius');
        if (prLoc !== null) gl.uniform1f(prLoc, 0.0);
        const trLoc = gl.getUniformLocation(program, 'u_tubeRadius');
        if (trLoc !== null) gl.uniform1f(trLoc, 0.0);
      }
      this.#updateUniforms(program, 0, pointSize);
      
      // Bind buffers
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      
      const positionLoc = gl.getAttribLocation(program, 'a_position');
      if (positionLoc === -1) {
        console.error('WebGL2Renderer: a_position attribute not found in shader');
        return;
      }
      gl.enableVertexAttribArray(positionLoc);
      // Use the detected dimension to set the component count (2, 3, or 4)
      // The shader uses vec4, but we tell GL how many components to read
      gl.vertexAttribPointer(positionLoc, validDim, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
      
      const colorLoc = gl.getAttribLocation(program, 'a_color');
      if (colorLoc === -1) {
        console.error('WebGL2Renderer: a_color attribute not found in shader');
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

    const extractPoint = (v) => this._extractPoint(v);

    // Draw each line segment as a quad; flush before overflow.
    for (let i = 0; i < indices.length - 1; i++) {
      if (this.#batchedVertexOffset + 4 > MAX_VERTICES) {
        // Preserve color/width so we can continue batching after flush
        this.#flushBatchedLines(true);
      }

      const res = addPolylineToBatchUtil(
        extractPoint,
        vertices,
        [indices[i], indices[i + 1]],
        edgeColor,
        halfWidth,
        {
          batchedVertices: this.#batchedVertices,
          batchedColors: this.#batchedColors,
          batchedDistances: this.#batchedDistances,
          batchedIndices: this.#batchedIndices,
          vertexOffset: this.#batchedVertexOffset
        }
      );
      this.#batchedVertexOffset = res.vertexOffset;
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
      null,
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
    this.#drawGeometry(vertexArray, colorArray, null, sequentialIndices, this.#capabilities.LINE_STRIP, null, 0, positionSize);
  }

  /**
   * Draw a polyline as screen-space quads (triangles) so `lineWidth` is in pixels even on
   * WebGL implementations where `gl.lineWidth()` is effectively clamped to 1.
   *
   * This is intended for the `TUBES_DRAW=false` case (screen-space lines, e.g. 2D drawings).
   *
   * @private
   * @param {*} vertices - Vertex coordinate data
   * @param {number[]|null} edgeColorRGBA - WebGL RGBA in [0,1] (single color for the polyline)
   * @param {number[]} indices - Array of vertex indices for the polyline
   * @param {number} lineWidthPx - Desired line width in pixels
   */
  #drawPolylineAsScreenSpaceQuads(vertices, edgeColorRGBA, indices, lineWidthPx) {
    const gl = this.#gl;
    const program = this.#getMainProgramForDraw();

    if (!indices || indices.length < 2) return;
    const wPx = this.#canvas?.width ?? 0;
    const hPx = this.#canvas?.height ?? 0;
    if (!(wPx > 0 && hPx > 0)) return;

    const halfWidthPx = Math.max(0.5, Number(lineWidthPx) * 0.5);

    // Guard: keep index sizes <= 65535 per draw.
    const segCount = indices.length - 1;
    const vertCount = segCount * 4;
    if (vertCount > 65535) {
      // Fall back to thin lines if a single polyline is enormous.
      this.#drawPolylineAsLineStrip(vertices, edgeColorRGBA, indices, 1.0);
      return;
    }

    const pos = new Float32Array(vertCount * 4);   // clip-space (x,y,z,w=1)
    const col = new Float32Array(vertCount * 4);
    const dist = new Float32Array(vertCount);      // pixel-space distance from centerline
    const idx = new Uint16Array(segCount * 6);

    const T = this.getCurrentTransformation(); // object->clip (row-major)
    const edgeColor = edgeColorRGBA ?? this.#currentColor;

    let v = 0;
    let ii = 0;
    for (let s = 0; s < segCount; s++) {
      const i0 = indices[s] | 0;
      const i1 = indices[s + 1] | 0;
      const p0 = this._extractPoint(vertices[i0]);
      const p1 = this._extractPoint(vertices[i1]);

      // Clip coords
      const c0 = Rn.matrixTimesVector(null, T, [p0[0] ?? 0, p0[1] ?? 0, p0[2] ?? 0, p0[3] ?? 1]);
      const c1 = Rn.matrixTimesVector(null, T, [p1[0] ?? 0, p1[1] ?? 0, p1[2] ?? 0, p1[3] ?? 1]);
      const w0 = (c0[3] === 0 ? 1.0 : c0[3]);
      const w1 = (c1[3] === 0 ? 1.0 : c1[3]);
      const ndc0x = c0[0] / w0, ndc0y = c0[1] / w0, ndc0z = c0[2] / w0;
      const ndc1x = c1[0] / w1, ndc1y = c1[1] / w1, ndc1z = c1[2] / w1;

      // Pixel coords
      const sx0 = (ndc0x * 0.5 + 0.5) * wPx;
      const sy0 = (ndc0y * 0.5 + 0.5) * hPx;
      const sx1 = (ndc1x * 0.5 + 0.5) * wPx;
      const sy1 = (ndc1y * 0.5 + 0.5) * hPx;

      const dx = sx1 - sx0;
      const dy = sy1 - sy0;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;
      const nx = -dy / len;
      const ny = dx / len;

      // Offset in pixels
      const p0Lx = sx0 + nx * halfWidthPx, p0Ly = sy0 + ny * halfWidthPx;
      const p0Rx = sx0 - nx * halfWidthPx, p0Ry = sy0 - ny * halfWidthPx;
      const p1Lx = sx1 + nx * halfWidthPx, p1Ly = sy1 + ny * halfWidthPx;
      const p1Rx = sx1 - nx * halfWidthPx, p1Ry = sy1 - ny * halfWidthPx;

      // Back to NDC
      const toNdcX = (sx) => (sx / wPx) * 2.0 - 1.0;
      const toNdcY = (sy) => (sy / hPx) * 2.0 - 1.0;

      const base = v * 4;
      // v0: p0L
      pos[base + 0] = toNdcX(p0Lx); pos[base + 1] = toNdcY(p0Ly); pos[base + 2] = ndc0z; pos[base + 3] = 1.0;
      // v1: p0R
      pos[base + 4] = toNdcX(p0Rx); pos[base + 5] = toNdcY(p0Ry); pos[base + 6] = ndc0z; pos[base + 7] = 1.0;
      // v2: p1L
      pos[base + 8] = toNdcX(p1Lx); pos[base + 9] = toNdcY(p1Ly); pos[base + 10] = ndc1z; pos[base + 11] = 1.0;
      // v3: p1R
      pos[base + 12] = toNdcX(p1Rx); pos[base + 13] = toNdcY(p1Ry); pos[base + 14] = ndc1z; pos[base + 15] = 1.0;

      // Colors
      for (let k = 0; k < 4; k++) {
        const cbase = (v + k) * 4;
        col[cbase + 0] = edgeColor[0];
        col[cbase + 1] = edgeColor[1];
        col[cbase + 2] = edgeColor[2];
        col[cbase + 3] = edgeColor[3];
      }

      // Distance from centerline in *pixels* (for edge fade)
      dist[v + 0] = -halfWidthPx;
      dist[v + 1] = halfWidthPx;
      dist[v + 2] = -halfWidthPx;
      dist[v + 3] = halfWidthPx;

      // Indices (two triangles)
      idx[ii++] = v + 0; idx[ii++] = v + 1; idx[ii++] = v + 2;
      idx[ii++] = v + 1; idx[ii++] = v + 3; idx[ii++] = v + 2;
      v += 4;
    }

    if (v === 0) return;

    // If we skipped degenerate segments, shrink views (still backed by same buffers).
    const posView = pos.subarray(0, v * 4);
    const colView = col.subarray(0, v * 4);
    const distView = dist.subarray(0, v);
    const idxView = idx.subarray(0, ii);

    gl.useProgram(program);

    // Set uniforms: we will draw in clip-space, so set u_transform = identity.
    const lightingEnabled = false; // screen-space lines are typically unlit
    const flipNormals = false;
    this.#updateUniforms(program, halfWidthPx, 1.0, lightingEnabled, flipNormals);
    const transformLoc = gl.getUniformLocation(program, 'u_transform');
    if (transformLoc !== null) {
      gl.uniformMatrix4fv(transformLoc, true, Rn.identityMatrix(4));
    }

    // Unified program defaults
    if (program === this.#unifiedProgram) {
      const modeLoc = gl.getUniformLocation(program, 'u_mode');
      if (modeLoc !== null) gl.uniform1i(modeLoc, 0);
      const prLoc = gl.getUniformLocation(program, 'u_pointRadius');
      if (prLoc !== null) gl.uniform1f(prLoc, 0.0);
      const trLoc = gl.getUniformLocation(program, 'u_tubeRadius');
      if (trLoc !== null) gl.uniform1f(trLoc, 0.0);
    }

    // Buffers + attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, posView, gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 4, gl.FLOAT, false, 0, 0);
    if (typeof gl.vertexAttribDivisor === 'function') gl.vertexAttribDivisor(posLoc, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.#colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colView, gl.DYNAMIC_DRAW);
    const colorLoc = gl.getAttribLocation(program, 'a_color');
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    if (typeof gl.vertexAttribDivisor === 'function') gl.vertexAttribDivisor(colorLoc, 0);

    // Distance (for edge fade)
    const distLoc = gl.getAttribLocation(program, 'a_distance');
    if (distLoc !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#distanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, distView, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(distLoc);
      gl.vertexAttribPointer(distLoc, 1, gl.FLOAT, false, 0, 0);
      if (typeof gl.vertexAttribDivisor === 'function') gl.vertexAttribDivisor(distLoc, 0);
    }

    // Disable normals
    const normalLoc = gl.getAttribLocation(program, 'a_normal');
    if (normalLoc !== -1) {
      gl.disableVertexAttribArray(normalLoc);
      gl.vertexAttrib3f(normalLoc, 0.0, 0.0, 1.0);
      if (typeof gl.vertexAttribDivisor === 'function') gl.vertexAttribDivisor(normalLoc, 0);
    }

    // Unified extra attrs off
    if (program === this.#unifiedProgram) {
      const centerLoc = gl.getAttribLocation(program, 'a_center');
      const p0Loc = gl.getAttribLocation(program, 'a_p0');
      const p1Loc = gl.getAttribLocation(program, 'a_p1');
      if (centerLoc !== -1) { gl.disableVertexAttribArray(centerLoc); gl.vertexAttrib3f(centerLoc, 0, 0, 0); if (typeof gl.vertexAttribDivisor === 'function') gl.vertexAttribDivisor(centerLoc, 0); }
      if (p0Loc !== -1) { gl.disableVertexAttribArray(p0Loc); gl.vertexAttrib3f(p0Loc, 0, 0, 0); if (typeof gl.vertexAttribDivisor === 'function') gl.vertexAttribDivisor(p0Loc, 0); }
      if (p1Loc !== -1) { gl.disableVertexAttribArray(p1Loc); gl.vertexAttrib3f(p1Loc, 0, 0, 0); if (typeof gl.vertexAttribDivisor === 'function') gl.vertexAttribDivisor(p1Loc, 0); }
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.#indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxView, gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, idxView.length, gl.UNSIGNED_SHORT, 0);
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
    const edgeColor = colors ? this.#toRGBA(colors) : this.#currentColor;
    
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
        null,
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
    // console.error('🔵 WebGL2Renderer._drawPolygon CALLED - color:', color);
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
    this.#drawGeometry(vertexArray, colorArray, null, indexArray, this.#capabilities.TRIANGLES, null, 0, positionSize);
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
  #drawGeometry(vertices, colors, normals, indices, mode, distances = null, lineHalfWidth = 0, positionSize = 2) {
    const gl = this.#gl;
    const program = this.#getMainProgramForDraw();
    
    // Validate inputs
    if (!vertices || vertices.length === 0) {
      console.warn('WebGL2Renderer: No vertices to draw');
      return;
    }

    // Validate that the vertex array length is compatible with the component count
    if (positionSize <= 0 || positionSize > 4 || vertices.length % positionSize !== 0) {
      console.warn('WebGL2Renderer: Invalid vertex array length or positionSize', {
        length: vertices.length,
        positionSize
      });
      return;
    }
    
    // Ensure program is active
    gl.useProgram(program);
    
    // Unified WebGL2 program: default to polygon mode for non-instanced draws.
    // Instanced sphere/tube paths set u_mode explicitly.
    if (program === this.#unifiedProgram) {
      const modeLoc = gl.getUniformLocation(program, 'u_mode');
      if (modeLoc !== null) gl.uniform1i(modeLoc, 0);
      const prLoc = gl.getUniformLocation(program, 'u_pointRadius');
      if (prLoc !== null) gl.uniform1f(prLoc, 0.0);
      const trLoc = gl.getUniformLocation(program, 'u_tubeRadius');
      if (trLoc !== null) gl.uniform1f(trLoc, 0.0);
    }
    
    // Update uniforms with current transformation and line width.
    // IMPORTANT: for gl.POINTS, we must upload the requested point size; otherwise points can appear "missing"
    // (often rendered at size=1 regardless of Appearance.pointShader.pointSize).
    // Lighting is controlled by DefaultRenderingHintsShader.lightingEnabled, but we also require
    // normals and TRIANGLES mode.
    const lightingHint = this.getBooleanAttribute?.(
      CommonAttributes.LIGHTING_ENABLED,
      CommonAttributes.LIGHTING_ENABLED_DEFAULT
    );
    const lightingEnabled = Boolean(
      lightingHint && normals && normals.length > 0 && mode === this.#capabilities.TRIANGLES
    );
    const flipNormals = this.getBooleanAttribute?.(CommonAttributes.FLIP_NORMALS_ENABLED, false);
    const pointSize =
      (mode === this.#capabilities.POINTS)
        ? Number(this.getAppearanceAttribute(
            CommonAttributes.POINT_SHADER,
            CommonAttributes.POINT_SIZE,
            CommonAttributes.POINT_SIZE_DEFAULT
          ))
        : 1.0;
    this.#updateUniforms(program, lineHalfWidth, pointSize, lightingEnabled, flipNormals);

    // -----------------------------------------------------------------------
    // Vertex buffer
    // -----------------------------------------------------------------------
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    if (this.#debugGL) this.#debugGL.bufferDataArray++;
    
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    if (positionLoc === -1) {
      console.error('WebGL2Renderer: a_position attribute not found in shader');
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
      console.error('WebGL2Renderer: a_color attribute not found in shader');
      return;
    }
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    if (typeof gl.vertexAttribDivisor === 'function') {
      gl.vertexAttribDivisor(colorLoc, 0);
    }

    // -----------------------------------------------------------------------
    // Normal buffer (optional; lighting enabled only when provided)
    // -----------------------------------------------------------------------
    const normalLoc = gl.getAttribLocation(program, 'a_normal');
    if (normalLoc !== -1) {
      if (normals && normals.length > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.DYNAMIC_DRAW);
        if (this.#debugGL) this.#debugGL.bufferDataArray++;
        gl.enableVertexAttribArray(normalLoc);
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
        if (typeof gl.vertexAttribDivisor === 'function') {
          gl.vertexAttribDivisor(normalLoc, 0);
        }
      } else {
        // Disable and set a safe default normal (facing camera).
        gl.disableVertexAttribArray(normalLoc);
        gl.vertexAttrib3f(normalLoc, 0.0, 0.0, 1.0);
        if (typeof gl.vertexAttribDivisor === 'function') {
          gl.vertexAttribDivisor(normalLoc, 0);
        }
      }
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

    // Unified program extra attributes: ensure they don't leak divisors/state from instanced draws.
    if (program === this.#unifiedProgram) {
      const centerLoc = gl.getAttribLocation(program, 'a_center');
      const p0Loc = gl.getAttribLocation(program, 'a_p0');
      const p1Loc = gl.getAttribLocation(program, 'a_p1');

      if (centerLoc !== -1) {
        gl.disableVertexAttribArray(centerLoc);
        gl.vertexAttrib3f(centerLoc, 0.0, 0.0, 0.0);
        if (typeof gl.vertexAttribDivisor === 'function') gl.vertexAttribDivisor(centerLoc, 0);
      }
      if (p0Loc !== -1) {
        gl.disableVertexAttribArray(p0Loc);
        gl.vertexAttrib3f(p0Loc, 0.0, 0.0, 0.0);
        if (typeof gl.vertexAttribDivisor === 'function') gl.vertexAttribDivisor(p0Loc, 0);
      }
      if (p1Loc !== -1) {
        gl.disableVertexAttribArray(p1Loc);
        gl.vertexAttrib3f(p1Loc, 0.0, 0.0, 0.0);
        if (typeof gl.vertexAttribDivisor === 'function') gl.vertexAttribDivisor(p1Loc, 0);
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
          console.error('WebGL2Renderer: Uint32 indices requested but UNSIGNED_INT indices are not supported by this context');
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
    return verticesToFloat32ArrayUtil((v) => this._extractPoint(v), vertices, indices);
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
    return colorsToFloat32ArrayUtil((c) => this.#toRGBA(c), colors, indices, defaultColor);
  }

  /**
   * Triangulate a polygon using sequential indices (for compacted vertex arrays)
   * @private
   * @param {number} numVertices - Number of vertices in the polygon
   * @returns {Uint16Array}
   */
  #triangulatePolygonSequential(numVertices) {
    return triangulatePolygonSequentialUtil(numVertices);
  }

  /**
   * Convert an *appearance* color to WebGL format [r, g, b, a] in range [0, 1].
   * Strict by design: this method only accepts `Color` instances.
   *
   * Geometry colors (from DataLists) are expected to already be normalized float arrays;
   * those should go through `#toRGBA()` instead.
   *
   * @private
   * @param {*} color
   * @returns {number[]}
   */
  #toWebGLColor(color) {
    if (!(color instanceof Color)) {
      throw new Error(`WebGL2Renderer.#toWebGLColor: expected Color, got ${Object.prototype.toString.call(color)}`);
    }
      return color.toFloatArray();
  }

  /**
   * Convert a geometry color into float RGBA in [0,1].
   *
   * Contract:
   * - Geometry color attributes (from `fromDataList(...)`) must already be normalized floats.
   * - Appearance colors should always be `Color` objects and must go through `#toWebGLColor(...)`.
   *
   * Accepts:
   * - float[4] (RGBA) → returned as-is
   * - float[3] (RGB)  → alpha padded to 1.0
   *
   * @private
   * @param {*} color
   * @returns {number[]}
   */
  #toRGBA(color) {
    if (Array.isArray(color)) {
      if (color.length === 4) return color;
      if (color.length === 3) return [color[0], color[1], color[2], 1.0];
    }
    throw new Error(`WebGL2Renderer.#toRGBA: expected float[3|4] array (geometry color), got ${Object.prototype.toString.call(color)}`);
  }
}

