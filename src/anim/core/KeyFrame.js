/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview KeyFrame class representing a key/value pair for animation.
 * @author Charles Gunn
 */

import { TimeDescriptor } from './TimeDescriptor.js';

/**
 * A key/value pair, where the key is of type TimeDescriptor and the
 * value is of type T. This is the fundamental building block of keyframe animation.
 * @template T The type of the value stored in this keyframe
 */
export class KeyFrame {
    /**
     * Creates a new KeyFrame.
     * @param {TimeDescriptor} [timeDescriptor] - The time descriptor for this keyframe
     * @param {T} [value] - The value at this keyframe
     */
    constructor(timeDescriptor, value) {
        /** @type {TimeDescriptor} */
        this.td = timeDescriptor || new TimeDescriptor(0);
        
        /** @type {T} */
        // Preserve valid falsy values like 0, false, '' (Java semantics: allow any value).
        this.value = (typeof value === 'undefined') ? null : value;
    }

    /**
     * Gets the TimeDescriptor for this keyframe.
     * @returns {TimeDescriptor} The time descriptor
     */
    getTimeDescriptor() {
        return this.td;
    }

    /**
     * Gets the time value of this keyframe.
     * @returns {number} The time value
     */
    getTime() {
        return this.td.getTime();
    }

    /**
     * Sets the time value of this keyframe.
     * @param {number} t - The new time value
     */
    setTime(t) {
        this.td.setTime(t);
    }

    /**
     * Gets the value stored in this keyframe.
     * @returns {T} The stored value
     */
    getValue() {
        return this.value;
    }

    /**
     * Sets the value for this keyframe.
     * @param {T} v - The value to store
     */
    setValue(v) {
        this.value = v;
    }

    /**
     * Creates a string representation of this keyframe.
     * @returns {string} String representation
     */
    toString() {
        return `KeyFrame(t=${this.getTime()}, value=${this.value})`;
    }
}
