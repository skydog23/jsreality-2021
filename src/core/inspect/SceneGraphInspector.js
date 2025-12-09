/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Scene Graph Inspector - Interactive UI for exploring and editing scene graphs
// Provides a tree view and property panel for SceneGraphComponent hierarchies

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { UIManager } from './UIManager.js';
import { TreeViewManager, ShaderTreeNode } from './TreeViewManager.js';
import { PropertyPanelManager } from './PropertyPanelManager.js';
import { ShaderPropertyManager } from './ShaderPropertyManager.js';
import { WidgetFactory } from './WidgetFactory.js';
import { SceneGraphTreeModel } from './SceneGraphTreeModel.js';
import { CompositeTreeModel } from './CompositeTreeModel.js';
import { getLogger, Category } from '../util/LoggingSystem.js';

const logger = getLogger('SceneGraphInspector');

/**
 * Interactive inspector for exploring and editing scene graph structures
 */
export class SceneGraphInspector {
  /**
   * @type {SceneGraphComponent|null}
   */
  #root = null;

  /**
   * @type {HTMLElement|null}
   */
  #container = null;

  /**
   * @type {UIManager}
   */
  #uiManager;

  /**
   * @type {TreeViewManager}
   */
  #treeViewManager;

  /**
   * @type {PropertyPanelManager}
   */
  #propertyPanelManager;

  /**
   * @type {ShaderPropertyManager}
   */
  #shaderPropertyManager;

  /**
   * @type {WidgetFactory}
   */
  #widgetFactory;

  /**
   * @type {number|null} Pending refresh timeout ID for debouncing
   */
  #refreshTimeoutId = null;

  /**
   * @type {boolean} Whether a refresh is currently pending
   */
  #refreshPending = false;

  /**
   * @type {Logger} Logger instance for this inspector
   */
  // Using module-level logger declared above

  /**
   * @type {Function|null} Callback to trigger render when properties change
   */
  #renderCallback = null;

  /**
   * @type {SceneGraphTreeModel}
   */
  #sceneTreeModel;

  /**
   * @type {CompositeTreeModel}
   */
  #compositeTreeModel;

  /**
   * @type {Array}
   */
  #apps = [];

  /**
   * Create a new SceneGraphInspector
   * @param {HTMLElement} container - The container element for the inspector
   * @param {SceneGraphComponent} root - The root scene graph component
   * @param {Object} [options] - Configuration options
   * @param {Function} [options.onRender] - Callback to trigger render when properties change
   */
  constructor(container, root = null, options = {}) {
    this.#container = container;
    this.#renderCallback = options.onRender || null;
    
    // Initialize managers
    this.#uiManager = new UIManager(container);
    const { treeView, propertyPanel } = this.#uiManager.initializeUI();
    
    this.#widgetFactory = new WidgetFactory();
    
    // Create callbacks for property changes
    const onPropertyChange = () => {
      // Use the render callback if provided, otherwise fall back to global (deprecated)
      if (this.#renderCallback) {
        this.#renderCallback();
      } else if (typeof window !== 'undefined' && window._viewerInstance) {
        // DEPRECATED: This fallback will be removed in a future version.
        // Use options.onRender callback instead.
        window._viewerInstance.render();
      }
    };
    
    const onRefreshPropertyPanel = (node) => {
      this.#propertyPanelManager.updatePropertyPanel(node);
    };
    
    this.#shaderPropertyManager = new ShaderPropertyManager(
      this.#widgetFactory,
      onPropertyChange,
      onRefreshPropertyPanel
    );
    
    this.#propertyPanelManager = new PropertyPanelManager(
      propertyPanel,
      this.#shaderPropertyManager,
      onPropertyChange,
      onRefreshPropertyPanel
    );
    
    // Create tree view manager with callbacks
    const onNodeSelect = (node) => {
      this.#treeViewManager.setSelectedNode(node);
      this.refreshImmediate();
      this.#propertyPanelManager.updatePropertyPanel(node);
    };
    
    const onNodeToggleExpand = () => {
      this.refreshImmediate();
    };
    
    const createShaderTreeNodes = (appearance, isRootAppearance = false) => {
      return this.#shaderPropertyManager.createShaderTreeNodes(appearance, isRootAppearance);
    };
    
    this.#treeViewManager = new TreeViewManager(
      treeView,
      onNodeSelect,
      onNodeToggleExpand,
      createShaderTreeNodes
    );
    
    // Create scene graph tree model
    this.#sceneTreeModel = new SceneGraphTreeModel(createShaderTreeNodes, root);
    this.#compositeTreeModel = new CompositeTreeModel(this.#sceneTreeModel, []);
    
    if (root) {
      this.setRoot(root);
    }
  }

  /**
   * Get the root scene graph component
   * @returns {SceneGraphComponent|null} The root component
   */
  getRoot() {
    return this.#root;
  }

  /**
   * Set the root scene graph component
   * @param {SceneGraphComponent} root - The root component
   */
  setRoot(root) {
    this.#root = root;
    this.#treeViewManager.setSelectedNode(null);
    this.#treeViewManager.clearNodeElements();
    this.#treeViewManager.clearExpandedNodes();
    // Auto-expand the root node for convenience
    if (root) {
      this.#treeViewManager.expandNode(root);
    }
    this.#rebuildTree();
  }

  /**
   * Rebuild the entire tree view
   * @private
   */
  #rebuildTree() {
    this.#treeViewManager.rebuildTree(this.#root);
  }

  /**
   * Refresh the inspector (rebuild tree and property panel)
   * Uses debouncing to prevent excessive rebuilds during animations
   */
  refresh() {
    // Clear any pending refresh
    if (this.#refreshTimeoutId !== null) {
      clearTimeout(this.#refreshTimeoutId);
      this.#refreshTimeoutId = null;
    }

    // If a refresh is already pending, just mark it as needed again
    if (this.#refreshPending) {
      return;
    }

    // Debounce rapid refresh calls (e.g., during animation)
    // This prevents constant DOM rebuilds that interfere with click handling
    this.#refreshPending = true;
    this.#refreshTimeoutId = setTimeout(() => {
      this.#refreshPending = false;
      this.#refreshTimeoutId = null;
      this.#rebuildTree();
      const selectedNode = this.#treeViewManager.getSelectedNode();
      if (selectedNode) {
        this.#propertyPanelManager.updatePropertyPanel(selectedNode);
      }
    }, 16); // ~60fps, syncs with requestAnimationFrame
  }

  /**
   * Force an immediate refresh (bypasses debouncing)
   * Use this when you need an immediate update, e.g., after user interaction
   */
  refreshImmediate() {
    // Clear any pending refresh
    if (this.#refreshTimeoutId !== null) {
      clearTimeout(this.#refreshTimeoutId);
      this.#refreshTimeoutId = null;
    }
    this.#refreshPending = false;
    this.#rebuildTree();
    const selectedNode = this.#treeViewManager.getSelectedNode();
    if (selectedNode) {
      this.#propertyPanelManager.updatePropertyPanel(selectedNode);
    }
  }
}

// Export ShaderTreeNode for use by other modules
export { ShaderTreeNode };
