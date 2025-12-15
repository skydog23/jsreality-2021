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
import { ToolEventQueue, ToolEventReceiver } from './ToolEventQueue.js';
import { ToolManager } from './ToolManager.js';
import { SlotManager } from './SlotManager.js';
import { DeviceManager } from './DeviceManager.js';
import { ToolSystemConfiguration, RawDeviceConfig, RawMapping, VirtualMapping } from './ToolSystemConfiguration.js';
import { InputSlot } from './InputSlot.js';
import { AxisState } from './AxisState.js';
import { SceneGraphPath } from '../SceneGraphPath.js';
import { SceneGraphComponent } from '../SceneGraphComponent.js';
import { Geometry } from '../Geometry.js';
import { AABBPickSystem } from '../pick/AABBPickSystem.js';
import { PosWHitFilter } from '../pick/PosWHitFilter.js';
import * as Rn from '../../math/Rn.js';
import { getLogger } from '../../util/LoggingSystem.js';
import { Level, Category } from '../../util/LoggingSystem.js';

// Module-level logger shared by ToolSystem and helpers in this file
const logger = getLogger('jsreality.core.scene.tool.ToolSystem');

/**
 * @typedef {import('./Tool.js').Tool} Tool
 * @typedef {import('./ToolContext.js').ToolContext} ToolContext
 * @typedef {import('./ToolEvent.js').ToolEvent} ToolEvent
 * @typedef {import('../Viewer.js').Viewer} Viewer
 * @typedef {import('../pick/PickSystem.js').PickSystem} PickSystem
 * @typedef {import('../pick/PickResult.js').PickResult} PickResult
 */

/**
 * ToolContextImpl implements ToolContext for tool execution.
 */
class ToolContextImpl {
  /** @type {Viewer} Viewer */
  #viewer;

  /** @type {ToolEvent|null} Current event */
  #event = null;

  /** @type {InputSlot|null} Source slot */
  #sourceSlot = null;

  /** @type {SceneGraphPath|null} Root to local path */
  #rootToLocal = null;

  /** @type {SceneGraphPath|null} Root to tool component path */
  #rootToToolComponent = null;

  /** @type {Tool|null} Current tool */
  #currentTool = null;

  /** @type {boolean} Whether context was rejected */
  #rejected = false;

  /** @type {DeviceManager} Device manager */
  #deviceManager;

  /** @type {PickSystem|null} Pick system */
  #pickSystem;

  /** @type {ToolSystem} Tool system reference */
  #toolSystem;

  /** @type {PickResult|null} Cached pick result */
  #pickResult = null;

  /** @type {PickResult[]|null} Cached pick results */
  #pickResults = null;

  /**
   * Create a new ToolContextImpl.
   * @param {Viewer} viewer - The viewer
   * @param {DeviceManager} deviceManager - Device manager
   * @param {PickSystem|null} pickSystem - Pick system
   * @param {ToolSystem} toolSystem - Tool system reference
   */
  constructor(viewer, deviceManager, pickSystem, toolSystem) {
    this.#viewer = viewer;
    this.#deviceManager = deviceManager;
    this.#pickSystem = pickSystem;
    this.#toolSystem = toolSystem;
  }

  /**
   * Set the current event.
   * @param {ToolEvent} event - The event
   */
  setEvent(event) {
    this.#event = event;
    this.#pickResult = null;
    this.#pickResults = null;
  }

  /**
   * Set the source slot.
   * @param {InputSlot} slot - The slot
   */
  setSourceSlot(slot) {
    this.#sourceSlot = slot;
  }

  /**
   * Set the current tool.
   * @param {Tool} tool - The tool
   */
  setCurrentTool(tool) {
    this.#currentTool = tool;
    this.#rootToToolComponent = null; // Invalidate cached path
  }

  /**
   * Set root to local path.
   * @param {SceneGraphPath} path - The path
   */
  setRootToLocal(path) {
    this.#rootToLocal = path;
    this.#rootToToolComponent = null; // Invalidate cached path
  }

  /**
   * Get the viewer.
   * @returns {Viewer} The viewer
   */
  getViewer() {
    return this.#viewer;
  }

  /**
   * Get the source input slot.
   * @returns {InputSlot} The source slot
   */
  getSource() {
    return this.#sourceSlot;
  }

  /**
   * Get transformation matrix for a slot.
   * @param {InputSlot} slot - The slot
   * @returns {number[]|null} 4x4 transformation matrix or null
   */
  getTransformationMatrix(slot) {
    return this.#deviceManager.getTransformationMatrix(slot);
  }

  /**
   * Get axis state for a slot.
   * @param {InputSlot} slot - The slot
   * @returns {AxisState|null} Axis state or null
   */
  getAxisState(slot) {
    return this.#deviceManager.getAxisState(slot);
  }

  /**
   * Get the time stamp.
   * @returns {number} Time in milliseconds
   */
  getTime() {
    return this.#event ? this.#event.getTimeStamp() : Date.now();
  }

  /**
   * Get root to local path.
   * @returns {SceneGraphPath} The path
   */
  getRootToLocal() {
    return this.#rootToLocal;
  }

  /**
   * Get root to tool component path.
   * @returns {SceneGraphPath} The path
   */
  getRootToToolComponent() {
    if (this.#rootToToolComponent === null && this.#rootToLocal !== null) {
      const list = [];
      // Iterate backwards through path to find component with tool
      for (const node of this.#rootToLocal.reverseIterator()) {
        if (node instanceof SceneGraphComponent) {
          if (node.getTools().includes(this.#currentTool)) {
            list.unshift(node);
            // Add remaining nodes
            for (const remainingNode of this.#rootToLocal.reverseIterator()) {
              if (remainingNode !== node) {
                list.unshift(remainingNode);
              }
            }
            break;
          }
        }
      }
      this.#rootToToolComponent = SceneGraphPath.fromList(list);
    }
    return this.#rootToToolComponent || this.#rootToLocal;
  }

  /**
   * Get current pick result.
   * @returns {PickResult|null} Pick result or null
   */
  getCurrentPick() {
    if (this.#pickResult === null) {
      const picks = this.getCurrentPicks();
      this.#pickResult = picks.length > 0 ? picks[0] : null;
    }
    return this.#pickResult;
  }

  /**
   * Get all current pick results.
   * @returns {PickResult[]} List of pick results
   */
  getCurrentPicks() {
    if (this.#pickResults === null) {
      this.#pickResults = this.#toolSystem.performPick();
    }
    return this.#pickResults;
  }

  /**
   * Get avatar path.
   * @returns {SceneGraphPath} Avatar path
   */
  getAvatarPath() {
    return this.#toolSystem.getAvatarPath();
  }

  /**
   * Get pick system.
   * @returns {PickSystem|null} Pick system or null
   */
  getPickSystem() {
    return this.#pickSystem;
  }

  /**
   * Reject this context (tool activation failed).
   */
  reject() {
    this.#rejected = true;
  }

  /**
   * Check if context was rejected.
   * @returns {boolean} True if rejected
   */
  isRejected() {
    return this.#rejected;
  }

  /**
   * Reset rejection flag.
   */
  resetRejected() {
    this.#rejected = false;
  }

  /**
   * Get key object.
   * @returns {Object} Key object
   */
  getKey() {
    return this.#toolSystem.getKey();
  }
}

/**
 * Pair class for tool changes.
 */
class Pair {
  /**
   * @param {Tool} tool - The tool
   * @param {SceneGraphPath} path - The path
   * @param {boolean} added - True if added, false if removed
   */
  constructor(tool, path, added) {
    this.tool = tool;
    this.path = path;
    this.added = added;
  }
}

/**
 * ToolSystem is the main execution engine for tools.
 * It processes events, manages tool activation/deactivation, and coordinates
 * between ToolManager, SlotManager, and DeviceManager.
 */
export class ToolSystem extends ToolEventReceiver {
  /** @type {WeakMap<Viewer, ToolSystem>} Global table of viewer to tool system */
  static #globalTable = new WeakMap();
  
  /** @type {Viewer} Viewer */
  #viewer;

  /** @type {ToolSystemConfiguration} Configuration */
  #config;

  /** @type {ToolContextImpl} Tool context */
  #toolContext;

  /** @type {ToolManager} Tool manager */
  #toolManager;

  /** @type {SlotManager} Slot manager */
  #slotManager;

  /** @type {DeviceManager} Device manager */
  #deviceManager;

  /** @type {ToolEventQueue} Event queue */
  #eventQueue;

  /** @type {PickSystem|null} Pick system */
  #pickSystem = null;

  /** @type {PosWHitFilter|null} Hit filter */
  #hitFilter = null;

  /** @type {ToolEvent[]} Computational queue */
  #compQueue = [];

  /** @type {ToolEvent[]} Trigger queue */
  #triggerQueue = [];

  /** @type {Map<Tool, SceneGraphPath[]>} Tool to active paths map */
  #toolToPath = new Map();

  /** @type {PickResult[]|null} Cached pick results */
  #pickResults = null;

  /** @type {PickResult|null} Cached pick result */
  #pickResult = null;

  /** @type {SceneGraphPath} Empty pick path */
  #emptyPickPath;

  /** @type {boolean} Whether system is executing */
  #executing = false;

  /** @type {boolean} Whether system is disposed */
  #disposed = false;

  /** @type {Pair[]} Pending tool changes */
  #toolsChanging = [];

  /** @type {Object} Key object */
  #KEY = {};

  /** @type {Map<SceneGraphComponent, Function[]>} Component to listeners map */
  #componentListeners = null;

  /** @type {number[]} Pointer transformation */
  #pointerTrafo = new Array(16).fill(0);

  /** @type {SceneGraphPath|null} Avatar path */
  #avatarPath = null;

  /**
   * Get or create tool system for a viewer.
   * @param {Viewer} viewer - The viewer
   * @returns {ToolSystem} Tool system
   */
  static toolSystemForViewer(viewer) {
    let ts = ToolSystem.#globalTable.get(viewer);
    if (ts !== undefined) {
      return ts;
    }
    const logger = getLogger('jsreality.core.scene.tool.ToolSystem');
    logger.warn(Category.ALL, 'Viewer has no tool system, allocating default');
    ts = new ToolSystem(viewer, null, null);
    ToolSystem.#globalTable.set(viewer, ts);
    return ts;
  }

  /**
   * Get tool system for a viewer (may return undefined).
   * @param {Viewer} viewer - The viewer
   * @returns {ToolSystem|undefined} Tool system or undefined
   */
  static getToolSystemForViewer(viewer) {
    return ToolSystem.#globalTable.get(viewer);
  }

  /**
   * Set tool system for a viewer.
   * @param {Viewer} viewer - The viewer
   * @param {ToolSystem} ts - The tool system
   */
  static setToolSystemForViewer(viewer, ts) {
    const existing = ToolSystem.#globalTable.get(viewer);
    if (existing !== undefined) {
      throw new Error(`Viewer already has tool system ${existing}`);
    }
    ToolSystem.#globalTable.set(viewer, ts);
  }

  /**
   * Remove tool system from global table.
   * @param {ToolSystem} ts - The tool system
   * @private
   */
  static #unsetToolSystem(ts) {
    for (const [viewer, system] of ToolSystem.#globalTable.entries()) {
      if (system === ts) {
        ToolSystem.#globalTable.delete(viewer);
        break;
      }
    }
  }

  /**
   * Get default tool system configuration.
   * Creates a configuration with mouse, keyboard, and system timer devices
   * and their default mappings.
   * @returns {ToolSystemConfiguration} Default configuration
   */
  static getDefaultToolSystemConfiguration() {
    return new ToolSystemConfiguration({
      rawConfigs: [
        new RawDeviceConfig('DeviceMouse', 'Mouse', {}),
        new RawDeviceConfig('DeviceKeyboard', 'Keyboard', {}),
        new RawDeviceConfig('DeviceSystemTimer', 'Timer', {})
      ],
      rawMappings: [
        // Mouse mappings
        new RawMapping('Mouse', 'left', InputSlot.LEFT_BUTTON),
        new RawMapping('Mouse', 'center', InputSlot.MIDDLE_BUTTON),
        new RawMapping('Mouse', 'right', InputSlot.RIGHT_BUTTON),
      // Raw mouse axes provide pointer position in NDC; mapped to PointerNDC.
      // A virtual device then converts (NDCToWorld, PointerNDC) -> POINTER_TRANSFORMATION.
      new RawMapping('Mouse', 'axes', InputSlot.getDevice('PointerNDC')),
        new RawMapping('Mouse', 'axesEvolution', InputSlot.getDevice('PointerEvolution')),
        new RawMapping('Mouse', 'wheel_up', InputSlot.getDevice('WheelUp')),
        new RawMapping('Mouse', 'wheel_down', InputSlot.getDevice('WheelDown')),
        // Keyboard mappings (common keys)
        new RawMapping('Keyboard', 'VK_W', InputSlot.getDevice('VK_W')),
        new RawMapping('Keyboard', 'VK_A', InputSlot.getDevice('VK_A')),
        new RawMapping('Keyboard', 'VK_S', InputSlot.getDevice('VK_S')),
        new RawMapping('Keyboard', 'VK_D', InputSlot.getDevice('VK_D')),
        new RawMapping('Keyboard', 'VK_SHIFT', InputSlot.SHIFT_LEFT_BUTTON),
        new RawMapping('Keyboard', 'VK_CONTROL', InputSlot.getDevice('VK_CONTROL')),
        new RawMapping('Keyboard', 'VK_ALT', InputSlot.getDevice('VK_ALT')),
        // System timer mapping
        new RawMapping('Timer', 'tick', InputSlot.SYSTEM_TIME)
      ],
      virtualMappings: [
        // Map pointer transformation to pointer hit
        new VirtualMapping(InputSlot.POINTER_TRANSFORMATION, InputSlot.getDevice('PointerHit')),
        // Map primary action to pointer hit
        new VirtualMapping(InputSlot.LEFT_BUTTON, InputSlot.getDevice('PointerHit'))
      ]
    });
  }

  /**
   * Create a new ToolSystem.
   * @param {Viewer} viewer - The viewer
   * @param {ToolSystemConfiguration|null} config - Configuration (null for default)
   * @param {Object|null} renderTrigger - Render trigger (optional)
   */
  constructor(viewer, config, renderTrigger) {
    super();
    this.#viewer = viewer;
    // If config is null, use default configuration
    if (config === null) {
      this.#config = ToolSystem.getDefaultToolSystemConfiguration();
    } else {
      this.#config = config;
    }
    this.#toolManager = new ToolManager();
    this.#eventQueue = new ToolEventQueue(this);
    this.#deviceManager = new DeviceManager(this.#config, this.#eventQueue, viewer);
    this.#slotManager = new SlotManager(this.#config);
    this.#toolContext = new ToolContextImpl(viewer, this.#deviceManager, null, this);
    this.#pickSystem = new AABBPickSystem();
    this.#emptyPickPath = new SceneGraphPath();
    this.#emptyPickPath.push(viewer.getSceneRoot());
    if (this.#pickSystem) {
      this.#pickSystem.setSceneRoot(viewer.getSceneRoot());
    }
  }

  /**
   * Initialize scene tools.
   * Traverses the scene graph to discover and register all tools,
   * and sets up listeners for automatic tool registration.
   */
  initializeSceneTools() {
    if (this.#disposed) return;
    this.#toolManager.cleanUp();
    
    if (this.#emptyPickPath.getLength() === 0) {
      this.#emptyPickPath.push(this.#viewer.getSceneRoot());
    }
    if (this.#pickSystem) {
      this.#pickSystem.setSceneRoot(this.#viewer.getSceneRoot());
    }
    
    // Discover and register tools from scene graph
    this.#discoverSceneTools();
    
    // Set up listeners for automatic tool registration
    this.#setupToolListeners();
    
    // Only start the queue if it hasn't been started yet
    if (!this.#eventQueue.isStarted()) {
      this.#eventQueue.start();
    }
  }

  /**
   * Re-discover tools in the scene graph without restarting the event queue.
   * Useful when content is added after initial initialization.
   */
  rediscoverSceneTools() {
    if (this.#disposed) return;
    
    // Update scene root references
    if (this.#emptyPickPath.getLength() === 0) {
      this.#emptyPickPath.push(this.#viewer.getSceneRoot());
    }
    if (this.#pickSystem) {
      this.#pickSystem.setSceneRoot(this.#viewer.getSceneRoot());
    }
    
    // Discover and register tools from scene graph
    this.#discoverSceneTools();
    
    // Set up listeners for automatic tool registration (idempotent)
    this.#setupToolListeners();
  }

  /**
   * Discover tools in the scene graph and register them.
   * @private
   */
  #discoverSceneTools() {
    const root = this.#viewer.getSceneRoot();
    if (!root) return;
    
    const path = new SceneGraphPath();
    path.push(root);
    this.#discoverToolsRecursive(root, path);
  }

  /**
   * Recursively discover tools in scene graph components.
   * @param {SceneGraphComponent} component - Current component
   * @param {SceneGraphPath} path - Current path
   * @private
   */
  #discoverToolsRecursive(component, path) {
    // Get tools from this component
    const tools = component.getTools();
      for (const tool of tools) {
        // At this point, path already ends at the current component, so we should
        // NOT push the component again. Using path directly matches the Java
        // ToolSystem behaviour and avoids duplicated nodes (e.g. "world : world").
        logger.finer(Category.ALL, `Discovering tool ${tool.constructor.name} at path: ${path.toString()}`);
        this.addTool(tool, path);
      }
    
    // Recursively process child components
    const children = component.getChildComponents();
    for (const child of children) {
      const childPath = path.pushNew(child);
      this.#discoverToolsRecursive(child, childPath);
    }
  }

  /**
   * Set up listeners on all scene graph components to automatically
   * register tools when they are added.
   * Also listens for new components being added to the scene graph.
   * @private
   */
  #setupToolListeners() {
    const root = this.#viewer.getSceneRoot();
    if (!root) return;
    
    // Add listeners to all existing components
    this.#addToolListenerRecursive(root);
    
    // Also listen for new components being added to the scene graph
    // so we can add listeners to them too
    const componentAddedListener = (event) => {
      // SceneGraphComponentEvent has newChild property directly
      if (event.newChild && event.newChild instanceof SceneGraphComponent) {
        const newComponent = event.newChild;
        // Add tool listeners to the new component and its subtree
        this.#addToolListenerRecursive(newComponent);
        // Also register any tools that already exist in the new component
        const tools = newComponent.getTools();
        for (const tool of tools) {
          this.#registerToolForComponent(tool, newComponent);
        }
      }
    };
    
    // Listen for child additions on all components
    this.#addComponentAddedListenerRecursive(root, componentAddedListener);
  }

  /**
   * Recursively add component-added listeners to components.
   * @param {SceneGraphComponent} component - Current component
   * @param {Function} listener - Listener function
   * @private
   */
  #addComponentAddedListenerRecursive(component, listener) {
    component.addEventListener('childAdded', listener);
    
    // Store listener for cleanup
    if (!this.#componentListeners) {
      this.#componentListeners = new Map();
    }
    if (!this.#componentListeners.has(component)) {
      this.#componentListeners.set(component, []);
    }
    this.#componentListeners.get(component).push(listener);
    
    // Recursively process child components
    const children = component.getChildComponents();
    for (const child of children) {
      this.#addComponentAddedListenerRecursive(child, listener);
    }
  }

  /**
   * Recursively add tool listeners to components.
   * @param {SceneGraphComponent} component - Current component
   * @private
   */
  #addToolListenerRecursive(component) {
    // Add listener for this component
    const listener = (event) => {
      if (event.type === 'toolAdded') {
        const tool = event.detail.tool;
        // Find all paths to this component and register the tool
        this.#registerToolForComponent(tool, component);
      } else if (event.type === 'toolRemoved') {
        const tool = event.detail.tool;
        // Find all paths to this component and unregister the tool
        this.#unregisterToolForComponent(tool, component);
      }
    };
    
    component.addEventListener('toolAdded', listener);
    component.addEventListener('toolRemoved', listener);
    
    // Store listener for cleanup
    if (!this.#componentListeners) {
      this.#componentListeners = new Map();
    }
    if (!this.#componentListeners.has(component)) {
      this.#componentListeners.set(component, []);
    }
    this.#componentListeners.get(component).push(listener);
    
    // Recursively process child components
    const children = component.getChildComponents();
    for (const child of children) {
      this.#addToolListenerRecursive(child);
    }
  }

  /**
   * Register a tool for all paths to a component.
   * @param {Tool} tool - The tool to register
   * @param {SceneGraphComponent} component - The component
   * @private
   */
  #registerToolForComponent(tool, component) {
    const root = this.#viewer.getSceneRoot();
    if (!root) return;
    
    // Find all paths from root to this component
    const paths = this.#findAllPathsToComponent(root, component, new SceneGraphPath());
    
    for (const path of paths) {
      // Each returned path already ends at the target component, so we use it
      // directly instead of pushing the component again.
      logger.finer(Category.ALL, `Auto-registering tool ${tool.constructor.name} at path: ${path.toString()}`);
      this.addTool(tool, path);
    }
  }

  /**
   * Unregister a tool for all paths to a component.
   * @param {Tool} tool - The tool to unregister
   * @param {SceneGraphComponent} component - The component
   * @private
   */
  #unregisterToolForComponent(tool, component) {
    const root = this.#viewer.getSceneRoot();
    if (!root) return;
    
    // Find all paths from root to this component
    const paths = this.#findAllPathsToComponent(root, component, new SceneGraphPath());
    
    for (const path of paths) {
      // Use the existing path ending at component
      this.removeTool(tool, path);
    }
  }

  /**
   * Find all paths from root to a target component.
   * @param {SceneGraphComponent} current - Current component in traversal
   * @param {SceneGraphComponent} target - Target component to find
   * @param {SceneGraphPath} currentPath - Current path being built
   * @returns {SceneGraphPath[]} Array of paths to the target
   * @private
   */
  #findAllPathsToComponent(current, target, currentPath) {
    const paths = [];
    const newPath = currentPath.pushNew(current);
    
    if (current === target) {
      paths.push(newPath);
    }
    
    const children = current.getChildComponents();
    for (const child of children) {
      const childPaths = this.#findAllPathsToComponent(child, target, newPath);
      paths.push(...childPaths);
    }
    
    return paths;
  }

  /**
   * Process a tool event.
   * @param {ToolEvent} event - The event to process
   */
  processToolEvent(event) {
    if (this.#disposed) return;
    this.#executing = true;
    
    this.#compQueue.push(event);
    let iterCnt = 0;
    
    do {
      iterCnt++;
      this.#processComputationalQueue();
      this.#processTriggerQueue();
      const newEvents = this.#deviceManager.updateImplicitDevices();
      if (newEvents.length === 0) break;
      this.#compQueue.push(...newEvents);
      if (iterCnt > 5000) {
        logger.warn(Category.ALL, 'ToolSystem may be stuck in endless loop');
        iterCnt = 0;
      }
    } while (true);

    // Handle newly added/removed tools
    if (this.#toolsChanging.length > 0) {
      const changes = [...this.#toolsChanging];
      this.#toolsChanging = [];
      for (const p of changes) {
        if (p.added) {
          this.#addToolImpl(p.tool, p.path);
        } else {
          this.#removeToolImpl(p.tool, p.path);
        }
      }
    }
    
    this.#executing = false;
    
    if (event.getInputSlot() === InputSlot.SYSTEM_TIME) {
      this.#deviceManager.setSystemTime(event.getTimeStamp());
    }
  }

  /**
   * Process computational queue.
   * @private
   */
  #processComputationalQueue() {
    while (this.#compQueue.length > 0) {
      const event = this.#compQueue.shift();
      this.#deviceManager.evaluateEvent(event, this.#compQueue);
      
      if (this.#isTrigger(event) && !event.isConsumed()) {
        this.#triggerQueue.push(event);
      }
    }
  }

  /**
   * Check if an event is a trigger.
   * @param {ToolEvent} event - The event
   * @returns {boolean} True if trigger
   * @private
   */
  #isTrigger(event) {
    const slot = event.getInputSlot();
    const isActive = this.#slotManager.isActiveSlot(slot);
    const isActivation = this.#slotManager.isActivationSlot(slot);
    return isActive || isActivation;
  }

  /**
   * Process trigger queue.
   * @private
   */
  #processTriggerQueue() {
    if (this.#triggerQueue.length === 0) return;

    const activatedTools = new Set();
    const deactivatedTools = new Set();
    const stillActiveTools = new Set();

    let pickPath = null;

    for (const event of this.#triggerQueue) {
      this.#toolContext.setEvent(event);
      const slot = event.getInputSlot();
      this.#toolContext.setSourceSlot(slot);
      this.#pickResults = null;
      this.#pickResult = null;

      const axis = this.#deviceManager.getAxisState(slot);
      let noTrigger = true;

        if (axis !== null && axis.isPressed()) {
        // Possible activation
        const candidatesForPick = new Set(this.#slotManager.getToolsActivatedBySlot(slot));
        logger.finer(
          Category.ALL,
          `[ToolSystem] Activation candidates for slot ${slot.getName()}: ${
            Array.from(candidatesForPick).map(t => `${t.constructor.name}(${t.getName()})`).join(', ') || '<none>'
          }`
        ); 
        const candidates = new Set();

        if (candidatesForPick.size > 0) {
          // Need pick path
          if (pickPath === null) {
            pickPath = this.#calculatePickPath();
              // Log the calculated pick path for debugging
              try {
                const pathDesc = pickPath && typeof pickPath.toString === 'function'
                  ? pickPath.toString()
                  : String(pickPath);
                logger.finer(
                  Category.ALL,
                  `[ToolSystem] Calculated pick path for activation: ${pathDesc}`
                );
              } catch (e) {
                logger.finer(
                  Category.ALL,
                  `[ToolSystem] Calculated pick path (toString() failed): ${pickPath ? '[object]' : 'null'}`
                );
              }
          }
          let level = pickPath.getLength();
          do {
            const selection = this.#toolManager.selectToolsForPath(pickPath, level--, candidatesForPick);
            logger.finer(
              Category.ALL,
              `[ToolSystem] selectToolsForPath at level ${level + 1}, pickPath=${pickPath}: ` +
              `selection=[${selection.map(t => `${t.constructor.name}(${t.getName()})`).join(', ') || '<none>'}]`
            ); if (selection.length === 0) continue;
            for (const tool of selection) {
              this.#registerActivePathForTool(pickPath, tool);
            }
            for (const tool of selection) {
              candidates.add(tool);
            }
            this.#activateToolSet(candidates);
            logger.finer(
              Category.ALL,
              `[ToolSystem] activatedTools now: ${Array.from(activatedTools).map(t => t.getName()).join(', ')}`
            );
          } while (candidates.size === 0 && level > 0);
          
          for (const tool of candidates) {
            activatedTools.add(tool);
          }
          noTrigger = candidates.size === 0;
        }
      }

      if (axis !== null && axis.isReleased()) {
        // Possible deactivation
        const deactivated = this.#findDeactivatedTools(slot);
        for (const tool of deactivated) {
          deactivatedTools.add(tool);
        }
        this.#deactivateToolSet(deactivated);
        noTrigger = deactivated.length === 0;
      }

      // Process all active tools if no tool was (de)activated
      if (noTrigger) {
        const active = this.#slotManager.getActiveToolsForSlot(slot);
        if (slot === InputSlot.POINTER_TRANSFORMATION) {
          logger.finer(Category.ALL, `[ToolSystem] noTrigger=true, active tools for POINTER_TRANSFORMATION: ${active.size}`);
          if (active.size === 0) {
            // logger.warn(Category.ALL, '[ToolSystem] No active tools found for POINTER_TRANSFORMATION!');
          } else {
            const toolNames = Array.from(active).map(t => `${t.constructor.name}(${t.getName()})`);
            logger.finer(Category.ALL, `[ToolSystem] Active tools: ${toolNames.join(', ')}`);
          }
        }
        for (const tool of active) {
          stillActiveTools.add(tool);
        }
        this.#processToolSet(active);
      } else if (slot === InputSlot.POINTER_TRANSFORMATION) {
        logger.finer(Category.ALL, 'noTrigger=false for POINTER_TRANSFORMATION (tool was activated/deactivated)');
      }
    }

    this.#triggerQueue = [];
    this.#slotManager.updateMaps(stillActiveTools, activatedTools, deactivatedTools);
  }

  /**
   * Register active path for a tool.
   * @param {SceneGraphPath} pickPath - Pick path
   * @param {Tool} tool - The tool
   * @private
   */
  #registerActivePathForTool(pickPath, tool) {
    const lastElement = pickPath.getLastElement();
    const path = (lastElement instanceof Geometry) ? pickPath.popNew() : pickPath;
    const paths = this.#toolToPath.get(tool) || [];
    paths.push(path);
    this.#toolToPath.set(tool, paths);
  }

  /**
   * Perform a pick operation.
   * @returns {PickResult[]} List of pick results
   * @private
   */
  performPick() {
    if (this.#pickSystem === null) {
      return [];
    }

    const pointerSlot = InputSlot.POINTER_TRANSFORMATION;
    const currentPointer = this.#deviceManager.getTransformationMatrix(pointerSlot);
    if (currentPointer === null) {
      return [];
    }

    // Copy pointer transformation
    for (let i = 0; i < 16; i++) {
      this.#pointerTrafo[i] = currentPointer[i];
    }

    // Calculate pick ray
    const to = [-this.#pointerTrafo[2], -this.#pointerTrafo[6], -this.#pointerTrafo[10], -this.#pointerTrafo[14]];
    const from = [this.#pointerTrafo[3], this.#pointerTrafo[7], this.#pointerTrafo[11], this.#pointerTrafo[15]];
    logger.fine(Category.ALL, `#performPick: from: ${from} to: ${to}`);
    try {
      // Compute pick
      this.#pickResults = this.#pickSystem.computePick(from, to);
      
      // Filter picks
      if (this.#hitFilter === null) {
        this.#hitFilter = new PosWHitFilter(this.#viewer);
      }
      this.#hitFilter.update();
      // Filter list - remove picks with negative W coordinate in NDC
      const filtered = [];
      for (const pick of this.#pickResults) {
        logger.fine(Category.ALL, `#performPick: pick world cords: ${pick.getWorldCoordinates().toString()}`);
        if (this.#hitFilter.accept(from, to, pick)) {
          filtered.push(pick);
        }
      }
      this.#pickResults = filtered;
    } catch (error) {
      logger.severe(Category.ALL, 'Error performing pick:', error);
      this.#pickResults = [];
    }

    return this.#pickResults;
  }

  /**
   * Calculate pick path.
   * @returns {SceneGraphPath} Pick path
   * @private
   */
  #calculatePickPath() {
    this.performPick();
    logger.fine(Category.ALL, `#calculatePickPath: pickResults: ${this.#pickResults.length}`);
    if (this.#pickResults === null || this.#pickResults.length === 0) {
      return this.#emptyPickPath;
    }
    return this.#pickResults[0].getPickPath();
  }

  /**
   * Activate a set of tools.
   * @param {Set<Tool>} toolSet - Set of tools
   * @private
   */
  #activateToolSet(toolSet) {
    for (const tool of toolSet) {
      this.#toolContext.setCurrentTool(tool);
      const resolvedSlot = this.#slotManager.resolveSlotForTool(tool, this.#toolContext.getSource());
      if (resolvedSlot === null) {
        logger.warn(Category.ALL, `activate: resolving ${this.#toolContext.getSource()} failed: ${tool.constructor.name}`);
        continue;
      }
      
      const paths = this.#getActivePathsForTool(tool);
      for (const path of paths) {
        this.#toolContext.setRootToLocal(path);
        // Create a temporary event with resolved slot (simplified)
        tool.activate(this.#toolContext);
        if (this.#toolContext.isRejected()) {
          toolSet.delete(tool);
          this.#toolContext.resetRejected();
        }
      }
    }
  }

  /**
   * Process a set of tools.
   * @param {Set<Tool>} toolSet - Set of tools
   * @private
   */
  #processToolSet(toolSet) {
    for (const tool of toolSet) {
      this.#toolContext.setCurrentTool(tool);
      const resolvedSlot = this.#slotManager.resolveSlotForTool(tool, this.#toolContext.getSource());
      const paths = this.#getActivePathsForTool(tool);
      
      if (paths.length === 0 && tool.getActivationSlots().length === 0) {
        logger.warn(Category.ALL, `Always-active tool ${tool.constructor.name} has no active paths`);
      }
      for (const path of paths) {
        this.#toolContext.setRootToLocal(path);
        tool.perform(this.#toolContext);
      }
    }
  }

  /**
   * Deactivate a set of tools.
   * @param {Set<Tool>} toolSet - Set of tools
   * @private
   */
  #deactivateToolSet(toolSet) {
    for (const tool of toolSet) {
      this.#toolContext.setCurrentTool(tool);
      const resolvedSlot = this.#slotManager.resolveSlotForTool(tool, this.#toolContext.getSource());
      if (resolvedSlot === null) {
        logger.warn(Category.ALL, `deactivate: resolving ${this.#toolContext.getSource()} failed: ${tool.constructor.name}`);
        continue;
      }
      const paths = this.#getActivePathsForTool(tool);
      for (const path of paths) {
        this.#toolContext.setRootToLocal(path);
        tool.deactivate(this.#toolContext);
      }
    }
  }

  /**
   * Get active paths for a tool.
   * @param {Tool} tool - The tool
   * @returns {SceneGraphPath[]} List of paths
   * @private
   */
  #getActivePathsForTool(tool) {
    return this.#toolToPath.get(tool) || [];
  }

  /**
   * Find deactivated tools for a slot.
   * @param {InputSlot} slot - The slot
   * @returns {Tool[]} List of tools
   * @private
   */
  #findDeactivatedTools(slot) {
    return Array.from(this.#slotManager.getToolsDeactivatedBySlot(slot));
  }

  /**
   * Add a tool.
   * @param {Tool} tool - The tool
   * @param {SceneGraphPath} path - The path
   */
  addTool(tool, path) {
    if (this.#disposed) return;
    if (this.#executing) {
      this.#toolsChanging.push(new Pair(tool, path, true));
    } else {
      this.#addToolImpl(tool, path);
    }
  }

  /**
   * Remove a tool.
   * @param {Tool} tool - The tool
   * @param {SceneGraphPath} path - The path
   */
  removeTool(tool, path) {
    if (this.#disposed) return;
    if (this.#executing) {
      this.#toolsChanging.push(new Pair(tool, path, false));
    } else {
      this.#removeToolImpl(tool, path);
    }
  }

  /**
   * Add tool implementation.
   * @param {Tool} tool - The tool
   * @param {SceneGraphPath} path - The path
   * @private
   */
  #addToolImpl(tool, path) {
    const first = this.#toolManager.addTool(tool, path);
    if (!this.#toolManager.needsPick(tool)) {
      // Always active tool
      const paths = this.#toolToPath.get(tool);
      if (paths === undefined) {
        this.#toolToPath.set(tool, [path]);
      } else {
        paths.push(path);
      }
      logger.finer(Category.ALL, `Registered always-active tool ${tool.constructor.name} with ${tool.getCurrentSlots().length} current slots`);
    }
    if (first) {
      this.#slotManager.registerTool(tool);
    }
  }

  /**
   * Remove tool implementation.
   * @param {Tool} tool - The tool
   * @param {SceneGraphPath} path - The path
   * @private
   */
  #removeToolImpl(tool, path) {
    const last = this.#toolManager.removeTool(tool, path);
    const activePaths = this.#getActivePathsForTool(tool);
    for (const activePath of activePaths) {
      if (activePath.isEqual(path)) {
        const te = ToolEvent.createFull(this, -1, InputSlot.getDevice("remove"), null, null);
        this.#toolContext.setCurrentTool(tool);
        this.#toolContext.setRootToLocal(path);
        this.#toolContext.setEvent(te);
        tool.deactivate(this.#toolContext);
        this.#toolToPath.delete(tool);
      }
    }
    if (last) {
      this.#slotManager.unregisterTool(tool);
    }
  }

  /**
   * Set pick system.
   * @param {PickSystem|null} pickSystem - Pick system
   */
  setPickSystem(pickSystem) {
    this.#pickSystem = pickSystem;
    if (pickSystem !== null) {
      pickSystem.setSceneRoot(this.#viewer.getSceneRoot());
    }
  }

  /**
   * Get pick system.
   * @returns {PickSystem|null} Pick system
   */
  getPickSystem() {
    return this.#pickSystem;
  }

  /**
   * Set avatar path.
   * @param {SceneGraphPath} path - Avatar path
   */
  setAvatarPath(path) {
    this.#avatarPath = path;
    this.#deviceManager.setAvatarPath(path);
  }

  /**
   * Get avatar path.
   * @returns {SceneGraphPath} Avatar path
   */
  getAvatarPath() {
    return this.#avatarPath || this.#viewer.getCameraPath();
  }

  /**
   * Get empty pick path.
   * @returns {SceneGraphPath} Empty pick path
   */
  getEmptyPickPath() {
    return this.#emptyPickPath;
  }

  /**
   * Set empty pick path.
   * @param {SceneGraphPath} path - Empty pick path
   */
  setEmptyPickPath(path) {
    if (path !== null) {
      if (path.getFirstElement().getName() !== this.#viewer.getSceneRoot().getName()) {
        throw new Error('empty pick path must start at scene root!');
      }
      this.#emptyPickPath = path;
    } else {
      this.#emptyPickPath = new SceneGraphPath();
      this.#emptyPickPath.push(this.#viewer.getSceneRoot());
    }
  }

  /**
   * Get key object.
   * @returns {Object} Key object
   */
  getKey() {
    return this.#KEY;
  }

  /**
   * Dispose of the tool system.
   */
  dispose() {
    this.#disposed = true;
    // In JavaScript, we can't block, so we just mark as disposed
    // The event queue will stop processing naturally
    this.#deviceManager.dispose();
    this.#eventQueue.dispose();
    ToolSystem.#unsetToolSystem(this);
  }
}

