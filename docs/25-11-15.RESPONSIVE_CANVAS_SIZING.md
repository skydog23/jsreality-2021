# Responsive Canvas Sizing

## Overview

The Canvas2DViewer automatically adapts to the CSS-defined size of the canvas element, making it fully responsive to different screen sizes and container widths.

## How It Works

### Key Principle: CSS Controls Size, JavaScript Reads It

**Important:** The `Canvas2DViewer` does NOT set `canvas.style.width` or `canvas.style.height`. This is intentional to allow CSS to fully control the layout and enable responsive designs.

### 1. CSS Controls Display Size

The canvas element's display size is controlled via CSS:

```css
#canvas2d-test {
    width: 100%;        /* Fill container width */
    height: 600px;      /* Fixed height (can be changed) */
    max-width: 100%;    /* Don't exceed container */
}
```

### 2. Canvas2DViewer Reads CSS Size

When the viewer initializes (or when the canvas is resized), it:

1. Reads `canvas.clientWidth` and `canvas.clientHeight` (the CSS-defined dimensions)
2. Sets the internal bitmap dimensions: `canvas.width = clientWidth × pixelRatio`
3. Scales the drawing context to maintain proper coordinate system

**Code:** `Canvas2DViewer.js` → `#setupCanvas()` method

```javascript
#setupCanvas() {
  const displayWidth = canvas.clientWidth;   // Read CSS width
  const displayHeight = canvas.clientHeight; // Read CSS height
  
  // Set bitmap dimensions (scaled for high-DPI displays)
  canvas.width = displayWidth * ratio;
  canvas.height = displayHeight * ratio;
  
  // Scale context so 1 unit = 1 CSS pixel
  this.#context.scale(ratio, ratio);
  
  // NOTE: We deliberately do NOT set canvas.style.width/height here
  // Setting inline styles would override CSS and break responsive layouts
}
```

### 3. Automatic Re-rendering on Resize

The viewer uses `ResizeObserver` to watch for size changes:

```javascript
#setupResizeHandling() {
  const resizeObserver = new ResizeObserver(() => {
    this.#setupCanvas();  // Update bitmap dimensions
    this.render();        // Re-render scene
  });
  resizeObserver.observe(this.#canvas);
}
```

## Usage Examples

### Example 1: Full Width, Fixed Height

```html
<canvas id="my-canvas" style="width: 100%; height: 600px;"></canvas>
```

### Example 2: Fixed Aspect Ratio (16:9)

```html
<style>
  .canvas-container {
    width: 100%;
    max-width: 1200px;
    aspect-ratio: 16 / 9;
  }
  #my-canvas {
    width: 100%;
    height: 100%;
  }
</style>
<div class="canvas-container">
  <canvas id="my-canvas"></canvas>
</div>
```

### Example 3: Fill Viewport

```html
<style>
  #my-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
  }
</style>
<canvas id="my-canvas"></canvas>
```

### Example 4: Responsive with Media Queries

```html
<style>
  #my-canvas {
    width: 100%;
    height: 400px;
  }
  
  @media (min-width: 768px) {
    #my-canvas {
      height: 600px;
    }
  }
  
  @media (min-width: 1200px) {
    #my-canvas {
      height: 800px;
    }
  }
</style>
<canvas id="my-canvas"></canvas>
```

## Benefits

1. **No hardcoded dimensions** in JavaScript
2. **CSS controls layout** - standard web development practice
3. **Automatic high-DPI support** - sharp on retina displays
4. **Responsive** - adapts to screen size, browser resize, container changes
5. **Flexible** - can use any CSS layout technique (flexbox, grid, aspect-ratio, etc.)

## Testing

To test responsive behavior:

1. Open `test/canvas2d-test.html` in a browser
2. Resize the browser window - canvas adjusts automatically
3. Open DevTools and use responsive design mode
4. Check on different devices/screen sizes

## Important Notes

### MUST Set Size Via CSS

**Critical:** You MUST define the canvas size using CSS (stylesheet or inline styles). The `Canvas2DViewer` will NOT set the size for you.

❌ **Bad - No size defined:**
```html
<canvas id="my-canvas"></canvas>
```
```javascript
const viewer = new Canvas2DViewer(canvas); // Canvas has 0×0 size!
```

✅ **Good - CSS defines size:**
```html
<canvas id="my-canvas" style="width: 800px; height: 600px;"></canvas>
```
Or:
```css
#my-canvas {
  width: 800px;
  height: 600px;
}
```
```html
<canvas id="my-canvas"></canvas>
```

### Do NOT set width/height attributes in HTML

❌ **Bad:**
```html
<canvas id="my-canvas" width="800" height="600"></canvas>
```

✅ **Good:**
```html
<canvas id="my-canvas"></canvas>
```
```css
#my-canvas {
  width: 800px;
  height: 600px;
}
```

### Why?

- HTML `width`/`height` attributes set the **bitmap** dimensions, not display size
- CSS controls the **display** size
- Canvas2DViewer automatically sets the correct bitmap dimensions based on CSS size
- Mixing HTML attributes and CSS can cause confusion and scaling issues
- **Canvas2DViewer deliberately does not set inline styles** to allow CSS control

## High-DPI / Retina Support

The viewer automatically handles high-DPI displays:

- On a 2× Retina display with CSS width 800px:
  - `canvas.clientWidth` = 800px
  - `canvas.width` = 1600px (800 × 2)
  - Drawing context is scaled by 2
  - Result: Crisp, sharp rendering

This happens automatically with `window.devicePixelRatio` or can be manually set:

```javascript
const viewer = new Canvas2DViewer(canvas, {
  pixelRatio: 2  // Force 2× resolution
});
```

## Performance Considerations

### Large Canvases

Very large canvas dimensions can impact performance:

- **1920×1080 on 2× display** = 4M pixels (8 megabytes)
- **3840×2160 on 2× display** = 16M pixels (32 megabytes)

If performance is an issue, you can limit the pixel ratio:

```javascript
const viewer = new Canvas2DViewer(canvas, {
  pixelRatio: Math.min(window.devicePixelRatio, 2)  // Cap at 2×
});
```

### Resize Performance

`ResizeObserver` triggers on every resize event, which can be frequent during window dragging. The viewer handles this efficiently, but for very complex scenes, you might want to debounce:

```javascript
// Disable auto-resize
const viewer = new Canvas2DViewer(canvas, {
  autoResize: false
});

// Manual debounced resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    viewer.render();
  }, 100);
});
```

## Common Pitfall: Setting Inline Styles in JavaScript

### The Problem

If `#setupCanvas()` were to set inline styles like this:

```javascript
canvas.style.width = displayWidth + 'px';
canvas.style.height = displayHeight + 'px';
```

This would **break responsive layouts** because:

1. Canvas starts at `width: 100%` (e.g., 1200px container width)
2. `#setupCanvas()` reads `clientWidth = 1200px`
3. Sets `canvas.style.width = '1200px'` (inline style - now FIXED!)
4. User shrinks browser window to 800px
5. Canvas stays 1200px wide (inline style overrides CSS `width: 100%`)
6. Canvas overflows container → white margins appear
7. User expands window back to 1200px
8. Canvas still 1200px (no change detected)
9. **Responsive behavior is broken!**

### The Solution

By **NOT setting inline styles**, the CSS remains in control:

1. Canvas has `width: 100%` from CSS
2. `#setupCanvas()` reads `clientWidth` (whatever the current container width is)
3. Sets only the bitmap dimensions (`canvas.width`), not the CSS size
4. User resizes window → CSS updates canvas display size automatically
5. `ResizeObserver` triggers → `#setupCanvas()` reads new size
6. Updates bitmap dimensions to match
7. **Responsive behavior works perfectly!**

## Changes Made (Nov 2025)

### Files Modified

1. **src/core/viewers/Canvas2DViewer.js** ⚠️ **CRITICAL FIX**
   - Removed `canvas.style.width = displayWidth + 'px'` from `#setupCanvas()`
   - Removed `canvas.style.height = displayHeight + 'px'` from `#setupCanvas()`
   - Added comment explaining why we don't set inline styles
   - **This fixes responsive sizing** - inline styles were overriding CSS

2. **test/canvas2d-test.html**
   - Changed `#canvas2d-test` CSS from `width: 800px` to `width: 100%`
   - Removed `width="800" height="600"` HTML attributes from canvas element

3. **src/core/viewers/__tests__/Canvas2DViewerTest.js**
   - Removed hardcoded `canvas.width = 800; canvas.height = 600`
   - Changed dynamic canvas creation to use `width: '100%'` style
   - Added comments explaining the responsive approach

### Result

The canvas now:
- ✅ Fills the width of its container (max 1200px due to `.container` CSS)
- ✅ Maintains 600px height (can be easily changed in CSS)
- ✅ Automatically adjusts to window resize
- ✅ Supports high-DPI displays
- ✅ Uses standard web layout practices

## Future Enhancements

Possible improvements:
- Add `maintainAspectRatio` option to viewer
- Support `aspect-ratio` CSS property
- Add `minWidth`/`maxWidth` constraints
- Provide helper CSS classes for common layouts


