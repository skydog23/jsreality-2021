# LoggingSystem Configuration: Examples and Guidelines

## Overview

This document explains how and when to configure the LoggingSystem, with practical examples and recommended patterns.

## Understanding the Two-Dimensional Filter

The LoggingSystem uses **BOTH** level filtering and category filtering. A message will only appear if it passes **BOTH** checks:

1. **Level Check**: Message level ≥ configured level for that module
2. **Category Check**: Message category is in the enabled categories bitmask

### The Filter Logic

From the `LoggingSystem.js` implementation:

```javascript
#shouldLog(level, category) {
  // Check 1: Log level
  const moduleLevel = this.system.moduleConfig.get(this.moduleName) 
                      || this.system.globalLevel;
  if (level < moduleLevel) return false;  // ❌ Level too low

  // Check 2: Category flags
  if ((this.system.enabledCategories & category) === 0) return false;  // ❌ Category disabled

  return true;  // ✅ Both checks passed!
}
```

### Filter Examples

#### Example 1: Both Filters Pass ✅

```javascript
import { getLogger, setGlobalLevel, setEnabledCategories, Level, DEBUG } from './util/LoggingSystem.js';

const logger = getLogger('MyViewer');

// Configuration
setGlobalLevel(Level.FINE);  // Show FINE and above
setEnabledCategories(DEBUG.VIEWER | DEBUG.SHADER);  // Only VIEWER and SHADER

// This message appears ✅
logger.fine(DEBUG.VIEWER, 'Processing viewer');
// ✅ Level: FINE >= FINE (pass)
// ✅ Category: VIEWER is enabled (pass)

// This message appears ✅
logger.info(DEBUG.SHADER, 'Applying shader');
// ✅ Level: INFO >= FINE (pass, INFO is higher than FINE)
// ✅ Category: SHADER is enabled (pass)
```

#### Example 2: Level Too Low ❌

```javascript
setGlobalLevel(Level.WARNING);  // Only WARNING and above
setEnabledCategories(DEBUG.VIEWER);  // VIEWER enabled

// This message does NOT appear ❌
logger.fine(DEBUG.VIEWER, 'Processing viewer');
// ❌ Level: FINE < WARNING (fail)
// ✅ Category: VIEWER is enabled (pass)
// Result: Filtered out due to level
```

#### Example 3: Category Disabled ❌

```javascript
setGlobalLevel(Level.FINE);  // Show FINE and above
setEnabledCategories(DEBUG.SHADER | DEBUG.GEOMETRY);  // Only SHADER and GEOMETRY

// This message does NOT appear ❌
logger.fine(DEBUG.VIEWER, 'Processing viewer');
// ✅ Level: FINE >= FINE (pass)
// ❌ Category: VIEWER not enabled (fail, only SHADER and GEOMETRY are enabled)
// Result: Filtered out due to category
```

#### Example 4: Both Filters Fail ❌

```javascript
setGlobalLevel(Level.WARNING);  // Only WARNING and above
setEnabledCategories(DEBUG.SHADER);  // Only SHADER

// This message does NOT appear ❌
logger.fine(DEBUG.VIEWER, 'Processing viewer');
// ❌ Level: FINE < WARNING (fail)
// ❌ Category: VIEWER not enabled (fail)
// Result: Filtered out due to both level and category
```

### Practical Usage Patterns

#### Pattern 1: Development - Show Everything

```javascript
import { setGlobalLevel, setEnabledCategories, Level } from './util/LoggingSystem.js';

// Show all levels
setGlobalLevel(Level.FINEST);

// Show all categories
setEnabledCategories(0xFFFFFFFF);  // All bits set

// Result: ALL messages appear (except those below FINEST)
```

#### Pattern 2: Production - Errors Only

```javascript
// Only show serious problems
setGlobalLevel(Level.SEVERE);

// All categories enabled (but level filter will catch most)
setEnabledCategories(0xFFFFFFFF);

// Result: Only severe errors appear, regardless of category
```

#### Pattern 3: Debug Specific Subsystem

```javascript
import { setGlobalLevel, setModuleLevel, setEnabledCategories, Level, DEBUG } from './util/LoggingSystem.js';

// Global: only warnings
setGlobalLevel(Level.WARNING);

// Specific module: detailed logging
setModuleLevel('Canvas2DViewer', Level.FINEST);

// Only show VIEWER and ERROR categories
setEnabledCategories(DEBUG.VIEWER | DEBUG.ERROR);

// Results:
// ✅ Canvas2DViewer with DEBUG.VIEWER at any level → appears
// ✅ Canvas2DViewer with DEBUG.ERROR at any level → appears
// ❌ Canvas2DViewer with DEBUG.SHADER at any level → filtered (category)
// ❌ Other modules with DEBUG.VIEWER below WARNING → filtered (level)
// ✅ Other modules with DEBUG.VIEWER at WARNING+ → appears
// ✅ Any module with DEBUG.ERROR at WARNING+ → appears
```

#### Pattern 4: Debugging Scene Graph Only

```javascript
// Default: warnings and above
setGlobalLevel(Level.WARNING);

// Enable detailed logging for scene-related modules
setModuleLevel('SceneGraphComponent', Level.FINEST);
setModuleLevel('SceneGraphPath', Level.FINEST);

// Only show scene-related categories
setEnabledCategories(DEBUG.SCENE | DEBUG.TRANSFORMATION);

// Results:
// ✅ Scene modules with SCENE category → appears (detailed)
// ✅ Scene modules with TRANSFORMATION category → appears (detailed)
// ❌ Scene modules with GEOMETRY category → filtered (category)
// ❌ Viewer modules with SCENE category below WARNING → filtered (level)
```

### Combining Categories with Bitwise OR

You can log to **multiple categories** at once:

```javascript
// This message appears if EITHER category is enabled
logger.warn(DEBUG.VIEWER | DEBUG.ERROR, 'Viewer error occurred');

// Enabled categories: DEBUG.VIEWER only
setEnabledCategories(DEBUG.VIEWER);
// ✅ Message appears (VIEWER is enabled)

// Enabled categories: DEBUG.ERROR only
setEnabledCategories(DEBUG.ERROR);
// ✅ Message appears (ERROR is enabled)

// Enabled categories: DEBUG.SHADER only
setEnabledCategories(DEBUG.SHADER);
// ❌ Message filtered (neither VIEWER nor ERROR is enabled)
```

The bitwise check `(enabledCategories & category) !== 0` returns true if **ANY** of the message's categories are enabled.

### Summary Table

| Level Check | Category Check | Result |
|-------------|----------------|--------|
| ✅ Pass     | ✅ Pass       | ✅ **Message appears** |
| ✅ Pass     | ❌ Fail       | ❌ Filtered out |
| ❌ Fail     | ✅ Pass       | ❌ Filtered out |
| ❌ Fail     | ❌ Fail       | ❌ Filtered out |

### Design Rationale

This two-dimensional filtering provides maximum flexibility:

1. **Level filtering** = "How important is this?"
   - Controls verbosity: detailed traces vs. important events only
   - Typically configured globally with per-module overrides

2. **Category filtering** = "What subsystem does this relate to?"
   - Controls focus: which parts of the system to observe
   - Typically configured once when debugging a specific area

Together, they let you say: *"Show me detailed (FINEST) messages, but only for the viewer subsystem (DEBUG.VIEWER), and only from the Canvas2DViewer module."*

This is much more powerful than a single-dimensional filter!

## When to Configure the LoggingSystem

The LoggingSystem configuration is typically set **once at application initialization**, before the main application logic runs.

## Configuration Patterns

### Pattern 1: Application Entry Point (Recommended)

Create a dedicated initialization module that runs before anything else:

```javascript
// src/core/config/loggingConfig.js

import { 
  setGlobalLevel, 
  setModuleLevel, 
  setEnabledCategories,
  Level, 
  DEBUG 
} from '../util/LoggingSystem.js';

/**
 * Configure logging system for the application
 * Call this once at application startup
 */
export function initializeLogging() {
  // Production default: only warnings and errors
  setGlobalLevel(Level.WARNING);
  
  // Enable all categories by default
  setEnabledCategories(0xFFFFFFFF);
  
  // Optional: Enable detailed logging for specific modules during development
  if (isDevelopmentMode()) {
    setGlobalLevel(Level.INFO);
    // setModuleLevel('Canvas2DViewer', Level.FINEST);
    // setModuleLevel('SceneGraphInspector', Level.FINE);
  }
}

function isDevelopmentMode() {
  // Detect development mode (various strategies)
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1' ||
         window.location.search.includes('debug=true');
}
```

Then in your main application file:

```javascript
// main.js or app.js

import { initializeLogging } from './core/config/loggingConfig.js';
import { Canvas2DViewer } from './core/viewers/Canvas2DViewer.js';
// ... other imports

// Initialize logging FIRST
initializeLogging();

// Now start your application
const viewer = new Canvas2DViewer(canvas);
// ... rest of application logic
```

### Pattern 2: HTML Page Initialization

For browser-based applications, configure in the main HTML file:

```html
<!-- test/canvas2d-test.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Canvas2D Test</title>
</head>
<body>
  <canvas id="canvas2d-test"></canvas>
  
  <script type="module">
    import { setGlobalLevel, setModuleLevel, Level, DEBUG } from '../src/core/util/LoggingSystem.js';
    import { runCanvas2DTest } from '../src/core/viewers/__tests__/Canvas2DViewerTest.js';
    
    // Configure logging BEFORE running tests
    setGlobalLevel(Level.INFO);
    setModuleLevel('Canvas2DViewer', Level.FINE);
    
    // Now run the test
    runCanvas2DTest();
  </script>
</body>
</html>
```

### Pattern 3: Inspector Integration (Runtime Configuration)

For the `SceneGraphInspector`, you might want to allow **runtime reconfiguration**:

```javascript
// src/core/inspect/SceneGraphInspector.js

import { getLogger, setModuleLevel, Level, DEBUG } from '../util/LoggingSystem.js';

class SceneGraphInspector {
  #logger = getLogger(this);
  
  constructor(container) {
    // ... existing constructor code ...
    
    // Add logging configuration UI (optional)
    this.#addLoggingControls();
  }
  
  #addLoggingControls() {
    // Create a "Debug" menu in the inspector
    const debugMenu = document.createElement('details');
    debugMenu.innerHTML = `
      <summary>Debug Logging</summary>
      <label>
        <input type="checkbox" id="debug-inspector"> Inspector
      </label>
      <label>
        <input type="checkbox" id="debug-viewer"> Viewer
      </label>
      <label>
        <input type="checkbox" id="debug-shader"> Shader
      </label>
      <select id="log-level">
        <option value="WARNING">WARNING</option>
        <option value="INFO">INFO</option>
        <option value="FINE">FINE</option>
        <option value="FINEST">FINEST</option>
      </select>
    `;
    
    // Add event listeners to update logging in real-time
    debugMenu.querySelector('#log-level').addEventListener('change', (e) => {
      setGlobalLevel(Level[e.target.value]);
      this.#logger.info(DEBUG.INSPECTOR, 'Log level changed to', e.target.value);
    });
    
    // ... add to UI ...
  }
}
```

## Recommended Configuration File Structure

Create a centralized configuration module:

```javascript
// src/core/config/loggingConfig.js

import { 
  setGlobalLevel, 
  setModuleLevel, 
  setEnabledCategories,
  enableCategories,
  disableCategories,
  Level, 
  DEBUG 
} from '../util/LoggingSystem.js';

/**
 * Logging configuration presets
 */
export const LoggingPresets = {
  /**
   * Production: Only errors and warnings
   */
  PRODUCTION: () => {
    setGlobalLevel(Level.WARNING);
    setEnabledCategories(0xFFFFFFFF);
  },
  
  /**
   * Development: Informational messages and above
   */
  DEVELOPMENT: () => {
    setGlobalLevel(Level.INFO);
    setEnabledCategories(0xFFFFFFFF);
  },
  
  /**
   * Debug: All messages
   */
  DEBUG: () => {
    setGlobalLevel(Level.FINEST);
    setEnabledCategories(0xFFFFFFFF);
  },
  
  /**
   * Debug Viewer: Focus on viewer subsystem
   */
  DEBUG_VIEWER: () => {
    setGlobalLevel(Level.WARNING);
    setModuleLevel('Canvas2DViewer', Level.FINEST);
    setModuleLevel('SVGViewer', Level.FINEST);
    setModuleLevel('Abstract2DRenderer', Level.FINEST);
    setEnabledCategories(DEBUG.VIEWER | DEBUG.ERROR);
  },
  
  /**
   * Debug Scene Graph: Focus on scene operations
   */
  DEBUG_SCENE: () => {
    setGlobalLevel(Level.WARNING);
    setModuleLevel('SceneGraphComponent', Level.FINEST);
    setModuleLevel('SceneGraphPath', Level.FINEST);
    setModuleLevel('SceneGraphNode', Level.FINEST);
    setEnabledCategories(DEBUG.SCENE | DEBUG.TRANSFORMATION | DEBUG.ERROR);
  },
  
  /**
   * Debug Inspector: Focus on inspector UI
   */
  DEBUG_INSPECTOR: () => {
    setGlobalLevel(Level.WARNING);
    setModuleLevel('SceneGraphInspector', Level.FINEST);
    setEnabledCategories(DEBUG.INSPECTOR | DEBUG.SCENE | DEBUG.ERROR);
  },
  
  /**
   * Debug Shader: Focus on shader/appearance system
   */
  DEBUG_SHADER: () => {
    setGlobalLevel(Level.WARNING);
    setModuleLevel('DefaultGeometryShader', Level.FINEST);
    setModuleLevel('EffectiveAppearance', Level.FINEST);
    setModuleLevel('Appearance', Level.FINEST);
    setEnabledCategories(DEBUG.SHADER | DEBUG.ERROR);
  }
};

/**
 * Initialize logging with automatic environment detection
 */
export function initializeLogging(preset = null) {
  if (preset) {
    // Use explicit preset
    LoggingPresets[preset]();
    return;
  }
  
  // Auto-detect environment
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');
  
  if (debugParam) {
    // URL: ?debug=viewer or ?debug=scene or ?debug=true
    const presetName = `DEBUG_${debugParam.toUpperCase()}`;
    if (LoggingPresets[presetName]) {
      LoggingPresets[presetName]();
      console.log(`✓ Logging preset: ${presetName}`);
    } else if (debugParam === 'true') {
      LoggingPresets.DEBUG();
      console.log('✓ Logging preset: DEBUG (all)');
    }
  } else if (isLocalhost()) {
    LoggingPresets.DEVELOPMENT();
    console.log('✓ Logging preset: DEVELOPMENT');
  } else {
    LoggingPresets.PRODUCTION();
  }
}

function isLocalhost() {
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname === '[::1]';
}
```

## Usage Examples

### Example 1: Simple Initialization

```javascript
// main.js
import { initializeLogging } from './core/config/loggingConfig.js';

// Initialize with auto-detection
initializeLogging();

// Or use explicit preset
// initializeLogging('DEBUG_VIEWER');
```

### Example 2: URL Parameter Control

```html
<!-- Users can control logging via URL -->

<!-- Production mode (default) -->
http://example.com/app.html

<!-- Development mode (on localhost) -->
http://localhost:8000/app.html

<!-- Debug viewer subsystem -->
http://localhost:8000/app.html?debug=viewer

<!-- Debug scene graph -->
http://localhost:8000/app.html?debug=scene

<!-- Debug everything -->
http://localhost:8000/app.html?debug=true
```

### Example 3: Test Files

```javascript
// test/canvas2d-test.html
import { LoggingPresets } from '../src/core/config/loggingConfig.js';
import { runCanvas2DTest } from '../src/core/viewers/__tests__/Canvas2DViewerTest.js';

// Configure for this specific test
LoggingPresets.DEBUG_VIEWER();

// Run test
runCanvas2DTest();
```

### Example 4: Runtime Reconfiguration (Advanced)

For debugging purposes, expose logging controls globally:

```javascript
// src/core/config/loggingConfig.js (add to bottom)

/**
 * Expose logging controls globally for runtime debugging
 * Usage in browser console:
 *   window.jsrealityDebug.setPreset('DEBUG_VIEWER')
 *   window.jsrealityDebug.enableModule('Canvas2DViewer', 'FINEST')
 */
if (typeof window !== 'undefined') {
  window.jsrealityDebug = {
    presets: LoggingPresets,
    setPreset: (name) => LoggingPresets[name](),
    enableModule: (module, level) => setModuleLevel(module, Level[level]),
    setLevel: (level) => setGlobalLevel(Level[level]),
    enableCategory: (category) => enableCategories(DEBUG[category]),
    disableCategory: (category) => disableCategories(DEBUG[category]),
  };
}
```

Then in the browser console during runtime:

```javascript
// Enable detailed logging for a specific module
window.jsrealityDebug.enableModule('Canvas2DViewer', 'FINEST');

// Switch to viewer debugging preset
window.jsrealityDebug.setPreset('DEBUG_VIEWER');

// Change global level
window.jsrealityDebug.setLevel('FINE');

// Enable/disable categories
window.jsrealityDebug.enableCategory('SHADER');
window.jsrealityDebug.disableCategory('GEOMETRY');
```

## Summary

### When to Configure

- ✅ **Once at startup** (recommended) - in main entry point before any other code
- ✅ **Before tests run** - in test HTML files or test setup
- ✅ **Via URL parameters** - for easy debugging without code changes
- ✅ **Runtime via console** (optional) - for interactive debugging

### Where to Configure

- **Primary**: `src/core/config/loggingConfig.js` (centralized presets)
- **Entry points**: `main.js`, `app.js`, or test HTML files
- **Optional**: Expose to `window` object for runtime control

### Best Practices

1. **Create preset configurations** for common scenarios
2. **Auto-detect environment** (localhost vs production)
3. **Allow URL parameter overrides** (`?debug=viewer`)
4. **Configure once** before any application code runs
5. **Optionally expose controls** for runtime debugging

This gives you both convenience (auto-configuration) and flexibility (explicit control when needed)!

## Quick Reference

### Available Log Levels (Highest to Lowest)

```javascript
Level.SEVERE   // 1000 - console.error
Level.WARNING  // 900  - console.warn
Level.INFO     // 800  - console.info
Level.CONFIG   // 700  - console.log
Level.FINE     // 500  - console.log
Level.FINER    // 400  - console.log
Level.FINEST   // 300  - console.log
```

### Available Categories (Bitwise Flags)

```javascript
DEBUG.SCENE          // 1   - Scene graph operations
DEBUG.GEOMETRY       // 2   - Geometry processing
DEBUG.SHADER         // 4   - Shader and appearance
DEBUG.VIEWER         // 8   - Viewer rendering
DEBUG.INSPECTOR      // 16  - Inspector UI
DEBUG.TRANSFORMATION // 32  - Matrix transformations
DEBUG.UTIL           // 64  - Utility functions
DEBUG.IO             // 128 - Input/output
DEBUG.ERROR          // 256 - Error conditions
DEBUG.GENERAL        // 512 - General/uncategorized
```

### Common Configuration Functions

```javascript
import { 
  setGlobalLevel,      // Set default level for all modules
  setModuleLevel,      // Set level for specific module
  setEnabledCategories, // Set which categories to show (replaces)
  enableCategories,    // Enable additional categories (adds)
  disableCategories,   // Disable specific categories (removes)
  Level,               // Log level constants
  DEBUG                // Category constants
} from './util/LoggingSystem.js';
```

