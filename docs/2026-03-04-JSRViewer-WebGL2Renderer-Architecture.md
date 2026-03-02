# JSRViewer & WebGL2Renderer Architecture

## Project Overview

**jsreality-2021** is a JavaScript port of the Java **jReality** 3D visualization framework. The porting follows strict guidelines in `JAVA2JS_PORTING_GUIDELINES.md`: 1:1 translation from Java, ESM named exports, single-function runtime dispatch for overloads, JSDoc with concrete JS types, and no behavioral refactoring unless explicitly permitted.

## Rendering Architecture

The rendering system follows a **visitor pattern** over a hierarchical scene graph. Here is the class hierarchy:

```mermaid
classDiagram
    direction TB
    Viewer <|-- Abstract2DViewer
    Abstract2DViewer <|-- WebGL2Viewer
    Abstract2DViewer <|-- Canvas2DViewer
    Abstract2DViewer <|-- SVGViewer
    Viewer <|-- ViewerSwitch

    SceneGraphVisitor <|-- Abstract2DRenderer
    Abstract2DRenderer <|-- WebGL2Renderer
    Abstract2DRenderer <|-- Canvas2DRenderer

    WebGL2Viewer --> WebGL2Renderer : creates lazily
    ViewerSwitch --> Viewer : wraps multiple

    class Viewer {
        +getSceneRoot()
        +setCameraPath()
        +render()
        +getViewingComponent()
    }
    class Abstract2DViewer {
        -sceneRoot
        -cameraPath
        -renderStats
        +render()
        #_getCamera()
    }
    class WebGL2Viewer {
        -canvas
        -gl
        -renderer
        +render()
        +getGL()
    }
    class Abstract2DRenderer {
        -viewer
        -effectiveAppearance
        -transformationStack
        -object2worldStack
        +render()
        +visitComponent()
        +visitAppearance()
        +visitIndexedFaceSet()
        #_renderFaces()
        #_renderEdgesAsLines()
        #_renderVerticesAsPoints()
    }
    class WebGL2Renderer {
        -gl
        -programs
        -buffers
        +_renderFaces()
        +_applyAppearance()
        +_beginPrimitiveGroup()
    }
```

## Render Flow

The rendering pipeline works as follows:

```mermaid
sequenceDiagram
    participant App as JSRViewer
    participant VS as ViewerSwitch
    participant WV as WebGL2Viewer
    participant WR as WebGL2Renderer
    participant SG as SceneGraph

    App->>VS: render()
    VS->>WV: render()
    WV->>WR: render() (lazy create)
    WR->>WR: beginRender()
    Note over WR: Compute world2NDC matrix<br/>Call _beginRender() (clear, setup)
    WR->>SG: sceneRoot.accept(this)
    SG->>WR: visitComponent(root)
    Note over WR: Push transform & appearance stacks
    SG->>WR: visitTransformation(t)
    SG->>WR: visitAppearance(a)
    Note over WR: Build EffectiveAppearance child<br/>_applyAppearance() (blend state)
    SG->>WR: visitIndexedFaceSet(geom)
    Note over WR: _renderFaces() - batched triangles<br/>_renderEdgesAsLines() - quad strips<br/>_renderVerticesAsPoints() - instanced
    WR->>WR: endRender()
```

## Key Architectural Details

### JSRViewer

`src/app/JSRViewer.js` is the top-level application class. It creates:

- A `ViewerSwitch` wrapping multiple backend viewers (Canvas2D, WebGL2, SVG)
- A scene graph with root, camera, content, and avatar components
- A `ToolSystem` for interaction
- A `RenderTrigger` that watches the scene graph for changes

### Abstract2DRenderer

`src/core/viewers/Abstract2DRenderer.js` handles all device-independent logic:

- Transformation stack management (world2NDC, object2world)
- `EffectiveAppearance` stack for hierarchical attribute resolution
- Scene graph traversal via the visitor pattern
- Geometry dispatch: `visitIndexedFaceSet` calls `_renderFaces`, `_renderEdgesAsLines`, `_renderVerticesAsPoints`

### WebGL2Renderer

`src/core/viewers/WebGL2Renderer.js` (~4250 lines) is the WebGL2 backend. It:

- Overrides `_renderFaces()` to batch all face polygons into a single triangulated mesh draw call (with per-face colors, normals, tex coords)
- Uses **instanced rendering** for points (quads or 3D spheres), edges (3D tubes), and discrete group tessellations
- Manages 5+ shader programs: main (WebGL1 fallback), unified lit (WebGL2), instanced point, instanced sphere, instanced tube
- Handles transparency, fog, lighting (ambient/diffuse/specular), smooth/flat shading, textures
- Overrides `visitComponent()` to detect `instancedGeometry` appearance attributes for discrete group rendering

### Key Source Files

| File | Role |
|------|------|
| `src/core/scene/Viewer.js` | Abstract `Viewer` interface |
| `src/core/viewers/Abstract2DViewer.js` | Scene root, camera path, render stats |
| `src/core/viewers/Abstract2DRenderer.js` | Device-independent scene graph traversal |
| `src/core/viewers/WebGL2Viewer.js` | Canvas, GL context, resize handling |
| `src/core/viewers/WebGL2Renderer.js` | WebGL2 drawing implementation |
| `src/core/viewers/ViewerSwitch.js` | Multi-backend viewer wrapper |
| `src/core/scene/SceneGraphVisitor.js` | Visitor pattern base class |
| `src/app/JSRViewer.js` | Application-level viewer facade |
