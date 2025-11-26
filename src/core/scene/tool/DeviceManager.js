/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { ToolEvent } from './ToolEvent.js';
import { InputSlot } from './InputSlot.js';
import { AxisState } from './AxisState.js';
import { MissingSlotException } from './MissingSlotException.js';
import * as Rn from '../../math/Rn.js';
import * as CameraUtility from '../../util/CameraUtility.js';
import { Camera } from '../Camera.js';
import { getLogger } from '../../util/LoggingSystem.js';
import { Level, Category } from '../../util/LoggingSystem.js';

const logger = getLogger('DeviceManager');
import { DeviceMouse } from './raw/DeviceMouse.js';
import { DeviceKeyboard } from './raw/DeviceKeyboard.js';
import { DeviceSystemTimer } from './raw/DeviceSystemTimer.js';
import { PollingDevice } from './raw/PollingDevice.js';
import { Poller } from './Poller.js';

/**
 * @typedef {import('./ToolEvent.js').ToolEvent} ToolEvent
 * @typedef {import('./InputSlot.js').InputSlot} InputSlot
 * @typedef {import('./AxisState.js').AxisState} AxisState
 * @typedef {import('./ToolSystemConfiguration.js').ToolSystemConfiguration} ToolSystemConfiguration
 * @typedef {import('./ToolEventQueue.js').ToolEventQueue} ToolEventQueue
 * @typedef {import('./VirtualDevice.js').VirtualDevice} VirtualDevice
 * @typedef {import('./VirtualDeviceContext.js').VirtualDeviceContext} VirtualDeviceContext
 * @typedef {import('./RawDevice.js').RawDevice} RawDevice
 * @typedef {import('../Viewer.js').Viewer} Viewer
 * @typedef {import('../SceneGraphPath.js').SceneGraphPath} SceneGraphPath
 */

const MATRIX_EPS = 1E-12;

/**
 * Implementation of VirtualDeviceContext for DeviceManager.
 * @implements {VirtualDeviceContext}
 */
class VirtualDeviceContextImpl {
  /** @type {DeviceManager} */
  #deviceManager;

  /** @type {ToolEvent|null} */
  #event = null;

  /**
   * @param {DeviceManager} deviceManager
   */
  constructor(deviceManager) {
    this.#deviceManager = deviceManager;
  }

  /**
   * @returns {ToolEvent}
   */
  getEvent() {
    if (!this.#event) {
      throw new Error('No event set in VirtualDeviceContext');
    }
    return this.#event;
  }

  /**
   * @param {ToolEvent} event
   */
  setEvent(event) {
    this.#event = event;
  }

  /**
   * @param {InputSlot} slot
   * @returns {AxisState}
   * @throws {MissingSlotException}
   */
  getAxisState(slot) {
    const axisState = this.#deviceManager.getAxisState(slot);
    if (axisState === null) {
      throw new MissingSlotException(slot);
    }
    return axisState;
  }

  /**
   * @param {InputSlot} slot
   * @returns {number[]}
   * @throws {MissingSlotException}
   */
  getTransformationMatrix(slot) {
    const trafo = this.#deviceManager.getTransformationMatrix(slot);
    if (trafo === null) {
      throw new MissingSlotException(slot);
    }
    return trafo;
  }
}

/**
 * DeviceManager manages raw and virtual input devices, converting raw input into ToolEvents.
 * It handles virtual device evaluation and implicit device computation (camera transformations).
 */
export class DeviceManager {
  /** @type {Viewer} */
  #viewer;

  /** @type {ToolSystemConfiguration} */
  #config;

  /** @type {ToolEventQueue} */
  #eventQueue;

  /** @type {Map<InputSlot, VirtualDevice[]>} Map of slots to virtual devices */
  #slot2virtual = new Map();

  /** @type {Map<InputSlot, AxisState>} Map of slots to axis states */
  #slot2axis = new Map();

  /** @type {Map<InputSlot, number[]>} Map of slots to transformation matrices */
  #slot2transformation = new Map();

  /** @type {Map<InputSlot, InputSlot[]>} Map of slots to virtual mappings */
  #slots2virtualMappings = new Map();

  /** @type {VirtualDeviceContextImpl} */
  #virtualDeviceContext;

  /** @type {Map<string, RawDevice>} Map of device IDs to raw devices */
  #rawDevices = new Map();

  /**
   * Create a raw device instance from class name.
   * @param {string} className - Device class name (e.g., "DeviceMouse")
   * @returns {RawDevice|null} Device instance or null
   * @private
   */
  #createRawDevice(className) {
    // Map class names to actual device classes
    if (className === 'DeviceMouse') {
      return new DeviceMouse();
    } else if (className === 'DeviceKeyboard') {
      return new DeviceKeyboard();
    } else if (className === 'DeviceSystemTimer') {
      return new DeviceSystemTimer();
    }
    
    logger.warn(Category.IO, `Unknown raw device class: ${className}`);
    return null;
  }

  /**
   * Get all raw devices.
   * @returns {Map<string, RawDevice>} Map of device IDs to devices
   */
  getRawDevices() {
    return this.#rawDevices;
  }

  /** @type {InputSlot} Avatar transformation slot */
  #avatarSlot = InputSlot.getDevice("AvatarTransformation");

  /** @type {InputSlot} World to camera slot */
  #worldToCamSlot = InputSlot.getDevice("WorldToCamera");

  /** @type {InputSlot} Camera to NDC slot */
  #camToNDCSlot = InputSlot.getDevice("CameraToNDC");

  /** @type {number[]} Avatar transformation matrix */
  #avatarTrafo = Rn.identityMatrix(4);

  /** @type {number[]} World to camera transformation matrix */
  #worldToCamTrafo = Rn.identityMatrix(4);

  /** @type {number[]} Camera to NDC transformation matrix */
  #camToNDCTrafo = Rn.identityMatrix(4);

  /** @type {SceneGraphPath|null} Avatar path */
  #avatarPath = null;

  /** @type {number} System time */
  #systemTime = 0;

  /** @type {Map<InputSlot, Set<InputSlot>>} Inverse virtual mappings (target to sources) */
  #virtualMappingsInv = new Map();

  /**
   * Create a new DeviceManager.
   * @param {ToolSystemConfiguration} config - Configuration
   * @param {ToolEventQueue} eventQueue - Event queue
   * @param {Viewer} viewer - Viewer
   */
  constructor(config, eventQueue, viewer) {
    this.#viewer = viewer;
    this.#config = config;
    this.#eventQueue = eventQueue;
    this.#virtualDeviceContext = new VirtualDeviceContextImpl(this);

    // Initialize raw devices
    this.#rawDevices = new Map();
    const rawConfigs = config.getRawConfigs();
    for (const rdc of rawConfigs) {
      try {
        // Create device instance from class name
        // In JS, we need to import and instantiate directly
        const device = this.#createRawDevice(rdc.getRawDevice());
        if (device) {
          device.initialize(viewer, rdc.getConfiguration());
          device.setEventQueue(eventQueue);
          this.#rawDevices.set(rdc.getDeviceID(), device);
          // Register polling devices
          if (device instanceof PollingDevice) {
            Poller.getSharedInstance().addPollingDevice(device);
          }
        }
      } catch (e) {
        logger.warn(Category.IO, `Couldn't create RawDevice ${rdc.getRawDevice()}:`, e);
      }
    }

    // Map raw device slots to input slots
    const rawMappings = config.getRawMappings();
    for (const rm of rawMappings) {
      const rd = this.#rawDevices.get(rm.getDeviceID());
      if (rd === null || rd === undefined) {
        logger.warn(Category.IO, `Ignoring mapping ${rm.toString()}: device not found`);
        continue;
      }
      try {
        const initialValue = rd.mapRawDevice(rm.getSourceSlot(), rm.getTargetSlot());
        if (initialValue.getInputSlot() !== rm.getTargetSlot()) {
          throw new Error('Different slot not allowed in init');
        }
        if (initialValue.getTransformation() !== null) {
          this.setTransformationMatrix(initialValue.getInputSlot(), initialValue.getTransformation());
        }
        if (initialValue.getAxisState() !== null) {
          this.setAxisState(initialValue.getInputSlot(), initialValue.getAxisState());
        }
      } catch (e) {
        logger.warn(Category.IO, `Cannot map slot ${rm.toString()}:`, e);
      }
    }

    // Initialize virtual mappings inverse map
    const virtualMappings = config.getVirtualMappings();
    for (const vm of virtualMappings) {
      const targetSlot = vm.getTargetSlot();
      const sourceSlot = vm.getSourceSlot();
      if (!this.#virtualMappingsInv.has(targetSlot)) {
        this.#virtualMappingsInv.set(targetSlot, new Set());
      }
      this.#virtualMappingsInv.get(targetSlot).add(sourceSlot);
    }

    // Initialize virtual constants
    const virtualConstants = config.getVirtualConstants();
    for (const vc of virtualConstants) {
      const trafo = vc.getTransformationMatrix();
      const axis = vc.getAxisState();
      if (trafo !== null) {
        this.setTransformationMatrix(vc.getSlot(), trafo);
      }
      if (axis !== null) {
        this.setAxisState(vc.getSlot(), axis);
      }
    }

    // Initialize implicit devices
    this.setTransformationMatrix(this.#avatarSlot, [...this.#avatarTrafo]);
    this.setTransformationMatrix(this.#worldToCamSlot, [...this.#worldToCamTrafo]);
    this.setTransformationMatrix(this.#camToNDCSlot, [...this.#camToNDCTrafo]);

    // Initialize virtual devices (stub for now - Phase 2)
    // Virtual devices would be created from VirtualDeviceConfig here
    // For now, we skip this as virtual device implementations are deferred

    // Set values for virtual mappings
    for (const vm of virtualMappings) {
      const targetSlot = vm.getTargetSlot();
      const rawSlots = this.resolveSlot(targetSlot);
      for (const rawSlot of rawSlots) {
        this.#getVirtualMappingsForSlot(rawSlot).push(targetSlot);
        const trafo = this.getTransformationMatrix(rawSlot);
        const axis = this.getAxisState(rawSlot);
        if (trafo !== null) {
          this.setTransformationMatrix(targetSlot, trafo);
        }
        if (axis !== null) {
          this.setAxisState(targetSlot, axis);
        }
      }
    }
  }

  /**
   * Get devices for a slot.
   * @param {InputSlot} slot - The slot
   * @returns {VirtualDevice[]} List of virtual devices
   * @private
   */
  #getDevicesForSlot(slot) {
    if (!this.#slot2virtual.has(slot)) {
      this.#slot2virtual.set(slot, []);
    }
    return this.#slot2virtual.get(slot);
  }

  /**
   * Get virtual mappings for a slot.
   * @param {InputSlot} slot - The slot
   * @returns {InputSlot[]} List of mapped slots
   * @private
   */
  #getVirtualMappingsForSlot(slot) {
    if (!this.#slots2virtualMappings.has(slot)) {
      this.#slots2virtualMappings.set(slot, []);
    }
    return this.#slots2virtualMappings.get(slot);
  }

  /**
   * Resolve a slot to its trigger slots.
   * @param {InputSlot} slot - The slot
   * @returns {InputSlot[]} List of trigger slots
   */
  resolveSlot(slot) {
    const ret = [];
    this.#findTriggerSlots(ret, slot);
    return ret;
  }

  /**
   * Find trigger slots recursively.
   * @param {InputSlot[]} list - List to add trigger slots to
   * @param {InputSlot} slot - Current slot
   * @private
   */
  #findTriggerSlots(list, slot) {
    const sources = this.#getMappingsTargetToSources(slot);
    if (sources.size === 0) {
      list.push(slot);
      return;
    }
    for (const sourceSlot of sources) {
      this.#findTriggerSlots(list, sourceSlot);
    }
  }

  /**
   * Get mappings target to sources.
   * @param {InputSlot} slot - The slot
   * @returns {Set<InputSlot>} Set of source slots
   * @private
   */
  #getMappingsTargetToSources(slot) {
    if (!this.#virtualMappingsInv.has(slot)) {
      this.#virtualMappingsInv.set(slot, new Set());
    }
    return this.#virtualMappingsInv.get(slot);
  }

  /**
   * Get axis state for a slot.
   * @param {InputSlot} slot - The slot
   * @returns {AxisState|null} Axis state or null
   */
  getAxisState(slot) {
    return this.#slot2axis.get(slot) || null;
  }

  /**
   * Get transformation matrix for a slot.
   * @param {InputSlot} slot - The slot
   * @returns {number[]|null} 4x4 transformation matrix or null
   */
  getTransformationMatrix(slot) {
    const trafo = this.#slot2transformation.get(slot);
    return trafo ? [...trafo] : null;
  }

  /**
   * Set axis state for a slot.
   * @param {InputSlot} slot - The slot
   * @param {AxisState} axisState - The axis state
   * @private
   */
  setAxisState(slot, axisState) {
    this.#slot2axis.set(slot, axisState);
  }

  /**
   * Set transformation matrix for a slot.
   * @param {InputSlot} slot - The slot
   * @param {number[]} transformation - 4x4 transformation matrix
   * @private
   */
  setTransformationMatrix(slot, transformation) {
    this.#slot2transformation.set(slot, [...transformation]);
  }

  /**
   * Evaluate an event and update device state, then process virtual devices.
   * @param {ToolEvent} event - The event
   * @param {ToolEvent[]} compQueue - Computational queue to add new events to
   */
  evaluateEvent(event, compQueue) {
    const slot = event.getInputSlot();
    
    // Update state for the slot
    if (event.getAxisState() !== null) {
      this.setAxisState(slot, event.getAxisState());
    }
    if (event.getTransformation() !== null) {
      this.setTransformationMatrix(slot, event.getTransformation());
    }

    // Update virtual mappings
    const mappedSlots = this.#getVirtualMappingsForSlot(slot);
    for (const mapSlot of mappedSlots) {
      if (event.getAxisState() !== null) {
        this.setAxisState(mapSlot, event.getAxisState());
      }
      if (event.getTransformation() !== null) {
        this.setTransformationMatrix(mapSlot, event.getTransformation());
      }
    }

    // Process virtual devices
    this.#virtualDeviceContext.setEvent(event);
    const devices = this.#getDevicesForSlot(slot);
    for (const device of devices) {
      try {
        const newEvent = device.process(this.#virtualDeviceContext);
        if (newEvent !== null) {
          compQueue.push(newEvent);
        }
      } catch (mse) {
        if (mse instanceof MissingSlotException) {
          // Log warning but continue
          logger.warn(Category.SCENE, `Slot for virtual device missing: ${mse.getSlot().getName()}`);
        } else {
          throw mse;
        }
      }
    }
  }

  /**
   * Update implicit devices (camera transformations).
   * Computes WorldToCamera, CameraToNDC, and AvatarTransformation from the viewer.
   * @returns {ToolEvent[]} List of new events generated
   */
  updateImplicitDevices() {
    let worldToCamChanged = false;
    let camToNDCChanged = false;
    let avatarChanged = false;

    const cameraPath = this.#viewer.getCameraPath();
    if (cameraPath !== null) {
      // Update WorldToCamera
      const worldToCamMatrix = cameraPath.getInverseMatrix(null);
      if (worldToCamMatrix !== null && !Rn.equals(worldToCamMatrix, this.#worldToCamTrafo, MATRIX_EPS)) {
        Rn.copy(this.#worldToCamTrafo, worldToCamMatrix);
        worldToCamChanged = true;
      }

      // Update CameraToNDC
      let camToNDCMatrix = null;
      if (this.#viewer.hasViewingComponent() && this.#viewer.getViewingComponentSize() !== null) {
        const size = this.#viewer.getViewingComponentSize();
        const aspectRatio = size.width / size.height;
        if (isNaN(aspectRatio)) {
          camToNDCMatrix = Rn.identityMatrix(4);
        } else {
          const camera = cameraPath.getLastElement();
          if (camera instanceof Camera) {
            camToNDCMatrix = CameraUtility.getCameraToNDCWithAspect(camera, aspectRatio);
          } else {
            camToNDCMatrix = Rn.identityMatrix(4);
          }
        }
      } else {
        camToNDCMatrix = Rn.identityMatrix(4);
      }
      if (!Rn.equals(camToNDCMatrix, this.#camToNDCTrafo, MATRIX_EPS)) {
        Rn.copy(this.#camToNDCTrafo, camToNDCMatrix);
        camToNDCChanged = true;
      }
    }

    // Update AvatarTransformation
    let avatarMatrix = null;
    if (this.#avatarPath !== null) {
      avatarMatrix = this.#avatarPath.getMatrix(null);
    } else if (cameraPath !== null) {
      avatarMatrix = cameraPath.getMatrix(null);
    }
    if (avatarMatrix !== null && !Rn.equals(avatarMatrix, this.#avatarTrafo, MATRIX_EPS)) {
      Rn.copy(this.#avatarTrafo, avatarMatrix);
      avatarChanged = true;
    }

    if (!worldToCamChanged && !camToNDCChanged && !avatarChanged) {
      return [];
    }

    const ret = [];
    if (worldToCamChanged) {
      ret.push(ToolEvent.createWithTransformation(
        this,
        this.getSystemTime(),
        this.#worldToCamSlot,
        [...this.#worldToCamTrafo]
      ));
    }
    if (camToNDCChanged) {
      ret.push(ToolEvent.createWithTransformation(
        this,
        this.getSystemTime(),
        this.#camToNDCSlot,
        [...this.#camToNDCTrafo]
      ));
    }
    if (avatarChanged) {
      ret.push(ToolEvent.createWithTransformation(
        this,
        this.getSystemTime(),
        this.#avatarSlot,
        [...this.#avatarTrafo]
      ));
    }
    return ret;
  }

  /**
   * Set avatar path.
   * @param {SceneGraphPath} path - Avatar path
   */
  setAvatarPath(path) {
    this.#avatarPath = path;
  }

  /**
   * Set system time.
   * @param {number} time - Time in milliseconds
   */
  setSystemTime(time) {
    this.#systemTime = time;
  }

  /**
   * Get system time.
   * @returns {number} Time in milliseconds
   */
  getSystemTime() {
    return this.#systemTime;
  }

  /**
   * Dispose of the device manager.
   */
  dispose() {
    // Dispose raw devices
    for (const [deviceID, device] of this.#rawDevices.entries()) {
      if (device instanceof PollingDevice) {
        Poller.getSharedInstance().removePollingDevice(device);
      }
      device.dispose();
    }
    this.#rawDevices.clear();

    // Clear state
    this.#slot2axis.clear();
    this.#slot2transformation.clear();
    this.#slot2virtual.clear();
    this.#slots2virtualMappings.clear();
    this.#avatarPath = null;
    this.#avatarTrafo = Rn.identityMatrix(4);
    this.#camToNDCTrafo = Rn.identityMatrix(4);
    this.#worldToCamTrafo = Rn.identityMatrix(4);
  }
}
