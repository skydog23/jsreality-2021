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
 * @fileoverview Tests for TimeDescriptor class.
 */

import { TimeDescriptor } from '../TimeDescriptor.js';

/**
 * Test TimeDescriptor basic functionality
 */
export function testTimeDescriptorBasic() {
    console.log('Testing TimeDescriptor basic functionality...');
    
    // Test default constructor
    const td1 = new TimeDescriptor();
    console.assert(td1.getTime() === 0, 'Default constructor should set time to 0');
    console.assert(td1.getLastModified() > 0, 'Last modified should be set');
    
    // Test constructor with time
    const td2 = new TimeDescriptor(5.5);
    console.assert(td2.getTime() === 5.5, 'Constructor should set specified time');
    
    // Test setTime
    const initialModified = td1.getLastModified();
    // Small delay to ensure timestamp changes
    setTimeout(() => {
        td1.setTime(3.14);
        console.assert(td1.getTime() === 3.14, 'setTime should update time value');
        console.assert(td1.getLastModified() > initialModified, 'setTime should update last modified');
        
        console.log('✓ TimeDescriptor basic tests passed');
    }, 1);
}

/**
 * Test TimeDescriptor with timestamp
 */
export function testTimeDescriptorWithTimestamp() {
    console.log('Testing TimeDescriptor with timestamp...');
    
    const td = new TimeDescriptor();
    const customTimestamp = 1234567890;
    
    td.setTimeWithTimestamp(2.5, customTimestamp);
    console.assert(td.getTime() === 2.5, 'setTimeWithTimestamp should set time');
    console.assert(td.getLastModified() === customTimestamp, 'setTimeWithTimestamp should set custom timestamp');
    
    console.log('✓ TimeDescriptor timestamp tests passed');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    testTimeDescriptorBasic();
    setTimeout(() => testTimeDescriptorWithTimestamp(), 10);
}
