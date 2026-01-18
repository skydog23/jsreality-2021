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
import { DeviceMouse } from './raw/DeviceMouse.js';
import { DeviceKeyboard } from './raw/DeviceKeyboard.js';
import { DeviceSystemTimer } from './raw/DeviceSystemTimer.js';
import { PollingDevice } from './raw/PollingDevice.js';
import { Poller } from './Poller.js';
import { VirtualMousePointerTrafo } from './virtual/VirtualMousePointerTrafo.js';
import { VirtualRotation } from './virtual/VirtualRotation.js';
import { VirtualExtractTranslationTrafo } from './virtual/VirtualExtractTranslationTrafo.js';
import { VirtualEvolutionOperator } from './virtual/VirtualEvolutionOperator.js';
import { VirtualMap } from './virtual/VirtualMap.js';
import { VirtualDoubleClick } from './virtual/VirtualDoubleClick.js';
import { VirtualCoupledAxis } from './virtual/VirtualCoupledAxis.js';
import { VirtualMergedAxis } from './virtual/VirtualMergedAxis.js';
import { VirtualToggleAxis } from './virtual/VirtualToggleAxis.js';
import { VirtualInvertMatrix } from './virtual/VirtualInvertMatrix.js';
import { VirtualProductMatrix } from './virtual/VirtualProductMatrix.js';
import { VirtualExtractAxis } from './virtual/VirtualExtractAxis.js';

const logger = getLogger('jsreality.core.scene.tool.DeviceManager');

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
    
    logger.warn(Category.ALL, `Unknown raw device class: ${className}`);
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
  #avatarSlot = InputSlot.AVATAR_TRANSFORMATION;

  /** @type {InputSlot} World to camera slot */
  #worldToCamSlot = InputSlot.WORLD_TO_CAMERA;

  /** @type {InputSlot} Camera to world slot */
  #camToWorldSlot = InputSlot.CAMERA_TO_WORLD;

  /** @type {InputSlot} Camera to NDC slot */
  #camToNDCSlot = InputSlot.CAMERA_TO_NDC;

  /** @type {InputSlot} NDC to world slot (derived from camera matrices) */
  #ndcToWorldSlot = InputSlot.NDC_TO_WORLD;

  /** @type {number[]} Avatar transformation matrix */
  #avatarTrafo = Rn.identityMatrix(4);

  /** @type {number[]} World to camera transformation matrix */
  #worldToCamTrafo = Rn.identityMatrix(4);

  /** @type {number[]} Camera to world transformation matrix */
  #camToWorldTrafo = Rn.identityMatrix(4);

  /** @type {number[]} Camera to NDC transformation matrix */
  #camToNDCTrafo = Rn.identityMatrix(4);

  /** @type {number[]} NDC to world transformation matrix */
  #ndcToWorldTrafo = Rn.identityMatrix(4);

  /** @type {SceneGraphPath|null} Avatar path */
  #avatarPath = null;

  /** @type {number} System time */
  #systemTime = 0;

  /** @type {Map<InputSlot, Set<InputSlot>>} Inverse virtual mappings (target to sources) */
  #virtualMappingsInv = new Map();

  /** @type {VirtualMousePointerTrafo|null} Pointer virtual device */
  #pointerVirtualDevice = null;

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
          if (device != null && typeof device.poll === 'function') {
            Poller.getSharedInstance().addPollingDevice(device);
          }
        }
      } catch (e) {
        logger.warn(Category.ALL, `Couldn't create RawDevice ${rdc.getRawDevice()}:`, e);
      }
    }

    // Map raw device slots to input slots
    const rawMappings = config.getRawMappings();
    for (const rm of rawMappings) {
      const rd = this.#rawDevices.get(rm.getDeviceID());
      if (rd === null || rd === undefined) {
        logger.warn(Category.ALL, `Ignoring mapping ${rm.toString()}: device not found`);
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
        logger.warn(Category.ALL, `Cannot map slot ${rm.toString()}:`, e);
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
    this.setTransformationMatrix(this.#camToWorldSlot, [...this.#camToWorldTrafo]);
    this.setTransformationMatrix(this.#camToNDCSlot, [...this.#camToNDCTrafo]);
    // NDCToWorld will be computed in updateImplicitDevices; initialize to identity
    this.setTransformationMatrix(this.#ndcToWorldSlot, [...this.#ndcToWorldTrafo]);

    // Initialize pointer virtual device: converts (NDCToWorld, PointerNDC) -> POINTER_TRANSFORMATION
    const pointerNdcSlot = InputSlot.POINTER_NDC;
    this.#pointerVirtualDevice = new VirtualMousePointerTrafo(
      this.#ndcToWorldSlot,
      pointerNdcSlot,
      InputSlot.POINTER_TRANSFORMATION
    );
    this.#getDevicesForSlot(pointerNdcSlot).push(this.#pointerVirtualDevice);

    // Initialize virtual devices from configuration
    const virtualConfigs2 = config.getVirtualConfigs();
    for (const vdc of virtualConfigs2) {
      const device = this.#createVirtualDevice(vdc.getVirtualDevice());
      if (!device) {
        logger.warn(Category.ALL, `Unknown virtual device class: ${vdc.getVirtualDevice()}`);
        continue;
      }
      try {
        device.initialize(vdc.getInSlots(), vdc.getOutSlot(), vdc.getConfig());
        // Trigger on each input slot (multi-input virtual devices)
        for (const inSlot of vdc.getInSlots()) {
          this.#getDevicesForSlot(inSlot).push(device);
        }
      } catch (e) {
        logger.warn(Category.ALL, `Couldn't initialize VirtualDevice ${vdc.toString()}:`, e);
      }
    }

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
   * Create a virtual device instance from the configured class name.
   * Accepts either a short name (e.g. "VirtualRotation") or a fully-qualified
   * jReality name (e.g. "de.jreality.toolsystem.virtual.VirtualRotation").
   * @param {string} className
   * @returns {import('./VirtualDevice.js').VirtualDevice|null}
   * @private
   */
  #createVirtualDevice(className) {
    if (typeof className !== 'string') return null;
    if (className === 'VirtualRotation' || className.endsWith('.VirtualRotation')) {
      return new VirtualRotation();
    }
    if (className === 'VirtualMap' || className.endsWith('.VirtualMap')) {
      return new VirtualMap();
    }
    if (className === 'VirtualDoubleClick' || className.endsWith('.VirtualDoubleClick')) {
      return new VirtualDoubleClick();
    }
    if (className === 'VirtualCoupledAxis' || className.endsWith('.VirtualCoupledAxis')) {
      return new VirtualCoupledAxis();
    }
    if (className === 'VirtualMergedAxis' || className.endsWith('.VirtualMergedAxis')) {
      return new VirtualMergedAxis();
    }
    if (className === 'VirtualToggleAxis' || className.endsWith('.VirtualToggleAxis')) {
      return new VirtualToggleAxis();
    }
    if (className === 'VirtualExtractTranslationTrafo' || className.endsWith('.VirtualExtractTranslationTrafo')) {
      return new VirtualExtractTranslationTrafo();
    }
    if (className === 'VirtualInvertMatrix' || className.endsWith('.VirtualInvertMatrix')) {
      return new VirtualInvertMatrix();
    }
    if (className === 'VirtualProductMatrix' || className.endsWith('.VirtualProductMatrix')) {
      return new VirtualProductMatrix();
    }
    if (className === 'VirtualExtractAxis' || className.endsWith('.VirtualExtractAxis')) {
      return new VirtualExtractAxis();
    }
    if (className === 'VirtualEvolutionOperator' || className.endsWith('.VirtualEvolutionOperator')) {
      return new VirtualEvolutionOperator();
    }
    return null;
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
          logger.warn(Category.ALL, `Slot for virtual device missing: ${mse.getSlot().getName()}`);
        } else {
          throw mse;
        }
      }
    }
  }

  /**
   * Update implicit devices (camera transformations).
   * Computes WorldToCamera, CameraToNDC, AvatarTransformation, and NDCToWorld
   * from the viewer.
   * @returns {ToolEvent[]} List of new events generated
   */
  updateImplicitDevices() {
    let worldToCamChanged = false;
    let camToWorldChanged = false;
    let camToNDCChanged = false;
    let avatarChanged = false;
    let ndcToWorldChanged = false;

    const cameraPath = this.#viewer.getCameraPath();
    if (cameraPath !== null) {
      // Update WorldToCamera
      const worldToCamMatrix = cameraPath.getInverseMatrix(null);
      if (worldToCamMatrix !== null && !Rn.equals(worldToCamMatrix, this.#worldToCamTrafo, MATRIX_EPS)) {
        Rn.copy(this.#worldToCamTrafo, worldToCamMatrix);
        worldToCamChanged = true;
      }

      // Keep CameraToWorld in sync with WorldToCamera.
      const camToWorldMatrix = Rn.inverse(null, this.#worldToCamTrafo);
      if (camToWorldMatrix !== null && !Rn.equals(camToWorldMatrix, this.#camToWorldTrafo, MATRIX_EPS)) {
        Rn.copy(this.#camToWorldTrafo, camToWorldMatrix);
        camToWorldChanged = true;
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

    // Update NDCToWorld whenever the camera transforms change.
    if (cameraPath !== null && (worldToCamChanged || camToWorldChanged || camToNDCChanged)) {
      const ndcToCam = Rn.inverse(null, this.#camToNDCTrafo);
      Rn.times(this.#ndcToWorldTrafo, this.#camToWorldTrafo, ndcToCam);
      ndcToWorldChanged = true;
    }

    if (!worldToCamChanged && !camToWorldChanged && !camToNDCChanged && !avatarChanged && !ndcToWorldChanged) {
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
    if (camToWorldChanged) {
      ret.push(ToolEvent.createWithTransformation(
        this,
        this.getSystemTime(),
        this.#camToWorldSlot,
        [...this.#camToWorldTrafo]
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
    if (ndcToWorldChanged) {
      ret.push(ToolEvent.createWithTransformation(
        this,
        this.getSystemTime(),
        this.#ndcToWorldSlot,
        [...this.#ndcToWorldTrafo]
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
      if (device != null && typeof device.poll === 'function') {
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
