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

import { Matrix } from '../math/Matrix.js';
import * as Pn from '../math/Pn.js';
import { AbstractTool } from '../scene/tool/AbstractTool.js';
import { InputSlot } from '../scene/tool/InputSlot.js';
import { EncompassFactory } from '../util/EncompassFactory.js';

/** @typedef {import('../scene/tool/ToolContext.js').ToolContext} ToolContext */

export class EncompassTool extends AbstractTool {
  // value greater than one creates a margin around the encompassed object
  margin = 1.75;
  automaticClippingPlanes = true;

  static encompassSlot = InputSlot.getDevice('EncompassActivation');
  static SHIFT = InputSlot.getDevice('Secondary');
  static CTRL = InputSlot.getDevice('Meta');

  /** @type {EncompassFactory} */
  encompassFactory = new EncompassFactory();

  constructor() {
    super();
    this.addCurrentSlot(EncompassTool.encompassSlot);
  }

  /** @type {import('../scene/SceneGraphComponent.js').SceneGraphComponent|null} */
  comp = null;

  /** @type {Matrix} */
  centerTranslation = new Matrix();

  /**
   * @param {ToolContext} tc
   */
  perform(tc) {
    // HACK: otherwise collision with viewerapp key bindings
    console.log('EncompassTool.perform()', tc);
    if (tc.getAxisState(EncompassTool.SHIFT)?.isPressed() || tc.getAxisState(EncompassTool.CTRL)?.isPressed()) {
      return;
    }

    if (tc.getAxisState(EncompassTool.encompassSlot)?.isPressed()) {
      // TODO get the metric from the effective appearance of avatar path
      console.log('EncompassTool.rootToLocal', tc.getRootToLocal());
      this.encompassFactory.setAvatarPath(tc.getAvatarPath());
      this.encompassFactory.setCameraPath(tc.getViewer().getCameraPath());
      this.encompassFactory.setScenePath(tc.getRootToLocal());
      this.encompassFactory.setMargin(this.margin);
      this.encompassFactory.setMetric(Pn.EUCLIDEAN); // TODO: other metrics?
      this.encompassFactory.setClippingPlanes(this.automaticClippingPlanes);
      this.encompassFactory.update();
    }
  }

  /** @param {number} p */
  setMargin(p) {
    this.margin = p;
  }

  /** @returns {number} */
  getMargin() {
    return this.margin;
  }

  /** @returns {boolean} */
  isSetClippingPlanes() {
    return this.automaticClippingPlanes;
  }

  /** @param {boolean} setClippingPlanes */
  setAutomaticClippingPlanes(setClippingPlanes) {
    this.automaticClippingPlanes = setClippingPlanes;
  }
}
