### Translation plan: jreality-2021/src-core → JS with JSDoc

#### Scope examined
- Packages: `de/jreality/{math, scene, geometry, shader, util}`
- Read key classes: `math/FactoredMatrix`, `math/MatrixBuilder`, `scene/Transformation`, `util/SceneGraphUtility`, `shader/CommonAttributes`.
- Existing JS seed in `jsreality-2021/src-core/de/jreality/math`: `P3.js`, `Pn.js`, `Quat.js`, `Rn.js` (+ tests).

#### Strategy per package
- **math**: Port `Matrix`, `FactoredMatrix`, `MatrixBuilder` (arrays/typed arrays). Keep fluent API. Mirror Java names/order. Use JSDoc for params/returns.
- **scene**: Implement `Transformation` with listener arrays; stub `startReader/finishWriter` as no-ops. Later add minimal `SceneGraphNode/Component` scaffolding to support utilities.
- **shader**: Export `CommonAttributes` keys/defaults as a JS module; replace AWT `Color/Font/SwingConstants` with simple JS equivalents.
- **geometry**: Define data containers `PointSet`, `IndexedLineSet`, `IndexedFaceSet` (positions/normals/colors/indices). Port utility/factory methods used by animation; rendering is out of scope.
- **util**: Port subset needed by animation, esp. `SceneGraphUtility` (create nodes, replace/remove children, flatten paths; transform vertices/normals using `Rn`). Replace logging with `console`.

#### JSDoc approach
- Typedefs shared across modules:
  - `Matrix4` (length-16 number array), `Vec3`, `Vec4`, `Quaternion`, `Metric`.
- Overloads → single runtime-branching functions; annotate with union types in JSDoc.
- Enable static checks via `// @ts-check` or project `checkJs: true`.

#### Anticipated difficulties and mitigations
- Java overloads → JS single fn + JSDoc unions.
- Concurrency/listeners → simple event arrays; no locks.
- AWT/Swing types → plain objects/numbers.
- Java collections → JS arrays; preserve sort/iteration semantics.
- scene.data abstractions → raw arrays/typed arrays + helpers.
- Equality/clone → explicit helpers.
- Numeric stability/perf → prefer Float64Array for hot paths; accept plain arrays in API.

#### Suggested implementation order
1) Finish math (`Matrix`, `FactoredMatrix`, `MatrixBuilder`).
2) Minimal scene core (`Transformation`, node/component scaffolding, events).
3) Shader constants module.
4) Geometry data types + utilities used by animation.
5) Util subset for animation (`SceneGraphUtility` core, `CopyVisitor` replacement, `DefaultMatrixSupport` basics).

#### Notes
- Maintain Java→JS mirroring of names/order to match the Java sources.
- Keep tests alongside ports (start with math; extend as geometry/scene utilities land).
