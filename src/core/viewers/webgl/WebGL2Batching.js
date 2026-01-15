/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * WebGL2 batching + CPU-side geometry expansion helpers.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Convert indexed vertices into a compact Float32Array, preserving full dimension.
 * @param {(v:any)=>number[]} extractPoint
 * @param {*} vertices
 * @param {number[]} indices
 * @returns {{ array: Float32Array, size: number }}
 */
export function verticesToFloat32Array(extractPoint, vertices, indices) {
  if (!indices || indices.length === 0) {
    return { array: new Float32Array(0), size: 3 };
  }

  const firstVertex = extractPoint(vertices[indices[0]]);
  const size = Math.min(Math.max(firstVertex.length || 3, 3), 4);

  const array = new Float32Array(indices.length * size);
  let out = 0;
  for (const index of indices) {
    const vertex = vertices[index];
    const point = extractPoint(vertex);
    for (let i = 0; i < size; i++) {
      const value = (point && i < point.length) ? point[i] : (i === 3 ? 1.0 : 0.0);
      array[out++] = Number(value) || 0.0;
    }
  }

  return { array, size };
}

/**
 * Convert colors to Float32Array.
 * @param {(c:any)=>number[]} toWebGLColor
 * @param {*} colors
 * @param {number[]} indices
 * @param {number[]} defaultColor
 * @returns {Float32Array}
 */
export function colorsToFloat32Array(toWebGLColor, colors, indices, defaultColor) {
  const result = [];

  const isSingleColor = colors && (
    typeof colors === 'string' ||
    (colors.getRed && typeof colors.getRed === 'function') ||
    (Array.isArray(colors) && colors.length <= 4 && typeof colors[0] === 'number')
  );

  if (isSingleColor) {
    const color = toWebGLColor(colors);
    for (let i = 0; i < indices.length; i++) result.push(...color);
  } else if (colors && Array.isArray(colors)) {
    for (const index of indices) {
      let color = defaultColor;
      if (colors[index] !== undefined && colors[index] !== null) {
        color = toWebGLColor(colors[index]);
      }
      result.push(...color);
    }
  } else {
    for (let i = 0; i < indices.length; i++) result.push(...defaultColor);
  }

  return new Float32Array(result);
}

/**
 * Fan triangulation for a polygon defined by a compact sequential vertex array (0..n-1).
 * @param {number} numVertices
 * @returns {Uint16Array}
 */
export function triangulatePolygonSequential(numVertices) {
  const n = Math.max(0, numVertices | 0);
  if (n < 3) return new Uint16Array(0);

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
 * Append thick-line quads (triangles) for an indexed polyline into batch arrays.
 *
 * @param {(v:any)=>number[]} extractPoint
 * @param {*} vertices
 * @param {number[]} indices
 * @param {number[]} edgeColor
 * @param {number} halfWidth
 * @param {{ batchedVertices:number[], batchedColors:number[], batchedDistances:number[], batchedIndices:number[], vertexOffset:number }} batch
 * @returns {{ vertexOffset: number }}
 */
export function addPolylineToBatch(extractPoint, vertices, indices, edgeColor, halfWidth, batch) {
  const { batchedVertices, batchedColors, batchedDistances, batchedIndices } = batch;
  let vertexOffset = batch.vertexOffset | 0;

  for (let i = 0; i < indices.length - 1; i++) {
    const idx0 = indices[i];
    const idx1 = indices[i + 1];

    const v0 = vertices[idx0];
    const v1 = vertices[idx1];
    const p0 = extractPoint(v0);
    const p1 = extractPoint(v1);

    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    const nx = -dy / len;
    const ny = dx / len;

    const z0 = Number(p0[2] ?? 0.0) || 0.0;
    const z1 = Number(p1[2] ?? 0.0) || 0.0;

    const quadVertices = [
      p0[0] + nx * halfWidth, p0[1] + ny * halfWidth, z0,
      p0[0] - nx * halfWidth, p0[1] + ny * halfWidth, z0,
      p1[0] + nx * halfWidth, p1[1] + ny * halfWidth, z1,
      p1[0] - nx * halfWidth, p1[1] + ny * halfWidth, z1
    ];
    batchedVertices.push(...quadVertices);

    batchedColors.push(...edgeColor, ...edgeColor, ...edgeColor, ...edgeColor);

    const quadDistances = [-halfWidth, halfWidth, -halfWidth, halfWidth];
    batchedDistances.push(...quadDistances);

    batchedIndices.push(
      vertexOffset + 0, vertexOffset + 1, vertexOffset + 2,
      vertexOffset + 1, vertexOffset + 3, vertexOffset + 2
    );

    vertexOffset += 4;
  }

  return { vertexOffset };
}
