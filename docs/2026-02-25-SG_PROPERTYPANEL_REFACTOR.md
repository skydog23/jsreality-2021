# Refactoring the SceneGraphInspector Property Panels to use the Descriptor System

**Date**: 2026-01-28  
**Status**: Planning

## Motivation

The codebase has two parallel widget-building systems in `src/core/inspect/`:

- **Old system** (scene graph property panels): `WidgetFactory.js`, `ShaderPropertyManager.js`, and manual DOM code inside `PropertyPanelManager.js`. These create raw DOM elements by inspecting value types (Color, Boolean, Number, Array, metric enum).
- **New system** (JSRApp inspectors and plugins): `DescriptorTypes.js`, `WidgetCatalog.js`, `DescriptorRenderer.js`. Declarative descriptor objects are mapped to factory functions that produce DOM widgets.

Improvements to one system (e.g., the `'change'` event fix for `<input type="color">` in `WidgetCatalog`) have no effect on the other. Unifying them would eliminate this duplication.

## Current State

`PropertyPanelManager` already straddles both systems: it uses `DescriptorRenderer` for JSRApp-provided descriptors (via `getInspectorDescriptors()`), but falls back to the old `WidgetFactory` + `ShaderPropertyManager` path for built-in scene graph node properties (Transformation, Camera, Geometry, Appearance/Shaders).

The new descriptor system already covers all widget types used by the old system:

| Old WidgetFactory type | Descriptor equivalent |
|---|---|
| Color picker | `DescriptorType.COLOR` |
| Boolean checkbox | `DescriptorType.TOGGLE` |
| Number input | `DescriptorType.FLOAT` / `INT` |
| Vector (2D/3D/4D) | `DescriptorType.VECTOR` |
| Metric dropdown | `DescriptorType.ENUM` |
| Text display | `DescriptorType.LABEL` |

## Scope

The refactoring touches approximately **1,475 lines** across 3 files:

- **`PropertyPanelManager.js`** (722 lines) — rewrite the manual DOM-building methods for Transformation, Camera, Geometry, and Appearance/Shader panels to produce descriptor arrays instead.
- **`ShaderPropertyManager.js`** (505 lines) — replace `WidgetFactory` usage with descriptor generation; the "inherited" attribute UI becomes descriptor-based.
- **`WidgetFactory.js`** (248 lines) — can be **deleted entirely** once the above are converted.

Files that **don't need changes**: `SceneGraphInspector.js`, `TreeViewManager.js`, `UIManager.js`, `SceneGraphTreeModel.js`, `CompositeTreeModel.js`. These handle tree structure and layout, not property widgets.

## Feasibility: High

1. **The new system already covers all needed widget types** (see table above).
2. **`PropertyPanelManager` already knows both systems.** It imports `DescriptorRenderer` and uses it for app descriptors. The conversion replaces manual DOM code with descriptor arrays fed to the same `DescriptorRenderer`.
3. **No architectural changes needed.** The tree view, node selection, event listeners, and refresh scheduling are independent of how property widgets are created.

## Challenges

### 1. Shader "Inherited" Attribute Pattern

`ShaderPropertyManager` has special UI for inherited attributes: each shader property shows either its value or an "Inherited" button that, when clicked, sets the attribute to its default. This is a two-state widget (value editor vs. "set default" button) with no direct descriptor equivalent.

**Solution**: A small `CONTAINER` with conditional rendering, or a new descriptor type `INHERITABLE` that wraps another descriptor and adds the inherited/set-default toggle.

### 2. Shader Tree Node Navigation

The current shader panel uses a sub-tree (Geometry Shader → Point/Line/Polygon Shaders) where clicking a shader node shows its properties. This tree navigation is managed by `ShaderPropertyManager` and `TreeViewManager` together. The refactoring should not change this tree structure — only replace how each shader node's properties are rendered.

### 3. Non-Destructive DOM Update (Performance)

**This is the most important challenge.** The current system can do **surgical updates** — when a `TransformationChanged` event fires during rotation (60+ Hz during tool drag), the old code just writes new numbers into existing DOM input elements (e.g., `input.value = newAngle`). That is essentially free.

The descriptor system's `DescriptorRenderer.render()` takes a **scorched earth** approach: it tears down the entire property panel DOM and rebuilds it from scratch. If that runs on every `TransformationChanged` event, you'd be creating and destroying dozens of DOM elements per frame instead of updating a few `.value` properties. A naive conversion would make the existing stutter problem (already noticeable when clicking into the inspector during rotation of large geometries) **worse**, not better.

**Required mitigation**: Add an **in-place update path** to `DescriptorRenderer` — an `update()` method that walks the existing widgets, calls `descriptor.getValue()` on each, and refreshes their displayed values without rebuilding the DOM. The descriptor system actually makes this feasible, since each widget already knows its `getValue` function; the missing piece is a lightweight "re-read and repaint" pass that doesn't touch the DOM structure.

This must be designed and implemented **before** starting the refactoring, not as an afterthought, since without it Phase 1 (Transformation panel) would immediately regress the performance problem.

### 4. Metric Dropdown

`WidgetFactory` has a special-case metric dropdown (Euclidean/Hyperbolic/Elliptic/Projective). This maps cleanly to `DescriptorType.ENUM` with the four options, but the conversion must preserve the fallback "unknown value" display for non-standard metric values.

## New Descriptor Type: MATRIX

A `MATRIX` descriptor type would consolidate the Transformation panel's scattered pieces (Position vector, Rotation angle + axis, Scale vector) into a single logical unit that understands it is editing a 4x4 matrix through its `FactoredMatrix` decomposition.

### Descriptor interface

```javascript
{
  type: DescriptorType.MATRIX,
  label: 'Transformation',
  getValue: () => transform.getMatrix(),
  setValue: (m) => transform.setMatrix(m),
  metric: Pn.EUCLIDEAN,  // or a getter function for dynamic metric
}
```

### Internal structure

The `MATRIX` widget internally creates sub-rows (essentially a `CONTAINER` with `VECTOR` for position, `FLOAT` for angle, `VECTOR` for axis, `VECTOR` for scale), but callers only see the single matrix get/set interface. The `FactoredMatrix` decomposition/recomposition logic lives entirely inside the widget.

### Advantages

- **Encapsulation**: The factorization/recomposition logic lives in one place instead of being spread across `PropertyPanelManager`'s manual DOM code.
- **Metric awareness**: `FactoredMatrix` already takes a metric argument; the widget handles this transparently.
- **Simple descriptor interface**: A single `getValue()` returns the matrix, a single `setValue()` writes it back.
- **Natural home for in-place updates**: The `MATRIX` widget can efficiently update its sub-fields when a `TransformationChanged` event fires, without DOM rebuild.
- **Reusable**: Any `Transformation` or `Matrix` in the scene graph can be inspected with the same descriptor type.

### Behaviour

Editing any sub-field (e.g., rotation angle) immediately recomposes the full matrix via `FactoredMatrix.getMatrix()` and writes it back through `setValue()`. This matches the current inspector's immediate write-back behaviour.

## Recommended Phasing

### Phase 0: Infrastructure

Implement the non-destructive `update()` path in `DescriptorRenderer`. Implement the `MATRIX` descriptor type and its widget factory in `WidgetCatalog`. These are prerequisites for Phase 1.

### Phase 1: Built-in Panels

Convert `PropertyPanelManager`'s Transformation, Camera, and Geometry panels to produce descriptor arrays. These are self-contained and don't involve the "inherited" complication. The Transformation panel uses the new `MATRIX` descriptor type.

### Phase 2: Shader Panels

Convert `ShaderPropertyManager` to produce descriptor arrays for each shader node's properties. This requires implementing the "inherited attribute" pattern in the descriptor system (likely as a reusable `CONTAINER` wrapper or new `INHERITABLE` descriptor type).

### Phase 3: Cleanup

Delete `WidgetFactory.js` and the old widget classes (`ColorPickerWidget`, `VectorWidget`, `NumberWidget`) once they have no remaining consumers.
