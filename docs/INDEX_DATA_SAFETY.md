# Index Data Safety: Regular vs Variable-Length

## Problem Statement

Index data (for faces, edges, polylines) can be:
1. **Regular/Uniform**: All faces/edges have the same number of vertices (e.g., all triangles, all quads, all line segments)
2. **Variable-Length**: Different faces/edges can have different numbers of vertices (e.g., mixed triangles and quads, polylines of varying length)

**Critical Issue**: Auto-detecting fiber length from index data is dangerous because it cannot distinguish between these two cases!

## Example of the Problem

```javascript
// Is this regular triangles or variable-length data?
const indices = [[0, 1, 2], [3, 4, 5]];

// Auto-detection would assume triangles (fiberLength = 3)
// But user might have meant variable-length data!
```

## Solution: Separate Functions for Regular vs Variable-Length

### For REGULAR Index Data (DataList)

Use when **all** faces/edges have the **same** number of vertices:

#### `createIndexList(indices, fiberLength)` - REQUIRES explicit fiberLength

```javascript
// All triangles (3 vertices each)
createIndexList([[0, 1, 2], [2, 1, 3], [3, 1, 4]], 3);

// All quads (4 vertices each)
createIndexList([[0, 1, 2, 3], [4, 5, 6, 7]], 4);

// ERROR: Missing fiberLength
createIndexList([[0, 1, 2]]);  // Throws error!
```

**Key Point**: `fiberLength` is REQUIRED - no auto-detection for indices!

#### `createEdgeList(edges)` - For regular line segments only

```javascript
// All edges are line segments (2 vertices each)
createEdgeList([[0, 1], [1, 2], [2, 3]]);

// Internally calls: createIndexList(edges, 2)
```

**Use Case**: When you have a fixed set of line segments, not connected polylines.

### For VARIABLE-LENGTH Index Data (VariableDataList)

Use when faces/edges can have **different** numbers of vertices:

#### `createPolylineList(polylines)` - For polylines/edges

```javascript
// Variable-length polylines
createPolylineList([
  [0, 1, 2],           // Polyline with 3 vertices
  [3, 4, 5, 6, 7],     // Polyline with 5 vertices
  [8, 9]               // Polyline with 2 vertices
]);
```

**Used by**: `IndexedLineSet.setEdgeIndices()`

#### `createPolygonList(polygons)` or `createMixedFaceList(faces)` - For faces

```javascript
// Mixed triangles and quads
createMixedFaceList([
  [0, 1, 2],           // Triangle
  [3, 4, 5, 6],        // Quad
  [7, 8, 9]            // Triangle
]);
```

**Used by**: `IndexedFaceSet.setFaceIndices()`

## Safety Analysis

### ✅ SAFE: Vertex/Color/Normal Data

Auto-detection is **safe** for vertex attributes because:
- Nested arrays represent a clear structure: `[[x1, y1, z1], [x2, y2, z2], ...]`
- The fiber length is the coordinate dimension (always uniform per vertex)
- If data is flat, user must provide fiber length explicitly

```javascript
// SAFE: Auto-detect 3D coordinates
createVertexList([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);

// SAFE: Auto-detect RGBA colors
createColorList([[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1]]);
```

### ❌ UNSAFE: Index Data (Now Fixed)

Auto-detection was **dangerous** for index data because:
- Nested arrays could represent EITHER regular OR variable-length data
- No way to distinguish: `[[0, 1, 2], [3, 4, 5]]` could be triangles OR variable-length
- User intent is ambiguous

**Solution**: Require explicit fiber length for `createIndexList()`.

## Current Implementation Status

### Regular Index Functions (DataList)

| Function | Fiber Length | Auto-Detect? | Use Case |
|----------|--------------|--------------|----------|
| `createIndexList()` | REQUIRED | ❌ NO | Regular faces (all same size) |
| `createEdgeList()` | Fixed (2) | N/A | Regular line segments |

### Variable-Length Index Functions (VariableDataList)

| Function | Fiber Length | Auto-Detect? | Use Case |
|----------|--------------|--------------|----------|
| `createPolylineList()` | N/A | N/A | Variable polylines |
| `createPolygonList()` | N/A | N/A | Variable polygons |
| `createMixedFaceList()` | N/A | N/A | Mixed face types |

### Vertex Attribute Functions (DataList)

| Function | Fiber Length | Auto-Detect? | Use Case |
|----------|--------------|--------------|----------|
| `createDataList()` | Optional | ✅ YES | General uniform data |
| `createVertexList()` | Optional | ✅ YES | Vertex coordinates |
| `createColorList()` | Optional | ✅ YES | Vertex colors |
| `createNormalList()` | Fixed (3) | N/A | Vertex normals |
| `createTextureCoordList()` | Optional | ✅ YES | Texture coordinates |

## Usage in Geometry Classes

### PointSet

```javascript
// SAFE: Auto-detects coordinate dimension
setVertexCoordinates([[1, 2, 3], [4, 5, 6]]);

// Uses: createVertexList() → createDataList() with auto-detection
```

### IndexedLineSet

```javascript
// SAFE: Uses VariableDataList (no fiber length needed)
setEdgeIndices([
  [0, 1, 2],
  [3, 4, 5, 6, 7]
]);

// Uses: createPolylineList() → VariableDataList
```

### IndexedFaceSet

```javascript
// SAFE: Uses VariableDataList (no fiber length needed)
setFaceIndices([
  [0, 1, 2],
  [3, 4, 5, 6]
]);

// Uses: createMixedFaceList() → VariableDataList
```

## When to Use Each Function

### Use `createIndexList()` when:
- ✅ All faces have the SAME number of vertices
- ✅ You're creating a triangle mesh (all triangles)
- ✅ You're creating a quad mesh (all quads)
- ✅ You have a fixed topology

```javascript
// Triangle mesh
const triangles = createIndexList([
  [0, 1, 2],
  [2, 1, 3],
  [2, 3, 4]
], 3);  // MUST specify 3
```

### Use `createMixedFaceList()` or `createPolygonList()` when:
- ✅ Faces can have DIFFERENT numbers of vertices
- ✅ You have mixed triangles and quads
- ✅ You have arbitrary polygons
- ✅ You want flexibility

```javascript
// Mixed mesh
const faces = createMixedFaceList([
  [0, 1, 2],        // Triangle
  [3, 4, 5, 6],     // Quad
  [7, 8, 9, 10, 11] // Pentagon
]);  // NO fiber length needed
```

### Use `createPolylineList()` when:
- ✅ You have connected polylines
- ✅ Polylines can have DIFFERENT numbers of vertices
- ✅ You're working with IndexedLineSet

```javascript
// Variable polylines
const polylines = createPolylineList([
  [0, 1],           // Short line
  [2, 3, 4, 5],     // Long polyline
  [6, 7, 8]         // Medium polyline
]);  // NO fiber length needed
```

### Use `createEdgeList()` when:
- ✅ You have disconnected line segments
- ✅ All edges are simple 2-vertex segments
- ✅ You want regular DataList (not VariableDataList)

```javascript
// Disconnected line segments
const segments = createEdgeList([
  [0, 1],
  [2, 3],
  [4, 5]
]);  // Fiber length is always 2
```

## Error Messages

The implementation provides clear error messages:

```javascript
// Missing fiber length for indices
createIndexList([[0, 1, 2]]);
// Error: createIndexList requires explicit fiberLength. 
//        For variable-length faces, use createMixedFaceList() or createPolygonList().

// Missing fiber length for flat vertex data
createDataList([1, 2, 3, 4, 5, 6]);
// Error: Cannot auto-detect fiber length from flat array. 
//        Please provide fiberLength explicitly.
```

## Summary

**Key Safety Rules**:

1. ✅ **Vertex attributes** (coordinates, colors, normals): Auto-detection is SAFE
2. ❌ **Index data for regular topology**: REQUIRES explicit fiber length
3. ✅ **Index data for variable topology**: Uses VariableDataList (no fiber length)

**Remember**:
- `createIndexList()` = Regular faces (MUST specify fiber length)
- `createMixedFaceList()` / `createPolygonList()` = Variable faces (NO fiber length)
- `createPolylineList()` = Variable polylines (NO fiber length)
- `createEdgeList()` = Regular line segments (fiber length = 2, automatic)

This design prevents ambiguity and ensures type safety!

