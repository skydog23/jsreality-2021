/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// JavaScript translation of:
//   ProjectiveGeometry/src/charlesgunn/jreality/geometry/projective/LinePencilFactory.java

import { GeometryUtility } from '../GeometryUtility.js';
import { IndexedLineSetFactory } from '../IndexedLineSetFactory.js';
import * as P3 from '../../math/P3.js';
import * as Pn from '../../math/Pn.js';
import * as Rn from '../../math/Rn.js';
import { SceneGraphUtility } from '../../util/SceneGraphUtility.js';
import { Rectangle3D } from '../../util/Rectangle3D.js';
import { innerProduct, intersectionPlane, intersectionPoint, lineFromPlanes, lineFromPoints, lineJoinPoint } from '../../math/PlueckerLineGeometry.js';
import { LineUtility } from './LineUtility.js';
import { PointRangeFactory } from './PointRangeFactory.js';

/**
 * Direct translation of charlesgunn.jreality.geometry.projective.LinePencilFactory.
 */
export class LinePencilFactory {
  finiteSphere = false;
  fan = false;
  sphereRadius = 10e2;
  center = [0, 0, 0, 1];
  point = null;
  plane = null;
  // alternate way to define the pencil: two intersecting lines
  intersectingLines = [null, null];
  numberJoints = 12;
  numLines = 10;
  metric = Pn.ELLIPTIC;
  tolerance = 10e-8;
  times = null;

  // transient
  helpingLine = null;
  line0 = null;
  line1 = null;
  pencilSGC = SceneGraphUtility.createFullSceneGraphComponent('linePencil');
  pluckerLines = null;
  pluckerLinesSet = null;

  getNumLines() {
    return this.numLines;
  }

  setNumLines(numLines) {
    this.numLines = numLines;
  }

  getNumberJoints() {
    return this.numberJoints;
  }

  setNumberJoints(numSegs) {
    this.numberJoints = numSegs;
  }

  getPlane() {
    return this.plane;
  }

  setPlane(plane) {
    this.plane = plane;
  }

  getPoint() {
    return this.point;
  }

  setPoint(point) {
    this.point = point;
  }

  getPencil() {
    return this.pencilSGC;
  }

  getMetric() {
    return this.metric;
  }

  setMetric(metric) {
    this.metric = metric;
  }

  isFiniteSphere() {
    return this.finiteSphere;
  }

  setFiniteSphere(finiteSphere) {
    this.finiteSphere = finiteSphere;
    if (finiteSphere) this.setNumberJoints(2);
  }

  getSphereRadius() {
    return this.sphereRadius;
  }

  setSphereRadius(sphereRadius) {
    this.sphereRadius = sphereRadius;
  }

  getCenter() {
    return this.center;
  }

  setCenter(center) {
    this.center = center;
  }

  getTimes() {
    return this.times;
  }

  setTimes(times) {
    this.times = times;
  }

  getLine() {
    return this.helpingLine;
  }

  setLine(line) {
    this.helpingLine = line;
    this.plane = lineJoinPoint(null, line, this.point);
  }

  update() {
    if ((this.pluckerLinesSet == null) && Rn.innerProduct(this.point, this.plane) >= this.tolerance) {
      throw new Error('Point and plane must be incident');
    }
    const indices = new Array(this.numLines);
    for (let i = 0; i < this.numLines; i++) {
      indices[i] = new Array(this.numberJoints + (this.finiteSphere ? 0 : 1));
    }
    const verts = new Array(this.numLines * this.numberJoints).fill(0).map(() => new Array(4));
    this.pluckerLines = new Array(this.numLines);
    if (this.pluckerLinesSet == null) this.computeLines();
    else this.pluckerLines = this.pluckerLinesSet;
    let foo = 0;
    for (let i = 0; i < this.numLines; ++i) {
      foo = i * this.numberJoints;
      const lf = new PointRangeFactory();
      lf.setNumberOfSamples(this.numberJoints);
      lf.setOffset(foo);
      lf.setVertices(verts);
      // TODO figure out why I do the following: looks like I should set the pluecker line OR the two elements.
      lf.setPluckerLine(this.pluckerLines[i]);
      // lf.setElement0(point);
      // lf.setElement1(samples[i]);
      lf.setSphereRadius(this.sphereRadius);
      lf.setCenter(this.point);
      lf.setDoubled(!this.finiteSphere);
      lf.setFiniteSphere(this.finiteSphere);
      lf.update();
      for (let j = 0; j <= this.numberJoints; ++j) {
        if (j < this.numberJoints || !this.finiteSphere) indices[i][j] = foo + (j % this.numberJoints);
      }
    }
    const ifsf = new IndexedLineSetFactory();
    ifsf.setVertexCount(verts.length);
    ifsf.setVertexCoordinates(verts);
    ifsf.setEdgeCount(indices.length);
    ifsf.setEdgeIndices(indices);
    ifsf.update();
    const ils = ifsf.getIndexedLineSet();
    ils.setGeometryAttribute(GeometryUtility.BOUNDING_BOX, Rectangle3D.EMPTY_BOX);
    this.pencilSGC.setGeometry(ils);
  }

  // calculate a set of lines lying in this pencil via a "helping line"
  // which lies in the plane of the pencil. (The helping line is then sampled
  // and the samples joined to the center to obtain the lines of the pencil.)
  // This helping line is obtained
  // as the intersection of the plane of the pencil with a second plane,
  // which generically is the elliptic polar plane of the point.  Important
  // of course is that this helping line does not contain the point of the pencil.
  // A better alternative would be to find two elliptically perpendicular lines
  // in the pencil and use them directly to generate the elements of the pencil.
  computeLines() {
    if (this.times != null) {
      this.setNumLines(this.times.length);
    }

    if (this.fan && this.line0 != null && this.line1 != null) {
      this.pluckerLines = new Array(this.numLines).fill(0).map(() => new Array(6));
      if (this.times != null) {
        for (let i = 0; i < this.numLines; ++i) {
          this.pluckerLines[i] = LineUtility.valueAtTime(this.times[i], this.line0, this.line1);
        }
        return;
      }
      LineUtility.ellipticSegment(this.pluckerLines, this.line0, this.line1, this.numLines);
      return;
    }
    const samples = new Array(this.numLines).fill(0).map(() => new Array(4));
    // HACK  we need a second plane which is different from plane
    // generic case: choose the ideal plane, then the intersection is the ideal line of the plane
    let planex = [...P3.originP3];
    if (Math.abs(this.point[3]) < 10e-8) { // point is "at infinity"
      planex = this.point;
    }
    this.helpingLine = lineFromPlanes(null, this.plane, planex);
    LineUtility.samplesOnLine(samples, this.numLines, this.helpingLine, false);
    for (let i = 0; i < this.numLines; ++i) {
      this.pluckerLines[i] = lineFromPoints(null, this.point, samples[i]);
    }
  }

  static linePencilFactoryForIntersectingLines(lpf, line0, line1) {
    if (lpf == null) lpf = new LinePencilFactory();
    if (Math.abs(innerProduct(line0, line1)) > 10e-8) {
      throw new Error('not intersecting');
    }
    lpf.point = intersectionPoint(lpf.point, line0, line1);
    lpf.plane = intersectionPlane(lpf.plane, line0, line1);
    lpf.line0 = line0;
    lpf.line1 = line1;
    // lpf.update();
    return lpf;
  }

  getPluckerLines() {
    return this.pluckerLines;
  }

  setPluckerLines(pl) {
    this.pluckerLinesSet = pl;
  }

  setIntersectingLines(line0, line1) {
    LinePencilFactory.linePencilFactoryForIntersectingLines(this, line0, line1);
  }

  isFan() {
    return this.fan;
  }

  setFan(fan) {
    this.fan = fan;
  }

  static intersectionPoints(pts, lpf, prf) {
    const line = prf.getPluckerLine();
    if (pts == null || pts.length !== lpf.getNumLines()) pts = new Array(lpf.getNumLines());
    for (let i = 0; i < pts.length; ++i) {
      pts[i] = intersectionPoint(null, line, lpf.pluckerLines[i]);
      Pn.dehomogenize(pts[i], pts[i]);
      console.log(`intersection = ${Rn.toString(pts[i])}`);
    }
    return pts;
  }
}
