# SVGViewer Resize Implementation

## Overview

Added automatic resize functionality to `SVGViewer` to match the behavior of `Canvas2DViewer` and `WebGL2DViewer`. All three viewer implementations now automatically resize when their container element changes size.

## Changes Made

### 1. SVGViewer.js - Added ResizeObserver

**Location:** `/src/core/viewers/SVGViewer.js`

**Added fields:**
- `#container: HTMLElement` - Reference to the container element
- `#autoResize: boolean` - Flag to enable/disable automatic resizing (default: true)

**Added methods:**
- `#setupResizeHandling()` - Creates a ResizeObserver that watches the container
- `#updateSize()` - Updates internal dimensions and SVG attributes when container resizes

**Updated constructor:**
- Now accepts `autoResize` option (defaults to true)
- Stores reference to container element
- Calls `#setupResizeHandling()` if autoResize is enabled

**How it works:**
1. ResizeObserver watches the container element for size changes
2. When container resizes, `#updateSize()` is called
3. Updates internal `#width` and `#height` fields
4. Updates SVG element's `width`, `height`, and `viewBox` attributes
5. Calls `render()` to redraw the scene at the new size

### 2. ViewerSwitch.js - Added Render Call After Switch

**Location:** `/src/core/viewers/ViewerSwitch.js`

**Enhancement to `selectViewer()` method:**
- Now calls `render()` (or `renderAsync()` if available) after switching viewers
- Ensures the new viewer displays the scene immediately
- Uses async rendering when possible to avoid blocking

**Why this was needed:**
- Previously, switching viewers would show an empty canvas until something triggered a render
- Now the scene appears immediately when switching

## How Resize Works Across All Viewers

### Canvas2DViewer
- **Mechanism:** ResizeObserver on canvas element
- **Behavior:** Reads `clientWidth/clientHeight`, updates canvas bitmap size with pixel ratio scaling
- **Implementation:** Already existed before this change

### WebGL2DViewer
- **Mechanism:** ResizeObserver on canvas element
- **Behavior:** Reads `clientWidth/clientHeight`, updates canvas size and WebGL viewport
- **Implementation:** Already existed before this change

### SVGViewer
- **Mechanism:** ResizeObserver on container element (NEW)
- **Behavior:** Reads container `clientWidth/clientHeight`, updates SVG attributes
- **Implementation:** Added in this change

## Testing

A test page has been created to verify the resize functionality:

**Location:** `/test/svg-resize-test.html`

**Features:**
- Displays a grid and circle using SVGViewer
- Three buttons to resize container: Small (400×300), Medium (800×600), Large (1200×800)
- Real-time display of container and SVG dimensions
- Smooth transitions between sizes

**To test:**
1. Open `test/svg-resize-test.html` in a browser
2. Click the resize buttons
3. Verify that:
   - Container size changes smoothly
   - SVG dimensions update to match container
   - Grid and circle render correctly at all sizes
   - No distortion or clipping occurs

## Integration with ViewerSwitch

With these changes, `ViewerSwitch` now works seamlessly with all three viewer types:

1. **Switching viewers:** 
   - ViewerSwitch adds/removes viewer components from wrapper element
   - Each viewer's ResizeObserver automatically fires when added to DOM
   - Viewer resizes itself to match container dimensions
   - ViewerSwitch calls `render()` to display scene immediately

2. **Browser window resize:**
   - CSS layout updates container size
   - Each viewer's ResizeObserver fires automatically
   - Viewer updates its dimensions and re-renders
   - No manual intervention needed

## Backwards Compatibility

All changes are backwards compatible:

- **SVGViewer:** `autoResize` defaults to `true`, maintaining current behavior for new code
- **Existing code:** If `autoResize: false` is passed, ResizeObserver is not created
- **ViewerSwitch:** Render call is added behavior, doesn't break existing functionality

## Benefits

1. **Consistency:** All viewers now handle resize the same way
2. **Automatic:** No manual resize handling needed in application code
3. **Responsive:** Works with any CSS layout (flexbox, grid, media queries, etc.)
4. **Efficient:** Only re-renders when size actually changes
5. **Clean:** ViewerSwitch doesn't need viewer-specific resize code

## Example Usage

```javascript
// Create SVG viewer - dimensions automatically read from container
const svgViewer = new SVGViewer(container);

// Or explicitly disable auto-resize if needed
const svgViewer = new SVGViewer(container, {
    autoResize: false  // Disable automatic resizing
});
```

**ViewerSwitch automatically works with all viewers:**
```javascript
const viewerSwitch = new ViewerSwitch([
    new Canvas2DViewer(canvas1),
    new WebGL2DViewer(canvas2),
    new SVGViewer(container3)  // No width/height needed!
]);

// Switch between viewers - resize happens automatically
viewerSwitch.selectViewer(0); // Canvas2D
viewerSwitch.selectViewer(1); // WebGL2D  
viewerSwitch.selectViewer(2); // SVG - now resizes properly!
```

## Future Enhancements

Possible improvements for the future:

1. **Manual resize method:** Add public `resize(width, height)` method for programmatic control
2. **Resize throttling:** Add option to throttle resize events for performance
3. **Min/max dimensions:** Add constraints for minimum/maximum viewer size
4. **Aspect ratio lock:** Add option to maintain specific aspect ratio
5. **Resize events:** Emit events when viewer is resized for application monitoring

