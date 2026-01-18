/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// P2.js - Projective Plane Point utilities (classless)
import * as Pn from './Pn.js';
import * as Rn from './Rn.js';











/**
 * @param {number[]} p1
 * @param {number[]} p2
 * @returns {number[]}
 */
export function pointFromLines(p1, p2) {
    const [x1,y1,w1] = Pn.dehomogenize(p1);
    const [x2,y2,w2] = Pn.dehomogenize(p2);
    const ret = outerProduct([x1,y1,w1], [x2,y2,w2]);
    return Pn.dehomogenize(ret);
}

/**
 * @param {number[]} line
 * @returns {number[]}
 */
export function normalizeLine(line) {
    const [a,b,c] = line;
    let d = a*a + b*b;
    d = (d != 0) ? (1.0/Math.sqrt(d)) : 1;
    return [d*a, d*b, d*c];
}

/**
 * @param {number[]} p1
 * @param {number[]} p2
 * @returns {number[]}
 */
export function lineFromPoints(p1, p2) {
    const [x1,y1,w1] = Pn.dehomogenize(p1);
    const [x2,y2,w2] = Pn.dehomogenize(p2);
    const ret = outerProduct([x1,y1,w1], [x2,y2,w2]);
    return normalizeLine(ret);
}

/**
 * @param {number[]} line
 * @param {number[]} center
 * @param {number} radius
 * @returns {number[][]}
 */
export function clipLineToCircle(line, center, radius) {
    const nline = normalizeLine(line);
    let P = (nline[0] !=0) ? [nline[2],0,-nline[0]] : [0,nline[2], -nline[1]];
    const V = [nline[1], -nline[0], 0];
    P = Rn.subtract(null, Rn.dehomogenize(null, P), center);
    P[2] = 1;
    const a = Rn.innerProductN(V,V,2),
          b = 2*Rn.innerProductN(P,V,2),
          c = Rn.innerProductN(P,P,2) - radius*radius;
    const d = b*b - 4*a*c;
    if (d < 0) return [];
    const s = Math.sqrt(d);
    const t1 = (-b + s)/(2*a), t2 = (-b - s)/(2*a);
    const CP = Rn.add(null, P, center);
    CP[1] = 1;
    const P1 = Rn.add(null, P, Rn.times(null, t1, V)),
          P2 = Rn.add(null, P, Rn.times(null, t2, V));
    return [P1, P2];
}

/**
 * @param {number[]} line
 * @param {number} xmin
 * @param {number} xmax
 * @param {number} ymin
 * @param {number} ymax
 * @returns {number[][]}
 */
export function clipLineToBox(line, xmin, xmax, ymin, ymax) {
    const nline = normalizeLine(line);
    let seg = [];
    const box = [[xmin,ymin,1], [xmax,ymin,1], [xmax,ymax,1], [xmin,ymax,1]];
    const dis = box.map(p => innerProduct(nline, p));
    // no-op logging removed for portability
    const signs = dis.map((d,i)=>{
        let j = (i+1)%4;
        return Math.sign(d)*Math.sign(dis[j])
    });
    // no-op logging removed for portability
    const allSame = signs.every(s => s === signs[0]);
    if (allSame) return [];
    signs.map((s,i)=>{
        let j = (i+1)%4;
        if (Math.abs(s) < Rn.TOLERANCE) seg = [...seg, box[i]];
        else if (s < 0) {
            let p = Rn.add(null, Rn.times(null,dis[i],box[j]), 
                Rn.times(null, dis[j], box[i]));
            // no-op logging removed for portability
            seg = [...seg, dehomogenize(p)];
        }
    });
    // no-op logging removed for portability
    return seg;
}

/**
 * @param {number[]} p1
 * @param {number[]} p2
 * @returns {number[]}
 */
export function outerProduct(p1, p2) {
    const [x1,y1,w1] = p1;
    const [x2,y2,w2] = p2;
    return [y1*w2-y2*w1, x2*w1-x1*w2, x1*y2-x2*y1];
}

/**
 * @param {number[]|null} dst
 * @param {number[]} [m]
 * @returns {number[]}
 */
export function cofactor(dst, m) {
    if (m == null) {
        m = /** @type {number[]} */ (dst);
        dst = null;
    }
    if (!m) {
        throw new Error('P2.cofactor: matrix is required');
    }
    let det = Rn.determinant(m);
    if (Math.abs(det) < Rn.TOLERANCE) det = 1;
    else det = Math.pow(Math.abs(det), 1/3);
    const result = [
        (m[4]*m[8] - m[5]*m[7])/det,
        (m[2]*m[7] - m[1]*m[8])/det,
        (m[1]*m[5] - m[2]*m[4])/det,
        (m[5]*m[6] - m[3]*m[8])/det,
        (m[0]*m[8] - m[2]*m[6])/det,
        (m[2]*m[3] - m[0]*m[5])/det,
        (m[3]*m[7] - m[4]*m[6])/det,
        (m[1]*m[6] - m[0]*m[7])/det,
        (m[0]*m[4] - m[1]*m[3])/det
    ];
    if (dst) {
        dst = [...result];
        return dst;
    }
    return result;
}

/**
 * @param {number[]} matrix
 * @param {number[]} vector
 * @returns {number[]}
 */
export function multiplyMatrixVector(matrix, vector) {
    const result = new Array(3).fill(0);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            result[i] += matrix[3*i + j] * vector[j];
        }
    }
    return result;
}

/**
 * Calculate the Euclidean perpendicular bisector of the segment from p1 to p2.
 * @param {number[]|null} dst
 * @param {number[]} p1
 * @param {number[]} p2
 * @returns {number[]}
 */
export function perpendicularBisector(dst, p1, p2, metric) {
    if (p1.length !== 3 || p2.length !== 3) {
        throw new Error('Input points must be homogeneous vectors');
    }
    if (metric == null || metric === Pn.EUCLIDEAN) {
        if (!dst) dst = new Array(3);
        const avg = Rn.add(null, Pn.dehomogenize(null, p1), Pn.dehomogenize(null, p2));
        Rn.times(avg, 0.5, avg);
        const line = lineFromPoints(p1, p2);
        dst[0] = -line[1];
        dst[1] = line[0];
        dst[2] = -(dst[0] * avg[0] + dst[1] * avg[1]);
        return dst;
    }
    if (!dst) dst = new Array(3);
    const midpoint = new Array(3);
    Pn.linearInterpolation(midpoint, p1, p2, 0.5, metric);
    const line = lineFromPoints(p1, p2);
    const polarM = Pn.polarize(null, midpoint, metric);
    const pb = pointFromLines(polarM, line);
    Pn.polarize(dst, pb, metric);
    if (Rn.innerProduct(dst, p1) < 0) Rn.times(dst, -1.0, dst);
    return dst;
}

/**
 * Returns true if and only if point is within polygon.
 * @param {number[][]} polygon
 * @param {number[]} point
 * @returns {boolean}
 */
export function polygonContainsPoint(polygon, point, open = null) {
    return getFirstOutsideEdge(polygon, open, point) === -1;
}

/**
 * Returns index of first edge outside point, or -1 if inside.
 * @param {number[][]} polygon
 * @param {boolean[]|null} open
 * @param {number[]} point
 * @returns {number}
 */
export function getFirstOutsideEdge(polygon, open, point) {
    if (point.length !== 3) {
        throw new Error('Input point must be homogeneous vector');
    }
    const n = polygon.length;
    let p1 = [polygon[0][0], polygon[0][1], 1.0];
    let p2 = [0, 0, 1.0];
    let min = 1.0e11;
    let which = -1;
    for (let i = 0; i < n; ++i) {
        const j = (i + 1) % n;
        p2[0] = polygon[j][0];
        p2[1] = polygon[j][1];
        const line = lineFromPoints(p1, p2);
        const ip = Rn.innerProduct(line, point);
        if (ip < min) { which = i; min = ip; }
        const tmp = p1;
        p1 = p2;
        p2 = tmp;
    }
    if (open != null && open[which]) {
        if (min <= 0.0) return which;
    } else if (min < 0.0) return which;
    return -1;
}

/**
 * Returns true if and only if the polygon described by polygon is convex.
 * @param {number[][]} polygon
 * @returns {boolean}
 */
export function isConvex(polygon) {
    const n = polygon.length;
    let metricn = 0.0;
    const diffs = new Array(n);
    for (let i = 0; i < n; ++i) {
        const j = (i + 1) % n;
        diffs[i] = Rn.subtract(null, polygon[j], polygon[i]);
        Rn.normalize(diffs[i], diffs[i]);
    }
    const tmp = [0, 0, 0];
    for (let i = 0; i < n; ++i) {
        const j = (i + 1) % n;
        Rn.crossProduct(tmp, diffs[i], diffs[j]);
        if (metricn === 0.0) metricn = tmp[2];
        else if (metricn * tmp[2] < 0.0) return false;
    }
    return true;
}

/**
 * Cut a convex polygon with a line (negative inner products are cut away).
 * @param {number[][]} polygon
 * @param {number[]} line
 * @returns {number[][]|null}
 */
export function chopConvexPolygonWithLine(polygon, line) {
    if (line.length !== 3) {
        throw new Error('Input line must be homogeneous vectors');
    }
    if (polygon == null) return null;
    const n = polygon.length;
    const center = new Array(3);
    Rn.average(center, polygon);
    let noNegative = true;
    const vals = new Array(n);
    let count = 0;
    for (let i = 0; i < n; ++i) {
        vals[i] = Rn.innerProduct(line, polygon[i]);
        if (vals[i] >= 0) count++;
        else noNegative = false;
    }
    if (count === 0) {
        return null;
    } else if (count === n || noNegative) {
        return polygon;
    }
    const newPolygon = new Array(count + 2).fill(null).map(() => new Array(3));
    const tmp = [0, 0, 0];
    count = 0;
    for (let i = 0; i < n; ++i) {
        if (vals[i] >= 0) {
            newPolygon[count][0] = polygon[i][0];
            newPolygon[count][1] = polygon[i][1];
            newPolygon[count][2] = polygon[i][2];
            count++;
        }
        if (count >= newPolygon.length) break;
        if (vals[i] * vals[(i + 1) % n] < 0) {
            const edge = lineFromPoints(polygon[i], polygon[(i + 1) % n]);
            const p = pointFromLines(edge, line);
            Pn.dehomogenize(newPolygon[count], p);
            count++;
        }
        if (count >= newPolygon.length) break;
    }
    if (count !== newPolygon.length) {
        return newPolygon.slice(0, count);
    }
    return newPolygon;
}

/**
 * Generate a direct isometry carrying the frame (p0,p1) to (q0,q1).
 * @param {number[]|null} dst
 * @param {number[]} p0
 * @param {number[]} p1
 * @param {number[]} q0
 * @param {number[]} q1
 * @param {number} metric
 * @returns {number[]}
 */
export function makeDirectIsometryFromFrames(dst, p0, p1, q0, q1, metric) {
    const toP = makeDirectIsometryFromFrame(null, p0, p1, metric);
    const toQ = makeDirectIsometryFromFrame(null, q0, q1, metric);
    const iToP = Rn.inverse(null, toP);
    return Rn.times(dst, toQ, iToP);
}

/**
 * Generate a direct isometry mapping the frame determined by (point, xdir) to identity.
 * @param {number[]|null} dst
 * @param {number[]} point
 * @param {number[]} xdir
 * @param {number} metric
 * @returns {number[]}
 */
export function makeDirectIsometryFromFrame(dst, point, xdir, metric) {
    if (!dst) dst = new Array(9);
    Pn.normalize(point, point, metric);
    let p2 = null;
    let p1n = null;
    if (metric === Pn.EUCLIDEAN) {
        p1n = xdir.slice();
        if (p1n[2] !== 0) {
            Pn.dehomogenize(p1n, p1n);
            Rn.subtract(p1n, p1n, point);
        }
        Rn.normalize(p1n, p1n);
        p2 = [-p1n[1], p1n[0], 0];
    } else {
        const polarP = Pn.polarize(null, point, metric);
        const lineP = lineFromPoints(point, xdir);
        p1n = Pn.normalize(null, pointFromLines(polarP, lineP), metric);
        p2 = Pn.polarize(null, lineP, metric);
        Pn.normalize(p2, p2, metric);
    }
    return makeMatrixFromColumns(dst, p1n, p2, point);
}

/**
 * @param {number[]|null} dst
 * @param {number[]} p0
 * @param {number[]} p1
 * @param {number[]} p2
 * @returns {number[]}
 */
function makeMatrixFromColumns(dst, p0, p1, p2) {
    if (!dst) dst = new Array(9);
    const ptrs = [p0, p1, p2];
    for (let i = 0; i < 3; ++i) {
        for (let j = 0; j < 3; ++j) {
            dst[3 * i + j] = ptrs[j][i];
        }
    }
    return dst;
}

/**
 * Convert the input (x,y,z,w) into (x,y,w).
 * @param {number[]|null} vec3
 * @param {number[]} vec4
 * @returns {number[]}
 */
export function projectP3ToP2(vec3, vec4) {
    const dst = vec3 ?? new Array(3);
    dst[0] = vec4[0];
    dst[1] = vec4[1];
    dst[2] = vec4[3];
    return dst;
}

/**
 * Convert (x,y,z) into (x,y,0,z). Accepts a single vector or array of vectors.
 * @param {number[]|number[][]|null} vec4
 * @param {number[]|number[][]} vec3
 * @returns {number[]|number[][]}
 */
export function imbedP2InP3(vec4, vec3) {
    if (Array.isArray(vec3[0])) {
        const src = /** @type {number[][]} */ (vec3);
        const dst = Array.isArray(vec4) && Array.isArray(vec4[0])
            ? /** @type {number[][]} */ (vec4)
            : new Array(src.length).fill(null).map(() => new Array(4));
        for (let i = 0; i < src.length; ++i) {
            imbedP2InP3(dst[i], src[i]);
        }
        return dst;
    }
    const src = /** @type {number[]} */ (vec3);
    const dst = (vec4 && !Array.isArray(vec4[0])) ? /** @type {number[]} */ (vec4) : new Array(4);
    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = 0.0;
    dst[3] = src[2];
    return dst;
}

const _which = [0, 1, 3];

/**
 * Imbed a 3x3 matrix into a 4x4 matrix (P2 -> P3).
 * @param {number[]|null} dst
 * @param {number[]} m3
 * @returns {number[]}
 */
export function imbedMatrixP2InP3(dst, m3) {
    if (!dst) dst = new Array(16);
    for (let i = 0; i < 3; ++i) {
        const i4 = _which[i];
        for (let j = 0; j < 3; ++j) {
            const j4 = _which[j] + 4 * i4;
            const j3 = i * 3 + j;
            dst[j4] = m3[j3];
        }
    }
    dst[2] = dst[6] = dst[8] = dst[9] = dst[11] = 0.0;
    dst[10] = 1.0;
    return dst;
}