/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { IndexedLineSetUtility } from '../IndexedLineSetUtility.js';
import { MatrixBuilder } from '../../math/MatrixBuilder.js';
import * as P3 from '../../math/P3.js';
import * as Pn from '../../math/Pn.js';
import * as Rn from '../../math/Rn.js';
import { SceneGraphComponent } from '../../scene/SceneGraphComponent.js';

/**
 * Port of `charlesgunn.jreality.geometry.projective.CircleFactory`.
 */
export class CircleFactory {
  static tolerance = 1e-9;
  static numSamples = 100;
  static np3 = [0, 0, 1];
  static stereoProjMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0.5, -0.5,
    0, 0, -0.5, -0.5,
  ];
  static stereoProjInverseMatrix = Rn.inverse(null, CircleFactory.stereoProjMatrix);

  pE = [1, 0, 0, -0.5];
  cc = [0, 0, 0, 1];
  definedOnSphere = true;
  changed = true;

  both = new SceneGraphComponent('both');
  sphereSGC = new SceneGraphComponent('sphere');
  planeSGC = new SceneGraphComponent('plane');

  constructor() {
    this.both.addChildren(this.sphereSGC, this.planeSGC);
    this.sphereSGC.setGeometry(IndexedLineSetUtility.circle(CircleFactory.numSamples));
    this.planeSGC.setGeometry(IndexedLineSetUtility.circle(CircleFactory.numSamples));
    this.update();
  }

  static circleFactoryForPlane(p) {
    const ret = new CircleFactory();
    ret.setPlaneEquation(p);
    ret.update();
    return ret;
  }

  static circleFactoryForCircle(c) {
    const ret = new CircleFactory();
    ret.setCircleCoordinates(c);
    ret.update();
    return ret;
  }

  setPlaneEquation(p) {
    if (!p || p.length !== 4) throw new Error('bad length');
    this.pE = p.slice();
    const d = Rn.innerProduct(this.pE, this.pE, 3);
    if (d !== 0) Rn.times(this.pE, 1.0 / Math.sqrt(d), this.pE);
    this.definedOnSphere = true;
    this.changed = true;
  }

  setCircleCoordinates(c) {
    if (!c || c.length !== 4) throw new Error('bad length');
    this.cc = c.slice();
    this.definedOnSphere = false;
    this.changed = true;
  }

  getPlaneEquation() { return this.pE; }
  getCircleCoordinates() { return this.cc; }
  getSceneGraphComponent() { return this.both; }
  getSphereSGC() { return this.sphereSGC; }
  getPlaneSGC() { return this.planeSGC; }

  update() {
    if (!this.changed) return;
    if (this.definedOnSphere) {
      const diff = -(this.pE[2] + this.pE[3]);
      Rn.matrixTimesVector(this.cc, CircleFactory.stereoProjInverseMatrix, this.pE);
      if (Math.abs(diff) < CircleFactory.tolerance) {
        const e = Rn.innerProduct(this.pE, this.pE, 2);
        if (e === 0) throw new Error("north pole isn't a circle");
        const s = 1.0 / Math.sqrt(e);
        this.cc[0] *= s; this.cc[1] *= s; this.cc[2] *= s * s; this.cc[3] = 0.0;
      } else {
        Pn.dehomogenize(this.cc, this.cc);
      }
    } else {
      Rn.matrixTimesVector(this.pE, CircleFactory.stereoProjMatrix, this.cc);
    }
    this.#setSphereCircleGeometry();
    this.#setPlaneCircleGeometry();
    this.changed = false;
  }

  #setSphereCircleGeometry() {
    const scale = Math.sqrt(Rn.innerProduct(this.pE, this.pE, 3));
    if (scale === 0) return;
    Rn.times(this.pE, 1.0 / scale, this.pE);
    const r = Math.sqrt(Math.max(0, 1 - this.pE[3] * this.pE[3]));
    const n = [this.pE[0], this.pE[1], this.pE[2]];
    MatrixBuilder.euclidean().rotateFromTo(CircleFactory.np3, n).translate(0, 0, -this.pE[3]).scale(r).assignTo(this.sphereSGC);
  }

  #setPlaneCircleGeometry() {
    if (Math.abs(this.cc[3]) < CircleFactory.tolerance) {
      const a = this.cc[0], b = this.cc[1], c = this.cc[2] * 0.5;
      const p0 = (Math.abs(b) > 1e-9) ? [0, -c / b, 0] : [-c / (a || 1), 0, 0];
      const d = [-b, a, 0];
      const p1 = [p0[0] + 100 * d[0], p0[1] + 100 * d[1], 0];
      const p2 = [p0[0] - 100 * d[0], p0[1] - 100 * d[1], 0];
      const seg = IndexedLineSetUtility.createCurveFromPoints([p1, p2], false);
      this.planeSGC.setGeometry(seg);
      MatrixBuilder.euclidean().assignTo(this.planeSGC);
    } else {
      const r = Math.sqrt(Math.max(0, -this.cc[2] + this.cc[0] * this.cc[0] + this.cc[1] * this.cc[1]));
      const samples = Math.max(20, (((r > 20) ? 20 : (Math.floor(r) + 1)) * CircleFactory.numSamples));
      this.planeSGC.setGeometry(IndexedLineSetUtility.circle(samples, this.cc[0], this.cc[1], r));
    }
  }

  static stereoProj(dst, x, y, z) {
    if (Array.isArray(x)) return CircleFactory.stereoProj(dst, x[0], x[1], x[2]);
    const out = dst ?? [0, 0];
    let t = 1 - z;
    if (t > 1e-9) t = 1.0 / t;
    else {
      t = 1e11;
      if (x === 0 && y === 0) { out[0] = 1e11; out[1] = 0; return out; }
    }
    out[0] = t * x; out[1] = t * y;
    if (out.length > 2) out[2] = 0.0;
    return out;
  }

  static inverseStereoProj(dst, x, y) {
    const t = x * x + y * y + 1;
    const out = dst ?? [0, 0, 0];
    out[0] = (2 * x) / t;
    out[1] = (2 * y) / t;
    out[2] = (t - 2) / t;
    return out;
  }
}

