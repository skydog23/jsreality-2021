/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * WebGL2 shader/program creation helpers.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Compile a WebGL shader.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
 * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} source
 * @param {string} [label]
 * @returns {WebGLShader|null}
 */
export function compileShader(gl, type, source, label = '') {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    console.error('WebGL shader compile error', label ? `(${label})` : '', info);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Link a WebGL program from compiled shaders.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
 * @param {WebGLShader} vertexShader
 * @param {WebGLShader} fragmentShader
 * @param {string} [label]
 * @returns {WebGLProgram|null}
 */
export function linkProgram(gl, vertexShader, fragmentShader, label = '') {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    console.error('WebGL program link error', label ? `(${label})` : '', info);
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * Compile+link a program from sources.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
 * @param {{ vertexSource: string, fragmentSource: string, label?: string }} spec
 * @returns {WebGLProgram|null}
 */
export function createProgram(gl, { vertexSource, fragmentSource, label = '' }) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource, `${label}:vs`);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, `${label}:fs`);
  if (!vs || !fs) return null;
  return linkProgram(gl, vs, fs, label);
}

/**
 * Query WebGL capabilities/limits relevant to the WebGL2 renderer.
 *
 * If a logger is provided, logs size/capabilities only once (per page load),
 * which is useful during offscreen rendering where many temporary viewers are created.
 *
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
 * @param {{ logger?: any, Category?: any, logOnceRef?: { didLog: boolean } }} [options]
 * @returns {object}
 */
export function queryWebGLCapabilities(gl, options = {}) {
  const caps = {
    TRIANGLES: (gl.TRIANGLES !== undefined && gl.TRIANGLES !== null) ? gl.TRIANGLES : 0x0004,
    LINE_STRIP: (gl.LINE_STRIP !== undefined && gl.LINE_STRIP !== null) ? gl.LINE_STRIP : 0x0003,
    POINTS: (gl.POINTS !== undefined && gl.POINTS !== null) ? gl.POINTS : 0x0000,

    maxLineWidth: 1.0,
    supportsWideLines: false,

    maxPointSize: 1.0,
    minPointSize: 1.0,

    UNSIGNED_SHORT: gl.UNSIGNED_SHORT,
    UNSIGNED_INT: gl.UNSIGNED_INT,
    supportsUint32Indices: false
  };

  try { caps.MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE); } catch { caps.MAX_TEXTURE_SIZE = null; }
  try { caps.MAX_RENDERBUFFER_SIZE = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE); } catch { caps.MAX_RENDERBUFFER_SIZE = null; }
  try { caps.MAX_VIEWPORT_DIMS = gl.getParameter(gl.MAX_VIEWPORT_DIMS); } catch { caps.MAX_VIEWPORT_DIMS = null; }
  if (gl.MAX_SAMPLES !== undefined) {
    try { caps.MAX_SAMPLES = gl.getParameter(gl.MAX_SAMPLES); } catch { caps.MAX_SAMPLES = null; }
  }

  const { logger, Category, logOnceRef } = options || {};
  try {
    if (logger && Category && logOnceRef && !logOnceRef.didLog) {
      logOnceRef.didLog = true;
      logger.fine(Category.ALL, '[WebGL2] Capabilities / size limits', {
        isWebGL2: (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext,
        MAX_TEXTURE_SIZE: caps.MAX_TEXTURE_SIZE,
        MAX_RENDERBUFFER_SIZE: caps.MAX_RENDERBUFFER_SIZE,
        MAX_VIEWPORT_DIMS: caps.MAX_VIEWPORT_DIMS,
        MAX_SAMPLES: caps.MAX_SAMPLES ?? '(n/a)',
        ALIASED_POINT_SIZE_RANGE: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
        ALIASED_LINE_WIDTH_RANGE: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)
      });
    }
  } catch {
    // ignore
  }

  const pointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
  if (pointSizeRange && pointSizeRange.length >= 2) {
    caps.minPointSize = pointSizeRange[0];
    caps.maxPointSize = pointSizeRange[1];
  }

  const maxLineWidthRange = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE);
  if (maxLineWidthRange && maxLineWidthRange.length >= 2) {
    caps.maxLineWidth = maxLineWidthRange[1];
    caps.supportsWideLines = maxLineWidthRange[1] > 1.0;
  } else {
    try {
      const maxWidth = gl.getParameter(gl.MAX_LINE_WIDTH);
      if (maxWidth !== null && maxWidth !== undefined) {
        caps.maxLineWidth = maxWidth;
        caps.supportsWideLines = maxWidth > 1.0;
      }
    } catch {
      caps.maxLineWidth = 1.0;
      caps.supportsWideLines = false;
    }
  }

  return caps;
}

/**
 * Create the main (WebGL1-compatible) program used for most geometry.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
 * @returns {WebGLProgram|null}
 */
export function createMainProgram(gl) {
  const vertexSource = `
      precision mediump float;

      attribute vec4 a_position;
      attribute vec4 a_color;
      attribute vec3 a_normal;
      attribute float a_distance;

      uniform mat4 u_transform;
      uniform mat4 u_modelView;
      uniform mat3 u_normalMatrix;
      uniform float u_lightingEnabled;
      uniform float u_flipNormals;
      uniform float u_pointSize;

      varying vec4 v_color;
      varying float v_distance;
      varying vec3 v_viewPos;
      varying vec3 v_viewNormal;

      void main() {
        vec4 position = a_position;
        if (position.w == 0.0) {
          position.w = 1.0;
        }
        position = u_transform * position;
        gl_Position = position;
        gl_PointSize = u_pointSize;
        v_color = a_color;
        v_distance = a_distance;

        // Phong shading: pass view-space position + normal to fragment shader.
        // Lighting itself is computed per-fragment for accuracy.
        vec4 pv = u_modelView * vec4(a_position.xyz, 1.0);
        v_viewPos = pv.xyz;
        v_viewNormal = u_normalMatrix * a_normal;
      }
    `;

  const fragmentSource = `
      precision mediump float;

      varying vec4 v_color;
      varying float v_distance;
      varying vec3 v_viewPos;
      varying vec3 v_viewNormal;

      uniform float u_lightingEnabled;
      uniform float u_flipNormals;
      uniform float u_lineHalfWidth;
      uniform float u_ambientCoefficient;
      uniform float u_diffuseCoefficient;
      uniform float u_specularCoefficient;
      uniform float u_specularExponent;
      uniform vec3 u_ambientColor;
      uniform vec3 u_specularColor;
      uniform float u_edgeFade;

      // Point sprite (round/AA points) controls
      uniform float u_pointSprite;
      uniform float u_pointEdgeFade;
      uniform float u_pointSize;

      void main() {
        float dist = abs(v_distance);
        float alpha = 1.0;
        if (u_lineHalfWidth > 0.0) {
          float fadeStart = u_lineHalfWidth * (1.0 - u_edgeFade);
          alpha = 1.0 - smoothstep(fadeStart, u_lineHalfWidth, dist);
        }

        // Optional: draw GL_POINTS as anti-aliased circles using gl_PointCoord.
        // This is only meaningful for point primitives; for triangles/lines u_pointSize is typically 1.
        if (u_pointSprite > 0.5 && u_pointSize > 1.5 && u_lineHalfWidth <= 0.0) {
          vec2 pc = gl_PointCoord - vec2(0.5);
          float r = length(pc);          // 0..~0.707
          float radius = 0.5;            // circle inscribed in the square point
          float aa = max(1.0 / max(u_pointSize, 1.0), 0.001);
          float edge = mix(aa, radius, clamp(u_pointEdgeFade, 0.0, 1.0));
          float mask = 1.0 - smoothstep(radius - edge, radius, r);
          alpha *= mask;
          if (alpha <= 0.0) discard;
        }

        float lit = 1.0;
        float spec = 0.0;
        if (u_lightingEnabled > 0.5) {
          vec3 N = normalize(v_viewNormal);
          if (u_flipNormals > 0.5) {
            N = -N;
          }
          // Camera light at origin in view space: direction from point -> light is (-v_viewPos).
          vec3 L = normalize(-v_viewPos);
          lit = max(dot(N, L), 0.0);
          if (lit > 0.0 && u_specularCoefficient > 0.0) {
            vec3 V = normalize(-v_viewPos);
            vec3 R = reflect(-L, N); // reflect incident (-L) about N
            spec = u_specularCoefficient * pow(max(dot(R, V), 0.0), u_specularExponent);
          }
        }
        vec3 ambient = u_ambientCoefficient * u_ambientColor;
        vec3 diffuse = u_diffuseCoefficient * lit * v_color.rgb;
        vec3 specular = spec * u_specularColor;
        gl_FragColor = vec4(ambient + diffuse + specular, v_color.a * alpha);
      }
    `;

  return createProgram(gl, { vertexSource, fragmentSource, label: 'WebGL2(main)' });
}

/**
 * WebGL2-only: unified lit program that can render:
 * - regular (non-instanced) polygon meshes
 * - instanced spheres (points-as-spheres)
 * - instanced tubes (lines-as-tubes)
 *
 * This keeps the lighting/material math consistent across all polygonal primitives.
 *
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
 * @returns {WebGLProgram|null}
 */
export function createUnifiedLitProgram(gl) {
  if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)) {
    return null;
  }

  const vertexSource = `#version 300 es
      precision mediump float;

      in vec4 a_position;
      in vec4 a_color;
      in vec3 a_normal;
      in float a_distance;

      // Instancing attributes (used for sphere/tube modes; set to 0 for polygon mode)
      in vec3 a_center; // sphere center (object space)
      in vec3 a_p0;     // tube endpoint 0 (object space)
      in vec3 a_p1;     // tube endpoint 1 (object space)

      uniform mat4 u_transform;
      uniform mat4 u_modelView;
      uniform mat3 u_normalMatrix;
      uniform float u_lightingEnabled;
      uniform float u_flipNormals;
      uniform float u_pointSize;

      // 0 = polygon mesh, 1 = instanced sphere, 2 = instanced tube
      uniform int u_mode;
      uniform float u_pointRadius;
      uniform float u_tubeRadius;

      out vec4 v_color;
      out float v_distance;
      out vec3 v_viewPos;
      out vec3 v_viewNormal;

      void main() {
        vec4 position = a_position;
        vec3 Nobj = a_normal;

        if (u_mode == 1) {
          // Sphere: a_position is unit sphere vertex, a_center is per-instance center.
          position = vec4(a_center + u_pointRadius * a_position.xyz, 1.0);
          Nobj = normalize(a_position.xyz);
        } else if (u_mode == 2) {
          // Tube: a_position = (cx, cy, t) where (cx,cy) is unit circle, t in [0,1].
          // a_p0/a_p1 are segment endpoints in object space.
          vec3 p0 = a_p0;
          vec3 p1 = a_p1;
          float t = clamp(a_position.z, 0.0, 1.0);
          vec3 axis = normalize(p1 - p0);
          // Pick a stable "up" vector for the frame.
          vec3 up = (abs(axis.z) < 0.999) ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
          vec3 u = normalize(cross(up, axis));
          vec3 v = cross(axis, u);

          vec2 c = a_position.xy;
          vec3 radial = u * c.x + v * c.y;
          vec3 along = mix(p0, p1, t);
          position = vec4(along + u_tubeRadius * radial, 1.0);
          Nobj = normalize(radial);
        } else {
          // Polygon mesh: preserve legacy behavior (w==0 treated as 1).
          if (position.w == 0.0) {
            position.w = 1.0;
          }
        }

        gl_Position = u_transform * position;
        gl_PointSize = u_pointSize;

        v_color = a_color;
        v_distance = a_distance;

        // Phong shading: pass view-space position + normal to fragment shader.
        vec4 pv = u_modelView * vec4(position.xyz, 1.0);
        v_viewPos = pv.xyz;
        v_viewNormal = u_normalMatrix * Nobj;
      }
    `;

  const fragmentSource = `#version 300 es
      precision mediump float;

      in vec4 v_color;
      in float v_distance;
      in vec3 v_viewPos;
      in vec3 v_viewNormal;

      uniform float u_lineHalfWidth;
      uniform float u_ambientCoefficient;
      uniform float u_diffuseCoefficient;
      uniform float u_specularCoefficient;
      uniform float u_specularExponent;
      uniform vec3 u_ambientColor;
      uniform vec3 u_specularColor;
      uniform float u_edgeFade;
      uniform float u_lightingEnabled;
      uniform float u_flipNormals;

      // Point sprite (round/AA points) controls
      uniform float u_pointSprite;
      uniform float u_pointEdgeFade;
      uniform float u_pointSize;

      out vec4 outColor;

      void main() {
        float dist = abs(v_distance);
        float alpha = 1.0;
        if (u_lineHalfWidth > 0.0) {
          float fadeStart = u_lineHalfWidth * (1.0 - u_edgeFade);
          alpha = 1.0 - smoothstep(fadeStart, u_lineHalfWidth, dist);
        }

        // Optional: draw GL_POINTS as anti-aliased circles using gl_PointCoord.
        if (u_pointSprite > 0.5 && u_pointSize > 1.5 && u_lineHalfWidth <= 0.0) {
          vec2 pc = gl_PointCoord - vec2(0.5);
          float r = length(pc);
          float radius = 0.5;
          float aa = max(1.0 / max(u_pointSize, 1.0), 0.001);
          float edge = mix(aa, radius, clamp(u_pointEdgeFade, 0.0, 1.0));
          float mask = 1.0 - smoothstep(radius - edge, radius, r);
          alpha *= mask;
          if (alpha <= 0.0) discard;
        }

        float lit = 1.0;
        float spec = 0.0;
        if (u_lightingEnabled > 0.5) {
          vec3 N = normalize(v_viewNormal);
          if (u_flipNormals > 0.5) {
            N = -N;
          }
          vec3 L = normalize(-v_viewPos);
          lit = max(dot(N, L), 0.0);
          if (lit > 0.0 && u_specularCoefficient > 0.0) {
            vec3 V = normalize(-v_viewPos);
            vec3 R = reflect(-L, N);
            spec = u_specularCoefficient * pow(max(dot(R, V), 0.0), u_specularExponent);
          }
        }

        vec3 ambient = u_ambientCoefficient * u_ambientColor;
        vec3 diffuse = u_diffuseCoefficient * lit * v_color.rgb;
        vec3 specular = spec * u_specularColor;
        outColor = vec4(ambient + diffuse + specular, v_color.a * alpha);
      }
    `;

  return createProgram(gl, { vertexSource, fragmentSource, label: 'WebGL2(unifiedLit)' });
}

/**
 * WebGL2-only: instanced program for point quads.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
 * @returns {WebGLProgram|null}
 */
export function createInstancedPointProgram(gl) {
  if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)) {
    return null;
  }

  const vertexSource = `#version 300 es
      precision mediump float;
      in vec2 a_corner;
      in vec4 a_center;
      in vec4 a_color;

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

  const fragmentSource = `#version 300 es
      precision mediump float;
      in vec4 v_color;
      out vec4 outColor;
      void main() {
        outColor = v_color;
      }`;

  return createProgram(gl, { vertexSource, fragmentSource, label: 'WebGL2(instancedPoints)' });
}

/**
 * WebGL2-only: instanced program for 3D spheres.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
 * @returns {WebGLProgram|null}
 */
export function createInstancedSphereProgram(gl) {
  if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)) {
    return null;
  }

  const vertexSource = `#version 300 es
      precision mediump float;

      in vec3 a_pos;
      in vec3 a_center;
      in vec4 a_color;

      uniform mat4 u_transform;
      uniform float u_radius;

      out vec4 v_color;

      void main() {
        vec3 p = a_center + a_pos * u_radius;
        gl_Position = u_transform * vec4(p, 1.0);
        v_color = a_color;
      }`;

  const fragmentSource = `#version 300 es
      precision mediump float;
      in vec4 v_color;
      out vec4 outColor;
      void main() {
        outColor = v_color;
      }`;

  return createProgram(gl, { vertexSource, fragmentSource, label: 'WebGL2(instancedSpheres)' });
}

/**
 * WebGL2-only: instanced program for tube segments.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
 * @returns {WebGLProgram|null}
 */
export function createInstancedTubeProgram(gl) {
  if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)) {
    return null;
  }

  const vertexSource = `#version 300 es
      precision mediump float;

      in vec3 a_circleT;
      in vec3 a_p0;
      in vec3 a_p1;
      in vec4 a_color;

      uniform mat4 u_transform;
      uniform float u_radius;

      out vec4 v_color;

      void makeBasis(in vec3 dir, out vec3 bx, out vec3 by) {
        vec3 up = (abs(dir.z) < 0.999) ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
        bx = normalize(cross(dir, up));
        by = cross(bx, dir);
      }

      void main() {
        vec3 p0 = a_p0;
        vec3 p1 = a_p1;
        vec3 d = p1 - p0;
        float len = length(d);
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

  const fragmentSource = `#version 300 es
      precision mediump float;
      in vec4 v_color;
      out vec4 outColor;
      void main() {
        outColor = v_color;
      }`;

  return createProgram(gl, { vertexSource, fragmentSource, label: 'WebGL2(instancedTubes)' });
}
