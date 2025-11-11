// Scene Graph Inspector - Interactive UI for exploring and editing scene graphs
// Provides a tree view and property panel for SceneGraphComponent hierarchies

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Transformation } from '../scene/Transformation.js';
import { Appearance } from '../scene/Appearance.js';
import { Geometry } from '../scene/Geometry.js';
import { Camera } from '../scene/Camera.js';
import { Color } from '../util/Color.js';

/**
 * Interactive inspector for exploring and editing scene graph structures
 */
export class SceneGraphInspector {
  /**
   * @type {SceneGraphComponent|null}
   */
  #root = null;

  /**
   * @type {HTMLElement|null}
   */
  #container = null;

  /**
   * @type {HTMLElement|null}
   */
  #treeView = null;

  /**
   * @type {HTMLElement|null}
   */
  #propertyPanel = null;

  /**
   * @type {*|null} Currently selected node
   */
  #selectedNode = null;

  /**
   * @type {Map<*, HTMLElement>} Map from nodes to tree elements
   */
  #nodeElements = new Map();

  /**
   * @type {Set<*>} Expanded nodes
   */
  #expandedNodes = new Set();

  /**
   * Create a new SceneGraphInspector
   * @param {HTMLElement} container - The container element for the inspector
   * @param {SceneGraphComponent} root - The root scene graph component
   */
  constructor(container, root = null) {
    this.#container = container;
    this.#initializeUI();
    if (root) {
      this.setRoot(root);
    }
  }

  /**
   * Initialize the inspector UI
   * @private
   */
  #initializeUI() {
    // Clear container
    this.#container.innerHTML = '';
    
    // Add styles
    this.#injectStyles();
    
    // Create main layout
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
    
    // Create property panel
    const propPanel = document.createElement('div');
    propPanel.className = 'sg-property-panel';
    
    const propHeader = document.createElement('div');
    propHeader.className = 'sg-panel-header';
    propHeader.textContent = 'Properties';
    
    this.#propertyPanel = document.createElement('div');
    this.#propertyPanel.className = 'sg-properties';
    this.#propertyPanel.innerHTML = '<div class="sg-no-selection">Select a node to view properties</div>';
    
    propPanel.appendChild(propHeader);
    propPanel.appendChild(this.#propertyPanel);
    
    // Add panels to inspector
    inspectorDiv.appendChild(treePanel);
    inspectorDiv.appendChild(propPanel);
    
    // Add to container
    this.#container.appendChild(inspectorDiv);
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
        height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        background: #1e1e1e;
        color: #cccccc;
      }
      
      .sg-tree-panel {
        flex: 1;
        min-width: 250px;
        border-right: 1px solid #3e3e3e;
        display: flex;
        flex-direction: column;
      }
      
      .sg-property-panel {
        flex: 1;
        min-width: 300px;
        display: flex;
        flex-direction: column;
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
      }
      
      .sg-tree-node {
        user-select: none;
        cursor: pointer;
      }
      
      .sg-tree-node-header {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 3px;
        transition: background 0.1s;
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
      
      .sg-prop-value input[type="text"],
      .sg-prop-value input[type="number"] {
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
      
      /* Color picker styles - vertical layout with alpha */
      .sg-color-picker-container-vertical {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
      }
      
      /* Color picker styles - simple (no alpha) */
      .sg-color-picker-container-simple {
        display: flex;
        width: 100%;
      }
      
      .sg-color-input {
        width: 100%;
        height: 20px;
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
      
      /* Alpha slider styles */
      .sg-alpha-slider-container {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
      }
      
      .sg-alpha-slider-label {
        color: #9cdcfe;
        font-size: 11px;
        font-weight: 600;
        flex-shrink: 0;
        width: 12px;
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
    `;
    document.head.appendChild(style);
  }

  /**
   * Set the root scene graph component
   * @param {SceneGraphComponent} root - The root component
   */
  setRoot(root) {
    this.#root = root;
    this.#selectedNode = null;
    this.#nodeElements.clear();
    this.#rebuildTree();
  }

  /**
   * Rebuild the entire tree view
   * @private
   */
  #rebuildTree() {
    this.#treeView.innerHTML = '';
    if (this.#root) {
      this.#buildTreeNode(this.#root, this.#treeView);
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
    
    const header = document.createElement('div');
    header.className = 'sg-tree-node-header';
    if (node === this.#selectedNode) {
      header.classList.add('selected');
    }
    
    // Expand/collapse icon
    const expand = document.createElement('span');
    expand.className = 'sg-tree-expand';
    
    const hasChildren = node instanceof SceneGraphComponent && 
                       (node.getChildComponentCount() > 0 || 
                        node.getTransformation() || 
                        node.getAppearance() || 
                        node.getGeometry() ||
                        node.getCamera());
    
    if (hasChildren) {
      expand.textContent = this.#expandedNodes.has(node) ? '▼' : '▶';
      expand.onclick = (e) => {
        e.stopPropagation();
        this.#toggleExpand(node);
      };
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
    
    header.onclick = () => {
      this.#selectNode(node);
    };
    
    nodeDiv.appendChild(header);
    
    // Children container
    if (hasChildren) {
      const childrenDiv = document.createElement('div');
      childrenDiv.className = 'sg-tree-children';
      if (!this.#expandedNodes.has(node)) {
        childrenDiv.classList.add('collapsed');
      }
      
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
    this.#rebuildTree();
  }

  /**
   * Select a node
   * @param {*} node - The node to select
   * @private
   */
  #selectNode(node) {
    this.#selectedNode = node;
    this.#rebuildTree();
    this.#updatePropertyPanel(node);
  }

  /**
   * Update the property panel for selected node
   * @param {*} node - The selected node
   * @private
   */
  #updatePropertyPanel(node) {
    this.#propertyPanel.innerHTML = '';
    
    if (!node) {
      this.#propertyPanel.innerHTML = '<div class="sg-no-selection">Select a node to view properties</div>';
      return;
    }
    
    // Basic info
    this.#addPropertyGroup('Basic', [
      { label: 'Name', value: node.getName?.() || 'Unnamed', editable: false },
      { label: 'Type', value: this.#getNodeType(node), editable: false }
    ]);
    
    // Component-specific properties
    if (node instanceof SceneGraphComponent) {
      this.#addComponentProperties(node);
    } else if (node instanceof Transformation) {
      this.#addTransformationProperties(node);
    } else if (node instanceof Appearance) {
      this.#addAppearanceProperties(node);
    } else if (node instanceof Geometry) {
      this.#addGeometryProperties(node);
    } else if (node instanceof Camera) {
      this.#addCameraProperties(node);
    }
  }

  /**
   * Add a property group to the panel
   * @param {string} title - Group title
   * @param {Array<{label: string, value: *, editable: boolean}>} properties - Properties
   * @private
   */
  #addPropertyGroup(title, properties) {
    const group = document.createElement('div');
    group.className = 'sg-prop-group';
    
    const titleEl = document.createElement('div');
    titleEl.className = 'sg-prop-group-title';
    titleEl.textContent = title;
    group.appendChild(titleEl);
    
    for (const prop of properties) {
      const row = document.createElement('div');
      row.className = 'sg-prop-row';
      
      const label = document.createElement('div');
      label.className = 'sg-prop-label';
      label.textContent = prop.label;
      
      const value = document.createElement('div');
      value.className = 'sg-prop-value';
      
      if (typeof prop.value === 'boolean') {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = prop.value;
        checkbox.disabled = !prop.editable;
        if (prop.onChange) {
          checkbox.onchange = () => prop.onChange(checkbox.checked);
        }
        value.appendChild(checkbox);
      } else if (prop.value instanceof HTMLElement) {
        value.appendChild(prop.value);
      } else {
        value.textContent = String(prop.value);
      }
      
      row.appendChild(label);
      row.appendChild(value);
      group.appendChild(row);
    }
    
    this.#propertyPanel.appendChild(group);
  }

  /**
   * Add component-specific properties
   * @param {SceneGraphComponent} component - The component
   * @private
   */
  #addComponentProperties(component) {
    this.#addPropertyGroup('Component', [
      { 
        label: 'Visible', 
        value: component.isVisible(), 
        editable: true,
        onChange: (val) => {
          component.setVisible(val);
          // Trigger viewer render if available (for live preview)
          if (typeof window !== 'undefined' && window._viewerInstance) {
            window._viewerInstance.render();
          }
          this.#updatePropertyPanel(component);
        }
      },
      { 
        label: 'Pickable', 
        value: component.isPickable(), 
        editable: true,
        onChange: (val) => {
          component.setPickable(val);
          // Trigger viewer render if available (for live preview)
          if (typeof window !== 'undefined' && window._viewerInstance) {
            window._viewerInstance.render();
          }
          this.#updatePropertyPanel(component);
        }
      },
      { label: 'Children', value: component.getChildComponentCount(), editable: false }
    ]);
  }

  /**
   * Add transformation-specific properties
   * @param {Transformation} transform - The transformation
   * @private
   */
  #addTransformationProperties(transform) {
    const matrix = transform.getMatrix();
    
    // Create matrix grid
    const grid = document.createElement('div');
    grid.className = 'sg-matrix-grid';
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'sg-matrix-cell';
      cell.textContent = matrix[i].toFixed(3);
      grid.appendChild(cell);
    }
    
    this.#addPropertyGroup('Matrix (4×4)', [
      { label: '', value: grid, editable: false }
    ]);
  }

  /**
   * Add appearance-specific properties
   * @param {Appearance} appearance - The appearance
   * @private
   */
  #addAppearanceProperties(appearance) {
    const attrs = appearance.getStoredAttributes();
    const properties = [];
    
    for (const key of attrs) {
      const value = appearance.getAttribute(key);
      const propertyDef = this.#createEditableProperty(key, value, (newValue) => {
        // Update the appearance attribute
        appearance.setAttribute(key, newValue);
        // Trigger viewer render if available (for live preview)
        if (typeof window !== 'undefined' && window._viewerInstance) {
          window._viewerInstance.render();
        }
        // Refresh the property panel
        this.#updatePropertyPanel(appearance);
      });
      properties.push(propertyDef);
    }
    
    if (properties.length === 0) {
      properties.push({ label: '(empty)', value: 'No attributes set', editable: false });
    }
    
    this.#addPropertyGroup('Attributes', properties);
  }

  /**
   * Create an editable property definition based on value type
   * @param {string} label - Property label
   * @param {*} value - Property value
   * @param {Function} onChange - Change handler
   * @returns {Object} Property definition
   * @private
   */
  #createEditableProperty(label, value, onChange) {
    // Check if value is a Color object
    if (value instanceof Color) {
      return {
        label,
        value: this.#createColorPickerFromColor(value, onChange),
        editable: true
      };
    }
    
    // Check if value is a color array (array of 3 or 4 numbers)
    if (this.#isColorArray(value)) {
      return {
        label,
        value: this.#createColorPicker(value, onChange),
        editable: true
      };
    }
    
    // Check for boolean
    if (typeof value === 'boolean') {
      return {
        label,
        value,
        editable: true,
        onChange
      };
    }
    
    // Check for number
    if (typeof value === 'number') {
      return {
        label,
        value: this.#createNumberInput(value, onChange),
        editable: true
      };
    }
    
    // Check for string
    if (typeof value === 'string') {
      return {
        label,
        value: this.#createTextInput(value, onChange),
        editable: true
      };
    }
    
    // Default: non-editable formatted value
    return {
      label,
      value: this.#formatValue(value),
      editable: false
    };
  }

  /**
   * Check if value is a color array
   * @param {*} value - Value to check
   * @returns {boolean}
   * @private
   */
  #isColorArray(value) {
    if (!Array.isArray(value)) return false;
    if (value.length !== 3 && value.length !== 4) return false;
    return value.every(v => typeof v === 'number');
  }

  /**
   * Create a color picker widget for Color objects
   * @param {Color} colorObj - Color object
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement}
   * @private
   */
  #createColorPickerFromColor(colorObj, onChange) {
    const container = document.createElement('div');
    container.className = 'sg-color-picker-container-vertical';
    
    // Color input (HTML5 color picker)
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = colorObj.toHexString();
    colorInput.className = 'sg-color-input';
    
    // Alpha slider container
    const alphaContainer = document.createElement('div');
    alphaContainer.className = 'sg-alpha-slider-container';
    
    const alphaLabel = document.createElement('span');
    alphaLabel.className = 'sg-alpha-slider-label';
    alphaLabel.textContent = 'α';
    
    const alphaSlider = document.createElement('input');
    alphaSlider.type = 'range';
    alphaSlider.min = '0';
    alphaSlider.max = '255';
    alphaSlider.step = '1';
    alphaSlider.value = colorObj.a;
    alphaSlider.className = 'sg-alpha-slider';
    
    const alphaValue = document.createElement('span');
    alphaValue.className = 'sg-alpha-value';
    alphaValue.textContent = colorObj.a;
    
    // Update handler for color
    colorInput.addEventListener('change', () => {
      const hex = colorInput.value;
      const r = parseInt(hex.substr(1, 2), 16);
      const g = parseInt(hex.substr(3, 2), 16);
      const b = parseInt(hex.substr(5, 2), 16);
      
      const newColor = new Color(r, g, b, parseInt(alphaSlider.value, 10));
      onChange(newColor);
    });
    
    // Update handler for alpha slider
    alphaSlider.addEventListener('input', () => {
      alphaValue.textContent = alphaSlider.value;
    });
    
    alphaSlider.addEventListener('change', () => {
      const hex = colorInput.value;
      const r = parseInt(hex.substr(1, 2), 16);
      const g = parseInt(hex.substr(3, 2), 16);
      const b = parseInt(hex.substr(5, 2), 16);
      
      const alpha = parseInt(alphaSlider.value, 10);
      const newColor = new Color(r, g, b, alpha);
      onChange(newColor);
    });
    
    alphaContainer.appendChild(alphaLabel);
    alphaContainer.appendChild(alphaSlider);
    alphaContainer.appendChild(alphaValue);
    
    container.appendChild(colorInput);
    container.appendChild(alphaContainer);
    
    return container;
  }

  /**
   * Create a color picker widget
   * @param {number[]} colorArray - Color as array [r,g,b] or [r,g,b,a]
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement}
   * @private
   */
  #createColorPicker(colorArray, onChange) {
    const container = document.createElement('div');
    container.className = colorArray.length === 4 ? 'sg-color-picker-container-vertical' : 'sg-color-picker-container-simple';
    
    // Normalize color to 0-255 range if needed
    const normalized = colorArray.map(v => v <= 1 ? Math.round(v * 255) : v);
    const r = Math.min(255, Math.max(0, normalized[0]));
    const g = Math.min(255, Math.max(0, normalized[1]));
    const b = Math.min(255, Math.max(0, normalized[2]));
    const wasNormalized = colorArray[0] <= 1;
    
    // Color input (HTML5 color picker)
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    colorInput.className = 'sg-color-input';
    
    // Alpha channel slider (if RGBA)
    if (colorArray.length === 4) {
      const alphaContainer = document.createElement('div');
      alphaContainer.className = 'sg-alpha-slider-container';
      
      const alphaLabel = document.createElement('span');
      alphaLabel.className = 'sg-alpha-slider-label';
      alphaLabel.textContent = 'α';
      
      const alphaSlider = document.createElement('input');
      alphaSlider.type = 'range';
      alphaSlider.min = '0';
      alphaSlider.max = wasNormalized ? '100' : '255';
      alphaSlider.step = '1';
      const currentAlpha = wasNormalized ? Math.round(colorArray[3] * 100) : Math.round(colorArray[3]);
      alphaSlider.value = currentAlpha;
      alphaSlider.className = 'sg-alpha-slider';
      
      const alphaValue = document.createElement('span');
      alphaValue.className = 'sg-alpha-value';
      alphaValue.textContent = wasNormalized ? colorArray[3].toFixed(2) : Math.round(colorArray[3]);
      
      // Update handler for color
      colorInput.addEventListener('change', () => {
        const hex = colorInput.value;
        const r = parseInt(hex.substr(1, 2), 16);
        const g = parseInt(hex.substr(3, 2), 16);
        const b = parseInt(hex.substr(5, 2), 16);
        
        const alpha = wasNormalized 
          ? parseInt(alphaSlider.value, 10) / 100
          : parseInt(alphaSlider.value, 10);
        
        const newColor = wasNormalized 
          ? [r / 255, g / 255, b / 255, alpha]
          : [r, g, b, alpha];
        
        onChange(newColor);
      });
      
      // Update handler for alpha slider
      alphaSlider.addEventListener('input', () => {
        const displayValue = wasNormalized 
          ? (parseInt(alphaSlider.value, 10) / 100).toFixed(2)
          : alphaSlider.value;
        alphaValue.textContent = displayValue;
      });
      
      alphaSlider.addEventListener('change', () => {
        const hex = colorInput.value;
        const r = parseInt(hex.substr(1, 2), 16);
        const g = parseInt(hex.substr(3, 2), 16);
        const b = parseInt(hex.substr(5, 2), 16);
        
        const alpha = wasNormalized 
          ? parseInt(alphaSlider.value, 10) / 100
          : parseInt(alphaSlider.value, 10);
        
        const newColor = wasNormalized 
          ? [r / 255, g / 255, b / 255, alpha]
          : [r, g, b, alpha];
        
        onChange(newColor);
      });
      
      alphaContainer.appendChild(alphaLabel);
      alphaContainer.appendChild(alphaSlider);
      alphaContainer.appendChild(alphaValue);
      
      container.appendChild(colorInput);
      container.appendChild(alphaContainer);
    } else {
      // RGB only
      colorInput.addEventListener('change', () => {
        const hex = colorInput.value;
        const r = parseInt(hex.substr(1, 2), 16);
        const g = parseInt(hex.substr(3, 2), 16);
        const b = parseInt(hex.substr(5, 2), 16);
        
        const newColor = wasNormalized 
          ? [r / 255, g / 255, b / 255]
          : [r, g, b];
        
        onChange(newColor);
      });
      
      container.appendChild(colorInput);
    }
    
    return container;
  }

  /**
   * Create a number input widget
   * @param {number} value - Number value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement}
   * @private
   */
  #createNumberInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.className = 'sg-number-input';
    
    // Determine if integer or float
    if (Number.isInteger(value)) {
      input.step = '1';
    } else {
      input.step = 'any';
    }
    
    input.addEventListener('change', () => {
      const newValue = Number.isInteger(value) 
        ? parseInt(input.value, 10)
        : parseFloat(input.value);
      
      if (!isNaN(newValue)) {
        onChange(newValue);
      }
    });
    
    // Also update on blur for better UX
    input.addEventListener('blur', () => {
      input.dispatchEvent(new Event('change'));
    });
    
    return input;
  }

  /**
   * Create a text input widget
   * @param {string} value - String value
   * @param {Function} onChange - Change handler
   * @returns {HTMLElement}
   * @private
   */
  #createTextInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.className = 'sg-text-input';
    
    input.addEventListener('change', () => {
      onChange(input.value);
    });
    
    input.addEventListener('blur', () => {
      input.dispatchEvent(new Event('change'));
    });
    
    return input;
  }

  /**
   * Add geometry-specific properties
   * @param {Geometry} geometry - The geometry
   * @private
   */
  #addGeometryProperties(geometry) {
    const properties = [];
    
    // Check geometry type and show appropriate counts
    const geometryType = geometry.constructor.name;
    
    // All geometry types have points/vertices
    if (typeof geometry.getNumPoints === 'function') {
      properties.push({ label: 'Vertex Count', value: geometry.getNumPoints(), editable: false });
    }
    
    // IndexedLineSet and IndexedFaceSet have edges
    if (geometryType === 'IndexedLineSet' || geometryType === 'IndexedFaceSet') {
      if (typeof geometry.getNumEdges === 'function') {
        properties.push({ label: 'Edge Count', value: geometry.getNumEdges(), editable: false });
      }
    }
    
    // Only IndexedFaceSet has faces
    if (geometryType === 'IndexedFaceSet') {
      if (typeof geometry.getNumFaces === 'function') {
        properties.push({ label: 'Face Count', value: geometry.getNumFaces(), editable: false });
      }
    }
    
    this.#addPropertyGroup('Geometry', properties);
    
    // Geometry attributes
    const geomAttrs = geometry.getGeometryAttributes();
    const attrProps = [];
    for (const [key, value] of geomAttrs) {
      attrProps.push({
        label: key,
        value: this.#formatValue(value),
        editable: false
      });
    }
    
    if (attrProps.length > 0) {
      this.#addPropertyGroup('Geometry Attributes', attrProps);
    }
  }

  /**
   * Add camera-specific properties
   * @param {Camera} camera - The camera
   * @private
   */
  #addCameraProperties(camera) {
    this.#addPropertyGroup('Camera', [
      { label: 'Perspective', value: camera.isPerspective(), editable: false },
      { label: 'Field of View', value: camera.getFieldOfView()?.toFixed(2) || 'N/A', editable: false },
      { label: 'Near', value: camera.getNear()?.toFixed(3) || 'N/A', editable: false },
      { label: 'Far', value: camera.getFar()?.toFixed(3) || 'N/A', editable: false }
    ]);
  }

  /**
   * Format a value for display
   * @param {*} value - The value
   * @returns {string}
   * @private
   */
  #formatValue(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length <= 4) return `[${value.map(v => v.toFixed?.(2) || v).join(', ')}]`;
        return `Array(${value.length})`;
      }
      return value.toString();
    }
    if (typeof value === 'number') {
      return value.toFixed(3);
    }
    return String(value);
  }

  /**
   * Refresh the inspector (rebuild tree and property panel)
   */
  refresh() {
    this.#rebuildTree();
    if (this.#selectedNode) {
      this.#updatePropertyPanel(this.#selectedNode);
    }
  }
}

