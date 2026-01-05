/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview TimeDescriptor class representing a time value with modification tracking.
 * @author Charles Gunn
 */

/**
 * A class that represents a time value as a double.
 * It's wrapped in this class primarily to allow for editing the
 * time value and having many instances of KeyFrame automatically be reset
 * to the edited time (since they all share the same instance of TimeDescriptor).
 */
export class TimeDescriptor {
    /**
     * Creates a new TimeDescriptor.
     * @param {number} [currentTime=0] - The initial time value
     */
    constructor(currentTime = 0) {
        /** @type {number} */
        this.time = 0;
        
        /** @type {number} */
        this.lastModified = 0;
        
        this.setTime(currentTime);
    }

    /**
     * Sets the time value with current timestamp.
     * @param {number} t - The time value to set
     */
    setTime(t) {
        this.setTimeWithTimestamp(t, Date.now());
    }

    /**
     * Sets the time value with a specific timestamp.
     * @param {number} t - The time value to set
     * @param {number} timestamp - The timestamp when this change occurred
     */
    setTimeWithTimestamp(t, timestamp) {
        this.time = t;
        this.lastModified = timestamp;
    }

    /**
     * Gets the current time value.
     * @returns {number} The current time
     */
    getTime() {
        return this.time;
    }

    /**
     * Gets the timestamp of the last modification.
     * @returns {number} The last modified timestamp
     */
    getLastModified() {
        return this.lastModified;
    }
}
