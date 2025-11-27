# Fiber Length Auto-Detection Implementation

## Overview

This document describes the implementation of automatic fiber length detection for nested array data in jsReality-2021. The fiber length is the innermost dimension of a nested array structure (e.g., 3 for 3D coordinates, 4 for RGBA colors).

## Changes Made

### 1. New Utility Module: `DataUtility.js`

**Location**: `src/core/scene/data/DataUtility.js`

**Purpose**: Provides utility functions for processing multi-dimensional array data.

**Key Functions**:

#### `detectFiberLength(arr)`
Detects the innermost dimension of a nested array structure.

```javascript
// Examples
detectFiberLength([[1, 2, 3], [4, 5, 6]]);              // Returns 3
detectFiberLength([[1, 0, 0, 1], [0, 1, 0, 1]]);        // Returns 4
detectFiberLength([1, 2, 3, 4, 5, 6]);                  // Returns null (can't determine)
```

**Returns**: `number | null`
- For nested arrays: returns the length of the innermost array
- For flat arrays: returns `null` (fiber length must be provided explicitly)
- For empty arrays: returns `null`

#### `flattenArray(arr)`
Recursively flattens any level of nesting to a 1D array.

```javascript
flattenArray([[1, 2, 3], [4, 5, 6]]);                   // [1, 2, 3, 4, 5, 6]
flattenArray([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);     // [1, 2, 3, 4, 5, 6, 7, 8]
```

#### `getFiberCount(arr, fiberLength)`
Gets the total number of "fibers" (outermost count) in the data.

```javascript
getFiberCount([[1, 2, 3], [4, 5, 6]]);                  // 2 (2 vertices)
getFiberCount([1, 2, 3, 4, 5, 6], 3);                   // 2 (6 elements / 3 per fiber)
```

#### `validateDataArray(arr, expectedFiberLength)`
Validates array structure for consistency.

```javascript
validateDataArray([[1, 2, 3], [4, 5, 6]], 3);
// { valid: true, message: 'Valid', detectedFiberLength: 3 }

validateDataArray([[1, 2, 3], [4, 5]], 3);
// { valid: false, message: 'Inconsistent fiber length...', detectedFiberLength: 3 }
```

### 2. New Core Factory Function

**Location**: `src/core/scene/data/DataListFactory.js`

#### `createDataList(data, fiberLength = null, dataType = 'float64')`

The new general-purpose factory function for creating DataList objects from array data.

**Parameters**:
- `data` - Array data (flat or nested)
- `fiberLength` - Fiber length (auto-detected for nested arrays, required for flat arrays)
- `dataType` - Data type for elements (default: 'float64')

**Features**:
- Auto-detects fiber length from nested arrays
- Throws clear error if fiber length cannot be detected
- Validates that data length is divisible by fiber length
- Handles both flat and nested arrays

```javascript
// Auto-detect from nested array
const vertices = [[1, 2, 3], [4, 5, 6]];
createDataList(vertices);  // Auto-detects fiberLength = 3, uses 'float64'

// Explicit for flat array
createDataList([1, 2, 3, 4, 5, 6], 3, 'float64');  // fiberLength = 3

// Integer data
createDataList([[0, 1, 2], [3, 4, 5]], null, 'int32');  // Auto-detect, use int32
```

### 3. Updated Convenience Functions

All specialized factory functions are now thin wrappers around `createDataList`:

##### `createVertexList(vertices, fiberLength = null)`
- Convenience wrapper for vertex coordinates (always 'float64')
- Auto-detects fiber length for nested arrays

##### `createIndexList(indices, fiberLength = null)`
- Convenience wrapper for face indices (always 'int32')
- Auto-detects fiber length for nested arrays

##### `createColorList(colors, fiberLength = null)`
- Convenience wrapper for color data (always 'float64')
- Auto-detects fiber length for nested arrays

##### `createNormalList(normals)`
- Convenience wrapper for normals (always 3D, 'float64')
- No fiber length parameter needed (always 3)

##### `createTextureCoordList(texCoords, fiberLength = null)`
- Convenience wrapper for texture coordinates (always 'float64')
- Auto-detects fiber length for nested arrays

### 4. Simplified PointSet Class

**Location**: `src/core/scene/PointSet.js`

#### `setVertexCoordinates(coordinates, fiberLength = null)`

**Changes**:
- Renamed parameter from `coordsPerVertex` to `fiberLength`
- All fiber length logic moved to `createVertexList()` - no duplication!
- Clean, simple implementation

```javascript
// Auto-detect from nested array
const vertices = [[1, 2, 3], [4, 5, 6]];
pointSet.setVertexCoordinates(vertices);  // Auto-detects fiberLength = 3

// Explicit for flat array
pointSet.setVertexCoordinates([1, 2, 3, 4, 5, 6], 3);  // fiberLength = 3
```

**Simplified Implementation**:
```javascript
setVertexCoordinates(coordinates, fiberLength = null) {
  const coordList = createVertexList(coordinates, fiberLength);
  this.setVertexCountAndAttribute(GeometryAttribute.COORDINATES, coordList);
}
```

All complexity is now handled by `createVertexList()`, which delegates to `createDataList()`.

### 5. IndexedLineSet and IndexedFaceSet

**No changes needed** for these classes as they use variable-length data lists:
- `IndexedLineSet.setEdgeIndices()` uses `createPolylineList()` (variable length polylines)
- `IndexedFaceSet.setFaceIndices()` uses `createMixedFaceList()` (variable length polygons)

These methods don't have or need a fiber length parameter since the polylines/polygons can have different numbers of vertices.

## Usage Examples

### Example 1: 3D Vertex Coordinates (Nested)

```javascript
import { PointSet } from './scene/PointSet.js';

const pointSet = new PointSet();

// Nested array - fiber length auto-detected as 3
const vertices = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0]
];

pointSet.setVertexCoordinates(vertices);  // Auto-detects fiberLength = 3
```

### Example 2: 4D Homogeneous Coordinates (Nested)

```javascript
// Nested array - fiber length auto-detected as 4
const vertices = [
  [0, 0, 0, 1],
  [1, 0, 0, 1],
  [0, 1, 0, 1]
];

pointSet.setVertexCoordinates(vertices);  // Auto-detects fiberLength = 4
```

### Example 3: Flat Array with Explicit Fiber Length

```javascript
// Flat array - must specify fiber length
const flatVertices = [0, 0, 0, 1, 0, 0, 0, 1, 0];

pointSet.setVertexCoordinates(flatVertices, 3);  // Explicitly set fiberLength = 3
```

### Example 4: Flat Array with Default Fiber Length

```javascript
// Flat array without explicit fiber length - uses default of 4
const flatVertices = [0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1];

pointSet.setVertexCoordinates(flatVertices);  // Uses default fiberLength = 4
```

### Example 5: RGBA Colors (Nested)

```javascript
// Auto-detect color components (4 for RGBA)
const colors = [
  [1.0, 0.0, 0.0, 1.0],
  [0.0, 1.0, 0.0, 1.0],
  [0.0, 0.0, 1.0, 1.0]
];

const colorList = createColorList(colors);  // Auto-detects fiberLength = 4
pointSet.setVertexAttribute(GeometryAttribute.COLORS, colorList);
```

### Example 6: Using detectFiberLength Directly

```javascript
import { detectFiberLength } from './scene/data/DataUtility.js';

const vertices = [[1, 2, 3], [4, 5, 6]];
const dimension = detectFiberLength(vertices);  // 3

if (dimension !== null) {
  console.log(`Detected ${dimension}D coordinates`);
  // Process with detected dimension
}
```

## Benefits

1. **Convenience**: No need to specify fiber length for nested arrays
2. **Type Safety**: Validates that nested arrays have consistent structure
3. **Flexibility**: Still supports flat arrays with explicit fiber length
4. **Consistency**: Uniform parameter naming across all factory functions
5. **Readability**: `fiberLength` is more general and descriptive than specific names

## Backward Compatibility

### Breaking Changes

The parameter name change from specific names (`coordsPerVertex`, `componentsPerColor`, etc.) to the generic `fiberLength` is a **breaking change** for code that uses named arguments:

```javascript
// Old code (no longer works)
pointSet.setVertexCoordinates(vertices, { coordsPerVertex: 3 });

// New code
pointSet.setVertexCoordinates(vertices, 3);
// or with auto-detection
pointSet.setVertexCoordinates(vertices);
```

### Migration Guide

1. **Positional arguments**: No changes needed - positional arguments work the same
2. **Named arguments**: Change parameter names to `fiberLength`
3. **Nested arrays**: Can remove the second parameter entirely for auto-detection
4. **Flat arrays**: 
   - For 4D coordinates: can remove the second parameter (uses default of 4)
   - For other dimensions: must provide explicit `fiberLength`

## Testing

To test the implementation:

```javascript
// Test auto-detection
const nested3D = [[1, 2, 3], [4, 5, 6]];
const nested4D = [[1, 2, 3, 4], [5, 6, 7, 8]];

console.assert(detectFiberLength(nested3D) === 3);
console.assert(detectFiberLength(nested4D) === 4);
console.assert(detectFiberLength([1, 2, 3]) === null);

// Test PointSet
const ps = new PointSet();
ps.setVertexCoordinates(nested3D);  // Should work
console.assert(ps.getNumPoints() === 2);

// Test flat arrays
ps.setVertexCoordinates([1, 2, 3, 4, 5, 6], 3);  // Explicit
console.assert(ps.getNumPoints() === 2);

ps.setVertexCoordinates([1, 2, 3, 4, 5, 6, 7, 8]);  // Default 4
console.assert(ps.getNumPoints() === 2);
```

## Future Enhancements

Potential improvements:

1. **Smart defaults**: Detect common patterns (e.g., if length is divisible by 3, assume 3D)
2. **Validation**: Add stricter validation for inconsistent nested arrays
3. **Performance**: Optimize flattening for large datasets
4. **TypeScript**: Add proper type definitions for better IDE support
5. **Error messages**: Provide more helpful error messages for invalid input

## See Also

- `DataUtility.js` - Full implementation
- `DataListFactory.js` - Updated factory functions
- `PointSet.js` - Example usage in geometry classes

