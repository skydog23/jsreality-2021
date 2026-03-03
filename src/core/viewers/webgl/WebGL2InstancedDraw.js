/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Instanced rendering helpers for discrete-group tessellations.
 *
 * All functions receive an `InstancedDrawContext` object that bundles the GL
 * context, buffers, shader programs, and renderer call-backs needed to issue
 * instanced draw calls.  This avoids coupling to the renderer's private fields
 * while keeping parameter lists manageable.
 *
 * @module WebGL2InstancedDraw
 */

import * as Rn from '../../math/Rn.js';
import * as Pn from '../../math/Pn.js';
import * as CommonAttributes from '../../shader/CommonAttributes.js';
import { GeometryAttribute } from '../../scene/GeometryAttribute.js';

/**
 * @typedef {Object} InstancedDrawContext
 * @property {WebGL2RenderingContext} gl
 * @property {HTMLCanvasElement} canvas
 * @property {{ unified: WebGLProgram|null, fallback: WebGLProgram|null }} programs
 * @property {Object} capabilities
 * @property {Object} buffers       - All GL buffer handles needed by the instanced paths
 * @property {number}  tubeIndexCount
 * @property {{ currentColor: number[], polygonTransparencyAlpha: number, debugGL: Object|null }} state
 *
 * Renderer method bindings (bound to the renderer instance):
 * @property {Function} getBooleanAttribute
 * @property {Function} getAppearanceAttribute
 * @property {Function} beginPrimitiveGroup
 * @property {Function} endPrimitiveGroup
 * @property {Function} updateUniforms
 * @property {Function} extractPoint
 * @property {Function} getCurrentTransformation
 * @property {Function} getViewer
 * @property {Function} cacheGetVertexCoordsArray
 * @property {Function} cacheGetEdgeIndicesArray
 * @property {Function} getOrCreateSphereMesh
 */

// ---------------------------------------------------------------------------
// Scene-graph helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collect geometries with their accumulated local transforms
 * relative to the fundamental region root.
 *
 * @param {import('../../scene/SceneGraphComponent.js').SceneGraphComponent} sgc
 * @param {{ geometry: any, localTransform: number[] }[]} results
 * @param {number[]} parentTransform
 */
export function collectGeometries(sgc, results, parentTransform) {
  let localTransform = parentTransform;
  const t = sgc.getTransformation?.();
  if (t) {
    localTransform = Rn.times(null, parentTransform, t.getMatrix());
  }

  const geom = sgc.getGeometry?.();
  if (geom) {
    results.push({ geometry: geom, localTransform });
  }

  const childCount = sgc.getChildComponentCount?.() ?? 0;
  for (let i = 0; i < childCount; i++) {
    const child = sgc.getChildComponent(i);
    if (child?.isVisible?.()) {
      collectGeometries(child, results, localTransform);
    }
  }
}

/**
 * Render all geometry in a fundamental region subtree using instanced drawing.
 *
 * @param {InstancedDrawContext} ctx
 * @param {import('../../scene/SceneGraphComponent.js').SceneGraphComponent} fundRegion
 * @param {Float32Array} instanceTransforms
 * @param {Float32Array|null} instanceColors
 * @param {number} instanceCount
 */
export function renderInstancedGeometry(ctx, fundRegion, instanceTransforms, instanceColors, instanceCount) {
  const geometries = [];
  collectGeometries(fundRegion, geometries, Rn.identityMatrix(4));

  if (geometries.length === 0) {
    console.warn('[INST] No geometries found in fundamental region', fundRegion.getName?.());
    return;
  }

  for (const { geometry, localTransform } of geometries) {
    if (geometry.getFaceIndices?.()) {
      renderInstancedFaces(ctx, geometry, localTransform, instanceTransforms, instanceColors, instanceCount);
    }
    if (geometry.getEdgeIndices?.()) {
      renderInstancedEdges(ctx, geometry, localTransform, instanceTransforms, instanceColors, instanceCount);
    }
    if (geometry.getVertexCoordinates?.()) {
      renderInstancedPoints(ctx, geometry, localTransform, instanceTransforms, instanceColors, instanceCount);
    }
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** @returns {boolean} */
function isIdentityTransform(m) {
  return m.every((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-10);
}

/**
 * Build per-instance row buffers (transposed) from the flat instanceTransforms array.
 *
 * @returns {{ row0: Float32Array, row1: Float32Array, row2: Float32Array, row3: Float32Array }}
 */
function buildInstanceRows(localTransform, instanceTransforms, instanceCount) {
  const row0 = new Float32Array(instanceCount * 4);
  const row1 = new Float32Array(instanceCount * 4);
  const row2 = new Float32Array(instanceCount * 4);
  const row3 = new Float32Array(instanceCount * 4);

  const isIdent = isIdentityTransform(localTransform);

  for (let inst = 0; inst < instanceCount; inst++) {
    const base = inst * 16;
    let m;
    if (isIdent) {
      m = instanceTransforms.subarray(base, base + 16);
    } else {
      m = Rn.times(null, Array.from(instanceTransforms.subarray(base, base + 16)), localTransform);
    }
    // Transpose: pass columns of the row-major matrix as vec4 rows for GLSL mat4(col0,col1,col2,col3)
    row0[inst * 4]     = m[0];  row0[inst * 4 + 1] = m[4];  row0[inst * 4 + 2] = m[8];  row0[inst * 4 + 3] = m[12];
    row1[inst * 4]     = m[1];  row1[inst * 4 + 1] = m[5];  row1[inst * 4 + 2] = m[9];  row1[inst * 4 + 3] = m[13];
    row2[inst * 4]     = m[2];  row2[inst * 4 + 1] = m[6];  row2[inst * 4 + 2] = m[10]; row2[inst * 4 + 3] = m[14];
    row3[inst * 4]     = m[3];  row3[inst * 4 + 1] = m[7];  row3[inst * 4 + 2] = m[11]; row3[inst * 4 + 3] = m[15];
  }

  return { row0, row1, row2, row3 };
}

/**
 * Compute an instance matrix for a single instance (optionally pre-multiplied by localTransform).
 *
 * @returns {number[]}
 */
function getInstanceMatrix(instanceTransforms, inst, localTransform, isIdent) {
  const instBase = inst * 16;
  if (isIdent) {
    return Array.from(instanceTransforms.subarray(instBase, instBase + 16));
  }
  return Rn.times(null, Array.from(instanceTransforms.subarray(instBase, instBase + 16)), localTransform);
}

// ---------------------------------------------------------------------------
// Instanced faces
// ---------------------------------------------------------------------------

/**
 * Render an IndexedFaceSet with N instanced transforms in a single draw call.
 *
 * @param {InstancedDrawContext} ctx
 * @param {*} geometry
 * @param {number[]} localTransform
 * @param {Float32Array} instanceTransforms
 * @param {Float32Array|null} instanceColors
 * @param {number} instanceCount
 */
export function renderInstancedFaces(ctx, geometry, localTransform, instanceTransforms, instanceColors, instanceCount) {
  const { gl, programs, capabilities, buffers, state } = ctx;
  const program = programs.unified;
  if (!program) return;

  const showFaces = ctx.getBooleanAttribute(CommonAttributes.FACE_DRAW, true);
  if (!showFaces) return;

  const vertsDL = geometry.getVertexCoordinates?.();
  const facesDL = geometry.getFaceIndices?.();
  if (!vertsDL || !facesDL) return;

  const shape = vertsDL.shape;
  const fiber = Array.isArray(shape) && shape.length >= 2 ? shape[shape.length - 1] : 0;
  const positionSize = Math.min(Math.max(fiber || 3, 2), 4);
  const vertsFlat = typeof vertsDL.getFlatData === 'function' ? vertsDL.getFlatData() : null;
  if (!vertsFlat || !fiber) return;

  const faceRows = Array.isArray(facesDL.rows) ? facesDL.rows : (typeof facesDL.toNestedArray === 'function' ? facesDL.toNestedArray() : null);
  if (!faceRows || faceRows.length === 0) return;

  const faceNormalsDL = geometry.getFaceAttribute?.(GeometryAttribute.NORMALS) || null;
  const faceNormalsFlat = faceNormalsDL?.getFlatData?.() ?? null;
  const faceNormalsShape = faceNormalsDL?.shape;
  const faceNormalFiber = Array.isArray(faceNormalsShape) && faceNormalsShape.length >= 2 ? faceNormalsShape[faceNormalsShape.length - 1] : 0;

  const vertexNormalsDL = geometry.getVertexAttribute?.(GeometryAttribute.NORMALS) || null;
  const vertexNormalsFlat = vertexNormalsDL?.getFlatData?.() ?? null;
  const vertexNormalsShape = vertexNormalsDL?.shape;
  const vertexNormalFiber = Array.isArray(vertexNormalsShape) && vertexNormalsShape.length >= 2 ? vertexNormalsShape[vertexNormalsShape.length - 1] : 0;

  const smoothShadingEnabled = Boolean(ctx.getAppearanceAttribute(
    CommonAttributes.POLYGON_SHADER, CommonAttributes.SMOOTH_SHADING, CommonAttributes.SMOOTH_SHADING_DEFAULT
  ));
  const hasFaceNormals = Boolean(faceNormalsFlat && faceNormalFiber >= 3);
  const hasVertexNormals = Boolean(vertexNormalsFlat && vertexNormalFiber >= 3);

  const faceColorsFlat = geometry?.getFaceAttribute?.(GeometryAttribute.COLORS)?.getFlatData?.() ?? null;
  const vertexColorsFlat = geometry?.getVertexAttribute?.(GeometryAttribute.COLORS)?.getFlatData?.() ?? null;
  const hasFaceColors = Boolean(faceColorsFlat);
  const hasVertexColors = Boolean(vertexColorsFlat);

  ctx.beginPrimitiveGroup(CommonAttributes.POLYGON);
  const instTAlpha = state.polygonTransparencyAlpha;

  const WHITE = [1, 1, 1, 1];
  const getFaceColor = (faceIdx) => {
    if (hasFaceColors) {
      const base = faceIdx * 4;
      return [faceColorsFlat[base], faceColorsFlat[base + 1], faceColorsFlat[base + 2], faceColorsFlat[base + 3] * instTAlpha];
    }
    return WHITE;
  };
  const getVertexColor = (vid) => {
    if (hasVertexColors) {
      const base = vid * 4;
      return [vertexColorsFlat[base], vertexColorsFlat[base + 1], vertexColorsFlat[base + 2], vertexColorsFlat[base + 3] * instTAlpha];
    }
    return null;
  };
  const defaultColor = state.currentColor;

  let batchVerts = 0;
  let batchTris = 0;
  for (const row of faceRows) {
    const len = row?.length ?? 0;
    if (len >= 3) { batchVerts += len; batchTris += (len - 2); }
  }
  if (batchVerts === 0) { ctx.endPrimitiveGroup(); return; }

  const vertexArray = new Float32Array(batchVerts * positionSize);
  const colorArray = new Float32Array(batchVerts * 4);
  const normalArray = (hasFaceNormals || hasVertexNormals) ? new Float32Array(batchVerts * 4) : null;
  const supportsUint32 = Boolean(capabilities?.supportsUint32Indices);
  const indexArray = supportsUint32 ? new Uint32Array(batchTris * 3) : new Uint16Array(batchTris * 3);

  let vOut = 0, vFloat = 0, cFloat = 0, nFloat = 0, iOut = 0;
  for (let f = 0; f < faceRows.length; f++) {
    const row = faceRows[f];
    const len = row?.length ?? 0;
    if (len < 3) continue;

    const faceNormalBase = hasFaceNormals ? (f * faceNormalFiber) : -1;
    const fnx = faceNormalBase >= 0 ? Number(faceNormalsFlat[faceNormalBase] ?? 0) : 0;
    const fny = faceNormalBase >= 0 ? Number(faceNormalsFlat[faceNormalBase + 1] ?? 0) : 0;
    const fnz = faceNormalBase >= 0 ? Number(faceNormalsFlat[faceNormalBase + 2] ?? 1) : 1;
    const startVertex = vOut;
    const fc = getFaceColor(f);

    for (let j = 0; j < len; j++) {
      const vid = row[j] | 0;
      const srcBase = vid * fiber;
      for (let k = 0; k < positionSize; k++) {
        vertexArray[vFloat++] = Number(k < fiber ? vertsFlat[srcBase + k] : (k === 3 ? 1.0 : 0.0)) || 0.0;
      }
      const vc = getVertexColor(vid) ?? fc;
      colorArray[cFloat++] = vc[0];
      colorArray[cFloat++] = vc[1];
      colorArray[cFloat++] = vc[2];
      colorArray[cFloat++] = vc[3];

      if (normalArray) {
        if (smoothShadingEnabled && hasVertexNormals) {
          const nb = vid * vertexNormalFiber;
          normalArray[nFloat++] = Number(vertexNormalsFlat[nb] ?? 0);
          normalArray[nFloat++] = Number(vertexNormalsFlat[nb + 1] ?? 0);
          normalArray[nFloat++] = Number(vertexNormalsFlat[nb + 2] ?? 1);
          normalArray[nFloat++] = 0.0;
        } else if (hasFaceNormals) {
          normalArray[nFloat++] = fnx; normalArray[nFloat++] = fny; normalArray[nFloat++] = fnz; normalArray[nFloat++] = 0.0;
        } else {
          normalArray[nFloat++] = 0; normalArray[nFloat++] = 0; normalArray[nFloat++] = 1; normalArray[nFloat++] = 0.0;
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

  const { row0, row1, row2, row3 } = buildInstanceRows(localTransform, instanceTransforms, instanceCount);

  gl.useProgram(program);

  const lightingHint = ctx.getBooleanAttribute(CommonAttributes.LIGHTING_ENABLED, CommonAttributes.LIGHTING_ENABLED_DEFAULT);
  const flipNormals = ctx.getBooleanAttribute(CommonAttributes.FLIP_NORMALS_ENABLED, false);
  ctx.updateUniforms(program, 0, 1.0, Boolean(lightingHint), Boolean(flipNormals));

  const modeLoc = gl.getUniformLocation(program, 'u_mode');
  if (modeLoc !== null) gl.uniform1i(modeLoc, 3);

  const posLoc = gl.getAttribLocation(program, 'a_position');
  const colorLoc = gl.getAttribLocation(program, 'a_color');
  const normalLoc = gl.getAttribLocation(program, 'a_normal');
  const distLoc = gl.getAttribLocation(program, 'a_distance');
  const centerLoc = gl.getAttribLocation(program, 'a_center');
  const p0Loc = gl.getAttribLocation(program, 'a_p0');
  const p1Loc = gl.getAttribLocation(program, 'a_p1');
  const instRow0Loc = gl.getAttribLocation(program, 'a_instRow0');
  const instRow1Loc = gl.getAttribLocation(program, 'a_instRow1');
  const instRow2Loc = gl.getAttribLocation(program, 'a_instRow2');
  const instRow3Loc = gl.getAttribLocation(program, 'a_instRow3');
  const instColorLoc = gl.getAttribLocation(program, 'a_instColor');

  // Per-vertex: position
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
  gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, positionSize, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(posLoc, 0);

  // Per-vertex: color
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.bufferData(gl.ARRAY_BUFFER, colorArray, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(colorLoc);
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(colorLoc, 0);

  // Per-vertex: normals
  if (normalLoc !== -1) {
    if (normalArray) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
      gl.bufferData(gl.ARRAY_BUFFER, normalArray, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(normalLoc);
      gl.vertexAttribPointer(normalLoc, 4, gl.FLOAT, false, 0, 0);
    } else {
      gl.disableVertexAttribArray(normalLoc);
      gl.vertexAttrib4f(normalLoc, 0.0, 0.0, 1.0, 0.0);
    }
    gl.vertexAttribDivisor(normalLoc, 0);
  }

  // Disable unused per-vertex attributes
  if (distLoc !== -1) { gl.disableVertexAttribArray(distLoc); gl.vertexAttrib1f(distLoc, 0.0); gl.vertexAttribDivisor(distLoc, 0); }
  if (centerLoc !== -1) { gl.disableVertexAttribArray(centerLoc); gl.vertexAttrib3f(centerLoc, 0, 0, 0); gl.vertexAttribDivisor(centerLoc, 0); }
  if (p0Loc !== -1) { gl.disableVertexAttribArray(p0Loc); gl.vertexAttrib3f(p0Loc, 0, 0, 0); gl.vertexAttribDivisor(p0Loc, 0); }
  if (p1Loc !== -1) { gl.disableVertexAttribArray(p1Loc); gl.vertexAttrib3f(p1Loc, 0, 0, 0); gl.vertexAttribDivisor(p1Loc, 0); }

  // Per-instance: mat4 rows
  if (instRow0Loc !== -1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instRow0);
    gl.bufferData(gl.ARRAY_BUFFER, row0, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(instRow0Loc);
    gl.vertexAttribPointer(instRow0Loc, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(instRow0Loc, 1);
  }
  if (instRow1Loc !== -1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instRow1);
    gl.bufferData(gl.ARRAY_BUFFER, row1, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(instRow1Loc);
    gl.vertexAttribPointer(instRow1Loc, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(instRow1Loc, 1);
  }
  if (instRow2Loc !== -1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instRow2);
    gl.bufferData(gl.ARRAY_BUFFER, row2, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(instRow2Loc);
    gl.vertexAttribPointer(instRow2Loc, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(instRow2Loc, 1);
  }
  if (instRow3Loc !== -1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instRow3);
    gl.bufferData(gl.ARRAY_BUFFER, row3, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(instRow3Loc);
    gl.vertexAttribPointer(instRow3Loc, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(instRow3Loc, 1);
  }

  // Per-instance: color (a_instColor)
  if (instColorLoc !== -1) {
    if (instanceColors instanceof Float32Array) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instColor);
      gl.bufferData(gl.ARRAY_BUFFER, instanceColors, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(instColorLoc);
      gl.vertexAttribPointer(instColorLoc, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(instColorLoc, 1);
    } else {
      gl.disableVertexAttribArray(instColorLoc);
      const hasGeomColors = hasFaceColors || hasVertexColors;
      const instC = hasGeomColors ? WHITE : defaultColor;
      gl.vertexAttrib4f(instColorLoc, instC[0], instC[1], instC[2], instC[3]);
    }
  }

  // Index buffer + instanced draw
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.DYNAMIC_DRAW);
  const indexType = supportsUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

  gl.drawElementsInstanced(gl.TRIANGLES, iOut, indexType, 0, instanceCount);
  if (state.debugGL) state.debugGL.drawElements++;

  // Reset divisors and disable instancing-specific attribute arrays
  if (instRow0Loc !== -1) { gl.vertexAttribDivisor(instRow0Loc, 0); gl.disableVertexAttribArray(instRow0Loc); }
  if (instRow1Loc !== -1) { gl.vertexAttribDivisor(instRow1Loc, 0); gl.disableVertexAttribArray(instRow1Loc); }
  if (instRow2Loc !== -1) { gl.vertexAttribDivisor(instRow2Loc, 0); gl.disableVertexAttribArray(instRow2Loc); }
  if (instRow3Loc !== -1) { gl.vertexAttribDivisor(instRow3Loc, 0); gl.disableVertexAttribArray(instRow3Loc); }
  if (instColorLoc !== -1) { gl.vertexAttribDivisor(instColorLoc, 0); gl.disableVertexAttribArray(instColorLoc); }

  ctx.endPrimitiveGroup();
  ctx.getViewer()?._incrementFacesRendered?.(faceRows.length * instanceCount);
}

// ---------------------------------------------------------------------------
// Instanced edges
// ---------------------------------------------------------------------------

/**
 * Render edges of a geometry with N instanced transforms.
 *
 * Two rendering strategies are supported, selected by TUBES_DRAW:
 * - Tube mode: instanced 3-D tubes via unified shader (mode 2)
 * - Quad mode: CPU-expanded screen-space quads with anti-aliased edges
 *
 * @param {InstancedDrawContext} ctx
 * @param {*} geometry
 * @param {number[]} localTransform
 * @param {Float32Array} instanceTransforms
 * @param {Float32Array|null} instanceColors
 * @param {number} instanceCount
 */
export function renderInstancedEdges(ctx, geometry, localTransform, instanceTransforms, instanceColors, instanceCount) {
  const showEdges = ctx.getBooleanAttribute(CommonAttributes.EDGE_DRAW, true);
  if (!showEdges) return;

  const vertices = ctx.cacheGetVertexCoordsArray(geometry);
  if (!vertices) return;
  const indices = ctx.cacheGetEdgeIndicesArray(geometry);
  if (!indices || indices.length === 0) return;

  let totalSegs = 0;
  for (const poly of indices) {
    if (poly && poly.length >= 2) totalSegs += (poly.length - 1);
  }
  if (totalSegs === 0) return;

  const { gl, programs, capabilities, buffers, state, canvas } = ctx;
  const isIdent = isIdentityTransform(localTransform);

  const tubeDraw = Boolean(ctx.getAppearanceAttribute(
    CommonAttributes.LINE_SHADER, CommonAttributes.TUBES_DRAW, CommonAttributes.TUBES_DRAW_DEFAULT
  ));

  // ── Tube mode ──
  if (tubeDraw && programs.unified && buffers.tubeVertex && buffers.tubeIndex
      && buffers.tubeP0 && buffers.tubeP1 && buffers.tubeColorInst && ctx.tubeIndexCount > 0) {
    const tubeRadius = ctx.getAppearanceAttribute(
      CommonAttributes.LINE_SHADER, CommonAttributes.TUBE_RADIUS, CommonAttributes.TUBE_RADIUS_DEFAULT
    );
    ctx.beginPrimitiveGroup(CommonAttributes.LINE);
    const defaultEdgeColor = state.currentColor;

    const totalInstSegs = totalSegs * instanceCount;
    const p0s = new Float32Array(totalInstSegs * 3);
    const p1s = new Float32Array(totalInstSegs * 3);
    const cols = new Float32Array(totalInstSegs * 4);

    let s = 0;
    for (let inst = 0; inst < instanceCount; inst++) {
      const instMat = getInstanceMatrix(instanceTransforms, inst, localTransform, isIdent);
      const er = instanceColors?.[inst * 4] ?? defaultEdgeColor[0];
      const eg = instanceColors?.[inst * 4 + 1] ?? defaultEdgeColor[1];
      const eb = instanceColors?.[inst * 4 + 2] ?? defaultEdgeColor[2];
      const ea = instanceColors?.[inst * 4 + 3] ?? defaultEdgeColor[3];

      for (const poly of indices) {
        if (!poly || poly.length < 2) continue;
        for (let j = 0; j < poly.length - 1; j++) {
          const v0 = ctx.extractPoint(vertices[poly[j]]);
          const v1 = ctx.extractPoint(vertices[poly[j + 1]]);
          const tp0 = Rn.matrixTimesVector(null, instMat, [v0[0] ?? 0, v0[1] ?? 0, v0[2] ?? 0, v0[3] ?? 1]);
          const tp1 = Rn.matrixTimesVector(null, instMat, [v1[0] ?? 0, v1[1] ?? 0, v1[2] ?? 0, v1[3] ?? 1]);
          const dp0 = tp0.length === 4 ? Pn.dehomogenize(null, tp0) : tp0;
          const dp1 = tp1.length === 4 ? Pn.dehomogenize(null, tp1) : tp1;
          const o = s * 3;
          const oc = s * 4;
          p0s[o] = Number(dp0[0] ?? 0); p0s[o + 1] = Number(dp0[1] ?? 0); p0s[o + 2] = Number(dp0[2] ?? 0);
          p1s[o] = Number(dp1[0] ?? 0); p1s[o + 1] = Number(dp1[1] ?? 0); p1s[o + 2] = Number(dp1[2] ?? 0);
          cols[oc] = er; cols[oc + 1] = eg; cols[oc + 2] = eb; cols[oc + 3] = ea;
          s++;
        }
      }
    }

    const program = programs.unified;
    gl.useProgram(program);
    const lightingHint = ctx.getBooleanAttribute(CommonAttributes.LIGHTING_ENABLED, CommonAttributes.LIGHTING_ENABLED_DEFAULT);
    const flipNormals = ctx.getBooleanAttribute(CommonAttributes.FLIP_NORMALS_ENABLED, false);
    ctx.updateUniforms(program, 0, 1.0, Boolean(lightingHint), Boolean(flipNormals));

    const modeLoc = gl.getUniformLocation(program, 'u_mode');
    if (modeLoc !== null) gl.uniform1i(modeLoc, 2);
    const tubeRadiusLoc = gl.getUniformLocation(program, 'u_tubeRadius');
    if (tubeRadiusLoc !== null) gl.uniform1f(tubeRadiusLoc, tubeRadius);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    const colorLoc = gl.getAttribLocation(program, 'a_color');
    const p0Loc = gl.getAttribLocation(program, 'a_p0');
    const p1Loc = gl.getAttribLocation(program, 'a_p1');
    const centerLoc = gl.getAttribLocation(program, 'a_center');
    const normalLoc = gl.getAttribLocation(program, 'a_normal');
    const distLoc = gl.getAttribLocation(program, 'a_distance');

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tubeVertex);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(posLoc, 0);

    if (normalLoc !== -1) { gl.disableVertexAttribArray(normalLoc); gl.vertexAttrib4f(normalLoc, 0, 0, 1, 0); gl.vertexAttribDivisor(normalLoc, 0); }
    if (distLoc !== -1) { gl.disableVertexAttribArray(distLoc); gl.vertexAttrib1f(distLoc, 0); gl.vertexAttribDivisor(distLoc, 0); }
    if (centerLoc !== -1) { gl.disableVertexAttribArray(centerLoc); gl.vertexAttrib3f(centerLoc, 0, 0, 0); gl.vertexAttribDivisor(centerLoc, 0); }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tubeP0);
    gl.bufferData(gl.ARRAY_BUFFER, p0s, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(p0Loc);
    gl.vertexAttribPointer(p0Loc, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(p0Loc, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tubeP1);
    gl.bufferData(gl.ARRAY_BUFFER, p1s, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(p1Loc);
    gl.vertexAttribPointer(p1Loc, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(p1Loc, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tubeColorInst);
    gl.bufferData(gl.ARRAY_BUFFER, cols, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(colorLoc, 1);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.tubeIndex);
    gl.drawElementsInstanced(gl.TRIANGLES, ctx.tubeIndexCount, gl.UNSIGNED_SHORT, 0, totalInstSegs);
    if (state.debugGL) state.debugGL.drawElements++;

    if (p0Loc !== -1) { gl.vertexAttribDivisor(p0Loc, 0); gl.disableVertexAttribArray(p0Loc); }
    if (p1Loc !== -1) { gl.vertexAttribDivisor(p1Loc, 0); gl.disableVertexAttribArray(p1Loc); }
    if (colorLoc !== -1) { gl.vertexAttribDivisor(colorLoc, 0); gl.disableVertexAttribArray(colorLoc); }

    ctx.endPrimitiveGroup();
    ctx.getViewer()?._incrementEdgesRendered?.(totalSegs * instanceCount);
    return;
  }

  // ── Quad mode: CPU-expanded screen-space quads with anti-aliased edges ──
  const lineWidth = ctx.getAppearanceAttribute(
    CommonAttributes.LINE_SHADER, CommonAttributes.LINE_WIDTH, CommonAttributes.LINE_WIDTH_DEFAULT
  );
  const program = programs.unified || programs.fallback;
  if (!program) return;

  const wPx = canvas?.width ?? 0;
  const hPx = canvas?.height ?? 0;
  if (!(wPx > 0 && hPx > 0)) return;

  const dpr = ctx.getViewer()?._pixelRatio ?? 1;
  const halfWidthPx = Math.max(0.5, Number(lineWidth) * dpr * 0.5);
  const T = ctx.getCurrentTransformation();
  const invWPx2 = 2.0 / wPx;
  const invHPx2 = 2.0 / hPx;

  ctx.beginPrimitiveGroup(CommonAttributes.LINE);
  const defaultEdgeColor = state.currentColor;

  const totalSegsAll = totalSegs * instanceCount;
  const MAX_VERTS = 60000;
  const batchSegCap = Math.min(totalSegsAll, Math.floor(MAX_VERTS / 4));
  const pos = new Float32Array(batchSegCap * 16);
  const col = new Float32Array(batchSegCap * 16);
  const distArr = new Float32Array(batchSegCap * 4);
  const idx = new Uint16Array(batchSegCap * 6);

  gl.useProgram(program);
  ctx.updateUniforms(program, halfWidthPx, 1.0, false, false);
  const transformLoc = gl.getUniformLocation(program, 'u_transform');
  if (transformLoc !== null) gl.uniformMatrix4fv(transformLoc, true, Rn.identityMatrix(4));
  if (program === programs.unified) {
    const modeLoc = gl.getUniformLocation(program, 'u_mode');
    if (modeLoc !== null) gl.uniform1i(modeLoc, 0);
  }

  const posLoc = gl.getAttribLocation(program, 'a_position');
  const colorLoc = gl.getAttribLocation(program, 'a_color');
  const distLoc = gl.getAttribLocation(program, 'a_distance');
  const normalLoc = gl.getAttribLocation(program, 'a_normal');

  let v = 0, ii = 0;

  const flushBatch = () => {
    if (v === 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
    gl.bufferData(gl.ARRAY_BUFFER, pos.subarray(0, v * 4), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(posLoc, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.bufferData(gl.ARRAY_BUFFER, col.subarray(0, v * 4), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(colorLoc, 0);
    if (distLoc !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.distance);
      gl.bufferData(gl.ARRAY_BUFFER, distArr.subarray(0, v), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(distLoc);
      gl.vertexAttribPointer(distLoc, 1, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(distLoc, 0);
    }
    if (normalLoc !== -1) { gl.disableVertexAttribArray(normalLoc); gl.vertexAttrib4f(normalLoc, 0, 0, 1, 0); gl.vertexAttribDivisor(normalLoc, 0); }
    // Disable instancing attrs not used in quad mode
    const ir0 = gl.getAttribLocation(program, 'a_instRow0');
    if (ir0 !== -1) { gl.disableVertexAttribArray(ir0); gl.vertexAttrib4f(ir0, 1, 0, 0, 0); gl.vertexAttribDivisor(ir0, 0); }
    const ir1 = gl.getAttribLocation(program, 'a_instRow1');
    if (ir1 !== -1) { gl.disableVertexAttribArray(ir1); gl.vertexAttrib4f(ir1, 0, 1, 0, 0); gl.vertexAttribDivisor(ir1, 0); }
    const ir2 = gl.getAttribLocation(program, 'a_instRow2');
    if (ir2 !== -1) { gl.disableVertexAttribArray(ir2); gl.vertexAttrib4f(ir2, 0, 0, 1, 0); gl.vertexAttribDivisor(ir2, 0); }
    const ir3 = gl.getAttribLocation(program, 'a_instRow3');
    if (ir3 !== -1) { gl.disableVertexAttribArray(ir3); gl.vertexAttrib4f(ir3, 0, 0, 0, 1); gl.vertexAttribDivisor(ir3, 0); }
    const icLoc = gl.getAttribLocation(program, 'a_instColor');
    if (icLoc !== -1) { gl.disableVertexAttribArray(icLoc); gl.vertexAttrib4f(icLoc, 1, 1, 1, 1); gl.vertexAttribDivisor(icLoc, 0); }
    const ctrLoc = gl.getAttribLocation(program, 'a_center');
    if (ctrLoc !== -1) { gl.disableVertexAttribArray(ctrLoc); gl.vertexAttrib3f(ctrLoc, 0, 0, 0); gl.vertexAttribDivisor(ctrLoc, 0); }
    const ap0 = gl.getAttribLocation(program, 'a_p0');
    if (ap0 !== -1) { gl.disableVertexAttribArray(ap0); gl.vertexAttrib3f(ap0, 0, 0, 0); gl.vertexAttribDivisor(ap0, 0); }
    const ap1 = gl.getAttribLocation(program, 'a_p1');
    if (ap1 !== -1) { gl.disableVertexAttribArray(ap1); gl.vertexAttrib3f(ap1, 0, 0, 0); gl.vertexAttribDivisor(ap1, 0); }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx.subarray(0, ii), gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, ii, gl.UNSIGNED_SHORT, 0);
    if (state.debugGL) state.debugGL.drawElements++;
    v = 0; ii = 0;
  };

  for (let inst = 0; inst < instanceCount; inst++) {
    const instMat = getInstanceMatrix(instanceTransforms, inst, localTransform, isIdent);
    const fullT = Rn.times(null, T, instMat);
    const er = instanceColors?.[inst * 4] ?? defaultEdgeColor[0];
    const eg = instanceColors?.[inst * 4 + 1] ?? defaultEdgeColor[1];
    const eb = instanceColors?.[inst * 4 + 2] ?? defaultEdgeColor[2];
    const ea = instanceColors?.[inst * 4 + 3] ?? defaultEdgeColor[3];

    for (const poly of indices) {
      if (!poly || poly.length < 2) continue;
      for (let s = 0; s < poly.length - 1; s++) {
        if (v + 4 > MAX_VERTS) flushBatch();
        const p0 = ctx.extractPoint(vertices[poly[s]]);
        const p1 = ctx.extractPoint(vertices[poly[s + 1]]);
        const c0 = Rn.matrixTimesVector(null, fullT, [p0[0] ?? 0, p0[1] ?? 0, p0[2] ?? 0, p0[3] ?? 1]);
        const c1 = Rn.matrixTimesVector(null, fullT, [p1[0] ?? 0, p1[1] ?? 0, p1[2] ?? 0, p1[3] ?? 1]);
        const w0 = c0[3] === 0 ? 1 : c0[3];
        const w1 = c1[3] === 0 ? 1 : c1[3];
        const ndc0x = c0[0]/w0, ndc0y = c0[1]/w0, ndc0z = c0[2]/w0;
        const ndc1x = c1[0]/w1, ndc1y = c1[1]/w1, ndc1z = c1[2]/w1;
        const sx0 = (ndc0x*0.5+0.5)*wPx, sy0 = (ndc0y*0.5+0.5)*hPx;
        const sx1 = (ndc1x*0.5+0.5)*wPx, sy1 = (ndc1y*0.5+0.5)*hPx;
        const dx = sx1-sx0, dy = sy1-sy0;
        const len = Math.sqrt(dx*dx+dy*dy);
        if (len === 0) continue;
        const nx = (-dy/len)*halfWidthPx, ny = (dx/len)*halfWidthPx;

        const base = v * 4;
        pos[base]     = (sx0+nx)*invWPx2-1; pos[base+1]  = (sy0+ny)*invHPx2-1; pos[base+2]  = ndc0z; pos[base+3]  = 1;
        pos[base+4]   = (sx0-nx)*invWPx2-1; pos[base+5]  = (sy0-ny)*invHPx2-1; pos[base+6]  = ndc0z; pos[base+7]  = 1;
        pos[base+8]   = (sx1+nx)*invWPx2-1; pos[base+9]  = (sy1+ny)*invHPx2-1; pos[base+10] = ndc1z; pos[base+11] = 1;
        pos[base+12]  = (sx1-nx)*invWPx2-1; pos[base+13] = (sy1-ny)*invHPx2-1; pos[base+14] = ndc1z; pos[base+15] = 1;
        for (let k = 0; k < 4; k++) { const cb = (v+k)*4; col[cb]=er; col[cb+1]=eg; col[cb+2]=eb; col[cb+3]=ea; }
        distArr[v]=-halfWidthPx; distArr[v+1]=halfWidthPx; distArr[v+2]=-halfWidthPx; distArr[v+3]=halfWidthPx;
        idx[ii++]=v; idx[ii++]=v+1; idx[ii++]=v+2; idx[ii++]=v+1; idx[ii++]=v+3; idx[ii++]=v+2;
        v += 4;
      }
    }
  }
  flushBatch();
  ctx.endPrimitiveGroup();
  ctx.getViewer()?._incrementEdgesRendered?.(totalSegs * instanceCount);
}

// ---------------------------------------------------------------------------
// Instanced points
// ---------------------------------------------------------------------------

/**
 * Render vertices/points of a geometry with N instanced transforms.
 *
 * Two strategies: sphere mode (instanced icospheres) or sprite/GL_POINTS mode.
 *
 * @param {InstancedDrawContext} ctx
 * @param {*} geometry
 * @param {number[]} localTransform
 * @param {Float32Array} instanceTransforms
 * @param {Float32Array|null} instanceColors
 * @param {number} instanceCount
 */
export function renderInstancedPoints(ctx, geometry, localTransform, instanceTransforms, instanceColors, instanceCount) {
  const showPoints = ctx.getBooleanAttribute(CommonAttributes.VERTEX_DRAW, true);
  if (!showPoints) return;

  const vertsDL = geometry?.getVertexCoordinates?.() || null;
  if (!vertsDL) return;

  const shape = vertsDL.shape;
  const fiber = Array.isArray(shape) && shape.length >= 2 ? shape[shape.length - 1] : 0;
  const positionFiber = fiber || 3;
  const vertsFlat = typeof vertsDL.getFlatData === 'function' ? vertsDL.getFlatData() : null;
  if (!vertsFlat) return;

  const numPoints = typeof geometry.getNumPoints === 'function' ? geometry.getNumPoints() : (shape?.[0] ?? 0);
  if (!numPoints) return;

  const { gl, programs, buffers, state } = ctx;
  const isWebGL2 = (typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext;
  const isIdent = isIdentityTransform(localTransform);

  ctx.beginPrimitiveGroup(CommonAttributes.POINT);
  const defaultPointColor = state.currentColor;

  const spheresDraw = Boolean(ctx.getAppearanceAttribute(
    CommonAttributes.POINT_SHADER, CommonAttributes.SPHERES_DRAW, CommonAttributes.SPHERES_DRAW_DEFAULT
  ));

  // ── Sphere mode: instanced icospheres via unified shader (mode 1) ──
  if (spheresDraw && isWebGL2 && programs.unified && buffers.sphereCenter && buffers.sphereColorInst) {
    const pointRadius = ctx.getAppearanceAttribute(
      CommonAttributes.POINT_SHADER, CommonAttributes.POINT_RADIUS, CommonAttributes.POINT_RADIUS_DEFAULT
    );
    const sphereRes = ctx.getAppearanceAttribute(
      CommonAttributes.POINT_SHADER, CommonAttributes.SPHERE_RESOLUTION, 2
    );
    const sphereLevel = Math.max(0, Math.min(4, (sphereRes == null ? 2 : sphereRes) | 0));
    const sphereMesh = ctx.getOrCreateSphereMesh(sphereLevel);

    if (sphereMesh) {
      const totalPts = numPoints * instanceCount;
      const centers = new Float32Array(totalPts * 3);
      const colors = new Float32Array(totalPts * 4);

      const vertexColorsDL = geometry?.getVertexColors?.() || null;
      const vcFlat = vertexColorsDL?.getFlatData?.() ?? null;
      const vcShape = vertexColorsDL?.shape;
      const vcFiber = Array.isArray(vcShape) && vcShape.length >= 2 ? vcShape[vcShape.length - 1] : 0;

      let pIdx = 0;
      for (let inst = 0; inst < instanceCount; inst++) {
        const instMat = getInstanceMatrix(instanceTransforms, inst, localTransform, isIdent);
        const ir = instanceColors?.[inst * 4] ?? defaultPointColor[0];
        const ig = instanceColors?.[inst * 4 + 1] ?? defaultPointColor[1];
        const ib = instanceColors?.[inst * 4 + 2] ?? defaultPointColor[2];
        const ia = instanceColors?.[inst * 4 + 3] ?? defaultPointColor[3];

        for (let p = 0; p < numPoints; p++) {
          const src = p * positionFiber;
          const pt = [
            Number(vertsFlat[src] ?? 0),
            Number(vertsFlat[src + 1] ?? 0),
            Number(vertsFlat[src + 2] ?? 0),
            positionFiber >= 4 ? Number(vertsFlat[src + 3] ?? 1) : 1
          ];
          const tp = Rn.matrixTimesVector(null, instMat, pt);
          const dp = tp[3] !== 0 && tp[3] !== 1 ? Pn.dehomogenize(null, tp) : tp;
          const co = pIdx * 3;
          centers[co] = Number(dp[0] ?? 0);
          centers[co + 1] = Number(dp[1] ?? 0);
          centers[co + 2] = Number(dp[2] ?? 0);

          let vr = 1, vg = 1, vb = 1, va = 1;
          if (vcFlat && vcFiber >= 3) {
            const vcBase = p * vcFiber;
            vr = Number(vcFlat[vcBase] ?? 1);
            vg = Number(vcFlat[vcBase + 1] ?? 1);
            vb = Number(vcFlat[vcBase + 2] ?? 1);
            va = vcFiber >= 4 ? Number(vcFlat[vcBase + 3] ?? 1) : 1;
          }
          const cc = pIdx * 4;
          colors[cc] = vr * ir;
          colors[cc + 1] = vg * ig;
          colors[cc + 2] = vb * ib;
          colors[cc + 3] = va * ia;
          pIdx++;
        }
      }

      const program = programs.unified;
      gl.useProgram(program);
      const lightingHint = ctx.getBooleanAttribute(CommonAttributes.LIGHTING_ENABLED, CommonAttributes.LIGHTING_ENABLED_DEFAULT);
      const flipNormals = ctx.getBooleanAttribute(CommonAttributes.FLIP_NORMALS_ENABLED, false);
      ctx.updateUniforms(program, 0, 1.0, Boolean(lightingHint), Boolean(flipNormals));

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

      gl.bindBuffer(gl.ARRAY_BUFFER, sphereMesh.vbo);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(posLoc, 0);
      if (normLoc !== -1) {
        gl.enableVertexAttribArray(normLoc);
        gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(normLoc, 0);
      }

      if (p0Loc !== -1) { gl.disableVertexAttribArray(p0Loc); gl.vertexAttrib3f(p0Loc, 0, 0, 0); gl.vertexAttribDivisor(p0Loc, 0); }
      if (p1Loc !== -1) { gl.disableVertexAttribArray(p1Loc); gl.vertexAttrib3f(p1Loc, 0, 0, 0); gl.vertexAttribDivisor(p1Loc, 0); }
      if (distLoc !== -1) { gl.disableVertexAttribArray(distLoc); gl.vertexAttrib1f(distLoc, 0); gl.vertexAttribDivisor(distLoc, 0); }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sphereCenter);
      gl.bufferData(gl.ARRAY_BUFFER, centers, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(centerLoc);
      gl.vertexAttribPointer(centerLoc, 3, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(centerLoc, 1);

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sphereColorInst);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(colorLoc, 1);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereMesh.ibo);
      gl.drawElementsInstanced(gl.TRIANGLES, sphereMesh.indexCount, gl.UNSIGNED_SHORT, 0, totalPts);
      if (state.debugGL) state.debugGL.drawElements++;

      if (centerLoc !== -1) { gl.vertexAttribDivisor(centerLoc, 0); gl.disableVertexAttribArray(centerLoc); }
      if (colorLoc !== -1) { gl.vertexAttribDivisor(colorLoc, 0); gl.disableVertexAttribArray(colorLoc); }

      ctx.endPrimitiveGroup();
      ctx.getViewer()?._incrementPointsRendered?.(numPoints * instanceCount);
      return;
    }
  }

  // ── Sprite / GL_POINTS mode ──
  const pointSizePx = ctx.getAppearanceAttribute(
    CommonAttributes.POINT_SHADER, CommonAttributes.POINT_SIZE, CommonAttributes.POINT_SIZE_DEFAULT
  );
  const program = programs.unified || programs.fallback;
  if (!program) { ctx.endPrimitiveGroup(); return; }

  const totalPts = numPoints * instanceCount;
  const posArr = new Float32Array(totalPts * 4);
  const colArr = new Float32Array(totalPts * 4);

  const vertexColorsDL = geometry?.getVertexColors?.() || null;
  const vcFlat = vertexColorsDL?.getFlatData?.() ?? null;
  const vcShape = vertexColorsDL?.shape;
  const vcFiber = Array.isArray(vcShape) && vcShape.length >= 2 ? vcShape[vcShape.length - 1] : 0;

  let pIdx = 0;
  for (let inst = 0; inst < instanceCount; inst++) {
    const instMat = getInstanceMatrix(instanceTransforms, inst, localTransform, isIdent);
    const ir = instanceColors?.[inst * 4] ?? defaultPointColor[0];
    const ig = instanceColors?.[inst * 4 + 1] ?? defaultPointColor[1];
    const ib = instanceColors?.[inst * 4 + 2] ?? defaultPointColor[2];
    const ia = instanceColors?.[inst * 4 + 3] ?? defaultPointColor[3];

    for (let p = 0; p < numPoints; p++) {
      const src = p * positionFiber;
      const pt = [
        Number(vertsFlat[src] ?? 0),
        Number(vertsFlat[src + 1] ?? 0),
        Number(vertsFlat[src + 2] ?? 0),
        positionFiber >= 4 ? Number(vertsFlat[src + 3] ?? 1) : 1
      ];
      const tp = Rn.matrixTimesVector(null, instMat, pt);
      const po = pIdx * 4;
      posArr[po] = tp[0]; posArr[po + 1] = tp[1]; posArr[po + 2] = tp[2]; posArr[po + 3] = tp[3] || 1;

      let vr = 1, vg = 1, vb = 1, va = 1;
      if (vcFlat && vcFiber >= 3) {
        const vcBase = p * vcFiber;
        vr = Number(vcFlat[vcBase] ?? 1);
        vg = Number(vcFlat[vcBase + 1] ?? 1);
        vb = Number(vcFlat[vcBase + 2] ?? 1);
        va = vcFiber >= 4 ? Number(vcFlat[vcBase + 3] ?? 1) : 1;
      }
      const cc = pIdx * 4;
      colArr[cc] = vr * ir; colArr[cc + 1] = vg * ig; colArr[cc + 2] = vb * ib; colArr[cc + 3] = va * ia;
      pIdx++;
    }
  }

  gl.useProgram(program);
  const lightingHint = ctx.getBooleanAttribute(CommonAttributes.LIGHTING_ENABLED, CommonAttributes.LIGHTING_ENABLED_DEFAULT);
  const flipNormals = ctx.getBooleanAttribute(CommonAttributes.FLIP_NORMALS_ENABLED, false);
  ctx.updateUniforms(program, 0, 1.0, Boolean(lightingHint), Boolean(flipNormals));
  if (program === programs.unified) {
    const modeLoc = gl.getUniformLocation(program, 'u_mode');
    if (modeLoc !== null) gl.uniform1i(modeLoc, 0);
  }
  const dprPt = ctx.getViewer()?._pixelRatio ?? 1;
  const pszLoc = gl.getUniformLocation(program, 'u_pointSize');
  if (pszLoc !== null) gl.uniform1f(pszLoc, pointSizePx * 2 * dprPt);

  const posLoc = gl.getAttribLocation(program, 'a_position');
  const colorLoc = gl.getAttribLocation(program, 'a_color');
  const normalLoc = gl.getAttribLocation(program, 'a_normal');
  const distLoc = gl.getAttribLocation(program, 'a_distance');

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
  gl.bufferData(gl.ARRAY_BUFFER, posArr, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 4, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(posLoc, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.bufferData(gl.ARRAY_BUFFER, colArr, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(colorLoc);
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(colorLoc, 0);

  if (normalLoc !== -1) { gl.disableVertexAttribArray(normalLoc); gl.vertexAttrib4f(normalLoc, 0, 0, 1, 0); gl.vertexAttribDivisor(normalLoc, 0); }
  if (distLoc !== -1) { gl.disableVertexAttribArray(distLoc); gl.vertexAttrib1f(distLoc, 0); gl.vertexAttribDivisor(distLoc, 0); }
  const ir0 = gl.getAttribLocation(program, 'a_instRow0');
  if (ir0 !== -1) { gl.disableVertexAttribArray(ir0); gl.vertexAttrib4f(ir0, 1, 0, 0, 0); gl.vertexAttribDivisor(ir0, 0); }
  const ir1 = gl.getAttribLocation(program, 'a_instRow1');
  if (ir1 !== -1) { gl.disableVertexAttribArray(ir1); gl.vertexAttrib4f(ir1, 0, 1, 0, 0); gl.vertexAttribDivisor(ir1, 0); }
  const ir2 = gl.getAttribLocation(program, 'a_instRow2');
  if (ir2 !== -1) { gl.disableVertexAttribArray(ir2); gl.vertexAttrib4f(ir2, 0, 0, 1, 0); gl.vertexAttribDivisor(ir2, 0); }
  const ir3 = gl.getAttribLocation(program, 'a_instRow3');
  if (ir3 !== -1) { gl.disableVertexAttribArray(ir3); gl.vertexAttrib4f(ir3, 0, 0, 0, 1); gl.vertexAttribDivisor(ir3, 0); }
  const icLoc = gl.getAttribLocation(program, 'a_instColor');
  if (icLoc !== -1) { gl.disableVertexAttribArray(icLoc); gl.vertexAttrib4f(icLoc, 1, 1, 1, 1); gl.vertexAttribDivisor(icLoc, 0); }
  const ctrLoc = gl.getAttribLocation(program, 'a_center');
  if (ctrLoc !== -1) { gl.disableVertexAttribArray(ctrLoc); gl.vertexAttrib3f(ctrLoc, 0, 0, 0); gl.vertexAttribDivisor(ctrLoc, 0); }

  gl.drawArrays(gl.POINTS, 0, totalPts);
  if (state.debugGL) state.debugGL.drawArrays++;

  ctx.endPrimitiveGroup();
  ctx.getViewer()?._incrementPointsRendered?.(totalPts);
}
