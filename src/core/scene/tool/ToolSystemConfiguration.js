/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { InputSlot } from './InputSlot.js';

/**
 * @typedef {import('./InputSlot.js').InputSlot} InputSlot
 */

/**
 * VirtualMapping represents a mapping from a source input slot to a target input slot.
 * This allows virtual devices to be composed from raw devices.
 */
export class VirtualMapping {
  /** @type {InputSlot} Source slot */
  #sourceSlot;

  /** @type {InputSlot} Target slot */
  #targetSlot;

  /**
   * Create a new VirtualMapping.
   * @param {InputSlot} sourceSlot - The source input slot
   * @param {InputSlot} targetSlot - The target input slot
   */
  constructor(sourceSlot, targetSlot) {
    this.#sourceSlot = sourceSlot;
    this.#targetSlot = targetSlot;
  }

  /**
   * Get the source slot.
   * @returns {InputSlot} The source slot
   */
  getSourceSlot() {
    return this.#sourceSlot;
  }

  /**
   * Get the target slot.
   * @returns {InputSlot} The target slot
   */
  getTargetSlot() {
    return this.#targetSlot;
  }
}

/**
 * RawMapping represents a mapping from a raw device slot to an input slot.
 */
export class RawMapping {
  /** @type {string} Device ID */
  #deviceID;

  /** @type {string} Source slot name */
  #sourceSlot;

  /** @type {InputSlot} Target slot */
  #targetSlot;

  /**
   * Create a new RawMapping.
   * @param {string} deviceID - The device ID
   * @param {string} sourceSlot - The source slot name
   * @param {InputSlot} targetSlot - The target input slot
   */
  constructor(deviceID, sourceSlot, targetSlot) {
    this.#deviceID = deviceID;
    this.#sourceSlot = sourceSlot;
    this.#targetSlot = targetSlot;
  }

  /**
   * Get the device ID.
   * @returns {string} Device ID
   */
  getDeviceID() {
    return this.#deviceID;
  }

  /**
   * Get the source slot name.
   * @returns {string} Source slot name
   */
  getSourceSlot() {
    return this.#sourceSlot;
  }

  /**
   * Get the target slot.
   * @returns {InputSlot} Target slot
   */
  getTargetSlot() {
    return this.#targetSlot;
  }

  /**
   * Get string representation.
   * @returns {string} String representation
   */
  toString() {
    return `${this.#deviceID}.${this.#sourceSlot}->${this.#targetSlot.getName()}`;
  }
}

/**
 * RawDeviceConfig represents configuration for a raw device.
 */
export class RawDeviceConfig {
  /** @type {string} Device ID */
  #deviceID;

  /** @type {string} Raw device class name */
  #rawDevice;

  /** @type {Object} Configuration map */
  #config;

  /**
   * Create a new RawDeviceConfig.
   * @param {string} rawDevice - Raw device class name
   * @param {string} deviceID - Device ID
   * @param {Object} config - Configuration map
   */
  constructor(rawDevice, deviceID, config) {
    this.#rawDevice = rawDevice;
    this.#deviceID = deviceID;
    this.#config = config || {};
  }

  /**
   * Get the raw device class name.
   * @returns {string} Raw device class name
   */
  getRawDevice() {
    return this.#rawDevice;
  }

  /**
   * Get the device ID.
   * @returns {string} Device ID
   */
  getDeviceID() {
    return this.#deviceID;
  }

  /**
   * Get the configuration.
   * @returns {Object} Configuration map
   */
  getConfiguration() {
    return this.#config;
  }

  /**
   * Get string representation.
   * @returns {string} String representation
   */
  toString() {
    return `${this.#deviceID}[${this.#rawDevice}]`;
  }
}

/**
 * VirtualConstant represents a constant value for a slot.
 */
export class VirtualConstant {
  /** @type {InputSlot} Slot */
  #slot;

  /** @type {number[]|null} Transformation matrix */
  #trafo;

  /** @type {number|null} Axis value */
  #axis;

  /** @type {boolean} Whether this is a transformation */
  #isTrafo;

  /**
   * Create a new VirtualConstant.
   * @param {InputSlot} slot - The slot
   * @param {number[]|number} value - Transformation matrix (16 elements) or axis value
   */
  constructor(slot, value) {
    this.#slot = slot;
    if (typeof value === 'number') {
      this.#axis = value;
      this.#isTrafo = false;
    } else if (Array.isArray(value)) {
      if (value.length !== 16) {
        throw new Error('Transformation matrix must have 16 elements');
      }
      this.#trafo = [...value];
      this.#isTrafo = true;
    } else {
      throw new Error('Value must be a number or 16-element array');
    }
  }

  /**
   * Get the slot.
   * @returns {InputSlot} The slot
   */
  getSlot() {
    return this.#slot;
  }

  /**
   * Check if this is a transformation.
   * @returns {boolean} True if transformation
   */
  isTrafo() {
    return this.#isTrafo;
  }

  /**
   * Get the axis state.
   * @returns {AxisState|null} Axis state or null if transformation
   */
  getAxisState() {
    if (this.#isTrafo) return null;
    return new AxisState(this.#axis);
  }

  /**
   * Get the transformation matrix.
   * @returns {number[]|null} Transformation matrix or null if axis
   */
  getTransformationMatrix() {
    if (!this.#isTrafo) return null;
    return [...this.#trafo];
  }

  /**
   * Get string representation.
   * @returns {string} String representation
   */
  toString() {
    if (this.#isTrafo) {
      return `VirtualConstant: ${this.#slot.getName()}->[transformation]`;
    } else {
      return `VirtualConstant: ${this.#slot.getName()}->${this.#axis}`;
    }
  }
}

/**
 * VirtualDeviceConfig represents configuration for a virtual device.
 */
export class VirtualDeviceConfig {
  /** @type {string} Virtual device class name */
  #virtualDevice;

  /** @type {InputSlot} Output slot */
  #outSlot;

  /** @type {InputSlot[]} Input slots */
  #inSlots;

  /** @type {Object} Configuration map */
  #config;

  /**
   * Create a new VirtualDeviceConfig.
   * @param {string} virtualDevice - Virtual device class name
   * @param {InputSlot} outSlot - Output slot
   * @param {InputSlot[]} inSlots - Input slots
   * @param {Object} config - Configuration map
   */
  constructor(virtualDevice, outSlot, inSlots, config) {
    this.#virtualDevice = virtualDevice;
    this.#outSlot = outSlot;
    this.#inSlots = [...inSlots];
    this.#config = config || {};
  }

  /**
   * Get the virtual device class name.
   * @returns {string} Virtual device class name
   */
  getVirtualDevice() {
    return this.#virtualDevice;
  }

  /**
   * Get the output slot.
   * @returns {InputSlot} Output slot
   */
  getOutSlot() {
    return this.#outSlot;
  }

  /**
   * Get the input slots.
   * @returns {InputSlot[]} Input slots
   */
  getInSlots() {
    return [...this.#inSlots];
  }

  /**
   * Get the configuration.
   * @returns {Object} Configuration map
   */
  getConfig() {
    return this.#config;
  }

  /**
   * Get string representation.
   * @returns {string} String representation
   */
  toString() {
    return `VirtualDeviceConfig: ${this.#virtualDevice} outSlot=${this.#outSlot.getName()} inSlots=${this.#inSlots.map(s => s.getName()).join(',')} config=${JSON.stringify(this.#config)}`;
  }
}

/**
 * ToolSystemConfiguration holds configuration for the tool system,
 * including virtual device mappings, raw devices, and virtual devices.
 */
export class ToolSystemConfiguration {
  /** @type {VirtualMapping[]} List of virtual mappings */
  #virtualMappings = [];

  /** @type {RawMapping[]} List of raw mappings */
  #rawMappings = [];

  /** @type {RawDeviceConfig[]} List of raw device configs */
  #rawConfigs = [];

  /** @type {VirtualConstant[]} List of virtual constants */
  #virtualConstants = [];

  /** @type {VirtualDeviceConfig[]} List of virtual device configs */
  #virtualConfigs = [];

  /**
   * Create a new ToolSystemConfiguration.
   * @param {Object} [options={}] - Configuration options
   * @param {VirtualMapping[]} [options.virtualMappings=[]] - Virtual mappings
   * @param {RawMapping[]} [options.rawMappings=[]] - Raw mappings
   * @param {RawDeviceConfig[]} [options.rawConfigs=[]] - Raw device configs
   * @param {VirtualConstant[]} [options.virtualConstants=[]] - Virtual constants
   * @param {VirtualDeviceConfig[]} [options.virtualConfigs=[]] - Virtual device configs
   */
  constructor(options = {}) {
    this.#virtualMappings = options.virtualMappings ? [...options.virtualMappings] : [];
    this.#rawMappings = options.rawMappings ? [...options.rawMappings] : [];
    this.#rawConfigs = options.rawConfigs ? [...options.rawConfigs] : [];
    this.#virtualConstants = options.virtualConstants ? [...options.virtualConstants] : [];
    this.#virtualConfigs = options.virtualConfigs ? [...options.virtualConfigs] : [];
  }

  /**
   * Get all virtual mappings.
   * @returns {VirtualMapping[]} Array of virtual mappings
   */
  getVirtualMappings() {
    return [...this.#virtualMappings];
  }

  /**
   * Get all raw mappings.
   * @returns {RawMapping[]} Array of raw mappings
   */
  getRawMappings() {
    return [...this.#rawMappings];
  }

  /**
   * Get all raw device configs.
   * @returns {RawDeviceConfig[]} Array of raw device configs
   */
  getRawConfigs() {
    return [...this.#rawConfigs];
  }

  /**
   * Get all virtual constants.
   * @returns {VirtualConstant[]} Array of virtual constants
   */
  getVirtualConstants() {
    return [...this.#virtualConstants];
  }

  /**
   * Get all virtual device configs.
   * @returns {VirtualDeviceConfig[]} Array of virtual device configs
   */
  getVirtualConfigs() {
    return [...this.#virtualConfigs];
  }

  /**
   * Add a virtual mapping.
   * @param {VirtualMapping} mapping - The mapping to add
   */
  addVirtualMapping(mapping) {
    this.#virtualMappings.push(mapping);
  }

  /**
   * Add a raw mapping.
   * @param {RawMapping} mapping - The mapping to add
   */
  addRawMapping(mapping) {
    this.#rawMappings.push(mapping);
  }

  /**
   * Add a raw device config.
   * @param {RawDeviceConfig} config - The config to add
   */
  addRawConfig(config) {
    this.#rawConfigs.push(config);
  }

  /**
   * Add a virtual constant.
   * @param {VirtualConstant} constant - The constant to add
   */
  addVirtualConstant(constant) {
    this.#virtualConstants.push(constant);
  }

  /**
   * Add a virtual device config.
   * @param {VirtualDeviceConfig} config - The config to add
   */
  addVirtualConfig(config) {
    this.#virtualConfigs.push(config);
  }

  /**
   * Load default configuration.
   * @returns {ToolSystemConfiguration} Default configuration
   */
  static loadDefaultConfiguration() {
    const config = new ToolSystemConfiguration();
    // Add default mappings here if needed
    return config;
  }

  /**
   * Load configuration from a JSON object.
   * @param {Object} json - JSON configuration object
   * @returns {ToolSystemConfiguration} Configuration instance
   */
  static loadFromJSON(json) {
    const options = {};
    
    if (json.virtualMappings && Array.isArray(json.virtualMappings)) {
      options.virtualMappings = json.virtualMappings.map(vm => {
        const sourceSlot = InputSlot.getDevice(vm.sourceSlot);
        const targetSlot = InputSlot.getDevice(vm.targetSlot);
        return new VirtualMapping(sourceSlot, targetSlot);
      });
    }
    
    if (json.rawMappings && Array.isArray(json.rawMappings)) {
      options.rawMappings = json.rawMappings.map(rm => {
        const targetSlot = InputSlot.getDevice(rm.targetSlot);
        return new RawMapping(rm.deviceID, rm.sourceSlot, targetSlot);
      });
    }
    
    if (json.rawConfigs && Array.isArray(json.rawConfigs)) {
      options.rawConfigs = json.rawConfigs.map(rc => {
        return new RawDeviceConfig(rc.rawDevice, rc.deviceID, rc.config || {});
      });
    }
    
    if (json.virtualConstants && Array.isArray(json.virtualConstants)) {
      options.virtualConstants = json.virtualConstants.map(vc => {
        const slot = InputSlot.getDevice(vc.slot);
        const value = vc.isTrafo ? vc.value : vc.value;
        return new VirtualConstant(slot, value);
      });
    }
    
    if (json.virtualConfigs && Array.isArray(json.virtualConfigs)) {
      options.virtualConfigs = json.virtualConfigs.map(vdc => {
        const outSlot = InputSlot.getDevice(vdc.outSlot);
        const inSlots = vdc.inSlots.map(s => InputSlot.getDevice(s));
        return new VirtualDeviceConfig(vdc.virtualDevice, outSlot, inSlots, vdc.config || {});
      });
    }
    
    return new ToolSystemConfiguration(options);
  }

  /**
   * Convert configuration to JSON object.
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      virtualMappings: this.#virtualMappings.map(vm => ({
        sourceSlot: vm.getSourceSlot().getName(),
        targetSlot: vm.getTargetSlot().getName()
      })),
      rawMappings: this.#rawMappings.map(rm => ({
        deviceID: rm.getDeviceID(),
        sourceSlot: rm.getSourceSlot(),
        targetSlot: rm.getTargetSlot().getName()
      })),
      rawConfigs: this.#rawConfigs.map(rc => ({
        rawDevice: rc.getRawDevice(),
        deviceID: rc.getDeviceID(),
        config: rc.getConfiguration()
      })),
      virtualConstants: this.#virtualConstants.map(vc => ({
        slot: vc.getSlot().getName(),
        isTrafo: vc.isTrafo(),
        value: vc.isTrafo() ? vc.getTransformationMatrix() : vc.getAxisState()?.doubleValue()
      })),
      virtualConfigs: this.#virtualConfigs.map(vdc => ({
        virtualDevice: vdc.getVirtualDevice(),
        outSlot: vdc.getOutSlot().getName(),
        inSlots: vdc.getInSlots().map(s => s.getName()),
        config: vdc.getConfig()
      }))
    };
  }
}

