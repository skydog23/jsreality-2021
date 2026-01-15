/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * SceneGraphTreeModel - produces lightweight descriptors for inspector tree rendering.
 *
 * Splits traversal (data) from DOM rendering (TreeViewManager) so the inspector
 * can be unit-tested more easily and alternative UIs can consume the same model.
 */

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Transformation } from '../scene/Transformation.js';
import { Appearance } from '../scene/Appearance.js';
import { Geometry } from '../scene/Geometry.js';
import { Camera } from '../scene/Camera.js';
import { Tool } from '../scene/tool/Tool.js';

/**
 * Simple tree descriptor consumed by TreeViewManager.
 */
export class InspectorTreeNode {
  /**
   * @param {Object} options
   * @param {*} options.data
   * @param {string|null} [options.label]
   * @param {string|null} [options.type]
   * @param {string|null} [options.icon]
   * @param {InspectorTreeNode[]} [options.children]
   */
  constructor({ data, label = null, type = null, icon = null, children = [] }) {
    this.data = data;
    this.label = label ?? data?.getName?.() ?? this.#inferLabel(data);
    this.type = type;
    this.icon = icon;
    this.children = children;
  }

  /**
   * Append a child node if provided.
   * @param {InspectorTreeNode|null} child
   */
  addChild(child) {
    if (child) {
      this.children.push(child);
    }
  }

  #inferLabel(node) {
    if (!node) {
      return 'Node';
    }
    if (typeof node.getName === 'function') {
      const name = node.getName();
      if (name) return name;
    }
    if (node.constructor && node.constructor.name) {
      return node.constructor.name;
    }
    return 'Node';
  }
}

/**
 * Traverses SceneGraphComponent hierarchies and emits InspectorTreeNode descriptors.
 */
export class SceneGraphTreeModel {
  /** @type {SceneGraphComponent|null} */
  #root;

  /** @type {Function} */
  #createShaderTreeNodes;

  /**
   * @param {Function} createShaderTreeNodes - callback provided by ShaderPropertyManager
   * @param {SceneGraphComponent|null} [root]
   */
  constructor(createShaderTreeNodes, root = null) {
    if (typeof createShaderTreeNodes !== 'function') {
      throw new Error('SceneGraphTreeModel requires a shader node factory function');
    }
    this.#createShaderTreeNodes = createShaderTreeNodes;
    this.#root = root;
  }

  /**
   * Update root component.
   * @param {SceneGraphComponent|null} root
   */
  setRoot(root) {
    this.#root = root;
  }

  /**
   * Build descriptor tree starting at root (or provided component).
   * @param {SceneGraphComponent|null} [root]
   * @returns {InspectorTreeNode|null}
   */
  build(root = this.#root) {
    if (!(root instanceof SceneGraphComponent)) {
      return null;
    }
    return this.#buildComponentNode(root, true);
  }

  /**
   * Create descriptor for SceneGraphComponent (recursively).
   * @param {SceneGraphComponent} component
   * @param {boolean} isRoot
   * @returns {InspectorTreeNode}
   */
  #buildComponentNode(component, isRoot = false) {
    const descriptor = new InspectorTreeNode({
      data: component,
      type: 'component',
      label: component.getName?.() || component.constructor.name || 'Component',
      icon: '📦'
    });

    const transformation = component.getTransformation?.();
    if (transformation instanceof Transformation) {
      descriptor.addChild(this.#buildTransformationNode(transformation));
    }

    const appearance = component.getAppearance?.();
    if (appearance instanceof Appearance) {
      descriptor.addChild(this.#buildAppearanceNode(appearance, isRoot));
    }

    const geometry = component.getGeometry?.();
    if (geometry instanceof Geometry) {
      descriptor.addChild(this.#buildGeometryNode(geometry));
    }

    const camera = component.getCamera?.();
    if (camera instanceof Camera) {
      descriptor.addChild(this.#buildCameraNode(camera));
    }

    const tools = component.getTools?.();
    if (Array.isArray(tools) && tools.length > 0) {
      for (const tool of tools) {
        if (tool instanceof Tool || typeof tool === 'object') {
          descriptor.addChild(
            new InspectorTreeNode({
              data: tool,
              type: 'tool',
              label: tool.getName?.() || tool.constructor?.name || 'Tool',
              icon: '🔧'
            })
          );
        }
      }
    }

    const children = component.getChildComponents?.();
    if (Array.isArray(children)) {
      for (const child of children) {
        if (child instanceof SceneGraphComponent) {
          descriptor.addChild(this.#buildComponentNode(child, false));
        }
      }
    }

    return descriptor;
  }

  #buildTransformationNode(transformation) {
    return new InspectorTreeNode({
      data: transformation,
      type: 'transform',
      label: transformation.getName?.() || 'Transformation',
      icon: '🔄'
    });
  }

  #buildAppearanceNode(appearance, isRootAppearance) {
    const descriptor = new InspectorTreeNode({
      data: appearance,
      type: 'appearance',
      label: appearance.getName?.() || 'Appearance',
      icon: '🎨'
    });

    const shaderNodes = this.#createShaderTreeNodes(appearance, isRootAppearance);
    if (Array.isArray(shaderNodes)) {
      for (const shaderNode of shaderNodes) {
        descriptor.addChild(this.#convertShaderNode(shaderNode));
      }
    } else if (shaderNodes) {
      descriptor.addChild(this.#convertShaderNode(shaderNodes));
    }

    return descriptor;
  }

  #buildGeometryNode(geometry) {
    return new InspectorTreeNode({
      data: geometry,
      type: 'geometry',
      label: geometry.getName?.() || geometry.constructor?.name || 'Geometry',
      icon: '▲'
    });
  }

  #buildCameraNode(camera) {
    return new InspectorTreeNode({
      data: camera,
      type: 'camera',
      label: camera.getName?.() || 'Camera',
      icon: '📷'
    });
  }

  #convertShaderNode(shaderNode) {
    if (!shaderNode) {
      return null;
    }
    const descriptor = new InspectorTreeNode({
      data: shaderNode,
      type: shaderNode.type ? `shader.${shaderNode.type}` : 'shader',
      label: shaderNode.getName?.() || shaderNode.name || 'Shader',
      icon: this.#iconForShader(shaderNode.type)
    });

    if (Array.isArray(shaderNode.children)) {
      for (const child of shaderNode.children) {
        descriptor.addChild(this.#convertShaderNode(child));
      }
    }

    return descriptor;
  }

  #iconForShader(type) {
    switch (type) {
      case 'geometry':
        return '🎨';
      case 'renderingHints':
        return '⚙️';
      case 'point':
        return '⚫';
      case 'line':
        return '━';
      case 'polygon':
        return '▲';
      case 'rootAppearance':
        return '🧱';
      default:
        return '•';
    }
  }
}

