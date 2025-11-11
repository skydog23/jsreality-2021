# Scene Graph Inspector

Interactive GUI tool for exploring and editing jSReality scene graphs in real-time.

## Features

- **Tree View**: Hierarchical display of scene graph structure with expand/collapse
- **Property Panel**: View and edit properties of selected nodes
- **Live Updates**: Automatically reflects scene graph changes (call `refresh()` after modifications)
- **Node Types Support**:
  - SceneGraphComponent (visibility, pickable, children count)
  - Transformation (4×4 matrix visualization)
  - Appearance (all attributes)
  - Geometry (vertex/edge/face counts, attributes)
  - Camera (perspective, FOV, near/far planes)

## Usage

### Basic Setup

```javascript
import { SceneGraphInspector } from './src/core/inspect/Inspector.js';
import { SceneGraphComponent } from './src/core/scene/SceneGraphComponent.js';

// Create your scene graph
const root = new SceneGraphComponent('root');
// ... add children, transformations, etc.

// Create inspector
const container = document.getElementById('inspector-container');
const inspector = new SceneGraphInspector(container, root);
```

### Container Requirements

The container element should have a defined height:

```html
<div id="inspector-container" style="height: 600px;"></div>
```

Or use flexbox/grid layout to size it.

### Refreshing the Inspector

After modifying the scene graph programmatically:

```javascript
// Modify scene graph
root.addChild(newComponent);

// Refresh inspector to reflect changes
inspector.refresh();
```

### Interactive Editing

The inspector supports interactive editing of certain properties:

- **Visibility**: Click checkbox to toggle component visibility
- **Pickability**: Click checkbox to toggle pickability

Changes are applied immediately to the scene graph.

## Styling

The inspector uses a dark theme similar to modern IDEs (VS Code style). It injects its own styles automatically, so no external CSS is required.

The styles are scoped with `sg-` prefixes to avoid conflicts with your application CSS.

## Example

See `test/inspector-test.html` for a complete working example with:
- Canvas2D viewer integration
- Dynamic scene graph modification
- Interactive controls

Run it with:
```bash
npm run serve
# Then open http://localhost:8000/test/inspector-test.html
```

## API Reference

### Constructor

```javascript
new SceneGraphInspector(container, root)
```

- `container` (HTMLElement): DOM element to contain the inspector
- `root` (SceneGraphComponent, optional): Root scene graph component

### Methods

#### `setRoot(root)`
Set or change the root scene graph component.

```javascript
inspector.setRoot(newRoot);
```

#### `refresh()`
Rebuild the tree view and property panel to reflect current scene graph state.

```javascript
inspector.refresh();
```

## Implementation Notes

- Uses ES6 private fields (`#`) for encapsulation
- Injects CSS styles once per page
- Tree nodes are rebuilt on each refresh (simple but effective)
- No external dependencies - pure vanilla JavaScript

## Future Enhancements

Potential improvements for future versions:

- [ ] Automatic updates via event listeners (no manual `refresh()` needed)
- [ ] Editable transformation matrices
- [ ] Add/remove nodes directly from inspector UI
- [ ] Copy/paste nodes
- [ ] Search/filter functionality
- [ ] Collapse all / expand all buttons
- [ ] Export scene graph as JSON
- [ ] Dark/light theme toggle
- [ ] Keyboard navigation
- [ ] Drag and drop to reorder nodes

