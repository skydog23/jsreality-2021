/**
 * ViewerSwitch - Manages multiple viewer backends and provides a stable viewing component.
 * 
 * This class hides several viewer implementations and provides the same viewing component
 * for all. Using this class, an application doesn't need to care about component replacement
 * when switching from one viewer to another.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Viewer, Dimension } from '../scene/Viewer.js';
import { ToolSystem } from '../scene/tool/ToolSystem.js';
import { getLogger } from '../util/LoggingSystem.js';

/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */

const logger = getLogger('jsreality.core.viewers.ViewerSwitch');

/**
 * Creates default viewer names from viewer array.
 * @param {Viewer[]} viewers - Array of viewers
 * @returns {string[]} Array of viewer names
 */
function createViewerNames(viewers) {
  return viewers.map((viewer, index) => {
    return `[${index}] ${viewer.constructor.name}`;
  });
}

/**
 * Event dispatcher that forwards events from the current viewer's component
 * to the wrapper component, ensuring listeners attached to the wrapper continue
 * to work when switching viewers.
 */
class EventDispatcher {
  /**
   * @param {HTMLElement} wrapperElement - The wrapper element to dispatch events to
   */
  constructor(wrapperElement) {
    this.#wrapperElement = wrapperElement;
  }

  /** @type {HTMLElement} */
  #wrapperElement;

  /**
   * Dispatch an event to the wrapper element.
   * @param {Event} event - The event to dispatch
   */
  #dispatch(event) {
    // Clone the event and dispatch it on the wrapper element
    // This ensures listeners attached to the wrapper continue to work
    const clonedEvent = new event.constructor(event.type, {
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      composed: event.composed
    });
    
    // Copy relevant properties
    if (event instanceof MouseEvent) {
      Object.defineProperty(clonedEvent, 'clientX', { value: event.clientX, writable: false });
      Object.defineProperty(clonedEvent, 'clientY', { value: event.clientY, writable: false });
      Object.defineProperty(clonedEvent, 'button', { value: event.button, writable: false });
      Object.defineProperty(clonedEvent, 'buttons', { value: event.buttons, writable: false });
      Object.defineProperty(clonedEvent, 'ctrlKey', { value: event.ctrlKey, writable: false });
      Object.defineProperty(clonedEvent, 'shiftKey', { value: event.shiftKey, writable: false });
      Object.defineProperty(clonedEvent, 'altKey', { value: event.altKey, writable: false });
      Object.defineProperty(clonedEvent, 'metaKey', { value: event.metaKey, writable: false });
    } else if (event instanceof KeyboardEvent) {
      Object.defineProperty(clonedEvent, 'key', { value: event.key, writable: false });
      Object.defineProperty(clonedEvent, 'code', { value: event.code, writable: false });
      Object.defineProperty(clonedEvent, 'keyCode', { value: event.keyCode, writable: false });
      Object.defineProperty(clonedEvent, 'ctrlKey', { value: event.ctrlKey, writable: false });
      Object.defineProperty(clonedEvent, 'shiftKey', { value: event.shiftKey, writable: false });
      Object.defineProperty(clonedEvent, 'altKey', { value: event.altKey, writable: false });
      Object.defineProperty(clonedEvent, 'metaKey', { value: event.metaKey, writable: false });
    } else if (event instanceof WheelEvent) {
      Object.defineProperty(clonedEvent, 'deltaX', { value: event.deltaX, writable: false });
      Object.defineProperty(clonedEvent, 'deltaY', { value: event.deltaY, writable: false });
      Object.defineProperty(clonedEvent, 'deltaZ', { value: event.deltaZ, writable: false });
      Object.defineProperty(clonedEvent, 'deltaMode', { value: event.deltaMode, writable: false });
    }

    this.#wrapperElement.dispatchEvent(clonedEvent);
  }

  /**
   * Handle mouse events
   */
  handleMouseEvent(event) {
    this.#dispatch(event);
  }

  /**
   * Handle keyboard events
   */
  handleKeyEvent(event) {
    this.#dispatch(event);
  }

  /**
   * Handle wheel events
   */
  handleWheelEvent(event) {
    this.#dispatch(event);
  }
}

/**
 * ViewerSwitch manages multiple viewer backends and provides a stable viewing component.
 * 
 * This allows switching between different viewer implementations (Canvas2D, WebGL2, SVG, etc.)
 * without needing to re-attach event listeners or reconfigure the ToolSystem.
 */
export class ViewerSwitch extends Viewer {

  /** @type {Viewer[]} */
  #viewers;

  /** @type {string[]} */
  #viewerNames;

  /** @type {Viewer} */
  #currentViewer;

  /** @type {HTMLElement} */
  #wrapperElement;

  /** @type {EventDispatcher|null} */
  #eventDispatcher = null;

  /** @type {Map<HTMLElement, EventDispatcher>} */
  #elementDispatchers = new Map();

  /** @type {Map<HTMLElement, {eventTypes: string[], handler: (e: Event) => void, keyHandler: (e: Event) => void, wheelHandler: (e: Event) => void}>} */
  #elementListenerRecords = new Map();

  /** @type {ResizeObserver|null} */
  #resizeObserver = null;

  /**
   * Create a new ViewerSwitch.
   * @param {Viewer[]} viewers - Array of viewer instances
   * @param {string[]} [names] - Optional array of viewer names (defaults to auto-generated names)
   */
  constructor(viewers, names = null) {
    super();

    if (!Array.isArray(viewers) || viewers.length === 0) {
      throw new Error('ViewerSwitch requires at least one viewer');
    }

    this.#viewers = [...viewers]; // Clone array
    this.#viewerNames = names || createViewerNames(viewers);
    
    if (this.#viewerNames.length !== this.#viewers.length) {
      throw new Error('Viewer names array must have same length as viewers array');
    }

    // Create wrapper element
    this.#wrapperElement = document.createElement('div');
    this.#wrapperElement.style.width = '100%';
    this.#wrapperElement.style.height = '100%';
    this.#wrapperElement.style.position = 'relative';

    // Detach any viewer components that might already be mounted elsewhere
    // (e.g., when callers pre-create viewers and insert their DOM nodes).
    // Leaving those nodes in place would create duplicate canvases/SVGs that
    // stack vertically and cause the scrolling artifacts we observed.
    for (const viewer of this.#viewers) {
      this.#detachComponent(viewer);
    }

    // Set initial viewer
    this.#currentViewer = this.#viewers[0];
    this.#registerComponent(this.#currentViewer);
    
    // Setup resize handling - only render the current viewer on resize
    this.#setupResizeHandling();
  }
  
  /**
   * Setup resize handling for the wrapper element.
   * When the wrapper resizes, re-render the current viewer.
   * @private
   */
  #setupResizeHandling() {
    this.#resizeObserver = new ResizeObserver(() => {
      // Only render the current viewer - it will have already updated its canvas size
      // via its own ResizeObserver
      if (this.#currentViewer) {
        this.#currentViewer.render();
      }
    });
    this.#resizeObserver.observe(this.#wrapperElement);
  }

  /**
   * Get the current viewer.
   * @returns {Viewer} The current viewer
   */
  getCurrentViewer() {
    return this.#currentViewer;
  }

  /**
   * Get the number of viewers.
   * @returns {number} Number of viewers
   */
  getNumViewers() {
    return this.#viewers.length;
  }

  /**
   * Get all viewers.
   * @returns {Viewer[]} Clone of the viewers array
   */
  getViewers() {
    return [...this.#viewers];
  }

  /**
   * Get viewer names.
   * @returns {string[]} Clone of the viewer names array
   */
  getViewerNames() {
    return [...this.#viewerNames];
  }

  /**
   * Register a viewer's component for event delegation.
   * @param {Viewer} viewer - The viewer whose component to register
   * @private
   */
  #registerComponent(viewer) {
    if (!viewer.hasViewingComponent()) {
      return;
    }

    const component = viewer.getViewingComponent();
    if (!(component instanceof Element)) {
      logger.warn(`Viewer ${viewer.constructor.name} has viewing component but it's not an Element`);
      return;
    }

    // Create event dispatcher for this element
    const dispatcher = new EventDispatcher(this.#wrapperElement);
    this.#elementDispatchers.set(component, dispatcher);

    // Set up event listeners on the component
    const eventTypes = [
      'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'click', 'dblclick', 'contextmenu',
      'keydown', 'keyup', 'keypress',
      'wheel', 'touchstart', 'touchend', 'touchmove', 'touchcancel'
    ];

    const handler = (event) => {
      dispatcher.handleMouseEvent(event);
    };

    const keyHandler = (event) => {
      dispatcher.handleKeyEvent(event);
    };

    const wheelHandler = (event) => {
      dispatcher.handleWheelEvent(event);
    };

    // Attach listeners
    eventTypes.forEach(type => {
      if (type.startsWith('mouse') || type === 'click' || type === 'dblclick' || type === 'contextmenu') {
        component.addEventListener(type, handler, { passive: false });
      } else if (type.startsWith('key')) {
        component.addEventListener(type, keyHandler, { passive: false });
      } else if (type === 'wheel') {
        component.addEventListener(type, wheelHandler, { passive: false });
      } else {
        // Touch events
        component.addEventListener(type, handler, { passive: false });
      }
    });

    // Record listeners so we can remove them on unregister/dispose.
    this.#elementListenerRecords.set(component, { eventTypes, handler, keyHandler, wheelHandler });

    // Add component to wrapper
    this.#wrapperElement.appendChild(component);
    
    // Set component to fill wrapper
    component.style.width = '100%';
    component.style.height = '100%';
    component.style.display = 'block';

    logger.fine(`Registered component for viewer ${viewer.constructor.name}`);
  }

  /**
   * Detach a viewer's component from its current parent (if any) so that
   * ViewerSwitch has sole ownership of the DOM node.
   * @param {Viewer} viewer
   * @private
   */
  #detachComponent(viewer) {
    if (!viewer || typeof viewer.hasViewingComponent !== 'function') {
      return;
    }
    if (!viewer.hasViewingComponent()) {
      return;
    }

    const component = viewer.getViewingComponent();
    if (!(component instanceof Element)) {
      return;
    }

    const parent = component.parentElement;
    if (parent && parent !== this.#wrapperElement) {
      parent.removeChild(component);
    }
  }

  /**
   * Unregister a viewer's component.
   * @param {Viewer} viewer - The viewer whose component to unregister
   * @private
   */
  #unregisterComponent(viewer) {
    if (!viewer.hasViewingComponent()) {
      return;
    }

    const component = viewer.getViewingComponent();
    if (!(component instanceof Element)) {
      return;
    }

    // Remove event listeners (important to avoid retaining detached DOM).
    const record = this.#elementListenerRecords.get(component);
    if (record) {
      record.eventTypes.forEach(type => {
        if (type.startsWith('mouse') || type === 'click' || type === 'dblclick' || type === 'contextmenu') {
          component.removeEventListener(type, record.handler, { passive: false });
        } else if (type.startsWith('key')) {
          component.removeEventListener(type, record.keyHandler, { passive: false });
        } else if (type === 'wheel') {
          component.removeEventListener(type, record.wheelHandler, { passive: false });
        } else {
          component.removeEventListener(type, record.handler, { passive: false });
        }
      });
      this.#elementListenerRecords.delete(component);
    }

    // Remove dispatcher
    const dispatcher = this.#elementDispatchers.get(component);
    if (dispatcher) {
      this.#elementDispatchers.delete(component);
    }

    // Remove component from wrapper
    if (component.parentElement === this.#wrapperElement) {
      this.#wrapperElement.removeChild(component);
    }

    logger.fine(`Unregistered component for viewer ${viewer.constructor.name}`);
  }

  /**
   * Select a viewer by index.
   * @param {number} index - Index of the viewer to select
   */
  selectViewer(index) {
    if (index < 0 || index >= this.#viewers.length) {
      throw new Error(`Viewer index ${index} out of range [0, ${this.#viewers.length})`);
    }

    const newViewer = this.#viewers[index];
    if (newViewer === this.#currentViewer) {
      return; // Already selected
    }

    logger.info(`Switching from ${this.#currentViewer.constructor.name} to ${newViewer.constructor.name}`);

    // Synchronize state from current viewer to new viewer
    if (this.#currentViewer.getSceneRoot()) {
      newViewer.setSceneRoot(this.#currentViewer.getSceneRoot());
    }
    if (this.#currentViewer.getCameraPath()) {
      newViewer.setCameraPath(this.#currentViewer.getCameraPath());
    }

    // Unregister current component
    this.#unregisterComponent(this.#currentViewer);

    // Register new component
    this.#registerComponent(newViewer);

    // Note: We don't copy component sizes here. All viewers should use CSS-driven
    // sizing (e.g., width: 100%, height: 100%) and rely on ResizeObserver to
    // adjust their buffer sizes when they become visible.

    // Update ToolSystem for all viewers
    const toolSystem = ToolSystem.getToolSystemForViewer(this);
    if (toolSystem) {
      this.setToolSystem(toolSystem);
    }

    this.#currentViewer = newViewer;

    // Render the new viewer to display the scene immediately
    // Use renderAsync if available to avoid blocking
    if (newViewer.canRenderAsync()) {
      newViewer.renderAsync();
    } else {
      newViewer.render();
    }
  }

  /**
   * Select a viewer by name.
   * @param {string} viewerName - Name of the viewer to select
   */
  selectViewerByName(viewerName) {
    const index = this.#viewerNames.indexOf(viewerName);
    if (index === -1) {
      throw new Error(`No viewer found with name "${viewerName}"`);
    }
    this.selectViewer(index);
  }

  // Viewer interface implementation

  getSceneRoot() {
    return this.#currentViewer.getSceneRoot();
  }

  setSceneRoot(root) {
    // Set on all viewers
    for (const viewer of this.#viewers) {
      viewer.setSceneRoot(root);
    }
  }

  getCameraPath() {
    return this.#currentViewer.getCameraPath();
  }

  setCameraPath(cameraPath) {
    // Set on all viewers
    for (const viewer of this.#viewers) {
      viewer.setCameraPath(cameraPath);
    }
  }

  render() {
    this.#currentViewer.render();
  }

  hasViewingComponent() {
    return true; // ViewerSwitch always has a viewing component (the wrapper)
  }

  getViewingComponent() {
    return this.#wrapperElement;
  }

  getViewingComponentSize() {
    if (this.#currentViewer.hasViewingComponent()) {
      return this.#currentViewer.getViewingComponentSize();
    }
    // Fallback to wrapper size
    const rect = this.#wrapperElement.getBoundingClientRect();
    return new Dimension(rect.width, rect.height);
  }

  canRenderAsync() {
    return this.#currentViewer.canRenderAsync();
  }

  renderAsync() {
    if (!this.canRenderAsync()) {
      throw new Error('Current viewer does not support asynchronous rendering');
    }
    this.#currentViewer.renderAsync();
  }

  /**
   * Set the ToolSystem for all viewers and this ViewerSwitch.
   * @param {ToolSystem} toolSystem - The tool system
   */
  setToolSystem(toolSystem) {
    // Set for ViewerSwitch itself
    const existing = ToolSystem.getToolSystemForViewer(this);
    if (existing !== toolSystem) {
      if (existing === undefined) {
        // Only set if not already set (setToolSystemForViewer throws if already set)
        ToolSystem.setToolSystemForViewer(this, toolSystem);
      } else {
        logger.warn('ViewerSwitch already has a tool system, cannot replace it');
      }
    }

    // Set for all individual viewers
    for (const viewer of this.#viewers) {
      const existingForViewer = ToolSystem.getToolSystemForViewer(viewer);
      if (existingForViewer !== toolSystem) {
        if (existingForViewer === undefined) {
          // Only set if not already set
          try {
            ToolSystem.setToolSystemForViewer(viewer, toolSystem);
            logger.fine(`Tool system set for viewer ${viewer.constructor.name}`);
          } catch (error) {
            logger.warn(`Could not set tool system for viewer ${viewer.constructor.name}: ${error.message}`);
          }
        } else {
          logger.fine(`Viewer ${viewer.constructor.name} already has tool system ${existingForViewer}`);
        }
      }
    }
  }

  /**
   * Dispose of all viewers and clean up resources.
   */
  dispose() {
    logger.info('Disposing ViewerSwitch');

    if (this.#resizeObserver) {
      try {
        this.#resizeObserver.disconnect();
      } finally {
        this.#resizeObserver = null;
      }
    }

    // Unregister current component
    if (this.#currentViewer.hasViewingComponent()) {
      this.#unregisterComponent(this.#currentViewer);
    }

    // Dispose all viewers
    for (let i = 0; i < this.#viewers.length; i++) {
      const viewer = this.#viewers[i];
      try {
        if (typeof viewer.dispose === 'function') {
          viewer.dispose();
        } else if (typeof viewer.destroy === 'function') {
          viewer.destroy();
        }
      } catch (error) {
        logger.warn(`Exception when disposing viewer ${this.#viewerNames[i]}: ${error.message}`);
      }
    }

    // Clear dispatchers
    this.#elementDispatchers.clear();
    this.#elementListenerRecords.clear();

    // Clear wrapper element
    if (this.#wrapperElement.parentElement) {
      this.#wrapperElement.parentElement.removeChild(this.#wrapperElement);
    }
  }
}

