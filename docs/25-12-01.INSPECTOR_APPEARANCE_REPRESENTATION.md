# Inspector Appearance Representation

## Change

Removed the flat attribute list from the property panel when an Appearance node is selected in the SceneGraphInspector tree view.

## Rationale

**Appearances should be represented ONLY through the shader hierarchy in the tree view**, not as raw attributes in the property panel. This design ensures:

1. **Consistent with EffectiveAppearance model**: The shader hierarchy (GeometryShader → Point/Line/Polygon shaders) represents how appearances are actually resolved through the scene graph hierarchy.

2. **Clearer separation of concerns**: 
   - Tree view = structure and hierarchy
   - Property panel = editable values for the selected shader

3. **Prevents confusion**: Raw attribute keys (e.g., `pointShader.diffuseColor`) are implementation details. Users should interact with the semantic shader hierarchy instead.

4. **Matches jReality design**: The Java jReality inspector follows this pattern.

## Previous Behavior

When selecting an Appearance node in the tree:
- Property panel showed a flat list of all stored attributes
- Keys like `pointShader.diffuseColor`, `backgroundColor`, etc. were displayed
- This duplicated information already available in the shader tree nodes

## New Behavior

When selecting an Appearance node in the tree:
- Property panel displays an informative message:
  > "Select a shader node in the tree to view and edit appearance properties."
- Users must expand the Appearance node and select specific shader nodes (GeometryShader, PointShader, LineShader, PolygonShader, RenderingHintsShader, RootAppearance) to view/edit properties

## Shader Hierarchy Structure

When an Appearance is expanded in the tree, it shows:

```
Appearance
├── GeometryShader
│   ├── showPoints (VERTEX_DRAW)
│   ├── showLines (EDGE_DRAW)
│   └── showFaces (FACE_DRAW)
├── PointShader
│   ├── diffuseColor
│   ├── pointRadius
│   └── ... (other point properties)
├── LineShader
│   ├── diffuseColor
│   ├── tubeRadius
│   └── ... (other line properties)
├── PolygonShader
│   ├── diffuseColor
│   ├── transparency
│   └── ... (other polygon properties)
├── RenderingHintsShader
│   ├── transparencyEnabled
│   ├── opaqueTubesAndSpheres
│   └── ... (other hints)
└── RootAppearance (if root appearance)
    └── backgroundColor
```

Each of these shader nodes can be selected to view/edit its specific properties in the property panel.

## Benefits

1. **Hierarchical clarity**: Properties are organized by their semantic purpose (point rendering, line rendering, face rendering)

2. **Namespace visibility**: The shader prefixes (`pointShader.`, `lineShader.`, `polygonShader.`) are implicit in the tree structure rather than explicit in the property keys

3. **Reduced clutter**: Property panel only shows relevant properties for the selected shader, not all attributes at once

4. **Inheritance model**: Each shader node shows whether properties are set locally or inherited (via "inherited" buttons)

5. **Consistent with effective appearance**: The tree structure mirrors how EffectiveAppearance resolves attributes through the scene graph

## Implementation

**File**: `src/core/inspect/PropertyPanelManager.js`

**Method**: `#addAppearanceProperties(appearance)`

**Change**: Replaced the attribute iteration loop with a simple informative message. The method now:
1. Creates a styled message element
2. Informs user to select shader nodes instead
3. Provides clear visual feedback

**Code**:
```javascript
#addAppearanceProperties(appearance) {
  // NOTE: Appearance properties are NOT displayed in the property panel.
  // The appearance is represented through the shader hierarchy in the tree view.
  
  const message = document.createElement('div');
  message.className = 'sg-info-message';
  message.style.padding = '16px';
  message.style.color = '#858585';
  message.style.fontStyle = 'italic';
  message.textContent = 'Select a shader node in the tree to view and edit appearance properties.';
  this.#propertyPanel.appendChild(message);
}
```

## User Workflow

To edit appearance properties:

1. **Expand Appearance node** in tree view
2. **Select specific shader** (e.g., PolygonShader)
3. **Edit properties** in property panel
4. Changes are applied to the correct namespaced attribute (e.g., `polygonShader.diffuseColor`)

## Testing

To verify the change:
1. Open any scene in the inspector
2. Select an Appearance node
3. Property panel should show the informative message (no attribute list)
4. Expand the Appearance node
5. Select a shader node (e.g., PointShader)
6. Property panel should show that shader's properties (diffuseColor, pointRadius, etc.)

## Related Components

- `TreeViewManager.js`: Creates shader tree nodes under Appearance nodes
- `ShaderPropertyManager.js`: Manages shader-specific property display and editing
- `EffectiveAppearance.js`: Resolves appearance attributes through the hierarchy

