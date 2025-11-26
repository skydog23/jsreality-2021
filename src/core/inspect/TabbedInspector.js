/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Tabbed Inspector - Wrapper for SceneGraphInspector with tabs for Scene Graph and Statistics

import { SceneGraphInspector } from './SceneGraphInspector.js';
import { RenderStatisticsPanel } from './RenderStatisticsPanel.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';

/** @typedef {import('../scene/Viewer.js').Viewer} Viewer */

/**
 * Tabbed inspector panel with Scene Graph and Statistics tabs
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
  #statisticsTab;

  /**
   * @type {HTMLElement}
   */
  #sceneGraphContent;

  /**
   * @type {HTMLElement}
   */
  #statisticsContent;

  /**
   * @type {string}
   */
  #activeTab = 'scene-graph';

  /**
   * Create a new TabbedInspector
   * @param {HTMLElement} container - The container element for the inspector
   * @param {SceneGraphComponent} [root] - The root scene graph component
   * @param {Viewer} [viewer] - Optional viewer reference for statistics
   */
  constructor(container, root = null, viewer = null) {
    this.#container = container;
    this.#root = root;
    this.#viewer = viewer;
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

    // Inject styles
    this.#injectStyles();

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

    // Create Statistics tab
    this.#statisticsTab = document.createElement('div');
    this.#statisticsTab.className = 'sg-tab';
    this.#statisticsTab.textContent = 'Statistics';
    this.#statisticsTab.dataset.tab = 'statistics';
    this.#statisticsTab.addEventListener('click', () => this.#switchTab('statistics'));

    this.#tabBar.appendChild(this.#sceneGraphTab);
    this.#tabBar.appendChild(this.#statisticsTab);

    // Create content area
    this.#contentArea = document.createElement('div');
    this.#contentArea.className = 'sg-tab-content-area';

    // Create Scene Graph content container
    this.#sceneGraphContent = document.createElement('div');
    this.#sceneGraphContent.className = 'sg-tab-content sg-tab-content-active';
    this.#sceneGraphContent.id = 'sg-scene-graph-content';

    // Create Statistics content container
    this.#statisticsContent = document.createElement('div');
    this.#statisticsContent.className = 'sg-tab-content';
    this.#statisticsContent.id = 'sg-statistics-content';

    this.#contentArea.appendChild(this.#sceneGraphContent);
    this.#contentArea.appendChild(this.#statisticsContent);

    // Assemble
    inspectorDiv.appendChild(this.#tabBar);
    inspectorDiv.appendChild(this.#contentArea);
    this.#container.appendChild(inspectorDiv);

    // Initialize Scene Graph Inspector
    this.#sceneGraphInspector = new SceneGraphInspector(this.#sceneGraphContent, this.#root);

    // Initialize Statistics Panel
    this.#statisticsPanel = new RenderStatisticsPanel(this.#statisticsContent, this.#viewer);
    this.#statisticsPanel.start();
  }

  /**
   * Switch between tabs
   * @private
   * @param {string} tabName - Name of the tab to switch to ('scene-graph' or 'statistics')
   */
  #switchTab(tabName) {
    if (this.#activeTab === tabName) return;

    // Update tab buttons
    this.#sceneGraphTab.classList.toggle('sg-tab-active', tabName === 'scene-graph');
    this.#statisticsTab.classList.toggle('sg-tab-active', tabName === 'statistics');

    // Update content visibility
    this.#sceneGraphContent.classList.toggle('sg-tab-content-active', tabName === 'scene-graph');
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
   * Inject CSS styles
   * @private
   */
  #injectStyles() {
    if (document.getElementById('sg-tabbed-inspector-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'sg-tabbed-inspector-styles';
    style.textContent = `
      .sg-tabbed-inspector {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        color: #cccccc;
        background: #1e1e1e;
        overflow: hidden;
      }
      
      .sg-tab-bar {
        display: flex;
        background: #2d2d2d;
        border-bottom: 1px solid #3e3e3e;
        flex-shrink: 0;
      }
      
      .sg-tab {
        padding: 10px 16px;
        cursor: pointer;
        user-select: none;
        font-size: 12px;
        font-weight: 500;
        color: #858585;
        border-bottom: 2px solid transparent;
        transition: color 0.2s, border-color 0.2s;
      }
      
      .sg-tab:hover {
        color: #cccccc;
        background: #252525;
      }
      
      .sg-tab.sg-tab-active {
        color: #ffffff;
        border-bottom-color: #007acc;
        background: #1e1e1e;
      }
      
      .sg-tab-content-area {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      
      .sg-tab-content {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: none;
        overflow: hidden;
      }
      
      .sg-tab-content.sg-tab-content-active {
        display: flex;
        flex-direction: column;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.#statisticsPanel) {
      this.#statisticsPanel.destroy();
    }
    if (this.#sceneGraphInspector) {
      // SceneGraphInspector doesn't have a destroy method, but we can clear the container
      if (this.#sceneGraphContent) {
        this.#sceneGraphContent.innerHTML = '';
      }
    }
  }
}

