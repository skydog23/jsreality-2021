/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript translation of:
//   jreality-2021/src-core/de/jreality/geometry/ParametricSurfaceFactory.java

import { QuadMeshFactory } from './QuadMeshFactory.js';
import { getLogger, Category } from '../util/LoggingSystem.js';

const logger = getLogger('jsreality.core.geometry.ParametricSurfaceFactory');

/**
 * @typedef {object} Immersion
 * @property {() => boolean} isImmutable
 * @property {() => number} getDimensionOfAmbientSpace
 * @property {(u: number, v: number, xyz: number[], index: number) => void} evaluate
 */

/**
 * An abstract implementation of Immersion for a map into 3-space.
 * Mirrors ParametricSurfaceFactory.DefaultImmersion in Java.
 */
export class DefaultImmersion {
  /** @type {number} */
  x = 0;
  /** @type {number} */
  y = 0;
  /** @type {number} */
  z = 0;

  isImmutable() {
    return false;
  }

  getDimensionOfAmbientSpace() {
    return 3;
  }

  /**
   * @param {number} u
   * @param {number} v
   * @param {number[]} xyz
   * @param {number} index
   */
  evaluate(u, v, xyz, index) {
    this.evaluateUV(u, v);
    xyz[3 * index + 0] = this.x;
    xyz[3 * index + 1] = this.y;
    xyz[3 * index + 2] = this.z;
  }

  /**
   * Assign this.x, this.y, this.z here.
   * @param {number} _u
   * @param {number} _v
   */
  evaluateUV(_u, _v) {
    throw new Error('Abstract method: evaluateUV(u, v)');
  }
}

/**
 * Factory that fills quad mesh vertices by evaluating an (x,y,z,...)-valued function
 * on a rectangular parameter domain (u,v).
 *
 * Port of de.jreality.geometry.ParametricSurfaceFactory.
 */
export class ParametricSurfaceFactory extends QuadMeshFactory {
  /** @type {number} */
  #uMin = 0;
  /** @type {number} */
  #uMax = 1;
  /** @type {number} */
  #vMin = 0;
  /** @type {number} */
  #vMax = 1;

  /** @type {Immersion} */
  #immersion;

  /** @type {number[][]|null} */
  #vertexCoordinates = null;

  // Cache to replicate Java's OoNode-driven recomputation behavior:
  /** @type {number|null} */
  #lastULineCount = null;
  /** @type {number|null} */
  #lastVLineCount = null;
  /** @type {number|null} */
  #lastUMin = null;
  /** @type {number|null} */
  #lastUMax = null;
  /** @type {number|null} */
  #lastVMin = null;
  /** @type {number|null} */
  #lastVMax = null;
  /** @type {Immersion|null} */
  #lastImmersion = null;

  /**
   * @param {Immersion} [immersion]
   */
  constructor(immersion) {
    super();

    // Java default constructor provides an identity-ish immersion.
    /** @type {Immersion} */
    const defaultImmersion = {
      isImmutable() { return true; },
      getDimensionOfAmbientSpace() { return 3; },
      evaluate(u, v, xyz, index) {
        xyz[index + 0] = u;
        xyz[index + 1] = v;
      }
    };

    this.setImmersion(immersion ?? defaultImmersion);
  }

  /** @returns {Immersion} */
  getImmersion() {
    return this.#immersion;
  }

  /** @param {Immersion} f */
  setImmersion(f) {
    if (f == null) throw new Error('Immersion cannot set to null.');
    this.#immersion = f;
  }

  getUMax() { return this.#uMax; }
  setUMax(max) { this.#uMax = max; }
  getUMin() { return this.#uMin; }
  setUMin(min) { this.#uMin = min; }

  getVMax() { return this.#vMax; }
  setVMax(max) { this.#vMax = max; }
  getVMin() { return this.#vMin; }
  setVMin(min) { this.#vMin = min; }

  /**
   * @param {number[][]|null} vertexCoordinates
   * @returns {number[][]}
   * @private
   */
  #generateVertexCoordinates(vertexCoordinates) {
    logger.fine?.(Category.ALL, 'compute vertex coordinates');

    const immersion = this.getImmersion();
    const nov = this.getVertexCount();

    if (vertexCoordinates == null || vertexCoordinates.length !== nov) {
      vertexCoordinates = new Array(nov).fill(0).map(() => new Array(immersion.getDimensionOfAmbientSpace()).fill(0));
    }

    const vLineCount = this.getVLineCount();
    const uLineCount = this.getULineCount();

    const dv = (this.getVMax() - this.getVMin()) / (vLineCount - 1);
    const du = (this.getUMax() - this.getUMin()) / (uLineCount - 1);

    const uMin = this.getUMin();
    const vMin = this.getVMin();

    let v = vMin;
    for (let iv = 0, firstIndexInULine = 0; iv < vLineCount; iv++, v += dv, firstIndexInULine += uLineCount) {
      let u = uMin;
      for (let iu = 0; iu < uLineCount; iu++, u += du) {
        // Java uses indexOfUV but writes into vertexCoordinates[uLineCount*iv + iu],0
        immersion.evaluate(u, v, vertexCoordinates[uLineCount * iv + iu], 0);
      }
    }

    return vertexCoordinates;
  }

  /**
   * @param {number[][]|null} uvpoints
   * @returns {number[][]}
   */
  getDomainVertices(uvpoints) {
    return this.getDomainVertices2(uvpoints, false);
  }

  /**
   * @param {number[][]|null} uvpoints
   * @param {boolean} offset
   * @returns {number[][]}
   */
  getDomainVertices2(uvpoints, offset) {
    const nov = this.getVertexCount();
    if (uvpoints == null || uvpoints.length !== nov || (uvpoints[0]?.length ?? 0) !== 2) {
      uvpoints = new Array(nov).fill(0).map(() => [0, 0]);
    }

    const vLineCount = this.getVLineCount();
    const uLineCount = this.getULineCount();

    const dv = (this.getVMax() - this.getVMin()) / (vLineCount - 1);
    const du = (this.getUMax() - this.getUMin()) / (uLineCount - 1);

    const uMin = this.getUMin();
    const vMin = this.getVMin();

    let v = vMin;
    for (let iv = 0, firstIndexInULine = 0; iv < vLineCount; iv++, v += dv, firstIndexInULine += uLineCount) {
      let u = uMin + ((((iv % 2) === 1) && offset) ? du / 2 : 0);
      for (let iu = 0; iu < uLineCount; iu++, u += du) {
        const i = uLineCount * iv + iu;
        uvpoints[i][0] = u;
        uvpoints[i][1] = v;
      }
    }
    return uvpoints;
  }

  /**
   * Replace OoNode recomputation logic:
   * - mutable immersion: always recompute on update()
   * - immutable immersion: only recompute when domain or resolution changes
   * @override
   */
  update() {
    const immersion = this.getImmersion();
    const uLineCount = this.getULineCount();
    const vLineCount = this.getVLineCount();

    const domainChanged =
      this.#lastULineCount !== uLineCount ||
      this.#lastVLineCount !== vLineCount ||
      this.#lastUMin !== this.#uMin ||
      this.#lastUMax !== this.#uMax ||
      this.#lastVMin !== this.#vMin ||
      this.#lastVMax !== this.#vMax ||
      this.#lastImmersion !== immersion;

    const mustRecompute = (!immersion.isImmutable()) || domainChanged || this.#vertexCoordinates == null;

    if (mustRecompute) {
      this.#vertexCoordinates = this.#generateVertexCoordinates(this.#vertexCoordinates);
      // QuadMeshFactory now accepts [nov][dim] directly.
      super.setVertexCoordinates(this.#vertexCoordinates);

      this.#lastULineCount = uLineCount;
      this.#lastVLineCount = vLineCount;
      this.#lastUMin = this.#uMin;
      this.#lastUMax = this.#uMax;
      this.#lastVMin = this.#vMin;
      this.#lastVMax = this.#vMax;
      this.#lastImmersion = immersion;
    }

    super.update();
  }
}

// Mirror Java nested type access pattern where convenient.
ParametricSurfaceFactory.DefaultImmersion = DefaultImmersion;

