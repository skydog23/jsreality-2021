/**
 * @fileoverview Tests for AnimatedDoubleArraySet class.
 */

import { AnimatedDoubleArraySet } from '../AnimatedDoubleArraySet.js';
import { InterpolationTypes } from '../../util/AnimationUtility.js';

/**
 * Test AnimatedDoubleArraySet basic functionality
 */
export function testAnimatedDoubleArraySetBasic() {
    console.log('Testing AnimatedDoubleArraySet basic functionality...');
    
    // Create test data: 3 keyframes, 2 elements per keyframe
    const dkeySet = [0.0, 1.0, 1.0]; // times: 0, 1, 2
    const valueSet = [
        [1.0, 2.0], // t=0: [1, 2]
        [3.0, 4.0], // t=1: [3, 4]
        [5.0, 6.0]  // t=2: [5, 6]
    ];
    
    const animSet = new AnimatedDoubleArraySet(dkeySet, valueSet, InterpolationTypes.LINEAR);
    
    console.assert(animSet.getTMin() === 0.0, 'Min time should be 0.0');
    console.assert(animSet.getTMax() === 2.0, 'Max time should be 2.0');
    console.assert(animSet.getElementCount() === 2, 'Should have 2 elements');
    console.assert(animSet.getKeyFrameCount() === 3, 'Should have 3 keyframes');
    
    console.log('✓ AnimatedDoubleArraySet basic tests passed');
}

/**
 * Test AnimatedDoubleArraySet linear interpolation
 */
export function testAnimatedDoubleArraySetInterpolation() {
    console.log('Testing AnimatedDoubleArraySet interpolation...');
    
    const dkeySet = [0.0, 2.0]; // times: 0, 2
    const valueSet = [
        [0.0, 10.0], // t=0: [0, 10]
        [4.0, 30.0]  // t=2: [4, 30]
    ];
    
    const animSet = new AnimatedDoubleArraySet(dkeySet, valueSet, InterpolationTypes.LINEAR);
    
    // Test interpolation at t=1 (midpoint)
    const result = animSet.getValuesAtTime(1.0);
    console.assert(result.length === 2, 'Result should have 2 elements');
    console.assert(result[0] === 2.0, `First element should be 2.0, got ${result[0]}`);
    console.assert(result[1] === 20.0, `Second element should be 20.0, got ${result[1]}`);
    
    // Test boundary values
    const resultStart = animSet.getValuesAtTime(0.0);
    console.assert(resultStart[0] === 0.0 && resultStart[1] === 10.0, 'Start values should match');
    
    const resultEnd = animSet.getValuesAtTime(2.0);
    console.assert(resultEnd[0] === 4.0 && resultEnd[1] === 30.0, 'End values should match');
    
    console.log('✓ AnimatedDoubleArraySet interpolation tests passed');
}

/**
 * Test AnimatedDoubleArraySet constant interpolation
 */
export function testAnimatedDoubleArraySetConstant() {
    console.log('Testing AnimatedDoubleArraySet constant interpolation...');
    
    const dkeySet = [0.0, 1.0];
    const valueSet = [
        [1.0, 2.0],
        [3.0, 4.0]
    ];
    
    const animSet = new AnimatedDoubleArraySet(dkeySet, valueSet, InterpolationTypes.CONSTANT);
    
    // With constant interpolation, should get the previous keyframe's values
    const result = animSet.getValuesAtTime(0.5);
    console.assert(result[0] === 1.0 && result[1] === 2.0, 'Should use constant (previous) values');
    
    console.log('✓ AnimatedDoubleArraySet constant interpolation tests passed');
}

/**
 * Test AnimatedDoubleArraySet with destination array
 */
export function testAnimatedDoubleArraySetDestination() {
    console.log('Testing AnimatedDoubleArraySet with destination array...');
    
    const dkeySet = [0.0, 1.0];
    const valueSet = [
        [1.0, 2.0],
        [3.0, 4.0]
    ];
    
    const animSet = new AnimatedDoubleArraySet(dkeySet, valueSet, InterpolationTypes.LINEAR);
    const dest = new Array(2);
    
    const result = animSet.getValuesAtTime(0.5, dest);
    console.assert(result === dest, 'Should return the same destination array');
    console.assert(dest[0] === 2.0 && dest[1] === 3.0, 'Destination should have interpolated values');
    
    console.log('✓ AnimatedDoubleArraySet destination array tests passed');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    testAnimatedDoubleArraySetBasic();
    testAnimatedDoubleArraySetInterpolation();
    testAnimatedDoubleArraySetConstant();
    testAnimatedDoubleArraySetDestination();
}
