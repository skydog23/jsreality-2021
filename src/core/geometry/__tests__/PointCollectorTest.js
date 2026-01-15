/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { PointCollector } from '../projective/PointCollector.js';
import { GeometryAttribute } from '../../scene/GeometryAttribute.js';
import { fromDataList } from '../../scene/data/DataUtility.js';

describe('PointCollector', () => {
  test('addPoint updates underlying Snake vertex coordinates (cyclic buffer)', () => {
    const pc = new PointCollector(3, 3);

    pc.addPoint([1, 2, 3]);
    pc.addPoint([4, 5, 6]);
    pc.addPoint([7, 8, 9]);

    const coords = fromDataList(pc.getCurve().getVertexAttribute(GeometryAttribute.COORDINATES));
    // Since the collector writes directly into the backing points array and Snake re-uploads
    // coordinates on update(), we should see the last written values somewhere in coords.
    expect(coords).toContainEqual([1, 2, 3]);
    expect(coords).toContainEqual([4, 5, 6]);
    expect(coords).toContainEqual([7, 8, 9]);
  });
});


