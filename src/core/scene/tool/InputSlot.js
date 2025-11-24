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
 * Abstract input device, addressed via a logical name.
 * Uses singleton pattern - devices with the same name yield the same instance.
 */
export class InputSlot {
  /** @type {Map<string, InputSlot>} Private registry for singleton instances */
  static #name2device = new Map();
  
  /** @type {number} Cached hash code */
  #hash;
  
  /** @type {string} Device name */
  #name;
  
  /**
   * Private constructor - use getDevice() to create instances
   * @param {string} name - The logical name of the device
   * @private
   */
  constructor(name) {
    this.#name = name;
    this.#hash = this.#hashCode(name);
  }
  
  /**
   * Get the canonical device for the logical name. Devices with the
   * same name are meant to represent the same device and yield the
   * same instance.
   * @param {string} name - The logical name of the device
   * @returns {InputSlot} The singleton InputSlot instance for this name
   */
  static getDevice(name) {
    if (InputSlot.#name2device.has(name)) {
      return InputSlot.#name2device.get(name);
    }
    const slot = new InputSlot(name);
    InputSlot.#name2device.set(name, slot);
    return slot;
  }
  
  /**
   * Get the name of this input slot
   * @returns {string} The device name
   */
  getName() {
    return this.#name;
  }
  
  /**
   * Get the hash code for this input slot
   * @returns {number} The hash code
   */
  hashCode() {
    return this.#hash;
  }
  
  /**
   * Check equality with another object
   * @param {*} obj - Object to compare
   * @returns {boolean} True if equal
   */
  equals(obj) {
    if (this === obj) return true;
    if (obj === null || obj === undefined) return false;
    if (!(obj instanceof InputSlot)) return false;
    return this.#name === obj.#name;
  }
  
  /**
   * String representation
   * @returns {string} The device name
   */
  toString() {
    return this.#name;
  }
  
  /**
   * Compute hash code for a string
   * @param {string} str - String to hash
   * @returns {number} Hash code
   * @private
   */
  #hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
  
  // Predefined input slots
  
  /** Pointer hit detection slot */
  static POINTER_HIT = InputSlot.getDevice("PointerHit");
  
  /** Pointer transformation slot (4x4 matrix) */
  static POINTER_TRANSFORMATION = InputSlot.getDevice("PointerTransformation");
  
  /** System time slot */
  static SYSTEM_TIME = InputSlot.getDevice("SystemTime");
  
  // Built-in button slots: only first three are guaranteed to exist
  /** Left button (PrimaryAction) */
  static LEFT_BUTTON = InputSlot.getDevice("PrimaryAction");
  
  /** Middle button (PrimaryMenu) */
  static MIDDLE_BUTTON = InputSlot.getDevice("PrimaryMenu");
  
  /** Right button (PrimarySelection) */
  static RIGHT_BUTTON = InputSlot.getDevice("PrimarySelection");
  
  // WARNING: following slots are NOT guaranteed to exist: for sure on desktop w/ shift modifier
  /** Shift+Left button (SecondaryAction) */
  static SHIFT_LEFT_BUTTON = InputSlot.getDevice("SecondaryAction");
  
  /** Shift+Middle button (SecondaryMenu) */
  static SHIFT_MIDDLE_BUTTON = InputSlot.getDevice("SecondaryMenu");
  
  /** Shift+Right button (SecondarySelection) */
  static SHIFT_RIGHT_BUTTON = InputSlot.getDevice("SecondarySelection");
  
  /**
   * Meta/Control+Left button (TertiaryAction)
   * This input slot can be used for customized tools. The standard key is CONTROL+mouseclick.
   * If you want to use ALT+mouseclick instead, configure the mapping accordingly.
   * Be aware that most operating systems use ALT+mouseclick for moving windows.
   */
  static META_LEFT_BUTTON = InputSlot.getDevice("TertiaryAction");
  
  /** Meta/Control+Middle button (TertiaryMenu) */
  static META_MIDDLE_BUTTON = InputSlot.getDevice("TertiaryMenu");
  
  /** Meta/Control+Right button (TertiarySelection) */
  static META_RIGHT_BUTTON = InputSlot.getDevice("TertiarySelection");
}
