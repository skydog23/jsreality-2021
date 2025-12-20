/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * @fileoverview Jest tests for KeyFrame class.
 */

import { KeyFrame } from '../KeyFrame.js';
import { TimeDescriptor } from '../TimeDescriptor.js';

describe('KeyFrame', () => {
  test('default constructor', () => {
    const kf = new KeyFrame();
    expect(kf.getTime()).toBe(0);
    expect(kf.getValue()).toBe(null);
    expect(kf.getTimeDescriptor()).toBeInstanceOf(TimeDescriptor);
  });

  test('constructor with TimeDescriptor and value', () => {
    const td = new TimeDescriptor(2.5);
    const value = 'test value';
    const kf = new KeyFrame(td, value);
    expect(kf.getTime()).toBe(2.5);
    expect(kf.getValue()).toBe(value);
    expect(kf.getTimeDescriptor()).toBe(td);
  });

  test('setTime updates underlying TimeDescriptor', () => {
    const kf = new KeyFrame();
    kf.setTime(1.5);
    expect(kf.getTime()).toBe(1.5);

    const originalTd = kf.getTimeDescriptor();
    kf.setTime(3.0);
    expect(originalTd.getTime()).toBe(3.0);
  });

  test('setValue supports different types', () => {
    const kf = new KeyFrame();
    kf.setValue(42);
    expect(kf.getValue()).toBe(42);

    kf.setValue('hello');
    expect(kf.getValue()).toBe('hello');

    const obj = { x: 1, y: 2 };
    kf.setValue(obj);
    expect(kf.getValue()).toBe(obj);
  });

  test('toString includes time and value', () => {
    const kf = new KeyFrame(new TimeDescriptor(1.5), 'test');
    const str = kf.toString();
    expect(str).toContain('1.5');
    expect(str).toContain('test');
  });
});
