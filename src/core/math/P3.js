import * as Pn from './Pn.js';
import * as Rn from './Rn.js';

// Constants
export const p3involution = [-1, -1, -1, -1];
export const Q_HYPERBOLIC = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1];
export const Q_EUCLIDEAN = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
export const Q_ELLIPTIC = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export const Q_LIST = [Q_HYPERBOLIC, Q_EUCLIDEAN, Q_ELLIPTIC];
export const originP3 = [0.0, 0.0, 0.0, 1.0];
export const xaxis = [1, 0, 0];
export const yaxis = [0, 1, 0];
export const zaxis = [0, 0, -1];
export const hzaxis = [0, 0, 1, 1];

/**
 * Calculate a translation matrix which carries the origin (0,0,0,1) to 
 * the point to.
 * @param {number[]} mat - Destination array for matrix
 * @param {number[]} to - Target point
 * @param {number} metric - Metric type (EUCLIDEAN, HYPERBOLIC, ELLIPTIC)
 * @returns {number[]} Translation matrix
 */
export function makeTranslationMatrix(mat, to, metric) {
    if (!mat) mat = new Array(16);
    return makeTranslationMatrixOld(mat, to, metric);
}

/**
 * Calculate a translation in the given geometry which carries the origin of P3 (0,0,0,1) to the input point.
 * @param {number[]} mat - Destination array for matrix
 * @param {number[]} p - Target point
 * @param {number} metric - Metric type
 * @returns {number[]} Translation matrix
 */
function makeTranslationMatrixOld(mat, p, metric) {
    let tmp = new Array(4);
    let foo = new Array(3);
    let m = mat || new Array(16);
    let rot = new Array(16);
    let mtmp = new Array(16);
    let point;

    // Handle 3D vs 4D points
    if (p.length === 3) {
        point = new Array(4);
        point[0] = p[0];
        point[1] = p[1];
        point[2] = p[2];
        point[3] = 1.0;
    } else {
        point = p;
    }

    switch (metric) {
        case Pn.EUCLIDEAN:
            Rn.setIdentityMatrix(m);
            if (point.length === 4) {
                point = Pn.dehomogenize(null, point);
                if (point[3] === 0.0) point[3] = 1.0;
            }
            for (let i = 0; i < 3; ++i) {
                m[i * 4 + 3] = point[i];
            }
            break;

        case Pn.HYPERBOLIC:
            if (Pn.innerProduct(point, point, Pn.HYPERBOLIC) > 0.0) {
                let k = (point[3] * point[3] - 0.0001) / Rn.innerProduct(point, point, 3);
                k = Math.sqrt(k);
                for (let i = 0; i < 3; ++i) point[i] *= k;
            }
        // falls through to ELLIPTIC case
        case Pn.ELLIPTIC:
            Rn.setIdentityMatrix(mtmp);
            tmp = Pn.normalize(tmp, point, metric);
            for (let i = 0; i < 3; ++i) foo[i] = tmp[i];
            let d = Rn.innerProduct(foo, foo);
            mtmp[11] = Math.sqrt(d);
            if (metric === Pn.ELLIPTIC) {
                mtmp[14] = -mtmp[11];
            } else {
                mtmp[14] = mtmp[11];
            }
            mtmp[10] = mtmp[15] = tmp[3];
            makeRotationAxisMatrix(rot, hzaxis, tmp);
            Rn.conjugateByMatrix(m, mtmp, rot);
            break;

        default:
            Rn.setIdentityMatrix(m);
            break;
    }

    return m;
}

/**
 * Calculate a translation matrix that carries point from to point to
 * and maps the line joining from and to to itself (the axis of the isometry).
 * @param {number[]} dst - Destination array for matrix
 * @param {number[]} from - Starting point
 * @param {number[]} to - Target point
 * @param {number} metric - Metric type
 * @returns {number[]} Translation matrix
 */
export function makeTranslationMatrix2(dst, from, to, metric) {
    if (!dst) dst = new Array(16);
    let TP = makeTranslationMatrix(null, from, metric);
    let iTP = Rn.inverse(null, TP);
    let toPrime = Rn.matrixTimesVector(null, iTP, to);
    makeTranslationMatrix(dst, toPrime, metric);
    Rn.conjugateByMatrix(dst, dst, TP);
    return dst;
}

/**
 * Generate a rotation matrix fixing the origin (0,0,0,1) around the given axis with the given angle.
 * @param {number[]} m - Destination array for matrix
 * @param {number[]} axis - Rotation axis
 * @param {number} angle - Rotation angle
 * @returns {number[]} Rotation matrix
 */
export function makeRotationMatrix(m, axis, angle) {
    if (!m) m = new Array(16);
    if (axis.length < 3) {
        throw new Error("Axis is wrong size");
    }
    
    let u = new Array(3);
    for (let i = 0; i < 3; i++) u[i] = axis[i];
    Rn.normalize(u, u);
    
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const v = 1.0 - c;
    
    Rn.setIdentityMatrix(m);
    m[0] = u[0] * u[0] * v + c;
    m[4] = u[0] * u[1] * v + u[2] * s;
    m[8] = u[0] * u[2] * v - u[1] * s;

    m[1] = u[1] * u[0] * v - u[2] * s;
    m[5] = u[1] * u[1] * v + c;
    m[9] = u[1] * u[2] * v + u[0] * s;

    m[2] = u[2] * u[0] * v + u[1] * s;
    m[6] = u[2] * u[1] * v - u[0] * s;
    m[10] = u[2] * u[2] * v + c;
    
    return m;
}

/**
 * Generate a rotation matrix which fixes the origin (0,0,0,1) and carries the vector from to the vector to.
 * @param {number[]} m - Destination array for matrix
 * @param {number[]} from - Starting vector (3D)
 * @param {number[]} to - Target vector (3D)
 * @returns {number[]} Rotation matrix
 */
export function makeRotationAxisMatrix(m, from, to) {
    if (!m) m = new Array(16);
    if (from.length < 3 || to.length < 3) {
        throw new Error("Input vectors too short");
    }

    // Create vectors array and normalize input vectors
    const v1 = Rn.normalize(null, from.slice(0, 3));
    const v2 = Rn.normalize(null, to.slice(0, 3));

    // Calculate angle between vectors
    const cosAngle = Rn.innerProduct(v1, v2);
    const angle = Math.acos(cosAngle);
    
    // Handle numerical precision issues
    if (isNaN(angle)) {
        return makeRotationMatrix(m, [1, 0, 0], cosAngle > 0 ? 0 : Math.PI);
    }

    // Calculate rotation axis using cross product and normalize
    const axis = Rn.crossProduct(null, v1, v2);
    const normalizedAxis = Rn.normalize(null, axis);

    // Generate rotation matrix around this axis
    return makeRotationMatrix(m, normalizedAxis, angle);
}