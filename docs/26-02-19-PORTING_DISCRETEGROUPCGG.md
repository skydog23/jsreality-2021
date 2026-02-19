# Porting Report: `discretegroupCGG` into `jsreality-2021/src/discretegroup`

Date: 2026-02-19  
Scope requested: `src/discreteGroup/{demo, maniview, maniviewnew, quartz, tools, util, wallpaper}`  
Out of scope by request: XML animation files (ignored)

## Executive Summary

Porting these folders into `jsreality-2021/src/discretegroup` is feasible, but only partly as direct Java-to-JS translation.  
Core math/group logic ports well; UI/plugin-heavy desktop code (Swing/JRViewer/JOGL/VR/audio) requires JS-native redesign.

Recommendation: proceed in phases with logic-first modules, then selective app/demo rewrites.

## Inventory (Java source files)

- `demo`: 42 Java files
- `maniview`: 10 Java files
- `maniviewnew`: 1 Java file
- `quartz`: 12 Java files
- `tools`: 3 Java files
- `util`: 1 Java file
- `wallpaper`: 29 Java files

Total in requested folders: **98 Java files**.

## Feasibility by Folder

- **`tools`**: Medium
  - `CopyClickTool` is the strongest early candidate and aligns with already ported pieces (`DirichletDomain`, `WingedEdge`, DG scene graph representation).
  - `SoundEffects`/`MidiSoundEffects` are Java desktop audio APIs and should be omitted or replaced with web audio stubs.

- **`wallpaper`**: Medium for core logic, High for full UI parity
  - Good news: key wallpaper group math/domain logic has already been ported in JS.
  - Remaining package contains significant desktop UI/plugin machinery (`WallpaperPluggedIn`, paint/texture plugins, drag/drop, file chooser, menu systems).
  - Suggested: port computational state/providers first; rebuild UI as JS app/plugins.

- **`quartz`**: Medium-High
  - Core group/geometry logic is portable.
  - Depends on custom math/tooling (`charlesgunn.*`, isometry/biquaternion tooling) and some group classes not yet ported.

- **`util`** (`ArchimedeanSolidsUtility`): Medium-High
  - Relies on unported groups (`ArchimedeanSolids`, `TriangleGroup`) and spherical helpers.
  - Practical once those prerequisites exist.

- **`demo`**: Medium for selected demos, High for complete parity
  - Best treated as curated `JSRApp` ports, not bulk direct translation.
  - Many demos depend on unported group families and desktop-centric UI behavior.

- **`maniview` / `maniviewnew`**: High to Very High
  - Heavy reliance on old jReality plugin ecosystem, viewer composition, JOGL/VR patterns, Swing controls, and custom desktop flows.
  - Should be considered redesign targets rather than literal ports.

## Main Challenges

- **Desktop UI stack mismatch**: Swing/AWT/JRViewer plugin architecture has no 1:1 mapping to web JS runtime.
- **Dependency gaps**: several referenced `de.jtem.discretegroup.groups/spacegroups/plugin` classes are not yet ported.
- **Custom external packages**: frequent dependencies on `charlesgunn.*` utility/math/geometry classes.
- **Audio/VR/platform features**: Java sound/midi and older VR integrations are not directly portable.
- **Scope size**: 98 Java files in target folders, many of them app-level.

## Proposed Port Order

1. **Phase 1 (highest ROI, lowest risk)**
   - `tools/CopyClickTool` (without sound/midi first)
   - selected non-UI wallpaper core classes (state/providers/domain helpers)

2. **Phase 2 (core feature expansion)**
   - `quartz` core math/group/geometry classes
   - minimal dependency shims for required `charlesgunn.*` functionality

3. **Phase 3 (showcase layer)**
   - selected `demo` classes as `JSRApp` examples (small curated subset)

4. **Phase 4 (large redesign)**
   - `maniview` and `maniviewnew` as JS-native viewer apps/plugins

## Practical Conclusion

- Putting new code under `jsreality-2021/src/discretegroup` is the correct structure.
- A successful port should mix:
  - direct translations for algorithmic/group logic, and
  - targeted rewrites for UI/plugin-heavy components.
- Ignoring XML animation files is appropriate and reduces migration burden without blocking core functionality.

## Dependency Audit Against `ProjectiveGeometry` (`charlesgunn.*`)

This section focuses only on the requested folders:
`demo`, `maniview`, `maniviewnew`, `quartz`, `tools`, `util`, `wallpaper`.

Method used:
- scanned `import charlesgunn.*` references in those folders
- cross-checked for class-name presence in `jsreality-2021/src`
- listed classes that are still missing as direct translations

### Already present in `jsreality` (or clear equivalents)

- `charlesgunn.anim.plugin.AnimationPlugin` (present as `AnimationPlugin`)
- `charlesgunn.anim.util.AnimationUtility` (present as `AnimationUtility`)
- `charlesgunn.anim.core.KeyFrameAnimatedBean` (present)
- `charlesgunn.anim.core.FramedCurve` (present)
- `charlesgunn.anim.jreality.SceneGraphAnimator` (present)
- `charlesgunn.jreality.newtools.RotateTool` (project has `RotateTool`)
- `charlesgunn.math.p5.PlueckerLineGeometry` (project has `PlueckerLineGeometry`)
- `charlesgunn.jreality.tools.ToolManager` (project has `ToolManager`)

### Not yet translated into `jsreality` (class-name level)

#### `charlesgunn.jreality.viewer`
- `Assignment`
- `LoadableScene`
- `GlobalProperties`
- `PluginSceneLoader`

#### `charlesgunn.jreality`
- `SelectionComponent`
- `CameraUtilityOverflow`

#### `charlesgunn.jreality.plugin`
- `TermesSpherePlugin`

#### `charlesgunn.jreality.texture`
- `SimpleTextureFactory`
- `RopeTextureFactory`

#### `charlesgunn.jreality.geometry`
- `GeometryUtilityOverflow`
- `ClipBox`
- `OneArmedTinManFactory`
- `SnakeFactory`
- `FrontWindow`
- `FullSphericalTriangleFactory`
- `SphericalTriangleFactory`

#### `charlesgunn.jreality.geometry.projective`
- `CircleFactory`

#### `charlesgunn.jreality.newtools`
- `FlyTool`
- `FlyTool2`
- `AllroundTool`
- `AnimatedIsometry`
- `TexturePlacementTool`

#### `charlesgunn.jreality.tools`
- `RotateShapeTool`
- `TranslateShapeTool`
- `MotionManager`
- `UserTool`

#### `charlesgunn.math`
- `Biquaternion`
- `BiquaternionUtility`
- `IsometryAxis`

#### `charlesgunn.anim.io`
- `ImportExport`

#### `charlesgunn.util`
- `TextSlider` (including `TextSlider.IntegerLog`)
- `MyMidiSynth`

### Notes

- This list is intentionally class-based. Some features may be partially replaceable via existing JS APIs, but these specific Java class dependencies are not yet present as translations.
- Several missing classes are UI/tooling infrastructure rather than pure math; these are expected to need redesign rather than literal ports.

## Demo Class Triage (Revised: `Assignment`/`LoadableScene` mapped to `JSRApp`)

Per request, `charlesgunn.jreality.viewer.Assignment` and
`charlesgunn.jreality.viewer.LoadableScene` are treated as satisfied by `JSRApp`
and are **not** counted as missing dependencies in this triage.

### Can Translate As-Is (dependency-wise)

- `FangStar`
- `SimpleSolidsDemo`
- `S245Demo`
- `Eva4344`
- `FundamentalDomainsDemo`
- `EquidistantTextureDemo`
- `EscherButterflies`
- `PaulPlanes`

### Cannot Translate As-Is (with missing dependencies)

- `FangDemo`: `charlesgunn.jreality.SelectionComponent`; `de.jtem.discretegroup.groups.ArchimedeanSolids`
- `TriangleGroupDemo`: `charlesgunn.jreality.plugin.TermesSpherePlugin`; `charlesgunn.jreality.texture.SimpleTextureFactory`; `charlesgunn.jreality.tools.RotateShapeTool`; `charlesgunn.jreality.tools.TranslateShapeTool`; `charlesgunn.util.TextSlider`; `de.jtem.discretegroup.core.DiscreteGroupViewportConstraint`; `de.jtem.discretegroup.groups.TriangleGroup`
- `ConwayThurston`: `charlesgunn.jreality.geometry.GeometryUtilityOverflow`; `charlesgunn.jreality.newtools.FlyTool`
- `ScrewsAndBands`: `de.jtem.discretegroup.groups.BorromeanUtility`
- `JitterbugOctaTetra`: `charlesgunn.jreality.geometry.ClipBox`; `charlesgunn.jreality.newtools.FlyTool`; `charlesgunn.math.Biquaternion`; `charlesgunn.math.BiquaternionUtility`; `charlesgunn.util.TextSlider`; `de.jtem.discretegroup.core.DiscreteGroupConstraintUtility`
- `JitterbugTessellation`: `charlesgunn.jreality.geometry.ClipBox`; `charlesgunn.jreality.newtools.FlyTool`; `charlesgunn.util.TextSlider`; `de.jtem.discretegroup.groups.TriangleGroup`
- `Hypercube`: `charlesgunn.jreality.newtools.FlyTool`; `charlesgunn.util.TextSlider`; `charlesgunn.math.clifford.PascalDemo`
- `TetrahedraTower`: `charlesgunn.jreality.newtools.FlyTool`; `charlesgunn.jreality.viewer.PluginSceneLoader`; `de.jtem.discretegroup.groups.Spherical3DGroup`
- `TensegrityStructure`: `charlesgunn.jreality.AbstractDeformation`; `charlesgunn.jreality.tools.AbstractShapeTool`
- `FirTreeDemo`: `charlesgunn.jreality.geometry.GeometryUtilityOverflow`; `charlesgunn.jreality.viewer.GlobalProperties`
- `SoccerBall`: `de.jtem.discretegroup.groups.ArchimedeanSolids`; `de.jtem.discretegroup.groups.TriangleGroup`
- `SchatzCube`: `charlesgunn.jreality.SelectionComponent`; `charlesgunn.jreality.plugin.TermesSpherePlugin`; `charlesgunn.jreality.texture.RopeTextureFactory`; `charlesgunn.jreality.texture.SimpleTextureFactory`; `charlesgunn.math.Utility`; `charlesgunn.util.TextSlider`
- `ArchimedeanSolidsDemo`: `de.jtem.discretegroup.groups.ArchimedeanSolids`
- `RationalQuadraticBezierTriangleDemo`: `de.jtem.discretegroup.groups.TriangleGroup`
- `XmasArchimedeanSolids`: `de.jtem.discretegroup.groups.ArchimedeanSolids`
- `RinusPolyhedronS3Rotational`: `charlesgunn.jreality.newtools.FlyTool`; `charlesgunn.jreality.newtools.FlyTool2`; `charlesgunn.jreality.plugin.TermesSpherePlugin`; `charlesgunn.util.TextSlider`
- `Cell24`: `charlesgunn.jreality.newtools.FlyTool`; `charlesgunn.util.TextSlider`
- `EightSRS`: `charlesgunn.jreality.newtools.FlyTool`; `charlesgunn.util.TextSlider`
- `CopyClickToolDemo`: `charlesgunn.jreality.newtools.FlyTool`
- `RinusPolyhedronS3Screw`: `charlesgunn.jreality.newtools.FlyTool`; `charlesgunn.jreality.newtools.FlyTool2`; `charlesgunn.jreality.plugin.TermesSpherePlugin`; `charlesgunn.jreality.tools.RotateShapeTool`; `charlesgunn.jreality.tools.TranslateShapeTool`; `charlesgunn.util.TextSlider`
- `RinusPolyhedronS3`: `charlesgunn.jreality.newtools.FlyTool`; `charlesgunn.jreality.newtools.FlyTool2`; `charlesgunn.jreality.plugin.TermesSpherePlugin`; `charlesgunn.jreality.tools.RotateShapeTool`; `charlesgunn.jreality.tools.TranslateShapeTool`; `charlesgunn.util.TextSlider`
- `RinusPolyhedronS3Old`: `charlesgunn.jreality.newtools.FlyTool`; `charlesgunn.jreality.newtools.FlyTool2`; `charlesgunn.jreality.plugin.TermesSpherePlugin`; `charlesgunn.jreality.tools.RotateShapeTool`; `charlesgunn.jreality.tools.TranslateShapeTool`; `charlesgunn.util.TextSlider`
- `IsometriesIn3DPGADemo`: `charlesgunn.jreality.SelectionComponent`
- `KemperSolids`: `charlesgunn.jreality.viewer.PluginSceneLoader`; `charlesgunn.jreality.tools.MouseTool`; `charlesgunn.util.TextSlider`; `de.jtem.discretegroup.groups.TriangleGroup`
- `PolarPlaneDemo`: `charlesgunn.jreality.viewer.GlobalProperties`
- `PolarPlaneDemo2`: `charlesgunn.jreality.viewer.GlobalProperties`
- `TenCell`: `charlesgunn.jreality.geometry.projective.CurveCollector`; `charlesgunn.jreality.texture.SimpleTextureFactory`; `charlesgunn.jreality.viewer.PluginSceneLoader`; `charlesgunn.math.Biquaternion`; `charlesgunn.util.TextSlider`; `de.jtem.discretegroup.core.DiscreteGroupColorPicker`
- `PlanarPattern`: `charlesgunn.util.TextSlider`
- `StarSolids`: `de.jtem.discretegroup.groups.ArchimedeanSolids`
- `Zeolith`: `de.jtem.discretegroup.groups.ArchimedeanSolids`
- `PSL2CExample`: `charlesgunn.math.CP1`; `charlesgunn.math.Complex`; `charlesgunn.math.PSL2C`; `charlesgunn.util.TextSlider`
- `LatticesInPerspective`: `charlesgunn.util.TextSlider`
- `CrystallographicGroupDemo`: `charlesgunn.jreality.CameraUtilityOverflow`; `de.jtem.discretegroup.core.DiscreteGroupViewportConstraint`
- `EscherPatternPaper`: `de.jtem.discretegroup.plugin.TessellatedContent`

