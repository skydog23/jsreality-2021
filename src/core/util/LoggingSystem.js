/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

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
 *   const logger = getLogger('jsreality.core.math.Rn');
 *   logger.fine(Category.ALL, 'Starting render');
 *   logger.severe(Category.ALL, 'Failed:', error);
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

// Category flags (bitwise)
// 
// Categories are intended primarily for **per-class debugging**:
// individual classes/modules can define their own bitfields and pass
// those values as the `category` argument to logger methods.
//
// For users who don't want to deal with categories, `Category.ALL`
// enables all categories for that logger.
export const Category = {
  ALL: -1 // All bits set; accepts any category bitmask
};

/**
 * Logger class - provides logging methods for a specific module
 */
class Logger {
  #moduleName;
  #system;
  #enabledCategories;
  #leafName;

  constructor(moduleName, system) {
    this.#moduleName = moduleName;
    this.#system = system;
    // By default, accept all categories for this logger.
    this.#enabledCategories = Category.ALL;
    this.#leafName = typeof moduleName === 'string' ? (moduleName.split('.').pop() || moduleName) : String(moduleName);
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

    // Check category flags (per-logger)
    if ((this.#enabledCategories & category) === 0) return false;

    return true;
  }

  /**
   * Format and output a log message
   * @private
   */
  #output(level, category, message, args) {
    const prefix = `[${this.#getDisplayName()}]`;
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
   * Choose a user-friendly name for console output.
   * Prefer the leaf name, but fall back to full module name if ambiguous.
   * @returns {string}
   * @private
   */
  #getDisplayName() {
    const leaf = this.#leafName;
    const candidates = this.#system?.leafToNames?.get?.(leaf);
    if (candidates && candidates.size > 1) {
      return this.#moduleName;
    }
    return leaf;
  }

  /**
   * Get category name from flag (for display).
   * 
   * With the current design, categories are typically local to a class
   * (e.g., a file-local DEBUG bitfield), so the logging system cannot
   * reliably map bits back to human-readable names. We therefore omit
   * category labels from the output and only return an empty string.
   * @private
   */
  #getCategoryName(category) {
    return '';
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
   * Set which categories are enabled for this logger (bitwise flags).
   * This replaces any existing category mask.
   * 
   * @param {number} flags - Combined category flags
   */
  setEnabledCategories(flags) {
    this.#enabledCategories = flags;
  }

  /**
   * Get the currently enabled categories bitmask for this logger.
   * @returns {number}
   */
  getEnabledCategories() {
    return this.#enabledCategories;
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
    this.loggers = new Map();         // Cached Logger instances per module
    // Convenience: allow setting levels by leaf name (e.g. "Rn") in addition to
    // fully-qualified module names (e.g. "jsreality.core.math.Rn").
    // If a leaf name is set before the logger is created, the override is stored
    // here and applied when a unique matching logger appears.
    this.pendingLeafLevels = new Map(); // leaf -> level
    // Track created loggers by leaf name so we can resolve leaf overrides.
    this.leafToNames = new Map(); // leaf -> Set<fullName>
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
    // If the caller passes a leaf-only name, try to resolve it.
    if (typeof moduleName === 'string' && !moduleName.includes('.')) {
      const leaf = moduleName;
      const candidates = this.leafToNames.get(leaf);
      if (candidates && candidates.size === 1) {
        const [fullName] = candidates.values();
        this.moduleConfig.set(fullName, level);
        return;
      }
      if (candidates && candidates.size > 1) {
        console.warn(
          `[LoggingSystem] Ambiguous leaf logger name "${leaf}". ` +
          `Use a fully-qualified name. Candidates: ${Array.from(candidates).join(', ')}`
        );
        return;
      }
      // No candidates yet: remember until the logger is created.
      this.pendingLeafLevels.set(leaf, level);
      return;
    }

    this.moduleConfig.set(moduleName, level);
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

    if (this.loggers.has(moduleName)) {
      return this.loggers.get(moduleName);
    }

    const logger = new Logger(moduleName, this);
    this.loggers.set(moduleName, logger);

    // Update leaf index for leaf-name overrides.
    const leaf = typeof moduleName === 'string' ? moduleName.split('.').pop() : null;
    if (leaf) {
      let set = this.leafToNames.get(leaf);
      if (!set) {
        set = new Set();
        this.leafToNames.set(leaf, set);
      }
      set.add(moduleName);

      // If a leaf level override was set before the logger existed, apply it now
      // as long as it resolves uniquely.
      if (this.pendingLeafLevels.has(leaf)) {
        const candidates = this.leafToNames.get(leaf);
        if (candidates && candidates.size === 1) {
          const level = this.pendingLeafLevels.get(leaf);
          this.moduleConfig.set(moduleName, level);
          this.pendingLeafLevels.delete(leaf);
        } else if (candidates && candidates.size > 1) {
          console.warn(
            `[LoggingSystem] Pending leaf logger level "${leaf}" became ambiguous. ` +
            `Use a fully-qualified name. Candidates: ${Array.from(candidates).join(', ')}`
          );
          this.pendingLeafLevels.delete(leaf);
        }
      }
    }
    return logger;
  }

  /**
   * Clear any explicit log level override for a module, falling back to the global level.
   * @param {string} moduleName - Module name
   */
  clearModuleLevel(moduleName) {
    if (typeof moduleName === 'string' && !moduleName.includes('.')) {
      const leaf = moduleName;
      const candidates = this.leafToNames.get(leaf);
      if (candidates && candidates.size === 1) {
        const [fullName] = candidates.values();
        this.moduleConfig.delete(fullName);
      } else if (candidates && candidates.size > 1) {
        console.warn(
          `[LoggingSystem] Ambiguous leaf logger name "${leaf}". ` +
          `Use a fully-qualified name. Candidates: ${Array.from(candidates).join(', ')}`
        );
      }
      // Also clear any pending override.
      this.pendingLeafLevels.delete(leaf);
      return;
    }
    this.moduleConfig.delete(moduleName);
  }

  /**
   * Get configuration for all known loggers.
   * Returns lightweight data suitable for UIs (e.g., logging control panels).
   * @returns {Array<{name: string, effectiveLevel: number, overrideLevel: (number|null), usesGlobalLevel: boolean, enabledCategories: number}>}
   */
  getLoggerConfigs() {
    const configs = [];
    for (const [name, logger] of this.loggers.entries()) {
      const overrideLevel = this.moduleConfig.has(name)
        ? this.moduleConfig.get(name)
        : null;
      const effectiveLevel = overrideLevel ?? this.globalLevel;
      configs.push({
        name,
        effectiveLevel,
        overrideLevel,
        usesGlobalLevel: overrideLevel === null,
        enabledCategories: logger.getEnabledCategories()
      });
    }
    return configs;
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
    this.loggers.clear();
    this.pendingLeafLevels.clear();
    this.leafToNames.clear();
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
 * // In a module / class file
 * const logger = getLogger('jsreality.core.inspect.SceneGraphInspector');
 * 
 * function myMethod() {
 *   logger.fine(Category.ALL, 'Method called');
 * }
 * 
 * @example
 * // In a module
 * const logger = getLogger('jsreality.core.scene.tool.ToolSystem');
 * logger.info(Category.ALL, 'Processing scene graph');
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
 * Clear the module-specific log level so it falls back to the global level.
 * @param {string} moduleName - Module name
 */
export function clearModuleLevel(moduleName) {
  loggingSystem.clearModuleLevel(moduleName);
}

/**
 * Get configuration for all known loggers.
 * @returns {Array<{name: string, effectiveLevel: number, overrideLevel: (number|null), usesGlobalLevel: boolean, enabledCategories: number}>}
 */
export function getLoggerConfigs() {
  return loggingSystem.getLoggerConfigs();
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

