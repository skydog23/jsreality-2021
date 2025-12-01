# Inspector Double-Render Issue - Fix

## Problem

When modifying properties in the SceneGraphInspector, **two renders were being triggered** for each property change.

## Root Cause

The inspector's property change callbacks were calling `onPropertyChange()` **twice**:

1. **ShaderPropertyManager** (line 356):
   ```javascript
   const widget = this.#widgetFactory.createWidgetForValue(displayName, value, (newValue) => {
     appearance.setAttribute(fullKey, newValue);
     this.#onPropertyChange();  // ← FIRST RENDER
     this.#onRefreshPropertyPanel(shaderNode);
   });
   ```

2. **PropertyPanelManager** (line 345):
   ```javascript
   const propertyDef = this.#widgetFactory.createEditableProperty(key, value, (newValue) => {
     appearance.setAttribute(key, newValue);
     this.#onPropertyChange();  // ← SECOND RENDER
     this.#onRefreshPropertyPanel(appearance);
   });
   ```

Both code paths would execute for a single property modification, causing two render calls.

## Solution

Implemented **render debouncing** in `SceneGraphInspector` constructor:

```javascript
const onPropertyChange = () => {
  // Debounce render calls - wait for all property updates to complete
  // before triggering a single render
  if (this.#renderTimeoutId !== null) {
    clearTimeout(this.#renderTimeoutId);
  }
  
  this.#renderTimeoutId = setTimeout(() => {
    this.#renderTimeoutId = null;
    // Trigger viewer render if available
    if (typeof window !== 'undefined' && window._viewerInstance) {
      window._viewerInstance.render();
    }
  }, 0); // Use timeout of 0 to batch synchronous updates
};
```

### How It Works

1. **First `onPropertyChange()` call** → Schedules a render using `setTimeout(..., 0)`
2. **Second `onPropertyChange()` call** (happens immediately) → Cancels the first scheduled render and schedules a new one
3. **After all synchronous code completes** → The timeout fires → **Single render**

This pattern:
- ✅ Batches multiple rapid property changes into one render
- ✅ Ensures render happens after all property updates complete
- ✅ Improves performance by eliminating redundant renders
- ✅ Makes the system more responsive to rapid changes

## Testing

After the fix:
1. Open `test/test-jsrapp.html`
2. Open browser console
3. Modify a property in the inspector
4. Observe console logs - should see only **ONE** render per property change:
   ```
   [InspectorPlugin] window._viewerInstance.render() called, emitting event
   [InspectorPlugin] inspector:property-changed event received, calling context.render()
   [Canvas2DViewer] render() called
   [Canvas2DViewer] render() complete
   ```

## Benefits

- **Performance**: Reduces render calls by 50% for property changes
- **Consistency**: Guarantees only one render per user action
- **Extensibility**: Can easily adjust debounce timeout if needed
- **Maintainability**: Centralized render batching logic in one place

## Future Improvements

Consider extending this pattern to:
1. Batch multiple property changes (e.g., when dragging a slider)
2. Use `requestAnimationFrame` for even better performance
3. Make debounce timeout configurable
4. Add option to disable debouncing for debugging

## Files Modified

- `/src/core/inspect/SceneGraphInspector.js` - Added render debouncing logic

