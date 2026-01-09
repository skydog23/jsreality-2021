/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Snake } from '../Snake.js';
import { GeometryAttribute } from '../../scene/GeometryAttribute.js';
import { fromDataList } from '../../scene/data/DataUtility.js';

describe('Snake', () => {
  test('update builds a single cyclic polyline and per-vertex membership flags', () => {
    const p = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0]
    ];
    const s = new Snake(p);

    // initial info: begin=0, length=4
    expect(s.getInfo()[0]).toBe(0);
    expect(s.getInfo()[1]).toBe(4);

    const edgeIdx = s.getEdgeAttribute(GeometryAttribute.INDICES);
    const edgeIdxArr = fromDataList(edgeIdx);
    expect(edgeIdxArr).toEqual([[0, 1, 2, 3]]);

    const vIdx = s.getVertexAttribute(GeometryAttribute.INDICES);
    const vIdxArr = fromDataList(vIdx);
    // shape [n,1] → [[1],[1],[1],[1]]
    expect(vIdxArr).toEqual([[1], [1], [1], [1]]);

    // Now set begin=1, length=2 -> indices [1,2], membership flags only for vertices 1 and 2.
    const info = s.getInfo();
    info[0] = 1;
    info[1] = 2;
    s.update();

    const edgeIdx2 = fromDataList(s.getEdgeAttribute(GeometryAttribute.INDICES));
    expect(edgeIdx2).toEqual([[1, 2]]);

    const vIdx2 = fromDataList(s.getVertexAttribute(GeometryAttribute.INDICES));
    expect(vIdx2).toEqual([[0], [1], [1], [0]]);
  });
});


