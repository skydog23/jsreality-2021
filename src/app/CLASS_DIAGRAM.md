# jsReality App Folder - Class Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ JSRViewer                                                                │
│ ──────────────────────────────────────────────────────────────────────── │
│ Main application-level viewer (similar to JRViewer)                      │
│ • Manages ViewerSwitch, Scene, ToolSystem, ContentManager               │
│ • Provides plugin system infrastructure                                  │
│ • Handles preferences, events, rendering                                 │
│ • Creates PluginController facade                                        │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ owns/creates
                              ▼
        ┌─────────────────────────────────────────────┐
        │                                               │
        ▼                                               ▼
┌──────────────────────┐              ┌──────────────────────────────────┐
│ PluginLayoutManager  │              │ PluginController                 │
│ ──────────────────── │              │ ─────────────────────────────── │
│ Manages UI layout    │              │ JRViewer-style Controller facade │
│ • Flexbox layout     │              │ • Plugin registration API         │
│ • Panel slots        │              │ • Panel slot helpers               │
│ • Top/left/right     │              │ • Event system                   │
│   regions            │              │ • Viewer access                   │
└──────────────────────┘              └──────────────────────────────────┘
        │                                       │
        │                                       │ uses
        └───────────────────────────────────────┘
                              │
                              │ uses
                              ▼
        ┌─────────────────────────────────────────────┐
        │                                               │
        ▼                                               ▼
┌──────────────────────┐              ┌──────────────────────────────────┐
│ PluginManager        │              │ EventBus                          │
│ ──────────────────── │              │ ─────────────────────────────── │
│ Plugin lifecycle     │              │ Pub/sub event system              │
│ • Registration       │              │ • emit(eventType, data)            │
│ • Installation       │              │ • on(eventType, callback)          │
│ • Dependency mgmt    │              │ • Plugin communication            │
└──────────────────────┘              └──────────────────────────────────┘
        │                                       │
        │ creates                               │
        ▼                                       │
┌──────────────────────┐                       │
│ PluginContext        │                       │
│ ──────────────────── │                       │
│ Context for plugins  │                       │
│ • Viewer access      │                       │
│ • Plugin registry    │                       │
│ • Event bus          │                       │
│ • Layout manager     │                       │
└──────────────────────┘                       │
                                               │
                                               │ uses
                                               ▼
                              ┌──────────────────────────────────┐
                              │ ViewerEventBridge                 │
                              │ ─────────────────────────────── │
                              │ Bridges viewer events to EventBus │
                              │ • contentChanged → scene:changed  │
                              │ • viewerChanged → viewer:changed  │
                              │ • cameraChanged → camera:changed  │
                              └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         PLUGIN SYSTEM                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ JSRPlugin            │ ◄─── Base class for all plugins
│ ──────────────────── │
│ • getInfo()          │
│ • install(viewer, ctx)│
│ • uninstall()        │
│ • getMenuItems()     │
└──────────────────────┘
        ▲
        │ extends
        │
        ├─────────────────────────────────────────────────────────┐
        │                                                          │
        ▼                                                          ▼
┌──────────────────────┐                          ┌──────────────────────────────┐
│ JSRApp               │                          │ SceneGraphInspectorPlugin     │
│ ──────────────────── │                          │ ─────────────────────────── │
│ Application base     │                          │ Scene graph inspector UI     │
│ • Owns JSRViewer     │                          │ • Left panel inspector       │
│ • Animation support  │                          │ • Tree view + properties     │
│ • getContent()       │                          │ • Property editing           │
│ • getInspectorDesc() │                          └──────────────────────────────┘
└──────────────────────┘
        ▲                                                          │
        │ extends                                                  │ extends
        │                                                          │
        ├──────────────┬──────────────┬──────────────┐            │
        │              │              │              │            │
        ▼              ▼              ▼              ▼            ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────────────────────┐
│ TestJSRApp  │ │TestGeometry │ │ TestToolApp │ │   ...       │ │ ShrinkPanelAggregator        │
│             │ │    App      │ │             │ │             │ │ ─────────────────────────── │
│ Example app │ │             │ │             │ │             │ │ Aggregates inspector panels  │
│             │ │             │ │             │ │             │ │ • Right panel container      │
│             │ │             │ │             │ │             │ │ • Collapsible panels         │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └──────────────────────────────┘
                                                                              │
                                                                              │ extends
                                                                              │
                                                                              ▼
                                                              ┌──────────────────────────────┐
                                                              │ MenubarPlugin                │
                                                              │ ─────────────────────────── │
                                                              │ Top menu bar                 │
                                                              │ • File, View, Help menus     │
                                                              └──────────────────────────────┘
                                                                              │
                                                                              │ extends
                                                                              │
                                                                              ▼
                                                              ┌──────────────────────────────┐
                                                              │ ExportMenuPlugin             │
                                                              │ ─────────────────────────── │
                                                              │ Export functionality         │
                                                              │ • Image export               │
                                                              └──────────────────────────────┘
                                                                              │
                                                                              │ extends
                                                                              │
                                                                              ▼
                                                              ┌──────────────────────────────┐
                                                              │ BackgroundColorPlugin        │
                                                              │ ─────────────────────────── │
                                                              │ Background color control     │
                                                              └──────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         UI COMPONENTS                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ CollapsiblePanel     │ (function, not class)
│ ──────────────────── │
│ Collapsible UI panel │
│ • Title bar          │
│ • Expand/collapse    │
│ • Content area       │
└──────────────────────┘

┌──────────────────────┐
│ Menubar              │
│ ──────────────────── │
│ Menu bar component   │
│ • Menu items         │
│ • Dropdowns          │
└──────────────────────┘

┌──────────────────────┐
│ SplitPane            │
│ ──────────────────── │
│ Resizable split pane │
│ • Left/right panels  │
│ • Resizer handle     │
│ (Currently unused -  │
│  replaced by flexbox)│
└──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPPORTING CLASSES                               │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ ContentManager       │
│ ──────────────────── │
│ Manages content node │
│ • Direct injection   │
│ • Centered/scaled    │
│ • Terrain aligned    │
└──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         RELATIONSHIPS                                     │
└─────────────────────────────────────────────────────────────────────────┘

JSRViewer
  ├─ owns → PluginLayoutManager (creates layout regions)
  ├─ owns → PluginController (facade for plugin API)
  ├─ owns → PluginManager (manages plugin lifecycle)
  ├─ owns → EventBus (plugin communication)
  ├─ owns → ViewerEventBridge (bridges viewer events)
  ├─ owns → ContentManager (manages scene content)
  └─ registers → Plugins (via PluginManager)

JSRApp extends JSRPlugin
  ├─ owns → JSRViewer (creates and manages viewer)
  └─ registers → Plugins (SceneGraphInspectorPlugin, ShrinkPanelAggregator, etc.)

PluginController
  ├─ wraps → PluginManager (plugin registration)
  ├─ wraps → PluginLayoutManager (panel slots)
  ├─ wraps → EventBus (events)
  └─ provides → JRViewer-style API

PluginManager
  ├─ creates → PluginContext (for each plugin)
  └─ manages → Map<id, JSRPlugin>

PluginContext
  ├─ provides → Viewer access
  ├─ provides → Plugin registry
  ├─ provides → EventBus
  └─ provides → LayoutManager

All Plugins extend JSRPlugin
  └─ receive → PluginContext during install()

