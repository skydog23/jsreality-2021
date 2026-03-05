# Feasibility Report: Refactoring the WebGL2 Backend to Work Exclusively with 4-Vectors

**Date:** 2026-03-05

## Motivation

jsReality's connection to Cayley-Klein geometry and projective space requires full 4D homogeneous coordinate support throughout the rendering pipeline. Both spherical and hyperbolic geometry depend on having full `(x, y, z, w)` support. A recent refactoring made all normal vectors 4D, but vertex positions are not yet consistently 4D — several rendering paths truncate to 3 components or dehomogenize on the CPU before sending data to the GPU. This breaks projective features such as rendering "infinite" lines (great circles on the projective plane) that cross the line at infinity (`w = 0`).

## Current State

The rendering pipeline is split: some paths already support 4D, while others are hardwired to 3D.

### Already 4D-aware

- **Face/polygon rendering** (`_renderFaces`): reads `positionFiber` from the geometry DataList, supports 2/3/4 components, and passes `positionSize` through to `#drawGeometry` and the GPU.
- **Main and unified-lit shaders**: `a_position` is declared `vec4`, with an existing `if (position.w == 0.0) position.w = 1.0` guard.
- **Instanced geometry faces** (u_mode 3, for DiscreteGroup): positions use the full `positionSize` from the geometry fiber.
- **Instanced point-quads** (the legacy sprite path): `a_center` is `vec4`.
- **Vertex coordinate cache**: preserves whatever dimensionality the geometry provides.
- **GL_POINTS fallback**: copies up to 4 components.

### Hardwired to 3D (refactoring targets)

| Component | Where | Issue |
|-----------|-------|-------|
| Sphere centers | `WebGL2Renderer.js` lines ~938-948, `WebGL2InstancedDraw.js` | `Float32Array(n * 3)`, CPU dehomogenization, `vertexAttribPointer(..., 3, ...)` |
| Tube endpoints (p0/p1) | `WebGL2Renderer.js` lines ~619-645, ~748-773, `WebGL2InstancedDraw.js` | `Float32Array(n * 3)`, CPU dehomogenization or truncation |
| Unified-lit shader: `a_center`, `a_p0`, `a_p1` | `WebGL2Programs.js` lines ~329-331 | Declared `in vec3` |
| Legacy sphere shader: `a_pos`, `a_center` | `WebGL2Programs.js` lines ~600-601 | Declared `in vec3` |
| Legacy tube shader: `a_circleT`, `a_p0`, `a_p1` | `WebGL2Programs.js` lines ~639-641 | Declared `in vec3` |
| View-space position for lighting | `WebGL2Programs.js` lines ~195, ~413 | `u_modelView * vec4(position.xyz, 1.0)` — drops w |
| Screen-space quad paths | `WebGL2Renderer.js` lines ~2664-2669, `WebGL2Batching.js` | Manual clip-space divide on CPU, always 3-component output |

## Challenges

### 1. Tube geometry construction in the shader

This is the hardest part. The tube vertex shader currently works like this:

```glsl
// a_p0, a_p1 are vec3 Euclidean endpoints
vec3 axis = normalize(p1 - p0);
vec3 u = normalize(cross(up, axis));
vec3 v = cross(axis, u);
vec3 along = mix(p0, p1, t);
position = vec4(along + tubeRadius * radial, 1.0);
```

With 4D homogeneous endpoints, the geometric operations (cross product, normalize, mix) don't work the same way. You can't just `normalize(p1 - p0)` in homogeneous coordinates. Two approaches:

- **Dehomogenize in the shader**: `vec3 ep0 = a_p0.xyz / a_p0.w;` then proceed as before. Simple, preserves existing tube geometry math, but still loses projective information for segments crossing `w = 0` (the tube would need to be split).
- **True projective tubes**: Construct tube cross-sections in projective space. This is mathematically nontrivial — you'd need a projective frame along the line, and the "radius" concept changes meaning in non-Euclidean metrics.

### 2. Sphere positioning

Simpler than tubes. The sphere vertex shader just translates a unit sphere to the center:

```glsl
position = vec4(a_center + u_pointRadius * a_position.xyz, 1.0);
```

With a `vec4 a_center`, the correct projective version is:

```glsl
vec4 c = a_center;
if (c.w == 0.0) discard; // or skip on CPU
position = vec4(c.xyz + u_pointRadius * a_position.xyz * c.w, c.w);
```

This naturally produces correct results after the perspective divide. The sphere radius scales correctly with w.

### 3. View-space lighting computation

Both the main and unified-lit shaders compute view-space position as:

```glsl
vec4 pv = u_modelView * vec4(position.xyz, 1.0);
```

This discards w. The fix is:

```glsl
vec4 pv = u_modelView * position;
v_viewPos = pv.xyz / pv.w;
```

This is straightforward but must be done carefully to avoid division by zero.

### 4. Screen-space quad edge rendering

The `#drawAllEdgesAsScreenSpaceQuads` path does the full projection on the CPU (`matrixTimesVector` then divide by w). This path would need **clip-space segment splitting**: detect when `w_clip` changes sign between endpoints, compute the parametric intersection at `w = 0`, and emit two separate segments. This is a well-known algorithm (Cohen-Sutherland-style clipping against the `w = 0` plane).

### 5. Batched polyline quads (`addPolylineToBatch`)

Currently always outputs 3-component vertices. Would need to either:

- Accept 4-component inputs and output 4-component quads, or
- Perform the clip-space splitting before batching.

## Feasibility Assessment

The refactoring breaks into three tiers of difficulty:

### Tier 1 — Straightforward (sphere centers, face positions, lighting)

- Change sphere `a_center` from `vec3` to `vec4` in all shaders.
- Update the CPU-side buffer packing to copy 4 components (already partly done for the point-quads path).
- Fix the `u_modelView * vec4(position.xyz, 1.0)` lighting computation.
- **Estimated scope:** ~50 lines of shader changes + ~30 lines of buffer packing.

### Tier 2 — Moderate (tube endpoints)

- Change `a_p0`, `a_p1` from `vec3` to `vec4`.
- Dehomogenize in the shader for tube construction (`ep0 = a_p0.xyz / a_p0.w`).
- Update CPU-side buffer packing to copy 4 components (remove `Pn.dehomogenize` calls).
- Segments crossing `w = 0` would still break at the tube geometry level (the tube mesh can't wrap through infinity), but the positions would be correct for segments that don't cross.
- **Estimated scope:** ~40 lines of shader changes + ~60 lines of buffer packing.

### Tier 3 — Hard (infinity-crossing lines, screen-space quads)

- Implement CPU-side `w = 0` clip-plane splitting for line segments.
- Modify `#drawAllEdgesAsScreenSpaceQuads` and `addPolylineToBatch` to handle 4D input and clip-space splitting.
- This is the piece needed to make "infinite line" rendering work.
- **Estimated scope:** ~150-200 lines of new clipping logic + integration into 3-4 rendering paths.

## Recommended Approach

1. **Tier 1 first**: Get spheres and face positions working fully in 4D. This is mostly mechanical and establishes the pattern.

2. **Tier 2 next**: Get tube endpoints working in 4D with shader-side dehomogenization. This covers the common case (segments that don't cross infinity) and removes all CPU-side `Pn.dehomogenize` calls from the edge paths.

3. **Tier 3 as needed**: Implement the `w = 0` clip-plane splitting for the infinity-crossing line segments. This could be done as a utility function that all edge paths call before packing their buffers, keeping the actual shader changes minimal.

The overall refactoring is quite feasible. The face rendering path already proves the architecture can handle 4D. The main work is propagating that pattern to the instanced sphere/tube paths, which are currently the odd ones out. The hardest part (Tier 3) is a self-contained clipping algorithm that could be developed and tested independently.
