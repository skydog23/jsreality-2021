# Inspector Plugin Architecture

## Overview

The `InspectorPlugin` properly integrates the `SceneGraphInspector` with JSRViewer's plugin system and event bus, eliminating the need for the global `window._viewerInstance` hack.

## Architecture

```
┌─────────────────┐
│   JSRViewer     │
│  ┌───────────┐  │
│  │ EventBus  │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────┴──────────────┐
│  │  PluginManager     │
│  └─────┬──────────────┘
│        │
│  ┌─────┴──────────────┐
│  │ InspectorPlugin    │
│  │  ┌──────────────┐  │
│  │  │ Inspector    │  │
│  │  │ (property    │  │
│  │  │  changes)    │  │
│  │  └──────┬───────┘  │
│  │         │          │
│  │    emit('property- │
│  │         changed')  │
│  └─────────┼──────────┘
│            │
│      context.render() │
└────────────┼──────────┘
             ▼
       ViewerSwitch
             ▼
       Current Viewer
```

## How It Works

### 1. Plugin Registration

```javascript
const inspectorContainer = document.getElementById('inspector-container');
await viewer.registerPlugin(new InspectorPlugin(inspectorContainer));
```

### 2. Inspector Property Changes

When a user modifies a property in the inspector:

1. **SceneGraphInspector** detects the change and calls `window._viewerInstance.render()`
2. **InspectorPlugin** provides this `window._viewerInstance` object
3. The render() call emits an `'inspector:property-changed'` event
4. **InspectorPlugin** listens to this event and calls `context.render()`
5. **PluginContext** forwards to `JSRViewer.render()`
6. **JSRViewer** delegates to `ViewerSwitch.render()`
7. **ViewerSwitch** calls `currentViewer.render()`
8. The scene is re-rendered with the updated properties

### 3. Event Flow

```javascript
// In InspectorPlugin.install():
window._viewerInstance = {
  render: () => {
    this.emit('inspector:property-changed');  // Emit event
  }
};

this.on('inspector:property-changed', () => {
  context.render();  // Trigger render through proper infrastructure
});
```

## Benefits

1. **No Global Pollution**: Uses plugin event system instead of `window._viewerInstance`
2. **Proper Lifecycle**: Inspector is created/destroyed with plugin
3. **Event-Driven**: Uses EventBus for communication
4. **Decoupled**: Inspector doesn't need to know about JSRViewer
5. **Extensible**: Other plugins can listen to `'inspector:property-changed'` events

## Usage

### Basic Setup

```javascript
import { JSRViewer } from './app/JSRViewer.js';
import { InspectorPlugin } from './app/plugins/InspectorPlugin.js';

const viewer = new JSRViewer({
  container: document.getElementById('viewer-container'),
  viewers: [canvasViewer]
});

// Register inspector plugin
const inspectorContainer = document.getElementById('inspector-panel');
await viewer.registerPlugin(new InspectorPlugin(inspectorContainer));

// Set content and display
viewer.setContent(sceneGraph);
```

### Accessing the Inspector

```javascript
const inspectorPlugin = viewer.getPlugin('scene-graph-inspector');
const inspector = inspectorPlugin.getInspector();

// Manually refresh inspector
inspectorPlugin.refresh();
```

### Listening to Inspector Events

Other plugins can listen to inspector events:

```javascript
class MyPlugin extends JSRPlugin {
  async install(viewer, context) {
    await super.install(viewer, context);
    
    // Listen for property changes
    this.on('inspector:property-changed', () => {
      console.log('Scene properties were modified');
      // Do something in response
    });
  }
}
```

## Migration from Old Approach

### Before (Manual Setup)

```javascript
// Old approach - NOT RECOMMENDED
const inspector = new SceneGraphInspector(container, sceneRoot);
window._viewerInstance = viewer;  // Global hack
```

### After (Plugin-Based)

```javascript
// New approach - RECOMMENDED
await viewer.registerPlugin(new InspectorPlugin(container));
```

## Future Improvements

1. **Remove `window._viewerInstance` Bridge**
   - Refactor `SceneGraphInspector` to accept a render callback
   - Pass callback in constructor instead of using global

2. **Side Panel Integration**
   - When side panel system is implemented, integrate inspector automatically
   - Provide toggle to show/hide inspector

3. **Multiple Inspectors**
   - Support multiple inspector instances
   - Different views of the same scene graph

## Implementation Notes

The `InspectorPlugin` serves as a bridge between the legacy `SceneGraphInspector` (which uses `window._viewerInstance`) and the new plugin architecture (which uses the event bus). This allows us to use the existing inspector code while properly integrating it with the infrastructure.

Eventually, `SceneGraphInspector` should be refactored to accept a render callback directly, eliminating the need for the `window._viewerInstance` bridge entirely.

## Related Files

- `/src/app/plugins/InspectorPlugin.js` - Plugin implementation
- `/src/core/inspect/SceneGraphInspector.js` - Core inspector (legacy)
- `/test/test-jsrapp.html` - Example usage

