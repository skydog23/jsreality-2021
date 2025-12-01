# Tool System Translation Report

## Overview

This report analyzes the Java tool system in `jreality-2021/src-core/de/jreality/scene/tool` and provides a strategy for translating it to JavaScript for the `jsreality-2021` project.

## Architecture Analysis

### Core Components

The tool system consists of 6 main files:

1. **`Tool.java`** - Interface defining the tool contract
2. **`InputSlot.java`** - Named input device abstraction (singleton pattern)
3. **`AxisState.java`** - Represents button states or double values [-1, 1]
4. **`ToolContext.java`** - Interface providing context during tool execution
5. **`AbstractTool.java`** - Base class with common tool functionality
6. **`BeanShellTool.java`** - Specialized tool for BeanShell scripting (can be skipped initially)

### Key Concepts

#### 1. Tool Lifecycle
- **Activation**: Tool becomes active when activation slot reaches `PRESSED` state (or always active if no activation slots)
- **Performance**: Tool performs actions when active and input changes
- **Deactivation**: Tool deactivates when activation slot reaches `RELEASED` state

#### 2. Input System
- **Virtual Devices**: Hardware-independent input abstractions (e.g., "PointerTransformation", "PrimaryActivation")
- **InputSlots**: Named references to virtual devices (singleton pattern by name)
- **AxisState**: Represents button states (PRESSED/RELEASED) or continuous values [-1, 1]
- **Transformation Matrices**: 4x4 matrices (as `DoubleArray` of length 16) representing spatial transformations

#### 3. Tool Context
Provides access to:
- Current viewer
- Input slot states (AxisState or TransformationMatrix)
- Scene graph paths (root to local, root to tool component)
- Pick results
- Time stamps
- Avatar path (for immersive environments)

## Translation Strategy

### Phase 1: Core Data Structures

#### 1.1 `InputSlot.js`
**Java Pattern**: Singleton registry with `getDevice(String name)` factory method

**JS Translation**:
```javascript
export class InputSlot {
  static #name2device = new Map();
  
  #name;
  #hash;
  
  constructor(name) {
    this.#name = name;
    this.#hash = this.#hashCode(name);
  }
  
  static getDevice(name) {
    if (InputSlot.#name2device.has(name)) {
      return InputSlot.#name2device.get(name);
    }
    const slot = new InputSlot(name);
    InputSlot.#name2device.set(name, slot);
    return slot;
  }
  
  getName() { return this.#name; }
  hashCode() { return this.#hash; }
  equals(other) { return this === other || (other instanceof InputSlot && this.#name === other.#name); }
  
  // Predefined slots
  static POINTER_HIT = InputSlot.getDevice("PointerHit");
  static POINTER_TRANSFORMATION = InputSlot.getDevice("PointerTransformation");
  static SYSTEM_TIME = InputSlot.getDevice("SystemTime");
  static LEFT_BUTTON = InputSlot.getDevice("PrimaryAction");
  static MIDDLE_BUTTON = InputSlot.getDevice("PrimaryMenu");
  static RIGHT_BUTTON = InputSlot.getDevice("PrimarySelection");
  // ... etc
}
```

**Key Changes**:
- Use `Map` instead of `HashMap`
- Use private fields (`#`) instead of `private`
- Remove `Serializable` interface (not needed in JS)
- Remove `readResolve()` (no serialization)
- Use static private field for registry

#### 1.2 `AxisState.js`
**Java Pattern**: Value class with static constants

**JS Translation**:
```javascript
export class AxisState {
  static PRESSED = new AxisState(Number.MAX_SAFE_INTEGER);
  static ORIGIN = new AxisState(0);
  
  #state;
  static #MINUS_PRESSED = -Number.MAX_SAFE_INTEGER;
  
  constructor(value) {
    if (typeof value === 'number') {
      // Clamp to [-1, 1] range
      if (value < -1 || value > 1) {
        value = value < 0 ? -1 : 1;
      }
      this.#state = Math.floor(value * Number.MAX_SAFE_INTEGER);
    } else {
      this.#state = value; // Assume int
    }
  }
  
  intValue() { return this.#state; }
  doubleValue() { return this.#state / Number.MAX_SAFE_INTEGER; }
  isPressed() { return this.#state === Number.MAX_SAFE_INTEGER || this.#state === AxisState.#MINUS_PRESSED; }
  isReleased() { return this.#state === 0; }
  toString() { /* ... */ }
}
```

**Key Changes**:
- Use `Number.MAX_SAFE_INTEGER` instead of `Integer.MAX_VALUE`
- Remove `Serializable` interface
- Use private fields

#### 1.3 `Tool.js` (Interface)
**Java Pattern**: Interface with methods

**JS Translation**:
```javascript
/**
 * @interface
 */
export class Tool {
  /**
   * @returns {InputSlot[]}
   */
  getActivationSlots() { throw new Error('Method not implemented'); }
  
  /**
   * @returns {InputSlot[]}
   */
  getCurrentSlots() { throw new Error('Method not implemented'); }
  
  /**
   * @param {ToolContext} tc
   */
  activate(tc) { throw new Error('Method not implemented'); }
  
  /**
   * @param {ToolContext} tc
   */
  perform(tc) { throw new Error('Method not implemented'); }
  
  /**
   * @param {ToolContext} tc
   */
  deactivate(tc) { throw new Error('Method not implemented'); }
  
  /**
   * @param {InputSlot} slot
   * @returns {string}
   */
  getDescription(slot) { throw new Error('Method not implemented'); }
  
  /**
   * @returns {string}
   */
  getDescription() { throw new Error('Method not implemented'); }
}
```

**Key Changes**:
- Use class with throw-on-call pattern (JS doesn't have true interfaces)
- Use JSDoc `@interface` tag for documentation
- Convert method names to camelCase (already camelCase in Java)

### Phase 2: Tool Context

#### 2.1 `ToolContext.js` (Interface)
**Dependencies**: 
- `Viewer` (already translated)
- `SceneGraphPath` (already translated)
- `PickResult` (already translated)
- `PickSystem` (already translated)
- `DoubleArray` (needs translation or use `number[]`)

**JS Translation**:
```javascript
/**
 * @typedef {import('../scene/Viewer.js').Viewer} Viewer
 * @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath
 * @typedef {import('../scene/pick/PickResult.js').PickResult} PickResult
 * @typedef {import('../scene/pick/PickSystem.js').PickSystem} PickSystem
 */

/**
 * @interface
 */
export class ToolContext {
  /**
   * @returns {Viewer}
   */
  getViewer() { throw new Error('Method not implemented'); }
  
  /**
   * @returns {InputSlot}
   */
  getSource() { throw new Error('Method not implemented'); }
  
  /**
   * @param {InputSlot} slot
   * @returns {number[]|null} 4x4 matrix as array of 16 numbers (column-major)
   */
  getTransformationMatrix(slot) { throw new Error('Method not implemented'); }
  
  /**
   * @param {InputSlot} slot
   * @returns {AxisState|null}
   */
  getAxisState(slot) { throw new Error('Method not implemented'); }
  
  /**
   * @returns {number} Time stamp in milliseconds
   */
  getTime() { throw new Error('Method not implemented'); }
  
  /**
   * @returns {SceneGraphPath}
   */
  getRootToLocal() { throw new Error('Method not implemented'); }
  
  /**
   * @returns {SceneGraphPath}
   */
  getRootToToolComponent() { throw new Error('Method not implemented'); }
  
  /**
   * @returns {PickResult|null}
   */
  getCurrentPick() { throw new Error('Method not implemented'); }
  
  /**
   * @returns {PickResult[]}
   */
  getCurrentPicks() { throw new Error('Method not implemented'); }
  
  /**
   * @returns {SceneGraphPath|null}
   */
  getAvatarPath() { throw new Error('Method not implemented'); }
  
  /**
   * @returns {PickSystem}
   */
  getPickSystem() { throw new Error('Method not implemented'); }
  
  /**
   * Reject activation (only valid during activate call)
   */
  reject() { throw new Error('Method not implemented'); }
  
  /**
   * @returns {*}
   */
  getKey() { throw new Error('Method not implemented'); }
}
```

**Key Changes**:
- Use `number[]` instead of `DoubleArray` (or translate `DoubleArray` separately)
- Use `number` instead of `long` for time
- Use JSDoc typedefs for type references

### Phase 3: Abstract Tool Implementation

#### 3.1 `AbstractTool.js`
**Java Pattern**: Abstract base class with common functionality

**JS Translation**:
```javascript
import { Tool } from './Tool.js';
import { InputSlot } from './InputSlot.js';

export class AbstractTool extends Tool {
  static #counter = 0;
  #hash;
  
  /** @type {InputSlot[]} */
  _activationSlots; // Protected for subclass access
  
  /** @type {InputSlot[]} */
  #currentSlots = [];
  
  /** @type {Map<InputSlot, string>} */
  #descriptions = new Map();
  
  /** @type {string|null} */
  #description = null;
  
  constructor(...activationSlots) {
    super();
    this.#hash = AbstractTool.#hash();
    if (activationSlots.length === 0 || activationSlots[0] === null) {
      this._activationSlots = [];
    } else {
      this._activationSlots = [...activationSlots];
    }
  }
  
  getActivationSlots() {
    return [...this._activationSlots]; // Return copy
  }
  
  getCurrentSlots() {
    return [...this.#currentSlots]; // Return copy
  }
  
  addCurrentSlot(slot, description = null) {
    if (this.#currentSlots.length === 0) {
      this.#currentSlots = [];
    }
    if (!this.#currentSlots.includes(slot)) {
      this.#currentSlots.push(slot);
    }
    this.setDescription(slot, description);
  }
  
  setDescription(slot, description) {
    this.#descriptions.set(slot, description !== null ? description : "<no description>");
  }
  
  removeCurrentSlot(slot) {
    const index = this.#currentSlots.indexOf(slot);
    if (index !== -1) {
      this.#currentSlots.splice(index, 1);
    }
  }
  
  activate(tc) {
    // Default: do nothing
  }
  
  perform(tc) {
    // Default: do nothing
  }
  
  deactivate(tc) {
    // Default: do nothing
  }
  
  getDescription(slot) {
    return this.#descriptions.get(slot) || "<no description>";
  }
  
  getDescription() {
    return this.#description !== null ? this.#description : "none";
  }
  
  setDescription(description) {
    this.#description = description;
  }
  
  fullDescription() {
    let sb = `${this.constructor.name}: ${this.getDescription()}\n`;
    sb += `always active=${this._activationSlots.length === 0}\n`;
    sb += "current slots:\n";
    for (const slot of this.getCurrentSlots()) {
      sb += `\t[${slot.getName()}: ${this.getDescription(slot)}]\n`;
    }
    return sb;
  }
  
  static #hash() {
    return AbstractTool.#counter++;
  }
  
  hashCode() {
    return this.#hash;
  }
  
  equals(other) {
    return this === other || (other instanceof AbstractTool && this.#hash === other.#hash);
  }
}
```

**Key Changes**:
- Use `Map` instead of `HashMap`
- Use `Array` instead of `List`/`LinkedList`
- Use spread operator for array copying
- Use `includes()` instead of `contains()`
- Use `splice()` for removal
- Use template literals instead of `StringBuffer`
- Remove `transient` keyword (not needed in JS)
- Use protected field (`_activationSlots`) for subclass access

### Phase 4: Integration Points

#### 4.1 `SceneGraphComponent` Integration
**Status**: Already has `#tools = []` array

**Required Changes**:
```javascript
// Add methods to SceneGraphComponent.js
addTool(tool) {
  this.checkReadOnly();
  if (this.#tools.includes(tool)) return; // Prevent duplicates
  this.#tools.push(tool);
  this.#fireToolAdded(tool);
}

removeTool(tool) {
  this.checkReadOnly();
  const index = this.#tools.indexOf(tool);
  if (index === -1) return false;
  this.#tools.splice(index, 1);
  this.#fireToolRemoved(tool);
  return true;
}

getTools() {
  return [...this.#tools]; // Return copy
}

#fireToolAdded(tool) {
  // Emit event (if event system is implemented)
  this.dispatchEvent(new CustomEvent('toolAdded', { detail: { tool } }));
}

#fireToolRemoved(tool) {
  // Emit event (if event system is implemented)
  this.dispatchEvent(new CustomEvent('toolRemoved', { detail: { tool } }));
}
```

#### 4.2 Tool System Executor (Future Work)
**Note**: The actual tool execution system is not in this package. It would need to be implemented separately to:
- Listen for input events (mouse, keyboard, touch)
- Map hardware input to virtual devices (InputSlots)
- Traverse scene graph and activate/perform/deactivate tools
- Manage tool state and context

This would likely be in a separate `toolsystem` package (not present in the analyzed directory).

## Dependencies

### Already Translated
- ✅ `SceneGraphPath` - Used by `ToolContext`
- ✅ `Viewer` - Used by `ToolContext`
- ✅ `PickResult` - Used by `ToolContext`
- ✅ `PickSystem` - Used by `ToolContext`
- ✅ `SceneGraphComponent` - Has tools array (needs methods)

### Needs Translation or Adaptation
- ⚠️ `DoubleArray` - Used for transformation matrices
  - **Option 1**: Translate `DoubleArray` class
  - **Option 2**: Use `number[]` directly (simpler, recommended)
  - **Option 3**: Use `Float64Array` for performance

### Browser-Specific Considerations
- **Input Events**: Map browser events (mouse, keyboard, touch) to `InputSlot`/`AxisState`
- **Time**: Use `Date.now()` or `performance.now()` instead of Java's `System.currentTimeMillis()`
- **Serialization**: Not needed (remove `Serializable` interfaces)

## Translation Order

1. **Phase 1**: Core data structures
   - `InputSlot.js`
   - `AxisState.js`
   - `Tool.js` (interface)

2. **Phase 2**: Context and base class
   - `ToolContext.js` (interface)
   - `AbstractTool.js`

3. **Phase 3**: Integration
   - Add tool methods to `SceneGraphComponent.js`
   - Create `index.js` export file

4. **Phase 4**: Tool System Executor (future)
   - Input event handling
   - Virtual device mapping
   - Tool activation/deactivation logic
   - Tool context implementation

## Testing Strategy

1. **Unit Tests**: Test each class independently
   - `InputSlot` singleton behavior
   - `AxisState` value conversion
   - `AbstractTool` slot management

2. **Integration Tests**: Test tool attachment to scene graph
   - Add/remove tools from `SceneGraphComponent`
   - Verify tool lifecycle methods are called

3. **End-to-End Tests**: Test with actual tool implementations (future)
   - Create simple tool (e.g., rotation tool)
   - Attach to scene graph component
   - Simulate input events
   - Verify tool activation/performance/deactivation

## Potential Challenges

1. **Tool System Executor**: The actual execution engine is not in this package. This would need to be implemented separately or found in another package.

2. **Input Mapping**: Mapping browser events to virtual devices requires careful design to maintain hardware independence.

3. **Thread Safety**: Java's `synchronized` blocks are not needed in JavaScript's single-threaded environment, but care must be taken with async operations.

4. **Serialization**: Java's `Serializable` and `readResolve()` are not needed in JavaScript. If persistence is needed, use JSON serialization.

5. **DoubleArray**: Decide whether to translate `DoubleArray` or use native `number[]`/`Float64Array`.

## Recommendations

1. **Start Simple**: Translate core data structures first (`InputSlot`, `AxisState`, `Tool` interface)

2. **Use Native Types**: Prefer `number[]` over `DoubleArray` unless there's a specific need for the `DoubleArray` API

3. **Skip BeanShellTool**: Not needed for initial translation (BeanShell is Java-specific)

4. **Defer Tool Executor**: Focus on the tool infrastructure first; the executor can be implemented later

5. **Event System**: Consider using browser's native `EventTarget` API or a lightweight event emitter for tool events

6. **Type Safety**: Use JSDoc types extensively for better IDE support and documentation

## File Structure

```
jsreality-2021/src/core/scene/tool/
├── InputSlot.js
├── AxisState.js
├── Tool.js
├── ToolContext.js
├── AbstractTool.js
└── index.js
```

## Tool System Execution Architecture

After analyzing `src-tool/de/jreality/toolsystem/*.java`, the tool execution system is now understood. This section documents how tools are executed.

### Core Execution Components

#### 1. **ToolSystem.java** - Main Execution Engine
**Purpose**: Central coordinator for tool execution

**Key Responsibilities**:
- Manages tool lifecycle (activation, performance, deactivation)
- Processes tool events from event queue
- Handles picking for tool activation
- Manages tool-to-path mappings
- Coordinates with DeviceManager, ToolManager, SlotManager

**Key Methods**:
- `processToolEvent(ToolEvent event)` - Main entry point for processing events
- `processComputationalQueue()` - Processes computational events (virtual device updates)
- `processTriggerQueue()` - Processes trigger events (activation/deactivation/performance)
- `activateToolSet(Set<Tool>)` - Activates a set of tools
- `processToolSet(Set<Tool>)` - Calls `perform()` on active tools
- `deactivateToolSet(Set<Tool>)` - Deactivates a set of tools
- `performPick()` - Performs ray picking for tool activation

**ToolContext Implementation**:
- `ToolContextImpl` (inner class) implements `ToolContext` interface
- Provides access to viewer, pick results, transformation matrices, axis states
- Manages scene graph paths (`rootToLocal`, `rootToToolComponent`)

**Event Processing Flow**:
1. Event arrives via `processToolEvent()`
2. Event added to `compQueue` (computational queue)
3. Process computational queue (evaluates virtual devices)
4. If event is a trigger, add to `triggerQueue`
5. Process trigger queue:
   - Check for activations (axis pressed)
   - Check for deactivations (axis released)
   - Process active tools (call `perform()`)
6. Update slot mappings

**Thread Safety**:
- Uses `synchronized` blocks and `mutex` for thread safety
- Queues tool add/remove operations during execution
- Uses `WeakHashMap` for viewer-to-tool-system mapping

#### 2. **ToolManager.java** - Tool Registration and Selection
**Purpose**: Manages tool registration and path-based tool selection

**Key Responsibilities**:
- Tracks which tools are registered with which paths
- Determines if a tool needs picking for activation
- Selects tools for a given scene graph path

**Key Methods**:
- `addTool(Tool, SceneGraphPath)` - Register tool with path
- `removeTool(Tool, SceneGraphPath)` - Unregister tool
- `needsPick(Tool)` - Check if tool requires picking
- `selectToolsForPath(SceneGraphPath, int, Set<Tool>)` - Select tools matching path

**Tool Selection Algorithm**:
- Traverses scene graph path from leaf to root
- At each level, checks if `SceneGraphComponent` has tools
- Returns first matching set of tools (closest to pick point)

#### 3. **SlotManager.java** - Slot-to-Tool Mapping
**Purpose**: Manages mapping between InputSlots and Tools

**Key Responsibilities**:
- Maps activation slots to tools
- Maps active slots to active tools
- Handles virtual slot mappings (slot aliasing)
- Resolves slot mappings for tools

**Key Data Structures**:
- `slot2activation` - Maps slots to tools that can be activated
- `slot2active` - Maps slots to currently active tools
- `slot2deactivation` - Maps slots to tools that can be deactivated
- `tool2currentSlots` - Maps tools to their current slots
- `virtualMappings` - Maps virtual slots to source slots

**Key Methods**:
- `registerTool(Tool)` - Register tool and its slot mappings
- `unregisterTool(Tool)` - Unregister tool
- `updateMaps(...)` - Update slot mappings after tool state changes
- `resolveSlotForTool(Tool, InputSlot)` - Resolve virtual slot to tool's expected slot

**Virtual Slot Mappings**:
- Allows one slot to be aliased to another (e.g., "PrimaryAction" → "LeftButton")
- Supports many-to-one and one-to-many mappings
- Used for hardware abstraction

#### 4. **DeviceManager.java** - Input Device Management
**Purpose**: Manages raw devices and virtual devices

**Key Responsibilities**:
- Manages raw input devices (mouse, keyboard, etc.)
- Evaluates virtual devices (transformation chains)
- Provides current axis states and transformation matrices
- Updates implicit devices (e.g., pointer transformation)

**Key Data Structures**:
- `rawDevices` - Map of raw device names to RawDevice instances
- `slot2virtual` - Maps slots to virtual devices that produce them
- `slot2axis` - Current axis states for slots
- `slot2transformation` - Current transformation matrices for slots

**Virtual Device Evaluation**:
- Virtual devices are evaluated lazily when their output is requested
- Virtual devices can depend on other virtual devices (dependency graph)
- Evaluation order is determined by dependencies

**Implicit Devices**:
- `PointerTransformation` - Computed from mouse position and camera
- `WorldToCamera` - Camera transformation
- `CameraToNDC` - Camera projection matrix
- `AvatarTransformation` - Avatar/wand transformation (for VR)

#### 5. **ToolEvent.java** - Event Representation
**Purpose**: Represents input events in the tool system

**Key Properties**:
- `device` - InputSlot that generated the event
- `axis` - AxisState (for button/axis events)
- `trafo` - DoubleArray transformation matrix (for transformation events)
- `time` - Timestamp
- `source` - Object that generated the event (RawDevice, etc.)
- `consumed` - Flag indicating if event was consumed

**Event Types**:
- Axis events: Button press/release or continuous axis value
- Transformation events: 4x4 transformation matrix

**Event Processing**:
- Events can be consumed to prevent further processing
- Events can be replaced/merged if they represent the same state

#### 6. **ToolEventQueue.java** - Event Queue Management
**Purpose**: Thread-safe event queue for tool system

**Key Features**:
- Thread-safe queue using `synchronized` blocks
- Background thread processes events
- Supports start/stop/dispose lifecycle
- Prevents event loss during processing

**Event Thread**:
- Runs in separate thread
- Waits on queue when empty
- Processes events by calling `receiver.processToolEvent()`
- Handles exceptions gracefully

#### 7. **VirtualDevice.java** - Virtual Device Interface
**Purpose**: Interface for virtual devices (transformation chains)

**Key Methods**:
- `process(VirtualDeviceContext)` - Process input and produce output event
- `initialize(List<InputSlot>, InputSlot, Map)` - Initialize with configuration
- `dispose()` - Cleanup resources

**Virtual Device Types** (in `virtual/` package):
- `VirtualMousePointerTrafo` - Converts mouse position to 3D transformation
- `VirtualRotation` - Extracts rotation from transformation
- `VirtualTranslationFromXYZ` - Extracts translation from transformation
- `VirtualClick` - Converts axis state to click events
- `VirtualFilterAxis` - Filters axis values
- Many more transformation and filtering operations

### Tool Execution Flow

#### Initialization
1. `ToolSystem` created with viewer and configuration
2. `DeviceManager` initialized with raw devices and virtual device config
3. `SlotManager` initialized with virtual slot mappings
4. `ToolManager` initialized (empty)
5. `ToolEventQueue` started (background thread)
6. `initializeSceneTools()` called:
   - Registers `AnimatorTool` (always active)
   - Enables mouse-over support
   - Sets up pick system

#### Tool Registration
1. Tool added to `SceneGraphComponent` via `addTool()`
2. `ToolSystem.addTool()` called with tool and path
3. `ToolManager.addTool()` registers tool-path mapping
4. `SlotManager.registerTool()` registers tool's slots:
   - Maps activation slots to tool
   - Maps current slots to tool
   - Resolves virtual slot mappings

#### Event Processing
1. **Raw Device** generates event (mouse move, button press, etc.)
2. Event added to `ToolEventQueue`
3. Event thread calls `ToolSystem.processToolEvent()`
4. Event added to computational queue
5. **Computational Queue Processing**:
   - `DeviceManager.evaluateEvent()` processes event
   - Virtual devices that depend on this event are evaluated
   - New events may be generated and added to queue
   - Process repeats until queue is empty
6. **Trigger Queue Processing** (if event is a trigger):
   - **Activation**: If axis is pressed:
     - Find tools activated by this slot
     - Perform picking (if needed)
     - Select tools matching pick path
     - Call `activate()` on selected tools
   - **Deactivation**: If axis is released:
     - Find tools deactivated by this slot
     - Call `deactivate()` on tools
   - **Performance**: If no activation/deactivation:
     - Find active tools for this slot
     - Call `perform()` on active tools
7. **Slot Mapping Update**:
   - `SlotManager.updateMaps()` updates slot-to-tool mappings
   - Reflects new tool states

#### Tool Lifecycle
1. **Activation** (`activate()` called):
   - Tool can reject activation via `ToolContext.reject()`
   - Tool sets up its state
   - Tool may add current slots dynamically
2. **Performance** (`perform()` called repeatedly):
   - Tool reads input from `ToolContext`
   - Tool modifies scene graph
   - Tool may add/remove current slots
3. **Deactivation** (`deactivate()` called):
   - Tool cleans up its state
   - Tool's current slots are cleared

### Browser-Specific Considerations

#### Input Event Mapping
**Java**: Uses AWT/Swing events (`MouseEvent`, `KeyEvent`)
**JavaScript**: Use browser DOM events:
- `MouseEvent` → Map to mouse slots
- `KeyboardEvent` → Map to keyboard slots
- `TouchEvent` → Map to touch slots
- `WheelEvent` → Map to scroll/zoom slots

**Example Mapping**:
```javascript
canvas.addEventListener('mousedown', (e) => {
  const slot = InputSlot.LEFT_BUTTON;
  const axis = AxisState.PRESSED;
  const event = new ToolEvent(canvas, Date.now(), slot, axis);
  toolSystem.processToolEvent(event);
});
```

#### Pointer Transformation
**Java**: Computes from mouse position and camera matrices
**JavaScript**: Similar approach:
- Get mouse position in canvas coordinates
- Convert to NDC coordinates
- Compute ray from camera through NDC point
- Convert to world coordinates using camera matrices

#### Threading
**Java**: Uses separate thread for event queue
**JavaScript**: Single-threaded, use `requestAnimationFrame` or `setTimeout`:
- Process events in animation frame
- Or use Web Workers for heavy processing (complex)

#### Configuration
**Java**: Loads from XML files (`toolconfig.xml`)
**JavaScript**: Options:
- Load from JSON files (simpler)
- Use JavaScript configuration objects
- Support both for flexibility

### Translation Strategy for Tool Execution

#### Phase 1: Core Execution (High Priority)
1. **ToolSystem.js** - Main execution engine
   - Event processing loop
   - Tool activation/deactivation logic
   - Pick integration
   - ToolContext implementation

2. **ToolManager.js** - Tool registration
   - Tool-path tracking
   - Tool selection algorithm

3. **SlotManager.js** - Slot mapping
   - Slot-to-tool mappings
   - Virtual slot resolution

#### Phase 2: Device Management (Medium Priority)
4. **DeviceManager.js** - Device management
   - Raw device abstraction
   - Virtual device evaluation
   - Implicit device computation

5. **ToolEvent.js** - Event representation
   - Event data structure
   - Event comparison/merging

6. **ToolEventQueue.js** - Event queue
   - Event queue management
   - Event processing loop

#### Phase 3: Virtual Devices (Lower Priority)
7. **VirtualDevice.js** - Virtual device interface
8. **VirtualMousePointerTrafo.js** - Mouse pointer transformation
9. **Other virtual devices** - As needed

#### Phase 4: Raw Devices (Lower Priority)
10. **RawDevice.js** - Raw device interface
11. **DeviceMouse.js** - Mouse device
12. **DeviceKeyboard.js** - Keyboard device
13. **DeviceSystemTimer.js** - System timer device

### Key Translation Patterns

#### 1. Thread Safety → Async Processing
**Java**: `synchronized` blocks, separate threads
**JavaScript**: 
- Use `async/await` for async operations
- Use `Set`/`Map` for thread-safe-like collections
- Process events in `requestAnimationFrame` loop

#### 2. WeakHashMap → WeakMap
**Java**: `WeakHashMap<Viewer, ToolSystem>`
**JavaScript**: `WeakMap` (but keys must be objects, not primitives)

#### 3. Event Queue → Event Loop
**Java**: Separate thread with blocking queue
**JavaScript**: 
- Use `requestAnimationFrame` for animation loop
- Or use `setTimeout`/`setInterval` for periodic processing
- Process queue synchronously in frame

#### 4. XML Configuration → JSON/JS Config
**Java**: XML parsing with DOM/SAX
**JavaScript**: 
- Use `JSON.parse()` for JSON configs
- Or use JavaScript objects directly
- Simpler and more idiomatic

#### 5. AWT Events → DOM Events
**Java**: AWT `MouseEvent`, `KeyEvent`
**JavaScript**: 
- Use `MouseEvent`, `KeyboardEvent` from DOM
- Map to `ToolEvent` instances
- Handle event propagation/bubbling

### Dependencies for Tool Execution

#### Already Translated
- ✅ `SceneGraphPath` - Used for tool paths
- ✅ `SceneGraphComponent` - Has tools array
- ✅ `Viewer` - Used by ToolSystem
- ✅ `PickSystem` - Used for tool activation
- ✅ `PickResult` - Used for pick information

#### Needs Translation
- ⚠️ `DoubleArray` - Used for transformation matrices
  - **Recommendation**: Use `number[]` or `Float64Array` directly
- ⚠️ `Matrix` - Used for matrix operations
  - **Status**: May already be translated
- ⚠️ `CameraUtility` - Used for camera transformations
  - **Status**: May need translation
- ⚠️ `Rn` (Rn.java) - Matrix/vector math utilities
  - **Status**: May already be translated

### Testing Strategy for Tool Execution

1. **Unit Tests**:
   - Test `ToolSystem.processToolEvent()` with mock events
   - Test `ToolManager` tool selection
   - Test `SlotManager` slot resolution

2. **Integration Tests**:
   - Test tool activation/deactivation flow
   - Test virtual device evaluation
   - Test pick-based tool activation

3. **End-to-End Tests**:
   - Create simple tool (e.g., `TranslateTool`)
   - Attach to scene graph component
   - Simulate mouse events
   - Verify tool activation and scene modification

## Summary

The tool system is well-designed and translates cleanly to JavaScript. The main challenges are:
1. Deciding on `DoubleArray` vs native arrays (recommend `number[]` or `Float64Array`)
2. Implementing the tool executor (now understood - see Tool System Execution Architecture above)
3. Mapping browser input events to virtual devices (use DOM events)
4. Replacing threading model with async/event loop (use `requestAnimationFrame`)

The core infrastructure (Tool, InputSlot, AxisState, ToolContext, AbstractTool) can be translated straightforwardly with modern JavaScript patterns. The execution system (ToolSystem, ToolManager, SlotManager, DeviceManager) is more complex but follows clear patterns that translate well to JavaScript's event-driven model.

