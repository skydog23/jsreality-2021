# Using DescriptorTypes Everywhere — Scope Report

## Goal
Unify inspector/property-panel rendering around `DescriptorTypes` +
`WidgetCatalog` + `DescriptorRenderer`, and eliminate ad‑hoc DOM/CSS generation.

## Current State (Summary)
- `PropertyPanelManager` already renders most property panels via
  `DescriptorRenderer` + `DescriptorTypes`.
- Shader panels are a notable exception:
  `ShaderPropertyManager` uses `WidgetFactory` + custom widgets directly.
- CSS sources are split:
  - Base CSS in `InspectorStylesheetManager`.
  - Legacy CSS file `css/retrievedCSSStyles.css` (now optional).
  - Widget-specific CSS injected by widgets themselves:
    `NumberWidget` and `VectorWidget` inject `<style>` at runtime.

## Main Exceptions to DescriptorTypes
1. **ShaderPropertyManager**
   - Builds controls via `WidgetFactory` and raw DOM.
   - Uses `NumberWidget`, `VectorWidget`, `ColorPickerWidget`, etc.
2. **WidgetFactory**
   - Chooses widgets based on runtime value types (not descriptors).
   - Creates inputs directly and uses widget classes.
3. **Widget-specific CSS injection**
   - `NumberWidget` and `VectorWidget` inject CSS in their own files.

## Refactoring Scope (High-Level)
1. **Define descriptor schemas for shader attributes**
   - Convert shader property lists into descriptor groups.
   - Represent type-specific rules (metric enum, color, numeric ranges, etc.)
     as descriptor fields rather than runtime widget selection.
2. **Replace ShaderPropertyManager output**
   - Replace DOM creation with descriptors and pass them to
     `DescriptorRenderer` (like other panels).
3. **Retire WidgetFactory from inspector UI**
   - If still needed elsewhere, keep it, but the inspector should not depend
     on it once all panels are descriptor-driven.
4. **Consolidate CSS**
   - Move `NumberWidget`/`VectorWidget` styles into
     `InspectorStylesheetManager`.
   - Optionally fold legacy CSS into base and remove it entirely.

## Other DOM/CSS Generators
These are still fine, but are outside the DescriptorTypes pipeline:
- `UIManager` builds the main inspector DOM (panels, divider).
- `TreeViewManager` creates the tree view DOM.

## Risks / Considerations
- Shader attribute types are heterogeneous and may need a descriptor schema
  layer (e.g., numeric ranges, enums, color types).
- Some shader controls rely on runtime lookups (e.g., `metric` handling in
  `WidgetFactory`). These need descriptor metadata.
- Live updates and event wiring must still call `onPropertyChange` and
  `onRefreshPropertyPanel`.

## Rough Effort Estimate
- **Low** if limited to shader panels only.
- **Medium** if also consolidating widget CSS and removing legacy CSS.
- **Higher** if standardizing all custom widget behaviors into descriptor fields.

## Suggested First Step
Prototype a descriptor builder for shader attributes, render it via
`DescriptorRenderer`, and keep `WidgetFactory` as a fallback until parity is
confirmed.
