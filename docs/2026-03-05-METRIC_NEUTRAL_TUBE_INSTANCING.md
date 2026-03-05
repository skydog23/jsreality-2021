# Metric-Neutral Tube Instancing via `tubeOneEdge`

**Date:** 2026-03-05

## How `tubeOneEdge` Works

The `tubeOneEdge` method (`TubeUtility.js`, lines 203-303) implements a Cayley-Klein geometry approach to tubes:

### Step 1 — Pre-build an "ur-tube"

A canonical unit tube (octagonal cross-section, z in [-0.5, 0.5]) is constructed once per metric via `QuadMeshFactory` and cached in `_urTube[metric+1]`. The ur-tube geometry itself is identical for all three metrics.

### Step 2 — Compute a per-edge 4×4 projective transformation

From the two 4D endpoints `p1`, `p2`:

1. **Normalize** both points in the given metric (`Pn.normalize`).
2. **Compute a projective frame** at `p1`:
   - **Tangent**: intersect line(p1, p2) with the polar plane of p1.
   - **Normal/binormal**: complete a frame via iterated polar-plane construction.
3. **Build a 4×4 frame matrix** with columns `[binormal | normal | tangent | p1]`.
4. **Compute metric-appropriate scaling**:
   - Half-distance via `Pn.distanceBetween`, with metric-appropriate conversion — `tanh(d/2)` for hyperbolic, `tan(d/2)` for elliptic, `d/2` for Euclidean.
   - Radius adjusted by a curvature factor — `sqrt(1-c²)·tanh(r)` hyperbolic, `sqrt(1+c²)·tan(r)` elliptic.
5. **Compose**: `net = frame × translate × scaler` — a full 4×4 projective matrix.

The result is a `SceneGraphComponent` with the ur-tube as geometry and the computed matrix as its transformation.

### Step 3 — Render via instancing

In JOGL, `DefaultLineShader.java` (lines 421-424) did:

```java
gl.glPushMatrix();
gl.glMultTransposeMatrixd(cc.getTransformation().getMatrix(mat), 0);
gl.glCallList(tubeDL[sig + 1]);  // draw the ur-tube display list
gl.glPopMatrix();
```

The full 4×4 projective matrix was pushed onto the OpenGL matrix stack, and the ur-tube was rendered through the standard pipeline — clipping, perspective divide, and rasterization all handled by the GPU with full projective correctness.

## How This Relates to the Current WebGL2 Tube Shader

The current jsreality tube shader takes a fundamentally different approach:

| | JOGL (`tubeOneEdge` + display list) | WebGL2 (instanced tube shader) |
|---|---|---|
| **Tube geometry** | Pre-built ur-tube mesh, stored as IFS | Procedurally synthesized in vertex shader from unit circle × [0,1] |
| **Per-edge data** | 4×4 projective matrix (16 floats) | Two 3D endpoints `a_p0`, `a_p1` (6 floats) |
| **Metric support** | All three (hyperbolic, Euclidean, elliptic) | Euclidean only |
| **Cross-section** | Octagonal (from ur-tube mesh) | Circular (from tube resolution parameter) |
| **Frame construction** | CPU-side projective geometry (`Pn`, `P3`) | GPU-side Euclidean operations (`cross`, `normalize`) |
| **w coordinate** | Fully preserved through 4×4 matrix multiplication | Lost (endpoints dehomogenized to vec3, w hardcoded to 1.0) |

## Applicability: Could the `tubeOneEdge` Approach Replace the Shader?

**Yes — and the infrastructure already exists.** The `u_mode == 3` instanced geometry path in the unified-lit shader already supports per-instance 4×4 matrices via `a_instRow0..a_instRow3`. This is the same pattern as `tubeOneEdge`:

1. Upload the ur-tube mesh once as a VBO (exactly like the icosphere is uploaded for spheres).
2. Compute per-edge 4×4 matrices on the CPU via `tubeOneEdge`.
3. Upload 16 floats per edge as per-instance data.
4. Draw all edges in one `drawElementsInstanced` call.

The unified-lit shader's mode 3 already does:

```glsl
mat4 instMat = mat4(a_instRow0, a_instRow1, a_instRow2, a_instRow3);
position = instMat * position;
Nobj = instMat * Nobj;
```

This is exactly the `glMultMatrix` + `glCallList` pattern from JOGL, but via instancing.

### Advantages

- **Full Cayley-Klein metric support** for tubes — works in hyperbolic, Euclidean, and elliptic geometry without shader changes.
- **Projectively correct** — the 4×4 matrix handles homogeneous coordinates naturally; the GPU's clip-space pipeline handles the rest.
- **No dehomogenization** — w is preserved end-to-end.
- **Reuses existing code** — `TubeUtility.tubeOneEdge` is already ported and working; mode 3 instancing is already implemented.
- **Consistent with the jReality architecture** — the same approach that worked in JOGL.

### Challenges

- **CPU cost per frame**: Computing `tubeOneEdge` for every edge involves multiple projective operations (polar planes, frame construction, metric normalization). This needs caching — only recompute when geometry or metric changes. In JOGL this was amortized by OpenGL display lists.
- **Bandwidth**: 16 floats per instance vs. the current 6 (two vec3 endpoints). For scenes with many thousands of edges, this is a ~2.7× increase in per-instance data. Still modest for modern GPUs.
- **LOD**: The current shader approach lets you easily vary the tube cross-section resolution (the `tubeResolution` parameter). With an ur-tube mesh, you'd need separate meshes at different resolutions, selected based on LOD. But this is the same as the sphere LOD approach already in use.
- **Per-edge colors**: Would need to be handled as an additional per-instance attribute (as mode 3 already does with `a_instColor`).

## Verdict

The `tubeOneEdge` approach is directly applicable and architecturally superior for non-Euclidean geometry. It could be implemented as a new tube rendering path that activates when the metric is non-Euclidean (or always, to unify the code). The existing mode 3 instancing infrastructure makes the GPU side nearly ready — the main work is on the CPU side: computing and caching the per-edge matrices via `tubeOneEdge`, and managing the ur-tube VBO alongside the existing sphere mesh cache. For the Euclidean-only case, the current procedural shader could be kept as a fast path if desired.
