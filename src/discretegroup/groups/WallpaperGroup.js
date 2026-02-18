/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import * as P3 from '../../core/math/P3.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import { IndexedFaceSetUtility } from '../../core/geometry/IndexedFaceSetUtility.js';
import { GeometryAttribute } from '../../core/scene/GeometryAttribute.js';
import { toDataList } from '../../core/scene/data/DataUtility.js';
import { DiscreteGroupElement } from '../core/DiscreteGroupElement.js';
import { DiscreteGroupSimpleConstraint } from '../core/DiscreteGroupSimpleConstraint.js';
import { DiscreteGroupUtility } from '../core/DiscreteGroupUtility.js';
import { EuclideanGroup } from './EuclideanGroup.js';

const WW = Math.sqrt(3.0) / 2.0;
const W2 = 0.5 / (2 * WW);

const SQUARE = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]];
const TRIANGLE_244 = [[1, 0, 0], [0, 1, 0], [0, 0, 0]];
const TRIANGLE_236 = [[1, 0, 0], [0, 2 * WW, 0.0], [0, 0, 0]];
const TRIANGLE_333 = [[0.5, 0, 0], [0, WW, 0.0], [-0.5, 0, 0]];
const TRIANGLE_333X2 = [[0.5, 0, 0], [0, WW, 0.0], [-0.5, 0, 0], [0, -WW, 0]];
const TRIANGLE_114 = [[1, 0, 0], [0, (2 * WW) / 3.0, 0], [-1, 0.0, 0.0]];

const TC_SQUARE = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]];
const TC_TRIANGLE_244 = [[1, 0, 0], [0, 1, 0], [0, 0, 0]];
const TC_TRIANGLE_236 = [[0.5 + W2, 0, 0], [0.5 - W2, 1, 0.0], [0.5 - W2, 0, 0]];
const TC_TRIANGLE_333 = [[1, 0, 0], [0.5, WW, 0.0], [0, 0, 0]];
const TC_TRIANGLE_333X2 = [
  [0.5 + (1.0 / (Math.sqrt(3) * 2)), 0.5, 0],
  [0.5, 1, 0.0],
  [0.5 - (1.0 / (Math.sqrt(3) * 2)), 0.5, 0],
  [0.5, 0, 0]
];
const TC_TRIANGLE_114 = [[1, 0, 0], [0.5, WW / 3.0, 0], [0, 0.0, 0.0]];

export class WallpaperGroup extends EuclideanGroup {
  static oldNames = ['P', 'P2', 'P3', 'P4', 'P6', 'PG', 'PM', 'PMM', 'PMG', 'PGG', 'CM', 'CMM', 'P31M', 'P3M1', 'P4G', 'P4M', 'P6M'];
  static names = ['O', '2222', '333', '244', '236', 'XX', '**', '*2222', '22*', '22X', '*X', '2*22', '3*3', '*333', '4*2', '*244', '*236', 'c12', 'd24'];
  static nameTable = new Map(WallpaperGroup.names.map((name, i) => [name, i]));

  constructor() {
    super();
    this.dimension = 2;
    this.changeOfBasisParameters = [0, 1, 0, 1];
  }

  static instanceOfGroup(nameOrIndex) {
    const index = typeof nameOrIndex === 'number' ? nameOrIndex : WallpaperGroup.nameTable.get(nameOrIndex);
    if (index == null || index < 0 || index >= WallpaperGroup.names.length) return null;

    const mkNamed = (count) => {
      const gens = new Array(count);
      for (let i = 0; i < count; i += 1) {
        gens[i] = new DiscreteGroupElement();
        gens[i].setWord(DiscreteGroupUtility.genNames[i]);
      }
      return gens;
    };
    const setRotation = (g, centerX, centerY, angle) => {
      const p1 = [centerX, centerY, 0, 1];
      const p2 = [centerX, centerY, 1, 1];
      g.setArray(P3.makeRotationMatrix(null, p1, p2, angle, Pn.EUCLIDEAN));
    };
    const setReflection = (g, plane) => {
      g.setArray(P3.makeReflectionMatrix(null, plane, Pn.EUCLIDEAN));
    };
    const addInverses = (gens, n) => {
      for (let i = 0; i < n; i += 1) gens[n + i] = gens[i].getInverse();
    };

    let generators = null;
    let allowedChangeOfBasis = 0;
    let x0 = 0;
    let y0 = 0;
    let plane = null;
    let points = null;

    switch (index) {
      case 0: { // O
        generators = mkNamed(4);
        MatrixBuilder.euclidean().translate(1.0, 0.0, 0.0).assignTo(generators[0].getArray());
        MatrixBuilder.euclidean().translate(0.0, 1.0, 0.0).assignTo(generators[1].getArray());
        generators[2] = generators[0].getInverse();
        generators[3] = generators[1].getInverse();
        allowedChangeOfBasis = EuclideanGroup.COB_SHEAR | EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 1: { // 2222
        generators = mkNamed(4);
        setRotation(generators[0], 0.0, 0.0, Math.PI);
        setRotation(generators[1], 0.5, 0.0, Math.PI);
        setRotation(generators[2], 0.0, 0.5, Math.PI);
        setRotation(generators[3], 0.5, 0.5, Math.PI);
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE | EuclideanGroup.COB_SHEAR;
        break;
      }
      case 2: { // 333
        x0 = 0.5;
        y0 = Math.sqrt(3.0) / 2.0;
        generators = mkNamed(6);
        setRotation(generators[0], x0, 0.0, (2 * Math.PI) / 3.0);
        setRotation(generators[1], 0.0, y0, (2 * Math.PI) / 3.0);
        setRotation(generators[2], -x0, 0.0, (2 * Math.PI) / 3.0);
        addInverses(generators, 3);
        allowedChangeOfBasis = EuclideanGroup.COB_ROTATE | EuclideanGroup.COB_SCALE;
        break;
      }
      case 3: { // 244
        generators = mkNamed(6);
        setRotation(generators[0], 0.0, 0.0, Math.PI / 2.0);
        setRotation(generators[1], 0.5, 0.5, Math.PI);
        setRotation(generators[2], 0.0, 1.0, Math.PI / 2.0);
        addInverses(generators, 3);
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 4: { // 236
        x0 = 0.5;
        y0 = Math.sqrt(3.0) / 2.0;
        generators = mkNamed(6);
        setRotation(generators[0], 0.0, 0.0, Math.PI);
        setRotation(generators[1], x0, 0.0, (2 * Math.PI) / 3.0);
        setRotation(generators[2], 0.0, y0, Math.PI / 3.0);
        addInverses(generators, 3);
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 5: { // XX
        generators = mkNamed(4);
        MatrixBuilder.euclidean().translate(1.0, 0.0, 0.0).assignTo(generators[0].getArray());
        MatrixBuilder.euclidean().reflect([1.0, 0.0, 0.0, 0.0]).translate(0.0, 1.0, 0.0).assignTo(generators[1].getArray());
        generators[2] = generators[0].getInverse();
        generators[3] = generators[1].getInverse();
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE | EuclideanGroup.COB_YSCALE;
        break;
      }
      case 6: { // **
        generators = mkNamed(4);
        MatrixBuilder.euclidean().translate(0.0, 1.0, 0.0).assignTo(generators[0].getArray());
        setReflection(generators[1], [1.0, 0.0, 0.0, 0.0]);
        setReflection(generators[2], [1.0, 0.0, 0.0, -1.0]);
        generators[3] = generators[0].getInverse();
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE | EuclideanGroup.COB_YSCALE;
        break;
      }
      case 7: { // *2222
        generators = mkNamed(4);
        setReflection(generators[0], [1.0, 0.0, 0.0, -1.0]);
        setReflection(generators[1], [1.0, 0.0, 0.0, 0.0]);
        setReflection(generators[2], [0.0, 1.0, 0.0, -1.0]);
        setReflection(generators[3], [0.0, 1.0, 0.0, 0.0]);
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE | EuclideanGroup.COB_YSCALE;
        break;
      }
      case 8: { // 22*
        generators = mkNamed(3);
        setReflection(generators[0], [1.0, 0.0, 0.0, 0.0]);
        setRotation(generators[1], 0.5, 0.0, Math.PI);
        setRotation(generators[2], 0.5, 1.0, Math.PI);
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE | EuclideanGroup.COB_YSCALE;
        break;
      }
      case 9: { // 22X
        generators = mkNamed(4);
        MatrixBuilder.euclidean().reflect([1.0, 0.0, 0.0, 0.0]).translate(0.0, 1.0, 0.0).assignTo(generators[0].getArray());
        MatrixBuilder.euclidean().reflect([0.0, 1.0, 0.0, -0.5]).translate(1.0, 0.0, 0.0).assignTo(generators[1].getArray());
        generators[2] = generators[0].getInverse();
        generators[3] = generators[1].getInverse();
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE | EuclideanGroup.COB_YSCALE;
        break;
      }
      case 10: { // *X
        generators = mkNamed(3);
        MatrixBuilder.euclidean().reflect([1.0, 0.0, 0.0, -0.5]).translate(0.0, 1.0, 0.0).assignTo(generators[0].getArray());
        setReflection(generators[1], [1.0, 0.0, 0.0, 0.0]);
        generators[2] = generators[0].getInverse();
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_YSCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 11: { // 2*22
        generators = mkNamed(3);
        MatrixBuilder.euclidean().reflect([1.0, 0.0, 0.0, 0.0]).assignTo(generators[0].getArray());
        MatrixBuilder.euclidean().reflect([0.0, 1.0, 0.0, 0.0]).assignTo(generators[1].getArray());
        setRotation(generators[2], 0.5, 0.5, Math.PI);
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_YSCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 12: { // 3*3
        x0 = 1.0;
        y0 = Math.sqrt(3.0);
        generators = mkNamed(3);
        points = [[x0, 0.0, 0.0, 1.0], [0.0, y0, 0.0, 1.0], [0.0, 0.0, 1.0, 0.0]];
        plane = P3.planeFromPoints(null, points[0], points[1], points[2]);
        setReflection(generators[0], plane);
        setRotation(generators[1], 0.0, y0 / 3.0, (2 * Math.PI) / 3.0);
        generators[2] = generators[1].getInverse();
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 13: { // *333
        x0 = 0.5;
        y0 = Math.sqrt(3.0) / 2.0;
        generators = mkNamed(3);
        points = [[x0, 0.0, 0.0, 1.0], [0.0, y0, 0.0, 1.0], [-x0, 0.0, 0.0, 1.0], [0.0, 0.0, 1.0, 0.0]];
        plane = P3.planeFromPoints(null, points[0], points[1], points[3]);
        setReflection(generators[0], plane);
        plane = P3.planeFromPoints(null, points[1], points[2], points[3]);
        setReflection(generators[1], plane);
        plane = P3.planeFromPoints(null, points[2], points[0], points[3]);
        setReflection(generators[2], plane);
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 14: { // 4*2
        generators = mkNamed(3);
        generators[0].setArray(P3.makeRotationMatrixZ(null, Math.PI / 2.0));
        setReflection(generators[1], [1.0, 1.0, 0.0, -1.0]);
        generators[2] = generators[0].getInverse();
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 15: { // *244
        generators = mkNamed(3);
        const verts = [[0.0, 0.0, 0.0, 1.0], [1.0, 0.0, 0.0, 1.0], [0.0, 1.0, 0.0, 1.0], [0.0, 0.0, 1.0, 0.0]];
        plane = P3.planeFromPoints(null, verts[0], verts[1], verts[3]);
        setReflection(generators[0], plane);
        plane = P3.planeFromPoints(null, verts[1], verts[2], verts[3]);
        setReflection(generators[1], plane);
        plane = P3.planeFromPoints(null, verts[2], verts[0], verts[3]);
        setReflection(generators[2], plane);
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 16: { // *236
        x0 = 1.0;
        y0 = Math.sqrt(3.0);
        generators = mkNamed(3);
        const verts = [[0.0, 0.0, 0.0, 1.0], [x0, 0.0, 0.0, 1.0], [0.0, y0, 0.0, 1.0], [0.0, 0.0, 1.0, 0.0]];
        plane = P3.planeFromPoints(null, verts[0], verts[1], verts[3]);
        setReflection(generators[0], plane);
        plane = P3.planeFromPoints(null, verts[1], verts[2], verts[3]);
        setReflection(generators[1], plane);
        plane = P3.planeFromPoints(null, verts[2], verts[0], verts[3]);
        setReflection(generators[2], plane);
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 17: { // c12
        generators = mkNamed(1);
        generators[0].setArray(P3.makeRotationMatrixZ(null, Math.PI / 6.0));
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      case 18: { // d24
        x0 = Math.cos(Math.PI / 12.0);
        y0 = Math.sin(Math.PI / 12.0);
        generators = mkNamed(2);
        setReflection(generators[0], [0.0, 1.0, 0.0, 0.0]);
        points = [[0.0, 0.0, 0.0, 1.0], [x0, 0.0, 0.0, 1.0], [x0, y0, 0.0, 1.0], [0.0, 0.0, 1.0, 0.0]];
        plane = P3.planeFromPoints(null, points[2], points[0], points[3]);
        setReflection(generators[1], plane);
        allowedChangeOfBasis = EuclideanGroup.COB_SCALE | EuclideanGroup.COB_ROTATE;
        break;
      }
      default:
        return null;
    }

    const group = new WallpaperGroup();
    group.setGenerators(generators);
    group.setAllowedChangeOfBasis(allowedChangeOfBasis);
    group.setName(WallpaperGroup.names[index]);
    group.setConstraint(new DiscreteGroupSimpleConstraint(50));
    group.update();
    return group;
  }

  static storeEdgeIds(dg, ifs) {
    const coordsDL = ifs.getVertexAttribute(GeometryAttribute.COORDINATES);
    if (coordsDL == null) return;
    const vertices = coordsDL.toNestedArray();
    const edgeIds = WallpaperGroup.edgeIdentifications(dg, vertices);
    const pairs = WallpaperGroup.getPairedEdges(edgeIds);

    const open = new Array(edgeIds.length).fill(false);
    for (let i = 0; i < edgeIds.length; i += 1) {
      open[i] = pairs.has(i);
    }

    ifs.setGeometryAttribute('edgePairs', pairs);
    ifs.setGeometryAttribute('open', open);

    const edgeMats = new Array(edgeIds.length);
    const edgeWords = new Array(edgeIds.length);
    for (let i = 0; i < edgeIds.length; i += 1) {
      edgeMats[i] = edgeIds[i].getArray().slice();
      edgeWords[i] = edgeIds[i].getWord();
    }
    ifs.setVertexAttribute('edgeIds', toDataList(edgeMats, 16));
    ifs.setVertexAttribute('edgeIdsWords', toDataList(edgeWords, null, 'string'));
  }

  static edgeIdentifications(dg, polygon) {
    const constraint = new DiscreteGroupSimpleConstraint(30);
    const list = DiscreteGroupUtility.generateElements(dg, constraint);
    const images = new Array(list.length);
    const n = polygon.length;
    const edgeIds = new Array(n).fill(-1);

    for (let i = 1; i < list.length; i += 1) {
      images[i] = Rn.matrixTimesVector(null, list[i].getArray(), polygon);
    }

    const tol = 1e-3;
    for (let i = 0; i < n; i += 1) {
      for (let j = 1; j < list.length; j += 1) {
        for (let k = 0; k < n; k += 1) {
          const d1 = Rn.euclideanDistance(polygon[k], images[j][i]);
          const d2 = Rn.euclideanDistance(polygon[(k + 1) % n], images[j][(i + 1) % n]);
          const d3 = Rn.euclideanDistance(polygon[(k + n - 1) % n], images[j][(i + 1) % n]);
          if (d1 < tol && (d2 < tol || d3 < tol)) {
            edgeIds[i] = j;
            break;
          }
        }
        if (edgeIds[i] !== -1) break;
      }
    }

    const mats = new Array(n);
    for (let i = 0; i < n; i += 1) {
      if (edgeIds[i] < 0) {
        const plane = P3.planeFromPoints(
          null,
          polygon[i],
          polygon[(i + 1) % n],
          Rn.add(null, polygon[i], Pn.zDirectionP3)
        );
        const refl = new DiscreteGroupElement();
        refl.setWord('X');
        refl.setArray(P3.makeReflectionMatrix(null, plane, Pn.EUCLIDEAN));
        mats[i] = refl;
      } else {
        mats[i] = list[edgeIds[i]].getInverse();
      }
    }
    return mats;
  }

  static getPairedEdges(matList) {
    const pairs = new Map();
    for (let i = 0; i < matList.length; i += 1) {
      const mat1 = matList[i].getArray();
      for (let j = 0; j < matList.length; j += 1) {
        if (pairs.get(j) === i) continue;
        const mat2 = matList[j].getArray();
        if (Rn.isIdentityMatrix(Rn.times(null, mat1, mat2), 1e-7)) {
          pairs.set(i, j);
        }
      }
    }
    return pairs;
  }

  getDefaultFundamentalRegion() {
    const groupID = WallpaperGroup.nameTable.get(this.name);
    if (groupID == null) return null;

    let vertices = null;
    let texCoords = null;
    switch (groupID) {
      // square
      case 0:   // O
      case 6:   // **
      case 5:   // XX
      case 7:   // *2222
      case 8:   // 22*
      case 9:   // 22X
      case 10:  // *X
        vertices = SQUARE;
        texCoords = TC_SQUARE;
        break;

      // 45-45-90 triangle
      case 1:   // 2222
      case 15:  // *244
      case 14:  // 4*2
      case 11:  // 2*22
      case 3:   // 244
        vertices = TRIANGLE_244;
        texCoords = TC_TRIANGLE_244;
        break;

      // 60-60-60 triangle
      case 13:  // *333
      case 4:   // 236
        vertices = TRIANGLE_333;
        texCoords = TC_TRIANGLE_333;
        break;

      // two equilateral triangles glued on horizontal edge
      case 2:   // 333
        vertices = TRIANGLE_333X2;
        texCoords = TC_TRIANGLE_333X2;
        break;

      // one-third of the *333 triangle
      case 12:  // 3*3
        vertices = TRIANGLE_114;
        texCoords = TC_TRIANGLE_114;
        break;

      // 30-60-90 triangle
      case 16:  // *236
        vertices = TRIANGLE_236;
        texCoords = TC_TRIANGLE_236;
        break;

      case 17:  // c12
        vertices = [[0, 0, 0], [1, -Math.tan(Math.PI / 12), 0], [1, Math.tan(Math.PI / 12), 0]];
        texCoords = [[0, Math.tan(Math.PI / 12), 0], [1, 0, 0], [1, 2 * Math.tan(Math.PI / 12), 0]];
        break;

      case 18:  // d24
        vertices = [[1, 0, 0], [1, Math.tan(Math.PI / 12), 0], [0, 0, 0]];
        texCoords = vertices;
        break;

      default:
        return null;
    }

    const avg = Rn.average(null, vertices);
    this.setCenterPoint([avg[0], avg[1], avg[2], 1.0]);

    const ifs = IndexedFaceSetUtility.constructPolygon(vertices);
    WallpaperGroup.storeEdgeIds(this, ifs);
    if (texCoords != null) {
      ifs.setVertexAttribute(GeometryAttribute.TEXTURE_COORDINATES, toDataList(texCoords, 3));
    }
    return ifs;
  }
}

