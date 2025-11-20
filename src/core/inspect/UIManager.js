// UI Manager - handles DOM setup, styling, and layout

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
   * @type {HTMLElement}
   */
  #treeView;
  
  /**
   * @type {HTMLElement}
   */
  #propertyPanel;
  
  /**
   * @param {HTMLElement} container - The container element
   */
  constructor(container) {
    this.#container = container;
  }
  
  /**
   * Initialize the inspector UI
   * @returns {{treeView: HTMLElement, propertyPanel: HTMLElement}}
   */
  initializeUI() {
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
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        color: #cccccc;
        background: #1e1e1e;
        overflow: hidden;
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
}

