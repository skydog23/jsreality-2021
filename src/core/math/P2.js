// P2.js - Projective Plane Point utilities (classless)
import * as Rn from './Rn.js';

// Create a point from affine coordinates (sets w=1)
export function fromAffine(x, y) {
    return [x, y, 1];
}

// Create a point at infinity in direction (x,y)
export function atInfinity(x, y) {
    const norm = Math.sqrt(x*x + y*y);
    return [x/norm, y/norm, 0];
}

export function euclideanDistance(p1, p2) {
    return Math.sqrt(euclideanDistanceSquared(p1, p2));
}

export function euclideanDistanceSquared(p1, p2) {
    p1 = dehomogenize(p1);
    p2 = dehomogenize(p2);
    return innerProduct(subtract(p1,p2), subtract(p1,p2));
}

export function add(p1, p2) {
    return [p1[0]+p2[0], p1[1]+p2[1], p1[2]+p2[2]];
}

export function subtract(p1, p2) {
    return [p1[0]-p2[0], p1[1]-p2[1], p1[2]-p2[2]];
}

export function scale(s, p2) {
    return [s*p2[0], s*p2[1], s*p2[2]];
}

// Dehomogenize the point - if w is close to 0, leave it,
// otherwise scale to make w=1
export function dehomogenize(p) {
    if (Math.abs(p[2]) < 1e-10) {
        return [p[0], p[1], 0];
    } else {
        return [p[0]/p[2], p[1]/p[2], 1];
    }
}

// Check if point is at infinity
export function isAtInfinity(p) {
    return Math.abs(p[2]) < 1e-10;
}

// Get affine coordinates (x/w, y/w) if finite, null if at infinity
export function getAffine(p) {
    if (isAtInfinity(p)) return null;
    return { x: p[0]/p[2], y: p[1]/p[2] };
}

// Dot product
export function innerProduct(p1, p2) {
    return p1[0]*p2[0] + p1[1]*p2[1] + p1[2]*p2[2];
}

export function norm(p) {
    return Math.sqrt(innerProduct(p,p));
}

export function normalize(p) {
    const n = norm(p);
    if (n < 1e-10) return p;
    return scale(1/n, p);
}

export function pointFromLines(p1, p2) {
    const [x1,y1,w1] = dehomogenize(p1);
    const [x2,y2,w2] = dehomogenize(p2);
    const ret = outerProduct([x1,y1,w1], [x2,y2,w2]);
    return dehomogenize(ret);
}

export function normalizeLine(line) {
    const [a,b,c] = line;
    let d = a*a + b*b;
    d = (d != 0) ? (1.0/Math.sqrt(d)) : 1;
    return [d*a, d*b, d*c];
}

export function lineFromPoints(p1, p2) {
    const [x1,y1,w1] = dehomogenize(p1);
    const [x2,y2,w2] = dehomogenize(p2);
    const ret = outerProduct([x1,y1,w1], [x2,y2,w2]);
    return normalizeLine(ret);
}

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

export function outerProduct(p1, p2) {
    const [x1,y1,w1] = p1;
    const [x2,y2,w2] = p2;
    return [y1*w2-y2*w1, x2*w1-x1*w2, x1*y2-x2*y1];
}

export function cofactor(m) {
    let det = Rn.determinant(m);
    if (Math.abs(det) < Rn.TOLERANCE) det = 1;
    else det = Math.pow(det, 1/3);
    return [
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
}

export function multiplyMatrixVector(matrix, vector) {
    const result = new Array(3).fill(0);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            result[i] += matrix[3*i + j] * vector[j];
        }
    }
    return result;
}