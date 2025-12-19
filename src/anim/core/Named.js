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
