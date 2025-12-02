# LoggingSystem Documentation

## Overview

The `LoggingSystem` provides a flexible, hierarchical logging framework for jsReality-2021, inspired by Java's `java.util.logging` but adapted for JavaScript/browser environments.

## Key Features

1. **Log Levels** - SEVERE, WARNING, INFO, CONFIG, FINE, FINER, FINEST
2. **Category Flags** - Bitwise flags for selective logging by subsystem
3. **Module-specific Configuration** - Different log levels for different modules
4. **Console Integration** - Uses standard browser console methods
5. **Zero Runtime Cost** - Filtered messages are short-circuited before formatting

## Architecture

### Log Levels

Matching Java's `java.util.logging.Level`:

| Level     | Value | Console Method  | Purpose                      |
|-----------|-------|-----------------|------------------------------|
| SEVERE    | 1000  | `console.error` | Serious errors               |
| WARNING   | 900   | `console.warn`  | Potential problems           |
| INFO      | 800   | `console.info`  | Informational messages       |
| CONFIG    | 700   | `console.log`   | Configuration messages       |
| FINE      | 500   | `console.log`   | Tracing information          |
| FINER     | 400   | `console.log`   | Detailed tracing             |
| FINEST    | 300   | `console.log`   | Highly detailed tracing      |

### Categories (Bitwise Flags)

Categories can be combined with the bitwise OR operator (`|`):

| Category       | Value | Description                  |
|----------------|-------|------------------------------|
| SCENE          | 1     | Scene graph operations       |
| GEOMETRY       | 2     | Geometry processing          |
| SHADER         | 4     | Shader and appearance        |
| VIEWER         | 8     | Viewer rendering             |
| INSPECTOR      | 16    | Inspector UI                 |
| TRANSFORMATION | 32    | Matrix transformations       |
| UTIL           | 64    | Utility functions            |
| IO             | 128   | Input/output                 |
| ERROR          | 256   | Error conditions             |
| GENERAL        | 512   | General/uncategorized        |

### DEBUG Namespace

Following the project convention, categories are also exported as `DEBUG.*`:

```javascript
import { DEBUG } from './util/LoggingSystem.js';

logger.fine(DEBUG.VIEWER, 'Starting render');
logger.info(DEBUG.SHADER, 'Applying appearance');
```

## Usage

### Basic Usage in a Class

```javascript
import { getLogger, DEBUG } from './util/LoggingSystem.js';

class Canvas2DViewer {
  // Get logger for this class instance
  #logger = getLogger(this);

  render() {
    this.#logger.fine(DEBUG.VIEWER, 'Starting render');
    
    try {
      // ... rendering code ...
      this.#logger.finest(DEBUG.VIEWER, 'Render complete');
    } catch (e) {
      this.#logger.severe(DEBUG.ERROR, 'Render failed:', e);
    }
  }
}
```

### Basic Usage in a Module

```javascript
import { getLogger, DEBUG } from './util/LoggingSystem.js';

// Create a named logger
const logger = getLogger('GeometryUtils');

export function processVertices(vertices) {
  logger.info(DEBUG.GEOMETRY, 'Processing vertices:', vertices.length);
  // ... processing code ...
}
```

### Configuration

#### Global Level (Default for All Modules)

```javascript
import { setGlobalLevel, Level } from './util/LoggingSystem.js';

// Only show WARNING and SEVERE by default
setGlobalLevel(Level.WARNING);

// Show all messages (for debugging)
setGlobalLevel(Level.FINEST);
```

#### Module-Specific Levels

```javascript
import { setModuleLevel, Level } from './util/LoggingSystem.js';

// Enable detailed logging for specific modules
setModuleLevel('Canvas2DViewer', Level.FINE);
setModuleLevel('SceneGraphInspector', Level.FINEST);
setModuleLevel('DefaultGeometryShader', Level.FINER);
```

#### Category Filtering

```javascript
import { setEnabledCategories, DEBUG } from './util/LoggingSystem.js';

// Only show VIEWER, SHADER, and ERROR messages
setEnabledCategories(DEBUG.VIEWER | DEBUG.SHADER | DEBUG.ERROR);

// Show all categories
setEnabledCategories(0xFFFFFFFF);

// Disable specific categories
import { disableCategories } from './util/LoggingSystem.js';
disableCategories(DEBUG.GEOMETRY | DEBUG.TRANSFORMATION);
```

## Examples

### Example 1: Scene Graph Operations

```javascript
import { getLogger, DEBUG, Level } from './util/LoggingSystem.js';

class SceneGraphComponent {
  #logger = getLogger(this);

  addChild(child) {
    this.#logger.fine(DEBUG.SCENE, 'Adding child:', child.getName());
    this.#children.push(child);
    child.setParent(this);
    this.#logger.finest(DEBUG.SCENE, 'Child added, total children:', this.#children.length);
  }
}
```

### Example 2: Error Handling

```javascript
import { getLogger, DEBUG } from './util/LoggingSystem.js';

const logger = getLogger('GeometryLoader');

export async function loadGeometry(url) {
  logger.info(DEBUG.IO, 'Loading geometry from:', url);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.warn(DEBUG.IO, 'Failed to load geometry:', response.status);
      return null;
    }
    
    const data = await response.json();
    logger.fine(DEBUG.IO, 'Geometry loaded successfully, vertices:', data.vertices.length);
    return data;
    
  } catch (e) {
    logger.severe(DEBUG.ERROR, 'Error loading geometry:', e);
    throw e;
  }
}
```

### Example 3: Performance Tracing

```javascript
import { getLogger, DEBUG, Level } from './util/LoggingSystem.js';

class Canvas2DRenderer {
  #logger = getLogger(this);

  render() {
    this.#logger.fine(DEBUG.VIEWER, 'Render started');
    const startTime = performance.now();
    
    this.#logger.finer(DEBUG.VIEWER, 'Setting up canvas transform');
    this.#setupCanvasTransform();
    
    this.#logger.finer(DEBUG.VIEWER, 'Traversing scene graph');
    this.#sceneGraphRoot.accept(this);
    
    const elapsed = performance.now() - startTime;
    this.#logger.fine(DEBUG.VIEWER, `Render complete in ${elapsed.toFixed(2)}ms`);
  }
}
```

## Comparison with Java LoggingSystem

### Similarities

- Hierarchical log levels (SEVERE → FINEST)
- Module/package-based logger naming
- Global and per-module level configuration
- Singleton pattern
- Factory method `getLogger()`

### Differences

| Feature                  | Java                              | JavaScript                        |
|--------------------------|-----------------------------------|-----------------------------------|
| Log levels               | 7 levels (SEVERE → FINEST)        | Same 7 levels                     |
| Module identification    | Via reflection (`Package.getName()`) | Via constructor name or string |
| Output                   | Handlers (Console, File, etc.)    | Browser console methods           |
| Category filtering       | Not built-in                      | Bitwise category flags            |
| Configuration            | Properties file or code           | Code-based configuration          |
| Formatting               | Custom `Formatter` class          | Simple prefix formatting          |

## Best Practices

### 1. Choose the Right Level

- **SEVERE**: Unrecoverable errors that prevent functionality
- **WARNING**: Recoverable problems, deprecated usage
- **INFO**: Important state changes, initialization
- **CONFIG**: Configuration values
- **FINE**: Method entry/exit, major steps
- **FINER**: Detailed tracing within methods
- **FINEST**: Very detailed tracing, loop iterations

### 2. Choose the Right Category

- Use the most specific category for your message
- Combine categories if a message relates to multiple subsystems
- Always include `DEBUG.ERROR` for error messages

```javascript
// Good: specific category
logger.fine(DEBUG.GEOMETRY, 'Processing vertices');

// Good: combined categories
logger.info(DEBUG.VIEWER | DEBUG.SHADER, 'Applying shader to viewer');

// Bad: using GENERAL when a specific category exists
logger.fine(DEBUG.GENERAL, 'Processing vertices');
```

### 3. Avoid String Concatenation

Pass objects as separate arguments to avoid concatenation cost when logging is disabled:

```javascript
// Good: arguments not formatted unless logging is enabled
logger.fine(DEBUG.VIEWER, 'Rendering', vertexCount, 'vertices');

// Bad: string concatenation happens even if logging is disabled
logger.fine(DEBUG.VIEWER, 'Rendering ' + vertexCount + ' vertices');
```

### 4. Production Configuration

For production builds, set a conservative global level:

```javascript
import { setGlobalLevel, Level } from './util/LoggingSystem.js';

if (import.meta.env.PROD) {
  setGlobalLevel(Level.WARNING); // Only warnings and errors
} else {
  setGlobalLevel(Level.INFO); // Development: informational and above
}
```

### 5. Debugging Specific Modules

When debugging, enable detailed logging only for modules of interest:

```javascript
import { setGlobalLevel, setModuleLevel, Level } from './util/LoggingSystem.js';

// Keep global level conservative
setGlobalLevel(Level.WARNING);

// Enable detailed logging for modules you're debugging
setModuleLevel('Canvas2DViewer', Level.FINEST);
setModuleLevel('SceneGraphInspector', Level.FINER);
```

## Testing

Open `test/logging-test.html` in a browser to see interactive examples of the logging system in action. The test page demonstrates:

1. Basic logging at different levels
2. Log level filtering
3. Category filtering
4. Module-specific levels
5. Combined filters (level + category + module)

## Future Enhancements

Possible future additions:

1. **Log to File** - Save logs to a file (for Node.js contexts)
2. **Custom Handlers** - Allow custom output destinations
3. **Timestamp Formatting** - Add timestamps to log messages
4. **Performance Metrics** - Built-in timing/profiling support
5. **Log Filtering UI** - Browser extension or in-app UI for configuration

## See Also

- Java documentation: [java.util.logging](https://docs.oracle.com/javase/8/docs/api/java/util/logging/package-summary.html)
- Original Java implementation: `jreality-2021/src-core/de/jreality/util/LoggingSystem.java`

