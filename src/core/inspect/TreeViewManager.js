/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Tree View Manager - handles tree building, expansion, selection, and node rendering

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Transformation } from '../scene/Transformation.js';
import { Appearance } from '../scene/Appearance.js';
import { Geometry } from '../scene/Geometry.js';
import { Camera } from '../scene/Camera.js';
import { Tool } from '../scene/tool/Tool.js';

/**
 * Wrapper class for shader nodes in the tree view
 * Allows shaders to be displayed as tree nodes with their own properties
 */
export class ShaderTreeNode {
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
 * Wrapper class for tool nodes in the tree view
 * Allows tools to be displayed as tree nodes
 */
export class ToolTreeNode {
  /**
   * @param {Tool} tool - The tool instance
   */
  constructor(tool) {
    this.tool = tool;
    this.name = tool.constructor.name;
  }
  
  getName() {
    return this.name;
  }
  
  getChildren() {
    return []; // Tools don't have children
  }
}

/**
 * Manages the tree view for the SceneGraphInspector
 */
export class TreeViewManager {
  /**
   * @type {HTMLElement}
   */
  #treeView;
  
  /**
   * @type {Set<*>}
   */
  #expandedNodes = new Set();
  
  /**
   * @type {Map<*, HTMLElement>}
   */
  #nodeElements = new Map();
  
  /**
   * @type {Function}
   */
  #onNodeSelect;
  
  /**
   * @type {Function}
   */
  #onNodeToggleExpand;
  
  /**
   * @type {Function}
   */
  #createShaderTreeNodes;
  
  /**
   * @type {*}
   */
  #selectedNode = null;
  
  /**
   * @param {HTMLElement} treeView - The tree view DOM element
   * @param {Function} onNodeSelect - Callback when a node is selected
   * @param {Function} onNodeToggleExpand - Callback when a node is expanded/collapsed
   * @param {Function} createShaderTreeNodes - Function to create shader tree nodes
   */
  constructor(treeView, onNodeSelect, onNodeToggleExpand, createShaderTreeNodes) {
    this.#treeView = treeView;
    this.#onNodeSelect = onNodeSelect;
    this.#onNodeToggleExpand = onNodeToggleExpand;
    this.#createShaderTreeNodes = createShaderTreeNodes;
  }
  
  /**
   * Set the selected node
   * @param {*} node - The selected node
   */
  setSelectedNode(node) {
    this.#selectedNode = node;
  }
  
  /**
   * Get the selected node
   * @returns {*}
   */
  getSelectedNode() {
    return this.#selectedNode;
  }
  
  /**
   * Rebuild the entire tree view
   * @param {SceneGraphComponent} root - The root component
   */
  rebuildTree(root) {
    if (!this.#treeView) {
      console.error('TreeViewManager: #treeView is null! Cannot rebuild tree.');
      return;
    }
    this.#treeView.innerHTML = '';
    this.#nodeElements.clear();
    if (root) {
      this.#buildTreeNode(root, this.#treeView);
    } else {
      console.warn('TreeViewManager: No root set, cannot build tree');
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
                        node.getCamera() ||
                        (node.getTools && node.getTools().length > 0))) ||
                       (node instanceof Appearance) ||
                       (node instanceof ShaderTreeNode && node.children.length > 0);
    
    if (hasChildren) {
      expand.textContent = this.#expandedNodes.has(node) ? '▼' : '▶';
      expand.style.cursor = 'pointer';
      expand.style.pointerEvents = 'auto';
      expand.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.#toggleExpand(node);
      }, false);
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
      if (expand.contains(e.target)) {
        return;
      }
      this.#selectNode(node);
    }, false);
    
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
        
        // Add tools after component children
        if (node.getTools) {
          const tools = node.getTools();
          for (const tool of tools) {
            const toolNode = new ToolTreeNode(tool);
            this.#buildTreeNode(toolNode, childrenDiv);
          }
        }
      } else if (node instanceof Appearance) {
        // Create shader tree nodes for this appearance
        const shaderNodes = this.#createShaderTreeNodes(node);
        if (shaderNodes) {
          // shaderNodes can be a single node or an array
          if (Array.isArray(shaderNodes)) {
            for (const shaderNode of shaderNodes) {
              this.#buildTreeNode(shaderNode, childrenDiv);
            }
          } else {
            this.#buildTreeNode(shaderNodes, childrenDiv);
          }
        }
      } else if (node instanceof ShaderTreeNode) {
        // Add shader node children
        for (const child of node.children) {
          this.#buildTreeNode(child, childrenDiv);
        }
      } else if (node instanceof ToolTreeNode) {
        // Tools don't have children, so nothing to add
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
    if (node instanceof ToolTreeNode) return '🔧';
    if (node instanceof ShaderTreeNode) {
      if (node.type === 'geometry') return '🎨';
      if (node.type === 'renderingHints') return '⚙️';
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
    if (node instanceof ToolTreeNode) return 'Tool';
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
    this.#onNodeToggleExpand();
  }
  
  /**
   * Select a node
   * @param {*} node - The node to select
   * @private
   */
  #selectNode(node) {
    this.#selectedNode = node;
    this.#onNodeSelect(node);
  }
  
  /**
   * Check if a node is expanded
   * @param {*} node - The node
   * @returns {boolean}
   */
  isExpanded(node) {
    return this.#expandedNodes.has(node);
  }
  
  /**
   * Expand a node
   * @param {*} node - The node to expand
   */
  expandNode(node) {
    this.#expandedNodes.add(node);
  }
  
  /**
   * Clear all expanded nodes
   */
  clearExpandedNodes() {
    this.#expandedNodes.clear();
  }
  
  /**
   * Clear node elements map
   */
  clearNodeElements() {
    this.#nodeElements.clear();
  }
}

