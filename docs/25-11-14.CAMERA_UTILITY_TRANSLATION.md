# CameraUtility Translation

## Summary

Translated functions 1-11 from Java's `CameraUtility.java` to JavaScript's `CameraUtility.js`.

## What Was Done

### 1. Enhanced Rectangle2D Class

**File:** `src/core/scene/Camera.js`

**Added Methods:**
- `getMinX()` - Get minimum X coordinate
- `getMinY()` - Get minimum Y coordinate
- `getMaxX()` - Get maximum X coordinate
- `getMaxY()` - Get maximum Y coordinate
- `getWidth()` - Get width
- `getHeight()` - Get height
- `setFrameFromDiagonal(x1, y1, x2, y2)` - Set rectangle from diagonal corners
- `clone()` - Create a copy
- `toString()` - String representation

**Constructor:** Now has default parameters: `constructor(x = 0, y = 0, width = 0, height = 0)`

### 2. Created CameraUtility Module

**File:** `src/core/util/CameraUtility.js`

**Translated Functions:**

#### Basic Camera Access
1. ✅ **`getCamera(v)`** - Get the camera from a viewer
2. ✅ **`getCameraNode(v)`** - Get the SceneGraphComponent containing the camera

#### Aspect Ratio
3. ✅ **`getAspectRatio(v)`** - Get the aspect ratio of the viewer's output window

#### Camera-to-NDC Transformations (Projection matrices)
4. ✅ **`getCameraToNDC(v)`** - Get camera-to-NDC transform for a viewer
5. ✅ **`getCameraToNDCWithAspect(cam, aspectRatio)`** - With explicit aspect ratio
6. ✅ **`getCameraToNDCWithEye(cam, aspectRatio, which)`** - For stereo (LEFT_EYE/RIGHT_EYE/MIDDLE_EYE)
7. ✅ **`getCameraToNDCFull(cam, aspectRatio, which, metric)`** - With metric (Euclidean/hyperbolic/elliptic)

#### Inverse Transformations
8. ✅ **`getNDCToCamera(v)`** - Inverse of getCameraToNDC (for viewer)
9. ✅ **`getNDCToCameraWithAspect(cam, aspectRatio)`** - Inverse (for camera + aspect)

#### Viewport Calculations
10. ✅ **`getViewport(cam, aspectRatio)`** - Get the viewport rectangle at z=1
11. ✅ **`getOffAxisViewPort(cam, viewPort, eyePosition)`** - For off-axis/stereo cameras

#### Helper Functions (needed by others)
- ✅ **`getEyePosition(cam, which)`** - Get eye position for stereo (LEFT/RIGHT/MIDDLE)

**Constants Exported:**
- `MIDDLE_EYE = 0`
- `LEFT_EYE = 1`
- `RIGHT_EYE = 2`

## Usage Example

```javascript
import * as CameraUtility from './core/util/CameraUtility.js';

// Get camera from viewer
const camera = CameraUtility.getCamera(viewer);

// Get aspect ratio
const aspect = CameraUtility.getAspectRatio(viewer);

// Get projection matrix
const projMatrix = CameraUtility.getCameraToNDC(viewer);

// Get viewport
const viewport = CameraUtility.getViewport(camera, aspect);

// Stereo support
const leftEyeMatrix = CameraUtility.getCameraToNDCWithEye(
  camera, 
  aspect, 
  CameraUtility.LEFT_EYE
);
```

## Dependencies

All required dependencies were already translated:
- ✅ `Camera` class (with all needed methods)
- ✅ `Viewer` interface
- ✅ `Rectangle2D` class (now enhanced)
- ✅ `Rn` math module (inverse, times, matrixTimesVector)
- ✅ `Pn` math module (EUCLIDEAN constant, dehomogenize)
- ✅ `P3` math module (makePerspectiveProjectionMatrix, makeOrthographicProjectionMatrix, makeTranslationMatrix)

## Testing

To test the CameraUtility functions:

```javascript
import { Canvas2DViewer } from './core/viewers/Canvas2DViewer.js';
import * as CameraUtility from './core/util/CameraUtility.js';

const canvas = document.getElementById('mycanvas');
const viewer = new Canvas2DViewer(canvas);

// ... set up scene and camera path ...

// Get camera info
const camera = CameraUtility.getCamera(viewer);
console.log('Field of view:', camera.getFieldOfView());

// Get projection matrix
const c2ndc = CameraUtility.getCameraToNDC(viewer);
console.log('Camera to NDC matrix:', c2ndc);

// Get viewport
const aspect = CameraUtility.getAspectRatio(viewer);
const viewport = CameraUtility.getViewport(camera, aspect);
console.log('Viewport:', viewport.toString());
```

## Notes

1. **Function 12 skipped**: `getNearViewport()` was incomplete in Java (just returns empty array), so it was not translated.

2. **Stereo Support**: Functions 6, 7, 11, and getEyePosition provide full stereo/VR camera support including:
   - Left/right eye projection matrices
   - Off-axis viewing frustums
   - Eye separation and focus distance

3. **Metrics**: Function 7 supports different geometries via the `metric` parameter (Euclidean, hyperbolic, elliptic) using the existing Pn constants.

4. **Naming Convention**: JavaScript doesn't support method overloading, so I used descriptive suffixes:
   - `getCameraToNDC()` - basic version
   - `getCameraToNDCWithAspect()` - with aspect ratio
   - `getCameraToNDCWithEye()` - with eye selection
   - `getCameraToNDCFull()` - full version with all parameters

## Files Modified

- `src/core/scene/Camera.js` - Enhanced Rectangle2D class
- `src/core/util/CameraUtility.js` - New file with translated functions
- `src/core/util/index.js` - Export CameraUtility module

