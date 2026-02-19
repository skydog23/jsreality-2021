/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { IndexedFaceSetUtility } from './IndexedFaceSetUtility.js';
import { IndexedLineSetUtility } from './IndexedLineSetUtility.js';
import { IndexedLineSetFactory } from './IndexedLineSetFactory.js';
import { PointSetFactory } from './PointSetFactory.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { MatrixBuilder } from '../math/MatrixBuilder.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';

export class SphericalTriangleFactory {
  static defaultVerts = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  static zaxis = [0, 0, 1];
  static baseCircle = IndexedLineSetUtility.circle(100);
  static baseDisk = IndexedFaceSetUtility.constructPolygon(
    SphericalTriangleFactory.baseCircle.getVertexAttribute(GeometryAttribute.COORDINATES).toNestedArray(),
  );

  verts = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  sides = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  edgeverts = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0]];
  vertsChanged = true;
  isDual = true;

  all = new SceneGraphComponent('triangle');
  sSGC = new SceneGraphComponent('sides');
  sidesSGC = [new SceneGraphComponent('s0'), new SceneGraphComponent('s1'), new SceneGraphComponent('s2')];
  vertSGC = new SceneGraphComponent('verts');
  edgesSGC = new SceneGraphComponent('edges');
  verticesPSF = new PointSetFactory();
  edgesIFSF = new IndexedLineSetFactory();

  constructor() {
    for (let i = 0; i < 3; i += 1) {
      this.sidesSGC[i].setGeometry(SphericalTriangleFactory.baseDisk);
      this.sSGC.addChild(this.sidesSGC[i]);
    }
    this.all.addChildren(this.sSGC, this.vertSGC, this.edgesSGC);

    this.verticesPSF.setVertexCount(3);
    this.verticesPSF.setVertexCoordinates(this.verts);
    this.verticesPSF.update();
    this.vertSGC.setGeometry(this.verticesPSF.getPointSet());

    this.edgesIFSF.setVertexCount(4);
    this.edgesIFSF.setVertexCoordinates(this.edgeverts);
    this.edgesIFSF.setEdgeCount(3);
    this.edgesIFSF.setEdgeIndices([[0, 3], [1, 3], [2, 3]]);
    this.edgesIFSF.update();
    this.edgesSGC.setGeometry(this.edgesIFSF.getIndexedLineSet());
  }

  getSceneGraphComponent() { return this.all; }
  getVerticesSGC() { return this.vertSGC; }
  getSides() { return this.sides; }
  getVerts() { return this.verts; }

  setVerts(verts) {
    this.verts = (verts[0]?.length === 3) ? verts : Pn.dehomogenize([[], [], []], verts);
    this.vertsChanged = true;
  }

  setSides(sides) { this.sides = sides; }
  isDualTriangle() { return this.isDual; }

  setDual(showDual) {
    this.isDual = !!showDual;
    this.all.setName(this.isDual ? 'dualTriangle' : 'triangle');
  }

  reset() {
    this.verts = SphericalTriangleFactory.defaultVerts.map((v) => v.slice());
    this.vertsChanged = true;
    this.update();
  }

  update() {
    if (!this.vertsChanged) return;
    this.verticesPSF.setVertexCoordinates(this.verts);
    this.verticesPSF.update();
    for (let i = 0; i < 3; i += 1) this.edgeverts[i] = this.verts[i].slice();
    this.edgesIFSF.setVertexCoordinates(this.edgeverts);
    this.edgesIFSF.update();
    for (let i = 0; i < 3; i += 1) {
      Rn.crossProduct(this.sides[i], this.verts[(i + 1) % 3], this.verts[(i + 2) % 3]);
      Rn.normalize(this.sides[i], this.sides[i]);
      MatrixBuilder.euclidean().rotateFromTo(SphericalTriangleFactory.zaxis, this.sides[i]).assignTo(this.sidesSGC[i]);
    }
    this.vertsChanged = false;
  }

  static dualPlane(sgc, point) {
    const node = sgc ?? new SceneGraphComponent('dualPlane');
    MatrixBuilder.euclidean().rotateFromTo(SphericalTriangleFactory.zaxis, point).assignTo(node);
    node.setGeometry(SphericalTriangleFactory.baseDisk);
    return node;
  }
}

