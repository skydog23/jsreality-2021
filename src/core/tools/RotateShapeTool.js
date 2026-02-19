/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { RotateTool } from './RotateTool.js';

/**
 * Compatibility wrapper for `charlesgunn.jreality.tools.RotateShapeTool`.
 */
export class RotateShapeTool extends RotateTool {
  constructor() {
    super();
    this.setName('rotate');
  }
}

