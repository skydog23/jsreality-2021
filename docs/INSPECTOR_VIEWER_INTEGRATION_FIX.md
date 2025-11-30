# Inspector-Viewer Integration Fix

## Problem

The SceneGraphInspector was not triggering renders properly when using multiple viewers or ViewerSwitch.

### Root Cause

The inspector calls `window._viewerInstance.render()` when properties are changed (see `SceneGraphInspector.js` line 93-95).

In `canvas2d-inspector.html`, this was being set to individual viewer instances:
```javascript
window._viewerInstance = currentViewer; // Wrong!
```

When switching between viewers, the code updated this reference:
```javascript
window._viewerInstance = currentViewer; // Still wrong!
```

**The problem:** After switching viewers, the inspector would call `render()` on the OLD viewer instance, not the current one.

## Solution

Use a closure-based approach that always calls render on the currently active viewer:

```javascript
window._viewerInstance = {
    render: () => {
        if (currentViewer) {
            currentViewer.render();
        }
    }
};
```

This creates a proxy object with a `render()` method that:
1. Uses closure to access the `currentViewer` variable
2. Always calls the current viewer's render method
3. Works automatically when `currentViewer` is reassigned during viewer switches

## Best Practices

### For Single Viewer Apps
```javascript
const viewer = new Canvas2DViewer(canvas);
window._viewerInstance = viewer; // Direct reference is fine
```

### For Apps with ViewerSwitch
```javascript
const viewerSwitch = new ViewerSwitch([viewer1, viewer2, viewer3]);
window._viewerInstance = viewerSwitch; // ViewerSwitch.render() delegates to current viewer
```

### For Apps with JSRViewer
```javascript
const jsrViewer = new JSRViewer({ container, viewers });
window._viewerInstance = jsrViewer; // JSRViewer.render() delegates to ViewerSwitch
```

### For Manual Viewer Switching (like canvas2d-inspector.html)
```javascript
let currentViewer = viewer1;
window._viewerInstance = {
    render: () => currentViewer.render()
};
```

## Future Improvements

The inspector's reliance on `window._viewerInstance` is a temporary solution. Future improvements:

1. **Pass render callback to inspector constructor:**
```javascript
const inspector = new SceneGraphInspector(container, sceneRoot, {
    onRender: () => viewer.render()
});
```

2. **Event-based updates:**
```javascript
inspector.on('property-changed', () => viewer.render());
```

3. **Automatic detection via Viewer registry:**
```javascript
// Inspector could look up the viewer for a given scene root
const viewer = Viewer.getViewerForSceneRoot(sceneRoot);
viewer.render();
```

## Testing

To verify the fix works:
1. Open `test/canvas2d-inspector.html`
2. Select a component in the tree view
3. Modify an appearance attribute in the property panel
4. The change should appear immediately in the rendered view
5. Switch to a different viewer (View menu → Renderer)
6. Modify another property
7. The change should still appear immediately

## Files Modified

- `/Users/gunn/Software/cursor/jsreality-2021/test/canvas2d-inspector.html`
  - Changed `window._viewerInstance` from direct viewer reference to closure-based proxy

## Related Files

- `/Users/gunn/Software/cursor/jsreality-2021/src/core/inspect/SceneGraphInspector.js` (line 93-95)
  - Where the inspector calls `window._viewerInstance.render()`
- `/Users/gunn/Software/cursor/jsreality-2021/src/core/viewers/ViewerSwitch.js` (line 393-395)
  - ViewerSwitch.render() implementation
- `/Users/gunn/Software/cursor/jsreality-2021/src/app/JSRViewer.js` (line 587-591)
  - JSRViewer.render() implementation

## Implementation Notes

### Why ViewerSwitch is Correct

ViewerSwitch properly:
1. Synchronizes scene root and camera path when switching (lines 315-320)
2. Delegates render() to current viewer (line 394)
3. Registers/unregisters components correctly (lines 238-297)

The architecture is sound - the only issue was how `window._viewerInstance` was being set in test files.

