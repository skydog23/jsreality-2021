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
 * @fileoverview Jest tests for SortedKeyFrameList.
 */

import { SortedKeyFrameList } from '../SortedKeyFrameList.js';
import { KeyFrame } from '../KeyFrame.js';
import { TimeDescriptor } from '../TimeDescriptor.js';

describe('SortedKeyFrameList', () => {
  test('basic empty list', () => {
    const list = new SortedKeyFrameList();
    expect(list.size()).toBe(0);
    expect(list.getTmin()).toBe(0.0);
    expect(list.getTmax()).toBe(0.0);
  });

  test('sorted insertion', () => {
    const list = new SortedKeyFrameList();
    list.add(new KeyFrame(new TimeDescriptor(3.0), 'third'));
    list.add(new KeyFrame(new TimeDescriptor(1.0), 'first'));
    list.add(new KeyFrame(new TimeDescriptor(2.0), 'second'));

    expect(list.size()).toBe(3);
    expect(list.get(0).getTime()).toBe(1.0);
    expect(list.get(1).getTime()).toBe(2.0);
    expect(list.get(2).getTime()).toBe(3.0);
    expect(list.get(0).getValue()).toBe('first');
    expect(list.get(1).getValue()).toBe('second');
    expect(list.get(2).getValue()).toBe('third');
  });

  test('time bounds', () => {
    const list = new SortedKeyFrameList();
    list.add(new KeyFrame(new TimeDescriptor(2.5), 'middle'));
    list.add(new KeyFrame(new TimeDescriptor(0.5), 'start'));
    list.add(new KeyFrame(new TimeDescriptor(4.5), 'end'));
    expect(list.getTmin()).toBe(0.5);
    expect(list.getTmax()).toBe(4.5);
  });

  test('existingKeyFrameAt', () => {
    const list = new SortedKeyFrameList();
    const td1 = new TimeDescriptor(1.5);
    const td2 = new TimeDescriptor(2.5);
    const td3 = new TimeDescriptor(3.5);
    const kf1 = new KeyFrame(td1, 'first');
    const kf2 = new KeyFrame(td2, 'second');
    list.add(kf1);
    list.add(kf2);
    expect(list.existingKeyFrameAt(td1)).toBe(kf1);
    expect(list.existingKeyFrameAt(td2)).toBe(kf2);
    expect(list.existingKeyFrameAt(td3)).toBe(null);
  });

  test('segments', () => {
    const list = new SortedKeyFrameList();
    list.add(new KeyFrame(new TimeDescriptor(1.0), 'a'));
    list.add(new KeyFrame(new TimeDescriptor(3.0), 'b'));
    list.add(new KeyFrame(new TimeDescriptor(5.0), 'c'));
    expect(list.getSegmentAtTime(0.5)).toBe(-1);
    expect(list.getSegmentAtTime(1.5)).toBe(0);
    expect(list.getSegmentAtTime(4.0)).toBe(1);
    expect(list.getSegmentAtTime(6.0)).toBe(2);
  });

  test('removal and clear', () => {
    const list = new SortedKeyFrameList();
    const kf1 = new KeyFrame(new TimeDescriptor(1.0), 'first');
    const kf2 = new KeyFrame(new TimeDescriptor(2.0), 'second');
    const kf3 = new KeyFrame(new TimeDescriptor(3.0), 'third');
    list.add(kf1);
    list.add(kf2);
    list.add(kf3);

    expect(list.remove(kf2)).toBe(true);
    expect(list.size()).toBe(2);
    expect(list.get(0)).toBe(kf1);
    expect(list.get(1)).toBe(kf3);
    expect(list.remove(kf2)).toBe(false);

    const removed = list.removeAt(0);
    expect(removed).toBe(kf1);
    expect(list.size()).toBe(1);

    list.clear();
    expect(list.size()).toBe(0);
  });

  test('iteration and toArray', () => {
    const list = new SortedKeyFrameList();
    const values = ['first', 'second', 'third'];
    const times = [1.0, 2.0, 3.0];
    for (let i = 0; i < values.length; i++) {
      list.add(new KeyFrame(new TimeDescriptor(times[i]), values[i]));
    }
    const collected = [];
    for (const kf of list) {
      collected.push({ t: kf.getTime(), v: kf.getValue() });
    }
    expect(collected).toEqual([
      { t: 1.0, v: 'first' },
      { t: 2.0, v: 'second' },
      { t: 3.0, v: 'third' }
    ]);

    const array = list.toArray();
    expect(array).toHaveLength(3);
    expect(array[0].getValue()).toBe('first');
  });
});
