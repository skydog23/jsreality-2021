/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Utility functions and classes

export * as CameraUtility from './CameraUtility.js';
export { Color } from './Color.js';
export { SceneGraphUtility } from './SceneGraphUtility.js';
export { DisposableCollection } from './Disposable.js';
export { 
  getLogger, 
  setGlobalLevel, 
  setModuleLevel, 
  configureDebugMode,
  reset,
  Level, 
  Category
} from './LoggingSystem.js';

export { Dimension } from './Dimension.js';
