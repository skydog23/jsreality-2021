# Ganja.js: Refactoring and jsReality Integration Report

## 1. Overview of Ganja.js

Ganja.js (by Enki/Steven De Keninck) is a Geometric Algebra library that generates
Clifford algebras of arbitrary signature and provides:

1. **Algebra generator** — the `Algebra(p, q, r)` factory function that creates a
   `MultiVector` class for any signature, including custom Cayley tables.
2. **Multivector arithmetic** — generated at algebra-creation time using `new Function()`
   to produce unrolled, zero-skipping product code (geometric, outer, inner, regressive
   products, plus inverses, exponentials, logarithms, bivector splits, etc.).
3. **Operator-overloading preprocessor** (`inline`) — a JS-to-JS source translator that
   tokenizes input, rewrites algebraic literals (e.g. `3e12` → `Element.Coeff(...)`) and
   replaces symbolic operators (`*` → `Mul`, `^` → `Wedge`, `&` → `Vee`, `~` →
   `Conjugate`, etc.) with static method calls.
4. **Rendering / scene graph** (`graph`, `graphGL`, `graphGL2`) — three rendering backends
   (SVG for 2D PGA/CGA, WebGL for 3D PGA/CGA parametric, WebGL2 for implicit
   OPNS/IPNS surfaces) with built-in camera, mouse interaction, animation, grid,
   text/label rendering, and conformal model support.

The entire library is a single 1915-line file inside a UMD wrapper (lines 38–1914), with
no imports and no external dependencies.

## 2. Structural Anatomy

| Section | Lines | Description |
|---------|-------|-------------|
| UMD wrapper + helpers | 1–91 | QR decomposition, eigenvalue solver |
| Algebra generator preamble | 92–159 | Signature parsing, basis generation, simplification |
| Flat generator (≤6D) | 160–258 | `MultiVector extends Float32Array`, product table → `new Function()` code generation |
| Graded generator (>6D) | 260–434 | `MultiVector extends Array`, runtime bit-fiddling products, GLSL generation |
| Element class | 437–830 | Static operators (`Add`, `Mul`, `Wedge`, `Div`, etc.), factories, comparison, `describe` |
| `graph` (SVG) | 789–999 | 2D PGA/CGA SVG rendering with mouse/touch interaction |
| `graph` (Canvas) | 1001–1029 | 1D/2D function plotting on `<canvas>` |
| `graphGL2` | 1032–1181 | Implicit surface sphere-tracing (OPNS/IPNS) via WebGL2 |
| `graphGL` | 1184–1757 | Parametric 3D PGA/CGA rendering, WebGL1, full scene pipeline |
| `inline` preprocessor | 1759–1829 | Tokenizer, algebraic literal rewriting, operator overloading |
| Inverse, derivative, finalization | 1832–1914 | Matrix-free inverses, experimental differential operator, arrow helper |

## 3. Feasibility of Refactoring into Structured Modules

### 3.1 What Would Change

The natural decomposition would be:

```
ganja/
  AlgebraFactory.js      — signature parsing, basis generation, Cayley tables
  MultiVectorFlat.js     — flat (≤6D) generator + product code generation
  MultiVectorGraded.js   — graded (>6D) generator
  Element.js             — static operators, factories, inverse, exp/log, split
  InlineTranslator.js    — tokenizer + operator-overloading preprocessor
  renderers/
    SVGRenderer.js       — 2D PGA/CGA SVG graph
    CanvasRenderer.js    — 1D/2D function plotter
    WebGLRenderer.js     — parametric 3D PGA/CGA (graphGL)
    WebGL2Renderer.js    — implicit surface sphere-tracer (graphGL2)
  util/
    QR.js                — QR decomposition + eigenvalue solver
    Differential.js      — experimental differential operator
```

### 3.2 Challenges

**Closure-captured state.** The entire library lives inside a single closure. Over a dozen
variables (`basis`, `grades`, `grade_start`, `metric`, `mulTable`, `gp`, `op`, `cp`, `drm`,
`drms`, `simplify`, `simplify_bits`, `tot`, `p`, `q`, `r`, `low`, `options`) are closure-
captured and referenced throughout. Extracting any module requires explicitly passing or
storing this state. The `Element` class references `basis`, `grades`, `drm`, `drms`, `tot`,
`p`, `q`, `r`, `options`, and `metric` from the enclosing scope in dozens of places.

**Code generation via `new Function()`.** The flat generator (lines 243–252) constructs
`Add`, `Sub`, `Mul`, `Wedge`, `LDot`, `Dot`, `Vee` as dynamically generated functions
from the Cayley table. These are string-manipulated, `eval`'d, and attached to the
prototype. This is central to ganja's performance and would need to be preserved in any
refactoring — you can't replace it with generic loops without significant performance
regression.

**The preprocessor is self-referential.** `inline` (line 1761) references `Element`,
`basis`, `simplify`, `options`, and `res` from the closure. It also re-invokes itself
recursively for template strings (line 1785). Extracting it requires injecting the algebra
context.

**Rendering is tightly coupled to the algebra.** The `graph`, `graphGL`, and `graphGL2`
methods are static methods on `Element` and directly use `Element.Coeff`, `Element.Mul`,
`Element.sw`, `Element.Vector`, `Element.Trivector`, etc. They also reference `tot`, `p`,
`q`, `r`, `drm`, `drms`, `grades`, `basis`, `options.conformal`, `ni`, `no` from the
closure. The WebGL renderers inline GLSL code generated from the algebra's product tables
(`OPNS_GLSL`, `IPNS_GLSL`).

**Dense, compressed coding style.** The code is intentionally compact — single-letter
variables, chained expressions, minimal whitespace. Reformatting is straightforward but
tedious, and risks introducing bugs without comprehensive tests. There is no test suite
included in the file.

### 3.3 Feasibility Assessment

**Algebra core (AlgebraFactory + MultiVector + Element + Inline):** Moderate difficulty.
The closure state can be encapsulated in a context object passed to each module. The `new
Function()` code generation can remain as-is, just relocated. The biggest risk is subtle
breakage from variable scoping changes. Estimate: 2–3 days of careful work, plus test
authoring.

**Renderers:** These are the easiest to extract since they're already somewhat self-
contained static methods. They just need the algebra context injected. Estimate: 1–2 days.

**Overall:** Feasible but requires a disciplined, test-driven approach. The lack of an
existing test suite is the biggest obstacle — you'd need to write tests (or at least
regression checks) before refactoring.

## 4. Feasibility of Replacing Ganja's Rendering with jsReality

### 4.1 What Ganja's Rendering Does

Ganja's three rendering backends share a common pattern:

1. Accept an array of GA elements (points, lines, planes, circles, spheres, motors,
   colors, labels) or a function returning such an array.
2. Interpret each element geometrically based on its grade structure and the algebra
   signature (PGA: dehomogenize trivectors to points, grade-2 to lines, grade-1 to planes;
   CGA: classify via `ni`/`no` inner/outer products into points, lines, circles, planes,
   spheres, point pairs).
3. Render using the appropriate backend (SVG elements, WebGL draw calls, sphere-traced
   fragments).
4. Handle animation (`requestAnimationFrame` loop), mouse/touch interaction (dragging
   points, rotating camera), and labels.

### 4.2 Mapping to jsReality Concepts

| Ganja concept | jsReality equivalent |
|---------------|---------------------|
| Point (trivector in PGA, round in CGA) | `SceneGraphNode` with point geometry |
| Line (bivector in PGA, flat in CGA) | `IndexedLineSetFactory` or `LinePencilFactory` |
| Plane (vector in PGA) | `IndexedFaceSetFactory` polygon |
| Circle (round bivector in CGA) | Polyline approximation via `PointRangeFactory` |
| Sphere (round vector in CGA) | `SphereFactory` or tessellated sphere |
| Color (number) | `Appearance` with `diffuseColor` |
| Label (string) | Not yet supported in jsReality WebGL2 (would need text rendering) |
| Camera (rotor) | `Camera` node with transformation |
| Animation | jsReality's animation framework |
| Mouse interaction | jsReality's tool system |

### 4.3 Advantages of Using jsReality

- **Full projective geometry support.** jsReality already handles 4D homogeneous
  coordinates, Cayley-Klein metrics, and is being refactored toward full 4-vector support.
  Ganja's renderers dehomogenize to Euclidean 3D before rendering — the same limitation
  jsReality is working to overcome.

- **Scene graph hierarchy.** jsReality provides a proper scene graph with transformations,
  appearances, and geometry nodes. Ganja uses a flat array of elements.

- **Lighting and shading.** jsReality has a full lighting model (ambient, diffuse,
  specular), multiple light sources, and material properties. Ganja uses basic Lambert
  shading hardcoded in shader strings.

- **Tube and edge rendering.** jsReality has instanced tube rendering, screen-space quads,
  and is working toward metric-neutral tube instancing — far more sophisticated than
  ganja's simple line-to-triangle conversion.

- **Geometry factories.** jsReality has `IndexedFaceSetFactory`, `IndexedLineSetFactory`,
  `SphereFactory`, `TubeUtility`, etc. These handle vertex/face/edge attribute management
  that ganja does ad-hoc.

### 4.4 Challenges

**Element interpretation layer.** Ganja's renderers contain significant geometric algebra
interpretation logic: classifying elements by grade, extracting Euclidean positions from
PGA trivectors or CGA rounds/flats, computing circle tangent/bitangent frames, etc. This
logic would need to be preserved as a "GA element → jsReality geometry" translation layer.
This is the most substantial piece of work.

**Implicit surface rendering (graphGL2).** Ganja's `graphGL2` generates GLSL sphere-
tracing code directly from the algebra's product tables (`OPNS_GLSL`, `IPNS_GLSL`). This
is a unique capability with no jsReality equivalent. It would need to be kept as a
standalone renderer or ported as a custom jsReality shader.

**Conformal model support.** Ganja handles CGA (5D conformal) elements natively —
extracting circles, spheres, point pairs, etc. jsReality currently focuses on PGA. A CGA
interpretation layer would need to be added.

**Interactive dragging.** Ganja's mouse handlers project screen coordinates back to GA
elements (using the sandwich product and camera rotor) for direct manipulation of points.
jsReality's tool system handles interaction differently (via picking and tools). The
"drag a point and see the construction update" workflow would need a jsReality tool.

**Labels and text.** Ganja renders text labels using a bitmap font atlas in WebGL and
SVG `<text>` in 2D. jsReality's WebGL2 backend does not currently support text rendering.

**Animation loop.** Ganja uses `requestAnimationFrame` with a function that returns an
array of elements. jsReality has its own animation framework. The mapping is
straightforward but the APIs differ.

### 4.5 Feasibility Assessment

**Replacing `graphGL` (3D PGA/CGA parametric):** High feasibility. This is the closest
match to jsReality's capabilities. The GA element interpretation logic is well-defined and
could be wrapped in a `GanjaToJsReality` adapter that converts each element to a scene
graph node. The main work is the CGA interpretation and interactive dragging.

**Replacing `graph` (2D SVG):** Moderate feasibility. jsReality's WebGL2 backend is 3D-
oriented. For 2D PGA work, SVG is arguably better suited. It might be preferable to keep
the SVG renderer as a lightweight alternative rather than forcing everything through WebGL.

**Replacing `graphGL2` (implicit surfaces):** Low feasibility without significant new
work. The sphere-tracing renderer is unique to ganja and generates algebra-specific GLSL.
It would need to remain as a standalone capability.

### 4.6 Recommended Approach

A practical integration strategy would be:

1. **Keep ganja's algebra core intact** (or refactored into modules per Section 3). The
   algebra generation, products, `inline` preprocessor, exp/log, and bivector split are
   excellent and need not be replaced.

2. **Create a `GanjaSceneAdapter`** class that takes a ganja element array and constructs
   a jsReality scene graph:
   - Interpret each element by grade/type (reusing ganja's existing classification logic)
   - Create corresponding jsReality geometry nodes (points, lines, planes, circles, etc.)
   - Apply colors and labels from the array's color/string interleaving convention

3. **Keep ganja's SVG renderer** for 2D work where it excels.

4. **Keep ganja's `graphGL2`** for implicit surface visualization.

5. **Replace `graphGL`** with jsReality's WebGL2 backend for 3D rendering, gaining:
   - Proper lighting and materials
   - Scene graph hierarchy
   - Tube rendering
   - Future 4-vector/Cayley-Klein support

6. **Add a jsReality interaction tool** for ganja-style point dragging (project screen
   coordinates back to GA elements via the sandwich product).

## 5. Summary

| Task | Difficulty | Effort | Value |
|------|-----------|--------|-------|
| Refactor algebra core into modules | Moderate | 2–3 days | Readability, maintainability |
| Extract renderers into modules | Easy | 1–2 days | Separation of concerns |
| Write test suite (prerequisite) | Moderate | 2–3 days | Safety net for refactoring |
| `GanjaSceneAdapter` (element → jsReality) | Moderate–Hard | 3–5 days | Unifies rendering |
| Replace `graphGL` with jsReality | Moderate | 2–3 days | Better 3D rendering |
| CGA interpretation layer | Moderate | 2–3 days | Extends jsReality |
| Interactive point dragging tool | Easy–Moderate | 1–2 days | User experience |
| Keep SVG + graphGL2 as-is | None | 0 | Pragmatic |

The algebra core is well-engineered and highly optimized. The refactoring into modules is
feasible and worthwhile for maintainability. Replacing ganja's 3D renderer with jsReality
is the highest-value integration point, bringing proper lighting, scene graph management,
and (soon) full projective geometry support. The 2D SVG and implicit surface renderers are
best kept as-is.
