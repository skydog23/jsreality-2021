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
 * @fileoverview Tests for KeyFrameAnimatedDouble class.
 */

import { KeyFrameAnimatedDouble } from '../KeyFrameAnimatedDouble.js';
import { TimeDescriptor } from '../TimeDescriptor.js';
import { InterpolationTypes } from '../../util/AnimationUtility.js';
import { jest } from '@jest/globals';

/**
 * Test KeyFrameAnimatedDouble basic functionality
 */
export function testKeyFrameAnimatedDoubleBasic() {
    console.log('Testing KeyFrameAnimatedDouble basic functionality...');
    
    const animated = new KeyFrameAnimatedDouble(5.0);
    
    console.assert(animated.getCurrentValue() === 5.0, 'Initial value should be 5.0');
    console.assert(animated.getName().startsWith('keyFrameAnimated'), 'Should have default name');
    console.assert(animated.isWritable() === true, 'Should be writable by default');
    console.assert(animated.getKeyFrames().size() === 0, 'Should start with no keyframes');
    
    console.log('✓ KeyFrameAnimatedDouble basic tests passed');
}

/**
 * Test KeyFrameAnimatedDouble keyframe management
 */
export function testKeyFrameAnimatedDoubleKeyframes() {
    console.log('Testing KeyFrameAnimatedDouble keyframe management...');
    
    const animated = new KeyFrameAnimatedDouble();
    
    // Add keyframes
    animated.setCurrentValue(10.0);
    animated.addKeyFrame(new TimeDescriptor(0.0));
    
    animated.setCurrentValue(20.0);
    animated.addKeyFrame(new TimeDescriptor(1.0));
    
    animated.setCurrentValue(30.0);
    animated.addKeyFrame(new TimeDescriptor(2.0));
    
    console.assert(animated.getKeyFrames().size() === 3, 'Should have 3 keyframes');
    console.assert(animated.getKeyFrames().get(0).getValue() === 10.0, 'First keyframe should be 10.0');
    console.assert(animated.getKeyFrames().get(1).getValue() === 20.0, 'Second keyframe should be 20.0');
    console.assert(animated.getKeyFrames().get(2).getValue() === 30.0, 'Third keyframe should be 30.0');
    
    console.log('✓ KeyFrameAnimatedDouble keyframe tests passed');
}

/**
 * Test KeyFrameAnimatedDouble linear interpolation
 */
export function testKeyFrameAnimatedDoubleLinearInterpolation() {
    console.log('Testing KeyFrameAnimatedDouble linear interpolation...');
    
    const animated = new KeyFrameAnimatedDouble();
    animated.setInterpolationType(InterpolationTypes.LINEAR);
    
    // Set up keyframes: 0.0 at t=0, 10.0 at t=1
    animated.setCurrentValue(0.0);
    animated.addKeyFrame(new TimeDescriptor(0.0));
    
    animated.setCurrentValue(10.0);
    animated.addKeyFrame(new TimeDescriptor(1.0));
    
    // Test interpolation at t=0.5 (should be 5.0)
    animated.setValueAtTime(0.5);
    const interpolatedValue = animated.getCurrentValue();
    console.assert(Math.abs(interpolatedValue - 5.0) < 0.001, `Interpolated value should be 5.0, got ${interpolatedValue}`);
    
    // Test boundary values
    animated.setValueAtTime(0.0);
    console.assert(animated.getCurrentValue() === 0.0, 'Value at t=0 should be 0.0');
    
    animated.setValueAtTime(1.0);
    console.assert(animated.getCurrentValue() === 10.0, 'Value at t=1 should be 10.0');
    
    console.log('✓ KeyFrameAnimatedDouble linear interpolation tests passed');
}

/**
 * Test KeyFrameAnimatedDouble hermite interpolation
 */
export function testKeyFrameAnimatedDoubleHermiteInterpolation() {
    console.log('Testing KeyFrameAnimatedDouble hermite interpolation...');
    
    const animated = new KeyFrameAnimatedDouble();
    animated.setInterpolationType(InterpolationTypes.CUBIC_HERMITE);
    
    // Set up keyframes: 0.0 at t=0, 10.0 at t=1
    animated.setCurrentValue(0.0);
    animated.addKeyFrame(new TimeDescriptor(0.0));
    
    animated.setCurrentValue(10.0);
    animated.addKeyFrame(new TimeDescriptor(1.0));
    
    // Test hermite interpolation at t=0.25 (smoothstep differs from linear here)
    animated.setValueAtTime(0.25);
    const interpolatedValue = animated.getCurrentValue();
    
    // Hermite interpolation should give smoother curve than linear
    console.assert(interpolatedValue > 0 && interpolatedValue < 10, `Hermite interpolated value should be between 0 and 10, got ${interpolatedValue}`);
    // Linear at t=0.25 would be 2.5; smoothstep should start slower -> value < 2.5
    console.assert(interpolatedValue < 2.5, `Hermite (smoothstep) should start slower than linear, got ${interpolatedValue}`);
    
    console.log('✓ KeyFrameAnimatedDouble hermite interpolation tests passed');
}

/**
 * Test KeyFrameAnimatedDouble boundary handling
 */
export function testKeyFrameAnimatedDoubleBoundaryHandling() {
    console.log('Testing KeyFrameAnimatedDouble boundary handling...');
    
    const animated = new KeyFrameAnimatedDouble();
    
    // Set up keyframes: 5.0 at t=1, 15.0 at t=2
    animated.setCurrentValue(5.0);
    animated.addKeyFrame(new TimeDescriptor(1.0));
    
    animated.setCurrentValue(15.0);
    animated.addKeyFrame(new TimeDescriptor(2.0));
    
    // Test before first keyframe
    animated.setValueAtTime(0.5);
    console.assert(animated.getCurrentValue() === 5.0, 'Value before first keyframe should clamp to first value');
    
    // Test after last keyframe
    animated.setValueAtTime(2.5);
    console.assert(animated.getCurrentValue() === 15.0, 'Value after last keyframe should clamp to last value');
    
    console.log('✓ KeyFrameAnimatedDouble boundary handling tests passed');
}

/**
 * Test KeyFrameAnimatedDouble keyframe deletion
 */
export function testKeyFrameAnimatedDoubleKeyframeDeletion() {
    console.log('Testing KeyFrameAnimatedDouble keyframe deletion...');
    
    const animated = new KeyFrameAnimatedDouble();
    const td1 = new TimeDescriptor(1.0);
    const td2 = new TimeDescriptor(2.0);
    
    animated.setCurrentValue(10.0);
    animated.addKeyFrame(td1);
    
    animated.setCurrentValue(20.0);
    animated.addKeyFrame(td2);
    
    console.assert(animated.getKeyFrames().size() === 2, 'Should have 2 keyframes initially');
    
    // Delete first keyframe
    animated.deleteKeyFrame(td1);
    console.assert(animated.getKeyFrames().size() === 1, 'Should have 1 keyframe after deletion');
    console.assert(animated.getKeyFrames().get(0).getValue() === 20.0, 'Remaining keyframe should have value 20.0');
    
    console.log('✓ KeyFrameAnimatedDouble keyframe deletion tests passed');
}

// Jest runner (turn legacy console.assert checks into test failures)
describe('KeyFrameAnimatedDouble (legacy assertions)', () => {
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

  test('basic', () => testKeyFrameAnimatedDoubleBasic());
  test('keyframes', () => testKeyFrameAnimatedDoubleKeyframes());
  test('linear interpolation', () => testKeyFrameAnimatedDoubleLinearInterpolation());
  test('hermite interpolation', () => testKeyFrameAnimatedDoubleHermiteInterpolation());
  test('boundary handling', () => testKeyFrameAnimatedDoubleBoundaryHandling());
  test('keyframe deletion', () => testKeyFrameAnimatedDoubleKeyframeDeletion());
});
