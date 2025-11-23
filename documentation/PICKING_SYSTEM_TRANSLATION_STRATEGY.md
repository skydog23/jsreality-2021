# Picking System Translation Strategy

## Overview

This document outlines the strategy for translating the Java picking system from `jreality-2021/src-core/de/jreality/scene/pick` to JavaScript in the `jsreality-2021` project.

## Architecture Analysis

### Core Components

The picking system consists of:

1. **Core Interfaces & Classes:**
   - `PickSystem` - Interface for picking implementations
   - `PickResult` - Interface for pick results
   - `Hit` - Implementation of `PickResult` with detailed hit information
   - `HitFilter` - Interface for filtering pick results
   - `Graphics3D` - Context class for coordinate transformations

2. **Picking Implementations:**
   - `BruteForcePicking` - Simple brute-force intersection testing
   - `AABBPickSystem` - Optimized picking using AABB trees
   - `AABBTree` - Spatial acceleration structure
   - `AABB` - Axis-aligned bounding box

3. **Utilities:**
   - `PosWHitFilter` - Filter for positive W coordinate hits

## Translation Strategy

### Phase 1: Core Data Structures & Interfaces

#### 1.1 PickResult Interface (`src/core/pick/PickResult.js`)
- **Status**: ✅ Straightforward translation
- **Dependencies**: `SceneGraphPath`
- **Key Methods**:
  - `getPickPath()` → Returns `SceneGraphPath`
  - `getWorldCoordinates()` → Returns `number[]`
  - `getObjectCoordinates()` → Returns `number[]`
  - `getIndex()`, `getSecondaryIndex()` → Returns `number`
  - `getPickType()` → Returns `number` (PICK_TYPE_* constants)
  - `getTextureCoordinates()` → Returns `number[]|null`

**Translation Notes**:
- Use TypeScript JSDoc for type annotations
- Export constants: `PICK_TYPE_POINT`, `PICK_TYPE_LINE`, `PICK_TYPE_FACE`, `PICK_TYPE_OBJECT`
- JavaScript doesn't have interfaces, so use JSDoc `@interface` or just export as abstract class

#### 1.2 HitFilter Interface (`src/core/pick/HitFilter.js`)
- **Status**: ✅ Very simple
- **Key Method**: `accept(from: number[], to: number[], h: PickResult): boolean`
- **Translation**: Use function type or abstract class

#### 1.3 Hit Class (`src/core/pick/Hit.js`)
- **Status**: ⚠️ Moderate complexity
- **Dependencies**: 
  - `SceneGraphPath` ✅
  - `IndexedFaceSet` ✅
  - `Matrix` ✅
  - `Rn`, `Pn`, `P3` ✅
  - `DataList`, `GeometryAttribute` ✅
- **Key Features**:
  - Barycentric coordinate calculation (`convertToBary`)
  - Texture coordinate interpolation
  - Hit comparison (`HitComparator`)
- **Translation Notes**:
  - `convertToBary` is a static method - translate directly
  - Texture coordinate calculation uses lazy evaluation pattern
  - `HitComparator` can be a simple function or class

### Phase 2: Graphics Context

#### 2.1 Graphics3D (`src/core/pick/Graphics3D.js`)
- **Status**: ✅ Straightforward
- **Dependencies**:
  - `Viewer` ✅
  - `Camera` ✅
  - `SceneGraphPath` ✅
  - `CameraUtility` ✅
  - `Rn` ✅
- **Key Methods**:
  - Coordinate transformation methods (object↔world↔camera↔NDC↔screen)
  - Matrix computation helpers
- **Translation Notes**:
  - Replace `Component` (Java AWT) with `HTMLElement` or canvas dimensions
  - `getNDCToScreen()` needs adaptation for browser environment
  - Most matrix operations map directly to `Rn` functions

### Phase 3: Brute Force Picking

#### 3.1 BruteForcePicking (`src/core/pick/BruteForcePicking.js`)
- **Status**: ⚠️ Moderate complexity
- **Dependencies**:
  - `IndexedFaceSet`, `IndexedLineSet`, `PointSet` ✅
  - `Sphere`, `Cylinder` ✅
  - `Matrix` ✅
  - `Rn`, `Pn`, `P3` ✅
  - `DataList`, `GeometryAttribute` ✅
- **Key Methods**:
  - `intersectPolygons()` - Ray-triangle intersection
  - `intersectEdges()` - Ray-cylinder intersection for lines
  - `intersectPoints()` - Ray-sphere intersection for points
  - `intersectSphere()`, `intersectCylinder()` - Primitive intersections
- **Translation Notes**:
  - Replace Java `ArrayList<Hit>` with `Hit[]` or `Hit[]` arrays
  - Replace `LinkedList<double[]>` temporary hit lists with arrays
  - Static methods → exported functions
  - Thread-local static variables → module-level variables (not thread-safe, but JS is single-threaded)

### Phase 4: AABB Tree Acceleration

#### 4.1 AABB (`src/core/pick/AABB.js`)
- **Status**: ✅ Straightforward
- **Dependencies**: `Rn` ✅
- **Key Methods**:
  - `compute()` - Compute bounding box from triangles
  - `intersects()` - Ray-AABB intersection test
- **Translation Notes**:
  - Simple geometric calculations
  - No complex dependencies

#### 4.2 AABBTree (`src/core/pick/AABBTree.js`)
- **Status**: ⚠️ Moderate complexity
- **Dependencies**:
  - `IndexedFaceSet` ✅
  - `AABB` (internal)
  - `BruteForcePicking` (for leaf intersections)
  - `Matrix` ✅
  - `Rn`, `Pn` ✅
  - `DataList`, `GeometryAttribute` ✅
- **Key Features**:
  - Recursive tree construction
  - Spatial partitioning
  - Tree traversal for intersection
- **Translation Notes**:
  - `TreePolygon` inner class → separate class or module-level class
  - `Comparator<TreePolygon>` → function or class with `compare` method
  - Array sorting uses native JS `Array.sort()`
  - `nullTree` static field → module-level constant

#### 4.3 AABBPickSystem (`src/core/pick/AABBPickSystem.js`)
- **Status**: ⚠️ Most complex component
- **Dependencies**:
  - `SceneGraphVisitor` ✅
  - `SceneGraphComponent` ✅
  - `Appearance` ✅
  - `CommonAttributes` ✅
  - `CameraUtility` ✅
  - `PickUtility` (may need translation)
  - All geometry types ✅
  - `Hit`, `BruteForcePicking`, `AABBTree` ✅
- **Key Features**:
  - Scene graph traversal
  - Appearance attribute resolution
  - Pickable filtering
  - AABB tree caching
  - Hit collection and sorting
- **Translation Notes**:
  - `Impl` inner class → separate class or module-level class
  - `PickInfo` inner class → separate class
  - `Stack<PickInfo>` → `PickInfo[]` array with push/pop
  - `HashMap<IndexedFaceSet, AABBTree>` → `Map<IndexedFaceSet, AABBTree>`
  - `ArrayList<Hit>` → `Hit[]`
  - Matrix stack → array of matrices
  - Appearance attribute access patterns match existing code

### Phase 5: Utilities & Filters

#### 5.1 PosWHitFilter (`src/core/pick/PosWHitFilter.js`)
- **Status**: ✅ Simple
- **Dependencies**: `Viewer`, `CameraUtility`, `Rn` ✅
- **Translation**: Straightforward

#### 5.2 PickSystem Interface (`src/core/pick/PickSystem.js`)
- **Status**: ✅ Simple interface
- **Key Methods**:
  - `setSceneRoot(root: SceneGraphComponent): void`
  - `computePick(from: number[], to: number[]): PickResult[]`

## File Structure

```
jsreality-2021/src/core/pick/
├── PickResult.js          # Interface
├── PickSystem.js          # Interface  
├── Hit.js                 # PickResult implementation
├── HitFilter.js           # Interface
├── Graphics3D.js          # Graphics context
├── BruteForcePicking.js   # Brute-force intersection methods
├── AABB.js                # Bounding box class
├── AABBTree.js            # Spatial acceleration structure
├── AABBPickSystem.js      # Main picking system implementation
├── PosWHitFilter.js       # Hit filter utility
└── index.js               # Exports
```

## Key Translation Patterns

### 1. Java Collections → JavaScript Arrays/Maps

| Java | JavaScript |
|------|------------|
| `ArrayList<T>` | `T[]` |
| `LinkedList<T>` | `T[]` (use push/pop for stack-like behavior) |
| `HashMap<K,V>` | `Map<K,V>` |
| `Stack<T>` | `T[]` with push/pop |

### 2. Static Methods → Exported Functions

```java
public static void intersectPolygons(...)
```
```javascript
export function intersectPolygons(...)
```

### 3. Inner Classes → Module-Level Classes

```java
private class Impl extends SceneGraphVisitor { ... }
```
```javascript
class Impl extends SceneGraphVisitor { ... }
export { Impl };
```

### 4. Matrix Operations

- Java `Matrix` class → JavaScript `Matrix` class ✅
- `Matrix.multiplyVector()` → `Matrix.multiplyVector()` ✅
- `Rn.times()` → `Rn.times()` ✅
- `Rn.inverse()` → `Rn.inverse()` ✅

### 5. DataList Access Patterns

- Java `DataList.toDoubleArrayArray()` → JavaScript `fromDataList()` utility ✅
- Java `DataList.toIntArrayArray()` → JavaScript `fromDataList()` utility ✅
- Access patterns are already established in existing renderers

### 6. Scene Graph Traversal

- `SceneGraphVisitor` pattern already exists ✅
- `visit()` methods map directly
- Path management via `SceneGraphPath` ✅

## Dependencies Mapping

### Already Available ✅
- `Rn`, `Pn`, `P3` - Math utilities
- `Matrix` - Matrix class
- `SceneGraphPath` - Path management
- `SceneGraphComponent` - Component nodes
- `SceneGraphVisitor` - Visitor pattern
- `IndexedFaceSet`, `IndexedLineSet`, `PointSet` - Geometry types
- `Sphere`, `Cylinder` - Primitive geometries
- `Appearance`, `CommonAttributes` - Appearance system
- `Camera`, `CameraUtility` - Camera utilities
- `DataList`, `GeometryAttribute` - Data structures

### May Need Translation ⚠️
- `PickUtility` - Utility class (check if exists)
- `SystemProperties` - System property access (may need browser equivalent)
- `Secure` - Security utilities (may need browser equivalent)

## Implementation Order

### Recommended Sequence:

1. **Phase 1: Core Interfaces** (Foundation)
   - `PickResult.js`
   - `PickSystem.js`
   - `HitFilter.js`

2. **Phase 2: Basic Implementation** (Working system)
   - `Hit.js` (with basic functionality)
   - `Graphics3D.js`
   - `BruteForcePicking.js`

3. **Phase 3: Full Brute Force** (Complete basic picking)
   - Complete `Hit.js` (texture coordinates, barycentric)
   - Test with simple scenes

4. **Phase 4: Optimization** (Performance)
   - `AABB.js`
   - `AABBTree.js`
   - `AABBPickSystem.js`

5. **Phase 5: Utilities** (Polish)
   - `PosWHitFilter.js`
   - Any additional filters

## Testing Strategy

1. **Unit Tests**: Test each component in isolation
   - Ray-triangle intersection
   - Ray-sphere intersection
   - Ray-cylinder intersection
   - AABB intersection
   - Matrix transformations

2. **Integration Tests**: Test picking system with scene graphs
   - Simple geometry picking
   - Transformed geometry picking
   - Multiple geometry types
   - Filtered picking

3. **Performance Tests**: Compare brute-force vs AABB tree
   - Small scenes (< 100 faces)
   - Medium scenes (100-1000 faces)
   - Large scenes (> 1000 faces)

## Browser-Specific Considerations

### Screen Coordinate Conversion
- Java `Component.getWidth()/getHeight()` → Canvas `clientWidth/clientHeight` or `offsetWidth/offsetHeight`
- Java `Component.getX()/getY()` → May need to account for canvas position in DOM
- Consider using `getBoundingClientRect()` for accurate screen coordinates

### Event Handling Integration
- Mouse click events → Convert screen coordinates to NDC
- Touch events → Similar coordinate conversion
- Integration with viewer's event system

## Potential Challenges

1. **Thread Safety**: Java code uses thread-local variables - not needed in JS (single-threaded)
2. **Memory Management**: Java's garbage collection vs JS - similar patterns
3. **Performance**: AABB tree construction may be slower in JS - profile and optimize
4. **Coordinate Systems**: Ensure consistent use of homogeneous coordinates (4-vectors)
5. **Matrix Storage**: Java uses row-major, verify JS Matrix class uses same convention

## Integration Points

### With Viewers
- `Abstract2DViewer` / `Abstract2DViewer` - Add `pick()` method
- `Canvas2DViewer`, `WebGL2DViewer`, `SVGViewer` - Implement viewer-specific picking

### With Scene Graph
- `SceneGraphComponent.isPickable()` - Already exists ✅
- `SceneGraphComponent.isVisible()` - Already exists ✅
- Appearance attributes - Already supported ✅

### With Tools (Future)
- Tool system will use picking system
- Event handling integration

## Next Steps

1. Create `src/core/pick/` directory
2. Start with `PickResult.js` and `PickSystem.js` interfaces
3. Implement `Hit.js` with basic functionality
4. Implement `Graphics3D.js` for coordinate transformations
5. Implement `BruteForcePicking.js` for basic picking
6. Test with simple scenes
7. Implement AABB tree optimization
8. Add filters and utilities

## Notes

- The picking system is designed to work with 3D scenes, but the current JS project focuses on 2D
- Consider if 2D-only picking optimizations are needed
- The AABB tree is primarily for `IndexedFaceSet` - may need 2D optimizations for line/point picking
- Browser picking could potentially use WebGL picking buffers for hardware acceleration (future optimization)

