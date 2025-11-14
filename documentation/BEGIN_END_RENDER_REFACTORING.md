# Begin/End Render Refactoring

## Overview

Refactored the rendering pipeline to explicitly separate device-independent world2ndc transformation from device-specific setup/teardown.

## Problem

Previously, the world2ndc transformation was being applied inconsistently:
- **Canvas2D**: Applied in `_setupCanvasTransform()` (device-specific code)
- **SVG**: Was NOT being applied as an explicit transformation group

This made it unclear where the world2ndc transformation was happening and led to inconsistent behavior between renderers.

## Solution

Added explicit `beginRender()` and `endRender()` methods that:
1. Compute world2ndc (device-independent)
2. Call device-specific `_beginRender()` (setup context, clear, background)
3. **Apply world2ndc transformation** (device-independent via `_pushTransformState()` + `_applyTransform()`)
4. Render scene graph
5. **Pop world2ndc transformation** (device-independent via `_popTransformState()`)
6. Call device-specific `_endRender()` (cleanup)

## New Architecture

### Abstract2DRenderer (Device-Independent)

```javascript
beginRender() {
  // 1. Compute world2ndc
  const world2Cam = cameraPath.getInverseMatrix();
  const cam2ndc = CameraUtility.getCameraToNDC(this.#viewer);
  Rn.timesMatrix(this.#world2ndc, cam2ndc, world2Cam);
  
  // 2. Device-specific setup
  this._beginRender();
  
  // 3. Apply world2ndc transformation (device-independent!)
  this._pushTransformState();
  this._applyTransform(this.#world2ndc);
}

render() {
  if (!this.beginRender()) return;
  sceneRoot.accept(this);  // Traverse scene graph
  this.endRender();
}

endRender() {
  // 1. Pop world2ndc transformation (device-independent!)
  this._popTransformState();
  
  // 2. Device-specific cleanup
  this._endRender();
}
```

### Canvas2DRenderer (Device-Specific)

```javascript
_beginRender() {
  this._setupCanvasTransform();  // NDC-to-screen only
  this._clearCanvas();            // Clear + background
}

_setupCanvasTransform() {
  // Setup NDC-to-screen transform:
  // [-1,1] x [-1,1] -> [0,width] x [0,height]
  ctx.transform(
    width / 2,   0,
    0,           -height / 2,
    width / 2,   height / 2
  );
  
  // NOTE: world2ndc now applied by Abstract2DRenderer.beginRender()
}

_endRender() {
  // No cleanup needed for Canvas2D
}
```

## Key Changes

### Abstract2DRenderer

**Added:**
- `beginRender()` - Device-independent setup + world2ndc application
- `endRender()` - Device-independent cleanup (pop world2ndc)
- `_beginRender()` - Abstract method for device-specific setup
- `_endRender()` - Abstract method for device-specific cleanup

**Modified:**
- `render()` - Now calls `beginRender()`, traverses scene, calls `endRender()`

### Canvas2DRenderer

**Changed:**
- `_setupRendering()` → `_beginRender()`
- `_clearSurface()` → (merged into `_beginRender()`)
- `_setupCanvasTransform()` - Removed world2ndc application (now in Abstract2DRenderer)

**Added:**
- `_endRender()` - Empty (no cleanup needed)

## Benefits

1. **Explicit world2ndc handling**
   - Clearly visible in Abstract2DRenderer.beginRender()
   - Applied uniformly for all renderers
   - Uses device-specific primitives but device-independent logic

2. **Consistent behavior**
   - Canvas2D and SVG will now both have world2ndc as first transform
   - Easy to verify in SVG output (will appear as first `<g>` with transform)

3. **Easier to debug**
   - Transform stack is explicit and predictable
   - beginRender()/endRender() bracket the scene graph traversal
   - Device-specific code is minimal and isolated

4. **Easier to extend**
   - New renderer only needs to implement `_beginRender()` and `_endRender()`
   - World2ndc handling is automatic

## SVGRenderer (Device-Specific)

```javascript
_beginRender() {
  const rootGroup = this.#createRootGroup();  // NDC-to-screen transform
  // Add comment and formatting
  this.#svgElement.appendChild(rootGroup);
  this.#groupStack.push(rootGroup);
  this.#renderBackground();
  
  // NOTE: world2ndc now applied by Abstract2DRenderer.beginRender()
}

_endRender() {
  // Add final formatting newlines
  const rootGroup = this.#groupStack[0];
  rootGroup.appendChild(document.createTextNode('\n  '));
  this.#svgElement.appendChild(document.createTextNode('\n'));
}
```

## Expected SVG Structure

```xml
<svg width="800" height="600">
  <!-- Root group: NDC to screen transform -->
  <g transform="translate(400, 300) scale(400, -300)">  <!-- NDC-to-screen -->
    <rect x="-1" y="-1" width="2" height="2" fill="rgb(...)"/>  <!-- Background -->
    
    <!-- Transform: matrix(...world2ndc...) -->
    <g transform="matrix(...)">  <!-- world2ndc - AUTOMATICALLY APPLIED! -->
      <!-- Scene graph content here -->
      <g transform="matrix(...)">  <!-- Object transforms -->
        <circle cx="..." cy="..." r="..." fill="..."/>
      </g>
    </g>
  </g>
</svg>
```

**Key Point:** The world2ndc transform now appears as an explicit `<g>` group inside the root group, making the transformation hierarchy clear and debuggable!

## Files Modified

- `src/core/viewers/Abstract2DRenderer.js` - Added beginRender/endRender methods
- `src/core/viewers/Canvas2DViewer.js` - Refactored to use _beginRender/_endRender
- `src/core/viewers/SVGViewer.js` - Refactored to use _beginRender/_endRender

## Status

✅ **COMPLETE** - Both Canvas2D and SVG renderers refactored and working

