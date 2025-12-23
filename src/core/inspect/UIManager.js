/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// UI Manager - handles DOM setup, styling, and layout

import { InspectorStylesheetManager } from './InspectorStylesheetManager.js';

/**
 * Manages the UI setup for the SceneGraphInspector
 * Handles DOM creation, styling injection, and resizable divider
 */
export class UIManager {
  /**
   * @type {HTMLElement}
   */
  #container;
  
  /**
   * @type {InspectorStylesheetManager}
   */
  #stylesheetManager = InspectorStylesheetManager.getInstance();
  
  /**
   * @type {HTMLElement}
   */
  #treeView;
  
  /**
   * @type {HTMLElement}
   */
  #propertyPanel;

  /**
   * @type {Function|null}
   */
  #dividerCleanup = null;
  
  /**
   * @param {HTMLElement} container - The container element
   */
  constructor(container) {
    this.#container = container;
    this.#stylesheetManager.acquire();
  }
  
  /**
   * Initialize the inspector UI.
   * @param {string} [title='Scene Graph'] - Title for the tree view header (omit/empty to hide header)
   * @returns {{treeView: HTMLElement, propertyPanel: HTMLElement}}
   */
  initializeUI(title = 'Scene Graph') {
    // Clear container
    this.#container.innerHTML = '';
    
    // Create main layout (vertical split)
    const inspectorDiv = document.createElement('div');
    inspectorDiv.className = 'sg-inspector';
    
    // Create tree view panel
    const treePanel = document.createElement('div');
    treePanel.className = 'sg-tree-panel';
    
    this.#treeView = document.createElement('div');
    this.#treeView.className = 'sg-tree-view';
    
    // Optional header (tabs already provide context in some UIs)
    if (title) {
      const treeHeader = document.createElement('div');
      treeHeader.className = 'sg-panel-header';
      treeHeader.textContent = title;
      treePanel.appendChild(treeHeader);
    }
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
    
    return {
      treeView: this.#treeView,
      propertyPanel: this.#propertyPanel
    };
  }
  
  /**
   * Get the tree view element
   * @returns {HTMLElement}
   */
  getTreeView() {
    return this.#treeView;
  }
  
  /**
   * Get the property panel element
   * @returns {HTMLElement}
   */
  getPropertyPanel() {
    return this.#propertyPanel;
  }
  
  /**
   * Setup the resizable divider
   * @param {HTMLElement} divider
   * @param {HTMLElement} topPanel
   * @param {HTMLElement} bottomPanel
   * @private
   */
  #setupDivider(divider, topPanel, bottomPanel) {
    if (this.#dividerCleanup) {
      this.#dividerCleanup();
    }

    let isDragging = false;
    let startY = 0;
    let startTopHeight = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      startY = e.clientY;
      startTopHeight = topPanel.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    const onMouseMove = (e) => {
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
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    divider.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    this.#dividerCleanup = () => {
      divider.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this.#dividerCleanup = null;
    };
  }

  /**
   * Clean up DOM listeners and shared resources.
   */
  dispose() {
    if (this.#dividerCleanup) {
      this.#dividerCleanup();
    }
    this.#stylesheetManager.release();
  }
}

