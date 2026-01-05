/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview Settable interface for objects that can respond to time-based updates.
 * @author Charles Gunn
 */

/**
 * Interface for objects that can be set to a value at a specific time.
 * This is the minimal interface needed for animation playback.
 * @interface Settable
 */
export class Settable {
    /**
     * Sets the value of this object at the specified time.
     * This method is called during animation playback to update the object's state.
     * @param {number} t - The time at which to set the value
     */
    setValueAtTime(t) {
        throw new Error('Settable.setValueAtTime() must be implemented by subclass');
    }
}
