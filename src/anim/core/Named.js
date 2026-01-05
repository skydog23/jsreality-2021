/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview Named interface for objects that can have a name.
 * @author Charles Gunn
 */

/**
 * Interface for objects that can be named.
 * @interface Named
 */
export class Named {
    /**
     * Sets the name of this object.
     * @param {string} name - The name to set
     */
    setName(name) {
        throw new Error('Named.setName() must be implemented by subclass');
    }

    /**
     * Gets the name of this object.
     * @returns {string} The current name
     */
    getName() {
        throw new Error('Named.getName() must be implemented by subclass');
    }
}
