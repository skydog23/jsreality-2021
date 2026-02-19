/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { FlyTool } from './FlyTool.js';

/**
 * Compatibility alias for `charlesgunn.jreality.newtools.AllroundTool`.
 * Current behavior follows `FlyTool`.
 */
export class AllroundTool extends FlyTool {
  constructor() {
    super();
    this.setName('allround');
  }
}

