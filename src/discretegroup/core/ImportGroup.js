/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { DiscreteGroup } from './DiscreteGroup.js';
import { DiscreteGroupElement } from './DiscreteGroupElement.js';
import { DiscreteGroupUtility } from './DiscreteGroupUtility.js';

/**
 * Port of de.jtem.discretegroup.core.ImportGroup.
 *
 * Current scope intentionally supports the `.gens` workflow first to unblock
 * Cell120Example. Other legacy formats are left as explicit TODOs.
 */
export class ImportGroup {
  static RAW_GENERATORS = 0;
  static WEEKS_GEN = 1;
  static WEEKS_MAT = 2;
  static PSL2C_MAT = 3;

  /**
   * Parse a group from raw text content.
   *
   * @param {string} text
   * @param {string} filename
   * @param {number} metric
   * @returns {DiscreteGroup}
   */
  static initFromText(text, filename = 'group.gens', metric = Pn.PROJECTIVE) {
    const lower = String(filename).toLowerCase();
    let type = ImportGroup.RAW_GENERATORS;
    let transpose = false;
    if (lower.endsWith('.gen')) {
      type = ImportGroup.WEEKS_GEN;
      transpose = true;
    } else if (lower.endsWith('.mat')) {
      type = ImportGroup.WEEKS_MAT;
      transpose = true;
    } else if (lower.endsWith('.psl2c')) {
      type = ImportGroup.PSL2C_MAT;
      // TODO: PSL2C format support is not implemented yet.
      throw new Error('ImportGroup: .psl2c format not implemented yet.');
    } else if (!lower.endsWith('.gens')) {
      throw new Error(`ImportGroup: unsupported file extension for ${filename}. Expected .gens/.gen/.mat.`);
    }

    const tokens = String(text).trim().split(/\s+/).filter((s) => s.length > 0);
    const values = tokens.map((s) => Number.parseFloat(s));
    if (values.some((v) => Number.isNaN(v))) {
      throw new Error(`ImportGroup: failed to parse numeric tokens in ${filename}`);
    }
    if (values.length < 16 && type !== ImportGroup.WEEKS_GEN) {
      throw new Error(`ImportGroup: ${filename} does not contain any 4x4 matrix data`);
    }

    let cursor = 0;
    // Weeks .gen files start with one radius token before matrix entries.
    if (type === ImportGroup.WEEKS_GEN) {
      if (values.length < 17) {
        throw new Error(`ImportGroup: ${filename} missing radius+matrix data for .gen format`);
      }
      cursor = 1;
    }

    let inferredMetric = metric;
    let firstTime = true;
    let gcount = 0;
    /** @type {DiscreteGroupElement[]} */
    const matlist = [];

    const remaining = values.length - cursor;
    const usableCount = remaining - (remaining % 16);
    for (let offset = cursor; offset < cursor + usableCount; offset += 16) {
      let mat = values.slice(offset, offset + 16);
      if (transpose) mat = Rn.transpose(null, mat);

      if (firstTime && inferredMetric === Pn.PROJECTIVE) {
        if (mat[12] === 0.0 && mat[13] === 0.0 && mat[14] === 0.0 && mat[15] === 1.0) {
          inferredMetric = Pn.EUCLIDEAN;
        } else {
          const row1 = mat.slice(0, 4);
          inferredMetric = Rn.innerProduct(row1, row1) > 1.0001 ? Pn.HYPERBOLIC : Pn.ELLIPTIC;
        }
        firstTime = false;
      }

      const gen = new DiscreteGroupElement(inferredMetric, mat);
      if (type !== ImportGroup.WEEKS_MAT) {
        gen.setWord(DiscreteGroupUtility.genNames[gcount] ?? `g${gcount}`);
        gen.setColorIndex(gcount);
      }
      matlist.push(gen);
      matlist.push(gen.getInverse());
      gcount += 1;
    }

    const dg = new DiscreteGroup();
    if (type === ImportGroup.WEEKS_MAT) {
      dg.setElementList(matlist, false);
      dg.setGenerators(null);
    } else {
      dg.setGenerators(matlist);
    }
    dg.setDimension(3);
    dg.setMetric(inferredMetric);
    return dg;
  }

  /**
   * Load group data from a URL or URL-like value.
   *
   * @param {string|URL} url
   * @param {number} metric
   * @returns {Promise<DiscreteGroup>}
   */
  static async initFromUrl(url, metric = Pn.PROJECTIVE) {
    const u = url instanceof URL ? url : new URL(String(url), import.meta.url);
    let text;
    if (u.protocol === 'file:') {
      // Node-side fallback for local development/smoke tests.
      const fs = await import('node:fs/promises');
      text = await fs.readFile(u, 'utf8');
    } else {
      const res = await fetch(u);
      if (!res.ok) throw new Error(`ImportGroup: failed to fetch ${u} (${res.status})`);
      text = await res.text();
    }
    return ImportGroup.initFromText(text, u.pathname, metric);
  }

  /**
   * Java-style resource loader.
   *
   * @param {string} resourceName e.g. "resources/groups/120cell.gens"
   * @param {number} sig
   * @returns {Promise<DiscreteGroup>}
   */
  static async initFromResource(resourceName, sig = Pn.PROJECTIVE) {
    const resourceUrl = new URL(`../${resourceName}`, import.meta.url);
    return ImportGroup.initFromUrl(resourceUrl, sig);
  }
}

