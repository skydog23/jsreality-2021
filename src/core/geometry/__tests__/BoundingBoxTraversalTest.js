/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { BoundingBoxTraversal } from '../BoundingBoxTraversal.js';
import { PointSetFactory } from '../PointSetFactory.js';
import { GeometryUtility } from '../GeometryUtility.js';
import { SceneGraphComponent } from '../../scene/SceneGraphComponent.js';
import { Appearance } from '../../scene/Appearance.js';
import { Transformation } from '../../scene/Transformation.js';
import { Rectangle3D } from '../../util/Rectangle3D.js';
import { Rectangle2D } from '../../util/Rectangle2D.js';

function expectBoundsCloseTo(rect3d, expected, eps = 1e-9) {
  const b = rect3d.getBounds();
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) {
      expect(b[i][j]).toBeCloseTo(expected[i][j], Math.max(1, Math.ceil(-Math.log10(eps))));
    }
  }
}

describe('BoundingBoxTraversal', () => {
  test('computes bounds for a simple PointSet (3D coords)', () => {
    const psf = new PointSetFactory();
    psf.setVertexCount(2);
    psf.setVertexCoordinates([[-1, 0, 0], [2, 3, -4]]);
    psf.update();

    const root = new SceneGraphComponent('root');
    root.setGeometry(psf.getPointSet());

    const bbt = new BoundingBoxTraversal();
    bbt.traverse(root);
    const bbox = bbt.getBoundingBox();

    expectBoundsCloseTo(bbox, [
      [-1, 0, -4],
      [2, 3, 0]
    ]);
    expect(bbt.getBoundingBoxCenter(null)).toEqual([0.5, 1.5, -2]);
  });

  test('merges bounding boxes across multiple child geometries', () => {
    const root = new SceneGraphComponent('root');

    // Child 1: bounds [0,0,0] .. [1,2,3]
    const psf1 = new PointSetFactory();
    psf1.setVertexCount(2);
    psf1.setVertexCoordinates([[0, 0, 0], [1, 2, 3]]);
    psf1.update();
    const c1 = new SceneGraphComponent('c1');
    c1.setGeometry(psf1.getPointSet());

    // Child 2: bounds [-5,-6,-7] .. [-4,10,0]
    const psf2 = new PointSetFactory();
    psf2.setVertexCount(2);
    psf2.setVertexCoordinates([[-5, -6, -7], [-4, 10, 0]]);
    psf2.update();
    const c2 = new SceneGraphComponent('c2');
    c2.setGeometry(psf2.getPointSet());

    root.addChild(c1);
    root.addChild(c2);

    const bbt = new BoundingBoxTraversal();
    bbt.traverse(root);
    const bbox = bbt.getBoundingBox();

    expectBoundsCloseTo(bbox, [
      [-5, -6, -7],
      [1, 10, 3]
    ]);
  });

  test('applies component transformation to child geometry', () => {
    const psf = new PointSetFactory();
    psf.setVertexCount(2);
    psf.setVertexCoordinates([[0, 0, 0], [1, 0, 0]]);
    psf.update();

    // Translate by +10 in x (row-major matrix, last column is translation).
    const T = [
      1, 0, 0, 10,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];

    const root = new SceneGraphComponent('root');
    const child = new SceneGraphComponent('child');
    child.setTransformation(new Transformation(T));
    child.setGeometry(psf.getPointSet());
    root.addChild(child);

    const bbt = new BoundingBoxTraversal();
    bbt.traverse(root);
    const bbox = bbt.getBoundingBox();

    expectBoundsCloseTo(bbox, [
      [10, 0, 0],
      [11, 0, 0]
    ]);
  });

  test('appearance boundingBox attribute overrides traversal of children', () => {
    const root = new SceneGraphComponent('root');
    const app = new Appearance('app');

    const fixed = new Rectangle3D();
    fixed.setBounds([
      [-1, -2, -3],
      [4, 5, 6]
    ]);
    app.setAttribute(GeometryUtility.BOUNDING_BOX, fixed);
    root.setAppearance(app);

    // Add a child with extreme geometry that would change bounds if traversed.
    const psf = new PointSetFactory();
    psf.setVertexCount(1);
    psf.setVertexCoordinates([[1e6, 1e6, 1e6]]);
    psf.update();
    const child = new SceneGraphComponent('child');
    child.setGeometry(psf.getPointSet());
    root.addChild(child);

    const bbt = new BoundingBoxTraversal();
    bbt.traverse(root);
    const bbox = bbt.getBoundingBox();

    expectBoundsCloseTo(bbox, [
      [-1, -2, -3],
      [4, 5, 6]
    ]);
  });

  test('geometry boundingBox attribute overrides point coordinates', () => {
    const psf = new PointSetFactory();
    psf.setVertexCount(2);
    psf.setVertexCoordinates([[-100, -100, -100], [100, 100, 100]]);
    psf.update();
    const ps = psf.getPointSet();

    const fixed = new Rectangle3D();
    fixed.setBounds([
      [7, 8, 9],
      [10, 11, 12]
    ]);
    ps.setGeometryAttribute(GeometryUtility.BOUNDING_BOX, fixed);

    const root = new SceneGraphComponent('root');
    root.setGeometry(ps);

    const bbt = new BoundingBoxTraversal();
    bbt.traverse(root);
    const bbox = bbt.getBoundingBox();

    expectBoundsCloseTo(bbox, [
      [7, 8, 9],
      [10, 11, 12]
    ]);
  });

  test('height field domain + 1D z-values produce xyz bounds (HEIGHT_FIELD_SHAPE)', () => {
    const psf = new PointSetFactory();
    psf.setVertexCount(3);
    // Height field coordinates are expected to be 1D (z-values).
    psf.setVertexCoordinates([[-2], [3], [1]], 1);
    psf.update();
    const ps = psf.getPointSet();
    ps.setGeometryAttribute(GeometryUtility.HEIGHT_FIELD_SHAPE, new Rectangle2D(0, 0, 2, 4));

    const root = new SceneGraphComponent('root');
    root.setGeometry(ps);

    const bbt = new BoundingBoxTraversal();
    bbt.traverse(root);
    const bbox = bbt.getBoundingBox();

    expectBoundsCloseTo(bbox, [
      [0, 0, -2],
      [2, 4, 3]
    ]);
  });
});


