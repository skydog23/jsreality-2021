# More on Metric-Neutral Line Rendering

## Background: The Projective Line Problem

In elliptic (spherical) geometry, a "line" is a great circle on the 2-sphere (or its
projective image). The jsreality representation uses 2n homogeneous points: n points
`p_i` on the line concatenated with n points `-p_i` (the antipodal copies), forming a
closed loop that covers the projective line twice on the 2-sphere.

In JOGL/OpenGL, this worked perfectly: raw `(x,y,z,w)` coordinates were sent to the GPU
via `glVertex4d`, and the GPU's built-in homogeneous clip pipeline handled everything —
clipping primitives against `cw=0` in clip space, splitting segments at the boundary,
perspective-dividing, and rasterizing. The `w=0` crossing was the GPU's problem, and it
solved it correctly.

## The Core Issue in jsreality-2021

Every rendering path in `WebGL2Renderer.js` currently **dehomogenizes on the CPU**
(divides by `w`) before sending data to the GPU. This makes `w=0` an uncrossable
singularity. But in non-Euclidean geometry, `w=0` is just an ordinary plane — not
"infinity" at all. When the scene is rotated, any part of a great circle can pass through
`w=0`, and the crossing segments are fully visible, ordinary pieces of the line. Skipping
or rejecting these crossing segments creates visible gaps in the rendered line.

The "big segment" workaround (a single very large Euclidean segment representing the line)
fixes things in Euclidean geometry, but breaks down in elliptic space where rotations bring
`w=0` into the viewport, producing the same gaps.

## Strategy by Rendering Path

### GL_LINES Path (Non-Tubing, Simplest Fix)

The `#drawPolylineAsLineStrip` path is the most straightforward to fix. Right now it sends
`vec3` positions with `w` hardcoded to `1.0`. The fix:

1. Pack the raw 4D coordinates into the vertex buffer (4 floats per vertex instead of 3)
2. Change the vertex attribute from `vec3 a_position` to `vec4 a_position`
3. Use `gl_Position = u_projection * u_modelView * a_position` (no `vec4(..., 1.0)` wrapper)

The GPU would then natively handle the `w=0` crossing. A line segment from a `w>0` vertex
to a `w<0` vertex would be clipped by the GPU at the frustum boundary, producing two
visible half-segments on each side of the viewport. This is exactly what JOGL was doing.
**Minimal code changes, correct projective behavior.**

### Screen-Space Quads Path (Non-Tubing, Harder)

The `#drawAllEdgesAsScreenSpaceQuads` path projects vertices on the **CPU** and builds
screen-pixel quads. CPU-side clipping is possible here but messy:

- For a crossing segment, find the `w=0` parameter `t`, then split into two sub-segments.
- Each sub-segment has one endpoint near `w≈0`, which dehomogenizes to a very distant
  Euclidean point.
- Draw a quad from the near endpoint toward that distant point; the GPU clips the huge
  quad to the viewport.

This works in principle, but it's ugly — you're generating enormous triangles that are
99.9% off-screen. The cleaner option is to **fall back to the GL_LINES path** for geometry
that has `w≠1` coordinates, or to move the projection into the GPU (which is where it
belongs anyway).

### Tube Rendering (The Hard Case)

CPU clipping at `w=0` **does not work well for tubes**. The tube shader constructs a 3D
cylinder mesh between two Euclidean endpoints on the GPU. If one endpoint is at
`(x/ε, y/ε, z/ε)` for tiny `ε`, you get a tube millions of units long with severe
numerical distortion. Even with clipping and splitting, the tube geometry is wrong near
`w=0`.

The right answer for tubes is the **`tubeOneEdge` / instanced-matrix approach** (see
`2026-03-05-METRIC_NEUTRAL_TUBE_INSTANCING.md`). Summary:

- Upload the ur-tube mesh once as a VBO.
- Compute a per-edge 4×4 projective transformation on the CPU (using `tubeOneEdge`).
- Pass it as a per-instance matrix attribute.
- The vertex shader computes:

```glsl
gl_Position = u_projection * u_modelView * a_instMatrix * a_position;
```

The GPU clips the resulting tube triangles against the homogeneous clip planes — including
the `cw=0` boundary. A tube segment crossing `w=0` gets its triangles split at the clip
boundary automatically, exactly like JOGL did with `glMultTransposeMatrixd` +
`glCallList`. No CPU clipping needed, no degenerate geometry, full projective correctness.

The unified-lit shader's `u_mode == 3` path already supports per-instance 4×4 matrices
(via `a_instRow0..3` attributes), so the infrastructure is partially in place.

## Summary Table

| Path | CPU w=0 clip? | Better approach |
|------|--------------|-----------------|
| GL_LINES | Unnecessary | Send raw 4D; GPU clips natively |
| Screen-space quads | Possible but messy | Move projection to GPU, or fall back to GL_LINES |
| Tubes (shader) | Doesn't really work | `tubeOneEdge` instanced-matrix approach |

## Conclusion

The common theme: **stop dehomogenizing on the CPU; let the GPU do its job with real 4D
coordinates**. The GL_LINES fix is small and could be done immediately. The tube fix
requires the `tubeOneEdge` instancing, which is a bigger but well-understood refactoring.
Both approaches eliminate the `w=0` singularity by leveraging the GPU's native homogeneous
clipping pipeline.
