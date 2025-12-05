/**
 * JavaScript port/translation of jReality's BruteForcePicking class.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// TODO: currently 3vectors (from, to) are NOT supported

/**
 * TODO: get rid of the maxDist parameter, use the from and to vectors as the
 * endpoints of the segment of valid pick-points
 */

import { Matrix } from '../../math/Matrix.js';
import * as P3 from '../../math/P3.js';
import * as Pn from '../../math/Pn.js';
import * as Rn from '../../math/Rn.js';
import { Cylinder } from '../Cylinder.js';
import { IndexedFaceSet } from '../IndexedFaceSet.js';
import { IndexedLineSet } from '../IndexedLineSet.js';
import { PointSet } from '../PointSet.js';
import { SceneGraphPath } from '../SceneGraphPath.js';
import { Sphere } from '../Sphere.js';
import { GeometryAttribute } from '../GeometryAttribute.js';
import { fromDataList } from '../data/DataUtility.js';
import { Hit } from './Hit.js';
import { PickResult } from './PickResult.js';
import { getLogger, Category } from '../../util/LoggingSystem.js';
// Thread-local static variables → module-level variables (not thread-safe, but JS is single-threaded)
const SPHERE_HIT_LIST = [];
const CYLINDER_HIT_LIST = [];
const logger = getLogger('AABBPickSystem');
/**
 * Intersect ray with polygons (faces) of an IndexedFaceSet
 * @param {IndexedFaceSet} ifs - Face set to intersect
 * @param {number} metric - Metric type
 * @param {SceneGraphPath} path - Path to the geometry
 * @param {Matrix} m - Object to world transformation matrix
 * @param {Matrix} mInv - World to object transformation matrix
 * @param {number[]} from - Ray start point in world coordinates
 * @param {number[]} to - Ray end point in world coordinates
 * @param {Hit[]} hits - Array to append hits to
 */
export function intersectPolygons(ifs, metric, path, m, mInv, from, to, hits) {
  logger.fine(Category.SCENE, `intersectPolygons: ${from} ${to}`);
  logger.fine(Category.SCENE, `intersectPolygons: ${m.toString()}`);
 const fromLocal = mInv.multiplyVector(from);
  const toLocal = mInv.multiplyVector(to);
  const bary = new Array(3);
  const p1 = [0, 0, 0, 1];
  const p2 = [0, 0, 0, 1];
  const p3 = [0, 0, 0, 1];
  const pobj = [0, 0, 0, 1];
  
  const faces = getFaces(ifs);
  const points = getPoints(ifs);
  
  if (faces === null || points === null || faces.length === 0 || points.length === 0) {
    return;
  }
  
  for (let i = 0, n = faces.length; i < n; i++) {
    const face = faces[i];
    // Simple triangulation:
    for (let j = 0, dd = face.length - 2; j < dd; j++) {
      const pt0 = points[face[0]];
      const pt1 = points[face[1 + j]];
      const pt2 = points[face[2 + j]];
      
      // Copy points to p1, p2, p3 (handle 3D or 4D)
      for (let k = 0; k < Math.min(pt0.length, 4); k++) p1[k] = pt0[k];
      for (let k = 0; k < Math.min(pt1.length, 4); k++) p2[k] = pt1[k];
      for (let k = 0; k < Math.min(pt2.length, 4); k++) p3[k] = pt2[k];
      if (p1.length < 4) p1[3] = 1;
      if (p2.length < 4) p2[3] = 1;
      if (p3.length < 4) p3[3] = 1;
      logger.fine(Category.SCENE, `j ${j} intersectPolygons: p1: ${p1} p2: ${p2} p3: ${p3}`);
      
      if (intersects(pobj, fromLocal, toLocal, p1, p2, p3, bary)) {
        const pw = m.multiplyVector(pobj);
        const d = Pn.distanceBetween(from, pw, metric);
        const affCoord = P3.affineCoordinate(from, to, pw);
        hits.push(new Hit(path.pushNew(ifs), pw, d, affCoord, bary, PickResult.PICK_TYPE_FACE, i, j));
        logger.fine(Category.SCENE, `new hit: ${hits[hits.length - 1]?.toString()}`);
      }
    }
  }
}

/**
 * Check if ray intersects triangle
 * @param {number[]} pobj - Output: intersection point in object coordinates
 * @param {number[]} fromLocal - Ray start in object coordinates
 * @param {number[]} toLocal - Ray end in object coordinates
 * @param {number[]} p1 - First vertex of triangle
 * @param {number[]} p2 - Second vertex of triangle
 * @param {number[]} p3 - Third vertex of triangle
 * @param {number[]|null} bary - Output: barycentric coordinates (can be null)
 * @returns {boolean} True if ray intersects triangle
 */
export function intersects(pobj, fromLocal, toLocal, p1, p2, p3, bary) {
  const plane = P3.planeFromPoints(null, p1, p2, p3);
  const intersection = P3.lineIntersectPlane(pobj, fromLocal, toLocal, plane);
  logger.fine(Category.SCENE, `intersects: intersection: ${intersection}`);
  // Dehomogenize triangle vertices
  const p1_3d = Pn.dehomogenize(null, p1);
  const p2_3d = Pn.dehomogenize(null, p2);
  const p3_3d = Pn.dehomogenize(null, p3);
  
  const baryOut = bary === null ? new Array(3) : bary;
  if (!Hit.convertToBary(baryOut, p1_3d, p2_3d, p3_3d, intersection)) {
    return false;
  }
  
  // Check if point is inside triangle
  if (((baryOut[0] < 0 || baryOut[0] > 1) || 
       (baryOut[1] < 0 || baryOut[1] > 1) || 
       (baryOut[2] < 0 || baryOut[2] > 1)) ||
      ((baryOut[0] + baryOut[1] + baryOut[2] - 1) *
       (baryOut[0] + baryOut[1] + baryOut[2] - 1) > Rn.TOLERANCE)) {
    return false;
  }
  
  return true;
}

/**
 * Intersect ray with edges (lines) of an IndexedLineSet
 * @param {IndexedLineSet} ils - Line set to intersect
 * @param {number} metric - Metric type
 * @param {SceneGraphPath} path - Path to the geometry
 * @param {Matrix} m - Object to world transformation matrix
 * @param {Matrix} mInv - World to object transformation matrix
 * @param {number[]} from - Ray start point in world coordinates
 * @param {number[]} to - Ray end point in world coordinates
 * @param {number} tubeRadius - Radius of tube for edge picking
 * @param {Hit[]} localHits - Array to append hits to
 */
export function intersectEdges(ils, metric, path, m, mInv, from, to, tubeRadius, localHits) {
  const fromOb = mInv.multiplyVector(from);
  const toOb = mInv.multiplyVector(to);
  
  const fromOb3 = new Array(3);
  const toOb3 = new Array(3);
  const dirOb3 = new Array(3);
  
  if (from.length > 3) {
    Pn.dehomogenize(fromOb3, fromOb);
    Pn.dehomogenize(toOb3, toOb);
    if (toOb[3] === 0) {
      dirOb3[0] = toOb3[0];
      dirOb3[1] = toOb3[1];
      dirOb3[2] = toOb3[2];
    } else {
      Rn.subtract(dirOb3, toOb3, fromOb3);
    }
  } else {
    Rn.subtract(dirOb3, toOb3, fromOb3);
  }
  
  const edges = getEdges(ils);
  const points = getPoints(ils);
  
  if (points === null || edges === null || edges.length === 0 || points.length === 0) {
    return;
  }
  
  const edge = edges[0];
  const point = points[0];
  const vec3 = point.length === 3;
  const vertex1 = new Array(3);
  const vertex2 = new Array(3);
  const vecRaw1 = vec3 ? null : new Array(4);
  const vecRaw2 = vec3 ? null : new Array(4);
  
  const MY_HITS = [];
  const edgeRadii = getEdgeRadii(ils);
  const mm = edges.length;
  
  for (let i = 0; i < mm; i++) {
    const edge = edges[i];
    let realRad = tubeRadius;
    if (edgeRadii !== null) {
      realRad = realRad * edgeRadii[i];
    }
    for (let j = 0, n = edge.length - 1; j < n; j++) {
      if (vec3) {
        const pt0 = points[edge[j]];
        const pt1 = points[edge[j + 1]];
        vertex1[0] = pt0[0];
        vertex1[1] = pt0[1];
        vertex1[2] = pt0[2];
        vertex2[0] = pt1[0];
        vertex2[1] = pt1[1];
        vertex2[2] = pt1[2];
      } else {
        const pt0 = points[edge[j]];
        const pt1 = points[edge[j + 1]];
        vecRaw1[0] = pt0[0];
        vecRaw1[1] = pt0[1];
        vecRaw1[2] = pt0[2];
        vecRaw1[3] = pt0.length > 3 ? pt0[3] : 1;
        vecRaw2[0] = pt1[0];
        vecRaw2[1] = pt1[1];
        vecRaw2[2] = pt1[2];
        vecRaw2[3] = pt1.length > 3 ? pt1[3] : 1;
        
        if (vecRaw1[3] === 0) {
          Rn.linearCombination(vecRaw1, 0.99, vecRaw1, 0.01, vecRaw2);
        } else if (vecRaw2[3] === 0) {
          Rn.linearCombination(vecRaw2, 0.99, vecRaw2, 0.01, vecRaw1);
        }
        Pn.dehomogenize(vertex1, vecRaw1);
        Pn.dehomogenize(vertex2, vecRaw2);
      }
      
      intersectCylinderPrimitive(MY_HITS, m, fromOb3, dirOb3, vertex1, vertex2, realRad);
      
      for (let k = 0; k < MY_HITS.length; k++) {
        const hitPoint = MY_HITS[k];
        const dist = Rn.euclideanNorm(Rn.subtract(null, hitPoint, from));
        const affCoord = P3.affineCoordinate(from, to, hitPoint);
        const h = new Hit(path.pushNew(ils), hitPoint, dist, affCoord, null, PickResult.PICK_TYPE_LINE, i, j);
        localHits.push(h);
      }
      MY_HITS.length = 0; // Clear array
    }
  }
}

/**
 * Intersect ray with points of a PointSet
 * @param {PointSet} ps - Point set to intersect
 * @param {number} metric - Metric type
 * @param {SceneGraphPath} path - Path to the geometry
 * @param {Matrix} m - Object to world transformation matrix
 * @param {Matrix} mInv - World to object transformation matrix
 * @param {number[]} from - Ray start point in world coordinates
 * @param {number[]} to - Ray end point in world coordinates
 * @param {number} pointRadius - Radius for point picking
 * @param {Hit[]} localHits - Array to append hits to
 */
export function intersectPoints(ps, metric, path, m, mInv, from, to, pointRadius, localHits) {
  const fromOb = mInv.multiplyVector(from);
  const toOb = mInv.multiplyVector(to);
  
  const fromOb3 = new Array(3);
  const toOb3 = new Array(3);
  const dirOb3 = new Array(3);
  
  if (from.length > 3) {
    Pn.dehomogenize(fromOb3, fromOb);
    Pn.dehomogenize(toOb3, toOb);
    if (toOb[3] === 0) {
      dirOb3[0] = toOb3[0];
      dirOb3[1] = toOb3[1];
      dirOb3[2] = toOb3[2];
    } else {
      Rn.subtract(dirOb3, toOb3, fromOb3);
    }
  } else {
    Rn.subtract(dirOb3, toOb3, fromOb3);
  }
  
  const points = getPoints(ps);
  if (points === null || points.length === 0) {
    return;
  }
  
  const point = points[0];
  const vec3 = point.length === 3;
  const vertexRaw = vec3 ? new Array(3) : new Array(4);
  const vertex = new Array(3);
  
  const MY_HITS = [];
  const pointRadii = getPointRadii(ps);
  
  for (let j = 0, n = points.length; j < n; j++) {
    if (!vec3) {
      const pt = points[j];
      vertexRaw[0] = pt[0];
      vertexRaw[1] = pt[1];
      vertexRaw[2] = pt[2];
      vertexRaw[3] = pt.length > 3 ? pt[3] : 1;
      if (vertexRaw[3] === 0) {
        continue;
      }
      Pn.dehomogenize(vertex, vertexRaw);
    } else {
      const pt = points[j];
      vertex[0] = pt[0];
      vertex[1] = pt[1];
      vertex[2] = pt[2];
    }
    
    let realRad = pointRadius;
    if (pointRadii !== null) {
      realRad = pointRadius * pointRadii[j];
    }
    
    intersectSphere(MY_HITS, vertex, fromOb3, dirOb3, realRad);
    
    for (let i = 0; i < MY_HITS.length; i++) {
      let hitPoint = MY_HITS[i];
      hitPoint = m.multiplyVector(hitPoint);
      const dist = Rn.euclideanNorm(Rn.subtract(null, hitPoint, from));
      const affCoord = P3.affineCoordinate(from, to, hitPoint);
      const h = new Hit(path.pushNew(ps), hitPoint, dist, affCoord, null, PickResult.PICK_TYPE_POINT, j, -1);
      localHits.push(h);
    }
    MY_HITS.length = 0; // Clear array
  }
}

/**
 * Intersect ray with a Sphere primitive
 * @param {Sphere} sphere - Sphere to intersect
 * @param {number} metric - Metric type
 * @param {SceneGraphPath} path - Path to the geometry
 * @param {Matrix} m - Object to world transformation matrix
 * @param {Matrix} mInv - World to object transformation matrix
 * @param {number[]} from - Ray start point in world coordinates
 * @param {number[]} to - Ray end point in world coordinates
 * @param {Hit[]} localHits - Array to append hits to
 */
export function intersectSphere(sphere, metric, path, m, mInv, from, to, localHits) {
  const fromOb = mInv.multiplyVector(from);
  const toOb = mInv.multiplyVector(to);
  
  const fromOb3 = new Array(3);
  const toOb3 = new Array(3);
  const dirOb3 = new Array(3);
  
  if (from.length > 3) {
    Pn.dehomogenize(fromOb3, fromOb);
    Pn.dehomogenize(toOb3, toOb);
    if (toOb[3] === 0) {
      dirOb3[0] = toOb3[0];
      dirOb3[1] = toOb3[1];
      dirOb3[2] = toOb3[2];
    } else {
      Rn.subtract(dirOb3, toOb3, fromOb3);
    }
  } else {
    Rn.subtract(dirOb3, toOb3, fromOb3);
  }
  
  intersectSpherePrimitive(SPHERE_HIT_LIST, null, fromOb3, dirOb3, 1);
  
  for (let i = 0; i < SPHERE_HIT_LIST.length; i++) {
    let hitPoint = SPHERE_HIT_LIST[i];
    hitPoint = m.multiplyVector(hitPoint);
    const dist = Rn.euclideanNorm(Rn.subtract(null, hitPoint, from));
    const affCoord = P3.affineCoordinate(from, to, hitPoint);
    const h = new Hit(path.pushNew(sphere), hitPoint, dist, affCoord, null, PickResult.PICK_TYPE_OBJECT, -1, -1);
    localHits.push(h);
  }
  SPHERE_HIT_LIST.length = 0; // Clear array
}

/**
 * Intersect ray with a Cylinder primitive
 * @param {Cylinder} cylinder - Cylinder to intersect
 * @param {number} metric - Metric type
 * @param {SceneGraphPath} path - Path to the geometry
 * @param {Matrix} m - Object to world transformation matrix
 * @param {Matrix} mInv - World to object transformation matrix
 * @param {number[]} from - Ray start point in world coordinates
 * @param {number[]} to - Ray end point in world coordinates
 * @param {Hit[]} localHits - Array to append hits to
 */
export function intersectCylinder(cylinder, metric, path, m, mInv, from, to, localHits) {
  const fromOb = mInv.multiplyVector(from);
  const toOb = mInv.multiplyVector(to);
  
  const fromOb3 = new Array(3);
  const toOb3 = new Array(3);
  const dirOb3 = new Array(3);
  
  if (from.length > 3) {
    Pn.dehomogenize(fromOb3, fromOb);
    Pn.dehomogenize(toOb3, toOb);
    if (toOb[3] === 0) {
      dirOb3[0] = toOb3[0];
      dirOb3[1] = toOb3[1];
      dirOb3[2] = toOb3[2];
    } else {
      Rn.subtract(dirOb3, toOb3, fromOb3);
    }
  } else {
    Rn.subtract(dirOb3, toOb3, fromOb3);
  }
  
  intersectCylinderPrimitive(CYLINDER_HIT_LIST, m, fromOb3, dirOb3, [0, 0, 1], [0, 0, -1], 1);
  const tmp = new Array(from.length);
  
  for (let i = 0; i < CYLINDER_HIT_LIST.length; i++) {
    const hitPoint = CYLINDER_HIT_LIST[i];
    const affCoord = P3.affineCoordinate(from, to, hitPoint);
    const dist = Rn.euclideanNorm(Rn.subtract(tmp, hitPoint, from));
    const h = new Hit(path.pushNew(cylinder), hitPoint, dist, affCoord, null, PickResult.PICK_TYPE_OBJECT, -1, -1);
    localHits.push(h);
  }
  CYLINDER_HIT_LIST.length = 0; // Clear array
}

/**
 * Intersect ray with sphere primitive (helper function)
 * @param {number[][]} hits - Array to append hits to
 * @param {number[]|null} vertex - Sphere center in object coordinates (null for origin)
 * @param {number[]} f - Ray start in local coordinates
 * @param {number[]} dir - Ray direction in local coordinates (MUST BE NORMALIZED)
 * @param {number} r - Sphere radius in local coordinates
 */
function intersectSpherePrimitive(hits, vertex, f, dir, r) {
  let from = f;
  const dirNorm = Rn.normalize(null, dir);
  if (vertex !== null) {
    from = Rn.subtract(null, from, vertex);
  }
  
  const b = 2 * Rn.innerProduct(dirNorm, from);
  const c = Rn.euclideanNormSquared(from) - r * r;
  const dis = Math.pow(b, 2) - 4 * c;
  
  if (dis >= 0) {
    const sqrtDis = Math.sqrt(dis);
    let t = (-b - sqrtDis) / 2;
    for (let i = 0; i < 2; i++) {
      t += i * sqrtDis;
      if (t >= 0) {
        const hitPointOb3 = new Array(3);
        Rn.times(hitPointOb3, t, dirNorm);
        Rn.add(hitPointOb3, hitPointOb3, from); // from+t*dir
        if (vertex !== null) {
          Rn.add(hitPointOb3, hitPointOb3, vertex);
        }
        const hitPoint = new Array(4);
        Pn.homogenize(hitPoint, hitPointOb3);
        hits.push(hitPoint);
      }
    }
  }
}

/**
 * Intersect ray with cylinder primitive (helper function)
 * @param {number[][]} hits - Array to append hits to
 * @param {Matrix} m - Transformation matrix
 * @param {number[]} f - Ray start in local coordinates
 * @param {number[]} d - Ray direction in local coordinates (MUST BE NORMALIZED)
 * @param {number[]} v1 - Upper point of cylinder axis
 * @param {number[]} v2 - Lower point of cylinder axis
 * @param {number} r - Cylinder radius in local coordinates
 */
function intersectCylinderPrimitive(hits, m, f, d, v1, v2, r) {
  const from = f;
  const dir = Rn.normalize(null, d);
  const dir_cyl = Rn.normalize(null, Rn.subtract(null, v2, v1));
  
  const dir_cyl_x_dir = Rn.crossProduct(null, dir_cyl, dir);
  const from_min_v1 = Rn.subtract(null, from, v1);
  const lambda = Rn.innerProduct(dir_cyl_x_dir, Rn.crossProduct(null, from_min_v1, dir_cyl)) /
                 Rn.euclideanNormSquared(dir_cyl_x_dir);
  const nearest = Rn.add(null, from, Rn.times(null, lambda, dir));
  const dist = Math.abs(Rn.innerProduct(dir_cyl_x_dir, from_min_v1)) /
               Rn.euclideanNorm(dir_cyl_x_dir);
  
  if (dist <= r) {
    let angle = Math.abs(Rn.euclideanAngle(dir, dir_cyl));
    if (Math.cos(angle) !== 0) {
      if (angle > Math.PI) {
        angle = 2 * Math.PI - angle;
      }
      if (angle > Math.PI / 2) {
        angle = Math.PI - angle;
      }
      const factor = Math.sqrt(Math.pow(r, 2) - Math.pow(dist, 2)) /
                     Math.cos(Math.PI / 2 - angle);
      const maxDist = Math.sqrt(Math.pow(Rn.euclideanDistance(v1, v2), 2) + Math.pow(r, 2));
      
      // First intersection point
      const hitPointOb3_1 = new Array(3);
      Rn.times(hitPointOb3_1, -factor, dir);
      Rn.add(hitPointOb3_1, hitPointOb3_1, nearest);
      if (Rn.euclideanDistance(hitPointOb3_1, v1) < maxDist &&
          Rn.euclideanDistance(hitPointOb3_1, v2) < maxDist) {
        const hitPoint1 = new Array(4);
        Pn.homogenize(hitPoint1, hitPointOb3_1);
        const transformed1 = m.multiplyVector(hitPoint1);
        hits.push(transformed1);
      }
      
      // Second intersection point
      const hitPointOb3_2 = new Array(3);
      Rn.times(hitPointOb3_2, factor, dir);
      Rn.add(hitPointOb3_2, hitPointOb3_2, nearest);
      if (Rn.euclideanDistance(hitPointOb3_2, v1) < maxDist &&
          Rn.euclideanDistance(hitPointOb3_2, v2) < maxDist) {
        const hitPoint2 = new Array(4);
        Pn.homogenize(hitPoint2, hitPointOb3_2);
        const transformed2 = m.multiplyVector(hitPoint2);
        hits.push(transformed2);
      }
    }
  }
}

/**
 * Get points from a PointSet or IndexedLineSet
 * @private
 * @param {PointSet} ps - Point set
 * @returns {number[][]|null} Array of point coordinates or null
 */
function getPoints(ps) {
  const dl = ps.getVertexAttribute(GeometryAttribute.COORDINATES);
  if (dl === null) {
    return null;
  }
  return fromDataList(dl);
}

/**
 * Get radii from a PointSet (vertex attribute)
 * @private
 * @param {PointSet} ps - Point set
 * @returns {number[]|null} Array of radii or null
 */
function getPointRadii(ps) {
  const dl = ps.getVertexAttribute(GeometryAttribute.RELATIVE_RADII);
  if (dl === null) {
    return null;
  }
  const radiiList = fromDataList(dl);
  // If it's a nested array, flatten first level
  if (radiiList && radiiList.length > 0 && Array.isArray(radiiList[0])) {
    return radiiList.map(r => r[0]);
  }
  return radiiList;
}

/**
 * Get radii from an IndexedLineSet (edge attribute)
 * @private
 * @param {IndexedLineSet} ls - Line set
 * @returns {number[]|null} Array of radii or null
 */
function getEdgeRadii(ls) {
  const dl = ls.getEdgeAttribute(GeometryAttribute.RELATIVE_RADII);
  if (dl === null) {
    return null;
  }
  const radiiList = fromDataList(dl);
  // If it's a nested array, flatten first level
  if (radiiList && radiiList.length > 0 && Array.isArray(radiiList[0])) {
    return radiiList.map(r => r[0]);
  }
  return radiiList;
}

/**
 * Get edges from an IndexedLineSet
 * @private
 * @param {IndexedLineSet} ils - Line set
 * @returns {number[][]|null} Array of edge indices or null
 */
function getEdges(ils) {
  const dl = ils.getEdgeAttribute(GeometryAttribute.INDICES);
  if (dl === null) {
    return null;
  }
  return fromDataList(dl);
}

/**
 * Get faces from an IndexedFaceSet
 * @private
 * @param {IndexedFaceSet} ifs - Face set
 * @returns {number[][]|null} Array of face indices or null
 */
function getFaces(ifs) {
  const dl = ifs.getFaceAttribute(GeometryAttribute.INDICES);
  if (dl === null) {
    return null;
  }
  return fromDataList(dl);
}

