/**
 * WebGL2 mesh/geometry builders for instanced rendering (spheres/tubes).
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Build an icosphere (tessellated icosahedron).
 * Returns unit-radius positions and triangle indices.
 *
 * @param {number} level
 * @returns {{ positions: Float32Array, indices: Uint16Array } | null}
 */
export function buildIcoSphere(level) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1,  t,  0], [ 1,  t,  0], [-1, -t,  0], [ 1, -t,  0],
    [ 0, -1,  t], [ 0,  1,  t], [ 0, -1, -t], [ 0,  1, -t],
    [ t,  0, -1], [ t,  0,  1], [-t,  0, -1], [-t,  0,  1]
  ];
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

  const midpointCache = new Map();
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

  if (verts.length > 65535) return null;

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
 * Create (or fetch) an icosphere mesh uploaded to GPU buffers.
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
 * @param {Map<number, { vbo: WebGLBuffer, ibo: WebGLBuffer, indexCount: number }>} cache
 * @param {number} level
 * @returns {{ vbo: WebGLBuffer, ibo: WebGLBuffer, indexCount: number } | null}
 */
export function getOrCreateSphereMesh(gl, cache, level) {
  const isWebGL2 = (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext;
  if (!isWebGL2) return null;

  const lvl = Math.max(0, Math.min(4, level | 0));
  const cached = cache.get(lvl);
  if (cached) return cached;

  const mesh = buildIcoSphere(lvl);
  if (!mesh) return null;

  const vbo = gl.createBuffer();
  const ibo = gl.createBuffer();
  if (!vbo || !ibo) return null;

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

  const entry = { vbo, ibo, indexCount: mesh.indices.length };
  cache.set(lvl, entry);
  return entry;
}

/**
 * Build the base tube mesh used for instanced tube segments.
 * @param {number} seg
 * @returns {{ vertices: Float32Array, indices: Uint16Array }}
 */
export function buildTubeBaseMesh(seg = 12) {
  const SEG = Math.max(3, seg | 0);
  const vertices = new Float32Array(SEG * 2 * 3);
  let o = 0;
  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    vertices[o++] = cx; vertices[o++] = cy; vertices[o++] = 0.0;
    vertices[o++] = cx; vertices[o++] = cy; vertices[o++] = 1.0;
  }
  const indices = new Uint16Array(SEG * 6);
  let io = 0;
  for (let i = 0; i < SEG; i++) {
    const i0 = 2 * i;
    const i1 = i0 + 1;
    const j0 = 2 * ((i + 1) % SEG);
    const j1 = j0 + 1;
    indices[io++] = i0; indices[io++] = i1; indices[io++] = j0;
    indices[io++] = i1; indices[io++] = j1; indices[io++] = j0;
  }
  return { vertices, indices };
}
