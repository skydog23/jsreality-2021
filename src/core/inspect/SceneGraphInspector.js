// Scene Graph Inspector - Interactive UI for exploring and editing scene graphs
// Provides a tree view and property panel for SceneGraphComponent hierarchies

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { SceneGraphPath } from '../scene/SceneGraphPath.js';
import { Transformation } from '../scene/Transformation.js';
import { Appearance, INHERITED } from '../scene/Appearance.js';
import { Geometry } from '../scene/Geometry.js';
import { Camera } from '../scene/Camera.js';
import { Color } from '../util/Color.js';
import { FactoredMatrix } from '../math/FactoredMatrix.js';
import * as Pn from '../math/Pn.js';
import { ColorPickerWidget, VectorWidget, NumberWidget } from './widgets/index.js';
import { EffectiveAppearance } from '../shader/EffectiveAppearance.js';
import { DefaultGeometryShader, DefaultPointShader, DefaultLineShader, DefaultPolygonShader } from '../shader/index.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';

/**
 * Wrapper class for shader nodes in the tree view
 * Allows shaders to be displayed as tree nodes with their own properties
 */
class ShaderTreeNode {
  /**
   * @param {string} name - Display name (e.g., "Geometry Shader", "Point Shader")
   * @param {string} type - Shader type (e.g., "geometry", "point", "line", "polygon")
   * @param {*} shaderInstance - The shader instance (DefaultGeometryShader or sub-shader instance)
   * @param {Object} schema - The shader schema (DefaultGeometryShader, DefaultPointShader, etc.)
   * @param {Appearance} appearance - The parent appearance
   * @param {string} prefix - Attribute prefix for this shader (e.g., "point", "line", "polygon")
   */
  constructor(name, type, shaderInstance, schema, appearance, prefix) {
    this.name = name;
    this.type = type;
    this.shaderInstance = shaderInstance;
    this.schema = schema;
    this.appearance = appearance;
    this.prefix = prefix;
    this.children = [];
  }
  
  getName() {
    return this.name;
  }
  
  getChildren() {
    return this.children;
  }
  
  addChild(child) {
    this.children.push(child);
  }
  
  /**
   * Update the shader instance (used when attributes change)
   * @param {*} newShaderInstance - Updated shader instance
   */
  updateShaderInstance(newShaderInstance) {
    this.shaderInstance = newShaderInstance;
  }
}

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
   * @type {HTMLElement|null}
   */
  #treeView = null;

  /**
   * @type {HTMLElement|null}
   */
  #propertyPanel = null;

  /**
   * @type {*|null} Currently selected node
   */
  #selectedNode = null;

  /**
   * @type {Map<*, HTMLElement>} Map from nodes to tree elements
   */
  #nodeElements = new Map();

  /**
   * @type {Set<*>} Expanded nodes
   */
  #expandedNodes = new Set();

  /**
   * @type {Map<Appearance, ShaderTreeNode>} Cache of shader tree nodes by appearance
   */
  #shaderNodeCache = new Map();

  /**
   * @type {number|null} Pending refresh timeout ID for debouncing
   */
  #refreshTimeoutId = null;

  /**
   * @type {boolean} Whether a refresh is currently pending
   */
  #refreshPending = false;

  /**
   * Create a new SceneGraphInspector
   * @param {HTMLElement} container - The container element for the inspector
   * @param {SceneGraphComponent} root - The root scene graph component
   */
  constructor(container, root = null) {
    this.#container = container;
    this.#initializeUI();
    if (root) {
      this.setRoot(root);
    }
  }

  /**
   * Initialize the inspector UI
   * @private
   */
  #initializeUI() {
    // Clear container
    this.#container.innerHTML = '';
    
    // Add styles
    this.#injectStyles();
    
    // Create main layout (vertical split)
    const inspectorDiv = document.createElement('div');
    inspectorDiv.className = 'sg-inspector';
    
    // Create tree view panel
    const treePanel = document.createElement('div');
    treePanel.className = 'sg-tree-panel';
    
    const treeHeader = document.createElement('div');
    treeHeader.className = 'sg-panel-header';
    treeHeader.textContent = 'Scene Graph';
    
    this.#treeView = document.createElement('div');
    this.#treeView.className = 'sg-tree-view';
    
    treePanel.appendChild(treeHeader);
    treePanel.appendChild(this.#treeView);
    
    // Create resizable divider
    const divider = document.createElement('div');
    divider.className = 'sg-divider';
    
    // Create property panel (no header)
    const propPanel = document.createElement('div');
    propPanel.className = 'sg-property-panel';
    
    this.#propertyPanel = document.createElement('div');
    this.#propertyPanel.className = 'sg-properties';
    this.#propertyPanel.innerHTML = '<div class="sg-no-selection">Select a node to view properties</div>';
    
    propPanel.appendChild(this.#propertyPanel);
    
    // Add panels to inspector
    inspectorDiv.appendChild(treePanel);
    inspectorDiv.appendChild(divider);
    inspectorDiv.appendChild(propPanel);
    
    // Add to container
    this.#container.appendChild(inspectorDiv);
    
    // Setup resizable divider
    this.#setupDivider(divider, treePanel, propPanel);
  }

  /**
   * Setup the resizable divider
   * @param {HTMLElement} divider
   * @param {HTMLElement} topPanel
   * @param {HTMLElement} bottomPanel
   * @private
   */
  #setupDivider(divider, topPanel, bottomPanel) {
    let isDragging = false;
    let startY = 0;
    let startTopHeight = 0;

    divider.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startTopHeight = topPanel.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const delta = e.clientY - startY;
      const containerHeight = this.#container.offsetHeight;
      const newTopHeight = startTopHeight + delta;
      const minHeight = 100; // Minimum panel height
      
      if (newTopHeight > minHeight && (containerHeight - newTopHeight) > minHeight) {
        const percentage = (newTopHeight / containerHeight) * 100;
        topPanel.style.flex = `0 0 ${percentage}%`;
        bottomPanel.style.flex = '1';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  /**
   * Inject CSS styles
   * @private
   */
  #injectStyles() {
    if (document.getElementById('sg-inspector-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'sg-inspector-styles';
    style.textContent = `
      .sg-inspector {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        background: #1e1e1e;
        color: #cccccc;
        pointer-events: auto;
      }
      
      .sg-tree-panel {
        flex: 0 0 50%;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .sg-divider {
        height: 4px;
        background: #3e3e3e;
        cursor: ns-resize;
        flex-shrink: 0;
      }
      
      .sg-divider:hover {
        background: #007acc;
      }
      
      .sg-property-panel {
        flex: 1;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .sg-panel-header {
        padding: 8px 12px;
        background: #2d2d2d;
        border-bottom: 1px solid #3e3e3e;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .sg-tree-view {
        flex: 1;
        overflow-y: auto;
        padding: 4px;
        pointer-events: auto;
      }
      
      .sg-tree-node {
        user-select: none;
        cursor: pointer;
        pointer-events: auto;
      }
      
      .sg-tree-node-header {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 3px;
        transition: background 0.1s;
        pointer-events: auto;
        position: relative;
        z-index: 1;
      }
      
      .sg-tree-node-header:hover {
        background: #2d2d2d;
      }
      
      .sg-tree-node-header.selected {
        background: #094771;
      }
      
      .sg-tree-expand {
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-right: 4px;
        font-size: 10px;
      }
      
      .sg-tree-expand.empty {
        visibility: hidden;
      }
      
      .sg-tree-icon {
        width: 16px;
        height: 16px;
        margin-right: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      .sg-tree-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .sg-tree-type {
        font-size: 10px;
        color: #858585;
        margin-left: 8px;
      }
      
      .sg-tree-children {
        margin-left: 20px;
      }
      
      .sg-tree-children.collapsed {
        display: none;
      }
      
      .sg-properties {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }
      
      .sg-no-selection {
        color: #858585;
        text-align: center;
        padding: 40px 20px;
        font-style: italic;
      }
      
      .sg-prop-group {
        margin-bottom: 16px;
      }
      
      .sg-prop-group-title {
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        color: #858585;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
      }
      
      .sg-prop-row {
        display: flex;
        padding: 6px 8px;
        border-radius: 3px;
        margin-bottom: 2px;
      }
      
      .sg-prop-row:hover {
        background: #2d2d2d;
      }
      
      .sg-prop-label {
        flex: 0 0 120px;
        color: #9cdcfe;
        font-size: 12px;
      }
      
      .sg-prop-value {
        flex: 1;
        color: #ce9178;
        font-size: 12px;
        word-break: break-word;
      }
      
      .sg-prop-value input[type="text"]:not(.sg-number-widget-input),
      .sg-prop-value input[type="number"]:not(.sg-number-widget-input) {
        width: 100%;
        background: #3c3c3c;
        border: 1px solid #555;
        color: #cccccc;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
      }
      
      .sg-prop-value input[type="checkbox"] {
        margin: 0;
      }
      
      .sg-matrix-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 11px;
      }
      
      .sg-matrix-cell {
        background: #2d2d2d;
        padding: 4px;
        border-radius: 2px;
        text-align: right;
      }
      
      .sg-button {
        background: #0e639c;
        color: white;
        border: none;
        padding: 4px 12px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        margin-top: 4px;
      }
      
      .sg-button:hover {
        background: #1177bb;
      }
      
      /* Color picker styles - horizontal layout with alpha button */
      .sg-color-picker-container-horizontal {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        position: relative;
      }
      
      .sg-color-picker-container-horizontal > .sg-color-input {
        width: 36px;
        height: 18px;
      }
      
      /* Color picker styles - simple (no alpha) */
      .sg-color-picker-container-simple {
        display: flex;
        width: 100%;
      }
      
      .sg-color-input {
        width: 100%;
        height: 18px;
        border: 1px solid #555;
        border-radius: 3px;
        background: #3c3c3c;
        cursor: pointer;
        padding: 0;
      }
      
      .sg-color-input:hover {
        border-color: #666;
      }
      
      .sg-color-input::-webkit-color-swatch-wrapper {
        padding: 2px;
      }
      
      .sg-color-input::-webkit-color-swatch {
        border: none;
        border-radius: 2px;
      }
      
      /* Alpha button with tooltip-style popup */
      .sg-alpha-button {
        width: 20px;
        height: 18px;
        padding: 0;
        background: #3c3c3c;
        border: 1px solid #555;
        border-radius: 3px;
        color: #9cdcfe;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        position: relative;
      }
      
      .sg-alpha-button:hover {
        background: #4a4a4a;
        border-color: #666;
      }
      
      .sg-alpha-button.active {
        background: #007acc;
        border-color: #007acc;
        color: #ffffff;
      }
      
      /* Alpha slider popup - tooltip style */
      .sg-alpha-slider-popup {
        display: none;
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 2px;
        padding: 8px 10px;
        background: #2a2a2a;
        border: 1px solid #666;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        white-space: nowrap;
        align-items: center;
        gap: 8px;
        min-width: 150px;
      }
      
      /* Invisible bridge to keep popup visible while moving cursor */
      .sg-alpha-slider-popup::before {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        height: 8px;
      }
      
      /* Show popup on hover */
      .sg-alpha-button:hover + .sg-alpha-slider-popup,
      .sg-alpha-slider-popup:hover {
        display: flex;
      }
      
      /* Tooltip arrow - visual only */
      .sg-alpha-slider-popup::after {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 5px solid #2a2a2a;
        margin-bottom: -1px;
      }
      
      .sg-alpha-slider {
        flex: 1;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: linear-gradient(to right, transparent 0%, #cccccc 100%);
        border-radius: 2px;
        outline: none;
      }
      
      .sg-alpha-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #007acc;
        cursor: pointer;
        border: 2px solid #ffffff;
      }
      
      .sg-alpha-slider::-webkit-slider-thumb:hover {
        background: #1177bb;
      }
      
      .sg-alpha-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #007acc;
        cursor: pointer;
        border: 2px solid #ffffff;
      }
      
      .sg-alpha-slider::-moz-range-thumb:hover {
        background: #1177bb;
      }
      
      .sg-alpha-value {
        color: #ce9178;
        font-size: 11px;
        font-family: 'Monaco', 'Courier New', monospace;
        flex-shrink: 0;
        width: 30px;
        text-align: right;
      }
      
      /* NumberWidget and VectorWidget styles are now self-injected by the widgets */
      
      /* Number and text input styles */
      .sg-number-input,
      .sg-text-input {
        width: 100%;
        background: #3c3c3c;
        border: 1px solid #555;
        color: #cccccc;
        padding: 4px 6px;
        border-radius: 3px;
        font-size: 12px;
        font-family: inherit;
      }
      
      .sg-number-input:focus,
      .sg-text-input:focus {
        outline: none;
        border-color: #007acc;
        background: #404040;
      }
      
      .sg-number-input:hover,
      .sg-text-input:hover {
        border-color: #666;
      }
      
      /* Inherited button styles */
      .sg-inherited-button {
        background: #5a5a5a;
        color: #cccccc;
        border: 1px solid #666;
        padding: 2px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        margin-left: 6px;
        white-space: nowrap;
      }
      
      .sg-inherited-button:hover {
        background: #6a6a6a;
        border-color: #777;
      }
      
      .sg-inherited-button.explicit {
        background: #0e639c;
        border-color: #0e639c;
      }
      
      .sg-inherited-button.explicit:hover {
        background: #1177bb;
      }
      
      /* Shader hierarchy styles */
      .sg-shader-node {
        margin-bottom: 12px;
      }
      
      .sg-shader-header {
        display: flex;
        align-items: center;
        padding: 6px 8px;
        background: #2d2d2d;
        border-radius: 4px 4px 0 0;
        border: 1px solid #3e3e3e;
        cursor: pointer;
        user-select: none;
      }
      
      .sg-shader-header:hover {
        background: #333;
      }
      
      .sg-shader-expand {
        width: 16px;
        font-size: 10px;
        margin-right: 6px;
      }
      
      .sg-shader-icon {
        margin-right: 6px;
      }
      
      .sg-shader-name {
        flex: 1;
        font-weight: 600;
        color: #4ec9b0;
      }
      
      .sg-shader-attributes {
        border: 1px solid #3e3e3e;
        border-top: none;
        border-radius: 0 0 4px 4px;
        padding: 8px;
        background: #252525;
      }
      
      .sg-shader-attributes.collapsed {
        display: none;
      }
      
      .sg-shader-attr-row {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        margin-bottom: 2px;
        border-radius: 3px;
      }
      
      .sg-shader-attr-row:hover {
        background: #2d2d2d;
      }
      
      .sg-shader-attr-label {
        flex: 0 0 140px;
        color: #9cdcfe;
        font-size: 12px;
      }
      
      .sg-shader-attr-value {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Set the root scene graph component
   * @param {SceneGraphComponent} root - The root component
   */
  setRoot(root) {
    this.#root = root;
    this.#selectedNode = null;
    this.#nodeElements.clear();
    // Auto-expand the root node for convenience
    if (root) {
      this.#expandedNodes.add(root);
    }
    this.#rebuildTree();
  }

  /**
   * Rebuild the entire tree view
   * @private
   */
  #rebuildTree() {
    if (!this.#treeView) {
      console.error('SceneGraphInspector: #treeView is null! Cannot rebuild tree.');
      return;
    }
    this.#treeView.innerHTML = '';
    if (this.#root) {
      console.log('SceneGraphInspector: Building tree for root:', this.#root.getName?.() || 'Unnamed');
      this.#buildTreeNode(this.#root, this.#treeView);
      console.log('SceneGraphInspector: Tree built. Tree view has', this.#treeView.children.length, 'top-level nodes');
    } else {
      console.warn('SceneGraphInspector: No root set, cannot build tree');
    }
  }

  /**
   * Build a tree node element
   * @param {*} node - The scene graph node
   * @param {HTMLElement} parentElement - Parent DOM element
   * @private
   */
  #buildTreeNode(node, parentElement) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'sg-tree-node';
    nodeDiv.style.pointerEvents = 'auto';
    
    const header = document.createElement('div');
    header.className = 'sg-tree-node-header';
    header.style.pointerEvents = 'auto';
    if (node === this.#selectedNode) {
      header.classList.add('selected');
    }
    
    // Expand/collapse icon
    const expand = document.createElement('span');
    expand.className = 'sg-tree-expand';
    
    const hasChildren = (node instanceof SceneGraphComponent && 
                       (node.getChildComponentCount() > 0 || 
                        node.getTransformation() || 
                        node.getAppearance() || 
                        node.getGeometry() ||
                        node.getCamera())) ||
                       (node instanceof Appearance) ||
                       (node instanceof ShaderTreeNode && node.children.length > 0);
    
    if (hasChildren) {
      expand.textContent = this.#expandedNodes.has(node) ? '▼' : '▶';
      expand.style.cursor = 'pointer';
      expand.style.pointerEvents = 'auto';
      expand.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('Expand icon clicked for node:', node.getName?.() || 'Unnamed', e);
        this.#toggleExpand(node);
      }, false); // Use bubble phase (default)
    } else {
      expand.classList.add('empty');
    }
    
    // Icon
    const icon = document.createElement('span');
    icon.className = 'sg-tree-icon';
    icon.textContent = this.#getNodeIcon(node);
    
    // Label
    const label = document.createElement('span');
    label.className = 'sg-tree-label';
    label.textContent = node.getName?.() || 'Unnamed';
    
    // Type
    const type = document.createElement('span');
    type.className = 'sg-tree-type';
    type.textContent = this.#getNodeType(node);
    
    header.appendChild(expand);
    header.appendChild(icon);
    header.appendChild(label);
    header.appendChild(type);
    
    // Use addEventListener instead of onclick for better compatibility
    header.style.pointerEvents = 'auto';
    header.addEventListener('click', (e) => {
      // Don't select if clicking on the expand icon (it handles its own click)
      // Check if the click target is the expand icon or its children
      if (expand.contains(e.target)) {
        return;
      }
      console.log('Header clicked for node:', node.getName?.() || 'Unnamed', e);
      this.#selectNode(node);
    }, false); // Use bubble phase (default)
    
    nodeDiv.appendChild(header);
    
    // Children container
    if (hasChildren) {
      const childrenDiv = document.createElement('div');
      childrenDiv.className = 'sg-tree-children';
      if (!this.#expandedNodes.has(node)) {
        childrenDiv.classList.add('collapsed');
      }
      
      // Handle different node types
      if (node instanceof SceneGraphComponent) {
      // Add non-component children first
      if (node.getTransformation?.()) {
        this.#buildTreeNode(node.getTransformation(), childrenDiv);
      }
      if (node.getAppearance?.()) {
        this.#buildTreeNode(node.getAppearance(), childrenDiv);
      }
      if (node.getCamera?.()) {
        this.#buildTreeNode(node.getCamera(), childrenDiv);
      }
      if (node.getGeometry?.()) {
        this.#buildTreeNode(node.getGeometry(), childrenDiv);
      }
      
      // Add component children
      if (node.getChildComponents) {
        for (const child of node.getChildComponents()) {
            this.#buildTreeNode(child, childrenDiv);
          }
        }
      } else if (node instanceof Appearance) {
        // Create shader tree nodes for this appearance
        const shaderNodes = this.#createShaderTreeNodes(node);
        if (shaderNodes) {
          this.#buildTreeNode(shaderNodes, childrenDiv);
        }
      } else if (node instanceof ShaderTreeNode) {
        // Add shader node children
        for (const child of node.children) {
          this.#buildTreeNode(child, childrenDiv);
        }
      }
      
      nodeDiv.appendChild(childrenDiv);
    }
    
    parentElement.appendChild(nodeDiv);
    this.#nodeElements.set(node, header);
  }

  /**
   * Get icon for node type
   * @param {*} node - The node
   * @returns {string}
   * @private
   */
  #getNodeIcon(node) {
    if (node instanceof SceneGraphComponent) return '📦';
    if (node instanceof Transformation) return '🔄';
    if (node instanceof Appearance) return '🎨';
    if (node instanceof Geometry) return '▲';
    if (node instanceof Camera) return '📷';
    if (node instanceof ShaderTreeNode) {
      if (node.type === 'geometry') return '🎨';
      if (node.type === 'point') return '⚫';
      if (node.type === 'line') return '━';
      if (node.type === 'polygon') return '▲';
    }
    return '•';
  }

  /**
   * Get type name for node
   * @param {*} node - The node
   * @returns {string}
   * @private
   */
  #getNodeType(node) {
    if (node instanceof SceneGraphComponent) return 'Component';
    if (node instanceof Transformation) return 'Transform';
    if (node instanceof Appearance) return 'Appearance';
    if (node instanceof Geometry) {
      return node.constructor.name;
    }
    if (node instanceof Camera) return 'Camera';
    if (node instanceof ShaderTreeNode) return 'Shader';
    return 'Node';
  }

  /**
   * Toggle node expansion
   * @param {*} node - The node to toggle
   * @private
   */
  #toggleExpand(node) {
    if (this.#expandedNodes.has(node)) {
      this.#expandedNodes.delete(node);
    } else {
      this.#expandedNodes.add(node);
    }
    // Use immediate refresh for user interactions to feel responsive
    this.refreshImmediate();
  }

  /**
   * Select a node
   * @param {*} node - The node to select
   * @private
   */
  #selectNode(node) {
    this.#selectedNode = node;
    // Use immediate refresh for user interactions to feel responsive
    this.refreshImmediate();
    this.#updatePropertyPanel(node);
  }

  /**
   * Update the property panel for selected node
   * @param {*} node - The selected node
   * @private
   */
  #updatePropertyPanel(node) {
    this.#propertyPanel.innerHTML = '';
    
    if (!node) {
      this.#propertyPanel.innerHTML = '<div class="sg-no-selection">Select a node to view properties</div>';
      return;
    }
    
    // Component-specific properties
    if (node instanceof SceneGraphComponent) {
      this.#addComponentProperties(node);
    } else if (node instanceof Transformation) {
      this.#addTransformationProperties(node);
    } else if (node instanceof Appearance) {
      this.#addAppearanceProperties(node);
    } else if (node instanceof Geometry) {
      this.#addGeometryProperties(node);
    } else if (node instanceof Camera) {
      this.#addCameraProperties(node);
    } else if (node instanceof ShaderTreeNode) {
      this.#addShaderProperties(node);
    }
  }

  /**
   * Add a property group to the panel
   * @param {string} title - Group title
   * @param {Array<{label: string, value: *, editable: boolean}>} properties - Properties
   * @private
   */
  #addPropertyGroup(title, properties) {
    const group = document.createElement('div');
    group.className = 'sg-prop-group';
    
    const titleEl = document.createElement('div');
    titleEl.className = 'sg-prop-group-title';
    titleEl.textContent = title;
    group.appendChild(titleEl);
    
    for (const prop of properties) {
      const row = document.createElement('div');
      row.className = 'sg-prop-row';
      
      const label = document.createElement('div');
      label.className = 'sg-prop-label';
      label.textContent = prop.label;
      
      const value = document.createElement('div');
      value.className = 'sg-prop-value';
      
      if (typeof prop.value === 'boolean') {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = prop.value;
        checkbox.disabled = !prop.editable;
        if (prop.onChange) {
          checkbox.onchange = () => prop.onChange(checkbox.checked);
        }
        value.appendChild(checkbox);
      } else if (prop.value instanceof HTMLElement) {
        value.appendChild(prop.value);
      } else {
        value.textContent = String(prop.value);
      }
      
      row.appendChild(label);
      row.appendChild(value);
      group.appendChild(row);
    }
    
    this.#propertyPanel.appendChild(group);
  }

  /**
   * Add component-specific properties
   * @param {SceneGraphComponent} component - The component
   * @private
   */
  #addComponentProperties(component) {
    this.#addPropertyGroup('Component', [
      { 
        label: 'Visible', 
        value: component.isVisible(), 
        editable: true,
        onChange: (val) => {
          component.setVisible(val);
          // Trigger viewer render if available (for live preview)
          if (typeof window !== 'undefined' && window._viewerInstance) {
            window._viewerInstance.render();
          }
          this.#updatePropertyPanel(component);
        }
      },
      { 
        label: 'Pickable', 
        value: component.isPickable(), 
        editable: true,
        onChange: (val) => {
          component.setPickable(val);
          // Trigger viewer render if available (for live preview)
          if (typeof window !== 'undefined' && window._viewerInstance) {
            window._viewerInstance.render();
          }
          this.#updatePropertyPanel(component);
        }
      },
      { label: 'Children', value: component.getChildComponentCount(), editable: false }
    ]);
  }

  /**
   * Add transformation-specific properties
   * @param {Transformation} transform - The transformation
   * @private
   */
  #addTransformationProperties(transform) {
    const matrix = transform.getMatrix();
    
    // Use FactoredMatrix to decompose the transformation
    const fm = new FactoredMatrix(Pn.EUCLIDEAN, matrix);
    
    // Get decomposed values
    const translation = fm.getTranslation(); // [x, y, z, 1]
    const stretch = fm.getStretch();         // [sx, sy, sz, 1]
    const angle = fm.getRotationAngle();     // radians
    const axis = fm.getRotationAxis();       // [x, y, z]
    
    // Helper to update the transformation
    const updateTransform = () => {
      const newMatrix = fm.getArray();
      transform.setMatrix(newMatrix);
      // Trigger viewer render if available
      if (typeof window !== 'undefined' && window._viewerInstance) {
        window._viewerInstance.render();
      }
      this.#updatePropertyPanel(transform);
    };
    
    // Position (Translation) - VectorWidget (direct append, no wrapper)
    const positionWidget = new VectorWidget(
      [translation[0], translation[1], translation[2]],
      ['X', 'Y', 'Z'],
      (newVector) => {
        fm.setTranslation(newVector[0], newVector[1], newVector[2]);
        updateTransform();
      },
      'Position'
    );
    this.#propertyPanel.appendChild(positionWidget.getElement());
    
    // Rotation - Combined Angle + Axis in single border
    const angleDegrees = angle * 180 / Math.PI;
    const rotationContainer = document.createElement('div');
    rotationContainer.className = 'sg-rotation-container';
    rotationContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 6px 8px;
      background: #2a2a2a;
      border: 1px solid #555;
      border-radius: 4px;
      margin-top: 8px;
    `;
    
    // Rotation label
    const rotationLabel = document.createElement('div');
    rotationLabel.style.cssText = `
      color: #4ec9b0;
      font-size: 11px;
      font-weight: 600;
    `;
    rotationLabel.textContent = 'Rotation:';
    rotationContainer.appendChild(rotationLabel);
    
    // Angle row
    const angleRow = document.createElement('div');
    angleRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    const angleLabel = document.createElement('span');
    angleLabel.style.cssText = `
      color: #9cdcfe;
      font-size: 11px;
      font-weight: 600;
    `;
    angleLabel.textContent = 'Angle (°):';
    const angleInput = this.#createNumberInput(angleDegrees, (val) => {
      const angleRad = val * Math.PI / 180;
      const currentAxis = fm.getRotationAxis();
      fm.setRotation(angleRad, currentAxis);
      updateTransform();
    });
    angleRow.appendChild(angleLabel);
    angleRow.appendChild(angleInput);
    rotationContainer.appendChild(angleRow);
    
    // Axis VectorWidget (without group label since it's in the container)
    const rotationAxisWidget = new VectorWidget(
      [axis[0], axis[1], axis[2]],
      ['X', 'Y', 'Z'],
      (newAxis) => {
        const currentAngle = fm.getRotationAngle();
        fm.setRotation(currentAngle, newAxis);
        updateTransform();
      },
      'Axis'
    );
    rotationContainer.appendChild(rotationAxisWidget.getElement());
    this.#propertyPanel.appendChild(rotationContainer);
    
    // Scale (Stretch) - VectorWidget (direct append, no wrapper)
    const scaleWidget = new VectorWidget(
      [stretch[0], stretch[1], stretch[2]],
      ['X', 'Y', 'Z'],
      (newScale) => {
        fm.setStretchComponents(newScale[0], newScale[1], newScale[2]);
        updateTransform();
      },
      'Scale'
    );
    scaleWidget.getElement().style.marginTop = '8px';
    this.#propertyPanel.appendChild(scaleWidget.getElement());
    
    // Raw matrix (collapsible, for reference)
    const matrixToggle = document.createElement('div');
    matrixToggle.className = 'sg-matrix-toggle';
    matrixToggle.textContent = '▸ Show Raw Matrix';
    matrixToggle.style.cursor = 'pointer';
    matrixToggle.style.color = '#9cdcfe';
    matrixToggle.style.marginBottom = '8px';
    matrixToggle.style.userSelect = 'none';
    
    const matrixContainer = document.createElement('div');
    matrixContainer.style.display = 'none';
    
    const grid = document.createElement('div');
    grid.className = 'sg-matrix-grid';
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'sg-matrix-cell';
      cell.textContent = matrix[i].toFixed(3);
      grid.appendChild(cell);
    }
    matrixContainer.appendChild(grid);
    
    matrixToggle.addEventListener('click', () => {
      const isHidden = matrixContainer.style.display === 'none';
      matrixContainer.style.display = isHidden ? 'block' : 'none';
      matrixToggle.textContent = isHidden ? '▾ Hide Raw Matrix' : '▸ Show Raw Matrix';
    });
    
    const matrixSection = document.createElement('div');
    matrixSection.appendChild(matrixToggle);
    matrixSection.appendChild(matrixContainer);
    
    this.#addPropertyGroup('Matrix', [
      { label: '', value: matrixSection, editable: false }
    ]);
  }

  /**
   * Build a SceneGraphPath from root to the given component
   * @param {SceneGraphComponent} component - The target component
   * @returns {SceneGraphPath|null} The path, or null if component not found
   * @private
   */
  #buildPathToComponent(component) {
    if (!this.#root) return null;
    
    const path = [];
    
    // Helper function to search recursively
    const findComponent = (node, target) => {
      if (node instanceof SceneGraphComponent) {
        path.push(node);
        
        if (node === target) {
          return true;
        }
        
        // Search children
        for (const child of node.getChildComponents()) {
          if (findComponent(child, target)) {
            return true;
          }
        }
        
        path.pop();
      }
      
      return false;
    };
    
    if (findComponent(this.#root, component)) {
      return new SceneGraphPath(path);
    }
    
    return null;
  }

  /**
   * Create an inherited indicator (plain text for now)
   * @param {string} attributeKey - The attribute key (e.g., 'point.diffuseColor')
   * @param {*} currentValue - The current value (or INHERITED symbol)
   * @param {Appearance} appearance - The appearance to modify
   * @param {Function} schema - The shader schema to get defaults from
   * @param {*} refreshNode - The node to refresh after changes (appearance or shaderNode)
   * @returns {HTMLElement} The inherited indicator
   * @private
   */
  #createInheritedButton(attributeKey, currentValue, appearance, schema, refreshNode = null) {
    const span = document.createElement('span');
    span.className = 'sg-inherited-indicator';
    span.textContent = 'Inherited';
    span.style.color = '#858585';
    span.style.fontSize = '11px';
    span.style.fontStyle = 'italic';
    return span;
  }

  /**
   * Format attribute name for display (camelCase -> Title Case)
   * @param {string} key - The attribute key
   * @returns {string} Formatted name
   * @private
   */
  #formatAttributeName(key) {
    // Convert camelCase to spaces
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Create a shader node UI (collapsible section with attributes)
   * @param {string} shaderName - Name of the shader
   * @param {string} icon - Icon for the shader
   * @param {Object} shaderInstance - The shader instance
   * @param {Object} shaderSchema - The shader schema
   * @param {Appearance} appearance - The appearance to modify
   * @param {string} prefix - Attribute prefix (e.g., 'point')
   * @param {boolean} startExpanded - Whether to start expanded
   * @returns {HTMLElement} The shader node element
   * @private
   */
  #createShaderNode(shaderName, icon, shaderInstance, shaderSchema, appearance, prefix, startExpanded = false) {
    const node = document.createElement('div');
    node.className = 'sg-shader-node';
    
    // Header (clickable to expand/collapse)
    const header = document.createElement('div');
    header.className = 'sg-shader-header';
    
    const expandIcon = document.createElement('span');
    expandIcon.className = 'sg-shader-expand';
    expandIcon.textContent = startExpanded ? '▼' : '▶';
    
    const shaderIcon = document.createElement('span');
    shaderIcon.className = 'sg-shader-icon';
    shaderIcon.textContent = icon;
    
    const name = document.createElement('span');
    name.className = 'sg-shader-name';
    name.textContent = shaderName;
    
    header.appendChild(expandIcon);
    header.appendChild(shaderIcon);
    header.appendChild(name);
    
    // Attributes container
    const attributesContainer = document.createElement('div');
    attributesContainer.className = 'sg-shader-attributes';
    if (!startExpanded) {
      attributesContainer.classList.add('collapsed');
    }
    
    // Get all attributes from the shader instance
    const allAttributes = shaderInstance.getAllAttributes();
    
    // Create a row for each attribute
    for (const [key, value] of Object.entries(allAttributes)) {
      const row = this.#createShaderAttributeRow(
        key,
        value,
        appearance,
        shaderSchema,
        prefix
      );
      attributesContainer.appendChild(row);
    }
    
    // Toggle expand/collapse
    header.onclick = () => {
      const isCollapsed = attributesContainer.classList.contains('collapsed');
      attributesContainer.classList.toggle('collapsed');
      expandIcon.textContent = isCollapsed ? '▼' : '▶';
    };
    
    node.appendChild(header);
    node.appendChild(attributesContainer);
    
    return node;
  }

  /**
   * Create a shader attribute row
   * @param {string} key - Attribute key (without prefix)
   * @param {*} value - Attribute value (or INHERITED)
   * @param {Appearance} appearance - The appearance to modify
   * @param {Object} schema - The shader schema
   * @param {string} prefix - Attribute prefix
   * @returns {HTMLElement} The attribute row
   * @private
   */
  #createShaderAttributeRow(key, value, appearance, schema, prefix) {
    const row = document.createElement('div');
    row.className = 'sg-shader-attr-row';
    
    const label = document.createElement('div');
    label.className = 'sg-shader-attr-label';
    label.textContent = this.#formatAttributeName(key);
    
    const valueContainer = document.createElement('div');
    valueContainer.className = 'sg-shader-attr-value';
    
    // Construct full key, handling empty prefix
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value === INHERITED) {
      // Just show inherited button
      const inheritedBtn = this.#createInheritedButton(fullKey, value, appearance, schema);
      valueContainer.appendChild(inheritedBtn);
    } else {
      // Show widget for the value
      const widget = this.#createWidgetForValue(key, value, (newValue) => {
        appearance.setAttribute(fullKey, newValue);
        
        // Trigger viewer render if available
        if (typeof window !== 'undefined' && window._viewerInstance) {
          window._viewerInstance.render();
        }
        
        // Refresh the property panel
        this.#updatePropertyPanel(appearance);
      });
      
      valueContainer.appendChild(widget);
      
      // Plus inherited button to clear it
      const inheritedBtn = this.#createInheritedButton(fullKey, value, appearance, schema);
      valueContainer.appendChild(inheritedBtn);
    }
    
    row.appendChild(label);
    row.appendChild(valueContainer);
    
    return row;
  }

  /**
   * Create appropriate widget for a value based on its type
   * @param {string} key - Attribute key
   * @param {*} value - The value
   * @param {Function} onChange - Change callback
   * @returns {HTMLElement} The widget element
   * @private
   */
  #createWidgetForValue(key, value, onChange) {
    // Check if value is a valid color
    if (ColorPickerWidget.isColorValue(value)) {
      const widget = new ColorPickerWidget(value, onChange);
      return widget.getElement();
    }
    
    // Check for boolean
    if (typeof value === 'boolean') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = value;
      checkbox.onchange = () => onChange(checkbox.checked);
      return checkbox;
    }
    
    // Check for number
    if (typeof value === 'number') {
      const widget = new NumberWidget('', value, onChange);
      return widget.getElement();
    }
    
    // Check for string
    if (typeof value === 'string') {
      return this.#createTextInput(value, onChange);
    }
    
    // Check for array
    if (Array.isArray(value)) {
      const widget = new VectorWidget(value, null, onChange);
      return widget.getElement();
    }
    
    // Default: non-editable text
    const span = document.createElement('span');
    span.textContent = this.#formatValue(value);
    span.style.color = '#858585';
    return span;
  }

  /**
   * Add appearance-specific properties
   * @param {Appearance} appearance - The appearance
   * @private
   */
  #addAppearanceProperties(appearance) {
    // Show flat attribute list
    // (Shader hierarchy is now displayed in the tree view)
    const attrs = appearance.getStoredAttributes();
    const properties = [];
    
    for (const key of attrs) {
      const value = appearance.getAttribute(key);
      const propertyDef = this.#createEditableProperty(key, value, (newValue) => {
        // Update the appearance attribute
        appearance.setAttribute(key, newValue);
        // Trigger viewer render if available (for live preview)
        if (typeof window !== 'undefined' && window._viewerInstance) {
          window._viewerInstance.render();
        }
        // Refresh the property panel
        this.#updatePropertyPanel(appearance);
      });
      properties.push(propertyDef);
    }
    
    if (properties.length === 0) {
      properties.push({ label: '(empty)', value: 'No attributes set', editable: false });
    }
    
    this.#addPropertyGroup('Attributes', properties);
  }

  /**
   * Create shader tree nodes for an appearance
   * This builds a hierarchy: Geometry Shader -> Point/Line/Polygon Shaders
   * @param {Appearance} appearance - The appearance
   * @returns {ShaderTreeNode|null} The root geometry shader node
   * @private
   */
  #createShaderTreeNodes(appearance) {
    // Find the owning component to build EffectiveAppearance
    let owningComponent = null;
    
    const findOwner = (node) => {
      if (node instanceof SceneGraphComponent && node.getAppearance() === appearance) {
        return node;
      }
      if (node instanceof SceneGraphComponent) {
        for (const child of node.getChildComponents()) {
          const found = findOwner(child);
          if (found) return found;
        }
      }
      return null;
    };
    
    if (this.#root) {
      owningComponent = findOwner(this.#root);
    }
    
    if (!owningComponent) {
      return null; // Can't build effective appearance without owner
    }
    
    // Build effective appearance
    const path = this.#buildPathToComponent(owningComponent);
    if (!path) return null;
    
    const effectiveAppearance = EffectiveAppearance.createFromPath(path);
    const geometryShader = DefaultGeometryShader.createFromEffectiveAppearance(effectiveAppearance);
    
    // Check cache first to maintain node identity
    let geomNode = this.#shaderNodeCache.get(appearance);
    
    if (geomNode) {
      // Update existing node with fresh shader data
      geomNode.updateShaderInstance(geometryShader);
      
      // Update sub-shader data
      const pointShader = geometryShader.getPointShader();
      const lineShader = geometryShader.getLineShader();
      const polygonShader = geometryShader.getPolygonShader();
      
      if (geomNode.children.length === 3) {
        geomNode.children[0].updateShaderInstance(pointShader);
        geomNode.children[1].updateShaderInstance(lineShader);
        geomNode.children[2].updateShaderInstance(polygonShader);
      }
      
      return geomNode;
    }
    
    // Create new geometry shader node
    geomNode = new ShaderTreeNode(
      'Geometry Shader',
      'geometry',
      geometryShader,
      DefaultGeometryShader,
      appearance,
      '' // No prefix
    );
    
    // Create sub-shader nodes
    const pointShader = geometryShader.getPointShader();
    const lineShader = geometryShader.getLineShader();
    const polygonShader = geometryShader.getPolygonShader();
    
    const pointNode = new ShaderTreeNode(
      'Point Shader',
      'point',
      pointShader,
      DefaultPointShader,
      appearance,
      CommonAttributes.POINT_SHADER
    );
    
    const lineNode = new ShaderTreeNode(
      'Line Shader',
      'line',
      lineShader,
      DefaultLineShader,
      appearance,
      CommonAttributes.LINE_SHADER
    );
    
    const polygonNode = new ShaderTreeNode(
      'Polygon Shader',
      'polygon',
      polygonShader,
      DefaultPolygonShader,
      appearance,
      CommonAttributes.POLYGON_SHADER
    );
    
    geomNode.addChild(pointNode);
    geomNode.addChild(lineNode);
    geomNode.addChild(polygonNode);
    
    // Cache the node
    this.#shaderNodeCache.set(appearance, geomNode);
    
    return geomNode;
  }

  /**
   * Add shader-specific properties to the property panel
   * Displays all attributes of the selected shader
   * @param {ShaderTreeNode} shaderNode - The shader tree node
   * @private
   */
  #addShaderProperties(shaderNode) {
    const { shaderInstance, schema, appearance, prefix } = shaderNode;
    
    // Get all attributes from the shader instance
    const allAttributes = shaderInstance.getAllAttributes();
    
    // Create a row for each attribute
    const properties = [];
    for (const [key, value] of Object.entries(allAttributes)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value === INHERITED) {
        // Create inherited button that can be clicked to set value
        const inheritedBtn = this.#createInheritedButton(fullKey, value, appearance, schema, shaderNode);
        properties.push({
          label: this.#formatAttributeName(key),
          value: inheritedBtn,
          editable: true
        });
      } else {
        // Create widget for the value
        const widget = this.#createWidgetForValue(key, value, (newValue) => {
          appearance.setAttribute(fullKey, newValue);
          
          // Trigger viewer render if available
          if (typeof window !== 'undefined' && window._viewerInstance) {
            window._viewerInstance.render();
          }
          
          // Refresh the property panel
          this.#updatePropertyPanel(shaderNode);
        });
        
        // Create a container with the widget and inherited button
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '5px';
        container.style.alignItems = 'center';
        container.appendChild(widget);
        
        const inheritedBtn = this.#createInheritedButton(fullKey, value, appearance, schema, shaderNode);
        container.appendChild(inheritedBtn);
        
        properties.push({
          label: this.#formatAttributeName(key),
          value: container,
          editable: true
        });
      }
    }
    
    this.#addPropertyGroup(shaderNode.name + ' Attributes', properties);
  }

  /**
   * Add geometry shader properties (hierarchical shader display)
   * @param {DefaultGeometryShader} geometryShader - The geometry shader
   * @param {Appearance} appearance - The appearance to modify
   * @private
   */
  #addGeometryShaderProperties(geometryShader, appearance) {
    // Create geometry shader section (start expanded)
    const geomNode = this.#createShaderNode(
      'Geometry Shader',
      '🎨',
      { getAllAttributes: () => ({
        showPoints: geometryShader.getShowPoints(),
        showLines: geometryShader.getShowLines(),
        showFaces: geometryShader.getShowFaces()
      })},
      DefaultGeometryShader,
      appearance,
      '', // No prefix for geometry shader attributes
      true // Start expanded
    );
    this.#propertyPanel.appendChild(geomNode);
    
    // Add three sub-shaders
    const pointShader = geometryShader.getPointShader();
    const lineShader = geometryShader.getLineShader();
    const polygonShader = geometryShader.getPolygonShader();
    
    // Point Shader
    const pointNode = this.#createShaderNode(
      'Point Shader',
      '⚫',
      pointShader,
      DefaultPointShader,
      appearance,
      'point',
      false
    );
    this.#propertyPanel.appendChild(pointNode);
    
    // Line Shader
    const lineNode = this.#createShaderNode(
      'Line Shader',
      '━',
      lineShader,
      DefaultLineShader,
      appearance,
      'line',
      false
    );
    this.#propertyPanel.appendChild(lineNode);
    
    // Polygon Shader
    const polygonNode = this.#createShaderNode(
      'Polygon Shader',
      '▲',
      polygonShader,
      DefaultPolygonShader,
      appearance,
      'polygon',
      false
    );
    this.#propertyPanel.appendChild(polygonNode);
  }

  /**
   * Create an editable property definition based on value type
   * @param {string} label - Property label
   * @param {*} value - Property value
   * @param {Function} onChange - Change handler
   * @returns {Object} Property definition
   * @private
   */
  #createEditableProperty(label, value, onChange) {
    // Check if value is a valid color (Color object or color array)
    if (ColorPickerWidget.isColorValue(value)) {
      const widget = new ColorPickerWidget(value, onChange);
      return {
        label,
        value: widget.getElement(),
        editable: true
      };
    }
    
    // Check for boolean
    if (typeof value === 'boolean') {
      return {
        label,
        value,
        editable: true,
        onChange
      };
    }
    
    // Check for number
    if (typeof value === 'number') {
      // Use empty label since the property group already displays the label in the left column
      const widget = new NumberWidget('', value, onChange);
      return {
        label,
        value: widget.getElement(),
        editable: true
      };
    }
    
    // Check for string
    if (typeof value === 'string') {
      return {
        label,
        value: this.#createTextInput(value, onChange),
        editable: true
      };
    }
    
    // Default: non-editable formatted value
    return {
      label,
      value: this.#formatValue(value),
      editable: false
    };
  }


  /**
   * Create a number input widget
   * @param {number} value - Number value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement}
   * @private
   */
  #createNumberInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.className = 'sg-number-input';
    
    // Determine if integer or float
    if (Number.isInteger(value)) {
      input.step = '1';
    } else {
      input.step = 'any';
    }
    
    input.addEventListener('change', () => {
      const newValue = Number.isInteger(value) 
        ? parseInt(input.value, 10)
        : parseFloat(input.value);
      
      if (!isNaN(newValue)) {
        onChange(newValue);
      }
    });
    
    // Also update on blur for better UX
    input.addEventListener('blur', () => {
      input.dispatchEvent(new Event('change'));
    });
    
    return input;
  }

  /**
   * Create a text input widget
   * @param {string} value - String value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement}
   * @private
   */
  #createTextInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.className = 'sg-text-input';
    
    input.addEventListener('change', () => {
      onChange(input.value);
    });
    
    input.addEventListener('blur', () => {
      input.dispatchEvent(new Event('change'));
    });
    
    return input;
  }

  /**
   * Add geometry-specific properties
   * @param {Geometry} geometry - The geometry
   * @private
   */
  #addGeometryProperties(geometry) {
    const properties = [];
    
    // Check geometry type and show appropriate counts
    const geometryType = geometry.constructor.name;
    
    // All geometry types have points/vertices
    if (typeof geometry.getNumPoints === 'function') {
      properties.push({ label: 'Vertex Count', value: geometry.getNumPoints(), editable: false });
    }
    
    // IndexedLineSet and IndexedFaceSet have edges
    if (geometryType === 'IndexedLineSet' || geometryType === 'IndexedFaceSet') {
      if (typeof geometry.getNumEdges === 'function') {
        properties.push({ label: 'Edge Count', value: geometry.getNumEdges(), editable: false });
      }
    }
    
    // Only IndexedFaceSet has faces
    if (geometryType === 'IndexedFaceSet') {
      if (typeof geometry.getNumFaces === 'function') {
        properties.push({ label: 'Face Count', value: geometry.getNumFaces(), editable: false });
      }
    }
    
    this.#addPropertyGroup('Geometry', properties);
    
    // Geometry attributes
    const geomAttrs = geometry.getGeometryAttributes();
    const attrProps = [];
    for (const [key, value] of geomAttrs) {
      attrProps.push({
        label: key,
        value: this.#formatValue(value),
        editable: false
      });
    }
    
    if (attrProps.length > 0) {
      this.#addPropertyGroup('Geometry Attributes', attrProps);
    }
  }

  /**
   * Add camera-specific properties
   * @param {Camera} camera - The camera
   * @private
   */
  #addCameraProperties(camera) {
    this.#addPropertyGroup('Camera', [
      { label: 'Perspective', value: camera.isPerspective(), editable: false },
      { label: 'Field of View', value: camera.getFieldOfView()?.toFixed(2) || 'N/A', editable: false },
      { label: 'Near', value: camera.getNear()?.toFixed(3) || 'N/A', editable: false },
      { label: 'Far', value: camera.getFar()?.toFixed(3) || 'N/A', editable: false }
    ]);
  }

  /**
   * Format a value for display
   * @param {*} value - The value
   * @returns {string}
   * @private
   */
  #formatValue(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length <= 4) return `[${value.map(v => v.toFixed?.(2) || v).join(', ')}]`;
        return `Array(${value.length})`;
      }
      return value.toString();
    }
    if (typeof value === 'number') {
      return value.toFixed(3);
    }
    return String(value);
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
      if (this.#selectedNode) {
        this.#updatePropertyPanel(this.#selectedNode);
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
    if (this.#selectedNode) {
      this.#updatePropertyPanel(this.#selectedNode);
    }
  }
}

