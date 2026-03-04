# TODO: Complete 4D Normal Support for Cayley-Klein Geometries

**Date**: 2026-03-03  
**Status**: Phase 1 complete, Phases 2–3 pending

## Background

Cayley-Klein geometries (Euclidean, hyperbolic, elliptic, etc.) can be handled
uniformly in projective space by choosing a quadric (the "absolute") that defines
the metric.  Normals in this framework are projective 4-vectors: Euclidean normals
have w=0 (they are "points at infinity"), while non-Euclidean normals have w≠0.

The jReality Java codebase already has reference shaders for this:
- `src-jogl/de/jreality/jogl/shader/resources/noneuclidean.vert`
- `src-jogl/de/jreality/jogl/shader/resources/euclidean.vert`

## Phase 1 — Mechanical 3→4 plumbing (DONE)

All normal data paths have been widened from 3-component to 4-component:

- [x] GLSL `a_normal` attribute: `vec3` → `vec4`
- [x] GLSL `u_normalMatrix` uniform: `mat3` → `mat4`
- [x] GLSL `v_viewNormal` varying: `vec3` → `vec4`
- [x] Unified vertex shader: `Nobj` is now `vec4`; procedural normals (sphere,
      tube) emit `vec4(..., 0.0)`; instanced geometry transform uses full
      `mat4 * Nobj` instead of `mat3(instMat) * Nobj`
- [x] Fragment shaders use `normalize(v_viewNormal.xyz)` (Euclidean for now)
- [x] CPU normal matrix: full 4×4 inverse-transpose of modelView
- [x] CPU normal arrays: 4 floats/vertex with w=0
- [x] `vertexAttribPointer` size 4 for normal attribute
- [x] Default normal attributes: `vertexAttrib4f(..., 0.0)`
- [x] Same changes in `WebGL2InstancedDraw.js`

**Intentionally unchanged**: sphere VBO normal binding stays at size 3 (the shader
overrides `Nobj` procedurally in mode 1/2, so the attribute value is unused).

Rendering output is visually identical to the 3-vector version.

---

## Phase 2 — Metric-aware lighting in the shader

### 2a. Add metric uniform

- [ ] Add `uniform float u_metric` to the unified vertex and fragment shaders.
      Convention: `+1.0` = elliptic, `0.0` = Euclidean, `−1.0` = hyperbolic.
- [ ] Upload the metric value in `#updateUniforms` from an appearance attribute
      (e.g. `CommonAttributes.METRIC` or from `Pn.getMetric()`).
- [ ] Default to `0.0` (Euclidean) when no metric is specified.

### 2b. Metric inner product and normalize

- [ ] Add GLSL helper functions in the unified shader (following noneuclidean.vert):
  ```glsl
  float dot4(vec4 P, vec4 Q) {
      return dot(P.xyz, Q.xyz) + u_metric * P.w * Q.w;
  }
  float length4(vec4 P) {
      return sqrt(abs(dot4(P, P)));
  }
  void normalize4(inout vec4 P) {
      P = (1.0 / length4(P)) * P;
  }
  ```
- [ ] Consider adding these as a shared GLSL include string in `WebGL2Programs.js`
      so both the main and unified shaders can reuse them.

### 2c. Normal transform in the vertex shader

- [ ] Replace `v_viewNormal = u_normalMatrix * Nobj` with metric-aware
      normalization:
  ```glsl
  v_viewNormal = u_normalMatrix * Nobj;
  normalize4(v_viewNormal);
  ```
- [ ] For the instanced geometry path (mode 3), normals are already transformed
      by the full instance matrix.  Add `normalize4()` after the transform.
- [ ] Project the transformed normal into the tangent space of the transformed
      point (as in noneuclidean.vert `projectToTangent`):
  ```glsl
  void projectToTangent(vec4 P, inout vec4 T) {
      T = dot4(P, P) * T - dot4(P, T) * P;
  }
  ```

### 2d. Fragment shader lighting with metric inner product

- [ ] Replace Euclidean `dot(N, L)` with `dot4(N4, L4)` where `N4` is the full
      4-vector view normal and `L4` is the 4-vector light direction.
- [ ] Replace `normalize()` with `normalize4()` for normal and light vectors.
- [ ] Replace `reflect(-L, N)` with a metric-aware reflection or half-vector
      computation.
- [ ] View-space position (`v_viewPos`) should become `vec4` to carry the
      homogeneous coordinate for non-Euclidean distance and lighting.

### 2e. Fog distance

- [ ] Replace Euclidean `length(v_viewPos)` with the Cayley-Klein distance
      function `nedistance(eye, position)` using `acosh`/`acos` as in the
      reference shader.

---

## Phase 3 — Non-Euclidean geometry on the CPU side

### 3a. Normals as 4-vectors in the scene graph

- [ ] Ensure `IndexedFaceSet.getFaceAttribute(NORMALS)` and
      `getVertexAttribute(NORMALS)` can store and return 4-component normal data.
- [ ] Update `GeometryUtility` normal-computation routines to produce
      metric-aware normals (polar of the tangent plane w.r.t. the absolute).
- [ ] For Euclidean geometry, continue producing `(nx, ny, nz, 0)`.

### 3b. Procedural sphere/tube geometry

- [ ] The icosphere mesh currently generates Euclidean spheres.  In non-Euclidean
      space, equidistant surfaces from a point are not spheres in the Euclidean
      sense.  Options:
  - Keep Euclidean icospheres (visually acceptable for small radii).
  - Generate metric-correct equidistant surfaces on the CPU.
  - Raytrace spheres in the fragment shader (highest quality, most work).
- [ ] Similarly for tubes: the cross-section frame construction uses Euclidean
      `cross()` and `normalize()`.  Non-Euclidean tubes require a different
      approach (e.g. parallel transport along geodesics).

### 3c. Projective model support

- [ ] Poincaré disk model (hyperbolic): the vertex shader needs to apply the
      conformal projection as in noneuclidean.vert lines 215–220.
- [ ] Azimuthal projection (elliptic): lines 221–229 of noneuclidean.vert.
- [ ] These projections could be controlled by appearance attributes and applied
      as a post-transform in the vertex shader.

### 3d. Light positions

- [ ] Lights should be specified as 4-vectors in projective space.
- [ ] Light attenuation should use `nedistance` rather than Euclidean distance.
- [ ] The number-of-lights loop and light uniform structure may need updating
      (currently jsreality uses a single camera-space headlight).

---

## Notes

- Phase 2 can be implemented incrementally: add `u_metric` first, default to 0,
  and verify no regressions.  Then enable `dot4`/`normalize4` gated by
  `u_metric != 0.0` to avoid any performance impact on the Euclidean path.
- Phase 3 items are largely independent and can be tackled in any order.
- The 2D Canvas and SVG renderers are not affected by these changes.
- Reference: jReality `noneuclidean.vert` (237 lines) contains a complete working
  implementation of Phases 2–3 for the JOGL backend.
