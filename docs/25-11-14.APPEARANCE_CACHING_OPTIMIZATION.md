# Appearance Attribute Caching Optimization

## Overview

Optimized appearance attribute handling to avoid redundant lookups and state setting. Appearance attributes (colors, line widths, point sizes) are now cached when an `Appearance` is visited, rather than being looked up for every primitive drawn.

## Problem

**Before:** Every time a primitive was drawn, it would:
1. Call `getAppearanceAttribute()` to look up colors, sizes, widths
2. Convert colors with `toCSSColor()`
3. Set the device context state (Canvas: `ctx.strokeStyle`, SVG: element attributes)

This happened for EVERY point, line, and polygon, even when the appearance hadn't changed. For a scene with 100 line segments all using the same appearance, we were doing 100 identical lookups and conversions.

## Solution

Added a new abstract method `_applyAppearance()` that is called once when an `Appearance` is visited:

1. **Abstract2DRenderer**: Calls `_applyAppearance()` in `visitAppearance()`
2. **Canvas2DRenderer**: Sets all `ctx` properties once per appearance
3. **SVGRenderer**: Caches all attribute values in instance variables
4. **Drawing primitives**: Use the cached/pre-set values instead of looking them up

## Implementation

### Abstract2DRenderer

```javascript
visitAppearance(appearance) {
  this.#appearanceStack.push(appearance);
  // Apply appearance attributes to device context (set state once)
  this._applyAppearance();
}

// New abstract method
_applyAppearance() {
  throw new Error('Abstract method _applyAppearance() must be implemented by subclass');
}
```

### Canvas2DRenderer

```javascript
// Instance variables
#pointSize = 0.1;

_applyAppearance() {
  const ctx = this.#context;
  
  // Cache point size
  this.#pointSize = this.getNumericAttribute(CommonAttributes.POINT_SIZE, 0.1);
  
  // Set context properties once
  ctx.fillStyle = this.toCSSColor(
    this.getAppearanceAttribute('point', CommonAttributes.DIFFUSE_COLOR, '#ff0000'));
  ctx.strokeStyle = this.toCSSColor(
    this.getAppearanceAttribute('line', CommonAttributes.DIFFUSE_COLOR, '#000000'));
  ctx.lineWidth = this.getNumericAttribute(CommonAttributes.LINE_WIDTH, 1);
}

_drawPoint(x, y) {
  // Use cached size and pre-set fillStyle
  this.#context.beginPath();
  this.#context.arc(x, y, this.#pointSize / 2, 0, 2 * Math.PI);
  this.#context.fill();
}

_drawPolyline(vertices, indices) {
  // Use pre-set strokeStyle and lineWidth
  this.#context.beginPath();
  // ... build path ...
  this.#context.stroke();
}
```

### SVGRenderer

```javascript
// Instance variables for caching
#pointColor = '#ff0000';
#pointSize = 0.1;
#lineColor = '#000000';
#lineWidth = 1;
#faceColor = '#cccccc';

_applyAppearance() {
  // Cache all appearance attributes
  this.#pointColor = this.toCSSColor(...);
  this.#pointSize = this.getNumericAttribute(...);
  this.#lineColor = this.toCSSColor(...);
  this.#lineWidth = this.getNumericAttribute(...);
  this.#faceColor = this.toCSSColor(...);
  
  // Set attributes on current SVG group - all children will inherit
  const currentGroup = this.#groupStack[this.#groupStack.length - 1];
  currentGroup.setAttribute('stroke', this.#lineColor);
  currentGroup.setAttribute('stroke-width', this.#lineWidth.toFixed(4));
  currentGroup.setAttribute('fill', this.#pointColor);
}

_drawPoint(x, y) {
  // Only set geometry-specific attributes
  // fill, stroke, stroke-width inherited from group
  circle.setAttribute('cx', x.toFixed(4));
  circle.setAttribute('cy', y.toFixed(4));
  circle.setAttribute('r', (this.#pointSize / 2).toFixed(4));
}

_drawPolyline(vertices, indices) {
  // stroke and stroke-width inherited from group
  polyline.setAttribute('points', points.join(' '));
  polyline.setAttribute('fill', 'none'); // Override inherited fill
}

_drawPolygon(vertices, indices, fill) {
  // Override fill for polygons (different color namespace)
  polygon.setAttribute('points', points.join(' '));
  if (fill) {
    polygon.setAttribute('fill', this.#faceColor);
    polygon.setAttribute('stroke', 'none');
  } else {
    polygon.setAttribute('fill', 'none');
    // stroke inherited from group
  }
}
```

## Benefits

1. **Performance**
   - Eliminate redundant `getAppearanceAttribute()` calls
   - Eliminate redundant `toCSSColor()` conversions
   - Eliminate redundant device state setting (Canvas2D)

2. **Code Clarity**
   - Drawing primitives are simpler and focus on drawing
   - Clear separation: appearance lookup happens once, drawing happens many times

3. **Cleaner SVG Output**
   - Attributes set once on `<g>` group, inherited by all children
   - Much smaller SVG file size (no repeated `stroke`, `stroke-width` on every element)
   - Proper hierarchical structure leveraging SVG inheritance

## Performance Impact

For a scene with N primitives using M appearances:
- **Before**: O(N) appearance lookups
- **After**: O(M) appearance lookups (typically M << N)

Example: 100 line segments with 1 shared appearance:
- **Before**: 100 lookups + 100 conversions + 100 state sets
- **After**: 1 lookup + 1 conversion + 1 state set (Canvas) or 100 cached reads (SVG)

## Note on Canvas2D fillStyle

For Canvas2D, `ctx.fillStyle` is shared between points and polygons. We set it once in `_applyAppearance()` for points, but `_drawPolygon()` still needs to set it dynamically since polygons use a different color namespace (`polygon.diffuseColor` vs `point.diffuseColor`).

This could be further optimized by tracking which primitive type is being drawn and only setting `fillStyle` when switching between points and polygons.

## Files Modified

- `src/core/viewers/Abstract2DRenderer.js` - Added `_applyAppearance()` abstract method, calls it in `visitAppearance()`
- `src/core/viewers/Canvas2DViewer.js` - Implemented `_applyAppearance()`, updated drawing primitives
- `src/core/viewers/SVGViewer.js` - Implemented `_applyAppearance()` with caching, updated drawing primitives

## Example SVG Output

**Before** (attributes repeated on every element):
```xml
<g transform="matrix(...)">
  <circle cx="0" cy="0" r="0.05" fill="rgb(255,0,0)"/>
  <polyline points="..." stroke="rgb(0,0,0)" stroke-width="0.01" fill="none"/>
  <polyline points="..." stroke="rgb(0,0,0)" stroke-width="0.01" fill="none"/>
  <polygon points="..." fill="rgb(200,200,200)" stroke="none"/>
</g>
```

**After** (nested groups per primitive type):
```xml
<g transform="matrix(...)">
  <!-- point group -->
  <g fill="rgb(255,0,0)">
    <circle cx="0" cy="0" r="0.05"/>
  </g>
  <!-- line group -->
  <g stroke="rgb(0,0,0)" stroke-width="0.0100" fill="none">
    <polyline points="..."/>
    <polyline points="..."/>
  </g>
  <!-- face group -->
  <g fill="rgb(200,200,200)" stroke="none">
    <polygon points="..."/>
  </g>
</g>
```

**Key improvement:** Separate nested groups for points, lines, and faces, each with their own appearance attributes! 🎉

## Primitive Grouping (Added After Initial Implementation)

To properly handle different appearance attributes for points, lines, and faces (which have different color namespaces: `point.diffuseColor`, `line.diffuseColor`, `polygon.diffuseColor`), we added primitive-type-specific nested groups:

### New Abstract Methods

- `_beginPrimitiveGroup(type)` - Begin a nested group for 'point', 'line', or 'face'
- `_endPrimitiveGroup()` - End the nested group

### Implementation

**Abstract2DRenderer** - Wraps each primitive rendering call:
```javascript
_renderVerticesAsPoints(geometry) {
  this._beginPrimitiveGroup('point');
  // ... draw all points ...
  this._endPrimitiveGroup();
}

_renderEdgesAsLines(geometry) {
  this._beginPrimitiveGroup('line');
  // ... draw all lines ...
  this._endPrimitiveGroup();
}

_renderFacesAsPolygons(geometry) {
  this._beginPrimitiveGroup('face');
  // ... draw all faces ...
  this._endPrimitiveGroup();
}
```

**Canvas2DRenderer** - Sets appropriate context state per primitive type:
```javascript
_beginPrimitiveGroup(type) {
  if (type === 'point') {
    ctx.fillStyle = this.toCSSColor(...pointColor...);
  } else if (type === 'line') {
    ctx.strokeStyle = this.toCSSColor(...lineColor...);
    ctx.lineWidth = ...;
  } else if (type === 'face') {
    ctx.fillStyle = this.toCSSColor(...faceColor...);
  }
}
```

**SVGRenderer** - Creates nested `<g>` with type-specific attributes:
```javascript
_beginPrimitiveGroup(type) {
  const g = document.createElementNS(...);
  if (type === 'point') {
    g.setAttribute('fill', pointColor);
  } else if (type === 'line') {
    g.setAttribute('stroke', lineColor);
    g.setAttribute('stroke-width', lineWidth);
    g.setAttribute('fill', 'none');
  } else if (type === 'face') {
    g.setAttribute('fill', faceColor);
    g.setAttribute('stroke', 'none');
  }
  // Push to group stack...
}
```

This creates a clean hierarchical structure:
- Outer group: Transformation
- Inner groups: Points, Lines, Faces (each with their own appearance)

## Status

✅ **COMPLETE** - Both renderers optimized, SVG uses nested primitive groups, no linter errors, ready to test

