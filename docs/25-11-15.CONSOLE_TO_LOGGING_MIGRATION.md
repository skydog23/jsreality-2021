# Strategy: Migrating console.* to LoggingSystem

## Current State Analysis

Based on a scan of the jsreality-2021 codebase, there are **356 console statements** across **29 files**:

### Distribution by File Type

1. **Test Files** (~280 statements, 22 files):
   - `__tests__/*.js` files contain the majority of console statements
   - Used for test output, assertions, and validation
   - Pattern: Informational test progress messages

2. **Production Code** (~65 statements, 7 files):
   - Viewer implementations (Canvas2D, SVG)
   - Core scene/math utilities
   - Animation utilities
   - Pattern: Debug traces, warnings, and errors

3. **LoggingSystem itself** (11 statements):
   - Internal implementation of the logging framework
   - Should NOT be replaced

### Key Production Files with Console Statements

| File | Count | Types Used | Purpose |
|------|-------|------------|---------|
| `SVGViewer.js` | 21 | log, warn | Debug tracing for render flow |
| `Canvas2DViewerTest.js` | 17 | log, error | Test output and validation |
| `Abstract2DRenderer.js` | 4 | log, error, warn | Debug traces and error handling |
| `Camera.js` | 3 | warn | Validation warnings |
| `AnimatedDoubleArrayArraySet.js` | 4 | log | Debug output (conditional) |
| `Canvas2DViewer.js` | 2 | warn, log | Warnings and debug |
| `SceneGraphNode.js` | 1 | log | Debug trace |

## Migration Strategy

### Phase 1: Production Code (Priority 1)

**Goal**: Replace all console statements in production code with appropriate Logger calls.

#### Step 1.1: Viewer Classes (High Priority)
Files: `Canvas2DViewer.js`, `SVGViewer.js`, `Abstract2DRenderer.js`

**Current Pattern:**
```javascript
console.log('SVGViewer.render() called');
console.warn('No camera found in camera path');
console.error('Rendering error:', error);
```

**New Pattern:**
```javascript
import { getLogger, DEBUG } from '../../util/LoggingSystem.js';

class SVGViewer {
  #logger = getLogger(this);

  render() {
    this.#logger.fine(DEBUG.VIEWER, 'SVGViewer.render() called');
    // ...
    if (!camera) {
      this.#logger.warn(DEBUG.VIEWER | DEBUG.ERROR, 'No camera found in camera path');
      return;
    }
  }
}
```

**Migration Rules:**
- `console.log()` → `logger.fine()` or `logger.finer()` (tracing)
- `console.warn()` → `logger.warn()` (warnings)
- `console.error()` → `logger.severe()` (errors)
- `console.info()` → `logger.info()` (informational)

**Category Mapping:**
- Viewer operations → `DEBUG.VIEWER`
- Camera operations → `DEBUG.VIEWER`
- Rendering operations → `DEBUG.VIEWER`
- Errors → `DEBUG.ERROR` (can be combined with other categories)

#### Step 1.2: Core Scene/Math Classes (Medium Priority)
Files: `Camera.js`, `P3.js`, `SceneGraphNode.js`, `Rn.js`

**Current Pattern:**
```javascript
console.warn('Stereo camera must be perspective, setting it so.');
console.warn("lineIntersectPlane: Line lies in plane");
```

**New Pattern:**
```javascript
import { getLogger, DEBUG } from '../util/LoggingSystem.js';

const logger = getLogger('Camera'); // or getLogger(this) in class

// Validation warning
logger.warn(DEBUG.SCENE, 'Stereo camera must be perspective, setting it so.');

// Math warning
logger.warn(DEBUG.UTIL, 'lineIntersectPlane: Line lies in plane');
```

**Category Mapping:**
- Scene graph operations → `DEBUG.SCENE`
- Math operations → `DEBUG.UTIL`
- Validation warnings → appropriate category + `DEBUG.ERROR`

#### Step 1.3: Animation Classes (Low Priority)
Files: `AnimatedDoubleArrayArraySet.js`, `SimpleKeyFrameAnimated.js`, etc.

**Current Pattern:**
```javascript
if (typeof console !== 'undefined' && console.log) {
    console.log('AnimatedDoubleArrayArraySet keys =', this.keySet);
}
```

**New Pattern:**
```javascript
import { getLogger, DEBUG } from '../../util/LoggingSystem.js';

class AnimatedDoubleArrayArraySet {
  #logger = getLogger(this);

  someMethod() {
    this.#logger.finest(DEBUG.GENERAL, 'AnimatedDoubleArrayArraySet keys =', this.keySet);
  }
}
```

**Note**: These conditional console checks can be removed entirely as the LoggingSystem handles filtering.

### Phase 2: Test Files (Priority 2)

**Goal**: Replace console statements in test files with appropriate Logger calls for consistency.

#### Decision Point: Keep or Replace?

**Option A: Keep console.log in tests** (Recommended)
- **Pros**: 
  - Tests are meant to be run and observed directly
  - Console output is the expected test output format
  - Simple and straightforward
  - No dependency on LoggingSystem configuration
- **Cons**: 
  - Inconsistent with production code
  - Can't be filtered by level/category

**Option B: Replace with Logger** (Optional)
- **Pros**: 
  - Consistent with production code
  - Can filter test output by level/category
  - Better structure for large test suites
- **Cons**: 
  - Tests become dependent on LoggingSystem config
  - May complicate test debugging
  - More work for marginal benefit

**Recommendation**: Keep console.log in test files for now. Only migrate if test output becomes overwhelming.

### Phase 3: Debug Traces in Production (Priority 3)

**Goal**: Remove temporary debug console.log statements that are no longer needed.

#### Files with Debug Traces to Remove:
- `SVGViewer.js`: Has extensive debug traces (21 statements)
- `Abstract2DRenderer.js`: Has debug traces (4 statements)
- `Canvas2DViewer.js`: Has one debug backgroundColor trace

**Strategy**: 
1. Replace with logger calls at appropriate levels
2. Configure default log level to suppress these traces in production
3. Enable selectively for debugging specific modules

**Example:**
```javascript
// Current (debug trace to remove)
console.log('backgroundColor', backgroundColor, this.toCSSColor(backgroundColor));

// Replace with (suppressed by default, enable when needed)
this.#logger.finest(DEBUG.VIEWER, 'backgroundColor', backgroundColor, this.toCSSColor(backgroundColor));

// Then in production config:
setGlobalLevel(Level.WARNING); // Suppresses FINEST
// But for debugging:
setModuleLevel('Canvas2DViewer', Level.FINEST); // Enable detailed traces
```

## Implementation Plan

### Step-by-Step Migration

#### Step 1: Canvas2DViewer.js
**Estimated effort**: 15 minutes

```javascript
// Add import at top
import { getLogger, DEBUG } from '../util/LoggingSystem.js';

// Add logger field
class Canvas2DViewer {
  #logger = getLogger(this);
  
  // Replace console statements
  render() {
    const camera = this._getCamera();
    if (!camera) {
      this.#logger.warn(DEBUG.VIEWER | DEBUG.ERROR, 'No camera found in camera path');
      return;
    }
  }
  
  _clearCanvas() {
    // Remove or replace debug trace
    this.#logger.finest(DEBUG.VIEWER, 'backgroundColor', backgroundColor, this.toCSSColor(backgroundColor));
  }
}
```

#### Step 2: SVGViewer.js
**Estimated effort**: 30 minutes (21 statements)

```javascript
import { getLogger, DEBUG } from '../util/LoggingSystem.js';

class SVGViewer {
  #logger = getLogger(this);
  
  render() {
    this.#logger.fine(DEBUG.VIEWER, 'SVGViewer.render() called');
    this.#logger.finer(DEBUG.VIEWER, 'Scene root:', this.#sceneRoot?.getName());
    this.#logger.finer(DEBUG.VIEWER, 'Camera path:', this.#cameraPath);
    // ... etc
  }
}
```

**Suggested log levels for SVGViewer traces:**
- Method entry/exit → `FINE`
- Parameter details → `FINER`
- Internal state → `FINEST`

#### Step 3: Abstract2DRenderer.js
**Estimated effort**: 10 minutes

```javascript
import { getLogger, DEBUG } from '../util/LoggingSystem.js';

class Abstract2DRenderer {
  #logger = getLogger(this);
  
  render(sceneRoot) {
    try {
      this.#logger.finer(DEBUG.VIEWER, 'Calling sceneRoot.accept(this)');
      sceneRoot.accept(this);
      this.#logger.finer(DEBUG.VIEWER, 'sceneRoot.accept(this) completed');
    } catch (error) {
      this.#logger.severe(DEBUG.ERROR, 'Rendering error:', error);
    }
  }
  
  visitIndexedLineSet(geometry) {
    // ...
    if (/* unsupported format */) {
      this.#logger.warn(DEBUG.GEOMETRY, 'Edge indices format not supported yet');
    }
  }
}
```

#### Step 4: Camera.js
**Estimated effort**: 5 minutes

```javascript
import { getLogger, DEBUG } from '../util/LoggingSystem.js';

class Camera {
  #logger = getLogger(this);
  
  setStereo(value) {
    if (value && !this.#isPerspective) {
      this.#logger.warn(DEBUG.SCENE, 'Stereo camera must be perspective, setting it so.');
      this.#isPerspective = true;
    }
  }
}
```

#### Step 5: Other Production Files
**Estimated effort**: 20 minutes

- `P3.js`: 1 warning → `logger.warn(DEBUG.UTIL, ...)`
- `SceneGraphNode.js`: 1 log → `logger.fine(DEBUG.SCENE, ...)`
- `Rn.js`: 2 logs → `logger.fine(DEBUG.UTIL, ...)`
- `AnimatedDoubleArrayArraySet.js`: 4 logs → `logger.finest(DEBUG.GENERAL, ...)`
- `SimpleKeyFrameAnimated.js`: 2 logs → `logger.finer(DEBUG.GENERAL, ...)`
- `KeyFrameAnimatedTransformation.js`: 2 logs → `logger.finer(DEBUG.TRANSFORMATION, ...)`
- `KeyFrameAnimatedIsometry.js`: 2 logs → `logger.finer(DEBUG.TRANSFORMATION, ...)`

### Total Estimated Effort: ~2 hours for all production code

## Log Level Guidelines

### When to Use Each Level

| Level | Usage | Example |
|-------|-------|---------|
| `SEVERE` | Unrecoverable errors | `logger.severe(DEBUG.ERROR, 'Failed to initialize viewer', error)` |
| `WARNING` | Recoverable problems, validation | `logger.warn(DEBUG.SCENE, 'Invalid parameter, using default')` |
| `INFO` | Important events, initialization | `logger.info(DEBUG.VIEWER, 'Viewer initialized', width, height)` |
| `CONFIG` | Configuration values | `logger.config(DEBUG.VIEWER, 'Setting camera path', path)` |
| `FINE` | Method entry/exit | `logger.fine(DEBUG.VIEWER, 'render() called')` |
| `FINER` | Detailed method traces | `logger.finer(DEBUG.VIEWER, 'Processing vertex', index)` |
| `FINEST` | Very detailed traces | `logger.finest(DEBUG.VIEWER, 'Transform matrix', matrix)` |

### Category Selection Guidelines

| Category | Usage |
|----------|-------|
| `DEBUG.SCENE` | Scene graph operations, component management |
| `DEBUG.GEOMETRY` | Geometry processing, vertex/index operations |
| `DEBUG.SHADER` | Shader and appearance attributes |
| `DEBUG.VIEWER` | Viewer rendering, canvas operations |
| `DEBUG.INSPECTOR` | Inspector UI operations |
| `DEBUG.TRANSFORMATION` | Matrix operations, transformations |
| `DEBUG.UTIL` | Utility functions, math operations |
| `DEBUG.IO` | File I/O, network operations |
| `DEBUG.ERROR` | Error conditions (combine with other categories) |
| `DEBUG.GENERAL` | Everything else |

## Production Configuration

### Recommended Default Configuration

```javascript
// In main application entry point or config file
import { setGlobalLevel, setModuleLevel, Level } from './core/util/LoggingSystem.js';

// Production: only show warnings and errors
setGlobalLevel(Level.WARNING);

// Development: show informational messages
if (process.env.NODE_ENV === 'development') {
  setGlobalLevel(Level.INFO);
}

// Debugging specific modules (enable as needed)
// setModuleLevel('Canvas2DViewer', Level.FINEST);
// setModuleLevel('SVGViewer', Level.FINE);
// setModuleLevel('SceneGraphInspector', Level.FINER);
```

## Benefits of Migration

1. **Performance**: Filtered messages are short-circuited before formatting
2. **Flexibility**: Enable/disable logging by module and category
3. **Consistency**: Uniform logging format across codebase
4. **Production-Ready**: Clean console output in production builds
5. **Debugging**: Fine-grained control for debugging specific subsystems
6. **Maintainability**: Clear categorization of log messages

## Testing the Migration

After each file migration:

1. **Run existing tests**: Ensure functionality unchanged
2. **Test with default level**: Verify no unwanted output
3. **Test with verbose level**: Verify messages appear correctly
4. **Check message formatting**: Verify module name and category display

## Future Enhancements

Once migration is complete, consider:

1. **Browser DevTools Integration**: Add filtering UI
2. **Log to File**: Capture logs for later analysis
3. **Performance Metrics**: Add timing to log messages
4. **Remote Logging**: Send error logs to server
5. **Log Viewer UI**: In-app log browser with filtering

## Summary

This migration strategy provides:
- **Clear prioritization**: Production code first, tests optional
- **Consistent patterns**: Standard mapping from console to logger
- **Practical guidance**: Step-by-step migration plan
- **Reasonable effort**: ~2 hours for production code
- **Immediate benefits**: Better debugging and cleaner production output

