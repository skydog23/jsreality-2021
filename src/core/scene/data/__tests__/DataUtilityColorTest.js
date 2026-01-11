/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { toDataList } from '../index.js';
import { Color } from '../../../util/Color.js';

describe('toDataList (Color normalization)', () => {
  test('converts Color[] to packed float32 RGBA in [0,1] with shape [n,4]', () => {
    const dl = toDataList([new Color(255, 0, 0), new Color(0, 128, 255, 128)]);

    expect(dl.shape).toEqual([2, 4]);
    expect(dl.dataType).toBe('float32');

    const flat = dl.getFlatData();
    expect(flat).toBeInstanceOf(Float32Array);

    expect(flat[0]).toBeCloseTo(1.0);
    expect(flat[1]).toBeCloseTo(0.0);
    expect(flat[2]).toBeCloseTo(0.0);
    expect(flat[3]).toBeCloseTo(1.0);

    expect(flat[4]).toBeCloseTo(0.0);
    expect(flat[5]).toBeCloseTo(128 / 255);
    expect(flat[6]).toBeCloseTo(1.0);
    expect(flat[7]).toBeCloseTo(128 / 255);
  });

  test('converts plain {r,g,b,a} objects to packed float32 RGBA in [0,1]', () => {
    const dl = toDataList([{ r: 255, g: 0, b: 0, a: 64 }, { r: 0, g: 1, b: 0, a: 1 }]);
    const flat = dl.getFlatData();

    // First treated as 0..255 bytes
    expect(flat[0]).toBeCloseTo(1.0);
    expect(flat[1]).toBeCloseTo(0.0);
    expect(flat[2]).toBeCloseTo(0.0);
    expect(flat[3]).toBeCloseTo(64 / 255);

    // Second treated as already-normalized floats
    expect(flat[4]).toBeCloseTo(0.0);
    expect(flat[5]).toBeCloseTo(1.0);
    expect(flat[6]).toBeCloseTo(0.0);
    expect(flat[7]).toBeCloseTo(1.0);
  });
});


