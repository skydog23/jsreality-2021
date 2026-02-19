/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { IndexedFaceSetFactory } from './IndexedFaceSetFactory.js';
import { IndexedFaceSetUtility } from './IndexedFaceSetUtility.js';
import { IndexedLineSetFactory } from './IndexedLineSetFactory.js';
import { PointSetFactory } from './PointSetFactory.js';
import { PointSetUtility } from './PointSetUtility.js';
import { Primitives } from './Primitives.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { fromDataList, toDataList } from '../scene/data/DataUtility.js';
import * as Pn from '../math/Pn.js';
import * as Rn from '../math/Rn.js';

/**
 * Partial compatibility port of `charlesgunn.jreality.geometry.GeometryUtilityOverflow`.
 * Methods implemented here are the ones most often used by current `discretegroupCGG` demos.
 */
export class GeometryUtilityOverflow {
  static anglesFromSides(sides, metric = Pn.EUCLIDEAN) {
    const a = Pn.distanceBetween(sides[1], sides[2], metric);
    const b = Pn.distanceBetween(sides[0], sides[2], metric);
    const c = Pn.distanceBetween(sides[0], sides[1], metric);
    return [a, b, c];
  }

  static attachVectorField(pointSet, vectors) {
    const vertsDL = pointSet.getVertexAttribute(GeometryAttribute.COORDINATES);
    const verts = fromDataList(vertsDL);
    const n = Math.min(verts.length, vectors.length);
    const lsVerts = [];
    const edges = [];
    for (let i = 0; i < n; i += 1) {
      const v = verts[i];
      const w = vectors[i];
      const a = v.slice(0, 3);
      const b = [v[0] + w[0], v[1] + w[1], v[2] + w[2]];
      const base = lsVerts.length;
      lsVerts.push(a, b);
      edges.push([base, base + 1]);
    }
    const ilsf = new IndexedLineSetFactory();
    ilsf.setVertexCount(lsVerts.length);
    ilsf.setVertexCoordinates(lsVerts);
    ilsf.setEdgeCount(edges.length);
    ilsf.setEdgeIndices(edges);
    ilsf.update();
    return ilsf.getIndexedLineSet();
  }

  static cameraIcon(scale = 1.0) {
    const sgc = new SceneGraphComponent('cameraIcon');
    sgc.setGeometry(Primitives.closedCylinder(20, 0.2 * scale, 0.35 * scale, -0.3 * scale, 0.3 * scale));
    return sgc;
  }

  static pointSet(verts, _clrs = null) {
    const psf = new PointSetFactory();
    psf.setVertexCount(verts.length);
    psf.setVertexCoordinates(verts);
    psf.update();
    return psf.getPointSet();
  }

  static texturedDisk(rays, circles, _old = false, _polar = false) {
    return GeometryUtilityOverflow.texturedDiskFactory(rays, circles).getIndexedFaceSet();
  }

  static texturedDiskFactory(rays, circles, _old = false, _polar = false) {
    const ifsf = new IndexedFaceSetFactory();
    const vertices = [];
    const faces = [];
    const uvs = [];
    for (let j = 0; j <= circles; j += 1) {
      const r = j / circles;
      for (let i = 0; i < rays; i += 1) {
        const t = (2 * Math.PI * i) / rays;
        const x = r * Math.cos(t);
        const y = r * Math.sin(t);
        vertices.push([x, y, 0]);
        uvs.push([0.5 * (x + 1), 0.5 * (y + 1)]);
      }
    }
    for (let j = 0; j < circles; j += 1) {
      for (let i = 0; i < rays; i += 1) {
        const i1 = (i + 1) % rays;
        const a = j * rays + i;
        const b = j * rays + i1;
        const c = (j + 1) * rays + i1;
        const d = (j + 1) * rays + i;
        faces.push([a, b, c, d]);
      }
    }
    ifsf.setVertexCount(vertices.length);
    ifsf.setVertexCoordinates(vertices);
    ifsf.setVertexTextureCoordinates(uvs);
    ifsf.setFaceCount(faces.length);
    ifsf.setFaceIndices(faces);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.setGenerateFaceNormals(true);
    ifsf.update();
    return ifsf;
  }

  static closedCylinder(n, r, R, zmin, zmax, thetamax = 2 * Math.PI) {
    return Primitives.closedCylinder(n, r, R, zmin, zmax, thetamax);
  }

  static triangulateQuadMesh(ifs) {
    const vertsDL = ifs.getVertexAttribute(GeometryAttribute.COORDINATES);
    const facesDL = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    if (!vertsDL || !facesDL) return ifs;
    const verts = fromDataList(vertsDL);
    const faces = fromDataList(facesDL);
    const triFaces = [];
    for (const f of faces) {
      if (f.length === 4) {
        triFaces.push([f[0], f[1], f[2]], [f[0], f[2], f[3]]);
      } else if (f.length >= 3) {
        for (let i = 1; i < f.length - 1; i += 1) {
          triFaces.push([f[0], f[i], f[i + 1]]);
        }
      }
    }
    const ifsf = new IndexedFaceSetFactory();
    ifsf.setVertexCount(verts.length);
    ifsf.setVertexCoordinates(verts);
    ifsf.setFaceCount(triFaces.length);
    ifsf.setFaceIndices(triFaces);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.setGenerateFaceNormals(true);
    ifsf.update();
    return ifsf.getIndexedFaceSet();
  }

  static displayFaceNormals(ifsOrSgc, scale = 0.1, metric = Pn.EUCLIDEAN) {
    if (ifsOrSgc instanceof SceneGraphComponent) {
      const ifs = ifsOrSgc.getGeometry();
      const normals = GeometryUtilityOverflow.displayFaceNormals(ifs, scale, metric);
      const child = new SceneGraphComponent('faceNormals');
      child.setGeometry(normals);
      ifsOrSgc.addChild(child);
      return ifsOrSgc;
    }
    const ifs = ifsOrSgc;
    const verts = fromDataList(ifs.getVertexAttribute(GeometryAttribute.COORDINATES));
    const faces = fromDataList(ifs.getFaceAttribute(GeometryAttribute.INDICES));
    const lineVerts = [];
    const edges = [];
    for (const f of faces) {
      if (!f || f.length < 3) continue;
      const p0 = verts[f[0]];
      const p1 = verts[f[1]];
      const p2 = verts[f[2]];
      const e1 = Rn.subtract(null, p1, p0);
      const e2 = Rn.subtract(null, p2, p0);
      const n = Rn.normalize(null, Rn.crossProduct(null, e1, e2));
      const c = [0, 0, 0];
      for (const idx of f) {
        c[0] += verts[idx][0];
        c[1] += verts[idx][1];
        c[2] += verts[idx][2];
      }
      c[0] /= f.length; c[1] /= f.length; c[2] /= f.length;
      const t = [c[0] + scale * n[0], c[1] + scale * n[1], c[2] + scale * n[2]];
      const base = lineVerts.length;
      lineVerts.push(c, t);
      edges.push([base, base + 1]);
    }
    const ilsf = new IndexedLineSetFactory();
    ilsf.setVertexCount(lineVerts.length);
    ilsf.setVertexCoordinates(lineVerts);
    ilsf.setEdgeCount(edges.length);
    ilsf.setEdgeIndices(edges);
    ilsf.update();
    return ilsf.getIndexedLineSet();
  }

  static flipNormals(ifs) {
    const faces = fromDataList(ifs.getFaceAttribute(GeometryAttribute.INDICES));
    for (const f of faces) f.reverse();
    ifs.setFaceAttribute(GeometryAttribute.INDICES, toDataList(faces, null, 'int32'));
    IndexedFaceSetUtility.calculateAndSetEdgesFromFaces(ifs);
  }

  static isUClosed(ifs) {
    const qm = ifs.getGeometryAttribute('quadMesh');
    if (!qm) return false;
    const [u, v] = qm;
    const verts = fromDataList(ifs.getVertexAttribute(GeometryAttribute.COORDINATES));
    for (let j = 0; j < v; j += 1) {
      const a = verts[j * u];
      const b = verts[j * u + (u - 1)];
      if (Rn.euclideanDistance(a, b) > 1e-6) return false;
    }
    return true;
  }

  static isVClosed(ifs) {
    const qm = ifs.getGeometryAttribute('quadMesh');
    if (!qm) return false;
    const [u, v] = qm;
    const verts = fromDataList(ifs.getVertexAttribute(GeometryAttribute.COORDINATES));
    for (let i = 0; i < u; i += 1) {
      const a = verts[i];
      const b = verts[(v - 1) * u + i];
      if (Rn.euclideanDistance(a, b) > 1e-6) return false;
    }
    return true;
  }

  static plainQuadMesh(verts, xDetail, yDetail) {
    const ifsf = new IndexedFaceSetFactory();
    ifsf.setVertexCount(verts.length);
    ifsf.setVertexCoordinates(verts);
    const faces = [];
    for (let j = 0; j < yDetail - 1; j += 1) {
      for (let i = 0; i < xDetail - 1; i += 1) {
        const a = j * xDetail + i;
        faces.push([a, a + 1, a + xDetail + 1, a + xDetail]);
      }
    }
    ifsf.setFaceCount(faces.length);
    ifsf.setFaceIndices(faces);
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.update();
    const ifs = ifsf.getIndexedFaceSet();
    ifs.setGeometryAttribute('quadMesh', [xDetail, yDetail]);
    return ifs;
  }

  static diamondize(ifs, _weight = 0.5) {
    // Placeholder compatibility implementation.
    return GeometryUtilityOverflow.triangulateQuadMesh(ifs);
  }

  static calculateVertexCurvature(_ifs) {
    return [];
  }

  static boxedSignFromString(_s, _boxHeight, _textHeight, _font = null) {
    return new SceneGraphComponent('boxedSign');
  }

  static boxedTerrainFromImage(_img, _boxHeight, _textHeight, _zflipped = false) {
    return new SceneGraphComponent('boxedTerrain');
  }

  static heightFieldFromImage(_img, _domain = null, _zflipped = false) {
    return GeometryUtilityOverflow.plainQuadMesh(
      [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]],
      2,
      2,
    );
  }

  static displayVertexNormals(pointSet, scale = 0.1, metric = Pn.EUCLIDEAN) {
    return PointSetUtility.displayVertexNormals(pointSet, scale, metric);
  }
}

