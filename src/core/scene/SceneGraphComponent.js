// JavaScript port of jReality's SceneGraphComponent class (from SceneGraphComponent.java)
// Simplified for JavaScript environment with modern event system

import { SceneGraphNode } from './SceneGraphNode.js';

/** @typedef {import('./SceneGraphVisitor.js').SceneGraphVisitor} SceneGraphVisitor */
/** @typedef {import('./Transformation.js').Transformation} Transformation */
/** @typedef {import('./Appearance.js').Appearance} Appearance */
/** @typedef {import('./Camera.js').Camera} Camera */
/** @typedef {import('./Geometry.js').Geometry} Geometry */

/**
 * Exception thrown when a scene graph loop is detected
 */
export class SceneGraphLoopException extends Error {
  constructor() {
    super('Scene graph loop detected');
    this.name = 'SceneGraphLoopException';
  }
}

/**
 * Event types for SceneGraphComponent events
 */
export const SceneGraphComponentEventType = {
  CHILD_ADDED: 'childAdded',
  CHILD_REMOVED: 'childRemoved', 
  CHILD_REPLACED: 'childReplaced',
  VISIBILITY_CHANGED: 'visibilityChanged',
  PICKABILITY_CHANGED: 'pickabilityChanged'
};

/**
 * Child types for SceneGraphComponent events
 */
export const SceneGraphComponentChildType = {
  COMPONENT: 'component',
  TRANSFORMATION: 'transformation',
  APPEARANCE: 'appearance',
  CAMERA: 'camera',
  LIGHT: 'light',
  GEOMETRY: 'geometry',
  AUDIONODE: 'audionode'
};

/**
 * Event fired when SceneGraphComponent changes
 */
export class SceneGraphComponentEvent extends Event {
  /**
   * @param {SceneGraphComponent} source - The component that changed
   * @param {string} eventType - Type of event
   * @param {string} childType - Type of child that changed
   * @param {*} oldChild - The old child (for removed/replaced)
   * @param {*} newChild - The new child (for added/replaced)
   * @param {number} [index] - Index of the child
   */
  constructor(source, eventType, childType, oldChild = null, newChild = null, index = -1) {
    super(eventType);
    this.source = source;
    this.childType = childType;
    this.oldChild = oldChild;
    this.newChild = newChild;
    this.index = index;
  }
}

/**
 * This basic building block of the jReality scene graph. It's the
 * only node that can have another SceneGraphComponent instance as a
 * child.
 * 
 * A SceneGraphComponent can contain other instances of SceneGraphNode:
 * Appearance, Transformation, Geometry, Light, Camera, and AudioSource.
 * It also has a list of Tool instances, which may be empty.
 */
export class SceneGraphComponent extends SceneGraphNode {
  
  /**
   * @type {Transformation|null}
   */
  #transformation = null;
  
  /**
   * @type {Appearance|null}
   */
  #appearance = null;
  
  /**
   * @type {Camera|null}
   */
  #camera = null;
  
  /**
   * @type {*|null} Light (will be defined later)
   */
  #light = null;
  
  /**
   * @type {Geometry|null}
   */
  #geometry = null;
  
  /**
   * @type {*|null} AudioSource (will be defined later)
   */
  #audioSource = null;
  
  /**
   * @type {boolean}
   */
  #visible = true;
  
  /**
   * @type {boolean}
   */
  #pickable = true;
  
  /**
   * @type {SceneGraphComponent[]}
   */
  #children = [];
  
  /**
   * @type {*[]} Tools (will be defined later)
   */
  #tools = [];

  /**
   * @type {number} Counter for unnamed components
   */
  static #UNNAMED_ID = 0;

  /**
   * Create a new SceneGraphComponent
   * @param {string} [name] - Name for the component
   */
  constructor(name) {
    super(name || `sgc ${SceneGraphComponent.#UNNAMED_ID++}`);
  }

  /**
   * Get all child nodes (non-component children)
   * @returns {SceneGraphNode[]}
   */
  getChildNodes() {
    this.startReader();
    try {
      const list = [];
      if (this.#transformation) list.push(this.#transformation);
      if (this.#appearance) list.push(this.#appearance);
      if (this.#camera) list.push(this.#camera);
      if (this.#light) list.push(this.#light);
      if (this.#geometry) list.push(this.#geometry);
      if (this.#audioSource) list.push(this.#audioSource);
      list.push(...this.#children);
      return list;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Add a child component
   * @param {SceneGraphComponent} sgc - The component to add
   */
  addChild(sgc) {
    this.checkReadOnly();
    if (sgc === this) {
      throw new SceneGraphLoopException();
    }
    
    this.startWriter();
    try {
      // Check for loops by traversing the new child's tree
      this.#checkForLoop(sgc);
      
      const index = this.#children.length;
      this.#children.push(sgc);
      this.#fireSceneGraphElementAdded(sgc, SceneGraphComponentChildType.COMPONENT, index);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Add multiple children at once
   * @param {...SceneGraphComponent} sgcList - Components to add
   */
  addChildren(...sgcList) {
    this.startWriter();
    try {
      for (const sgc of sgcList) {
        this.addChild(sgc);
      }
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get a child component by index
   * @param {number} index - The index
   * @returns {SceneGraphComponent}
   */
  getChildComponent(index) {
    this.startReader();
    try {
      return this.#children[index];
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get all child components (read-only)
   * @returns {SceneGraphComponent[]}
   */
  getChildComponents() {
    this.startReader();
    try {
      return [...this.#children]; // Return defensive copy
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get the number of child components
   * @returns {number}
   */
  getChildComponentCount() {
    this.startReader();
    try {
      return this.#children.length;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Remove a child component
   * @param {SceneGraphComponent} sgc - The component to remove
   * @returns {boolean} True if removed, false if not found
   */
  removeChild(sgc) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const index = this.#children.indexOf(sgc);
      if (index === -1) {
        return false;
      }
      this.#children.splice(index, 1);
      this.#fireSceneGraphElementRemoved(sgc, SceneGraphComponentChildType.COMPONENT, index);
      return true;
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Remove multiple children
   * @param {...SceneGraphComponent} sgcList - Components to remove
   */
  removeChildren(...sgcList) {
    this.startWriter();
    try {
      for (const sgc of sgcList) {
        this.removeChild(sgc);
      }
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Remove all children
   */
  removeAllChildren() {
    this.checkReadOnly();
    while (this.getChildComponentCount() > 0) {
      const child = this.getChildComponent(0);
      this.removeChild(child);
    }
  }

  /**
   * Set the appearance
   * @param {Appearance|null} newApp - The new appearance
   */
  setAppearance(newApp) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const old = this.#appearance;
      this.#appearance = newApp;
      this.#fireSceneGraphElementSet(old, newApp, SceneGraphComponentChildType.APPEARANCE);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get the appearance
   * @returns {Appearance|null}
   */
  getAppearance() {
    this.startReader();
    try {
      return this.#appearance;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set the camera
   * @param {Camera|null} newCamera - The new camera
   */
  setCamera(newCamera) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const old = this.#camera;
      this.#camera = newCamera;
      this.#fireSceneGraphElementSet(old, newCamera, SceneGraphComponentChildType.CAMERA);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get the camera
   * @returns {Camera|null}
   */
  getCamera() {
    this.startReader();
    try {
      return this.#camera;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set the geometry
   * @param {Geometry|null} g - The new geometry
   */
  setGeometry(g) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const old = this.#geometry;
      this.#geometry = g;
      this.#fireSceneGraphElementSet(old, g, SceneGraphComponentChildType.GEOMETRY);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get the geometry
   * @returns {Geometry|null}
   */
  getGeometry() {
    this.startReader();
    try {
      return this.#geometry;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set the transformation
   * @param {Transformation|null} newTrans - The new transformation
   */
  setTransformation(newTrans) {
    this.checkReadOnly();
    this.startWriter();
    try {
      const old = this.#transformation;
      this.#transformation = newTrans;
      this.#fireSceneGraphElementSet(old, newTrans, SceneGraphComponentChildType.TRANSFORMATION);
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get the transformation
   * @returns {Transformation|null}
   */
  getTransformation() {
    this.startReader();
    try {
      return this.#transformation;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Check if this component is a direct ancestor of the given child
   * @param {SceneGraphNode} child - The potential child
   * @returns {boolean}
   */
  isDirectAncestor(child) {
    this.startReader();
    try {
      return this.#transformation === child ||
             this.#appearance === child ||
             this.#camera === child ||
             this.#light === child ||
             this.#geometry === child ||
             this.#children.includes(child);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Get visibility flag
   * @returns {boolean}
   */
  isVisible() {
    this.startReader();
    try {
      return this.#visible;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set visibility flag
   * @param {boolean} newVisibleState - The new visibility state
   */
  setVisible(newVisibleState) {
    this.checkReadOnly();
    this.startWriter();
    try {
      if (this.#visible !== newVisibleState) {
        this.#visible = newVisibleState;
        this.#fireVisibilityChanged();
      }
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Get pickable flag
   * @returns {boolean}
   */
  isPickable() {
    this.startReader();
    try {
      return this.#pickable;
    } finally {
      this.finishReader();
    }
  }

  /**
   * Set pickable flag
   * @param {boolean} newPickableState - The new pickable state
   */
  setPickable(newPickableState) {
    this.checkReadOnly();
    this.startWriter();
    try {
      if (this.#pickable !== newPickableState) {
        this.#pickable = newPickableState;
        this.#firePickabilityChanged();
      }
    } finally {
      this.finishWriter();
    }
  }

  /**
   * Accept a visitor
   * @param {SceneGraphVisitor} visitor - The visitor
   */
  accept(visitor) {
    this.startReader();
    try {
      visitor.visitComponent?.(this) || visitor.visit(this);
    } finally {
      this.finishReader();
    }
  }

  /**
   * Have all children accept a visitor
   * @param {SceneGraphVisitor} visitor - The visitor
   */
  childrenAccept(visitor) {
    this.startReader();
    try {
      if (this.#transformation) this.#transformation.accept(visitor);
      if (this.#appearance) this.#appearance.accept(visitor);
      if (this.#camera) this.#camera.accept(visitor);
      if (this.#light) this.#light.accept(visitor);
      if (this.#geometry) this.#geometry.accept(visitor);
      if (this.#audioSource) this.#audioSource.accept(visitor);
      for (const child of this.#children) {
        child.accept(visitor);
      }
    } finally {
      this.finishReader();
    }
  }

  /**
   * Add a scene graph component listener
   * @param {function(SceneGraphComponentEvent): void} listener - The listener
   */
  addSceneGraphComponentListener(listener) {
    this.startReader();
    this.addEventListener('childAdded', listener);
    this.addEventListener('childRemoved', listener);
    this.addEventListener('childReplaced', listener);
    this.addEventListener('visibilityChanged', listener);
    this.addEventListener('pickabilityChanged', listener);
    this.finishReader();
  }

  /**
   * Remove a scene graph component listener
   * @param {function(SceneGraphComponentEvent): void} listener - The listener
   */
  removeSceneGraphComponentListener(listener) {
    this.startReader();
    this.removeEventListener('childAdded', listener);
    this.removeEventListener('childRemoved', listener);
    this.removeEventListener('childReplaced', listener);
    this.removeEventListener('visibilityChanged', listener);
    this.removeEventListener('pickabilityChanged', listener);
    this.finishReader();
  }

  /**
   * Check for loops in the scene graph
   * @param {SceneGraphComponent} sgc - Component to check
   * @private
   */
  #checkForLoop(sgc) {
    const visited = new Set();
    
    const checkRecursive = (component) => {
      if (component === this) {
        throw new SceneGraphLoopException();
      }
      if (visited.has(component)) {
        return; // Already checked this subtree
      }
      visited.add(component);
      
      // Only check children if this is a SceneGraphComponent
      if (component instanceof SceneGraphComponent) {
        for (const child of component.getChildComponents()) {
          checkRecursive(child);
        }
      }
    };
    
    checkRecursive(sgc);
  }

  /**
   * Fire element added event
   * @param {*} child - The added child
   * @param {string} type - Child type
   * @param {number} index - Index
   * @private
   */
  #fireSceneGraphElementAdded(child, type, index) {
    const event = new SceneGraphComponentEvent(
      this, SceneGraphComponentEventType.CHILD_ADDED, type, null, child, index
    );
    this.dispatchEvent(event);
  }

  /**
   * Fire element removed event
   * @param {*} child - The removed child
   * @param {string} type - Child type  
   * @param {number} index - Index
   * @private
   */
  #fireSceneGraphElementRemoved(child, type, index) {
    const event = new SceneGraphComponentEvent(
      this, SceneGraphComponentEventType.CHILD_REMOVED, type, child, null, index
    );
    this.dispatchEvent(event);
  }

  /**
   * Fire element replaced event
   * @param {*} oldChild - The old child
   * @param {*} newChild - The new child
   * @param {string} type - Child type
   * @private
   */
  #fireSceneGraphElementReplaced(oldChild, newChild, type) {
    const event = new SceneGraphComponentEvent(
      this, SceneGraphComponentEventType.CHILD_REPLACED, type, oldChild, newChild, 0
    );
    this.dispatchEvent(event);
  }

  /**
   * Fire element set event (handles add/remove/replace logic)
   * @param {*} oldChild - The old child
   * @param {*} newChild - The new child
   * @param {string} type - Child type
   * @private
   */
  #fireSceneGraphElementSet(oldChild, newChild, type) {
    if (oldChild === newChild) return;
    
    if (oldChild === null) {
      this.#fireSceneGraphElementAdded(newChild, type, 0);
    } else if (newChild === null) {
      this.#fireSceneGraphElementRemoved(oldChild, type, 0);
    } else {
      this.#fireSceneGraphElementReplaced(oldChild, newChild, type);
    }
  }

  /**
   * Fire visibility changed event
   * @private
   */
  #fireVisibilityChanged() {
    const event = new SceneGraphComponentEvent(
      this, SceneGraphComponentEventType.VISIBILITY_CHANGED, '', null, null
    );
    this.dispatchEvent(event);
  }

  /**
   * Fire pickability changed event
   * @private
   */
  #firePickabilityChanged() {
    const event = new SceneGraphComponentEvent(
      this, SceneGraphComponentEventType.PICKABILITY_CHANGED, '', null, null
    );
    this.dispatchEvent(event);
  }
}
