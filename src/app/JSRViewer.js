/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * JSRViewer - Application-level viewer that provides JRViewer-like functionality
 * without requiring a plugin system.
 * 
 * This class manages core systems (ViewerSwitch, Scene, ToolSystem, Content),
 * provides extension APIs for UI integration, and handles preferences and events.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { ViewerSwitch } from '../core/viewers/ViewerSwitch.js';
import { Canvas2DViewer } from '../core/viewers/Canvas2DViewer.js';
import { SceneGraphComponent } from '../core/scene/SceneGraphComponent.js';
import { SceneGraphPath } from '../core/scene/SceneGraphPath.js';
import { Camera } from '../core/scene/Camera.js';
import { Transformation } from '../core/scene/Transformation.js';
import { ToolSystem } from '../core/scene/tool/ToolSystem.js';
import { ToolSystemConfiguration } from '../core/scene/tool/ToolSystemConfiguration.js';
import { SceneGraphUtility } from '../core/util/SceneGraphUtility.js';
import { Appearance } from '../core/scene/Appearance.js';
import { Color } from '../core/util/Color.js';
import * as CommonAttributes from '../core/shader/CommonAttributes.js';
import { MatrixBuilder } from '../core/math/MatrixBuilder.js';
import { getLogger } from '../core/util/LoggingSystem.js';
import { ContentManager } from './ContentManager.js';
import { SVGViewer } from '../core/viewers/SVGViewer.js';
import { WebGL2Viewer } from '../core/viewers/WebGL2Viewer.js';
import { EventBus } from './plugin/EventBus.js';
import { PluginManager } from './plugin/PluginManager.js';
import { ViewerEventBridge } from './plugin/ViewerEventBridge.js';
import { PluginLayoutManager } from './plugin/PluginLayoutManager.js';
import { PluginController } from './plugin/PluginController.js';
// Ensure shaders are registered (side effect import - triggers registerDefaultShaders)
import '../core/shader/index.js';

/**
 * Standardized viewer type names.
 * @type {Object<string, string>}
 */
export const ViewerTypes = {
  CANVAS2D: 'Canvas2D',
  WEBGL2D: 'WebGL2',
  SVG: 'SVG'
};

const logger = getLogger('jsreality.app.JSRViewer');

/**
 * JSRViewer provides application-level viewer functionality similar to JRViewer,
 * but using a web-native component-based architecture instead of a plugin system.
 */
export class JSRViewer {

  /**
   * Async factory that optionally loads a ToolSystemConfiguration from a URL.
   * This is a convenient way to have a configuration file evaluated every time
   * the app is run (browser fetch).
   *
   * @param {Object} options - Same options as the constructor
   * @param {string|null} [options.toolSystemConfigUrl] - Optional URL to JSON config
   * @returns {Promise<JSRViewer>}
   */
  static async create(options) {
    const {
      toolSystemConfigUrl = '/src/core/toolsystem/config/toolsystem.jreality-master.json',
      ...rest
    } = options || {};
    if (!toolSystemConfigUrl) {
      return new JSRViewer(rest);
    }
    try {
      const cfg = await ToolSystemConfiguration.loadFromURL(toolSystemConfigUrl);
      return new JSRViewer({ ...rest, toolSystemConfig: cfg });
    } catch (error) {
      logger.warn(`Failed to load ToolSystem config from URL (${toolSystemConfigUrl}), falling back to built-in defaults: ${error?.message || error}`);
      return new JSRViewer(rest);
    }
  }

  // Core systems
  /** @type {ViewerSwitch|null} */
  #viewerSwitch = null;

  /** @type {SceneGraphComponent|null} */
  #sceneRoot = null;

  /** @type {SceneGraphPath|null} */
  #cameraPath = null;

  /** @type {SceneGraphPath|null} */
  #avatarPath = null;

  /** @type {SceneGraphPath|null} */
  #emptyPickPath = null;

  /** @type {SceneGraphComponent|null} */
  #contentComponent = null;

  /** @type {SceneGraphComponent|null} */
  #cameraComponent = null;

  /** @type {SceneGraphComponent|null} */
  #avatarComponent = null;

  /** @type {ToolSystem|null} */
  #toolSystem = null;

  /** @type {ContentManager|null} */
  #contentManager = null;

  // UI components
  /** @type {HTMLElement|null} */
  #container = null;

  /** @type {PluginLayoutManager|null} */
  #layoutManager = null;

  /** @type {Map<string, Object>} */
  #exporters = new Map();

  /** @type {Map<string, Object>} */
  #sidePanels = new Map();

  // Plugin system
  /** @type {EventBus|null} */
  #eventBus = null;

  /** @type {PluginManager|null} */
  #pluginManager = null;

  /** @type {ViewerEventBridge|null} */
  #viewerEventBridge = null;

  /** @type {PluginController|null} */
  #controller = null;

  // Event system (deprecated - use #eventBus instead)
  /** @type {Map<string, Function[]>} */
  #eventListeners = new Map();

  // Preferences
  /** @type {Map<string, any>} */
  #preferences = new Map();

  /** @type {string} */
  #preferencePrefix = 'jsreality.viewer.';

  /**
   * Create a new JSRViewer instance.
   * @param {Object} options - Configuration options
   * @param {HTMLElement} options.container - Container element for the viewer
   * @param {string[]} [options.viewerTypes] - Array of viewer type names ('Canvas2D', 'WebGL2', 'SVG')
   * @param {Viewer[]} [options.viewers] - Array of pre-instantiated viewer instances (alternative to viewerTypes)
   * @param {string[]} [options.viewerNames] - Names for pre-instantiated viewers (required if viewers provided)
   * @param {SceneGraphComponent} [options.sceneRoot] - Existing scene root (creates default if not provided)
   * @param {Object} [options.toolSystemConfig] - Tool system configuration
   */
  constructor(options) {
    const {
      container,
      viewerTypes = null,
      viewers = null,
      viewerNames = null,
      sceneRoot = null,
      toolSystemConfig = null
    } = options;

    if (!container) {
      throw new Error('JSRViewer requires a container element');
    }

    // Store container reference
    this.#container = container;
    this.#layoutManager = new PluginLayoutManager(container);

    // Initialize plugin system first (so plugins can hook into other systems)
    this.#eventBus = new EventBus();
    this.#pluginManager = new PluginManager(this, this.#eventBus, this.#layoutManager);
    this.#viewerEventBridge = new ViewerEventBridge(this, this.#eventBus);

    // Create the PluginController facade (JRViewer-style Controller)
    this.#controller = new PluginController(
      this,
      this.#pluginManager,
      this.#layoutManager,
      this.#eventBus
    );

    // Initialize core systems
    this.#initializeViewers(this.#layoutManager.getViewerHostElement(), viewerTypes, viewers, viewerNames);
    this.#initializeScene(sceneRoot);
    this.#initializeToolSystem(toolSystemConfig);
    this.#initializeContentManager();
    this.#registerDefaults();

    logger.info('JSRViewer initialized');
  }

  /**
   * Initialize viewer system.
   * Creates viewers based on viewerTypes array, or uses pre-instantiated viewers.
   * 
   * @param {HTMLElement} container - Host element for viewer DOM nodes
   * @param {string[]|null} viewerTypes - Array of viewer type names ('Canvas2D', 'WebGL2', 'SVG')
   * @param {Viewer[]|null} viewers - Optional array of pre-instantiated viewers
   * @param {string[]|null} viewerNames - Optional viewer names (for pre-instantiated viewers)
   * @private
   */
  #initializeViewers(container, viewerTypes, viewers, viewerNames) {
    // If viewerTypes provided, create viewers from types
    if (viewerTypes && viewerTypes.length > 0) {
      const { viewers: createdViewers, names } = this.#createViewersFromTypes(container, viewerTypes);
      viewers = createdViewers;
      viewerNames = names;
    } else if (!viewers || viewers.length === 0) {
      // Default: create a single Canvas2DViewer
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);
      viewers = [new Canvas2DViewer(canvas)];
      viewerNames = [ViewerTypes.CANVAS2D];
    }

    // Create ViewerSwitch
    this.#viewerSwitch = new ViewerSwitch(viewers, viewerNames);
    
    // Get wrapper element and add to container
    const wrapperElement = this.#viewerSwitch.getViewingComponent();
    wrapperElement.style.width = '100%';
    wrapperElement.style.height = '100%';
    container.appendChild(wrapperElement);

    logger.info(`ViewerSwitch created with ${viewers.length} viewer(s): ${viewerNames.join(', ')}`);
  }

  /**
   * Create viewer instances from type names.
   * 
   * @param {HTMLElement} container - Container element for viewer DOM elements
   * @param {string[]} viewerTypes - Array of viewer type names
   * @returns {{viewers: Viewer[], names: string[]}} Created viewers and their names
   * @private
   */
  #createViewersFromTypes(container, viewerTypes) {
    const viewers = [];
    const names = [];

    for (const type of viewerTypes) {
      const normalizedType = this.#normalizeViewerType(type);
      
      switch (normalizedType) {
        case ViewerTypes.CANVAS2D: {
          const canvas = document.createElement('canvas');
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          container.appendChild(canvas);
          viewers.push(new Canvas2DViewer(canvas));
          names.push(ViewerTypes.CANVAS2D);
          break;
        }
        case ViewerTypes.WEBGL2D: {
          const canvas = document.createElement('canvas');
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          container.appendChild(canvas);
          viewers.push(new WebGL2Viewer(canvas));
          names.push(ViewerTypes.WEBGL2D);
          break;
        }
        case ViewerTypes.SVG: {
          const svgContainer = document.createElement('div');
          svgContainer.style.width = '100%';
          svgContainer.style.height = '100%';
          svgContainer.style.position = 'absolute';
          svgContainer.style.top = '0';
          svgContainer.style.left = '0';
          container.appendChild(svgContainer);
          viewers.push(new SVGViewer(svgContainer));
          names.push(ViewerTypes.SVG);
          break;
        }
        default:
          logger.warn(`Unknown viewer type: ${type}. Skipping.`);
      }
    }

    if (viewers.length === 0) {
      throw new Error('No valid viewer types provided');
    }

    return { viewers, names };
  }

  /**
   * Normalize a viewer type string to the standardized format.
   * 
   * @param {string} type - Viewer type string (case-insensitive)
   * @returns {string} Normalized viewer type
   * @private
   */
  #normalizeViewerType(type) {
    const normalized = type.toLowerCase();
    if (normalized === 'canvas2d' || normalized === 'canvas') {
      return ViewerTypes.CANVAS2D;
    } else if (normalized === 'webgl2d' || normalized === 'webgl') {
      return ViewerTypes.WEBGL2D;
    } else if (normalized === 'svg') {
      return ViewerTypes.SVG;
    }
    return type; // Return as-is if not recognized
  }

  /**
   * Initialize scene graph structure.
   * @param {SceneGraphComponent|null} sceneRoot - Existing scene root or null to create default
   * @private
   */
  #initializeScene(sceneRoot) {
    if (sceneRoot) {
      this.#sceneRoot = sceneRoot;
    } else {
      // Create default scene structure
      this.#sceneRoot = SceneGraphUtility.createFullSceneGraphComponent('root');
      
      // Create default appearance
      const rootAppearance = new Appearance('rootAppearance');
      rootAppearance.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(225, 225, 225));
      rootAppearance.setAttribute(CommonAttributes.VERTEX_DRAW, false);
      this.#sceneRoot.setAppearance(rootAppearance);

      // Create camera component
      this.#cameraComponent = SceneGraphUtility.createFullSceneGraphComponent('cameraNode');
      const camera = new Camera();
      camera.setName('camera');
      camera.setFieldOfView(60);
      camera.setNear(-5);
      camera.setFar(5);
      camera.setPerspective(false);
      this.#cameraComponent.setCamera(camera);
      
      // Position camera back from origin
      const cameraTransform = new Transformation();
      const cameraMatrix = MatrixBuilder.euclidean().translate(0, 0, -1).getArray();
      cameraTransform.setMatrix(cameraMatrix);
      this.#cameraComponent.setTransformation(cameraTransform);
      
      this.#sceneRoot.addChild(this.#cameraComponent);

      // Create camera path
      this.#cameraPath = new SceneGraphPath();
      this.#cameraPath.push(this.#sceneRoot);
      this.#cameraPath.push(this.#cameraComponent);
      this.#cameraPath.push(camera);

      // Create content component
      this.#contentComponent = SceneGraphUtility.createFullSceneGraphComponent('content');
      this.#sceneRoot.addChild(this.#contentComponent);

      // Create avatar component (for VR/tool system)
      this.#avatarComponent = SceneGraphUtility.createFullSceneGraphComponent('avatar');
      this.#sceneRoot.addChild(this.#avatarComponent);

      // Create empty pick path (for tool system)
      this.#emptyPickPath = new SceneGraphPath();
      this.#emptyPickPath.push(this.#sceneRoot);

      // Create avatar path
      this.#avatarPath = new SceneGraphPath();
      this.#avatarPath.push(this.#sceneRoot);
      this.#avatarPath.push(this.#avatarComponent);
    }

    // Set scene root and camera path on viewer switch
    this.#viewerSwitch.setSceneRoot(this.#sceneRoot);
    this.#viewerSwitch.setCameraPath(this.#cameraPath);

    logger.info('Scene initialized');
  }

  /**
   * Initialize tool system.
   * @param {Object|null} toolSystemConfig - Tool system configuration
   * @private
   */
  #initializeToolSystem(toolSystemConfig) {
    let config = toolSystemConfig;
    if (!config) {
      // Use default configuration with devices
      config = ToolSystem.getDefaultToolSystemConfiguration();
    }

    this.#toolSystem = new ToolSystem(
      this.#viewerSwitch,
      config,
      null // No render trigger for now
    );

    // Set tool system on viewer switch
    this.#viewerSwitch.setToolSystem(this.#toolSystem);

    // Set paths
    if (this.#emptyPickPath) {
      this.#toolSystem.setEmptyPickPath(this.#emptyPickPath);
    }
    if (this.#avatarPath) {
      this.#toolSystem.setAvatarPath(this.#avatarPath);
    }

    // Initialize scene tools
    this.#toolSystem.initializeSceneTools();

    logger.info('Tool system initialized');
  }

  /**
   * Initialize content manager.
   * @private
   */
  #initializeContentManager() {
    if (!this.#contentComponent) {
      logger.warn('Content component not initialized, creating default');
      this.#contentComponent = SceneGraphUtility.createFullSceneGraphComponent('content');
      if (this.#sceneRoot) {
        this.#sceneRoot.addChild(this.#contentComponent);
      }
    }
    this.#contentManager = new ContentManager(this.#contentComponent);
    this.#contentManager.onContentChanged((data) => {
      this.#emit('contentChanged', data);
    });
  }

  /**
   * Register default exporters.
   * @private
   */
  #registerDefaults() {
    // Register default exporters
    this.registerExporter('png', {
      label: 'Export as PNG',
      action: () => this.exportImage('png')
    });

    this.registerExporter('jpeg', {
      label: 'Export as JPEG',
      action: () => this.exportImage('jpeg', 0.95)
    });

    this.registerExporter('svg', {
      label: 'Export as SVG',
      action: () => this.exportSVG()
    });
  }

  // ========================================================================
  // PUBLIC API: Core System Access
  // ========================================================================

  /**
   * Get the ViewerSwitch instance.
   * @returns {ViewerSwitch} The viewer switch
   */
  getViewer() {
    return this.#viewerSwitch;
  }

  /**
   * Expose the layout manager for applications that need direct access
   * (e.g., legacy code wiring up inspectors before plugins are available).
   * @returns {PluginLayoutManager|null}
   */
  getLayoutManager() {
    return this.#layoutManager;
  }

  /**
   * Get the container element.
   * @returns {HTMLElement|null} The container element
   */
  getContainer() {
    return this.#container;
  }

  /**
   * Get the scene root.
   * @returns {SceneGraphComponent} The scene root
   */
  getSceneRoot() {
    return this.#sceneRoot;
  }

  /**
   * Get the camera path.
   * @returns {SceneGraphPath} The camera path
   */
  getCameraPath() {
    return this.#cameraPath;
  }

  /**
   * Get the avatar path.
   * @returns {SceneGraphPath} The avatar path
   */
  getAvatarPath() {
    return this.#avatarPath;
  }

  /**
   * Get the empty pick path.
   * @returns {SceneGraphPath} The empty pick path
   */
  getEmptyPickPath() {
    return this.#emptyPickPath;
  }

  /**
   * Get the tool system.
   * @returns {ToolSystem} The tool system
   */
  getToolSystem() {
    return this.#toolSystem;
  }

  /**
   * Get the content manager.
   * @returns {Object} The content manager
   */
  getContentManager() {
    return this.#contentManager;
  }

  // ========================================================================
  // PUBLIC API: Content Management
  // ========================================================================

  /**
   * Set the content node.
   * @param {SceneGraphNode} node - The content node
   * @param {Object} [options] - Content options
   * @param {string} [options.strategy='direct'] - Content strategy ('direct' | 'centeredAndScaled' | 'terrainAligned')
   */
  setContent(node, options = {}) {
    if (this.#contentManager) {
      this.#contentManager.setContent(node, options);
    }
  }

  /**
   * Get the current content node.
   * @returns {SceneGraphNode|null} The content node
   */
  getContent() {
    if (this.#contentManager) {
      return this.#contentManager.getContent();
    }
    return null;
  }

  // ========================================================================
  // PUBLIC API: Event System
  // ========================================================================

  /**
   * Register an event listener.
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   */
  on(eventName, callback) {
    if (!this.#eventListeners.has(eventName)) {
      this.#eventListeners.set(eventName, []);
    }
    this.#eventListeners.get(eventName).push(callback);
  }

  /**
   * Unregister an event listener.
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   */
  off(eventName, callback) {
    const listeners = this.#eventListeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event.
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   * @private
   */
  #emit(eventName, data) {
    const listeners = this.#eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in event listener for ${eventName}: ${error.message}`);
        }
      });
    }
  }

  // ========================================================================
  // PUBLIC API: Preferences
  // ========================================================================

  /**
   * Set a preference value.
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   */
  setPreference(key, value) {
    this.#preferences.set(key, value);
    const storageKey = this.#preferencePrefix + key;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      logger.warn(`Failed to save preference ${key}: ${error.message}`);
    }
  }

  /**
   * Get a preference value.
   * @param {string} key - Preference key
   * @param {any} [defaultValue=null] - Default value if preference not found
   * @returns {any} Preference value or defaultValue
   */
  getPreference(key, defaultValue = null) {
    // Check in-memory cache first
    if (this.#preferences.has(key)) {
      return this.#preferences.get(key);
    }

    // Check localStorage
    const storageKey = this.#preferencePrefix + key;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        const value = JSON.parse(stored);
        this.#preferences.set(key, value);
        return value;
      }
    } catch (error) {
      logger.warn(`Failed to load preference ${key}: ${error.message}`);
    }

    return defaultValue;
  }

  /**
   * Clear a preference.
   * @param {string} key - Preference key
   */
  clearPreference(key) {
    this.#preferences.delete(key);
    const storageKey = this.#preferencePrefix + key;
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      logger.warn(`Failed to clear preference ${key}: ${error.message}`);
    }
  }

  // ========================================================================
  // PUBLIC API: Convenience Methods
  // ========================================================================


  /**
   * Render the scene.
   */
  render() {
    if (this.#viewerSwitch) {
      this.#viewerSwitch.render();
    }
  }

  /**
   * Get render statistics from the currently selected viewer backend.
   *
   * Used by the inspector statistics panel. Concrete viewer implementations
   * (Canvas2D/WebGL2/SVG) inherit this API from Abstract2DViewer.
   *
   * @returns {{renderCallCount: number, pointsRendered: number, edgesRendered: number, facesRendered: number}}
   */
  getRenderStatistics() {
    const viewer = this.#viewerSwitch?.getCurrentViewer?.();
    if (viewer && typeof viewer.getRenderStatistics === 'function') {
      return viewer.getRenderStatistics();
    }
    return { renderCallCount: 0, pointsRendered: 0, edgesRendered: 0, facesRendered: 0 };
  }

  /**
   * Render asynchronously.
   */
  renderAsync() {
    if (this.#viewerSwitch && this.#viewerSwitch.canRenderAsync()) {
      this.#viewerSwitch.renderAsync();
    }
  }

  /**
   * Switch to a different viewer backend.
   * @param {number|string} viewer - Viewer index or name
   */
  selectViewer(viewer) {
    if (this.#viewerSwitch) {
      // Get old viewer index before switching
      const oldViewer = this.#viewerSwitch.getCurrentViewer();
      const oldIndex = this.#viewerSwitch.getViewers().indexOf(oldViewer);
      
      // Switch viewer
      if (typeof viewer === 'number') {
        this.#viewerSwitch.selectViewer(viewer);
      } else {
        this.#viewerSwitch.selectViewerByName(viewer);
      }
      
      // Get new viewer index after switching
      const newViewer = this.#viewerSwitch.getCurrentViewer();
      const newIndex = this.#viewerSwitch.getViewers().indexOf(newViewer);
      
      // Emit event for plugins (e.g., MenubarPlugin) to handle UI updates
      this.#emit('viewerChanged', { viewer, oldIndex, newIndex });
      this.#eventBus.emit('viewer:changed', { viewer, oldIndex, newIndex });
    }
  }

  // ========================================================================
  // PUBLIC API: Toolbar System
  // ========================================================================

  /**
   * Add a toolbar button.
   * @param {Object} button - Button definition
   * @param {string} button.label - Button label
   * @param {Function} button.action - Action callback
   * @param {string} [button.icon] - Icon URL or data
   * @param {string} [button.tooltip] - Tooltip text
   * @param {number} [priority=50] - Priority (lower = earlier)
   */
  addToolbarButton(button, priority = 50) {
    // Toolbar implementation can be added later
    logger.info('Toolbar button added (toolbar UI not yet implemented)');
  }

  // ========================================================================
  // PUBLIC API: Side Panel System
  // ========================================================================

  /**
   * Add a side panel.
   * @param {Object} panel - Panel definition
   * @param {string} panel.title - Panel title
   * @param {HTMLElement} panel.component - Panel component element
   * @param {string} [panel.position='right'] - Panel position ('left' | 'right' | 'top' | 'bottom')
   * @param {boolean} [panel.collapsible=true] - Whether panel is collapsible
   */
  addSidePanel(panel) {
    const id = panel.title || `panel-${this.#sidePanels.size}`;
    this.#sidePanels.set(id, panel);
    logger.info(`Side panel "${id}" registered (panel UI not yet implemented)`);
  }

  /**
   * Remove a side panel.
   * @param {string} panelId - Panel ID or title
   */
  removeSidePanel(panelId) {
    this.#sidePanels.delete(panelId);
    logger.info(`Side panel "${panelId}" removed`);
  }

  // ========================================================================
  // PUBLIC API: Export System
  // ========================================================================

  /**
   * Register an exporter.
   * @param {string} name - Exporter name
   * @param {Object} exporter - Exporter definition
   * @param {string} exporter.label - Exporter label
   * @param {Function} exporter.action - Export action callback
   */
  registerExporter(name, exporter) {
    this.#exporters.set(name, exporter);
  }

  /**
   * Export the scene as an image.
   * @param {string} [format='png'] - Image format ('png' | 'jpeg')
   * @param {number} [quality=0.95] - JPEG quality (0-1)
   * @returns {string} Data URL of the exported image
   */
  exportImage(format = 'png', quality = 0.95) {
    if (!this.#viewerSwitch) {
      throw new Error('Viewer not initialized');
    }

    const viewer = this.#viewerSwitch.getCurrentViewer();
    if (!viewer || typeof viewer.exportImage !== 'function') {
      throw new Error('Current viewer does not support image export');
    }

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataURL = viewer.exportImage(mimeType, quality);
    
    // Trigger download
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    const filename = `jsreality-export-${Date.now()}.${extension}`;
    this.#downloadDataURL(dataURL, filename);
    
    return dataURL;
  }

  /**
   * Export the scene as SVG.
   * @returns {string} SVG string
   */
  exportSVG() {
    if (!this.#viewerSwitch) {
      throw new Error('Viewer not initialized');
    }

    const viewer = this.#viewerSwitch.getCurrentViewer();
    const viewingComponent = viewer.getViewingComponent();
    const width = viewingComponent.clientWidth || viewingComponent.offsetWidth || 800;
    const height = viewingComponent.clientHeight || viewingComponent.offsetHeight || 600;

    // Create temporary container
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${width}px`;
    tempContainer.style.height = `${height}px`;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    try {
      // Create SVG viewer - dimensions will be read from container
      const svgViewer = new SVGViewer(tempContainer, { autoResize: false });
      let svgString = '';
      try {
        svgViewer.setSceneRoot(this.#sceneRoot);
        svgViewer.setCameraPath(this.#cameraPath);
        svgViewer.render();

        // Export SVG
        svgString = svgViewer.exportSVG();
      } finally {
        svgViewer.dispose();
      }
      
      // Trigger download
      const filename = `jsreality-export-${Date.now()}.svg`;
      this.#downloadSVG(svgString, filename);
      
      return svgString;
    } finally {
      document.body.removeChild(tempContainer);
    }
  }

  /**
   * Download a data URL as a file.
   * @param {string} dataURL - Data URL to download
   * @param {string} filename - Filename for the download
   * @private
   */
  #downloadDataURL(dataURL, filename) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Download SVG string as a file.
   * @param {string} svgString - SVG string to download
   * @param {string} filename - Filename for the download
   * @private
   */
  #downloadSVG(svgString, filename) {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export the scene as an image rendered by WebGL.
   * @param {string} [format='png'] - Image format ('png' | 'jpeg')
   * @param {number} [quality=0.95] - JPEG quality (0-1)
   * @returns {string} Data URL of the exported image
   */
  exportWebGL(format = 'png', quality = 0.95) {
    if (!this.#viewerSwitch) {
      throw new Error('Viewer not initialized');
    }

    const viewer = this.#viewerSwitch.getCurrentViewer();
    const viewingComponent = viewer.getViewingComponent();
    const width = viewingComponent.clientWidth || viewingComponent.offsetWidth || 800;
    const height = viewingComponent.clientHeight || viewingComponent.offsetHeight || 600;

    // Create temporary container
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${width}px`;
    tempContainer.style.height = `${height}px`;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    try {
      // Create WebGL viewer
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      tempContainer.appendChild(canvas);

      const webglViewer = new WebGL2Viewer(canvas, { autoResize: false });
      webglViewer.setSceneRoot(this.#sceneRoot);
      webglViewer.setCameraPath(this.#cameraPath);
      webglViewer.render();

      // Export image
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataURL = webglViewer.exportImage(mimeType, quality);
      
      // Trigger download
      const extension = format === 'jpeg' ? 'jpg' : 'png';
      const filename = `jsreality-webgl-export-${Date.now()}.${extension}`;
      this.#downloadDataURL(dataURL, filename);
      
      return dataURL;
    } finally {
      document.body.removeChild(tempContainer);
    }
  }

  // ========================================================================
  // PUBLIC API: Convenience Methods
  // ========================================================================

  /**
   * Reset the camera to default position.
   */
  resetCamera() {
    if (!this.#cameraComponent) {
      return;
    }

    // Reset camera transformation
    const transform = new Transformation();
    const cameraMatrix = MatrixBuilder.euclidean().translate(0, 0, -1).getArray();
    transform.setMatrix(cameraMatrix);
    this.#cameraComponent.setTransformation(transform);

    // Reset camera parameters
    const camera = this.#cameraPath ? this.#cameraPath.getLastElement() : null;
    if (camera && camera instanceof Camera) {
      camera.setNear(-5);
      camera.setFar(5);
      camera.setPerspective(false);
    }

    this.#emit('cameraChanged', {});
    this.render();
  }


  /**
   * Dispose of resources.
   */
  dispose() {
    logger.info('Disposing JSRViewer');

    // Uninstall all plugins first
    if (this.#pluginManager) {
      this.#pluginManager.uninstallAll().catch(error => {
        logger.severe(`Error uninstalling plugins during dispose: ${error.message}`);
      });
    }

    if (this.#viewerSwitch) {
      this.#viewerSwitch.dispose();
      this.#viewerSwitch = null;
    }

    if (this.#toolSystem) {
      this.#toolSystem.dispose();
      this.#toolSystem = null;
    }

    if (this.#contentManager) {
      // ContentManager doesn't have dispose, but we can clear listeners
      this.#contentManager = null;
    }

    // Clear event listeners
    this.#eventListeners.clear();

    if (this.#viewerEventBridge) {
      this.#viewerEventBridge.dispose();
      this.#viewerEventBridge = null;
    }

    // Clear event bus
    if (this.#eventBus) {
      this.#eventBus.clear();
      this.#eventBus = null;
    }

    // Clear exporters and panels
    this.#exporters.clear();
    this.#sidePanels.clear();

    logger.info('JSRViewer disposed');
  }

  // ========================================================================
  // PUBLIC API: Plugin System
  // ========================================================================

  /**
   * Register a plugin.
   * Plugins extend JSRViewer functionality in a structured way.
   * 
   * @param {import('./plugin/JSRPlugin.js').JSRPlugin} plugin - The plugin to register
   * @returns {Promise<void>}
   * @throws {Error} If plugin registration fails
   */
  async registerPlugin(plugin) {
    return await this.#pluginManager.registerPlugin(plugin);
  }

  /**
   * Uninstall a plugin.
   * 
   * @param {string} pluginId - ID of the plugin to uninstall
   * @returns {Promise<void>}
   */
  async uninstallPlugin(pluginId) {
    return await this.#pluginManager.uninstallPlugin(pluginId);
  }

  /**
   * Get a plugin by ID.
   * 
   * @param {string} pluginId - The plugin ID
   * @returns {import('./plugin/JSRPlugin.js').JSRPlugin|null} The plugin instance or null
   */
  getPlugin(pluginId) {
    return this.#pluginManager.getPlugin(pluginId);
  }

  /**
   * Check if a plugin is registered.
   * 
   * @param {string} pluginId - The plugin ID
   * @returns {boolean} True if registered
   */
  hasPlugin(pluginId) {
    return this.#pluginManager.hasPlugin(pluginId);
  }

  /**
   * Get all registered plugins.
   * 
   * @returns {import('./plugin/JSRPlugin.js').JSRPlugin[]} Array of plugins
   */
  getAllPlugins() {
    return this.#pluginManager.getAllPlugins();
  }

  /**
   * Get plugin information for all registered plugins.
   * 
   * @returns {Array<import('./plugin/JSRPlugin.js').PluginInfo>} Array of plugin info
   */
  getAllPluginInfo() {
    return this.#pluginManager.getAllPluginInfo();
  }

  /**
   * Emit an event to all plugins via the event bus.
   * Plugins can listen to events using their PluginContext.
   * 
   * @param {string} eventType - Type of event
   * @param {*} data - Event data
   */
  emitPluginEvent(eventType, data) {
    this.#eventBus.emit(eventType, data);
  }

  /**
   * Subscribe to plugin events.
   * 
   * @param {string} eventType - Type of event to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onPluginEvent(eventType, callback) {
    return this.#eventBus.on(eventType, callback);
  }

  // ========================================================================
  // PUBLIC API: Controller (JRViewer-style facade)
  // ========================================================================

  /**
   * Get the PluginController instance.
   * This is the main interface for plugins to interact with the viewer,
   * similar to JRViewer's Controller.
   * 
   * @returns {PluginController}
   */
  getController() {
    if (!this.#controller) {
      throw new Error('PluginController is not initialized');
    }
    return this.#controller;
  }

  // ========================================================================
  // PUBLIC API: Panel Slot Management (JRViewer-style convenience)
  // ========================================================================

  /**
   * Configure visibility of panel slots.
   * Similar to JRViewer.setShowPanelSlots(left, right, top, bottom).
   *
   * This method is tolerant of being passed an array of booleans
   * (e.g. [left, right, top, bottom]) for convenience.
   *
   * @param {boolean|boolean[]} left - Show left panel slot (or tuple of booleans)
   * @param {boolean} [right=false] - Show right panel slot
   * @param {boolean} [top=false] - Show top panel slot
   * @param {boolean} [bottom=false] - Show bottom panel slot
   */
  setShowPanelSlots(left, right = false, top = false, bottom = false) {
    if (Array.isArray(left)) {
      const tuple = left;
      [left, right, top, bottom] = [
        Boolean(tuple[0]),
        Boolean(tuple[1]),
        Boolean(tuple[2]),
        Boolean(tuple[3])
      ];
    }
    this.getController().setShowPanelSlots({ left, right, top, bottom });
  }

  /**
   * Request a left side panel.
   * Convenience wrapper around PluginController.requestLeftPanel.
   * 
   * @param {Object} [config]
   * @returns {HTMLElement}
   */
  requestLeftPanel(config = {}) {
    return this.getController().requestLeftPanel(config);
  }

  /**
   * Request a top panel.
   * Convenience wrapper around PluginController.requestTopPanel.
   * 
   * @param {Object} [config]
   * @returns {HTMLElement}
   */
  requestTopPanel(config = {}) {
    return this.getController().requestTopPanel(config);
  }

  /**
   * Request a bottom panel (wide, short panels such as animation timeline).
   * Convenience wrapper around PluginController.requestBottomPanel.
   *
   * @param {Object} [config]
   * @returns {HTMLElement}
   */
  requestBottomPanel(config = {}) {
    return this.getController().requestBottomPanel(config);
  }

  /**
   * Request a right side panel.
   * Convenience wrapper around PluginController.requestRightPanel.
   * 
   * @param {Object} [config]
   * @returns {HTMLElement}
   */
  requestRightPanel(config = {}) {
    return this.getController().requestRightPanel(config);
  }
}

