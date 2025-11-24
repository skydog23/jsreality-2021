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
 * @fileoverview Tests for SortedKeyFrameList class.
 */

import { SortedKeyFrameList } from '../SortedKeyFrameList.js';
import { KeyFrame } from '../KeyFrame.js';
import { TimeDescriptor } from '../TimeDescriptor.js';

/**
 * Test SortedKeyFrameList basic functionality
 */
export function testSortedKeyFrameListBasic() {
    console.log('Testing SortedKeyFrameList basic functionality...');
    
    const list = new SortedKeyFrameList();
    
    // Test empty list
    console.assert(list.size() === 0, 'New list should be empty');
    console.assert(list.getTmin() === 0.0, 'Empty list getTmin should return 0.0');
    console.assert(list.getTmax() === 0.0, 'Empty list getTmax should return 0.0');
    
    console.log('✓ SortedKeyFrameList basic tests passed');
}

/**
 * Test SortedKeyFrameList sorted insertion
 */
export function testSortedKeyFrameListInsertion() {
    console.log('Testing SortedKeyFrameList sorted insertion...');
    
    const list = new SortedKeyFrameList();
    
    // Add keyframes out of order
    const kf1 = new KeyFrame(new TimeDescriptor(3.0), 'third');
    const kf2 = new KeyFrame(new TimeDescriptor(1.0), 'first');
    const kf3 = new KeyFrame(new TimeDescriptor(2.0), 'second');
    
    list.add(kf1);
    list.add(kf2);
    list.add(kf3);
    
    // Check they are sorted by time
    console.assert(list.size() === 3, 'List should have 3 keyframes');
    console.assert(list.get(0).getTime() === 1.0, 'First keyframe should have time 1.0');
    console.assert(list.get(1).getTime() === 2.0, 'Second keyframe should have time 2.0');
    console.assert(list.get(2).getTime() === 3.0, 'Third keyframe should have time 3.0');
    
    console.assert(list.get(0).getValue() === 'first', 'First keyframe should have value "first"');
    console.assert(list.get(1).getValue() === 'second', 'Second keyframe should have value "second"');
    console.assert(list.get(2).getValue() === 'third', 'Third keyframe should have value "third"');
    
    console.log('✓ SortedKeyFrameList insertion tests passed');
}

/**
 * Test SortedKeyFrameList time bounds
 */
export function testSortedKeyFrameListTimeBounds() {
    console.log('Testing SortedKeyFrameList time bounds...');
    
    const list = new SortedKeyFrameList();
    
    list.add(new KeyFrame(new TimeDescriptor(2.5), 'middle'));
    list.add(new KeyFrame(new TimeDescriptor(0.5), 'start'));
    list.add(new KeyFrame(new TimeDescriptor(4.5), 'end'));
    
    console.assert(list.getTmin() === 0.5, 'getTmin should return 0.5');
    console.assert(list.getTmax() === 4.5, 'getTmax should return 4.5');
    
    console.log('✓ SortedKeyFrameList time bounds tests passed');
}

/**
 * Test SortedKeyFrameList existing keyframe search
 */
export function testSortedKeyFrameListExistingKeyFrame() {
    console.log('Testing SortedKeyFrameList existing keyframe search...');
    
    const list = new SortedKeyFrameList();
    const td1 = new TimeDescriptor(1.5);
    const td2 = new TimeDescriptor(2.5);
    const td3 = new TimeDescriptor(3.5);
    
    const kf1 = new KeyFrame(td1, 'first');
    const kf2 = new KeyFrame(td2, 'second');
    
    list.add(kf1);
    list.add(kf2);
    
    // Test finding existing keyframes
    console.assert(list.existingKeyFrameAt(td1) === kf1, 'Should find existing keyframe with td1');
    console.assert(list.existingKeyFrameAt(td2) === kf2, 'Should find existing keyframe with td2');
    console.assert(list.existingKeyFrameAt(td3) === null, 'Should not find keyframe with td3');
    
    console.log('✓ SortedKeyFrameList existing keyframe tests passed');
}

/**
 * Test SortedKeyFrameList segment finding
 */
export function testSortedKeyFrameListSegments() {
    console.log('Testing SortedKeyFrameList segment finding...');
    
    const list = new SortedKeyFrameList();
    
    list.add(new KeyFrame(new TimeDescriptor(1.0), 'a'));
    list.add(new KeyFrame(new TimeDescriptor(3.0), 'b'));
    list.add(new KeyFrame(new TimeDescriptor(5.0), 'c'));
    
    // Test segment finding
    console.assert(list.getSegmentAtTime(0.5) === -1, 'Time before first keyframe should return -1');
    console.assert(list.getSegmentAtTime(1.5) === 0, 'Time between first and second should return 0');
    console.assert(list.getSegmentAtTime(4.0) === 1, 'Time between second and third should return 1');
    console.assert(list.getSegmentAtTime(6.0) === 2, 'Time after last keyframe should return 2');
    
    console.log('✓ SortedKeyFrameList segment tests passed');
}

/**
 * Test SortedKeyFrameList removal
 */
export function testSortedKeyFrameListRemoval() {
    console.log('Testing SortedKeyFrameList removal...');
    
    const list = new SortedKeyFrameList();
    const kf1 = new KeyFrame(new TimeDescriptor(1.0), 'first');
    const kf2 = new KeyFrame(new TimeDescriptor(2.0), 'second');
    const kf3 = new KeyFrame(new TimeDescriptor(3.0), 'third');
    
    list.add(kf1);
    list.add(kf2);
    list.add(kf3);
    
    // Test removal
    console.assert(list.remove(kf2) === true, 'Should successfully remove existing keyframe');
    console.assert(list.size() === 2, 'List should have 2 keyframes after removal');
    console.assert(list.get(0) === kf1, 'First keyframe should still be kf1');
    console.assert(list.get(1) === kf3, 'Second keyframe should now be kf3');
    
    // Test removal of non-existent keyframe
    console.assert(list.remove(kf2) === false, 'Should return false when removing non-existent keyframe');
    
    // Test removeAt
    const removed = list.removeAt(0);
    console.assert(removed === kf1, 'removeAt should return the removed keyframe');
    console.assert(list.size() === 1, 'List should have 1 keyframe after removeAt');
    
    // Test clear
    list.clear();
    console.assert(list.size() === 0, 'List should be empty after clear');
    
    console.log('✓ SortedKeyFrameList removal tests passed');
}

/**
 * Test SortedKeyFrameList iteration
 */
export function testSortedKeyFrameListIteration() {
    console.log('Testing SortedKeyFrameList iteration...');
    
    const list = new SortedKeyFrameList();
    const values = ['first', 'second', 'third'];
    const times = [1.0, 2.0, 3.0];
    
    for (let i = 0; i < values.length; i++) {
        list.add(new KeyFrame(new TimeDescriptor(times[i]), values[i]));
    }
    
    // Test iterator
    let index = 0;
    for (const kf of list) {
        console.assert(kf.getTime() === times[index], `Iterator keyframe ${index} should have correct time`);
        console.assert(kf.getValue() === values[index], `Iterator keyframe ${index} should have correct value`);
        index++;
    }
    console.assert(index === 3, 'Iterator should have iterated over 3 keyframes');
    
    // Test toArray
    const array = list.toArray();
    console.assert(array.length === 3, 'toArray should return array of length 3');
    console.assert(array[0].getValue() === 'first', 'Array should contain correct values');
    
    console.log('✓ SortedKeyFrameList iteration tests passed');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    testSortedKeyFrameListBasic();
    testSortedKeyFrameListInsertion();
    testSortedKeyFrameListTimeBounds();
    testSortedKeyFrameListExistingKeyFrame();
    testSortedKeyFrameListSegments();
    testSortedKeyFrameListRemoval();
    testSortedKeyFrameListIteration();
}
