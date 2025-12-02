# Inspector Integration: DefaultGeometryShader Hierarchy

## Overview

With `DefaultGeometryShader` now translated, the inspector can display shader attributes in a hierarchical tree structure, matching the conceptual organization of the shader system.

## Hierarchy Structure

```
📦 SceneGraphComponent ("testTriangle")
  ├─ 🔄 Transformation
  ├─ 🎨 Appearance
  │   └─ 🎭 DefaultGeometryShader          ← NEW: Parent shader
  │       ├─ ☑ Show Points: true
  │       ├─ ☑ Show Lines: true
  │       ├─ ☑ Show Faces: true
  │       ├─ 📍 Point Shader              ← Sub-shader (expandable)
  │       │   ├─ diffuseColor: [Red]  [Inherited]
  │       │   ├─ spheresDraw: (default) [Inherited]
  │       │   └─ pointRadius: [0.050]  [Inherited]
  │       ├─ 📏 Line Shader               ← Sub-shader (expandable)
  │       │   ├─ diffuseColor: [Black] [Inherited]
  │       │   ├─ lineWidth: [0.04]     [Inherited]
  │       │   └─ tubeDraw: (default)   [Inherited]
  │       └─ 📐 Polygon Shader            ← Sub-shader (expandable)
  │           ├─ diffuseColor: [Blue]  [Inherited]
  │           ├─ smoothShading: (default) [Inherited]
  │           └─ transparency: (default) [Inherited]
  └─ ▲ IndexedFaceSet
```

## Implementation Strategy

### 1. **Detect DefaultGeometryShader**

When an `Appearance` is selected, check if it should show a `DefaultGeometryShader`:

```javascript
import { DefaultGeometryShader } from '../shader/index.js';

#buildTreeNode(node, parentElement) {
  // ... existing code ...
  
  // Special handling for Appearance nodes
  if (node instanceof Appearance) {
    // Add DefaultGeometryShader as a "virtual child"
    const shaderVirtualNode = {
      type: 'DefaultGeometryShader',
      appearance: node,
      getName: () => 'Geometry Shader',
      // Virtual node - not a real scene graph object
      isVirtual: true
    };
    
    // Build tree node for the shader
    this.#buildTreeNode(shaderVirtualNode, childrenDiv);
  }
}
```

### 2. **Expand DefaultGeometryShader to Show Sub-Shaders**

When `DefaultGeometryShader` virtual node is expanded, show the three sub-shaders:

```javascript
#buildTreeNode(node, parentElement) {
  // ... existing code ...
  
  // Special handling for DefaultGeometryShader virtual node
  if (node.type === 'DefaultGeometryShader') {
    const header = document.createElement('div');
    header.className = 'sg-tree-node-header';
    
    // Icon
    const icon = document.createElement('span');
    icon.className = 'sg-tree-icon';
    icon.textContent = '🎭'; // Geometry shader icon
    
    // Label
    const label = document.createElement('span');
    label.className = 'sg-tree-label';
    label.textContent = 'Geometry Shader';
    
    // Type
    const type = document.createElement('span');
    type.className = 'sg-tree-type';
    type.textContent = 'DefaultGeometryShader';
    
    header.appendChild(icon);
    header.appendChild(label);
    header.appendChild(type);
    
    header.onclick = () => {
      this.#selectNode(node);
    };
    
    nodeDiv.appendChild(header);
    
    // Children: the three sub-shaders
    const childrenDiv = document.createElement('div');
    childrenDiv.className = 'sg-tree-children';
    if (!this.#expandedNodes.has(node)) {
      childrenDiv.classList.add('collapsed');
    }
    
    // Add three sub-shader virtual nodes
    for (const subShaderDef of DefaultGeometryShader.SUB_SHADERS) {
      const subShaderNode = {
        type: subShaderDef.type + 'Shader',
        shaderType: subShaderDef.type,
        shader: subShaderDef.shader,
        appearance: node.appearance,
        getName: () => subShaderDef.name,
        isVirtual: true,
        parentShader: node
      };
      
      this.#buildTreeNode(subShaderNode, childrenDiv);
    }
    
    nodeDiv.appendChild(childrenDiv);
  }
}
```

### 3. **Property Panel for DefaultGeometryShader**

When `DefaultGeometryShader` is selected, show the three show flags:

```javascript
#updatePropertyPanel(node) {
  // ... existing code ...
  
  if (node.type === 'DefaultGeometryShader') {
    this.#addGeometryShaderProperties(node);
  } else if (node.type === 'pointShader' || node.type === 'lineShader' || node.type === 'polygonShader') {
    this.#addSubShaderProperties(node);
  }
}

#addGeometryShaderProperties(shaderNode) {
  const appearance = shaderNode.appearance;
  
  const properties = [
    {
      label: 'Show Points',
      value: this.#getShowFlagValue(appearance, 'vertexDraw', 'showPoints'),
      editable: true,
      onChange: (val) => {
        appearance.setAttribute(CommonAttributes.VERTEX_DRAW, val);
        this.#triggerRender();
        this.#updatePropertyPanel(shaderNode);
      }
    },
    {
      label: 'Show Lines',
      value: this.#getShowFlagValue(appearance, 'edgeDraw', 'showLines'),
      editable: true,
      onChange: (val) => {
        appearance.setAttribute(CommonAttributes.EDGE_DRAW, val);
        this.#triggerRender();
        this.#updatePropertyPanel(shaderNode);
      }
    },
    {
      label: 'Show Faces',
      value: this.#getShowFlagValue(appearance, 'faceDraw', 'showFaces'),
      editable: true,
      onChange: (val) => {
        appearance.setAttribute(CommonAttributes.FACE_DRAW, val);
        this.#triggerRender();
        this.#updatePropertyPanel(shaderNode);
      }
    }
  ];
  
  this.#addPropertyGroup('Geometry Shader', properties);
}

#getShowFlagValue(appearance, attrName, fallbackAttr) {
  // Try CommonAttributes key first
  let value = appearance.getAttribute(attrName);
  if (value !== INHERITED && value !== undefined) {
    return value;
  }
  
  // Try fallback name
  value = appearance.getAttribute(fallbackAttr);
  if (value !== INHERITED && value !== undefined) {
    return value;
  }
  
  // Return default
  return DefaultGeometryShader.getDefault(fallbackAttr);
}
```

### 4. **Property Panel for Sub-Shaders**

When a sub-shader (Point/Line/Polygon) is selected, show all its attributes:

```javascript
#addSubShaderProperties(shaderNode) {
  const { shaderType, shader, appearance } = shaderNode;
  
  const properties = [];
  
  for (const attr of shader.ATTRIBUTES) {
    const key = `${shaderType}.${attr}`;
    const value = appearance.getAttribute(key);
    const defaultValue = shader.getDefault(attr);
    
    if (value === INHERITED || value === undefined) {
      // Show "Inherited" button
      properties.push(
        this.#createInheritedProperty(key, attr, defaultValue, appearance)
      );
    } else {
      // Show widget + "Inherited" button
      properties.push(
        this.#createSetProperty(key, attr, value, defaultValue, appearance)
      );
    }
  }
  
  this.#addPropertyGroup(shaderNode.getName(), properties);
}
```

### 5. **Inherited Property Display**

```javascript
#createInheritedProperty(key, attrName, defaultValue, appearance) {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  `;
  
  // Default value hint (subtle, in parentheses)
  const hint = document.createElement('span');
  hint.style.cssText = `
    color: #858585;
    font-size: 11px;
    font-style: italic;
    flex: 1;
  `;
  hint.textContent = `(default: ${this.#formatValue(defaultValue)})`;
  
  // "Inherited" button
  const inheritedBtn = document.createElement('button');
  inheritedBtn.className = 'sg-inherited-button';
  inheritedBtn.textContent = 'Inherited';
  inheritedBtn.style.cssText = `
    background: #3c3c3c;
    color: #cccccc;
    border: 1px solid #555;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    flex-shrink: 0;
  `;
  
  inheritedBtn.onclick = () => {
    // Set to default value (user can then edit)
    appearance.setAttribute(key, defaultValue);
    this.#triggerRender();
    this.#updatePropertyPanel(appearance);
  };
  
  container.appendChild(hint);
  container.appendChild(inheritedBtn);
  
  return {
    label: attrName,
    value: container,
    editable: false
  };
}
```

### 6. **Set Property Display**

```javascript
#createSetProperty(key, attrName, value, defaultValue, appearance) {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  `;
  
  // Editable widget (based on value type)
  const widgetContainer = document.createElement('div');
  widgetContainer.style.flex = '1';
  
  const widget = this.#createEditableWidget(value, (newValue) => {
    appearance.setAttribute(key, newValue);
    this.#triggerRender();
  });
  
  widgetContainer.appendChild(widget);
  
  // "Inherited" button (blue - indicates it will remove the value)
  const inheritedBtn = document.createElement('button');
  inheritedBtn.className = 'sg-inherited-button active';
  inheritedBtn.textContent = 'Inherited';
  inheritedBtn.title = 'Click to restore inherited value';
  inheritedBtn.style.cssText = `
    background: #007acc;
    color: #ffffff;
    border: 1px solid #007acc;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    flex-shrink: 0;
  `;
  
  inheritedBtn.onclick = () => {
    // Remove the attribute, restore inheritance
    appearance.setAttribute(key, INHERITED);
    this.#triggerRender();
  };
  
  container.appendChild(widgetContainer);
  container.appendChild(inheritedBtn);
  
  return {
    label: attrName,
    value: container,
    editable: false
  };
}
```

### 7. **Widget Creation**

```javascript
#createEditableWidget(value, onChange) {
  // Color widget
  if (ColorPickerWidget.isColorValue(value)) {
    const widget = new ColorPickerWidget(value, onChange);
    return widget.getElement();
  }
  
  // Boolean widget (checkbox)
  if (typeof value === 'boolean') {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = value;
    checkbox.onchange = () => onChange(checkbox.checked);
    return checkbox;
  }
  
  // Number widget
  if (typeof value === 'number') {
    const widget = new NumberWidget('', value, onChange);
    return widget.getElement();
  }
  
  // String widget
  if (typeof value === 'string') {
    return this.#createTextInput(value, onChange);
  }
  
  // Fallback: plain text
  const span = document.createElement('span');
  span.textContent = this.#formatValue(value);
  return span;
}
```

## Visual Example

### Tree View

```
▼ 📦 testTriangle
  ├─ 🔄 Transformation
  ├─ ▼ 🎨 Appearance
  │   └─ ▼ 🎭 Geometry Shader              ← Click to see show flags
  │       ├─ 📍 Point Shader                ← Click to see point attrs
  │       ├─ 📏 Line Shader                 ← Click to see line attrs
  │       └─ 📐 Polygon Shader              ← Click to see polygon attrs
  └─ ▲ IndexedFaceSet
```

### Property Panel (Geometry Shader Selected)

```
┌──────────────────────────────────────┐
│ Geometry Shader                      │
├──────────────────────────────────────┤
│ Show Points   ☑                      │
│ Show Lines    ☑                      │
│ Show Faces    ☑                      │
└──────────────────────────────────────┘
```

### Property Panel (Point Shader Selected)

```
┌──────────────────────────────────────────────────┐
│ Point Shader                                     │
├──────────────────────────────────────────────────┤
│ diffuseColor   [████ Red  ]       [Inherited]    │ ← Blue button
│ spheresDraw    (default: true)    [Inherited]    │ ← Gray button
│ pointRadius    [    0.050    ]    [Inherited]    │ ← Blue button
│ pointSize      (default: 3.0)     [Inherited]    │ ← Gray button
│ ...                                              │
└──────────────────────────────────────────────────┘
```

## Benefits of This Approach

1. **Logical Organization**: Mirrors the conceptual structure (GeometryShader → Sub-shaders)
2. **Clean Separation**: Show flags (top level) vs detailed attributes (sub-shaders)
3. **Discoverability**: Users can see the three sub-shader types even if no attributes are set
4. **Expandable**: Easy to add more shader types (text, etc.) later
5. **Consistent UX**: Familiar tree-based navigation like file explorers

## Implementation Checklist

- [ ] Add virtual node support to tree building
- [ ] Detect and create DefaultGeometryShader virtual nodes under Appearance
- [ ] Create sub-shader virtual nodes under DefaultGeometryShader
- [ ] Add icons for shader types (🎭 📍 📏 📐)
- [ ] Implement #addGeometryShaderProperties() for show flags
- [ ] Implement #addSubShaderProperties() for shader attributes
- [ ] Implement #createInheritedProperty() for unset attributes
- [ ] Implement #createSetProperty() for set attributes
- [ ] Implement #createEditableWidget() for type-safe editing
- [ ] Add CSS for inherited/set button states
- [ ] Test toggling show flags
- [ ] Test setting/unsetting shader attributes
- [ ] Test with multiple appearances in same scene

## Next Steps

Would you like me to:
1. **Implement this full integration** in `SceneGraphInspector.js`?
2. **Create a prototype/demo** first to validate the UX?
3. **Start with just the tree structure** (without inherited buttons)?
4. **Focus on one sub-shader** (e.g., Point) first, then generalize?

