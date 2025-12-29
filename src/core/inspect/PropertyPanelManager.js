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
import { formatValue } from './PropertyFormatters.js';
import { ShaderTreeNode } from './TreeViewManager.js';
import { ShaderPropertyManager } from './ShaderPropertyManager.js';
import { DescriptorRenderer } from './descriptors/DescriptorRenderer.js';
import { DescriptorType } from './descriptors/DescriptorTypes.js';

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
   * @type {DescriptorRenderer}
   */
  #descriptorRenderer;

  /**
   * Preferred rotation axis per Transformation.
   *
   * Axis-angle is underdetermined at the identity rotation (angle = 0),
   * so if the user edits the axis while the rotation is identity, we store
   * that axis here and use it when the user later sets a non-zero angle.
   *
   * @type {WeakMap<Transformation, [number, number, number]>}
   */
  #preferredRotationAxis = new WeakMap();
  
  /**
   * @param {HTMLElement} propertyPanel - The property panel DOM element
   * @param {ShaderPropertyManager} shaderPropertyManager - Shader property manager instance
   * @param {Function} onPropertyChange - Callback when a property changes
   * @param {Function} onRefreshPropertyPanel - Callback to refresh property panel
   */
  constructor(propertyPanel, shaderPropertyManager, onPropertyChange, onRefreshPropertyPanel) {
    this.#propertyPanel = propertyPanel;
    this.#shaderPropertyManager = shaderPropertyManager;
    this.#onPropertyChange = onPropertyChange;
    this.#onRefreshPropertyPanel = onRefreshPropertyPanel;
    this.#descriptorRenderer = new DescriptorRenderer(propertyPanel);
  }
  
  /**
   * Update the property panel for selected node
   * @param {*} node - The selected node
   */
  updatePropertyPanel(node) {
    if (!node) {
      this.#renderDescriptorGroups([
        {
          id: 'no-selection',
          title: 'Properties',
          items: [
            {
              id: 'message',
              type: DescriptorType.LABEL,
              label: 'Info',
              getValue: () => 'Select a node to view properties'
            }
          ]
        }
      ]);
      return;
    }
    
    // Check for objects with getInspectorDescriptors() method (e.g., JSRApp instances)
    if (typeof node.getInspectorDescriptors === 'function') {
      const descriptors = node.getInspectorDescriptors();
      if (descriptors && Array.isArray(descriptors)) {
        this.#renderDescriptorGroups(descriptors);
        return;
      }
    }
    
    // Component-specific properties
    if (node instanceof SceneGraphComponent) {
      this.#renderDescriptorGroups(this.#buildComponentDescriptors(node));
    } else if (node instanceof Transformation) {
      this.#renderDescriptorGroups(this.#buildTransformationDescriptors(node));
    } else if (node instanceof Appearance) {
      this.#renderDescriptorGroups(this.#buildAppearanceDescriptors());
    } else if (node instanceof Geometry) {
      this.#renderDescriptorGroups(this.#buildGeometryDescriptors(node));
    } else if (node instanceof Camera) {
      this.#renderDescriptorGroups(this.#buildCameraDescriptors(node));
    } else if (node instanceof ShaderTreeNode) {
      this.#descriptorRenderer.render([]);
      this.#shaderPropertyManager.addShaderProperties(node, this.#propertyPanel);
    }
  }
  
  #renderDescriptorGroups(groups) {
    this.#descriptorRenderer.render(groups);
  }
  
  #buildComponentDescriptors(component) {
    return [
      {
        id: 'component',
        title: 'Component',
        items: [
          {
            id: 'visible',
            type: DescriptorType.TOGGLE,
            label: 'Visible',
            getValue: () => component.isVisible(),
            setValue: (val) => {
              component.setVisible(Boolean(val));
              this.#onPropertyChange();
              this.#onRefreshPropertyPanel(component);
            }
          },
          {
            id: 'pickable',
            type: DescriptorType.TOGGLE,
            label: 'Pickable',
            getValue: () => component.isPickable(),
            setValue: (val) => {
              component.setPickable(Boolean(val));
              this.#onPropertyChange();
              this.#onRefreshPropertyPanel(component);
            }
          },
          {
            id: 'children',
            type: DescriptorType.LABEL,
            label: 'Children',
            getValue: () => component.getChildComponentCount().toString()
          }
        ]
      }
    ];
  }
  
  #buildTransformationDescriptors(transform) {
    const fm = new FactoredMatrix(Pn.EUCLIDEAN, transform.getMatrix());
    const EPS = 1e-8;

    const normalizeAxis = (axis) => {
      const [x = 0, y = 0, z = 0] = axis || [];
      const n = Math.sqrt(x * x + y * y + z * z);
      if (n < EPS) return null;
      return /** @type {[number, number, number]} */ ([x / n, y / n, z / n]);
    };

    const getPreferredAxis = () => {
      return this.#preferredRotationAxis.get(transform) || /** @type {[number, number, number]} */ ([0, 0, 1]);
    };

    const setPreferredAxis = (axis) => {
      const normalized = normalizeAxis(axis) || /** @type {[number, number, number]} */ ([0, 0, 1]);
      this.#preferredRotationAxis.set(transform, normalized);
      return normalized;
    };

    const isIdentityRotation = () => Math.abs(fm.getRotationAngle()) < EPS;

    const updateTransform = () => {
      transform.setMatrix(fm.getArray());
      this.#onPropertyChange();
      this.#onRefreshPropertyPanel(transform);
    };
    
    const translationDescriptor = {
      id: 'translation',
      type: DescriptorType.VECTOR,
      label: 'Position',
      getValue: () => {
        const t = fm.getTranslation();
        return [t[0], t[1], t[2]];
      },
      setValue: (vector) => {
        const [x = 0, y = 0, z = 0] = vector || [];
        fm.setTranslation(x, y, z);
        updateTransform();
      }
    };
    
    const rotationAngleDescriptor = {
      id: 'rotation-angle',
      type: DescriptorType.FLOAT,
      label: 'Rot. Angle',
      min: -360,
      max: 360,
      step: 1,
      getValue: () => (fm.getRotationAngle() * 180) / Math.PI,
      setValue: (degrees) => {
        const radians = Number(degrees) * Math.PI / 180;
        let axis = fm.getRotationAxis();
        const normalized = normalizeAxis(axis);

        if (!normalized) {
          // Identity rotation (axis undefined): use the stored preference.
          axis = getPreferredAxis();
        } else {
          // Keep preference in sync with meaningful rotations.
          setPreferredAxis(normalized);
        }

        // If radians is ~0, this still sets identity (fine); axis may be ignored internally.
        fm.setRotation(radians, axis);
        updateTransform();
      }
    };
    
    const rotationAxisDescriptor = {
      id: 'rotation-axis',
      type: DescriptorType.VECTOR,
      label: 'Rot. Axis',
      getValue: () => {
        const axis = normalizeAxis(fm.getRotationAxis()) || getPreferredAxis();
        return [axis[0], axis[1], axis[2]];
      },
      setValue: (axis) => {
        const preferred = setPreferredAxis(axis);
        const angle = fm.getRotationAngle();

        if (isIdentityRotation()) {
          // Rotation is identity: store preference only, do not change matrix yet.
          this.#onRefreshPropertyPanel(transform);
          return;
        }

        fm.setRotation(angle, preferred);
        updateTransform();
      }
    };
    
    const scaleDescriptor = {
      id: 'scale',
      type: DescriptorType.VECTOR,
      label: 'Scale',
      getValue: () => {
        const s = fm.getStretch();
        return [s[0], s[1], s[2]];
      },
      setValue: (scale) => {
        const [sx = 1, sy = 1, sz = 1] = scale || [];
        fm.setStretchComponents(sx, sy, sz);
        updateTransform();
      }
    };
    
    return [
      {
        id: 'transform-position',
        title: '',
        items: [translationDescriptor]
      },
      {
        id: 'transform-rotation',
        title: '',
        items: [rotationAngleDescriptor, rotationAxisDescriptor]
      },
      {
        id: 'transform-scale',
        title: '',
        items: [scaleDescriptor]
      }
    ];
  }
  
  #buildAppearanceDescriptors() {
    return [
      {
        id: 'appearance-info',
        title: 'Appearance',
        items: [
          {
            id: 'appearance-message',
            type: DescriptorType.LABEL,
            label: 'Info',
            getValue: () => 'Select a shader node in the tree to view and edit appearance properties.'
          }
        ]
      }
    ];
  }
  
  #buildGeometryDescriptors(geometry) {
    const geometryType = geometry.constructor.name;
    const primaryItems = [];
    
    if (typeof geometry.getNumPoints === 'function') {
      primaryItems.push({
        id: 'vertex-count',
        type: DescriptorType.LABEL,
        label: 'Vertex Count',
        getValue: () => geometry.getNumPoints().toString()
      });
    }
    
    if (geometryType === 'IndexedLineSet' || geometryType === 'IndexedFaceSet') {
      if (typeof geometry.getNumEdges === 'function') {
        primaryItems.push({
          id: 'edge-count',
          type: DescriptorType.LABEL,
          label: 'Edge Count',
          getValue: () => geometry.getNumEdges().toString()
        });
      }
    }
    
    if (geometryType === 'IndexedFaceSet') {
      if (typeof geometry.getNumFaces === 'function') {
        primaryItems.push({
          id: 'face-count',
          type: DescriptorType.LABEL,
          label: 'Face Count',
          getValue: () => geometry.getNumFaces().toString()
        });
      }
    }
    
    const groups = [
      {
        id: 'geometry-primary',
        title: 'Geometry',
        items: primaryItems
      }
    ];
    
    const attrItems = [];
    for (const [key, value] of geometry.getGeometryAttributes()) {
      attrItems.push({
        id: `attr-${key}`,
        type: DescriptorType.LABEL,
        label: key,
        getValue: () => formatValue(value)
      });
    }
    if (attrItems.length > 0) {
      groups.push({
        id: 'geometry-attributes',
        title: 'Geometry Attributes',
        items: attrItems
      });
    }
    return groups;
  }
  
  #buildCameraDescriptors(camera) {
    return [
      {
        id: 'camera',
        title: 'Camera',
        items: [
          {
            id: 'perspective',
            type: DescriptorType.LABEL,
            label: 'Perspective',
            getValue: () => (camera.isPerspective() ? 'Yes' : 'No')
          },
          {
            id: 'fov',
            type: DescriptorType.LABEL,
            label: 'Field of View',
            getValue: () => (camera.getFieldOfView()?.toFixed(2) ?? 'N/A')
          },
          {
            id: 'near',
            type: DescriptorType.LABEL,
            label: 'Near',
            getValue: () => (camera.getNear()?.toFixed(3) ?? 'N/A')
          },
          {
            id: 'far',
            type: DescriptorType.LABEL,
            label: 'Far',
            getValue: () => (camera.getFar()?.toFixed(3) ?? 'N/A')
          }
        ]
      }
    ];
  }
}

