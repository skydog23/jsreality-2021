/**
 * JavaScript port/translation of jReality's JSRApp class.
 * 
 * Simplified application base class that uses JSRViewer internally.
 * Provides animation support and a simplified API for quick prototyping.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRViewer } from './JSRViewer.js';
import { Canvas2DViewer } from '../core/viewers/Canvas2DViewer.js';
import { WebGL2DViewer } from '../core/viewers/WebGL2DViewer.js';
import { SVGViewer } from '../core/viewers/SVGViewer.js';
import { Animated } from '../core/anim/core/Animated.js';
import { ToolSystem } from '../core/scene/tool/ToolSystem.js';
import { InputSlot } from '../core/scene/tool/InputSlot.js';
import { ToolEvent } from '../core/scene/tool/ToolEvent.js';
import { AxisState } from '../core/scene/tool/AxisState.js';
import * as CommonAttributes from '../core/shader/CommonAttributes.js';
import { Color } from '../core/util/Color.js';
import { SceneGraphInspector } from '../core/inspect/SceneGraphInspector.js';
import { SplitPane } from './ui/SplitPane.js';

/** @typedef {import('../core/scene/Viewer.js').Viewer} Viewer */
/** @typedef {import('../core/scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */

/**
 * Abstract base class for jsReality applications.
 * Subclasses must implement getContent() to provide the scene graph content.
 * 
 * This class provides a simplified API for quick prototyping while using
 * JSRViewer internally for core functionality. It adds animation support
 * via the Animated base class and system time updates for tool system.
 * 
 * @abstract
 */
export class JSRApp extends Animated {
  /**
   * @type {JSRViewer} The JSRViewer instance (private)
   */
  #jsrViewer;

  /**
   * @type {Viewer} The viewer instance (protected - accessible to subclasses)
   * This is the current viewer from ViewerSwitch for backward compatibility.
   */
  _viewer;

  /**
   * @type {ToolSystem|null} The tool system instance (protected)
   */
  _toolSystem = null;

  /**
   * @type {SceneGraphInspector|null} The scene graph inspector instance (private)
   */
  #inspector = null;

  /**
   * @type {SplitPane|null} The split pane instance (private)
   */
  #splitPane = null;

  /**
   * Create a new JSRApp instance.
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {Object} [options] - Optional configuration
   * @param {HTMLElement} [options.menubarContainer] - Container element for the menu bar
   */
  constructor(canvas, options = {}) {
    super(); // Call super constructor first
    
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('JSRApp requires an HTMLCanvasElement');
    }

    let { menubarContainer = null } = options;

    // Save reference to canvas's parent before we modify the DOM
    const originalParent = canvas.parentElement;

    // Create a container div for JSRViewer (it needs a container, not a canvas directly)
    // JSRViewer will append the ViewerSwitch wrapper inside this container
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    
    // Replace canvas with container in the DOM
    if (originalParent) {
      // Configure parent as flex column to stack menubar above viewer
      originalParent.style.display = 'flex';
      originalParent.style.flexDirection = 'column';
      
      // Create menubar container if not provided
      if (!menubarContainer) {
        menubarContainer = document.createElement('div');
        menubarContainer.id = 'jsrapp-menubar-container';
        menubarContainer.style.width = '100%';
        menubarContainer.style.height = 'auto';
        menubarContainer.style.flexShrink = '0';
        // Insert menubar container BEFORE the canvas (so it's above)
        originalParent.insertBefore(menubarContainer, canvas);
      }
      
      // Replace canvas with viewer container
      originalParent.replaceChild(container, canvas);
      
      // Make viewer container fill remaining space
      container.style.flex = '1';
      container.style.minHeight = '0';
      
      // Now append canvas to the container so it's available for Canvas2DViewer
      container.appendChild(canvas);
    } else {
      // No parent - just append canvas to container
      container.appendChild(canvas);
    }

    // Create all three viewers with separate DOM elements
    // 1. Canvas2DViewer - use the provided canvas
    const canvasViewer = new Canvas2DViewer(canvas);
    
    // 2. WebGL2DViewer - create a new canvas
    const webglCanvas = document.createElement('canvas');
    webglCanvas.style.width = '100%';
    webglCanvas.style.height = '100%';
    container.appendChild(webglCanvas);
    const webglViewer = new WebGL2DViewer(webglCanvas);
    
    // 3. SVGViewer - create a container div
    const svgContainer = document.createElement('div');
    svgContainer.style.width = '100%';
    svgContainer.style.height = '100%';
    svgContainer.style.position = 'absolute';
    svgContainer.style.top = '0';
    svgContainer.style.left = '0';
    container.appendChild(svgContainer);
    const svgViewer = new SVGViewer(svgContainer);
    
    // TODO: WebGL2DViewer has a minor initialization issue - on first selection,
    // it renders at 2x size due to pixel ratio being applied before canvas has
    // computed dimensions. Switching away and back fixes it (ResizeObserver fires).
    // This is a minor cosmetic issue that can be addressed later.
    
    // Pass the container to JSRViewer, along with all three viewers
    // JSRViewer will append the ViewerSwitch wrapper to the container
    // ViewerSwitch will handle showing/hiding the appropriate viewer
    this.#jsrViewer = new JSRViewer({
      container: container,  // Pass container div
      menubarContainer: menubarContainer,  // Pass the menubar container we created
      viewers: [canvasViewer, webglViewer, svgViewer],
      viewerNames: ['Canvas2D', 'WebGL2D', 'SVG']
    });

    // Get content from subclass and set it
    const content = this.getContent();
    if (!content) {
      throw new Error('getContent() must return a SceneGraphComponent');
    }
    this.#jsrViewer.setContent(content);

    // Set up protected accessors for backward compatibility
    this._viewer = this.#jsrViewer.getViewer().getCurrentViewer();
    this._toolSystem = this.#jsrViewer.getToolSystem();

    // Re-discover scene tools after content is set
    // This ensures tools added in getContent() are discovered and registered
    // Use rediscoverSceneTools() instead of initializeSceneTools() to avoid
    // restarting the event queue which was already started during JSRViewer initialization
    if (this._toolSystem) {
      this._toolSystem.rediscoverSceneTools();
    }

    // Set up system time updates (unique to JSRApp for animation support)
    this._setupSystemTimeUpdates();

    
  }

  /**
   * Set up periodic system time updates.
   * System time events trigger implicit device updates (camera transformations).
   * This is unique to JSRApp and provides animation support.
   * @private
   */
  _setupSystemTimeUpdates() {
    const updateSystemTime = () => {
      if (this._toolSystem) {
        const now = Date.now();
        // Process system time event - this will trigger implicit device updates
        // and update camera transformations
        const event = new ToolEvent(this, now, InputSlot.SYSTEM_TIME, AxisState.ORIGIN);
        this._toolSystem.processToolEvent(event);
      }
      requestAnimationFrame(updateSystemTime);
    };
    requestAnimationFrame(updateSystemTime);
  }

  /**
   * Get the viewer instance.
   * Returns the current viewer from ViewerSwitch for backward compatibility.
   * @returns {Viewer} The viewer
   */
  getViewer() {
    return this._viewer;
  }

  /**
   * Get the JSRViewer instance.
   * @returns {JSRViewer} The JSRViewer instance
   */
  getJSRViewer() {
    return this.#jsrViewer;
  }

  /**
   * Get the tool system instance.
   * @returns {ToolSystem|null} The tool system
   */
  getToolSystem() {
    return this._toolSystem;
  }

  /**
   * Get the scene graph content. This method must be implemented by subclasses.
   * @abstract
   * @returns {SceneGraphComponent} The scene graph root component
   */
  getContent() {
    throw new Error(`${this.constructor.name} must implement getContent()`);
  }

  /**
   * Called after initialization and before rendering to set up application
   * specific attributes.
   */
  display() {
    const ap = this.#jsrViewer.getViewer().getSceneRoot().getAppearance();
    ap.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(200, 175, 150));
    this.enableInspector();
  
    this.#jsrViewer.getViewer().render();
    // Refresh inspector if enabled
    if (this.#inspector) {
      this.#inspector.refresh();
    }
  }

  /**
   * Enable the scene graph inspector.
   * Creates a SceneGraphInspector instance and sets it up to refresh on renders.
   * Creates a split pane to allow resizing between viewer and inspector.
   * @param {HTMLElement} [container] - Optional container element for the inspector.
   *                                    If not provided, a split pane will be created.
   * @param {Object} [options] - Inspector options
   * @param {string} [options.position='right'] - Position of inspector ('left' | 'right' | 'top' | 'bottom')
   * @param {number} [options.initialSize=300] - Initial size of inspector panel in pixels
   * @returns {SceneGraphInspector} The inspector instance
   */
  enableInspector(container = null, options = {}) {
    if (this.#inspector) {
      return this.#inspector; // Already enabled
    }

    const { position = 'right', initialSize = 300 } = options;

    // Get viewer container
    const viewerContainer = this.#jsrViewer.getViewer().getViewingComponent().parentElement;
    if (!viewerContainer) {
      throw new Error('Cannot enable inspector: viewer container not found');
    }

    // Determine orientation based on position
    const orientation = (position === 'left' || position === 'right') ? 'horizontal' : 'vertical';

    // Create inspector container
    if (!container) {
      container = document.createElement('div');
      container.id = 'jsrapp-inspector-container';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.overflow = 'auto';
    }

    // Get scene root
    const sceneRoot = this.#jsrViewer.getSceneRoot();
    if (!sceneRoot) {
      throw new Error('Cannot enable inspector: scene root is not available');
    }

    // Create split pane if container was not provided
    if (!container.parentElement) {
      // Create split pane container
      const splitPaneContainer = document.createElement('div');
      splitPaneContainer.style.width = '100%';
      splitPaneContainer.style.height = '100%';
      splitPaneContainer.style.position = 'relative';

      // Replace viewer container's content with split pane
      const parent = viewerContainer.parentElement;
      parent.replaceChild(splitPaneContainer, viewerContainer);
      splitPaneContainer.appendChild(viewerContainer);

      // Determine which panel is left/top and which is right/bottom
      let leftPanel, rightPanel;
      if (position === 'left') {
        leftPanel = container;
        rightPanel = viewerContainer;
      } else if (position === 'right') {
        leftPanel = viewerContainer;
        rightPanel = container;
      } else if (position === 'top') {
        leftPanel = container;
        rightPanel = viewerContainer;
      } else { // bottom
        leftPanel = viewerContainer;
        rightPanel = container;
      }

      // Calculate initial size for left panel
      // If inspector is on right/bottom, left panel (viewer) should be larger
      let leftPanelInitialSize;
      if (position === 'left' || position === 'top') {
        leftPanelInitialSize = initialSize; // Inspector size
      } else {
        // Inspector is on right/bottom, so viewer (left panel) gets remaining space
        // Use a reasonable calculation based on available space
        const containerSize = orientation === 'horizontal' 
          ? (splitPaneContainer.offsetWidth || window.innerWidth)
          : (splitPaneContainer.offsetHeight || window.innerHeight);
        leftPanelInitialSize = Math.max(containerSize - initialSize - 4, 200); // 4px for splitter, min 200px
      }

      // Create split pane
      this.#splitPane = new SplitPane(splitPaneContainer, {
        leftPanel: leftPanel,
        rightPanel: rightPanel,
        orientation: orientation,
        initialSize: leftPanelInitialSize,
        minSize: 100,
        splitterWidth: 4
      });
    } else {
      // Container was provided, just append it (no split pane)
      if (!container.parentElement) {
        viewerContainer.parentElement.appendChild(container);
      }
    }

    // Create inspector
    this.#inspector = new SceneGraphInspector(container, sceneRoot);

    // Set up viewer instance reference for inspector property changes to trigger renders
    // The inspector's onPropertyChange callback looks for window._viewerInstance
    if (typeof window !== 'undefined') {
      window._viewerInstance = this.#jsrViewer;
    }

    // Initial refresh
    this.#inspector.refresh();

    return this.#inspector;
  }

  /**
   * Get the scene graph inspector instance.
   * @returns {SceneGraphInspector|null} The inspector instance, or null if not enabled
   */
  getInspector() {
    return this.#inspector;
  }

  /**
   * Set value at time (for animation).
   * Override in subclasses to implement animation behavior.
   * @param {number} t - Time value
   */
  setValueAtTime(t) {
    // Override in subclasses
  }

  /**
   * Start animation.
   * Override in subclasses to implement animation start behavior.
   */
  startAnimation() {
    // Override in subclasses
  }

  /**
   * End animation.
   * Override in subclasses to implement animation end behavior.
   */
  endAnimation() {
    // Override in subclasses
  }

  /**
   * Print current state (for debugging).
   */
  printState() {
    console.log(this.#jsrViewer.getSceneRoot());
  }

  /**
   * Dispose of resources.
   */
  dispose() {
    if (this.#inspector) {
      // Inspector doesn't have a dispose method, but we can clear the reference
      this.#inspector = null;
    }
    if (this.#jsrViewer) {
      this.#jsrViewer.dispose();
      this.#jsrViewer = null;
    }
    this._viewer = null;
    this._toolSystem = null;
  }
}
