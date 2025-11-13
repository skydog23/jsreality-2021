# Canvas2DViewer Refactoring Progress

## Step 1: Extract Abstract2DViewer ✓

### Created: `Abstract2DViewer.js`

**Device-Independent Code (now in Abstract2DViewer):**
- Scene root management (`#sceneRoot`, `getSceneRoot()`, `setSceneRoot()`)
- Camera path management (`#cameraPath`, `getCameraPath()`, `setCameraPath()`)
- `_getCamera()` - Extracts camera from camera path
- `_computeCam2NDCMatrix(camera, aspect)` - Computes projection matrix
- `hasViewingComponent()`, `canRenderAsync()`, `renderAsync()`

**Abstract Methods (must be implemented by subclasses):**
- `render()` - Create and run the renderer
- `getViewingComponent()` - Return the viewing surface
- `getViewingComponentSize()` - Return dimensions

### Modified: `Canvas2DViewer.js`

**Changes:**
1. Now extends `Abstract2DViewer` instead of `Viewer`
2. Removed `#sceneRoot` and `#cameraPath` fields (inherited)
3. Removed `getSceneRoot()`, `setSceneRoot()`, `getCameraPath()`, `setCameraPath()` (inherited)
4. Removed `_getCamera()` (inherited)
5. Simplified `_computeCam2NDCMatrix()` to compute aspect and call `super._computeCam2NDCMatrix(camera, aspect)`
6. Removed `hasViewingComponent()`, `canRenderAsync()`, `renderAsync()` (inherited)

**Retained (Canvas-specific):**
- `#canvas`, `#context` - HTML5 Canvas specific
- `#setupCanvas()`, `#setupResizeHandling()` - Canvas specific
- `setPixelRatio()`, `exportImage()` - Canvas specific
- `_getViewingComponent()` - Returns canvas
- Canvas2DRenderer class - Canvas specific rendering

## Testing Required

Please test the following to confirm Canvas2DViewer still works:

1. **canvas2d-test.html** - Basic Canvas2D test
2. **canvas2d-inspector.html** - Canvas2D with inspector
3. **Verify:**
   - Scene renders correctly
   - Points, lines, and faces display
   - Camera projection works
   - Export image still works
   - Inspector integration still works

## Step 2: Extract Abstract2DRenderer ✓

### Created: `Abstract2DRenderer.js`

**Device-Independent Code (now in Abstract2DRenderer):**
- Appearance stack (`#appearanceStack`, management methods)
- Transformation stack (`#transformationStack`, management methods)
- World-to-NDC matrix (`#world2ndc`)
- `render()` orchestration - computes transforms, calls abstract methods
- `visitComponent()` - Scene graph traversal
- `visitTransformation()` - Transformation stack management
- `visitAppearance()` - Appearance stack management
- `getAppearanceAttribute()`, `toCSSColor()`, `getBooleanAttribute()`, `getNumericAttribute()`
- `getCurrentTransformation()`

**Abstract Methods (must be implemented by subclasses):**
- `_setupRendering()` - Device-specific rendering setup
- `_clearSurface()` - Clear surface and draw background
- `_pushTransformState()` - Save device transformation state
- `_popTransformState()` - Restore device transformation state
- `_applyTransform(matrix)` - Apply transformation to device
- `visitPointSet()`, `visitIndexedLineSet()`, `visitIndexedFaceSet()` - Geometry rendering

### Modified: `Canvas2DRenderer`

**Changes:**
1. Now extends `Abstract2DRenderer` instead of `SceneGraphVisitor`
2. Removed `#viewer`, `#camera`, `#appearanceStack`, `#transformationStack`, `#world2ndc` (inherited)
3. Removed `render()` (inherited)
4. Removed `visitComponent()`, `visitTransformation()`, `visitAppearance()` (inherited)
5. Removed `getAppearanceAttribute()`, `toCSSColor()`, `getBooleanAttribute()`, `getNumericAttribute()` (inherited)
6. Removed `getCurrentTransformation()` (inherited)
7. Implemented abstract methods:
   - `_setupRendering()` → calls `_setupCanvasTransform()`
   - `_clearSurface()` → calls `_clearCanvas()`
   - `_pushTransformState()` → `ctx.save()`
   - `_popTransformState()` → `ctx.restore()`
   - `_applyTransform(matrix)` → calls `pushTransform(ctx, matrix)`
8. Updated field access to use protected getters (`_getViewer()`, `_getAppearanceStack()`, etc.)

**Retained (Canvas-specific):**
- `#context`, `#canvas` - HTML5 Canvas specific
- `_setupCanvasTransform()` - NDC-to-screen canvas transform
- `pushTransform()` - Apply 4x4 matrix to canvas context
- `_clearCanvas()` - Clear canvas with background
- Geometry rendering methods (`#renderVerticesAsPoints`, etc.)

## Next Steps

Once Canvas2DViewer + Canvas2DRenderer are confirmed working:

1. **Refactor SVGViewer** - Extend Abstract2DViewer
2. **Create SVGRenderer** - Extend Abstract2DRenderer

## Architecture

```
Abstract2DViewer (device-independent viewer)
├── Scene/camera management
├── Projection computation
└── Abstract methods for device-specific ops

    ├─> Canvas2DViewer (Canvas 2D API)
    │   └─> Canvas2DRenderer (extends Abstract2DRenderer)
    │       ├─ ctx.save() / ctx.restore()
    │       ├─ ctx.transform()
    │       └─ Canvas drawing primitives
    │
    └─> SVGViewer (SVG DOM API) [TO BE REFACTORED]
        └─> SVGRenderer (extends Abstract2DRenderer)
            ├─ SVG group nesting
            ├─ SVG transform attributes
            └─ SVG element creation

Abstract2DRenderer (device-independent renderer)
├── Appearance stack
├── Transformation stack
├── Scene graph traversal (visitComponent, etc.)
└── Abstract methods:
    ├─ _setupRendering()
    ├─ _clearSurface()
    ├─ _pushTransformState()
    ├─ _popTransformState()
    ├─ _applyTransform(matrix)
    └─ visitPointSet/LineSet/FaceSet()
```

