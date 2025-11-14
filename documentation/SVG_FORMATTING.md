# SVG Output Formatting

## Overview

The SVG export now produces **human-readable, indented XML** to make it easier to debug transformation hierarchies.

## Features Added

### 1. **Indentation Tracking**
- Added `#indentLevel` property to `SVGRenderer`
- Starts at 1 (inside root group)
- Increments when pushing transform state
- Decrements when popping transform state

### 2. **Newlines and Indentation**
- Each `<g>` group starts on a new line with proper indentation
- Each geometry element (`<circle>`, `<polyline>`, `<polygon>`) on its own line
- Closing tags properly indented
- Format uses 2-space indentation per level

### 3. **Transform Comments**
- Each transform group has a comment showing the matrix values
- Example: `<!-- Transform: matrix(1.0000 0.0000 0.0000 1.0000 2.5000 0.0000) -->`
- Makes it easy to see what transformations are being applied

### 4. **Numeric Precision**
- All numeric values formatted to 4 decimal places using `.toFixed(4)`
- Applies to:
  - Transform matrix values
  - Point coordinates (cx, cy, r)
  - Polyline/polygon points
  - Stroke widths

## Example Output

```xml
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- Root group: NDC to screen transform -->
  <g transform="matrix(400.0000 0.0000 0.0000 -300.0000 400.0000 300.0000)">
    <!-- Transform: matrix(1.0000 0.0000 0.0000 1.0000 2.0000 1.0000) -->
    <g transform="matrix(1.0000 0.0000 0.0000 1.0000 2.0000 1.0000)">
      <circle cx="0.0000" cy="0.0000" r="0.0500" fill="rgb(255,0,0)"/>
      <polyline points="-1.0000,0.0000 1.0000,0.0000" stroke="rgb(0,0,0)" stroke-width="1.0000" fill="none"/>
    </g>
  </g>
</svg>
```

## Benefits

1. **Easy to Debug Transformations**
   - Can see exactly which transforms are applied to which groups
   - Hierarchical structure is visually clear
   - Comments show actual matrix values

2. **Easy to Inspect Geometry**
   - Can quickly find specific elements
   - Point/line/polygon data is readable
   - Indentation shows parent-child relationships

3. **Git-Friendly**
   - Changes to SVG files produce meaningful diffs
   - Can track what transformations changed

## Implementation Details

### Methods Modified

- `_setupRendering()` - Adds root group comment
- `_pushTransformState()` - Adds newline/indent before new group
- `_popTransformState()` - Adds newline/indent after closing group
- `_applyTransform()` - Adds transform comment and formatting
- `_drawPoint()` - Adds indent before element
- `_drawPolyline()` - Adds indent before element
- `_drawPolygon()` - Adds indent before element
- `render()` (in SVGViewer) - Adds final closing newlines

### Helper Method

- `#getIndent()` - Returns `'\n' + '  '.repeat(this.#indentLevel + 1)`

## Files Modified

- `src/core/viewers/SVGViewer.js` - Added formatting throughout SVGRenderer class

