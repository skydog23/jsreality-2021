/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Property Panel Manager - coordinates property display for different node types

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Transformation } from '../scene/Transformation.js';
import { Appearance } from '../scene/Appearance.js';
import { Geometry } from '../scene/Geometry.js';
import { Camera } from '../scene/Camera.js';
import { FactoredMatrix } from '../math/FactoredMatrix.js';
import * as Pn from '../math/Pn.js';
import { VectorWidget } from './widgets/index.js';
import { WidgetFactory } from './WidgetFactory.js';
import { formatValue } from './PropertyFormatters.js';
import { ShaderTreeNode } from './TreeViewManager.js';
import { ShaderPropertyManager } from './ShaderPropertyManager.js';

/**
 * Manages the property panel for the SceneGraphInspector
 * Coordinates property display for different node types
 */
export class PropertyPanelManager {
  /**
   * @type {HTMLElement}
   */
  #propertyPanel;
  
  /**
   * @type {WidgetFactory}
   */
  #widgetFactory;
  
  /**
   * @type {ShaderPropertyManager}
   */
  #shaderPropertyManager;
  
  /**
   * @type {Function}
   */
  #onPropertyChange;
  
  /**
   * @type {Function}
   */
  #onRefreshPropertyPanel;
  
  /**
   * @param {HTMLElement} propertyPanel - The property panel DOM element
   * @param {WidgetFactory} widgetFactory - Widget factory instance
   * @param {ShaderPropertyManager} shaderPropertyManager - Shader property manager instance
   * @param {Function} onPropertyChange - Callback when a property changes
   * @param {Function} onRefreshPropertyPanel - Callback to refresh property panel
   */
  constructor(propertyPanel, widgetFactory, shaderPropertyManager, onPropertyChange, onRefreshPropertyPanel) {
    this.#propertyPanel = propertyPanel;
    this.#widgetFactory = widgetFactory;
    this.#shaderPropertyManager = shaderPropertyManager;
    this.#onPropertyChange = onPropertyChange;
    this.#onRefreshPropertyPanel = onRefreshPropertyPanel;
  }
  
  /**
   * Update the property panel for selected node
   * @param {*} node - The selected node
   */
  updatePropertyPanel(node) {
    this.#propertyPanel.innerHTML = '';
    
    if (!node) {
      this.#propertyPanel.innerHTML = '<div class="sg-no-selection">Select a node to view properties</div>';
      return;
    }
    
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
    } else if (node instanceof ShaderTreeNode) {
      this.#shaderPropertyManager.addShaderProperties(node, this.#propertyPanel);
    }
  }
  
  /**
   * Add a property group to the panel
   * @param {string} title - Group title
   * @param {Array<{label: string, value: *, editable: boolean, onChange?: Function}>} properties - Properties
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
          this.#onPropertyChange();
          this.#onRefreshPropertyPanel(component);
        }
      },
      { 
        label: 'Pickable', 
        value: component.isPickable(), 
        editable: true,
        onChange: (val) => {
          component.setPickable(val);
          this.#onPropertyChange();
          this.#onRefreshPropertyPanel(component);
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
    
    // Use FactoredMatrix to decompose the transformation
    const fm = new FactoredMatrix(Pn.EUCLIDEAN, matrix);
    
    // Get decomposed values
    const translation = fm.getTranslation(); // [x, y, z, 1]
    const stretch = fm.getStretch();         // [sx, sy, sz, 1]
    const angle = fm.getRotationAngle();     // radians
    const axis = fm.getRotationAxis();       // [x, y, z]
    
    // Helper to update the transformation
    const updateTransform = () => {
      const newMatrix = fm.getArray();
      transform.setMatrix(newMatrix);
      this.#onPropertyChange();
      this.#onRefreshPropertyPanel(transform);
    };
    
    // Position (Translation) - VectorWidget (direct append, no wrapper)
    const positionWidget = new VectorWidget(
      [translation[0], translation[1], translation[2]],
      ['X', 'Y', 'Z'],
      (newVector) => {
        fm.setTranslation(newVector[0], newVector[1], newVector[2]);
        updateTransform();
      },
      'Position'
    );
    this.#propertyPanel.appendChild(positionWidget.getElement());
    
    // Rotation - Combined Angle + Axis in single border
    const angleDegrees = angle * 180 / Math.PI;
    const rotationContainer = document.createElement('div');
    rotationContainer.className = 'sg-rotation-container';
    rotationContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 6px 8px;
      background: #2a2a2a;
      border: 1px solid #555;
      border-radius: 4px;
      margin-top: 8px;
    `;
    
    // Rotation label
    const rotationLabel = document.createElement('div');
    rotationLabel.style.cssText = `
      color: #4ec9b0;
      font-size: 11px;
      font-weight: 600;
    `;
    rotationLabel.textContent = 'Rotation:';
    rotationContainer.appendChild(rotationLabel);
    
    // Angle row
    const angleRow = document.createElement('div');
    angleRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    const angleLabel = document.createElement('span');
    angleLabel.style.cssText = `
      color: #9cdcfe;
      font-size: 11px;
      font-weight: 600;
    `;
    angleLabel.textContent = 'Angle (°):';
    const angleInput = this.#widgetFactory.createNumberInput(angleDegrees, (val) => {
      const angleRad = val * Math.PI / 180;
      const currentAxis = fm.getRotationAxis();
      fm.setRotation(angleRad, currentAxis);
      updateTransform();
    });
    angleRow.appendChild(angleLabel);
    angleRow.appendChild(angleInput);
    rotationContainer.appendChild(angleRow);
    
    // Axis VectorWidget (without group label since it's in the container)
    const rotationAxisWidget = new VectorWidget(
      [axis[0], axis[1], axis[2]],
      ['X', 'Y', 'Z'],
      (newAxis) => {
        const currentAngle = fm.getRotationAngle();
        fm.setRotation(currentAngle, newAxis);
        updateTransform();
      },
      'Axis'
    );
    rotationContainer.appendChild(rotationAxisWidget.getElement());
    this.#propertyPanel.appendChild(rotationContainer);
    
    // Scale (Stretch) - VectorWidget (direct append, no wrapper)
    const scaleWidget = new VectorWidget(
      [stretch[0], stretch[1], stretch[2]],
      ['X', 'Y', 'Z'],
      (newScale) => {
        fm.setStretchComponents(newScale[0], newScale[1], newScale[2]);
        updateTransform();
      },
      'Scale'
    );
    scaleWidget.getElement().style.marginTop = '8px';
    this.#propertyPanel.appendChild(scaleWidget.getElement());
    
    // Raw matrix (collapsible, for reference)
    const matrixToggle = document.createElement('div');
    matrixToggle.className = 'sg-matrix-toggle';
    matrixToggle.textContent = '▸ Show Raw Matrix';
    matrixToggle.style.cursor = 'pointer';
    matrixToggle.style.color = '#9cdcfe';
    matrixToggle.style.marginBottom = '8px';
    matrixToggle.style.userSelect = 'none';
    
    const matrixContainer = document.createElement('div');
    matrixContainer.style.display = 'none';
    
    const grid = document.createElement('div');
    grid.className = 'sg-matrix-grid';
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'sg-matrix-cell';
      cell.textContent = matrix[i].toFixed(3);
      grid.appendChild(cell);
    }
    matrixContainer.appendChild(grid);
    
    matrixToggle.addEventListener('click', () => {
      const isHidden = matrixContainer.style.display === 'none';
      matrixContainer.style.display = isHidden ? 'block' : 'none';
      matrixToggle.textContent = isHidden ? '▾ Hide Raw Matrix' : '▸ Show Raw Matrix';
    });
    
    const matrixSection = document.createElement('div');
    matrixSection.appendChild(matrixToggle);
    matrixSection.appendChild(matrixContainer);
    
    this.#addPropertyGroup('Matrix', [
      { label: '', value: matrixSection, editable: false }
    ]);
  }
  
  /**
   * Add appearance-specific properties
   * @param {Appearance} appearance - The appearance
   * @private
   */
  #addAppearanceProperties(appearance) {
    // Show flat attribute list
    // (Shader hierarchy is now displayed in the tree view)
    const attrs = appearance.getStoredAttributes();
    const properties = [];
    
    for (const key of attrs) {
      const value = appearance.getAttribute(key);
      const propertyDef = this.#widgetFactory.createEditableProperty(key, value, (newValue) => {
        // Update the appearance attribute
        appearance.setAttribute(key, newValue);
        this.#onPropertyChange();
        this.#onRefreshPropertyPanel(appearance);
      });
      properties.push(propertyDef);
    }
    
    if (properties.length === 0) {
      properties.push({ label: '(empty)', value: 'No attributes set', editable: false });
    }
    
    this.#addPropertyGroup('Attributes', properties);
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
        value: formatValue(value),
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
}

