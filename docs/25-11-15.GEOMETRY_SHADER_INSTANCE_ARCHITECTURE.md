# Geometry Shader Instance Architecture

## Overview

The jsReality shader system has been redesigned to support **runtime instances** of shaders that hold **resolved attribute values** from the `EffectiveAppearance` system. This enables the inspector to display which attributes are explicitly set vs. inherited.

## Core Concepts

### 1. Schema vs. Instance

- **Schema Objects** (`DefaultPointShader`, `DefaultLineShader`, `DefaultPolygonShader`): Static objects defining:
  - Attribute names (`ATTRIBUTES` array)
  - Default values (`*_DEFAULT` constants)
  - Utility methods (`getDefault()`, `hasAttribute()`, etc.)

- **Instance Objects** (`PointShaderInstance`, `LineShaderInstance`, `PolygonShaderInstance`): Runtime objects containing:
  - Resolved attribute values (actual values or `INHERITED` symbol)
  - Methods to query attributes
  - Type identification for inspector

### 2. The DefaultGeometryShader Class

`DefaultGeometryShader` is the **top-level shader** that the renderer creates for each scene graph component. It contains:

1. **Show flags** (`showPoints`, `showLines`, `showFaces`): Control whether each primitive type is drawn
2. **Three sub-shader instances** (`PointShaderInstance`, `LineShaderInstance`, `PolygonShaderInstance`): Contain resolved attribute values

## Creation Flow

```javascript
// In Canvas2DRenderer.visitComponent():

// 1. Get effective appearance for current component
const effectiveAppearance = new EffectiveAppearance(appearanceStack);

// 2. Create geometry shader with resolved values
const geometryShader = DefaultGeometryShader.createFromEffectiveAppearance(effectiveAppearance);

// 3. Query show flags (will be true, false, or INHERITED)
const showPoints = geometryShader.getShowPoints();
const showLines = geometryShader.getShowLines();
const showFaces = geometryShader.getShowFaces();

// 4. Get sub-shaders with resolved attributes
const pointShader = geometryShader.getPointShader();
const lineShader = geometryShader.getLineShader();
const polygonShader = geometryShader.getPolygonShader();

// 5. Query specific attributes (will be actual values or INHERITED)
const pointColor = pointShader.getAttribute('diffuseColor');
const lineWidth = lineShader.getAttribute('lineWidth');
```

## Attribute Resolution

Each sub-shader instance queries the `EffectiveAppearance` with the **namespaced attribute key**:

- Point attributes: `point.diffuseColor`, `point.pointSize`, etc.
- Line attributes: `line.diffuseColor`, `line.lineWidth`, etc.
- Polygon attributes: `polygon.diffuseColor`, `polygon.transparency`, etc.

If an attribute has NOT been set explicitly in the current appearance stack, `EffectiveAppearance.getAttribute()` returns the `INHERITED` symbol.

## Inspector Integration

The inspector displays `DefaultGeometryShader` as a **parent node** with:

1. **Own properties** (show flags):
   - `showPoints` → Checkbox or "Inherited" button
   - `showLines` → Checkbox or "Inherited" button
   - `showFaces` → Checkbox or "Inherited" button

2. **Three "children"** (sub-shaders):
   - Point Shader
   - Line Shader
   - Polygon Shader

When a sub-shader is selected, the inspector displays its **resolved attributes**:

- If `attribute === INHERITED`: Display "Inherited" button only
- If `attribute !== INHERITED`: Display widget with value + "Inherited" button

Clicking "Inherited" button:
- If currently inherited: Opens widget to set explicit value
- If currently explicit: Removes explicit value, reverts to `INHERITED`

## Example: Rendering with Geometry Shader

```javascript
class Canvas2DRenderer {
  visitComponent(component) {
    // ... save context, push transform, push appearance ...
    
    const effectiveAppearance = new EffectiveAppearance(this.#appearanceStack);
    const geometryShader = DefaultGeometryShader.createFromEffectiveAppearance(effectiveAppearance);
    
    const geometry = component.getGeometry();
    if (geometry) {
      // Check show flags (use defaults if INHERITED)
      const showPoints = geometryShader.getShowPoints() === INHERITED 
        ? true // default
        : geometryShader.getShowPoints();
        
      const showLines = geometryShader.getShowLines() === INHERITED
        ? true // default
        : geometryShader.getShowLines();
        
      const showFaces = geometryShader.getShowFaces() === INHERITED
        ? true // default
        : geometryShader.getShowFaces();
      
      // Render based on flags
      if (showPoints) {
        const pointShader = geometryShader.getPointShader();
        this.#renderVerticesAsPoints(geometry, pointShader);
      }
      
      if (showLines && geometry.getEdgeCount) {
        const lineShader = geometryShader.getLineShader();
        this.#renderEdgesAsLines(geometry, lineShader);
      }
      
      if (showFaces && geometry.getFaceCount) {
        const polygonShader = geometryShader.getPolygonShader();
        this.#renderFacesAsPolygons(geometry, polygonShader);
      }
    }
    
    // ... children accept, restore context ...
  }
  
  #renderVerticesAsPoints(geometry, pointShader) {
    // Query resolved point attributes
    const diffuseColor = pointShader.getAttribute('diffuseColor');
    const pointSize = pointShader.getAttribute('pointSize');
    
    // Use defaults if INHERITED
    const color = diffuseColor === INHERITED 
      ? DefaultPointShader.DIFFUSE_COLOR_DEFAULT 
      : diffuseColor;
      
    const size = pointSize === INHERITED
      ? DefaultPointShader.POINT_SIZE_DEFAULT
      : pointSize;
    
    // ... render points with color and size ...
  }
}
```

## Benefits

1. **Clear Separation**: Schema (defaults) vs. runtime values (instances)
2. **Inspector-Friendly**: Each instance knows which attributes are inherited
3. **Type-Safe**: Instances have type identification for polymorphic rendering
4. **Efficient**: Create once per component visit, query multiple times
5. **Hierarchical**: Matches jReality's appearance inheritance model

## Files

- `src/core/shader/DefaultGeometryShader.js`: Main geometry shader class and sub-shader instances
- `src/core/shader/DefaultPointShader.js`: Point shader schema
- `src/core/shader/DefaultLineShader.js`: Line shader schema
- `src/core/shader/DefaultPolygonShader.js`: Polygon shader schema
- `src/core/shader/EffectiveAppearance.js`: Appearance attribute resolution
- `src/core/scene/Appearance.js`: `INHERITED` symbol definition

## Next Steps

1. Modify `Canvas2DRenderer` to create `DefaultGeometryShader` instances
2. Update rendering methods to query shader instances instead of `EffectiveAppearance` directly
3. Integrate `DefaultGeometryShader` into `SceneGraphInspector` as a parent node with sub-shader children
4. Implement inspector UI for displaying inherited vs. explicit attributes

