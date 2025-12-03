/**
 * CompositeTreeModel - Combines scene graph tree with application instances.
 * 
 * This model creates a tree that includes both the scene graph hierarchy
 * and any JSRApp instances that have inspector descriptors.
 */

import { InspectorTreeNode } from './SceneGraphTreeModel.js';
import { SceneGraphTreeModel } from './SceneGraphTreeModel.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';

/**
 * Composite tree model that combines scene graph with app instances.
 */
export class CompositeTreeModel {
  /** @type {SceneGraphTreeModel} */
  #sceneModel;

  /** @type {Array} */
  #apps;

  /**
   * @param {SceneGraphTreeModel} sceneModel - The scene graph tree model
   * @param {Array} [apps=[]] - Array of app instances with getInspectorDescriptors()
   */
  constructor(sceneModel, apps = []) {
    this.#sceneModel = sceneModel;
    this.#apps = apps.filter(app => typeof app.getInspectorDescriptors === 'function');
  }

  /**
   * Set the apps to include in the tree.
   * @param {Array} apps - Array of app instances
   */
  setApps(apps) {
    this.#apps = apps.filter(app => typeof app.getInspectorDescriptors === 'function');
  }

  /**
   * Build the composite tree (scene graph + apps).
   * @returns {InspectorTreeNode|null}
   */
  build() {
    const root = new InspectorTreeNode({
      data: null,
      label: 'Root',
      type: 'root',
      icon: '🌳',
      children: []
    });

    // Add scene graph if available
    const sceneNode = this.#sceneModel.build();
    if (sceneNode) {
      root.addChild(sceneNode);
    }

    // Add app instances
    for (const app of this.#apps) {
      const appNode = this.#buildAppNode(app);
      if (appNode) {
        root.addChild(appNode);
      }
    }

    return root;
  }

  /**
   * Build a tree node for an app instance.
   * @param {*} app - App instance with getInspectorDescriptors()
   * @returns {InspectorTreeNode|null}
   */
  #buildAppNode(app) {
    if (!app || typeof app.getInspectorDescriptors !== 'function') {
      return null;
    }

    const appName = app.constructor?.name || 'Application';
    const appInfo = app.getInfo?.();
    const label = appInfo?.name || appName;

    return new InspectorTreeNode({
      data: app,
      label: label,
      type: 'jsrapp',
      icon: '⚙️',
      children: []
    });
  }
}

