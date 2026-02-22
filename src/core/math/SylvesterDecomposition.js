/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Immutable Sylvester decomposition for a symmetric 3x3 quadratic form.
 * Stores P and D such that P^T Q P = D, where D has entries in {+1,-1,0}.
 */
export class SylvesterDecomposition {
  #P;
  #D;
  #eigenvalues;
  #signs;
  #inertia;
  #permutation;

  /**
   * @param {{
   *   P: number[],
   *   D: number[],
   *   eigenvalues: number[],
   *   signs: number[],
   *   inertia: { pos: number, neg: number, zero: number },
   *   permutation: number[]
   * }} data
   */
  constructor(data) {
    this.#P = data.P.slice();
    this.#D = data.D.slice();
    this.#eigenvalues = data.eigenvalues.slice();
    this.#signs = data.signs.slice();
    this.#inertia = { ...data.inertia };
    this.#permutation = data.permutation.slice();
  }

  /**
   * Build decomposition from a 3x3 (flat or nested) matrix.
   * @param {number[]|number[][]} Q
   * @param {number} eps
   * @returns {SylvesterDecomposition}
   */
  static fromQuadraticForm3x3(Q, eps) {
    const q = _toFlat3x3(Q);
    const sym = _symmetrize3x3(q);
    const { values, vectors } = _jacobiEigenSymmetric3x3(sym, eps);

    const signs = [];
    const diag = [];
    const cols = [];
    let pos = 0;
    let neg = 0;
    let zero = 0;
    for (let i = 0; i < 3; i++) {
      const val = values[i];
      const vec = _getColumn3(vectors, i);
      const abs = Math.abs(val);
      let sign = 0;
      if (abs > eps) sign = val > 0 ? 1 : -1;
      signs.push(sign);
      if (sign > 0) pos++;
      else if (sign < 0) neg++;
      else zero++;
      diag.push(sign);
      const scale = abs > eps ? (1.0 / Math.sqrt(abs)) : 1.0;
      cols.push(_times(scale, vec));
    }

    const perm = _canonicalSylvesterPermutation(signs);
    const P = _columnsToMatrix3(
      cols[perm[0]],
      cols[perm[1]],
      cols[perm[2]]
    );
    const orderedSigns = perm.map(i => signs[i]);
    const D = _diagonalMatrix(orderedSigns);
    const eigenvalues = perm.map(i => values[i]);
    const inertia = { pos, neg, zero };

    return new SylvesterDecomposition({
      P,
      D,
      eigenvalues,
      signs: orderedSigns,
      inertia,
      permutation: perm
    });
  }

  /**
   * Factor a real rank-2 conic (line pair) directly from its quadratic form.
   * Returns [[a,b,c], [a',b',c']] with line equations a*x+b*y+c*z=0.
   * Returns null if the conic is not a real rank-2 line pair.
   * @param {number[]|number[][]} Q
   * @param {number} eps
   * @returns {number[][]|null}
   */
  static factorRealRank2LinePair(Q, eps = 1e-8) {
    return SylvesterDecomposition.fromQuadraticForm3x3(Q, eps).factorRealRank2LinePair();
  }

  /**
   * Return the real intersection point [x,y,z] for a conjugate-imaginary rank-2 line pair.
   * Returns null unless the decomposition has signature (++0) or (--0).
   * @param {number[]|number[][]} Q
   * @param {number} eps
   * @returns {number[]|null}
   */
  static imaginaryRank2IntersectionPoint(Q, eps = 1e-8) {
    return SylvesterDecomposition.fromQuadraticForm3x3(Q, eps).imaginaryRank2IntersectionPoint();
  }

  /**
   * Factor a rank-1 conic (double line) directly from its quadratic form.
   * Returns [a,b,c] for line a*x+b*y+c*z=0, or null if not rank-1.
   * @param {number[]|number[][]} Q
   * @param {number} eps
   * @returns {number[]|null}
   */
  static factorRank1DoubleLine(Q, eps = 1e-8) {
    return SylvesterDecomposition.fromQuadraticForm3x3(Q, eps).factorRank1DoubleLine();
  }

  /** @returns {number[]} */
  getP() { return this.#P.slice(); }
  /** @returns {number[]} */
  getD() { return this.#D.slice(); }
  /** @returns {number[]} */
  getEigenvalues() { return this.#eigenvalues.slice(); }
  /** @returns {number[]} */
  getSigns() { return this.#signs.slice(); }
  /** @returns {{ pos: number, neg: number, zero: number }} */
  getInertia() { return { ...this.#inertia }; }
  /** @returns {number[]} */
  getPermutation() { return this.#permutation.slice(); }
  /** @returns {number} */
  getRank() { return this.#inertia.pos + this.#inertia.neg; }
  /** @returns {boolean} */
  isDegenerate() { return this.getRank() < 3; }
  /** @returns {boolean} */
  isRank3() { return this.getRank() === 3; }
  /** @returns {boolean} */
  isRank2() { return this.getRank() === 2; }
  /** @returns {boolean} */
  isRank1() { return this.getRank() === 1; }
  /** @returns {boolean} */
  isRealOval() { return this.isRank3() && (this.#inertia.pos === 1 || this.#inertia.neg === 1); }
  /** @returns {boolean} */
  isImaginary() {
    return this.getRank() === 3 && (this.#inertia.pos === 3 || this.#inertia.neg === 3);
  }
  /** @returns {boolean} */
  isRank2ImaginaryLinePair() {
    return this.isRank2() && (this.#inertia.pos === 2 || this.#inertia.neg === 2);
  }
  /** @returns {boolean} */
  isRank2RealLinePair() {
    return this.isRank2() && this.#inertia.pos === 1 && this.#inertia.neg === 1;
  }
  /**
   * Canonical signature string in current Sylvester ordering, e.g. "++-", "+-0", "++0", "+00".
   * @returns {string}
   */
  getCanonicalSignatureString() {
    return this.#signs.map((s) => (s > 0 ? '+' : (s < 0 ? '-' : '0'))).join('');
  }

  /**
   * Factor this decomposition if it represents a real rank-2 line pair.
   * Canonical form in Sylvester coordinates is (u0-u1)(u0+u1)=0, then transformed back.
   * @returns {number[][]|null}
   */
  factorRealRank2LinePair() {
    if (!this.isRank2RealLinePair()) return null;
    const pinvT = _transpose3(_inverse3x3(this.#P));
    const lCanonical0 = [1, -1, 0];
    const lCanonical1 = [1, 1, 0];
    const l0 = _normalizeLine3(_matVec3(pinvT, lCanonical0));
    const l1 = _normalizeLine3(_matVec3(pinvT, lCanonical1));
    return [l0, l1];
  }

  /**
   * Return the real point [x,y,z] represented by the dual rank-1 conic for (++0)/(--0).
   * In Sylvester coordinates this is [0,0,1], mapped back by P.
   * @returns {number[]|null}
   */
  imaginaryRank2IntersectionPoint() {
    if (!this.isRank2ImaginaryLinePair()) return null;
    const p = [this.#P[2], this.#P[5], this.#P[8]];
    return _normalizePoint3(p);
  }

  /**
   * Return [a,b,c] for rank-1 conics (double lines): (a*x+b*y+c*z)^2=0.
   * Returns null unless this decomposition has rank 1.
   * @returns {number[]|null}
   */
  factorRank1DoubleLine() {
    if (!this.isRank1()) return null;
    const pinvT = _transpose3(_inverse3x3(this.#P));
    const lCanonical = [0, 0, 1];
    return _normalizeLine3(_matVec3(pinvT, lCanonical));
  }

  /**
   * Return plain object for convenience/debugging.
   * @returns {{ P: number[], D: number[], eigenvalues: number[], signs: number[], inertia: { pos: number, neg: number, zero: number }, permutation: number[] }}
   */
  toObject() {
    return {
      P: this.getP(),
      D: this.getD(),
      eigenvalues: this.getEigenvalues(),
      signs: this.getSigns(),
      inertia: this.getInertia(),
      permutation: this.getPermutation()
    };
  }
}

function _times(scale, v) {
  return [scale * v[0], scale * v[1], scale * v[2]];
}

function _toFlat3x3(Q) {
  if (Array.isArray(Q) && Q.length === 9 && typeof Q[0] === 'number') return Q.slice();
  if (Array.isArray(Q) && Q.length === 3 && Array.isArray(Q[0]) && Q[0].length === 3) {
    return [
      Q[0][0], Q[0][1], Q[0][2],
      Q[1][0], Q[1][1], Q[1][2],
      Q[2][0], Q[2][1], Q[2][2]
    ];
  }
  throw new Error('sylvesterDiagonalize3x3: expected 3x3 matrix (flat or 2D)');
}

function _symmetrize3x3(Q) {
  return [
    Q[0], 0.5 * (Q[1] + Q[3]), 0.5 * (Q[2] + Q[6]),
    0.5 * (Q[3] + Q[1]), Q[4], 0.5 * (Q[5] + Q[7]),
    0.5 * (Q[6] + Q[2]), 0.5 * (Q[7] + Q[5]), Q[8]
  ];
}

function _jacobiEigenSymmetric3x3(A, eps, maxIter = 50) {
  const a = A.slice();
  const v = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  ];
  const idx = [
    [1, 2], [0, 2], [0, 1]
  ];
  for (let iter = 0; iter < maxIter; iter++) {
    const off = [Math.abs(a[5]), Math.abs(a[2]), Math.abs(a[1])];
    let k = 0;
    if (off[1] > off[k]) k = 1;
    if (off[2] > off[k]) k = 2;
    if (off[k] <= eps) break;

    const [p, q] = idx[k];
    const app = a[3 * p + p];
    const aqq = a[3 * q + q];
    const apq = a[3 * p + q];
    if (Math.abs(apq) <= eps) continue;

    const tau = (aqq - app) / (2 * apq);
    let t;
    if (tau >= 0) {
      t = 1 / (tau + Math.sqrt(1 + tau * tau));
    } else {
      t = -1 / (-tau + Math.sqrt(1 + tau * tau));
    }
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;

    for (let r = 0; r < 3; r++) {
      const arp = a[3 * r + p];
      const arq = a[3 * r + q];
      a[3 * r + p] = c * arp - s * arq;
      a[3 * r + q] = s * arp + c * arq;
    }
    for (let r = 0; r < 3; r++) {
      const apr = a[3 * p + r];
      const aqr = a[3 * q + r];
      a[3 * p + r] = c * apr - s * aqr;
      a[3 * q + r] = s * apr + c * aqr;
    }
    a[3 * p + q] = 0;
    a[3 * q + p] = 0;

    for (let r = 0; r < 3; r++) {
      const vrp = v[3 * r + p];
      const vrq = v[3 * r + q];
      v[3 * r + p] = c * vrp - s * vrq;
      v[3 * r + q] = s * vrp + c * vrq;
    }
  }
  return {
    values: [a[0], a[4], a[8]],
    vectors: v
  };
}

function _getColumn3(m, col) {
  return [m[col], m[3 + col], m[6 + col]];
}

function _columnsToMatrix3(c0, c1, c2) {
  return [
    c0[0], c1[0], c2[0],
    c0[1], c1[1], c2[1],
    c0[2], c1[2], c2[2]
  ];
}

function _diagonalMatrix(entries) {
  return [
    entries[0], 0, 0,
    0, entries[1], 0,
    0, 0, entries[2]
  ];
}

function _canonicalSylvesterPermutation(signs) {
  const pos = [];
  const neg = [];
  const zero = [];
  for (let i = 0; i < signs.length; i++) {
    if (signs[i] > 0) pos.push(i);
    else if (signs[i] < 0) neg.push(i);
    else zero.push(i);
  }

  if (pos.length === 2 && neg.length === 1) return [pos[0], pos[1], neg[0]];
  if (neg.length === 2 && pos.length === 1) return [neg[0], neg[1], pos[0]];
  if (pos.length === 2 && zero.length === 1) return [pos[0], pos[1], zero[0]];
  if (neg.length === 2 && zero.length === 1) return [neg[0], neg[1], zero[0]];
  if (pos.length === 1 && neg.length === 1 && zero.length === 1) return [pos[0], neg[0], zero[0]];
  if (pos.length === 1 && zero.length === 2) return [zero[0], zero[1], pos[0]];
  if (neg.length === 1 && zero.length === 2) return [zero[0], zero[1], neg[0]];
  return [0, 1, 2];
}

function _matVec3(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
  ];
}

function _transpose3(m) {
  return [
    m[0], m[3], m[6],
    m[1], m[4], m[7],
    m[2], m[5], m[8]
  ];
}

function _inverse3x3(m) {
  const a = m[0], b = m[1], c = m[2];
  const d = m[3], e = m[4], f = m[5];
  const g = m[6], h = m[7], i = m[8];

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-14) throw new Error('SylvesterDecomposition: singular P in line-pair factorization');
  const invDet = 1 / det;
  return [
    A * invDet, D * invDet, G * invDet,
    B * invDet, E * invDet, H * invDet,
    C * invDet, F * invDet, I * invDet
  ];
}

function _normalizeLine3(line) {
  const nxy = Math.hypot(line[0], line[1]);
  if (nxy > 1e-14) return [line[0] / nxy, line[1] / nxy, line[2] / nxy];
  const n = Math.hypot(line[0], line[1], line[2]);
  if (n > 1e-14) return [line[0] / n, line[1] / n, line[2] / n];
  return line.slice();
}

function _normalizePoint3(point) {
  const out = point.slice();
  const z = out[2];
  if (Math.abs(z) > 1e-14) {
    out[0] /= z;
    out[1] /= z;
    out[2] = 1;
    return out;
  }
  const n = Math.hypot(out[0], out[1], out[2]);
  if (n > 1e-14) return [out[0] / n, out[1] / n, out[2] / n];
  return out;
}
