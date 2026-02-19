/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { TranslateTool } from './TranslateTool.js';

/**
 * Compatibility wrapper for `charlesgunn.jreality.tools.TranslateShapeTool`.
 */
export class TranslateShapeTool extends TranslateTool {
  constructor() {
    super();
    this.setName('translate');
  }
}

