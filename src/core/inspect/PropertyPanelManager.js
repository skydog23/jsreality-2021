/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
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
import { KeyFrameAnimatedBean } from '../../anim/core/KeyFrameAnimatedBean.js';

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
   * The node currently shown in the property panel (for live updates).
   * @type {*|null}
   */
  #selectedNode = null;

  /**
   * Cleanup function for the currently attached live-listener.
   * @type {null|(() => void)}
   */
  #selectedNodeListenerCleanup = null;

  /**
   * Pending requestAnimationFrame id for live property refresh.
   * @type {number|null}
   */
  #liveRefreshRafId = null;

  /**
   * Whether a live refresh has been scheduled.
   * @type {boolean}
   */
  #liveRefreshPending = false;

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
   * KeyFrameAnimatedBean instances per Camera.
   *
   * This provides a JS analogue of Java's KeyFrameAnimatedBean<Camera> without
   * reflection by using explicit property accessors.
   *
   * @type {WeakMap<Camera, import('../../anim/core/KeyFrameAnimatedBean.js').KeyFrameAnimatedBean>}
   */
  #cameraBean = new WeakMap();
  
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
   * Dispose and detach any live listeners.
   */
  dispose() {
    this.#detachSelectedNodeListener();
    if (this.#liveRefreshRafId !== null) {
      cancelAnimationFrame(this.#liveRefreshRafId);
      this.#liveRefreshRafId = null;
    }
    this.#liveRefreshPending = false;
    this.#selectedNode = null;
    this.#descriptorRenderer?.dispose?.();
  }

  #detachSelectedNodeListener() {
    if (this.#selectedNodeListenerCleanup) {
      try {
        this.#selectedNodeListenerCleanup();
      } catch (e) {
        // ignore cleanup errors
      }
      this.#selectedNodeListenerCleanup = null;
    }
  }

  /**
   * Ensure we are listening for changes on the currently selected node (if needed).
   * Currently this is used to live-refresh Transformations during animation.
   * @param {*|null} node
   */
  #setSelectedNode(node) {
    if (this.#selectedNode === node) return;

    this.#detachSelectedNodeListener();
    this.#selectedNode = node;

    if (!node) return;

    // Live update: if a Transformation is changing (e.g. animation), refresh the panel.
    if (node instanceof Transformation) {
      /** @type {EventListener} */
      const onChanged = () => {
        // Only refresh if this node is still selected.
        if (this.#selectedNode !== node) return;
        this.#scheduleLiveRefresh();
      };

      // Prefer the explicit API if available.
      if (typeof node.addTransformationListener === 'function' && typeof node.removeTransformationListener === 'function') {
        node.addTransformationListener(onChanged);
        this.#selectedNodeListenerCleanup = () => node.removeTransformationListener(onChanged);
      } else if (typeof node.addEventListener === 'function' && typeof node.removeEventListener === 'function') {
        node.addEventListener('transformationChanged', onChanged);
        this.#selectedNodeListenerCleanup = () => node.removeEventListener('transformationChanged', onChanged);
      }
      return;
    }

    // Live update: Appearance attribute changes.
    if (node instanceof Appearance) {
      /** @type {EventListener} */
      const onChanged = () => {
        if (this.#selectedNode !== node) return;
        this.#scheduleLiveRefresh();
      };
      if (typeof node.addAppearanceListener === 'function' && typeof node.removeAppearanceListener === 'function') {
        node.addAppearanceListener(onChanged);
        this.#selectedNodeListenerCleanup = () => node.removeAppearanceListener(onChanged);
      } else if (typeof node.addEventListener === 'function' && typeof node.removeEventListener === 'function') {
        node.addEventListener('appearanceChanged', onChanged);
        this.#selectedNodeListenerCleanup = () => node.removeEventListener('appearanceChanged', onChanged);
      }
      return;
    }

    // Live update: Camera parameter changes.
    if (node instanceof Camera) {
      /** @type {EventListener} */
      const onChanged = () => {
        if (this.#selectedNode !== node) return;
        this.#scheduleLiveRefresh();
      };
      if (typeof node.addCameraListener === 'function' && typeof node.removeCameraListener === 'function') {
        node.addCameraListener(onChanged);
        this.#selectedNodeListenerCleanup = () => node.removeCameraListener(onChanged);
      } else if (typeof node.addEventListener === 'function' && typeof node.removeEventListener === 'function') {
        node.addEventListener('cameraChanged', onChanged);
        this.#selectedNodeListenerCleanup = () => node.removeEventListener('cameraChanged', onChanged);
      }
      return;
    }

    // Live update: Geometry data/attribute changes.
    if (node instanceof Geometry) {
      /** @type {EventListener} */
      const onChanged = () => {
        if (this.#selectedNode !== node) return;
        this.#scheduleLiveRefresh();
      };
      if (typeof node.addGeometryListener === 'function' && typeof node.removeGeometryListener === 'function') {
        node.addGeometryListener(onChanged);
        this.#selectedNodeListenerCleanup = () => node.removeGeometryListener(onChanged);
      } else if (typeof node.addEventListener === 'function' && typeof node.removeEventListener === 'function') {
        node.addEventListener('geometryChanged', onChanged);
        this.#selectedNodeListenerCleanup = () => node.removeEventListener('geometryChanged', onChanged);
      }
      return;
    }
  }

  #scheduleLiveRefresh() {
    if (this.#liveRefreshPending) return;
    this.#liveRefreshPending = true;

    const raf = (typeof requestAnimationFrame === 'function')
      ? requestAnimationFrame
      : (cb) => setTimeout(() => cb(performance?.now?.() ?? Date.now()), 0);

    this.#liveRefreshRafId = raf(() => {
      this.#liveRefreshPending = false;
      this.#liveRefreshRafId = null;

      // Re-render only the property panel for the selected node (no tree rebuild).
      const node = this.#selectedNode;
      if (node) {
        this.#renderNode(node);
      }
    });
  }

  /**
   * @param {Camera} camera
   * @returns {import('../../anim/core/KeyFrameAnimatedBean.js').KeyFrameAnimatedBean}
   */
  #getOrCreateCameraBean(camera) {
    const existing = this.#cameraBean.get(camera);
    if (existing) return existing;

    const bean = new KeyFrameAnimatedBean(
      [
        {
          name: 'perspective',
          type: 'boolean',
          get: () => Boolean(camera.isPerspective?.()),
          set: (v) => camera.setPerspective?.(Boolean(v))
        },
        {
          name: 'fieldOfView',
          type: 'number',
          // Camera stores radians internally but exposes degrees API.
          get: () => Number(camera.getFieldOfView?.() ?? 60),
          set: (v) => camera.setFieldOfView?.(Number(v))
        },
        {
          name: 'near',
          type: 'number',
          get: () => Number(camera.getNear?.() ?? 0.5),
          set: (v) => camera.setNear?.(Number(v))
        },
        {
          name: 'far',
          type: 'number',
          get: () => Number(camera.getFar?.() ?? 50),
          set: (v) => camera.setFar?.(Number(v))
        },
        {
          name: 'stereo',
          type: 'boolean',
          get: () => Boolean(camera.isStereo?.()),
          set: (v) => camera.setStereo?.(Boolean(v))
        },
        {
          name: 'eyeSeparation',
          type: 'number',
          get: () => Number(camera.getEyeSeparation?.() ?? 0.07),
          set: (v) => camera.setEyeSeparation?.(Number(v))
        },
        {
          name: 'focus',
          type: 'number',
          get: () => Number(camera.getFocus?.() ?? 3.0),
          set: (v) => camera.setFocus?.(Number(v))
        }
      ],
      { name: 'cameraBean' }
    );

    this.#cameraBean.set(camera, bean);
    return bean;
  }
  
  /**
   * Update the property panel for selected node
   * @param {*} node - The selected node
   */
  updatePropertyPanel(node) {
    this.#setSelectedNode(node);
    this.#renderNode(node);
  }

  /**
   * Render the property panel for a node, without changing selection/listeners.
   * @param {*} node
   */
  #renderNode(node) {
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
    const bean = this.#getOrCreateCameraBean(camera);
    const apply = () => {
      this.#onPropertyChange();
      this.#onRefreshPropertyPanel(camera);
    };

    return [
      {
        id: 'camera',
        title: 'Camera',
        items: [
          {
            id: 'perspective',
            type: DescriptorType.TOGGLE,
            label: 'Perspective',
            getValue: () => Boolean(camera.isPerspective?.()),
            setValue: (v) => {
              camera.setPerspective?.(Boolean(v));
              apply();
            }
          },
          {
            id: 'fov',
            type: DescriptorType.FLOAT,
            label: 'Field of View (°)',
            min: 1,
            max: 179,
            step: 1,
            getValue: () => Number(camera.getFieldOfView?.() ?? 60),
            setValue: (v) => {
              camera.setFieldOfView?.(Number(v));
              apply();
            }
          },
          {
            id: 'near',
            type: DescriptorType.FLOAT,
            label: 'Near',
            min: 1e-6,
            max: 1e6,
            step: 0.01,
            getValue: () => Number(camera.getNear?.() ?? 0.5),
            setValue: (v) => {
              camera.setNear?.(Number(v));
              apply();
            }
          },
          {
            id: 'far',
            type: DescriptorType.FLOAT,
            label: 'Far',
            min: 1e-6,
            max: 1e9,
            step: 0.1,
            getValue: () => Number(camera.getFar?.() ?? 50.0),
            setValue: (v) => {
              camera.setFar?.(Number(v));
              apply();
            }
          },
          {
            id: 'stereo',
            type: DescriptorType.TOGGLE,
            label: 'Stereo',
            getValue: () => Boolean(camera.isStereo?.()),
            setValue: (v) => {
              camera.setStereo?.(Boolean(v));
              apply();
            }
          },
          {
            id: 'eyeSeparation',
            type: DescriptorType.FLOAT,
            label: 'Eye Separation',
            min: 0,
            max: 10,
            step: 0.001,
            getValue: () => Number(camera.getEyeSeparation?.() ?? 0.07),
            setValue: (v) => {
              camera.setEyeSeparation?.(Number(v));
              apply();
            }
          },
          {
            id: 'focus',
            type: DescriptorType.FLOAT,
            label: 'Focus',
            min: 0,
            max: 1e6,
            step: 0.01,
            getValue: () => Number(camera.getFocus?.() ?? 3.0),
            setValue: (v) => {
              camera.setFocus?.(Number(v));
              apply();
            }
          },
          {
            id: 'bean-info',
            type: DescriptorType.LABEL,
            label: 'Keyframe bean',
            getValue: () => bean.getName?.() || 'cameraBean'
          }
        ]
      }
    ];
  }
}

