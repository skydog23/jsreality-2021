/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Tool } from './Tool.js';
import { InputSlot } from './InputSlot.js';

/**
 * @typedef {import('./ToolContext.js').ToolContext} ToolContext
 */

/**
 * Abstract base class for tools with common functionality.
 * Provides default implementations for tool lifecycle methods and slot management.
 */
export class AbstractTool extends Tool {
  #name = "Tool";

  getName() {
    return this.#name;
  }

  setName(name) {
    this.#name = name;
  }
/** @type {number} Static counter for hash generation */
  static #counter = 0;
  
  /** @type {number} Instance hash code */
  #hash;
  
  /**
   * Activation slots (protected - accessible to subclasses)
   * @type {InputSlot[]}
   */
  _activationSlots;
  
  /**
   * Current slots (private)
   * @type {InputSlot[]}
   */
  #currentSlots = [];
  
  /**
   * Descriptions for slots (private)
   * @type {Map<InputSlot, string>}
   */
  #descriptions = new Map();
  
  /**
   * Overall tool description (private)
   * @type {string|null}
   */
  #description = null;
  
  /**
   * Create a new AbstractTool
   * @param {...InputSlot} activationSlots - Variable number of activation slots
   */
  constructor(...activationSlots) {
    super();
    this.#hash = AbstractTool.#generateHash();
    if (activationSlots.length === 0 || activationSlots[0] === null) {
      this._activationSlots = [];
    } else {
      this._activationSlots = [...activationSlots];
    }
  }
  
  /**
   * Get the activation slots for this tool
   * @returns {InputSlot[]} Copy of activation slots array
   */
  getActivationSlots() {
    return [...this._activationSlots];
  }
  
  /**
   * Get the current slots for this tool
   * @returns {InputSlot[]} Copy of current slots array
   */
  getCurrentSlots() {
    return [...this.#currentSlots];
  }
  
  /**
   * Add a current slot to this tool
   * @param {InputSlot} slot - The slot to add
   * @param {string|null} [description] - Optional description for the slot
   */
  addCurrentSlot(slot, description = null) {
    if (this.#currentSlots.length === 0) {
      this.#currentSlots = [];
    }
    if (!this.#currentSlots.includes(slot)) {
      this.#currentSlots.push(slot);
    }
    this.setSlotDescription(slot, description);
  }
  
  /**
   * Set the description for a slot
   * @param {InputSlot} slot - The slot
   * @param {string|null} description - The description (null for default)
   * @protected
   */
  setSlotDescription(slot, description) {
    this.#descriptions.set(slot, description !== null ? description : "<no description>");
  }
  
  /**
   * Remove a current slot from this tool
   * @param {InputSlot} slot - The slot to remove
   */
  removeCurrentSlot(slot) {
    const index = this.#currentSlots.indexOf(slot);
    if (index !== -1) {
      this.#currentSlots.splice(index, 1);
    }
  }
  
  /**
   * Called when the tool gets activated (default: do nothing)
   * @param {ToolContext} tc - The tool context
   */
  activate(tc) {
    // Default: do nothing
  }
  
  /**
   * Called when the tool performs (default: do nothing)
   * @param {ToolContext} tc - The tool context
   */
  perform(tc) {
    // Default: do nothing
  }
  
  /**
   * Called when the tool gets deactivated (default: do nothing)
   * @param {ToolContext} tc - The tool context
   */
  deactivate(tc) {
    // Default: do nothing
  }
  
  /**
   * Get a full description of this tool including all slots
   * @returns {string} Full description
   */
  fullDescription() {
    let sb = `${this.constructor.name}: ${this.getToolDescription()}\n`;
    sb += `always active=${this._activationSlots.length === 0}\n`;
    sb += "current slots:\n";
    for (const slot of this.getCurrentSlots()) {
      sb += `\t[${slot.getName()}: ${this.getDescription(slot)}]\n`;
    }
    return sb;
  }
  
  /**
   * Get the description for a specific slot
   * @param {InputSlot} slot - The slot
   * @returns {string} The description
   */
  getDescription(slot) {
    if (slot !== undefined && slot !== null) {
      // Slot-specific description
      return this.#descriptions.get(slot) || "<no description>";
    } else {
      // Overall description (when called without parameter)
      return this.getToolDescription();
    }
  }
  
  /**
   * Get the overall description of this tool
   * @returns {string} The description
   * @protected
   */
  getToolDescription() {
    return this.#description !== null ? this.#description : "none";
  }
  
  /**
   * Set the overall description of this tool
   * @param {string} description - The description
   */
  setDescription(description) {
    this.#description = description;
  }
  
  /**
   * Generate a hash code for tool instances
   * @returns {number} Hash code
   * @private
   */
  static #generateHash() {
    const prime = 31;
    const result = 1;
    return prime * result + AbstractTool.#counter++;
  }
  
  /**
   * Get the hash code for this tool instance
   * @returns {number} Hash code
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
    if (!(obj instanceof AbstractTool)) return false;
    return this.#hash === obj.#hash;
  }
}
