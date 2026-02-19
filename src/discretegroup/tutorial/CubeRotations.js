/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { IndexedFaceSetFactory } from '../../core/geometry/IndexedFaceSetFactory.js';
import { Matrix } from '../../core/math/Matrix.js';
import * as P3 from '../../core/math/P3.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import Color from '../../core/util/Color.js';
import { SceneGraphComponent } from '../../core/scene/SceneGraphComponent.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { DiscreteGroupSceneGraphRepresentation } from '../core/DiscreteGroupSceneGraphRepresentation.js';
import { TriangleGroup } from '../groups/TriangleGroup.js';

export function createCubeRotationsExample() {
  const world = SceneGraphUtility.createFullSceneGraphComponent('world');
  const wapp = world.getAppearance();
  wapp.setAttribute('lineShader.diffuseColor', Color.WHITE);
  wapp.setAttribute('pointShader.diffuseColor', Color.WHITE);
  wapp.setAttribute('lineShader.tubeRadius', 0.01);
  wapp.setAttribute('pointShader.pointRadius', 0.015);
  wapp.setAttribute(CommonAttributes.VERTEX_DRAW, true);

  const cubeRot = TriangleGroup.instanceOfGroup('234');
  const dgsgr = new DiscreteGroupSceneGraphRepresentation(cubeRot);
  const pts = cubeRot.getTriangle().map((p) => p.slice());
  Pn.setToLength(pts[0], pts[0], 1.414, 0);
  Pn.setToLength(pts[1], pts[1], 1.731, 0);

  const pts4 = [pts[0], pts[1], pts[2], [0, 0, 0, 1]];
  Rn.average(pts4[3], pts);
  Pn.setToLength(pts4[3], pts4[3], 1.5, Pn.EUCLIDEAN);

  const ifsf = new IndexedFaceSetFactory();
  ifsf.setVertexCount(4);
  ifsf.setVertexCoordinates(pts4);
  ifsf.setFaceCount(3);
  ifsf.setFaceIndices([[0, 1, 3], [1, 2, 3], [2, 0, 3]]);
  ifsf.setGenerateEdgesFromFaces(true);
  ifsf.setGenerateFaceNormals(true);
  ifsf.update();

  const threeTriangles = SceneGraphUtility.createFullSceneGraphComponent('3');
  threeTriangles.setGeometry(ifsf.getIndexedFaceSet());

  const m = new Matrix(P3.makeRotationMatrix(null, pts4[0], pts4[2], Math.PI, Pn.EUCLIDEAN));
  const dom = SceneGraphUtility.createFullSceneGraphComponent('fd');
  const dom2 = SceneGraphUtility.createFullSceneGraphComponent('fd2');
  dom.addChild(dom2);
  dom2.addChild(threeTriangles);
  dom2.getAppearance().setAttribute('polygonShader.diffuseColor', Color.RED);
  dom.getAppearance().setAttribute('polygonShader.diffuseColor', Color.BLUE);
  m.assignTo(dom2);
  dom.addChild(threeTriangles);

  dgsgr.setWorldNode(dom);
  dgsgr.update();
  world.addChild(dgsgr.getRepresentationRoot());

  return {
    group: cubeRot,
    representation: dgsgr,
    root: world,
  };
}

export function projectPointOntoPlane(result, point, plane) {
  const out = result ?? new Array(4);
  const ip = -Rn.innerProduct(point, plane);
  const nv = plane.slice();
  nv[3] = 0.0;
  Rn.add(out, point, Rn.times(null, ip, nv));
  return out;
}

