# Inspector Enhancement: Shader Attributes with Inherited Button

## Current State

The inspector currently shows only **explicitly set** attributes for `Appearance` nodes (line 1035-1057 in `SceneGraphInspector.js`):

```javascript
#addAppearanceProperties(appearance) {
  const attrs = appearance.getStoredAttributes(); // Only explicitly set attrs
  // ... display each attribute
}
```

## Proposed Enhancement

Display **all possible shader attributes** for an appearance, showing:
- Explicitly set attributes with editable widgets
- Inherited attributes with an "Inherited" button
- Clicking "Inherited" allows setting an explicit value
- Clicking "Inherited" again restores inheritance

## Design Proposal

### 1. **Detect Shader Type(s)**

When an `Appearance` is selected, determine which shader types are relevant:

```javascript
#getRelevantShaderTypes(appearance) {
  // Check which shader types are needed based on what's set
  const types = [];
  
  // Check for point attributes
  const hasPointAttrs = Array.from(appearance.getStoredAttributes())
    .some(key => key.startsWith('point.'));
  if (hasPointAttrs) types.push('point');
  
  // Check for line attributes
  const hasLineAttrs = Array.from(appearance.getStoredAttributes())
    .some(key => key.startsWith('line.'));
  if (hasLineAttrs) types.push('line');
  
  // Check for polygon attributes
  const hasPolygonAttrs = Array.from(appearance.getStoredAttributes())
    .some(key => key.startsWith('polygon.'));
  if (hasPolygonAttrs) types.push('polygon');
  
  // Always show all three if none are set (allow user to start adding)
  if (types.length === 0) {
    types.push('point', 'line', 'polygon');
  }
  
  return types;
}
```

### 2. **Build Shader Attribute Groups**

For each shader type, display all possible attributes:

```javascript
import { DefaultPointShader, DefaultLineShader, DefaultPolygonShader } from '../shader/index.js';
import { INHERITED } from '../scene/Appearance.js';

#addAppearanceProperties(appearance) {
  const shaderTypes = this.#getRelevantShaderTypes(appearance);
  
  // Build attribute groups for each shader type
  for (const shaderType of shaderTypes) {
    const shader = {
      'point': DefaultPointShader,
      'line': DefaultLineShader,
      'polygon': DefaultPolygonShader
    }[shaderType];
    
    const groupTitle = shaderType.charAt(0).toUpperCase() + shaderType.slice(1) + ' Shader';
    this.#addShaderAttributeGroup(groupTitle, shaderType, shader, appearance);
  }
}
```

### 3. **Shader Attribute Group Display**

For each attribute in the shader:

```javascript
#addShaderAttributeGroup(groupTitle, shaderType, shader, appearance) {
  const properties = [];
  
  for (const attr of shader.ATTRIBUTES) {
    const key = `${shaderType}.${attr}`;
    const value = appearance.getAttribute(key);
    const defaultValue = shader.getDefault(attr);
    
    if (value === INHERITED) {
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
  
  this.#addPropertyGroup(groupTitle, properties);
}
```

### 4. **Inherited Property (Not Set)**

Display attribute name, default value hint, and "Inherited" button to set:

```javascript
#createInheritedProperty(key, attrName, defaultValue, appearance) {
  const container = document.createElement('div');
  container.className = 'sg-shader-attr-inherited';
  container.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  `;
  
  // Default value hint (subtle, in parentheses)
  const hint = document.createElement('span');
  hint.className = 'sg-inherited-hint';
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
  
  inheritedBtn.onmouseenter = () => {
    inheritedBtn.style.background = '#4a4a4a';
    inheritedBtn.style.borderColor = #666';
  };
  
  inheritedBtn.onmouseleave = () => {
    inheritedBtn.style.background = '#3c3c3c';
    inheritedBtn.style.borderColor = '#555';
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

### 5. **Set Property (Has Value)**

Display editable widget + "Inherited" button to restore inheritance:

```javascript
#createSetProperty(key, attrName, value, defaultValue, appearance) {
  const container = document.createElement('div');
  container.className = 'sg-shader-attr-set';
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
    this.#updatePropertyPanel(appearance);
  });
  
  widgetContainer.appendChild(widget);
  
  // "Inherited" button (different style - indicates it will remove the value)
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
    this.#updatePropertyPanel(appearance);
  };
  
  inheritedBtn.onmouseenter = () => {
    inheritedBtn.style.background = '#1177bb';
  };
  
  inheritedBtn.onmouseleave = () => {
    inheritedBtn.style.background = '#007acc';
  };
  
  container.appendChild(widgetContainer);
  container.appendChild(inheritedBtn);
  
  return {
    label: attrName,
    value: container,
    editable: false // Container handles its own editing
  };
}
```

### 6. **Widget Creation Helper**

Create appropriate widget based on value type:

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

### 7. **Render Trigger Helper**

```javascript
#triggerRender() {
  if (typeof window !== 'undefined' && window._viewerInstance) {
    window._viewerInstance.render();
  }
}
```

## Visual Design

### Inherited State (Not Set)

```
┌─────────────────────────────────────────────────────┐
│ Point Shader                                        │
├─────────────────────────────────────────────────────┤
│ diffuseColor    (default: rgb(255,0,0))  [Inherited]│
│ spheresDraw     (default: true)          [Inherited]│
│ pointRadius     (default: 0.025)         [Inherited]│
│ pointSize       (default: 3.0)           [Inherited]│
└─────────────────────────────────────────────────────┘
```

### Mixed State (Some Set, Some Inherited)

```
┌─────────────────────────────────────────────────────┐
│ Point Shader                                        │
├─────────────────────────────────────────────────────┤
│ diffuseColor    [████ Red  ]             [Inherited]│ ← Blue button
│ spheresDraw     (default: true)          [Inherited]│ ← Gray button
│ pointRadius     [    0.050    ]          [Inherited]│ ← Blue button
│ pointSize       (default: 3.0)           [Inherited]│ ← Gray button
└─────────────────────────────────────────────────────┘
```

**Button States:**
- **Gray "Inherited" button**: Not set, click to set to default (then editable)
- **Blue "Inherited" button**: Is set, click to remove and restore inheritance

## CSS Additions

```css
.sg-shader-attr-inherited {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.sg-shader-attr-set {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.sg-inherited-hint {
  color: #858585;
  font-size: 11px;
  font-style: italic;
  flex: 1;
}

.sg-inherited-button {
  background: #3c3c3c;
  color: #cccccc;
  border: 1px solid #555;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  flex-shrink: 0;
  transition: all 0.15s;
}

.sg-inherited-button:hover {
  background: #4a4a4a;
  border-color: #666;
}

.sg-inherited-button.active {
  background: #007acc;
  color: #ffffff;
  border-color: #007acc;
}

.sg-inherited-button.active:hover {
  background: #1177bb;
}
```

## Benefits

1. **Complete Attribute Visibility**: See all possible shader attributes, not just the set ones
2. **Clear Inheritance State**: Immediately see which attributes are inherited vs explicitly set
3. **Easy Toggling**: One-click to set/unset attributes
4. **Default Value Hints**: See what the inherited value actually is
5. **Type-Safe**: Uses shader schemas to ensure only valid attributes are shown
6. **Extensible**: Easy to add new shader types or attributes

## Implementation Phases

### Phase 1: Basic Infrastructure
1. Add shader imports to `SceneGraphInspector.js`
2. Implement `#getRelevantShaderTypes()`
3. Implement `#addShaderAttributeGroup()`

### Phase 2: Inherited Property Display
4. Implement `#createInheritedProperty()`
5. Add CSS for inherited state
6. Test with unset attributes

### Phase 3: Set Property Display
7. Implement `#createSetProperty()`
8. Implement `#createEditableWidget()`
9. Add CSS for set state
10. Test toggling between states

### Phase 4: Polish
11. Add tooltips/hints
12. Optimize performance (cache shader types)
13. Add keyboard shortcuts (e.g., 'I' to toggle inheritance)

## Questions for Discussion

1. **Auto-detect shader types**: Should we show all three (point/line/polygon) by default, or only show types that have at least one attribute set?

2. **Grouping**: Should we use collapsible groups for each shader type to reduce visual clutter?

3. **Default value display**: Show as hint text, tooltip, or separate column?

4. **Button label**: "Inherited" vs "Default" vs "Reset" vs icon (↺)?

5. **Confirmation**: Should removing a set attribute (restoring inheritance) require confirmation?

## Next Steps

Would you like me to:
1. **Implement the basic version** (Phase 1-2) with inherited attributes only?
2. **Create a mockup/prototype** first to validate the UX?
3. **Discuss the design questions** above before implementing?
4. **Implement the full version** (all phases) right away?

