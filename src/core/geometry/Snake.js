/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// JavaScript translation of:
//   ProjectiveGeometry/src/charlesgunn/jreality/geometry/Snake.java

import { IndexedLineSet } from '../scene/IndexedLineSet.js';
import { GeometryAttribute, attributeForName } from '../scene/GeometryAttribute.js';
import { GeometryCategory } from '../scene/Geometry.js';
import { toDataList } from '../scene/data/DataUtility.js';
import { IndexedLineSetFactory } from './IndexedLineSetFactory.js';
import { getLogger, Level, setModuleLevel } from '../util/LoggingSystem.js';
/**
 * Snake is an IndexedLineSet containing a single polyline whose indices are a moving window
 * over the underlying vertices (cyclic).
 *
 * This is a direct translation of `charlesgunn.jreality.geometry.Snake`.
 */
const logger = getLogger('jsreality.core.geometry.Snake');
setModuleLevel(logger.getModuleName(), Level.FINE);

export class Snake  {
  ifsf = new IndexedLineSetFactory();
  /**
   * @type {string}
   */
  static SNAKE_INFO = attributeForName('snakeInfo');

  /** @type {number[][]} */
  indices;

  /** @type {number[]} */
  vindices;

  /** @type {number} */
  fiber;

  /**
   * info[0] = beginning point (begin)
   * info[1] = number of points in polyline (length)
   * info[2] = previous length (oldlength)
   * @type {number[]}
   */
  info;

  /** @type {boolean} */
  active = false;

  /** @type {number[][]} */
  points;

  /**
   * @param {number[][]} p vertex coordinate array
   */
  constructor(p) {

    this.ifsf.setVertexCount(p.length);
    this.ifsf.setEdgeCount(1);
    this.indices = new Array(1).fill(0).map(() => new Array(p.length));
    this.points = p;

    this.info = new Array(3);
    this.info[0] = 0;
    this.info[1] = p.length;
    this.info[2] = -1;

    this.vindices = new Array(p.length);

    this.update();
  }

  /** @type {number[][]} */
  nullindices = [[0]];

  update() {

    const begin = this.info[0];
    const length = this.info[1];
    const oldlength = this.info[2];

    if (length === 0) {
      return;
    } else {
    if (length !== oldlength) {
      this.indices = new Array(1).fill(0).map(() => new Array(length));
    }
  }

    const n = length;

    for (let i = 0; i < n; ++i) {
      this.vindices[i] = 0;
    }

    for (let i = 0; i < length; ++i) {
      const idx = (i + begin) % n;
      this.indices[0][i] = idx;
      this.vindices[idx] = 1;
    }

    this.ifsf.setVertexCoordinates(this.points);
    logger.finer(-1, 'indices = ', this.indices);
    this.ifsf.setEdgeIndices(this.indices, this.indices[0].length);
    this.ifsf.setVertexAttribute(GeometryAttribute.INDICES, this.vindices, 1);
    this.ifsf.update();

    this.info[2] = length;
    this.fireChange();
  }

  fireChange() {
    // // Java: fireGeometryChanged(null, null, null, null)
    // // JS: mark both vertex + edge data as changed and commit a write to trigger GeometryEvent.
    // this.startWriter();
    // try {
    //   this._fireGeometryDataChanged(GeometryCategory.VERTEX, new Set(['*']));
    //   this._fireGeometryDataChanged(GeometryCategory.EDGE, new Set(['*']));
    // } finally {
    //   this.finishWriter();
    // }
  }

  /**
   * @returns {number[]}
   */
  getInfo() {
    return this.info;
  }
}


