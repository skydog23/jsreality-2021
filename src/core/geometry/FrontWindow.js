/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { IndexedFaceSetUtility } from './IndexedFaceSetUtility.js';
import { Matrix } from '../math/Matrix.js';
import * as P3 from '../math/P3.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import * as CameraUtility from '../util/CameraUtility.js';

/**
 * Displays a polygon anchored to the near part of camera frustum.
 */
export class FrontWindow {
  static zval = 0.99;
  nearFrustum = [[-1, -1, 0], [1, -1, 0], [1, 1, 0]];
  geometry = IndexedFaceSetUtility.constructPolygon(this.nearFrustum);
  viewer = null;
  nearSGC = null;
  cameraPath = null;

  constructor(viewer, cameraPath = null) {
    this.viewer = viewer;
    this.cameraPath = cameraPath ?? viewer?.getCameraPath?.() ?? null;
    this.#setup();
  }

  getWindow() { return this.nearSGC; }
  getGeometry() { return this.geometry; }
  setGeometry(g) { this.geometry = g; if (this.nearSGC) this.nearSGC.setGeometry(g); }
  getCameraPath() { return this.cameraPath; }
  setCameraPath(cp) { this.cameraPath = cp; }
  attachWindow(b) { if (this.nearSGC) this.nearSGC.setVisible(!!b); }

  #setup() {
    const camNode = this.cameraPath?.getLastComponent?.() ?? CameraUtility.getCameraNode(this.viewer);
    this.nearSGC = new SceneGraphComponent('frontWindow');
    this.nearSGC.setGeometry(this.geometry);
    this.updateNearRect();
    camNode?.addChild?.(this.nearSGC);
    const cam = CameraUtility.getCamera(this.viewer);
    cam?.addCameraListener?.(() => this.updateNearRect());
  }

  updateNearRect() {
    if (!this.viewer || !this.nearSGC) return;
    const ndcToCam = CameraUtility.getNDCToCamera(this.viewer);
    const zdistT = P3.makeTranslationMatrix(null, [0, 0, -FrontWindow.zval], Pn.EUCLIDEAN);
    const cumul = Rn.times(null, ndcToCam, zdistT);
    new Matrix(cumul).assignTo(this.nearSGC);
  }
}

