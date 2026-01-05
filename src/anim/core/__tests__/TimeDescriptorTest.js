/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview Jest tests for TimeDescriptor class.
 */

import { TimeDescriptor } from '../TimeDescriptor.js';

describe('TimeDescriptor', () => {
  test('default constructor', () => {
    const td = new TimeDescriptor();
    expect(td.getTime()).toBe(0);
    expect(td.getLastModified()).toBeGreaterThan(0);
  });

  test('constructor with time', () => {
    const td = new TimeDescriptor(5.5);
    expect(td.getTime()).toBe(5.5);
  });

  test('setTime updates time and lastModified', async () => {
    const td = new TimeDescriptor();
    const before = td.getLastModified();
    // Give the clock a tick so lastModified can advance.
    await new Promise((resolve) => setTimeout(resolve, 2));
    td.setTime(3.14);
    expect(td.getTime()).toBeCloseTo(3.14);
    expect(td.getLastModified()).toBeGreaterThan(before);
  });

  test('setTimeWithTimestamp sets explicit timestamp', () => {
    const td = new TimeDescriptor();
    const customTimestamp = 1234567890;
    td.setTimeWithTimestamp(2.5, customTimestamp);
    expect(td.getTime()).toBe(2.5);
    expect(td.getLastModified()).toBe(customTimestamp);
  });
});
