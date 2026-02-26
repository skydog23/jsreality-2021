/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Port of de.jreality.tools.ClickWheelCameraZoomTool

import { AbstractTool } from '../scene/tool/AbstractTool.js';
import { InputSlot } from '../scene/tool/InputSlot.js';
import { getLogger, Level, setModuleLevel } from '../util/LoggingSystem.js';

const logger = getLogger('jsreality.core.tools.ClickWheelCameraZoomTool');
setModuleLevel(logger.getModuleName(), Level.FINE);
/**
 * Uses the mouse wheel to implement a simple camera zoom tool.
 * Scrolling up zooms out, scrolling down zooms in.
 */
export class ClickWheelCameraZoomTool extends AbstractTool {
  /** @type {number} */
  wheel = 0;

  /** @type {number} */
  speed = 1.01;

  constructor() {
    super(
      InputSlot.getDevice('PrimaryUp'),
      InputSlot.getDevice('PrimaryDown'),
      InputSlot.getDevice('WheelUp'),
      InputSlot.getDevice('WheelDown')
    );
  }

  /**
   * @param {import('../scene/tool/ToolContext.js').ToolContext} tc
   */
  activate(tc) {
    // logger.info(-1, 'activate');
    const source = tc.getSource();
    if (source === InputSlot.getDevice('PrimaryUp') ||
        source === InputSlot.getDevice('WheelUp')) {
        this.wheel = 1;
    } else if (source === InputSlot.getDevice('PrimaryDown') ||
               source === InputSlot.getDevice('WheelDown')) {
      this.wheel = -1;
    }
    const cam = tc.getViewer().getCameraPath().getLastElement();
    const fov = cam.getFieldOfView();
    const tan2 = Math.tan((fov/2) * Math.PI / 180),
      fovNew = (180/Math.PI) * 2 * Math.atan(tan2 * ((this.wheel > 0) ? this.speed : 1.0 / this.speed));
    cam.setFieldOfView(fovNew);
    // logger.info(-1, 'fov = ', fov);
    tc.getViewer().renderAsync();
  }

  perform(tc) {
    logger.info(-1, 'perform');
    //this.activate(tc);
  }
  /**
   * @returns {number}
   */
  getSpeed() {
    return this.speed;
  }

  /**
   * @param {number} speed
   */
  setSpeed(speed) {
    this.speed = speed;
  }
}
