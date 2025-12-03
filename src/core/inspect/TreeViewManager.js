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
import { SceneGraphTreeModel } from './SceneGraphTreeModel.js';

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
   * @type {*|null}
   */
  #root = null;

  /**
   * @type {SceneGraphTreeModel|null}
   */
  #treeModel = null;
  
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
   * @param {SceneGraphComponent|import('./SceneGraphTreeModel.js').InspectorTreeNode} root - The root component or a pre-built tree node
   */
  rebuildTree(root) {
    if (!this.#treeView) {
      console.error('TreeViewManager: #treeView is null! Cannot rebuild tree.');
      return;
    }
    this.#treeView.innerHTML = '';
    this.#nodeElements.clear();
    
    // Check if root is already an InspectorTreeNode (composite tree)
    if (root && root.data !== undefined && root.children !== undefined) {
      // It's a pre-built tree node
      this.#root = root.data;
      if (root) {
        this.#buildTreeNode(root, this.#treeView);
      }
      return;
    }
    
    // Otherwise, treat it as a SceneGraphComponent and build model
    this.#root = root;
    this.#treeModel = new SceneGraphTreeModel(this.#createShaderTreeNodes, root);
    if (!root) {
      console.warn('TreeViewManager: No root set, cannot build tree');
      return;
    }
    const descriptor = this.#treeModel.build(root);
    if (descriptor) {
      this.#buildTreeNode(descriptor, this.#treeView);
    }
  }
  
  /**
   * Build a tree node element
   * @param {*} node - The scene graph node
   * @param {HTMLElement} parentElement - Parent DOM element
   * @private
   */
  /**
   * @param {import('./SceneGraphTreeModel.js').InspectorTreeNode} descriptor
   * @param {HTMLElement} parentElement
   * @private
   */
  #buildTreeNode(descriptor, parentElement) {
    if (!descriptor) return;
    const node = descriptor.data;
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
    
    const hasChildren = descriptor.children && descriptor.children.length > 0;
    
    if (hasChildren) {
      const isExpanded = this.#expandedNodes.has(node);
      expand.textContent = isExpanded ? '▼' : '▶';
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
    icon.textContent = descriptor.icon || this.#getNodeIcon(node, descriptor.type);
    
    // Label (node name) with tooltip for node type
    const label = document.createElement('span');
    label.className = 'sg-tree-label';
    label.textContent = descriptor.label || node.getName?.() || 'Unnamed';
    
    const nodeType = this.#getNodeType(node, descriptor.type);
    if (nodeType) {
      label.title = nodeType;
    }
    
    header.appendChild(expand);
    header.appendChild(icon);
    header.appendChild(label);
    
    // Use addEventListener instead of onclick for better compatibility
    header.style.pointerEvents = 'auto';
    header.addEventListener('click', (e) => {
      // Check if this is the GeometryShader expand under rootAppearance
      if (node instanceof ShaderTreeNode && node.type === 'geometry') {
        const appearance = node.appearance;
        const isRootAppearance = this.#root && this.#root.getAppearance?.() === appearance;
        if (isRootAppearance) {
          console.error('=== HEADER CLICKED ON ROOT GEOMETRY SHADER ===', {
            target: e.target,
            targetClass: e.target.className,
            expandElement: expand,
            expandContains: expand.contains(e.target),
            expandIsTarget: e.target === expand
          });
        }
      }
      
      // Don't select if clicking on the expand icon (it handles its own click)
      if (expand.contains(e.target) || e.target === expand) {
        console.error('[TreeViewManager] Header click ignored - expand icon was clicked', {
          target: e.target,
          expand: expand,
          node: node instanceof ShaderTreeNode ? node.type : 'not shader'
        });
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
      
      for (const childDescriptor of descriptor.children) {
        this.#buildTreeNode(childDescriptor, childrenDiv);
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
  #getNodeIcon(node, descriptorType = null) {
    const type = descriptorType || this.#inferTypeFromNode(node);
    switch (type) {
      case 'component': return '📦';
      case 'transform': return '🔄';
      case 'appearance': return '🎨';
      case 'geometry': return '▲';
      case 'camera': return '📷';
      case 'tool': return '🔧';
      case 'shader':
      case 'shader.geometry': return '🎨';
      case 'shader.renderingHints': return '⚙️';
      case 'shader.point': return '⚫';
      case 'shader.line': return '━';
      case 'shader.polygon': return '▲';
      case 'shader.rootAppearance': return '🧱';
      default:
        if (node instanceof ShaderTreeNode) {
          if (node.type === 'geometry') return '🎨';
          if (node.type === 'renderingHints') return '⚙️';
          if (node.type === 'point') return '⚫';
          if (node.type === 'line') return '━';
          if (node.type === 'polygon') return '▲';
        }
        return '•';
    }
  }
  
  /**
   * Get type name for node
   * @param {*} node - The node
   * @returns {string}
   * @private
   */
  #getNodeType(node, descriptorType = null) {
    const type = descriptorType || this.#inferTypeFromNode(node);
    if (type?.startsWith('shader.')) return 'Shader';
    switch (type) {
      case 'component': return node?.constructor?.name || 'SceneGraphComponent';
      case 'transform': return node?.constructor?.name || 'Transformation';
      case 'appearance': return node?.constructor?.name || 'Appearance';
      case 'geometry': return node?.constructor?.name || 'Geometry';
      case 'camera': return node?.constructor?.name || 'Camera';
      case 'tool': return node?.constructor?.name || 'Tool';
      case 'shader': return node?.constructor?.name || 'Shader';
      default:
        return node?.constructor?.name || 'Node';
    }
  }

  #inferTypeFromNode(node) {
    if (node instanceof SceneGraphComponent) return 'component';
    if (node instanceof Transformation) return 'transform';
    if (node instanceof Appearance) return 'appearance';
    if (node instanceof Geometry) return 'geometry';
    if (node instanceof Camera) return 'camera';
    if (node instanceof ShaderTreeNode) return `shader.${node.type || ''}`;
    return null;
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

