# Inspector-Viewer Integration: Infrastructure Solution

## Problem

The `SceneGraphInspector` was using a global `window._viewerInstance` hack to trigger renders, which:
- Polluted the global namespace
- Was fragile and error-prone
- Required manual setup in each HTML test file
- Didn't integrate with the plugin system
- Made it unclear where the render was being called from

## Solution

Created `InspectorPlugin` that properly integrates the inspector with JSRViewer's plugin system and event bus.

## Architecture

The inspector now works through the infrastructure:

```
User modifies property in UI
  ↓
SceneGraphInspector detects change
  ↓
Calls window._viewerInstance.render() [bridge]
  ↓
InspectorPlugin emits 'inspector:property-changed' event
  ↓
InspectorPlugin listener calls context.render()
  ↓
PluginContext forwards to JSRViewer.render()
  ↓
JSRViewer delegates to ViewerSwitch.render()
  ↓
ViewerSwitch calls currentViewer.render()
  ↓
Scene is re-rendered
```

## Usage

### Before (Manual, Fragile)

```javascript
import { SceneGraphInspector } from '../src/core/inspect/SceneGraphInspector.js';

const inspector = new SceneGraphInspector(container, sceneRoot);
window._viewerInstance = app.getViewer();  // Global hack!
inspector.refresh();
```

### After (Plugin-Based, Robust)

```javascript
import { InspectorPlugin } from '../src/app/plugins/InspectorPlugin.js';

await viewer.registerPlugin(new InspectorPlugin(container));
// That's it! Automatic integration with event system.
```

## Benefits

1. **Infrastructure-Level**: Uses plugin system and event bus
2. **No Manual Setup**: Plugin handles all wiring automatically
3. **Proper Lifecycle**: Inspector created/destroyed with plugin
4. **Event-Driven**: Uses EventBus for communication
5. **Decoupled**: Inspector doesn't need direct viewer reference
6. **Extensible**: Other plugins can listen to inspector events

## Files Modified

### New Files
- `/src/app/plugins/InspectorPlugin.js` - Plugin wrapper for inspector
- `/docs/INSPECTOR_PLUGIN_ARCHITECTURE.md` - Architecture documentation

### Modified Files
- `/src/app/plugins/index.js` - Export InspectorPlugin
- `/test/test-jsrapp.html` - Use InspectorPlugin instead of manual setup

## Implementation Details

The `InspectorPlugin` serves as a bridge:

```javascript
// In InspectorPlugin.install():
window._viewerInstance = {
  render: () => {
    this.emit('inspector:property-changed');  // Convert to event
  }
};

this.on('inspector:property-changed', () => {
  context.render();  // Render through proper infrastructure
});
```

This allows us to keep the existing `SceneGraphInspector` code (which uses `window._viewerInstance`) while properly integrating it with the plugin architecture.

## Testing

To test the fix:
1. Open `test/test-jsrapp.html`
2. Select a component in the inspector tree
3. Modify an appearance attribute (e.g., polygonShader.diffuseColor)
4. Verify the rendered scene updates immediately
5. The render is now going through: Inspector → InspectorPlugin → EventBus → PluginContext → JSRViewer → ViewerSwitch → Current Viewer

## Future Improvements

Eventually, refactor `SceneGraphInspector` to accept a render callback directly:

```javascript
const inspector = new SceneGraphInspector(container, sceneRoot, {
  onPropertyChange: () => viewer.render()
});
```

This would eliminate the `window._viewerInstance` bridge entirely, making the architecture even cleaner.

## Event API

Plugins can listen to inspector events:

```javascript
class MyPlugin extends JSRPlugin {
  async install(viewer, context) {
    await super.install(viewer, context);
    
    this.on('inspector:property-changed', () => {
      console.log('Scene properties were modified');
    });
  }
}
```

## Conclusion

The inspector is now properly integrated at the infrastructure level through the plugin system and event bus, eliminating the need for manual wiring in HTML test files and providing a clean, extensible architecture.

