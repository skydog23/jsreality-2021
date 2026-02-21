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
  
  /** Pointer position in NDC (4x4 matrix whose translation encodes x/y in NDC) */
  static POINTER_NDC = InputSlot.getDevice("PointerNDC");

  /** Pointer delta/evolution in NDC (4x4 matrix whose translation encodes dx/dy in NDC) */
  static POINTER_EVOLUTION = InputSlot.getDevice("PointerEvolution");

  /** System time slot */
  static SYSTEM_TIME = InputSlot.getDevice("SystemTime");

  /** Mouse wheel up "clicks" */
  static WHEEL_UP = InputSlot.getDevice("WheelUp");

  /** Mouse wheel down "clicks" */
  static WHEEL_DOWN = InputSlot.getDevice("WheelDown");

  /** Toggle look/grab mode (used by mouse device) */
  static LOOK_SWITCH = InputSlot.getDevice("LookSwitch");

  /** Internal slot used by ToolSystem to force a deactivation on tool removal */
  static REMOVE = InputSlot.getDevice("remove");

  /** Implicit/derived slots used by DeviceManager */
  static AVATAR_TRANSFORMATION = InputSlot.getDevice("AvatarTransformation");
  static WORLD_TO_CAMERA = InputSlot.getDevice("WorldToCamera");
  static CAMERA_TO_WORLD = InputSlot.getDevice("CameraToWorld");
  static CAMERA_TO_NDC = InputSlot.getDevice("CameraToNDC");
  static NDC_TO_WORLD = InputSlot.getDevice("NDCToWorld");

  /** Virtual tool-activation slots (jReality-compatible naming) */
  static ROTATE_ACTIVATION = InputSlot.getDevice("RotateActivation");

  /** Virtual transformation slots (jReality-compatible naming) */
  static TRACKBALL_TRANSFORMATION = InputSlot.getDevice("TrackballTransformation");

  /** Virtual translation-only pointer transform (jReality-compatible naming) */
  static POINTER_TRANSLATION = InputSlot.getDevice("PointerTranslation");

  /** Delta translation transform between successive PointerTranslation events */
  static DELTA_TRANSLATION = InputSlot.getDevice("DeltaTranslation");

  /** Common keyboard slots (mapped by default configuration) */
  static VK_W = InputSlot.getDevice("VK_W");
  static VK_A = InputSlot.getDevice("VK_A");
  static VK_S = InputSlot.getDevice("VK_S");
  static VK_D = InputSlot.getDevice("VK_D");
  static VK_UP = InputSlot.getDevice("VK_UP");
  static VK_DOWN = InputSlot.getDevice("VK_DOWN");
  static VK_LEFT = InputSlot.getDevice("VK_LEFT");
  static VK_RIGHT = InputSlot.getDevice("VK_RIGHT");
  static VK_CONTROL = InputSlot.getDevice("VK_CONTROL");
  static VK_ALT = InputSlot.getDevice("VK_ALT");
  
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
