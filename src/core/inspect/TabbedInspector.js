/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Tabbed Inspector - Wrapper for multiple inspector panels in a tabbed UI.

import { SceneGraphInspector } from './SceneGraphInspector.js';
import { LoggingInspector } from './LoggingInspector.js';
import { RenderStatisticsPanel } from './RenderStatisticsPanel.js';
import { InspectorStylesheetManager } from './InspectorStylesheetManager.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';

/** @typedef {import('../scene/Viewer.js').Viewer} Viewer */

/**
 * @typedef {{
 *   onRender?: Function
 * }} TabbedInspectorOptions
 */

/**
 * Tabbed inspector panel with Scene Graph, Logging, and Statistics tabs
 */
export class TabbedInspector {
  /**
   * @type {HTMLElement}
   */
  #container;

  /**
   * @type {SceneGraphComponent|null}
   */
  #root = null;

  /**
   * @type {Viewer|null}
   */
  #viewer = null;

  /**
   * @type {HTMLElement}
   */
  #tabBar;

  /**
   * @type {HTMLElement}
   */
  #contentArea;

  /**
   * @type {SceneGraphInspector|null}
   */
  #sceneGraphInspector = null;

  /**
   * @type {LoggingInspector|null}
   */
  #loggingInspector = null;

  /**
   * @type {RenderStatisticsPanel|null}
   */
  #statisticsPanel = null;

  /**
   * @type {HTMLElement}
   */
  #sceneGraphTab;

  /**
   * @type {HTMLElement}
   */
  #loggingTab;

  /**
   * @type {HTMLElement}
   */
  #statisticsTab;

  /**
   * @type {HTMLElement}
   */
  #sceneGraphContent;

  /**
   * @type {HTMLElement}
   */
  #loggingContent;

  /**
   * @type {HTMLElement}
   */
  #statisticsContent;

  /**
   * @type {string}
   */
  #activeTab = 'scene-graph';

  /** @type {InspectorStylesheetManager} */
  #stylesheetManager = InspectorStylesheetManager.getInstance();

  /** @type {TabbedInspectorOptions} */
  #sceneGraphOptions = {};

  /**
   * Create a new TabbedInspector
   * @param {HTMLElement} container - The container element for the inspector
   * @param {SceneGraphComponent} [root] - The root scene graph component
   * @param {Viewer} [viewer] - Optional viewer reference for statistics
   * @param {TabbedInspectorOptions} [options] - Options passed to SceneGraphInspector
   */
  constructor(container, root = null, viewer = null, options = {}) {
    this.#container = container;
    this.#root = root;
    this.#viewer = viewer;
    // In a tabbed context the tab label already provides the panel title, so default to hidden header.
    this.#sceneGraphOptions = { ...(options || {}), title: options?.title ?? '' };
    this.#stylesheetManager.acquire();
    this.#initializeUI();
    
    if (root) {
      this.setRoot(root);
    }
  }

  /**
   * Initialize the tabbed UI
   * @private
   */
  #initializeUI() {
    // Clear container
    this.#container.innerHTML = '';

    // Create main container
    const inspectorDiv = document.createElement('div');
    inspectorDiv.className = 'sg-tabbed-inspector';

    // Create tab bar
    this.#tabBar = document.createElement('div');
    this.#tabBar.className = 'sg-tab-bar';

    // Create Scene Graph tab
    this.#sceneGraphTab = document.createElement('div');
    this.#sceneGraphTab.className = 'sg-tab sg-tab-active';
    this.#sceneGraphTab.textContent = 'Scene Graph';
    this.#sceneGraphTab.dataset.tab = 'scene-graph';
    this.#sceneGraphTab.addEventListener('click', () => this.#switchTab('scene-graph'));

    // Create Logging tab
    this.#loggingTab = document.createElement('div');
    this.#loggingTab.className = 'sg-tab';
    this.#loggingTab.textContent = 'Logging';
    this.#loggingTab.dataset.tab = 'logging';
    this.#loggingTab.addEventListener('click', () => this.#switchTab('logging'));

    // Create Statistics tab
    this.#statisticsTab = document.createElement('div');
    this.#statisticsTab.className = 'sg-tab';
    this.#statisticsTab.textContent = 'Statistics';
    this.#statisticsTab.dataset.tab = 'statistics';
    this.#statisticsTab.addEventListener('click', () => this.#switchTab('statistics'));

    this.#tabBar.appendChild(this.#sceneGraphTab);
    this.#tabBar.appendChild(this.#loggingTab);
    this.#tabBar.appendChild(this.#statisticsTab);

    // Create content area
    this.#contentArea = document.createElement('div');
    this.#contentArea.className = 'sg-tab-content-area';

    // Create Scene Graph content container
    this.#sceneGraphContent = document.createElement('div');
    this.#sceneGraphContent.className = 'sg-tab-content sg-tab-content-active';
    this.#sceneGraphContent.id = 'sg-scene-graph-content';

    // Create Logging content container
    this.#loggingContent = document.createElement('div');
    this.#loggingContent.className = 'sg-tab-content';
    this.#loggingContent.id = 'sg-logging-content';

    // Create Statistics content container
    this.#statisticsContent = document.createElement('div');
    this.#statisticsContent.className = 'sg-tab-content';
    this.#statisticsContent.id = 'sg-statistics-content';

    this.#contentArea.appendChild(this.#sceneGraphContent);
    this.#contentArea.appendChild(this.#loggingContent);
    this.#contentArea.appendChild(this.#statisticsContent);

    // Assemble
    inspectorDiv.appendChild(this.#tabBar);
    inspectorDiv.appendChild(this.#contentArea);
    this.#container.appendChild(inspectorDiv);

    // Initialize Scene Graph Inspector
    this.#sceneGraphInspector = new SceneGraphInspector(
      this.#sceneGraphContent,
      this.#root,
      this.#sceneGraphOptions
    );

    // Initialize Logging Inspector
    this.#loggingInspector = new LoggingInspector(this.#loggingContent, { title: '' });

    // Initialize Statistics Panel
    this.#statisticsPanel = new RenderStatisticsPanel(this.#statisticsContent, this.#viewer);
    this.#statisticsPanel.start();
  }

  /**
   * Switch between tabs
   * @private
   * @param {string} tabName - Name of the tab to switch to ('scene-graph', 'logging', or 'statistics')
   */
  #switchTab(tabName) {
    if (this.#activeTab === tabName) return;

    // Update tab buttons
    this.#sceneGraphTab.classList.toggle('sg-tab-active', tabName === 'scene-graph');
    this.#loggingTab.classList.toggle('sg-tab-active', tabName === 'logging');
    this.#statisticsTab.classList.toggle('sg-tab-active', tabName === 'statistics');

    // Update content visibility
    this.#sceneGraphContent.classList.toggle('sg-tab-content-active', tabName === 'scene-graph');
    this.#loggingContent.classList.toggle('sg-tab-content-active', tabName === 'logging');
    this.#statisticsContent.classList.toggle('sg-tab-content-active', tabName === 'statistics');

    this.#activeTab = tabName;
  }

  /**
   * Set the root scene graph component
   * @param {SceneGraphComponent} root - The root component
   */
  setRoot(root) {
    this.#root = root;
    if (this.#sceneGraphInspector) {
      this.#sceneGraphInspector.setRoot(root);
    }
  }

  /**
   * Set the viewer reference for statistics
   * @param {Viewer} viewer - The viewer instance
   */
  setViewer(viewer) {
    this.#viewer = viewer;
    if (this.#statisticsPanel) {
      this.#statisticsPanel.setViewer(viewer);
    }
  }

  /**
   * Refresh the inspector
   */
  refresh() {
    if (this.#sceneGraphInspector) {
      this.#sceneGraphInspector.refresh();
    }
    this.#loggingInspector?.refresh();
  }

  /**
   * Get the SceneGraphInspector instance
   * @returns {SceneGraphInspector}
   */
  getSceneGraphInspector() {
    return this.#sceneGraphInspector;
  }

  /**
   * Get the RenderStatisticsPanel instance
   * @returns {RenderStatisticsPanel}
   */
  getStatisticsPanel() {
    return this.#statisticsPanel;
  }

  /**
   * Get the LoggingInspector instance
   * @returns {LoggingInspector}
   */
  getLoggingInspector() {
    return this.#loggingInspector;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.#statisticsPanel) {
      this.#statisticsPanel.destroy();
    }
    if (this.#loggingInspector) {
      this.#loggingInspector.dispose();
    }
    if (this.#sceneGraphInspector) {
      this.#sceneGraphInspector.dispose?.();
    }
    this.#stylesheetManager.release();
  }
}

