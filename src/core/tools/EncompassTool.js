/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of de.jreality.tools.EncompassTool

import { AbstractTool } from '../scene/tool/AbstractTool.js';
import { InputSlot } from '../scene/tool/InputSlot.js';


/** @typedef {import('../scene/tool/ToolContext.js').ToolContext} ToolContext */

export class EncompassTool extends AbstractTool {
  static encompassSlot = InputSlot.getDevice('EncompassActivation');
    
  constructor() {
    super(EncompassTool.encompassSlot);
  }

  activate(tc) {
    console.log('EncompassTool.activate()', tc);
    CameraUtility.encompass(tc.getViewer());
    tc.getViewer().renderAsync();
  } 

  perform(tc) {
    console.log('EncompassTool.perform()', tc);
    CameraUtility.encompass(tc.getViewer());
    tc.getViewer().renderAsync();
  }

}
