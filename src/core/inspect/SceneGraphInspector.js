// Scene Graph Inspector - Interactive UI for exploring and editing scene graphs
// Provides a tree view and property panel for SceneGraphComponent hierarchies

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { UIManager } from './UIManager.js';
import { TreeViewManager, ShaderTreeNode } from './TreeViewManager.js';
import { PropertyPanelManager } from './PropertyPanelManager.js';
import { ShaderPropertyManager } from './ShaderPropertyManager.js';
import { WidgetFactory } from './WidgetFactory.js';
import { getLogger, Category } from '../util/LoggingSystem.js';

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
  #logger = getLogger('SceneGraphInspector');

  /**
   * Create a new SceneGraphInspector
   * @param {HTMLElement} container - The container element for the inspector
   * @param {SceneGraphComponent} root - The root scene graph component
   */
  constructor(container, root = null) {
    this.#container = container;
    
    // Initialize managers
    this.#uiManager = new UIManager(container);
    const { treeView, propertyPanel } = this.#uiManager.initializeUI();
    
    this.#widgetFactory = new WidgetFactory();
    
    // Create callbacks for property changes
    const onPropertyChange = () => {
      // Trigger viewer render if available
      if (typeof window !== 'undefined' && window._viewerInstance) {
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
      this.#widgetFactory,
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
    
    const createShaderTreeNodes = (appearance) => {
      return this.#shaderPropertyManager.createShaderTreeNodes(appearance);
    };
    
    this.#treeViewManager = new TreeViewManager(
      treeView,
      onNodeSelect,
      onNodeToggleExpand,
      createShaderTreeNodes
    );
    
    if (root) {
      this.setRoot(root);
    }
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
