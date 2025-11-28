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
import { Menubar } from './ui/Menubar.js';
import { SVGViewer } from '../core/viewers/SVGViewer.js';
import { WebGL2DViewer } from '../core/viewers/WebGL2DViewer.js';
// Ensure shaders are registered (side effect import - triggers registerDefaultShaders)
import '../core/shader/index.js';

const logger = getLogger('JSRViewer');

/**
 * JSRViewer provides application-level viewer functionality similar to JRViewer,
 * but using a web-native component-based architecture instead of a plugin system.
 */
export class JSRViewer {

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
  /** @type {Menubar|null} */
  #menubar = null;

  /** @type {HTMLElement|null} */
  #menubarContainer = null;

  /** @type {HTMLElement|null} */
  #container = null;

  /** @type {boolean} */
  #menubarEnabled = true; // Enabled by default

  /** @type {Map<string, Object>} */
  #exporters = new Map();

  /** @type {Map<string, Object>} */
  #sidePanels = new Map();

  // Event system
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
   * @param {HTMLElement|HTMLCanvasElement} options.container - Container element for the viewer
   * @param {HTMLElement} [options.menubarContainer] - Container for menu bar (optional)
   * @param {Viewer[]} [options.viewers] - Array of viewer instances (defaults to Canvas2DViewer)
   * @param {string[]} [options.viewerNames] - Names for the viewers
   * @param {SceneGraphComponent} [options.sceneRoot] - Existing scene root (creates default if not provided)
   * @param {Object} [options.toolSystemConfig] - Tool system configuration
   */
  constructor(options) {
    const {
      container,
      menubarContainer = null,
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

    // Initialize core systems
    this.#initializeViewers(container, viewers, viewerNames);
    this.#initializeScene(sceneRoot);
    this.#initializeToolSystem(toolSystemConfig);
    this.#initializeContentManager();
    this.#initializeUI(menubarContainer);
    this.#registerDefaults();

    logger.info('JSRViewer initialized');
  }

  /**
   * Initialize viewer system.
   * @param {HTMLElement} container - Container element
   * @param {Viewer[]|null} viewers - Optional array of viewers
   * @param {string[]|null} viewerNames - Optional viewer names
   * @private
   */
  #initializeViewers(container, viewers, viewerNames) {
    if (!viewers || viewers.length === 0) {
      // Create default Canvas2DViewer
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);
      viewers = [new Canvas2DViewer(canvas)];
    }

    // Create ViewerSwitch
    this.#viewerSwitch = new ViewerSwitch(viewers, viewerNames);
    
    // Get wrapper element and add to container
    const wrapperElement = this.#viewerSwitch.getViewingComponent();
    wrapperElement.style.width = '100%';
    wrapperElement.style.height = '100%';
    container.appendChild(wrapperElement);

    logger.info(`ViewerSwitch created with ${viewers.length} viewer(s)`);
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
      // Use default configuration
      config = ToolSystemConfiguration.loadDefaultConfiguration();
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
      logger.warning('Content component not initialized, creating default');
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
   * Initialize UI components (menubar).
   * @param {HTMLElement|null} menubarContainer - Container for menu bar (optional)
   * @private
   */
  #initializeUI(menubarContainer) {
    // Store menubar container if provided, but don't create menubar yet
    // It will be created by enableMenubar() if enabled
    this.#menubarContainer = menubarContainer;
    
    // Create menubar if enabled by default
    if (this.#menubarEnabled) {
      this.enableMenubar(menubarContainer);
    }
  }

  /**
   * Register default menu items and exporters.
   * @private
   */
  #registerDefaults() {
    // Note: Default menu items are registered in enableMenubar(), not here
    // This prevents duplicate registration

    // Register default exporters

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
      logger.warning(`Failed to save preference ${key}: ${error.message}`);
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
      logger.warning(`Failed to load preference ${key}: ${error.message}`);
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
      logger.warning(`Failed to clear preference ${key}: ${error.message}`);
    }
  }

  // ========================================================================
  // PUBLIC API: Convenience Methods
  // ========================================================================

  /**
   * Set the background color.
   * @param {Color|string|number[]} color - Background color
   */
  setBackgroundColor(color) {
    if (!this.#sceneRoot) {
      return;
    }

    let appearance = this.#sceneRoot.getAppearance();
    if (!appearance) {
      appearance = new Appearance('rootAppearance');
      this.#sceneRoot.setAppearance(appearance);
    }

    let colorObj = color;
    if (typeof color === 'string') {
      // Parse CSS color string (simple implementation)
      const colorMap = {
        'white': new Color(255, 255, 255),
        'gray': new Color(225, 225, 225),
        'black': new Color(0, 0, 0),
        'transparent': new Color(0, 0, 0, 0)
      };
      colorObj = colorMap[color.toLowerCase()] || new Color(225, 225, 225);
    } else if (Array.isArray(color)) {
      colorObj = new Color(...color);
    }

    appearance.setAttribute(CommonAttributes.BACKGROUND_COLOR, colorObj);
    this.setPreference('backgroundColor', color);
    this.render();
  }

  /**
   * Render the scene.
   */
  render() {
    if (this.#viewerSwitch) {
      this.#viewerSwitch.render();
    }
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
      if (typeof viewer === 'number') {
        this.#viewerSwitch.selectViewer(viewer);
      } else {
        this.#viewerSwitch.selectViewerByName(viewer);
      }
      this.#emit('viewerChanged', { viewer });
    }
  }

  // ========================================================================
  // PUBLIC API: Menu System
  // ========================================================================

  /**
   * Enable the menu bar.
   * Creates a Menubar instance and sets it up with default menu items.
   * @param {HTMLElement} [container] - Optional container element for the menubar.
   *                                    If not provided, a default container will be created.
   * @returns {Menubar} The menubar instance
   */
  enableMenubar(container = null) {
    if (this.#menubar) {
      return this.#menubar; // Already enabled
    }

    // Create container if not provided
    if (!container) {
      container = document.createElement('div');
      container.id = 'jsrviewer-menubar-container';
      container.style.width = '100%';
      container.style.height = 'auto';
      
      // Insert menubar at the top of the viewer container
      const viewerComponent = this.#viewerSwitch.getViewingComponent();
      if (viewerComponent && viewerComponent.parentElement) {
        viewerComponent.parentElement.insertBefore(container, viewerComponent);
      } else if (this.#container) {
        // If viewer component isn't in DOM yet, prepend to container
        this.#container.insertBefore(container, this.#container.firstChild);
      }
    }

    this.#menubarContainer = container;
    
    // Create menubar with default menu provider
    // The provider function receives the menubar instance and registers menu items
    const defaultMenuProvider = (menubar) => {
      // File menu
      menubar.addMenuItem('File', {
        label: 'Export PNG',
        action: () => this.exportImage('png')
      }, 10);

      menubar.addMenuItem('File', {
        label: 'Export JPEG',
        action: () => this.exportImage('jpeg', 0.95)
      }, 11);

      menubar.addMenuItem('File', {
        label: 'Export SVG',
        action: () => this.exportSVG()
      }, 12);

      menubar.addMenuItem('File', {
        label: 'Export WebGL',
        action: () => this.exportWebGL()
      }, 13);

      menubar.addMenuSeparator('File', 20);

      // Viewer menu
      menubar.addMenuItem('Viewer', {
        label: 'Background',
        submenu: [
          { label: 'White', action: () => this.setBackgroundColor('white') },
          { label: 'Gray', action: () => this.setBackgroundColor('gray') },
          { label: 'Black', action: () => this.setBackgroundColor('black') },
          { label: 'Transparent', action: () => this.setBackgroundColor('transparent') }
        ]
      }, 10);

      menubar.addMenuItem('Viewer', {
        label: 'Reset Camera',
        action: () => this.resetCamera()
      }, 20);
    };
    
    this.#menubar = new Menubar(container, {
      defaultMenuProviders: [defaultMenuProvider]
    });
    this.#menubarEnabled = true;

    return this.#menubar;
  }


  /**
   * Get the menubar instance.
   * @returns {Menubar|null} The menubar instance, or null if not enabled
   */
  getMenubar() {
    return this.#menubar;
  }

  /**
   * Add a menu item to a menu.
   * @param {string} menuName - Name of the menu
   * @param {Object} item - Menu item definition
   * @param {number} [priority=50] - Priority (lower = earlier)
   */
  addMenuItem(menuName, item, priority = 50) {
    if (!this.#menubar) {
      logger.warning('Menubar not initialized, menu item not added');
      return;
    }
    this.#menubar.addMenuItem(menuName, item, priority);
  }

  /**
   * Add a separator to a menu.
   * @param {string} menuName - Name of the menu
   * @param {number} [priority=50] - Priority
   */
  addMenuSeparator(menuName, priority = 50) {
    if (!this.#menubar) {
      return;
    }
    this.#menubar.addMenuSeparator(menuName, priority);
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
      // Create SVG viewer
      const svgViewer = new SVGViewer(tempContainer, { width, height });
      svgViewer.setSceneRoot(this.#sceneRoot);
      svgViewer.setCameraPath(this.#cameraPath);
      svgViewer.render();

      // Export SVG
      const svgString = svgViewer.exportSVG();
      
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

      const webglViewer = new WebGL2DViewer(canvas, { autoResize: false });
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
   * Encompass the content in the view (fit content to view).
   */
  encompassEuclidean() {
    if (!this.#contentManager || !this.#contentComponent) {
      return;
    }

    const content = this.#contentManager.getContent();
    if (!content) {
      return;
    }

    // Use centeredAndScaled strategy with encompass
    this.#contentManager.setContent(content, {
      strategy: 'centeredAndScaled',
      encompass: true
    });

    this.render();
  }

  /**
   * Dispose of resources.
   */
  dispose() {
    logger.info('Disposing JSRViewer');

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

    // Clear exporters and panels
    this.#exporters.clear();
    this.#sidePanels.clear();

    logger.info('JSRViewer disposed');
  }
}

