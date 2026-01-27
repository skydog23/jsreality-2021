/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// LoggingInspector - UI for inspecting and configuring loggers.
// 
// Provides:
// - A tree view of logger names, grouped by dotted prefix (foo.bar.baz)
// - A property panel to view and edit per-logger log levels

import { UIManager } from './UIManager.js';
import { TreeViewManager } from './TreeViewManager.js';
import { InspectorTreeNode } from './SceneGraphTreeModel.js';
import { DescriptorRenderer } from './descriptors/DescriptorRenderer.js';
import { DescriptorType } from './descriptors/DescriptorTypes.js';
import {
  getLogger,
  getLoggerConfigs,
  setModuleLevel,
  clearModuleLevel,
  Level
} from '../util/LoggingSystem.js';

const logger = getLogger('jsreality.core.inspect.LoggingInspector');

const GROUP_PREFIX = 'group:';

/**
 * Simple, serializable view model for a logger.
 * @typedef {Object} LoggerConfig
 * @property {string} name
 * @property {number} effectiveLevel
 * @property {number|null} overrideLevel
 * @property {boolean} usesGlobalLevel
 * @property {number} enabledCategories
 */

/**
 * LoggingInspector - tree + property panel for loggers.
 */
export class LoggingInspector {
  /** @type {HTMLElement} */
  #container;

  /** @type {UIManager} */
  #uiManager;

  /** @type {TreeViewManager} */
  #treeViewManager;

  /** @type {HTMLElement} */
  #propertyPanel;

  /** @type {DescriptorRenderer} */
  #descriptorRenderer;

  /** @type {Map<string, LoggerConfig>} */
  #configs = new Map();

  /** @type {InspectorTreeNode|null} */
  #rootDescriptor = null;

  /**
   * Cached list of level entries for UI dropdowns.
   * @type {Array<{name: string, value: number}>}
   */
  #levelEntries;

  /**
   * @param {HTMLElement} container - Container element for the inspector UI
   * @param {{ title?: string }} [options] - Optional configuration (omit/empty title hides header)
   */
  constructor(container, options = {}) {
    this.#container = container;
    this.#uiManager = new UIManager(container);
    const { treeView, propertyPanel } = this.#uiManager.initializeUI(options.title ?? 'Loggers');
    this.#propertyPanel = propertyPanel;
    this.#descriptorRenderer = new DescriptorRenderer(propertyPanel);

    this.#levelEntries = this.#buildLevelEntries();

    const onNodeSelect = (node) => {
      this.#treeViewManager.setSelectedNode(node);
      this.#renderProperties(node);
    };

    const onNodeToggleExpand = () => {
      // TreeViewManager only updates its internal expanded set; we need to re-render.
      if (this.#rootDescriptor) {
        this.#treeViewManager.rebuildTree(this.#rootDescriptor);
      }
    };

    // We don't use shader nodes here, so supply a no-op factory.
    const createShaderTreeNodes = () => [];

    this.#treeViewManager = new TreeViewManager(
      treeView,
      onNodeSelect,
      onNodeToggleExpand,
      createShaderTreeNodes
    );

    this.refresh();
  }

  /**
   * Build a stable list of Level entries sorted by numeric value (low to high).
   * @returns {Array<{name: string, value: number}>}
   * @private
   */
  #buildLevelEntries() {
    const entries = Object.entries(Level)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.value - b.value);
    return entries;
  }

  /**
   * Refresh the inspector from the current logging configuration.
   */
  refresh() {
    try {
      const configs = getLoggerConfigs();
      this.#configs.clear();
      for (const cfg of configs) {
        this.#configs.set(cfg.name, cfg);
      }
      const rootDescriptor = this.#buildLoggerTree(configs);
      this.#rootDescriptor = rootDescriptor;
      this.#expandAllNodes(rootDescriptor);
      this.#treeViewManager.rebuildTree(rootDescriptor);
    } catch (e) {
      logger.severe(-1, 'Failed to refresh LoggingInspector:', e);
    }
  }

  /**
   * Build a hierarchical tree of loggers from their dotted names.
   * @param {LoggerConfig[]} configs
   * @returns {InspectorTreeNode}
   * @private
   */
  #buildLoggerTree(configs) {
    const root = new InspectorTreeNode({
      data: `${GROUP_PREFIX}`,
      label: 'Loggers',
      type: 'group',
      icon: '📂',
      children: []
    });

    /** @type {Map<string, InspectorTreeNode>} */
    const groupMap = new Map();
    groupMap.set('', root);

    for (const cfg of configs) {
      const parts = cfg.name.split('.');
      let currentPath = '';
      let parentNode = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLeaf = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}.${part}` : part;

        if (isLeaf) {
          // Logger node
          const loggerNode = new InspectorTreeNode({
            data: cfg.name,
            label: part,
            type: 'logger',
            icon: '📝',
            children: []
          });
          parentNode.addChild(loggerNode);
        } else {
          // Group node
          let groupNode = groupMap.get(currentPath);
          if (!groupNode) {
            groupNode = new InspectorTreeNode({
              data: `${GROUP_PREFIX}${currentPath}`,
              label: part,
              type: 'group',
              icon: '📂',
              children: []
            });
            groupMap.set(currentPath, groupNode);
            parentNode.addChild(groupNode);
          }
          parentNode = groupNode;
        }
      }
    }

    this.#sortTree(root);
    return root;
  }

  /**
   * Sort a descriptor tree in-place:
   * - groups first, then leaf loggers
   * - alphabetically by label (case-insensitive)
   * @param {InspectorTreeNode} descriptor
   * @private
   */
  #sortTree(descriptor) {
    if (!descriptor || !Array.isArray(descriptor.children)) return;

    descriptor.children.sort((a, b) => {
      const aIsGroup = typeof a?.data === 'string' && a.data.startsWith(GROUP_PREFIX);
      const bIsGroup = typeof b?.data === 'string' && b.data.startsWith(GROUP_PREFIX);
      if (aIsGroup !== bIsGroup) return aIsGroup ? -1 : 1;

      const aLabel = (a?.label ?? '').toLowerCase();
      const bLabel = (b?.label ?? '').toLowerCase();
      if (aLabel < bLabel) return -1;
      if (aLabel > bLabel) return 1;

      // Tie-breaker (stable-ish): compare full data string
      const aData = String(a?.data ?? '');
      const bData = String(b?.data ?? '');
      if (aData < bData) return -1;
      if (aData > bData) return 1;
      return 0;
    });

    for (const child of descriptor.children) {
      this.#sortTree(child);
    }
  }

  /**
   * Expand all nodes in the logging tree.
   * @param {InspectorTreeNode} descriptor
   * @private
   */
  #expandAllNodes(descriptor) {
    if (!descriptor) return;
    this.#treeViewManager.expandNode(descriptor.data);
    if (Array.isArray(descriptor.children)) {
      for (const child of descriptor.children) {
        this.#expandAllNodes(child);
      }
    }
  }

  /**
   * Render properties for the selected node.
   * TreeViewManager passes the node identity (descriptor.data) to callbacks.
   * For the LoggingInspector, node identities are stable strings:
   * - groups: "group:" or "group:foo.bar"
   * - loggers: "foo.bar.Baz"
   *
   * @param {string|null} node
   * @private
   */
  #renderProperties(node) {
    // Use DescriptorRenderer to ensure consistent look-and-feel with other inspectors.
    // We build descriptor groups and delegate DOM creation to the shared renderer.

    if (!node) {
      this.#descriptorRenderer.render([
        {
          id: 'logging-no-selection',
          title: 'Loggers',
          items: [
            {
              id: 'logging-no-selection-message',
              type: DescriptorType.LABEL,
              label: 'Info',
              getValue: () => 'Select a logger to view properties'
            }
          ]
        }
      ]);
      return;
    }

    if (typeof node === 'string' && node.startsWith(GROUP_PREFIX)) {
      const groupPath = node.slice(GROUP_PREFIX.length);
      this.#descriptorRenderer.render([
        {
          id: `logging-group-${groupPath || 'root'}`,
          title: `Group: ${groupPath || 'Loggers'}`,
          items: [
            {
              id: 'logging-group-hint',
              type: DescriptorType.LABEL,
              label: 'Info',
              getValue: () => 'Select a leaf logger node to edit its log level.'
            }
          ]
        }
      ]);
      return;
    }

    if (typeof node === 'string') {
      const cfg = this.#configs.get(node);

      if (!cfg) {
        this.#descriptorRenderer.render([
          {
            id: `logging-missing-${node}`,
            title: `Logger: ${node}`,
            items: [
              {
                id: 'logging-missing-hint',
                type: DescriptorType.LABEL,
                label: 'Info',
                getValue: () => 'No configuration found for this logger.'
              }
            ]
          }
        ]);
        return;
      }

      const groups = [
        {
          id: `logging-logger-${node}`,
          title: `Logger: ${node}`,
          items: [
            {
              id: 'logging-effective-level',
              type: DescriptorType.LABEL,
              label: 'Effective level',
              getValue: () =>
                this.#levelNameForValue(cfg.effectiveLevel) || `${cfg.effectiveLevel}`
            },
            {
              id: 'logging-override-level',
              type: DescriptorType.ENUM,
              label: 'Override level',
              options: [
                { value: '', label: 'Use global' },
                ...this.#levelEntries.map(entry => ({
                  value: entry.name,
                  label: entry.name
                }))
              ],
              getValue: () => {
                if (cfg.overrideLevel === null) return '';
                const name = this.#levelNameForValue(cfg.overrideLevel);
                return name || '';
              },
              setValue: (selected) => {
                if (!selected) {
                  clearModuleLevel(cfg.name);
                } else {
                  const entry = this.#levelEntries.find(e => e.name === selected);
                  if (entry) {
                    setModuleLevel(cfg.name, entry.value);
                  }
                }
                this.refresh();
              }
            },
            {
              id: 'logging-enabled-categories',
              type: DescriptorType.LABEL,
              label: 'Enabled categories',
              getValue: () => `${cfg.enabledCategories}`
            }
          ]
        }
      ];

      this.#descriptorRenderer.render(groups);
    }
  }

  /**
   * Map a numeric Level value back to its name.
   * @param {number} value
   * @returns {string|null}
   * @private
   */
  #levelNameForValue(value) {
    const entry = this.#levelEntries.find(e => e.value === value);
    return entry ? entry.name : null;
  }

  /**
   * Dispose of the inspector and its UI resources.
   */
  dispose() {
    this.#uiManager.dispose();
    this.#configs.clear();
  }
}

