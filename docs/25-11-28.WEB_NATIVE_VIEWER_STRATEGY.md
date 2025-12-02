# Web-Native Viewer Strategy: JSRViewer Functionality Without Plugin System

## Folder Structure

The `JSRViewer` class and related components will be located in:
- **Main class**: `src/core/viewers/app/JSRViewer.js`
- **Supporting classes**: `src/core/viewers/app/` (ContentManager, Menubar, Toolbar, etc.)

This places the application-level viewer functionality as a subfolder of the `viewers` folder, since `JSRViewer` is essentially a viewer with additional application-level features (menus, panels, content management, etc.).

## What Information Do Plugins Receive?

### At Installation Time (`install(Controller c)`)

Plugins receive access to:

1. **Controller** - Provides:
   - `c.getPlugin(Class<T>)` - Get other plugin instances
   - `c.getPlugins(Class<T>)` - Get all plugins of a type
   - `c.storeProperty(Class, String, Object)` - Store preferences
   - `c.getProperty(Class, String, Object)` - Get preferences
   - `c.isActive(Plugin)` - Check if plugin is active

2. **Other Plugins** (via Controller):
   - **View** - `c.getPlugin(View.class)`
     - `getViewer()` → ViewerSwitch
     - `getRenderTrigger()` → RenderTrigger
     - `getSelectionManager()` → SelectionManager
     - `getViewingComponent()` → Component (Swing)
     - `createViewerMenu()` → JMenu
     - `getPanelsMenu()` → JMenu
     - `getContaintersMenu()` → JMenu
   
   - **Scene** - `c.getPlugin(Scene.class)`
     - `getSceneRoot()` → SceneGraphComponent
     - `getCameraPath()` → SceneGraphPath
     - `getAvatarPath()` → SceneGraphPath
     - `getEmptyPickPath()` → SceneGraphPath
     - `getContentComponent()` → SceneGraphComponent
     - `getCameraComponent()` → SceneGraphComponent
     - `getAvatarComponent()` → SceneGraphComponent
     - `addChangeListener(ChangeListener)` - Listen to scene changes
   
   - **ViewMenuBar** - `c.getPlugin(ViewMenuBar.class)`
     - `addMenuItem(Class, double, JMenuItem, String)` - Add menu item
     - `addMenu(Class, double, JMenu)` - Add menu
     - `addMenuSeparator(Class, double, String)` - Add separator
   
   - **ViewToolBar** - `c.getPlugin(ViewToolBar.class)`
     - `addTool(Class, Tool)` - Add toolbar tool
   
   - **ToolSystemPlugin** - `c.getPlugin(ToolSystemPlugin.class)`
     - `getToolSystem()` → ToolSystem
   
   - **Content** - `c.getPlugin(Content.class)` (abstract, various implementations)
     - `setContent(SceneGraphNode)` - Set content
     - `addContentChangedListener(ContentChangedListener)` - Listen to content changes
     - `addContentTool(Tool)` - Add tool to content
     - `removeContentTool(Tool)` - Remove tool from content
   
   - **ViewPreferences** - `c.getPlugin(ViewPreferences.class)`
     - Various preference getters/setters
   
   - **MainPanel** - `c.getPlugin(MainPanel.class)` (for some plugins)
     - `addComponent(Class, Component, double, String)` - Add UI component

3. **System Properties** (via `Secure.getProperty()`):
   - Environment (DESKTOP, PORTAL, PORTAL_REMOTE)
   - Viewer type (JOGL, SOFT, etc.)
   - Tool configuration
   - Auto-render settings
   - Various other system settings

4. **Event Sources**:
   - Scene change events (via `Scene.addChangeListener()`)
   - Content change events (via `Content.addContentChangedListener()`)
   - Transformation events (via `Transformation.addTransformationListener()`)

### Key Insight: Plugins Need Access, Not Injection

Plugins don't receive data directly - they receive **access to systems** via the Controller. This is essentially a **service locator pattern**.

## Analysis: What Plugins Provide

After analyzing the jReality plugin system, plugins provide these core functionalities:

### 1. **Dependency Access**
Plugins receive via `Controller.getPlugin(Class)`:
- **View** - Viewer management (ViewerSwitch, RenderTrigger)
- **Scene** - Scene graph management (sceneRoot, cameraPath, avatarPath)
- **ViewMenuBar** - Menu system access
- **ToolSystemPlugin** - Tool system access
- **Content** - Content management
- **SelectionManager** - Selection handling (via View)

### 2. **UI Integration Points**
- **Menus**: Add menu items to existing menus (`ViewMenuBar.addMenuItem()`)
- **Toolbars**: Add toolbar buttons (`ViewToolBar`)
- **Panels**: Add collapsible side panels (`ShrinkPanelPlugin`)
- **Preferences**: Add preference pages (`PreferencesFlavor`)

### 3. **Lifecycle Management**
- **Installation**: Set up resources, register listeners, initialize state
- **Uninstallation**: Clean up resources, remove listeners
- **State Persistence**: Save/restore preferences (`storeStates`/`restoreStates`)

### 4. **Event Handling**
- Listen to scene graph changes (`Scene.addChangeListener()`)
- Respond to content changes (`Content.addContentChangedListener()`)
- React to viewer events

### 5. **Functional Responsibilities**

#### Core Plugins:
- **View**: Manages ViewerSwitch, RenderTrigger, viewer component
- **Scene**: Manages scene graph structure, paths (camera, avatar, emptyPick)
- **ToolSystemPlugin**: Creates and manages ToolSystem
- **Content**: Manages content node in scene graph
- **Inspector**: Scene graph navigator/inspector UI

#### UI Plugins:
- **ViewMenuBar**: Aggregates menus from multiple plugins
- **ViewToolBar**: Aggregates toolbar buttons
- **ExportMenu**: Adds export menu items
- **BackgroundColor**: Adds background color menu
- **CameraMenu**: Adds camera settings menu
- **DisplayOptions**: Adds display options menu

#### Content Plugins:
- **DirectContent**: Direct content injection
- **CenteredAndScaledContent**: Content with auto-centering/scaling
- **TerrainAlignedContent**: VR terrain alignment

## Web-Native Strategy: Component-Based Architecture

Instead of a plugin system, use a **component-based architecture** with explicit dependencies and composition.

### Core Concept: JSRViewer Class

A single `JSRViewer` class that:
1. **Manages all core systems** (Viewer, Scene, ToolSystem, Content)
2. **Provides access points** for UI components to integrate
3. **Handles lifecycle** (initialization, cleanup)
4. **Manages state** (preferences, configuration)

### Architecture Design

```
JSRViewer
├── Core Systems (private, managed internally)
│   ├── Viewer (Canvas2DViewer, SVGViewer, WebGL2DViewer)
│   ├── Scene (SceneGraphComponent root, paths)
│   ├── ToolSystem
│   └── ContentManager
│
├── UI Components (composed, not injected)
│   ├── Menubar
│   ├── Toolbar
│   ├── Inspector (SceneGraphInspector)
│   └── SidePanels
│
└── Extension Points (public API)
    ├── Menu System (addMenuItem, addMenu)
    ├── Toolbar System (addToolbarButton)
    ├── Panel System (addSidePanel)
    ├── Export System (registerExporter)
    └── Event System (onSceneChange, onContentChange)
```

## Detailed Design

### 1. JSRViewer Class

**Location:** `src/core/viewers/app/JSRViewer.js`

```javascript
class JSRViewer {
  // Core systems (private)
  #viewer
  #sceneRoot
  #toolSystem
  #contentManager
  
  // UI components (composed)
  #menubar
  #toolbar
  #inspector
  #sidePanels
  
  // Extension points
  #menuRegistry
  #toolbarRegistry
  #panelRegistry
  #exportRegistry
  #eventListeners
  
  constructor(options) {
    // Initialize core systems
    this.#initializeCore(options)
    
    // Initialize UI components
    this.#initializeUI(options)
    
    // Set up extension points
    this.#setupExtensionPoints()
  }
  
  // Public API for accessing core systems
  getViewer() { return this.#viewer }
  getSceneRoot() { return this.#sceneRoot }
  getToolSystem() { return this.#toolSystem }
  getContentManager() { return this.#contentManager }
  
  // Extension point APIs
  addMenuItem(menuName, item, priority) { ... }
  addToolbarButton(button, priority) { ... }
  addSidePanel(panel, position) { ... }
  registerExporter(name, exporter) { ... }
  on(eventName, callback) { ... }
}
```

### 2. Core Systems Management

**What plugins access:**
- `View.getViewer()` → `jsrViewer.getViewer()`
- `Scene.getSceneRoot()` → `jsrViewer.getSceneRoot()`
- `Scene.getCameraPath()` → `jsrViewer.getCameraPath()`
- `ToolSystemPlugin.getToolSystem()` → `jsrViewer.getToolSystem()`

**Implementation:**
- All core systems created and managed internally
- No dependency injection needed
- Direct access via getter methods

### 3. UI Integration Points

#### Menu System
**Plugin Pattern:**
```java
ViewMenuBar menuBar = c.getPlugin(ViewMenuBar.class);
menuBar.addMenuItem(getClass(), priority, menuItem, "File");
```

**Web-Native Pattern:**
```javascript
jsrViewer.addMenuItem('File', {
  label: 'Export PNG',
  action: () => { /* export */ },
  priority: 10
});
```

**Implementation:**
- `Menubar` class manages menu structure
- `addMenuItem()` inserts items with priority ordering
- Menu items are plain objects with `label`, `action`, `icon`, etc.

#### Toolbar System
**Plugin Pattern:**
```java
ViewToolBar toolbar = c.getPlugin(ViewToolBar.class);
toolbar.addTool(getClass(), tool);
```

**Web-Native Pattern:**
```javascript
jsrViewer.addToolbarButton({
  icon: '...',
  tooltip: 'Reset Camera',
  action: () => { jsrViewer.resetCamera() },
  priority: 5
});
```

#### Panel System
**Plugin Pattern:**
```java
extends ShrinkPanelPlugin
shrinkPanel.add(component);
```

**Web-Native Pattern:**
```javascript
jsrViewer.addSidePanel({
  title: 'Inspector',
  component: inspectorElement,
  position: 'right', // 'left' | 'right' | 'top' | 'bottom'
  collapsible: true
});
```

### 4. Content Management

**Plugin Pattern:**
```java
Content content = c.getPlugin(Content.class);
content.setContent(node);
```

**Web-Native Pattern:**
```javascript
jsrViewer.setContent(sceneGraphComponent);
// Or with content strategy:
jsrViewer.setContent(node, {
  strategy: 'centeredAndScaled', // 'direct' | 'centeredAndScaled' | 'terrainAligned'
  encompass: true
});
```

**Implementation:**
- `ContentManager` class handles content strategies
- Strategies are functions, not plugins
- Can register custom strategies

### 5. Event System

**Plugin Pattern:**
```java
Scene scene = c.getPlugin(Scene.class);
scene.addChangeListener(this);
```

**Web-Native Pattern:**
```javascript
jsrViewer.on('sceneChanged', (event) => {
  // Handle scene change
});

jsrViewer.on('contentChanged', (event) => {
  // Handle content change
});
```

**Events:**
- `sceneChanged` - Scene graph structure changed
- `contentChanged` - Content node changed
- `cameraChanged` - Camera path/parameters changed
- `toolAdded` - Tool added to content
- `toolRemoved` - Tool removed from content

### 6. State Persistence

**Plugin Pattern:**
```java
c.storeProperty(getClass(), "color", getColor());
String color = c.getProperty(getClass(), "color", defaultValue);
```

**Web-Native Pattern:**
```javascript
jsrViewer.setPreference('backgroundColor', 'white');
const color = jsrViewer.getPreference('backgroundColor', 'gray');
```

**Implementation:**
- Uses localStorage or IndexedDB
- Namespaced by application/component
- Simple key-value store
- Can persist complex objects (JSON)

### 7. Export System

**Plugin Pattern:**
```java
ExportMenu exportMenu = c.getPlugin(ExportMenu.class);
exportMenu.add(new ExportImage("Image", viewer, parent));
```

**Web-Native Pattern:**
```javascript
jsrViewer.registerExporter('png', {
  label: 'Export as PNG',
  action: async () => {
    const dataURL = jsrViewer.getViewer().exportImage('image/png');
    downloadImage(dataURL, 'export.png');
  }
});

// Or simpler:
jsrViewer.addExportOption('png', 'Export as PNG', () => {
  // export logic
});
```

## Functional Equivalents

### What Each Plugin Does → How to Provide It

#### 1. View Plugin
**Functionality:**
- Creates ViewerSwitch
- Manages RenderTrigger
- Provides viewer component
- Handles scene path updates

**Web-Native:**
- `JSRViewer` creates viewer internally
- Auto-rendering handled by viewer
- Scene path updates via event system

#### 2. Scene Plugin
**Functionality:**
- Creates default scene structure
- Manages scene paths (camera, avatar, emptyPick)
- Provides scene root

**Web-Native:**
- `JSRViewer` creates scene structure
- Paths managed internally
- Exposed via getters

#### 3. ToolSystemPlugin
**Functionality:**
- Creates ToolSystem
- Configures tool system
- Updates paths on scene changes

**Web-Native:**
- `JSRViewer` creates ToolSystem
- Configuration via options
- Auto-updates via event listeners

#### 4. Content Plugin
**Functionality:**
- Manages content node
- Handles content changes
- Provides content root

**Web-Native:**
- `ContentManager` class
- `setContent()` method
- Content change events

#### 5. Inspector Plugin
**Functionality:**
- Creates Navigator UI
- Integrates with side panel system
- Handles selection

**Web-Native:**
- `SceneGraphInspector` already exists!
- Add as side panel
- Selection handled by viewer

#### 6. Menu Plugins (ExportMenu, BackgroundColor, etc.)
**Functionality:**
- Add menu items
- Execute actions
- Store preferences

**Web-Native:**
- `addMenuItem()` API
- Action callbacks
- Preference storage

#### 7. ViewMenuBar Plugin
**Functionality:**
- Aggregates menus from plugins
- Manages menu structure
- Handles shutdown

**Web-Native:**
- `Menubar` class
- Priority-based ordering
- Built into JSRViewer

## Implementation Strategy

### Phase 1: Core JSRViewer

**Location:** `src/core/viewers/app/JSRViewer.js`

```javascript
class JSRViewer {
  constructor(options) {
    // 1. Create core systems
    this.#viewer = new Canvas2DViewer(options.canvas);
    this.#sceneRoot = this.#createSceneRoot();
    this.#toolSystem = this.#createToolSystem();
    this.#contentManager = new ContentManager(this.#sceneRoot);
    
    // 2. Set up scene
    this.#setupScene(options);
    
    // 3. Initialize UI
    this.#menubar = new Menubar(options.menubarContainer);
    this.#toolbar = new Toolbar(options.toolbarContainer);
    this.#inspector = new SceneGraphInspector(
      options.inspectorContainer,
      this.#sceneRoot
    );
    
    // 4. Register default functionality
    this.#registerDefaultMenus();
    this.#registerDefaultExports();
  }
  
  // Extension APIs
  addMenuItem(menuName, item, priority) {
    this.#menubar.addItem(menuName, item, priority);
  }
  
  addSidePanel(panel, position) {
    // Add to side panel system
  }
  
  setContent(node, options) {
    this.#contentManager.setContent(node, options);
    this.#emit('contentChanged', { node });
  }
  
  on(eventName, callback) {
    // Event listener registration
  }
}
```

### Phase 2: Built-in Functionality

Instead of plugins, provide built-in features:

```javascript
// Built-in menu items
jsrViewer.addMenuItem('File', {
  label: 'Export PNG',
  action: () => jsrViewer.exportImage('png')
});

jsrViewer.addMenuItem('Viewer', {
  label: 'Background Color',
  submenu: [
    { label: 'White', action: () => jsrViewer.setBackgroundColor('white') },
    { label: 'Gray', action: () => jsrViewer.setBackgroundColor('gray') },
    // ...
  ]
});

// Built-in content strategies
jsrViewer.setContent(node, {
  strategy: 'centeredAndScaled',
  encompass: true
});
```

### Phase 3: Extension Points

Allow external code to extend functionality:

```javascript
// External code can extend
jsrViewer.addMenuItem('Tools', {
  label: 'My Custom Tool',
  action: () => { /* custom action */ }
});

jsrViewer.registerExporter('custom', {
  label: 'Export Custom Format',
  action: async () => { /* export logic */ }
});

jsrViewer.on('contentChanged', (event) => {
  // React to content changes
});
```

## Benefits of This Approach

1. **No Plugin System Complexity**
   - No dependency injection
   - No plugin lifecycle management
   - No reflection/class loading

2. **Web-Native**
   - Uses DOM directly
   - Event-driven (browser events + custom events)
   - Simple object composition

3. **Explicit Dependencies**
   - Clear API surface
   - Easy to understand
   - TypeScript-friendly (if desired)

4. **Flexible**
   - Can add functionality via API
   - Can extend without plugins
   - Can override defaults

5. **Simpler State Management**
   - Preferences via simple API
   - No complex persistence layer
   - Uses localStorage/IndexedDB directly

## Comparison: Plugin vs Web-Native

| Plugin System | Web-Native Approach |
|--------------|---------------------|
| `c.getPlugin(View.class)` | `jsrViewer.getViewer()` |
| `c.getPlugin(Scene.class)` | `jsrViewer.getSceneRoot()` |
| `menuBar.addMenuItem(...)` | `jsrViewer.addMenuItem(...)` |
| `scene.addChangeListener(...)` | `jsrViewer.on('sceneChanged', ...)` |
| `c.storeProperty(...)` | `jsrViewer.setPreference(...)` |
| `extends Plugin` | No base class needed |
| `install(Controller)` | Constructor or `initialize()` |

## Migration Path

For existing code that uses plugins:

1. **Replace plugin registration** with API calls
2. **Replace `c.getPlugin()`** with direct getters
3. **Replace listeners** with event system
4. **Replace state storage** with preference API

## Example: Converting BackgroundColor Plugin

**Java Plugin:**
```java
public class BackgroundColor extends Plugin {
  public void install(Controller c) {
    Scene scene = c.getPlugin(Scene.class);
    ViewMenuBar menuBar = c.getPlugin(ViewMenuBar.class);
    menuBar.addMenuItem(getClass(), 10.0, getMenu(), "Viewer");
  }
  
  public void setColor(String name) {
    SceneGraphComponent root = scene.getSceneRoot();
    Appearance app = root.getAppearance();
    app.setAttribute(BACKGROUND_COLOR, color);
  }
}
```

**Web-Native Equivalent:**
```javascript
// Built into JSRViewer:
jsrViewer.addMenuItem('Viewer', {
  label: 'Background',
  submenu: [
    { label: 'White', action: () => jsrViewer.setBackgroundColor('white') },
    { label: 'Gray', action: () => jsrViewer.setBackgroundColor('gray') },
    // ...
  ],
  priority: 10
});

// Or external code:
jsrViewer.addMenuItem('Viewer', {
  label: 'Background Color',
  submenu: backgroundColorMenu,
  priority: 10
});
```

## Detailed API Design

### JSRViewer Public API

**Location:** `src/core/viewers/app/JSRViewer.js`

```javascript
class JSRViewer {
  // ========================================================================
  // CORE SYSTEM ACCESS (replaces c.getPlugin())
  // ========================================================================
  
  getViewer() → Viewer
  getSceneRoot() → SceneGraphComponent
  getCameraPath() → SceneGraphPath
  getAvatarPath() → SceneGraphPath
  getEmptyPickPath() → SceneGraphPath
  getToolSystem() → ToolSystem
  getContentManager() → ContentManager
  getSelectionManager() → SelectionManager
  
  // ========================================================================
  // UI INTEGRATION (replaces plugin UI integration)
  // ========================================================================
  
  // Menu system
  addMenuItem(menuName, item, priority?) → void
  addMenu(menuName, menu, priority?) → void
  addMenuSeparator(menuName, priority?) → void
  
  // Toolbar system
  addToolbarButton(button, priority?) → void
  
  // Panel system
  addSidePanel(panel, position) → void
  removeSidePanel(panel) → void
  
  // ========================================================================
  // CONTENT MANAGEMENT (replaces Content plugin)
  // ========================================================================
  
  setContent(node, options?) → void
  getContent() → SceneGraphNode
  setContentStrategy(strategy) → void  // 'direct' | 'centeredAndScaled' | 'terrainAligned'
  
  // ========================================================================
  // EXPORT SYSTEM (replaces ExportMenu plugin)
  // ========================================================================
  
  registerExporter(name, exporter) → void
  exportImage(format, quality?) → string  // Returns data URL
  exportSVG() → string
  
  // ========================================================================
  // EVENT SYSTEM (replaces addChangeListener)
  // ========================================================================
  
  on(eventName, callback) → void
  off(eventName, callback) → void
  emit(eventName, data) → void
  
  // Events:
  // - 'sceneChanged' - Scene graph structure changed
  // - 'contentChanged' - Content node changed
  // - 'cameraChanged' - Camera path/parameters changed
  // - 'toolAdded' - Tool added to content
  // - 'toolRemoved' - Tool removed from content
  
  // ========================================================================
  // PREFERENCES (replaces c.storeProperty/getProperty)
  // ========================================================================
  
  setPreference(key, value) → void
  getPreference(key, defaultValue?) → any
  clearPreference(key) → void
  
  // ========================================================================
  // CONVENIENCE METHODS (built-in functionality)
  // ========================================================================
  
  setBackgroundColor(color) → void
  resetCamera() → void
  encompassEuclidean() → void
  render() → void
}
```

### ContentManager Class

```javascript
class ContentManager {
  constructor(sceneRoot) {
    this.#sceneRoot = sceneRoot;
    this.#contentNode = null;
    this.#strategy = 'direct';
    this.#listeners = [];
  }
  
  setContent(node, options = {}) {
    // Remove old content
    if (this.#contentNode) {
      this.#removeContent();
    }
    
    // Set new content
    this.#contentNode = node;
    this.#strategy = options.strategy || 'direct';
    
    // Apply strategy
    if (this.#strategy === 'direct') {
      this.#addContentDirect(node);
    } else if (this.#strategy === 'centeredAndScaled') {
      this.#addContentCenteredAndScaled(node, options.encompass);
    } else if (this.#strategy === 'terrainAligned') {
      this.#addContentTerrainAligned(node);
    }
    
    // Fire event
    this.#emit('contentChanged', { node, strategy: this.#strategy });
  }
  
  getContent() {
    return this.#contentNode;
  }
  
  onContentChanged(callback) {
    this.#listeners.push(callback);
  }
  
  #emit(eventName, data) {
    this.#listeners.forEach(cb => cb(data));
  }
}
```

### Menubar Class

```javascript
class Menubar {
  constructor(container) {
    this.#container = container;
    this.#menus = new Map();  // menuName → Menu
    this.#items = new Map();   // menuName → Array<{item, priority}>
  }
  
  addMenuItem(menuName, item, priority = 50) {
    if (!this.#items.has(menuName)) {
      this.#items.set(menuName, []);
      this.#createMenu(menuName);
    }
    
    const items = this.#items.get(menuName);
    items.push({ item, priority });
    items.sort((a, b) => a.priority - b.priority);
    
    this.#rebuildMenu(menuName);
  }
  
  addMenu(menuName, menu, priority = 50) {
    // Similar to addMenuItem but for submenus
  }
  
  #createMenu(menuName) {
    const menuElement = document.createElement('div');
    menuElement.className = 'menu';
    menuElement.textContent = menuName;
    // ... create dropdown structure
    this.#menus.set(menuName, menuElement);
    this.#container.appendChild(menuElement);
  }
  
  #rebuildMenu(menuName) {
    const menuElement = this.#menus.get(menuName);
    const items = this.#items.get(menuName);
    
    // Clear and rebuild menu items in priority order
    menuElement.innerHTML = '';
    items.forEach(({ item }) => {
      menuElement.appendChild(this.#createMenuItem(item));
    });
  }
}
```

## Functional Equivalents: Plugin → Web-Native

### Pattern 1: Accessing Core Systems

**Plugin:**
```java
View view = c.getPlugin(View.class);
ViewerSwitch viewer = view.getViewer();
Scene scene = c.getPlugin(Scene.class);
SceneGraphComponent root = scene.getSceneRoot();
```

**Web-Native:**
```javascript
const viewer = jsrViewer.getViewer();
const root = jsrViewer.getSceneRoot();
```

### Pattern 2: Adding Menu Items

**Plugin:**
```java
ViewMenuBar menuBar = c.getPlugin(ViewMenuBar.class);
menuBar.addMenuItem(getClass(), 10.0, menuItem, "Viewer");
```

**Web-Native:**
```javascript
jsrViewer.addMenuItem('Viewer', {
  label: 'Background Color',
  action: () => { /* ... */ },
  priority: 10
});
```

### Pattern 3: Listening to Events

**Plugin:**
```java
Scene scene = c.getPlugin(Scene.class);
scene.addChangeListener(new ChangeListener() {
  public void stateChanged(ChangeEvent e) {
    // Handle change
  }
});
```

**Web-Native:**
```javascript
jsrViewer.on('sceneChanged', (event) => {
  // Handle change
});
```

### Pattern 4: Storing Preferences

**Plugin:**
```java
c.storeProperty(getClass(), "backgroundColor", "white");
String color = c.getProperty(getClass(), "backgroundColor", "gray");
```

**Web-Native:**
```javascript
jsrViewer.setPreference('backgroundColor', 'white');
const color = jsrViewer.getPreference('backgroundColor', 'gray');
```

### Pattern 5: Adding UI Components

**Plugin:**
```java
MainPanel mainPanel = c.getPlugin(MainPanel.class);
mainPanel.addComponent(getClass(), panel, 0.0, "Content");
```

**Web-Native:**
```javascript
jsrViewer.addSidePanel({
  title: 'Content',
  component: panelElement,
  position: 'right',
  priority: 0
});
```

## Implementation Example

### Complete JSRViewer Skeleton

**Location:** `src/core/viewers/app/JSRViewer.js`

```javascript
export class JSRViewer {
  // Core systems
  #viewer = null;
  #sceneRoot = null;
  #toolSystem = null;
  #contentManager = null;
  #cameraPath = null;
  #avatarPath = null;
  #emptyPickPath = null;
  
  // UI components
  #menubar = null;
  #toolbar = null;
  #inspector = null;
  #sidePanels = new Map();
  
  // Extension registries
  #menuItems = new Map();  // menuName → Array<{item, priority}>
  #toolbarButtons = [];
  #exporters = new Map();
  #eventListeners = new Map();
  
  // Preferences
  #preferences = new Map();
  #preferencePrefix = 'jsreality.viewer.';
  
  constructor(options) {
    const {
      canvas,
      container,
      sceneRoot,
      menubarContainer,
      toolbarContainer,
      inspectorContainer
    } = options;
    
    // 1. Initialize core systems
    this.#initializeCore(canvas, sceneRoot);
    
    // 2. Initialize UI
    this.#initializeUI({
      container,
      menubarContainer,
      toolbarContainer,
      inspectorContainer
    });
    
    // 3. Register default functionality
    this.#registerDefaults();
  }
  
  #initializeCore(canvas, sceneRoot) {
    // Create viewer
    this.#viewer = new Canvas2DViewer(canvas);
    
    // Create or use provided scene root
    if (sceneRoot) {
      this.#sceneRoot = sceneRoot;
    } else {
      this.#sceneRoot = this.#createDefaultSceneRoot();
    }
    
    this.#viewer.setSceneRoot(this.#sceneRoot);
    
    // Create paths
    this.#cameraPath = this.#createCameraPath();
    this.#avatarPath = this.#createAvatarPath();
    this.#emptyPickPath = this.#createEmptyPickPath();
    
    this.#viewer.setCameraPath(this.#cameraPath);
    
    // Create tool system
    this.#toolSystem = new ToolSystem(this.#viewer, null, null);
    ToolSystem.setToolSystemForViewer(this.#viewer, this.#toolSystem);
    this.#toolSystem.initializeSceneTools();
    
    // Create content manager
    this.#contentManager = new ContentManager(
      this.#sceneRoot.getChildComponent('content')
    );
    
    // Set up event listeners for scene changes
    this.#setupSceneListeners();
  }
  
  #initializeUI(options) {
    // Create menubar
    if (options.menubarContainer) {
      this.#menubar = new Menubar(options.menubarContainer);
    }
    
    // Create toolbar
    if (options.toolbarContainer) {
      this.#toolbar = new Toolbar(options.toolbarContainer);
    }
    
    // Create inspector
    if (options.inspectorContainer) {
      this.#inspector = new SceneGraphInspector(
        options.inspectorContainer,
        this.#sceneRoot
      );
    }
  }
  
  #registerDefaults() {
    // Register default menu items
    this.#registerDefaultMenus();
    
    // Register default exporters
    this.#registerDefaultExports();
    
    // Register default toolbar buttons
    this.#registerDefaultToolbar();
  }
  
  #registerDefaultMenus() {
    // File menu
    this.addMenuItem('File', {
      label: 'Export PNG',
      action: () => this.exportImage('png')
    });
    
    this.addMenuItem('File', {
      label: 'Export SVG',
      action: () => this.exportSVG()
    });
    
    // Viewer menu
    this.addMenuItem('Viewer', {
      label: 'Background',
      submenu: [
        { label: 'White', action: () => this.setBackgroundColor('white') },
        { label: 'Gray', action: () => this.setBackgroundColor('gray') },
        { label: 'Black', action: () => this.setBackgroundColor('black') }
      ]
    });
    
    this.addMenuItem('Viewer', {
      label: 'Reset Camera',
      action: () => this.resetCamera()
    });
  }
  
  #registerDefaultExports() {
    this.registerExporter('png', {
      label: 'Export as PNG',
      action: () => {
        const dataURL = this.getViewer().exportImage('image/png');
        this.#downloadImage(dataURL, 'export.png');
      }
    });
    
    this.registerExporter('svg', {
      label: 'Export as SVG',
      action: () => {
        const svg = this.exportSVG();
        this.#downloadSVG(svg, 'export.svg');
      }
    });
  }
  
  // Public API methods
  getViewer() { return this.#viewer; }
  getSceneRoot() { return this.#sceneRoot; }
  getCameraPath() { return this.#cameraPath; }
  getAvatarPath() { return this.#avatarPath; }
  getEmptyPickPath() { return this.#emptyPickPath; }
  getToolSystem() { return this.#toolSystem; }
  getContentManager() { return this.#contentManager; }
  
  addMenuItem(menuName, item, priority = 50) {
    if (!this.#menubar) {
      console.warn('Menubar not initialized');
      return;
    }
    this.#menubar.addMenuItem(menuName, item, priority);
  }
  
  setContent(node, options) {
    this.#contentManager.setContent(node, options);
    this.emit('contentChanged', { node });
  }
  
  on(eventName, callback) {
    if (!this.#eventListeners.has(eventName)) {
      this.#eventListeners.set(eventName, []);
    }
    this.#eventListeners.get(eventName).push(callback);
  }
  
  emit(eventName, data) {
    const listeners = this.#eventListeners.get(eventName) || [];
    listeners.forEach(cb => cb(data));
  }
  
  setPreference(key, value) {
    this.#preferences.set(key, value);
    const storageKey = this.#preferencePrefix + key;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to save preference:', e);
    }
  }
  
  getPreference(key, defaultValue = null) {
    if (this.#preferences.has(key)) {
      return this.#preferences.get(key);
    }
    
    const storageKey = this.#preferencePrefix + key;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        const value = JSON.parse(stored);
        this.#preferences.set(key, value);
        return value;
      }
    } catch (e) {
      console.warn('Failed to load preference:', e);
    }
    
    return defaultValue;
  }
  
  setBackgroundColor(color) {
    const root = this.#sceneRoot;
    let app = root.getAppearance();
    if (!app) {
      app = new Appearance('root appearance');
      root.setAppearance(app);
    }
    
    const colorMap = {
      'white': new Color(255, 255, 255),
      'gray': new Color(225, 225, 225),
      'black': new Color(0, 0, 0)
    };
    
    app.setAttribute(CommonAttributes.BACKGROUND_COLOR, colorMap[color] || colorMap['gray']);
    this.setPreference('backgroundColor', color);
    this.getViewer().render();
  }
  
  resetCamera() {
    // Reset camera to default position
    // Implementation depends on camera setup
    this.emit('cameraChanged', {});
    this.getViewer().render();
  }
  
  exportImage(format = 'png', quality = 0.95) {
    return this.#viewer.exportImage(`image/${format}`, quality);
  }
  
  exportSVG() {
    const viewingComponent = this.#viewer.getViewingComponent();
    const width = viewingComponent.clientWidth || viewingComponent.offsetWidth;
    const height = viewingComponent.clientHeight || viewingComponent.offsetHeight;
    
    const tempContainer = document.createElement('div');
    const svgViewer = new SVGViewer(tempContainer, { width, height });
    svgViewer.setSceneRoot(this.#sceneRoot);
    svgViewer.setCameraPath(this.#cameraPath);
    svgViewer.render();
    
    return svgViewer.exportSVG();
  }
  
  render() {
    this.#viewer.render();
  }
  
  // Private helper methods
  #createDefaultSceneRoot() {
    // Create default scene structure
    // Similar to Scene.defaultScene() in Java
  }
  
  #setupSceneListeners() {
    // Listen to scene graph changes and emit events
    // Can use MutationObserver or custom event system
  }
  
  #downloadImage(dataURL, filename) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  #downloadSVG(svgString, filename) {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
```

## Usage Example

### Simple Usage

```javascript
const canvas = document.getElementById('canvas');
const jsrViewer = new JSRViewer({
  canvas,
  container: document.body,
  menubarContainer: document.getElementById('menubar'),
  inspectorContainer: document.getElementById('inspector')
});

// Set content
jsrViewer.setContent(mySceneGraphComponent, {
  strategy: 'centeredAndScaled',
  encompass: true
});

// Add custom menu item
jsrViewer.addMenuItem('Tools', {
  label: 'My Custom Tool',
  action: () => {
    console.log('Custom tool executed');
  }
});

// Listen to events
jsrViewer.on('contentChanged', (event) => {
  console.log('Content changed:', event.node);
});

// Render
jsrViewer.render();
```

### Advanced Usage

```javascript
// Register custom exporter
jsrViewer.registerExporter('custom', {
  label: 'Export Custom Format',
  action: async () => {
    const data = await processScene(jsrViewer.getSceneRoot());
    downloadCustomFormat(data);
  }
});

// Add side panel
jsrViewer.addSidePanel({
  title: 'Custom Panel',
  component: myPanelElement,
  position: 'left',
  collapsible: true
});

// Set preferences
jsrViewer.setPreference('lastExportFormat', 'png');
const lastFormat = jsrViewer.getPreference('lastExportFormat', 'svg');
```

## Conclusion

A web-native `JSRViewer` class can provide all the functionality of JRViewer's plugin system through:

1. **Direct composition** instead of dependency injection
2. **Extension APIs** instead of plugin interfaces
3. **Event system** instead of listener interfaces
4. **Built-in features** instead of separate plugins
5. **Simple preferences** instead of complex persistence

This approach is:
- **Simpler** - No plugin system complexity
- **More JavaScript-idiomatic** - Uses language features naturally
- **Easier to maintain** - Explicit dependencies, clear API
- **More flexible** - Can extend without plugin constraints
- **Web-native** - Works naturally with DOM and browser APIs

### Key Insight

Plugins provide **access to systems** and **integration points**. We can achieve the same through:
- **Getter methods** for system access (replaces `c.getPlugin()`)
- **Extension APIs** for integration (replaces plugin registration)
- **Event system** for communication (replaces listener interfaces)
- **Built-in features** for common functionality (replaces separate plugins)

No plugin system needed - just a well-designed API!

