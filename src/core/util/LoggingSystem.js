/**
 * LoggingSystem for jsReality.
 * 
 * This provides a hierarchical logging system with:
 * - Log levels (SEVERE, WARNING, INFO, FINE, FINER, FINEST)
 * - Category flags for selective logging (bitwise)
 * - Per-module log level configuration
 * - Singleton pattern with centralized configuration
 * 
 * Usage:
 *   import { getLogger, Category } from './util/LoggingSystem.js';
 *   
 *   const logger = getLogger(this); // or getLogger('ModuleName')
 *   logger.fine(Category.VIEWER, 'Starting render');
 *   logger.severe(Category.ERROR, 'Failed:', error);
 */

// Log levels (matching Java's java.util.logging levels)
export const Level = {
  SEVERE: 1000,    // console.error - serious errors
  WARNING: 900,    // console.warn - potential problems
  INFO: 800,       // console.info - informational messages
  CONFIG: 700,     // console.log - configuration messages
  FINE: 500,       // console.log - tracing information
  FINER: 400,      // console.log - detailed tracing
  FINEST: 300      // console.log - highly detailed tracing
};

// Category flags (bitwise) - can be combined with |
export const Category = {
  SCENE: 1,           // Scene graph operations
  GEOMETRY: 2,        // Geometry processing
  SHADER: 4,          // Shader and appearance
  VIEWER: 8,          // Viewer rendering
  INSPECTOR: 16,      // Inspector UI
  TRANSFORMATION: 32, // Matrix transformations
  UTIL: 64,           // Utility functions
  IO: 128,            // Input/output
  ERROR: 256,         // Error conditions
  GENERAL: 512        // General/uncategorized
};

// Convenient aliases matching DEBUG.* pattern
export const DEBUG = {
  SCENE: Category.SCENE,
  GEOMETRY: Category.GEOMETRY,
  SHADER: Category.SHADER,
  VIEWER: Category.VIEWER,
  INSPECTOR: Category.INSPECTOR,
  TRANSFORMATION: Category.TRANSFORMATION,
  UTIL: Category.UTIL,
  IO: Category.IO,
  ERROR: Category.ERROR,
  GENERAL: Category.GENERAL
};

/**
 * Logger class - provides logging methods for a specific module
 */
class Logger {
  #moduleName;
  #system;

  constructor(moduleName, system) {
    this.#moduleName = moduleName;
    this.#system = system;
  }

  /**
   * Check if a log message should be output
   * @private
   */
  #shouldLog(level, category) {
    // Check log level
    const moduleLevel = this.#system.moduleConfig.get(this.#moduleName) 
                        || this.#system.globalLevel;
    if (level < moduleLevel) return false;

    // Check category flags
    if ((this.#system.enabledCategories & category) === 0) return false;

    return true;
  }

  /**
   * Format and output a log message
   * @private
   */
  #output(level, category, message, args) {
    const prefix = `[${this.#moduleName}]`;
    const categoryName = this.#getCategoryName(category);
    const fullMessage = categoryName ? `${categoryName}: ${message}` : message;
    
    if (level >= Level.SEVERE) {
      console.error(prefix, fullMessage, ...args);
    } else if (level >= Level.WARNING) {
      console.warn(prefix, fullMessage, ...args);
    } else if (level >= Level.INFO) {
      console.info(prefix, fullMessage, ...args);
    } else {
      console.log(prefix, fullMessage, ...args);
    }
  }

  /**
   * Get category name from flag (for display)
   * @private
   */
  #getCategoryName(category) {
    const names = [];
    for (const [name, flag] of Object.entries(Category)) {
      if ((category & flag) !== 0) {
        names.push(name);
      }
    }
    return names.length > 0 ? names.join('|') : '';
  }

  /**
   * Log a message with specified level and category
   * @param {number} level - Log level (Level.SEVERE, Level.INFO, etc.)
   * @param {number} category - Category flags (can be combined with |)
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments to log
   */
  log(level, category, message, ...args) {
    if (!this.#shouldLog(level, category)) return;
    this.#output(level, category, message, args);
  }

  /**
   * Log a severe error message
   * @param {number} category - Category flags
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments to log
   */
  severe(category, message, ...args) {
    this.log(Level.SEVERE, category, message, ...args);
  }

  /**
   * Log a warning message
   * @param {number} category - Category flags
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments to log
   */
  warn(category, message, ...args) {
    this.log(Level.WARNING, category, message, ...args);
  }

  /**
   * Log an informational message
   * @param {number} category - Category flags
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments to log
   */
  info(category, message, ...args) {
    this.log(Level.INFO, category, message, ...args);
  }

  /**
   * Log a configuration message
   * @param {number} category - Category flags
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments to log
   */
  config(category, message, ...args) {
    this.log(Level.CONFIG, category, message, ...args);
  }

  /**
   * Log a fine tracing message
   * @param {number} category - Category flags
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments to log
   */
  fine(category, message, ...args) {
    this.log(Level.FINE, category, message, ...args);
  }

  /**
   * Log a detailed tracing message
   * @param {number} category - Category flags
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments to log
   */
  finer(category, message, ...args) {
    this.log(Level.FINER, category, message, ...args);
  }

  /**
   * Log a highly detailed tracing message
   * @param {number} category - Category flags
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments to log
   */
  finest(category, message, ...args) {
    this.log(Level.FINEST, category, message, ...args);
  }

  /**
   * Get the module name for this logger
   * @returns {string}
   */
  getModuleName() {
    return this.#moduleName;
  }
}

/**
 * Main logging system (singleton)
 */
class LoggingSystem {
  constructor() {
    this.globalLevel = Level.SEVERE;  // Default: only errors
    this.moduleConfig = new Map();    // Per-module level overrides
    this.enabledCategories = 0xFFFFFFFF; // All categories enabled by default
  }

  /**
   * Set the global default log level
   * @param {number} level - Log level (Level.SEVERE, Level.INFO, etc.)
   */
  setGlobalLevel(level) {
    this.globalLevel = level;
  }

  /**
   * Set log level for a specific module
   * @param {string} moduleName - Module name
   * @param {number} level - Log level
   */
  setModuleLevel(moduleName, level) {
    this.moduleConfig.set(moduleName, level);
  }

  /**
   * Set which categories are enabled (bitwise flags)
   * @param {number} flags - Combined category flags (e.g., Category.SCENE | Category.VIEWER)
   */
  setEnabledCategories(flags) {
    this.enabledCategories = flags;
  }

  /**
   * Enable specific categories (adds to existing)
   * @param {number} flags - Category flags to enable
   */
  enableCategories(flags) {
    this.enabledCategories |= flags;
  }

  /**
   * Disable specific categories
   * @param {number} flags - Category flags to disable
   */
  disableCategories(flags) {
    this.enabledCategories &= ~flags;
  }

  /**
   * Get a logger for a module or class instance
   * @param {Object|string} moduleOrClass - Module name string or class instance
   * @returns {Logger}
   */
  getLogger(moduleOrClass) {
    const moduleName = typeof moduleOrClass === 'string'
      ? moduleOrClass
      : moduleOrClass?.constructor?.name || 'jsreality';
    
    return new Logger(moduleName, this);
  }

  /**
   * Configure debug mode with preset levels for specific modules
   * (Similar to Java's setDebugUse method)
   */
  configureDebugMode() {
    this.setGlobalLevel(Level.SEVERE);
    
    // Example debug configurations (commented out by default)
    // this.setModuleLevel('SceneGraphComponent', Level.FINER);
    // this.setModuleLevel('Canvas2DViewer', Level.FINE);
    // this.setModuleLevel('SVGViewer', Level.FINE);
    // this.setModuleLevel('DefaultGeometryShader', Level.FINEST);
    // this.setModuleLevel('EffectiveAppearance', Level.FINER);
    // this.setModuleLevel('SceneGraphInspector', Level.FINE);
  }

  /**
   * Reset to default configuration
   */
  reset() {
    this.globalLevel = Level.SEVERE;
    this.moduleConfig.clear();
    this.enabledCategories = 0xFFFFFFFF;
  }
}

// Singleton instance
const loggingSystem = new LoggingSystem();

/**
 * Get a logger for a module or class instance
 * @param {Object|string} moduleOrClass - Module name string or class instance
 * @returns {Logger}
 * 
 * @example
 * // In a class
 * class MyClass {
 *   #logger = getLogger(this);
 *   
 *   myMethod() {
 *     this.#logger.fine(Category.GENERAL, 'Method called');
 *   }
 * }
 * 
 * @example
 * // In a module
 * const logger = getLogger('MyModule');
 * logger.info(Category.SCENE, 'Processing scene graph');
 */
export function getLogger(moduleOrClass) {
  return loggingSystem.getLogger(moduleOrClass);
}

/**
 * Set the global default log level
 * @param {number} level - Log level (Level.SEVERE, Level.INFO, etc.)
 */
export function setGlobalLevel(level) {
  loggingSystem.setGlobalLevel(level);
}

/**
 * Set log level for a specific module
 * @param {string} moduleName - Module name
 * @param {number} level - Log level
 */
export function setModuleLevel(moduleName, level) {
  loggingSystem.setModuleLevel(moduleName, level);
}

/**
 * Set which categories are enabled (replaces existing)
 * @param {number} flags - Combined category flags
 */
export function setEnabledCategories(flags) {
  loggingSystem.setEnabledCategories(flags);
}

/**
 * Enable specific categories (adds to existing)
 * @param {number} flags - Category flags to enable
 */
export function enableCategories(flags) {
  loggingSystem.enableCategories(flags);
}

/**
 * Disable specific categories
 * @param {number} flags - Category flags to disable
 */
export function disableCategories(flags) {
  loggingSystem.disableCategories(flags);
}

/**
 * Configure debug mode with preset levels
 */
export function configureDebugMode() {
  loggingSystem.configureDebugMode();
}

/**
 * Reset logging system to defaults
 */
export function reset() {
  loggingSystem.reset();
}

// Initialize with default configuration
loggingSystem.configureDebugMode();

