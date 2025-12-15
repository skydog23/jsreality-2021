/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// LoggingInspector - UI for inspecting and configuring loggers.
// 
// Provides:
// - A tree view of logger names, grouped by dotted prefix (foo.bar.baz)
// - A property panel to view and edit per-logger log levels

import { UIManager } from './UIManager.js';
import { TreeViewManager } from './TreeViewManager.js';
import { InspectorTreeNode } from './SceneGraphTreeModel.js';
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
   */
  constructor(container) {
    this.#container = container;
    this.#uiManager = new UIManager(container);
    const { treeView, propertyPanel } = this.#uiManager.initializeUI('Loggers');
    this.#propertyPanel = propertyPanel;

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
    const panel = this.#propertyPanel;
    panel.innerHTML = '';

    if (!node) {
      const empty = document.createElement('div');
      empty.className = 'sg-no-selection';
      empty.textContent = 'Select a logger to view properties';
      panel.appendChild(empty);
      return;
    }

    if (typeof node === 'string' && node.startsWith(GROUP_PREFIX)) {
      const groupPath = node.slice(GROUP_PREFIX.length);
      const title = document.createElement('div');
      title.className = 'sg-section-title';
      title.textContent = `Group: ${groupPath || 'Loggers'}`;
      panel.appendChild(title);

      const hint = document.createElement('div');
      hint.className = 'sg-hint';
      hint.textContent = 'Select a leaf logger node to edit its log level.';
      panel.appendChild(hint);
      return;
    }

    if (typeof node === 'string') {
      const cfg = this.#configs.get(node);

      const title = document.createElement('div');
      title.className = 'sg-section-title';
      title.textContent = `Logger: ${node}`;
      panel.appendChild(title);

      if (!cfg) {
        const missing = document.createElement('div');
        missing.className = 'sg-hint';
        missing.textContent = 'No configuration found for this logger.';
        panel.appendChild(missing);
        return;
      }

      // Effective level display
      const effectiveRow = document.createElement('div');
      effectiveRow.className = 'sg-property-row';
      const effectiveLabel = document.createElement('div');
      effectiveLabel.className = 'sg-property-label';
      effectiveLabel.textContent = 'Effective level';
      const effectiveValue = document.createElement('div');
      effectiveValue.className = 'sg-property-value';
      effectiveValue.textContent = this.#levelNameForValue(cfg.effectiveLevel) || `${cfg.effectiveLevel}`;
      effectiveRow.appendChild(effectiveLabel);
      effectiveRow.appendChild(effectiveValue);
      panel.appendChild(effectiveRow);

      // Override level dropdown
      const overrideRow = document.createElement('div');
      overrideRow.className = 'sg-property-row';
      const overrideLabel = document.createElement('label');
      overrideLabel.className = 'sg-property-label';
      overrideLabel.textContent = 'Override level';

      const select = document.createElement('select');
      select.className = 'sg-property-input';

      const globalOption = document.createElement('option');
      globalOption.value = '';
      globalOption.textContent = 'Use global';
      select.appendChild(globalOption);

      for (const entry of this.#levelEntries) {
        const option = document.createElement('option');
        option.value = entry.name;
        option.textContent = entry.name;
        select.appendChild(option);
      }

      if (cfg.overrideLevel === null) {
        select.value = '';
      } else {
        const name = this.#levelNameForValue(cfg.overrideLevel);
        if (name) {
          select.value = name;
        }
      }

      select.addEventListener('change', () => {
        const selected = select.value;
        if (!selected) {
          clearModuleLevel(cfg.name);
        } else {
          const entry = this.#levelEntries.find(e => e.name === selected);
          if (entry) {
            setModuleLevel(cfg.name, entry.value);
          }
        }
        this.refresh();
      });

      overrideRow.appendChild(overrideLabel);
      overrideRow.appendChild(select);
      panel.appendChild(overrideRow);

      // Categories (read-only for now)
      const catRow = document.createElement('div');
      catRow.className = 'sg-property-row';
      const catLabel = document.createElement('div');
      catLabel.className = 'sg-property-label';
      catLabel.textContent = 'Enabled categories';
      const catValue = document.createElement('div');
      catValue.className = 'sg-property-value';
      catValue.textContent = `${cfg.enabledCategories}`;
      catRow.appendChild(catLabel);
      catRow.appendChild(catValue);
      panel.appendChild(catRow);
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

