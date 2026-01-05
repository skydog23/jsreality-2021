/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview Tests for AnimatedRectangle2DSet class.
 */

import { AnimatedRectangle2DSet } from '../AnimatedRectangle2DSet.js';
import { InterpolationTypes, BoundaryModes } from '../../util/AnimationUtility.js';
import { jest } from '@jest/globals';

/**
 * Test AnimatedRectangle2DSet basic functionality
 */
export function testAnimatedRectangle2DSetBasic() {
    console.log('Testing AnimatedRectangle2DSet basic functionality...');
    
    // Create test rectangles
    const rect1 = AnimatedRectangle2DSet.createRectangle(0, 0, 10, 10);
    const rect2 = AnimatedRectangle2DSet.createRectangle(5, 5, 20, 20);
    const rect3 = AnimatedRectangle2DSet.createRectangle(10, 10, 30, 30);
    
    // Create test data: 2 elements, 2 keyframes each
    const dkeySet = [
        [0.0, 2.0], // Element 0: times 0, 2
        [0.0, 1.0]  // Element 1: times 0, 1
    ];
    const valueSet = [
        [rect1, rect2], // Element 0: rect1 at t=0, rect2 at t=2
        [rect2, rect3]  // Element 1: rect2 at t=0, rect3 at t=1
    ];
    
    const animSet = new AnimatedRectangle2DSet(dkeySet, valueSet);
    
    console.assert(animSet.getTMin() === 0.0, 'Min time should be 0.0');
    console.assert(animSet.getTMax() === 2.0, 'Max time should be 2.0');
    console.assert(animSet.getElementCount() === 2, 'Should have 2 elements');
    console.assert(animSet.getKeyFrameCount(0) === 2, 'Element 0 should have 2 keyframes');
    console.assert(animSet.getKeyFrameCount(1) === 2, 'Element 1 should have 2 keyframes');
    
    console.log('✓ AnimatedRectangle2DSet basic tests passed');
}

/**
 * Test AnimatedRectangle2DSet linear interpolation
 */
export function testAnimatedRectangle2DSetInterpolation() {
    console.log('Testing AnimatedRectangle2DSet interpolation...');
    
    const rect1 = AnimatedRectangle2DSet.createRectangle(0, 0, 10, 10);
    const rect2 = AnimatedRectangle2DSet.createRectangle(4, 4, 20, 20);
    
    // Single element with linear interpolation
    const dkeySet = [[0.0, 2.0]]; // times: 0, 2
    const valueSet = [[rect1, rect2]];
    const interpType = [InterpolationTypes.LINEAR];
    
    const animSet = new AnimatedRectangle2DSet(dkeySet, valueSet, interpType);
    
    // Test interpolation at t=1 (midpoint)
    const result = animSet.getValuesAtTime(1.0);
    console.assert(result.length === 1, 'Result should have 1 element');
    
    const interpolatedRect = result[0];
    console.assert(interpolatedRect.getX() === 2, `X should be 2, got ${interpolatedRect.getX()}`);
    console.assert(interpolatedRect.getY() === 2, `Y should be 2, got ${interpolatedRect.getY()}`);
    console.assert(interpolatedRect.getWidth() === 15, `Width should be 15, got ${interpolatedRect.getWidth()}`);
    console.assert(interpolatedRect.getHeight() === 15, `Height should be 15, got ${interpolatedRect.getHeight()}`);
    
    console.log('✓ AnimatedRectangle2DSet interpolation tests passed');
}

/**
 * Test AnimatedRectangle2DSet constant interpolation
 */
export function testAnimatedRectangle2DSetConstant() {
    console.log('Testing AnimatedRectangle2DSet constant interpolation...');
    
    const rect1 = AnimatedRectangle2DSet.createRectangle(0, 0, 10, 10);
    const rect2 = AnimatedRectangle2DSet.createRectangle(4, 4, 20, 20);
    
    const dkeySet = [[0.0, 2.0]];
    const valueSet = [[rect1, rect2]];
    const interpType = [InterpolationTypes.CONSTANT];
    
    const animSet = new AnimatedRectangle2DSet(dkeySet, valueSet, interpType);
    
    // With constant interpolation, should get the previous keyframe's value
    const result = animSet.getValuesAtTime(1.0);
    const constantRect = result[0];
    
    console.assert(constantRect === rect1, 'Should use constant (previous) rectangle');
    console.assert(constantRect.getX() === 0, 'Constant rect should have original X');
    console.assert(constantRect.getWidth() === 10, 'Constant rect should have original width');
    
    console.log('✓ AnimatedRectangle2DSet constant interpolation tests passed');
}

/**
 * Test AnimatedRectangle2DSet boundary handling
 */
export function testAnimatedRectangle2DSetBoundaries() {
    console.log('Testing AnimatedRectangle2DSet boundary handling...');
    
    const rect1 = AnimatedRectangle2DSet.createRectangle(0, 0, 10, 10);
    const rect2 = AnimatedRectangle2DSet.createRectangle(10, 10, 20, 20);
    
    const dkeySet = [[1.0, 1.0]]; // times: 1, 2
    const valueSet = [[rect1, rect2]];
    
    const animSet = new AnimatedRectangle2DSet(dkeySet, valueSet);
    
    // Test before first keyframe
    const beforeResult = animSet.getValuesAtTime(0.5);
    console.assert(beforeResult[0] === rect1, 'Should clamp to first rectangle before start time');
    
    // Test after last keyframe
    const afterResult = animSet.getValuesAtTime(2.5);
    console.assert(afterResult[0] === rect2, 'Should clamp to last rectangle after end time');
    
    console.log('✓ AnimatedRectangle2DSet boundary handling tests passed');
}

/**
 * Test AnimatedRectangle2DSet utility methods
 */
export function testAnimatedRectangle2DSetUtilities() {
    console.log('Testing AnimatedRectangle2DSet utility methods...');
    
    const rect1 = AnimatedRectangle2DSet.createRectangle(0, 0, 10, 10);
    const rect2 = AnimatedRectangle2DSet.createRectangle(5, 5, 15, 15);
    const rect3 = AnimatedRectangle2DSet.createRectangle(20, 20, 5, 5);
    
    const dkeySet = [
        [0.0, 1.0],
        [0.0, 1.0]
    ];
    const valueSet = [
        [rect1, rect2],
        [rect2, rect3]
    ];
    
    const animSet = new AnimatedRectangle2DSet(dkeySet, valueSet);
    
    // Test bounding rectangle at t=0
    const boundingRect = animSet.getBoundingRectangleAtTime(0.0);
    console.assert(boundingRect.getX() === 0, 'Bounding rect X should be 0');
    console.assert(boundingRect.getY() === 0, 'Bounding rect Y should be 0');
    console.assert(boundingRect.getWidth() === 20, 'Bounding rect width should be 20'); // 0 to 20
    console.assert(boundingRect.getHeight() === 20, 'Bounding rect height should be 20'); // 0 to 20
    
    // Test total area at t=0
    const totalArea = animSet.getTotalAreaAtTime(0.0);
    const expectedArea = (10 * 10) + (15 * 15); // rect1 + rect2 areas
    console.assert(totalArea === expectedArea, `Total area should be ${expectedArea}, got ${totalArea}`);
    
    console.log('✓ AnimatedRectangle2DSet utility tests passed');
}

/**
 * Test AnimatedRectangle2DSet rectangle creation
 */
export function testAnimatedRectangle2DSetRectangleCreation() {
    console.log('Testing AnimatedRectangle2DSet rectangle creation...');
    
    const rect = AnimatedRectangle2DSet.createRectangle(10, 20, 30, 40);
    
    console.assert(rect.getX() === 10, 'X should be 10');
    console.assert(rect.getY() === 20, 'Y should be 20');
    console.assert(rect.getWidth() === 30, 'Width should be 30');
    console.assert(rect.getHeight() === 40, 'Height should be 40');
    console.assert(typeof rect.toString === 'function', 'Should have toString method');
    
    const str = rect.toString();
    console.assert(str.includes('10') && str.includes('20') && str.includes('30') && str.includes('40'), 
                  'toString should include all values');
    
    console.log('✓ AnimatedRectangle2DSet rectangle creation tests passed');
}

// Jest runner (turn legacy console.assert checks into test failures)
describe('AnimatedRectangle2DSet (legacy assertions)', () => {
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

  test('basic', () => testAnimatedRectangle2DSetBasic());
  test('interpolation', () => testAnimatedRectangle2DSetInterpolation());
  test('constant interpolation', () => testAnimatedRectangle2DSetConstant());
  test('boundaries', () => testAnimatedRectangle2DSetBoundaries());
  test('utilities', () => testAnimatedRectangle2DSetUtilities());
  test('rectangle creation', () => testAnimatedRectangle2DSetRectangleCreation());
});
