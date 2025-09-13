/**
 * @fileoverview Tests for KeyFrame class.
 */

import { KeyFrame } from '../KeyFrame.js';
import { TimeDescriptor } from '../TimeDescriptor.js';

/**
 * Test KeyFrame basic functionality
 */
export function testKeyFrameBasic() {
    console.log('Testing KeyFrame basic functionality...');
    
    // Test default constructor
    const kf1 = new KeyFrame();
    console.assert(kf1.getTime() === 0, 'Default constructor should create keyframe at time 0');
    console.assert(kf1.getValue() === null, 'Default constructor should have null value');
    console.assert(kf1.getTimeDescriptor() instanceof TimeDescriptor, 'Should have TimeDescriptor');
    
    // Test constructor with TimeDescriptor and value
    const td = new TimeDescriptor(2.5);
    const value = "test value";
    const kf2 = new KeyFrame(td, value);
    
    console.assert(kf2.getTime() === 2.5, 'Constructor should use provided time');
    console.assert(kf2.getValue() === value, 'Constructor should use provided value');
    console.assert(kf2.getTimeDescriptor() === td, 'Constructor should use provided TimeDescriptor');
    
    console.log('✓ KeyFrame basic tests passed');
}

/**
 * Test KeyFrame time manipulation
 */
export function testKeyFrameTimeManipulation() {
    console.log('Testing KeyFrame time manipulation...');
    
    const kf = new KeyFrame();
    
    // Test setTime
    kf.setTime(1.5);
    console.assert(kf.getTime() === 1.5, 'setTime should update time value');
    
    // Test that changing time affects the underlying TimeDescriptor
    const originalTd = kf.getTimeDescriptor();
    kf.setTime(3.0);
    console.assert(originalTd.getTime() === 3.0, 'setTime should modify original TimeDescriptor');
    
    console.log('✓ KeyFrame time manipulation tests passed');
}

/**
 * Test KeyFrame value manipulation
 */
export function testKeyFrameValueManipulation() {
    console.log('Testing KeyFrame value manipulation...');
    
    const kf = new KeyFrame();
    
    // Test setValue with different types
    kf.setValue(42);
    console.assert(kf.getValue() === 42, 'setValue should work with numbers');
    
    kf.setValue("hello");
    console.assert(kf.getValue() === "hello", 'setValue should work with strings');
    
    const obj = { x: 1, y: 2 };
    kf.setValue(obj);
    console.assert(kf.getValue() === obj, 'setValue should work with objects');
    
    console.log('✓ KeyFrame value manipulation tests passed');
}

/**
 * Test KeyFrame toString
 */
export function testKeyFrameToString() {
    console.log('Testing KeyFrame toString...');
    
    const kf = new KeyFrame(new TimeDescriptor(1.5), "test");
    const str = kf.toString();
    console.assert(str.includes('1.5'), 'toString should include time');
    console.assert(str.includes('test'), 'toString should include value');
    
    console.log('✓ KeyFrame toString tests passed');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    testKeyFrameBasic();
    testKeyFrameTimeManipulation();
    testKeyFrameValueManipulation();
    testKeyFrameToString();
}
