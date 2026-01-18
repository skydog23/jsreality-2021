/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's EncompassFactory class (from EncompassFactory.java)

import { BoundingBoxUtility } from '../geometry/BoundingBoxUtility.js';
import { Matrix } from '../math/Matrix.js';
import { MatrixBuilder } from '../math/MatrixBuilder.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { Rectangle3D } from './Rectangle3D.js';

/** @typedef {import('../scene/Camera.js').Camera} Camera */
/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */

// Java has SystemProperties.isPortal; jsreality does not currently model this.
// Keep the branch but default to false.
const isPortal = false;

export class EncompassFactory {
  /** @type {SceneGraphPath|null} */
  avatarPath = null;
  /** @type {SceneGraphPath|null} */
  scenePath = null;
  /** @type {SceneGraphPath|null} */
  cameraPath = null;
  /** @type {number} */
  margin = 0.0;
  /** @type {number} */
  metric = Pn.EUCLIDEAN;
  /** @type {boolean} */
  clippingPlanes = true;
  /** @type {boolean} */
  stereoParameters = true;

  update() {
    const sceneLast = this.scenePath?.getLastComponent?.();
    if (!sceneLast) {
      throw new Error('EncompassFactory.update(): scenePath is not set');
    }

    const bounds = BoundingBoxUtility.calculateBoundingBox(sceneLast);
    if (bounds.isEmpty()) return;

    const rootToScene = new Matrix();
    // Java: scenePath.getMatrix(rootToScene.getArray(), 0, scenePath.getLength()-2)
    this.scenePath.getMatrix(rootToScene.getArray(), 0, this.scenePath.getLength() - 2);

    const worldBounds = bounds.transformByMatrix(new Rectangle3D(), rootToScene.getArray());
    const avatarBounds = worldBounds.transformByMatrix(new Rectangle3D(), this.avatarPath.getInverseMatrix(null));

    const e = avatarBounds.getExtent();
    const radius = Rn.euclideanNorm(e);
    const c = avatarBounds.getCenter();

    // TODO: read viewing angle from camera
    c[2] += this.margin * radius;

    const camMatrix = new Matrix();
    // Java: cameraPath.getInverseMatrix(camMatrix.getArray(), avatarPath.getLength());
    this.cameraPath.getInverseMatrix(camMatrix.getArray(), this.avatarPath.getLength());

    /** @type {Camera} */
    const camera = /** @type {any} */ (this.cameraPath.getLastElement());

    if (this.clippingPlanes) {
      camera.setFar(this.margin * 3 * radius);
      camera.setNear(0.3 * radius);
    }

    if (!this.stereoParameters || isPortal) return;

    /** @type {SceneGraphComponent} */
    const avatar = this.avatarPath.getLastComponent();
    const avatarTrafo = avatar.getTransformation();
    if (!avatarTrafo) {
      throw new Error('EncompassFactory.update(): avatar has no Transformation');
    }

    const m = new Matrix(avatarTrafo.getMatrix());

    if (camera.isPerspective()) {
      MatrixBuilder.init(m, this.metric).translate(c).translate(camMatrix.getColumn(3)).assignTo(avatar);
      camera.setFocus(Math.abs(m.getColumn(3)[2]));
    } else {
      const ww = (e[1] > e[0]) ? e[1] : e[0];
      const focus = ww / Math.tan(Math.PI * (camera.getFieldOfView()) / 360.0);
      camera.setFocus(Math.abs(focus));
    }

    camera.setEyeSeparation(camera.getFocus() / 12.0);
  }

  /** @returns {SceneGraphPath|null} */
  getAvatarPath() {
    return this.avatarPath;
  }

  /** @param {SceneGraphPath} avatarPath */
  setAvatarPath(avatarPath) {
    this.avatarPath = avatarPath;
  }

  /** @returns {SceneGraphPath|null} */
  getScenePath() {
    return this.scenePath;
  }

  /** @param {SceneGraphPath} scenePath */
  setScenePath(scenePath) {
    this.scenePath = scenePath;
  }

  /** @returns {SceneGraphPath|null} */
  getCameraPath() {
    return this.cameraPath;
  }

  /** @param {SceneGraphPath} cameraPath */
  setCameraPath(cameraPath) {
    this.cameraPath = cameraPath;
  }

  /** @returns {number} */
  getMargin() {
    return this.margin;
  }

  /** @param {number} margin */
  setMargin(margin) {
    this.margin = margin;
  }

  /** @returns {number} */
  getMetric() {
    return this.metric;
  }

  /** @param {number} metric */
  setMetric(metric) {
    this.metric = metric;
  }

  /** @returns {boolean} */
  isClippingPlanes() {
    return this.clippingPlanes;
  }

  /** @param {boolean} clippingPlanes */
  setClippingPlanes(clippingPlanes) {
    this.clippingPlanes = clippingPlanes;
  }

  /** @returns {boolean} */
  isStereoParameters() {
    return this.stereoParameters;
  }

  /** @param {boolean} stereoParameters */
  setStereoParameters(stereoParameters) {
    this.stereoParameters = stereoParameters;
  }
}
