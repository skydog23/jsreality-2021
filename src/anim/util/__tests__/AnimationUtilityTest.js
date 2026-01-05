/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview Tests for AnimationUtility class.
 */

import { AnimationUtility, InterpolationTypes, BoundaryModes, PlaybackModes } from '../AnimationUtility.js';
import { jest } from '@jest/globals';

/**
 * Test AnimationUtility constants
 */
export function testAnimationUtilityConstants() {
    console.log('Testing AnimationUtility constants...');
    
    // Test InterpolationTypes
    console.assert(InterpolationTypes.CONSTANT === 'CONSTANT', 'CONSTANT should be defined');
    console.assert(InterpolationTypes.LINEAR === 'LINEAR', 'LINEAR should be defined');
    console.assert(InterpolationTypes.CUBIC_HERMITE === 'CUBIC_HERMITE', 'CUBIC_HERMITE should be defined');
    console.assert(InterpolationTypes.CUBIC_BSPLINE === 'CUBIC_BSPLINE', 'CUBIC_BSPLINE should be defined');
    
    // Test BoundaryModes
    console.assert(BoundaryModes.CLAMP === 'CLAMP', 'CLAMP should be defined');
    console.assert(BoundaryModes.REPEAT === 'REPEAT', 'REPEAT should be defined');
    console.assert(BoundaryModes.EXTRAPOLATE === 'EXTRAPOLATE', 'EXTRAPOLATE should be defined');
    
    // Test PlaybackModes
    console.assert(PlaybackModes.NORMAL === 'NORMAL', 'NORMAL should be defined');
    console.assert(PlaybackModes.CYCLE === 'CYCLE', 'CYCLE should be defined');
    console.assert(PlaybackModes.SHUTTLE === 'SHUTTLE', 'SHUTTLE should be defined');
    
    console.log('✓ AnimationUtility constants tests passed');
}

/**
 * Test AnimationUtility linear interpolation
 */
export function testAnimationUtilityLinearInterpolation() {
    console.log('Testing AnimationUtility linear interpolation...');
    
    // Test basic linear interpolation
    const result1 = AnimationUtility.linearInterpolation(0.5, 0, 1, 0, 10);
    console.assert(result1 === 5, `Linear interpolation at 0.5 should be 5, got ${result1}`);
    
    // Test boundary conditions
    const result2 = AnimationUtility.linearInterpolation(-0.5, 0, 1, 0, 10);
    console.assert(result2 === 0, `Value below minimum should clamp to 0, got ${result2}`);
    
    const result3 = AnimationUtility.linearInterpolation(1.5, 0, 1, 0, 10);
    console.assert(result3 === 10, `Value above maximum should clamp to 10, got ${result3}`);
    
    // Test different ranges
    const result4 = AnimationUtility.linearInterpolation(1.5, 1, 2, 100, 200);
    console.assert(result4 === 150, `Linear interpolation should work with different ranges, got ${result4}`);
    
    console.log('✓ AnimationUtility linear interpolation tests passed');
}

/**
 * Test AnimationUtility hermite interpolation
 */
export function testAnimationUtilityHermiteInterpolation() {
    console.log('Testing AnimationUtility hermite interpolation...');
    
    // Test basic hermite interpolation
    const result1 = AnimationUtility.hermiteInterpolation(0.5, 0, 1, 0, 10);
    console.assert(result1 > 0 && result1 < 10, `Hermite interpolation at 0.5 should be between 0 and 10, got ${result1}`);
    // Our "hermite" here is smoothstep: -2t^3 + 3t^2. At t=0.5, this equals 0.5.
    console.assert(Math.abs(result1 - 5.0) < 0.001, `Hermite interpolation at 0.5 should be 5.0, got ${result1}`);
    
    // Test boundary conditions
    const result2 = AnimationUtility.hermiteInterpolation(0, 0, 1, 0, 10);
    console.assert(result2 === 0, `Hermite interpolation at start should be 0, got ${result2}`);
    
    const result3 = AnimationUtility.hermiteInterpolation(1, 0, 1, 0, 10);
    console.assert(result3 === 10, `Hermite interpolation at end should be 10, got ${result3}`);
    
    // Test smoothness (derivative should be 0 at endpoints)
    const epsilon = 0.001;
    const result4a = AnimationUtility.hermiteInterpolation(epsilon, 0, 1, 0, 10);
    const result4b = AnimationUtility.hermiteInterpolation(1 - epsilon, 0, 1, 0, 10);
    console.assert(result4a < 1, `Hermite should start slowly, got ${result4a}`);
    console.assert(result4b > 9, `Hermite should end slowly, got ${result4b}`);
    
    console.log('✓ AnimationUtility hermite interpolation tests passed');
}

/**
 * Test AnimationUtility array interpolation
 */
export function testAnimationUtilityArrayInterpolation() {
    console.log('Testing AnimationUtility array interpolation...');
    
    const minArray = [0, 10, 20];
    const maxArray = [10, 30, 40];
    
    // Test linear array interpolation
    const result1 = AnimationUtility.linearInterpolationArray(0.5, 0, 1, minArray, maxArray);
    console.assert(result1.length === 3, 'Result array should have same length');
    console.assert(result1[0] === 5, `First element should be 5, got ${result1[0]}`);
    console.assert(result1[1] === 20, `Second element should be 20, got ${result1[1]}`);
    console.assert(result1[2] === 30, `Third element should be 30, got ${result1[2]}`);
    
    // Test with destination array
    const dst = new Array(3);
    const result2 = AnimationUtility.linearInterpolationArray(0.25, 0, 1, minArray, maxArray, dst);
    console.assert(result2 === dst, 'Should return the same destination array');
    console.assert(dst[0] === 2.5, `First element should be 2.5, got ${dst[0]}`);
    
    console.log('✓ AnimationUtility array interpolation tests passed');
}

/**
 * Test AnimationUtility getStandardTime
 */
export function testAnimationUtilityGetStandardTime() {
    console.log('Testing AnimationUtility getStandardTime...');
    
    // Test normal range
    const result1 = AnimationUtility.getStandardTime(0.5, 0, 1);
    console.assert(result1 === 0.5, `Standard time should be 0.5, got ${result1}`);
    
    // Test boundary conditions
    const result2 = AnimationUtility.getStandardTime(-0.5, 0, 1);
    console.assert(result2 === 0.0, `Time below minimum should return 0.0, got ${result2}`);
    
    const result3 = AnimationUtility.getStandardTime(1.5, 0, 1);
    console.assert(result3 === 1.0, `Time above maximum should return 1.0, got ${result3}`);
    
    // Test different ranges
    const result4 = AnimationUtility.getStandardTime(1.5, 1, 2);
    console.assert(result4 === 0.5, `Standard time with different range should work, got ${result4}`);
    
    console.log('✓ AnimationUtility getStandardTime tests passed');
}

// Jest runner
describe('AnimationUtility (legacy assertions)', () => {
  /** @type {import('@jest/globals').SpyInstance} */
  let logSpy;
  /** @type {import('@jest/globals').SpyInstance} */
  let assertSpy;

  beforeAll(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    assertSpy = jest.spyOn(console, 'assert').mockImplementation((condition, ...args) => {
      if (!condition) {
        throw new Error(args.join(' ') || 'console.assert failed');
      }
    });
  });

  afterAll(() => {
    logSpy?.mockRestore();
    assertSpy?.mockRestore();
  });

  test('constants', () => testAnimationUtilityConstants());
  test('linearInterpolation', () => testAnimationUtilityLinearInterpolation());
  test('hermiteInterpolation', () => testAnimationUtilityHermiteInterpolation());
  test('arrayInterpolation', () => testAnimationUtilityArrayInterpolation());
  test('getStandardTime', () => testAnimationUtilityGetStandardTime());
});
