/**
 * JavaScript port/translation of jReality's PosWHitFilter class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as Rn from '../../math/Rn.js';
import { SceneGraphPath } from '../SceneGraphPath.js';
import { Viewer } from '../Viewer.js';
import * as CameraUtility from '../../util/CameraUtility.js';
import { HitFilter } from './HitFilter.js';
import { PickResult } from './PickResult.js';
import { getLogger, setModuleLevel, Level, Category } from '../../util/LoggingSystem.js';
const logger = getLogger('PosWHitFilter');
setModuleLevel('PosWHitFilter', Level.FINE);
/**
 * Hit filter that accepts only hits with positive W coordinate in NDC space.
 * 
 * @implements {HitFilter}
 */
export class PosWHitFilter extends HitFilter {
  /**
   * @type {Viewer|null}
   */
  #viewer = null;
  
  /**
   * @type {SceneGraphPath|null}
   */
  #camPath = null;
  
  /**
   * @type {number[]|null}
   */
  #world2ndc = null;
  
  /**
   * Create a new PosWHitFilter
   * @param {Viewer} v - Viewer
   */
  constructor(v) {
    super();
    this.setViewer(v);
  }
  
  /**
   * Set the viewer
   * @param {Viewer} v - Viewer
   */
  setViewer(v) {
    this.#viewer = v;
    this.update();
  }
  
  /**
   * Update the world-to-NDC transformation matrix
   */
  update() {
    this.#camPath = this.#viewer.getCameraPath();
    if (this.#camPath === null) {
      return;
    }
    const world2cam = this.#camPath.getInverseMatrix();
    logger.fine(Category.SCENE, `#update: cam path: ${this.#camPath.toString()}`);
    logger.fine(Category.SCENE, `#update: world2cam: ${world2cam.toString()}`);
    const camToNDC = CameraUtility.getCameraToNDC(this.#viewer);
    logger.fine(Category.SCENE, `#update: cam to ndc: ${camToNDC.toString()}`);
    this.#world2ndc = Rn.timesMatrix(null, camToNDC, world2cam);
    logger.fine(Category.SCENE, `#update: world2ndc: ${this.#world2ndc.toString()}`);
  }
  
  /**
   * Accept hit if it has positive W coordinate in NDC space
   * @param {number[]} from - Ray start point (unused)
   * @param {number[]} to - Ray end point (unused)
   * @param {PickResult} h - Pick result to filter
   * @returns {boolean} True if hit should be accepted
   */
  accept(from, to, h) {
    if (this.#world2ndc === null) {
      return false;
    }
    logger.fine(Category.SCENE, `#accept: h world cords: ${h.getWorldCoordinates().toString()}`);
    const ndcCoords = Rn.matrixTimesVector(null, this.#world2ndc, h.getWorldCoordinates());
    logger.fine(Category.SCENE, `#accept: ndc coords: ${ndcCoords.toString()}`);
    const posW = ndcCoords[3] >= 0;
    return posW;
  }
}

