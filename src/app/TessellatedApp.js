/**
 * TessellatedApp — Base class for discrete-group tessellation applications.
 *
 * Mirrors the Java TessellatedContent / Content separation:
 *
 *   "content"      = the fundamental domain (geometry + transform in _fundDomSGC)
 *   "kaleidoscope" = the DiscreteGroupSceneGraphRepresentation that tiles
 *                    copies of the content by group elements
 *
 * Subclasses provide a DiscreteGroup (createGroup) and populate the
 * fundamental domain (setupFundamentalDomain).  TessellatedApp assembles the
 * kaleidoscope via setGroup() and feeds the result to JSRApp for rendering.
 *
 * Java-parity methods:
 *   setContent(node)        — like Content.setContent()
 *   getContentNode()        — like Content.getContentNode()
 *   setGroup(group)         — like TessellatedContent.setGroup()
 *   getRepresentationRoot() — the kaleidoscope SGC (= DGSGR root)
 *
 * Copyright (c) 2008-2026, Charles Gunn
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 */

import { JSRApp } from './JSRApp.js';
import { DescriptorType } from '../core/inspect/descriptors/DescriptorTypes.js';
import { SceneGraphUtility } from '../core/util/SceneGraphUtility.js';
import { SceneGraphComponent } from '../core/scene/SceneGraphComponent.js';
import { Geometry } from '../core/scene/Geometry.js';
import { MatrixBuilder } from '../core/math/MatrixBuilder.js';
import { Color } from '../core/util/Color.js';
import { DirectionalLight } from '../core/scene/DirectionalLight.js';
import { PointLight } from '../core/scene/PointLight.js';
import { FlyTool } from '../core/tools/FlyTool.js';
import { Graphics3D } from '../core/scene/pick/Graphics3D.js';
import { SceneGraphPath } from '../core/scene/SceneGraphPath.js';
import * as Pn from '../core/math/Pn.js';
import * as CameraUtility from '../core/util/CameraUtility.js';
import {
  DiscreteGroupSceneGraphRepresentation,
  DiscreteGroupSimpleConstraint,
  DiscreteGroupViewportConstraint,
} from '../discretegroup/core/index.js';

export class TessellatedApp extends JSRApp {
  _group = null;
  _repn = null;
  _fundDomSGC = SceneGraphUtility.createFullSceneGraphComponent('fundDomSGC');
  _contentNode = null;
  _rootSGC = null;
  _copycat = true;
  _scale = 1.0;

  _masterConstraint = new DiscreteGroupSimpleConstraint(18.0, 16, 5000);
  _viewportConstraint = new DiscreteGroupViewportConstraint(3.0, 2, 12.0, -1, null);

  _clipToCamera = false;
  _followsCamera = false;

  _flyTool = null;
  _flySpeed = 0.5;

  _euclideanLights = null;
  _hyperbolicLights = null;
  _lightIntensity = 0.5;
  _lightPositions = [[-1, -1, -1], [-0.1, 1, 0.2], [1, 0.3, -0.1], [0.2, -0.1, 1]];

  _firstGroupSet = true;
  _groupChangedListeners = [];

  // ---- Abstract hooks for subclasses ----------------------------------------

  /**
   * Subclasses must return a configured DiscreteGroup instance.
   * @returns {import('../discretegroup/core/DiscreteGroup.js').DiscreteGroup}
   */
  createGroup() {
    throw new Error('TessellatedApp subclass must implement createGroup()');
  }

  /**
   * Subclasses must populate `this._fundDomSGC` with geometry / children.
   * Called before setGroup().
   */
  setupFundamentalDomain() {
    throw new Error('TessellatedApp subclass must implement setupFundamentalDomain()');
  }

  /**
   * Optional: subclasses can return an array of Appearance objects for per-instance coloring.
   * @returns {import('../core/scene/Appearance.js').Appearance[]|null}
   */
  getAppList() {
    return null;
  }

  // ---- Content management (Java Content.setContent parity) ------------------

  /**
   * Set the fundamental-domain content, mirroring Java Content.setContent().
   * Clears _fundDomSGC and places `node` inside it (as geometry or child SGC).
   * @param {import('../core/scene/SceneGraphNode.js').SceneGraphNode} node
   */
  setContent(node) {
    SceneGraphUtility.removeChildren(this._fundDomSGC);
    this._fundDomSGC.setGeometry(null);
    if (node instanceof Geometry) {
      this._fundDomSGC.setGeometry(node);
    } else if (node instanceof SceneGraphComponent) {
      this._fundDomSGC.addChild(node);
    } else {
      throw new Error(`Cannot tessellate ${node?.constructor?.name ?? node}`);
    }
    this._contentNode = node;
  }

  /**
   * Returns the node most recently passed to setContent(), or _fundDomSGC
   * if setupFundamentalDomain() was used instead.
   */
  getContentNode() {
    return this._contentNode ?? this._fundDomSGC;
  }

  // ---- Kaleidoscope management (Java TessellatedContent.setGroup parity) ----

  /**
   * Create (or recreate) the DGSGR kaleidoscope for the given group.
   * Mirrors Java TessellatedContent.setGroup().
   * @param {import('../discretegroup/core/DiscreteGroup.js').DiscreteGroup} group
   */
  setGroup(group) {
    this._group = group;

    const viewer = this.getViewer();
    if (viewer) {
      this._viewportConstraint.setGraphicsContext(new Graphics3D(viewer));
    }

    if (!group.getConstraint() ||
        !(group.getConstraint() instanceof DiscreteGroupSimpleConstraint)) {
      group.setConstraint(this._masterConstraint);
    } else {
      this._masterConstraint = group.getConstraint();
    }
    group.update();

    if (this._repn) {
      if (this._rootSGC) {
        const contentRoot = this.getJSRViewer()?.getContentComponent();
        if (contentRoot?.isDirectAncestor?.(this._rootSGC)) {
          contentRoot.removeChild(this._rootSGC);
        }
      }
      this._repn.dispose();
    }

    this._repn = new DiscreteGroupSceneGraphRepresentation(
      group, this._copycat, this.constructor.name
    );
    this._repn.setWorldNode(this._contentNode ?? this._fundDomSGC);
    this._repn.setClipDelay(500);
    this._repn.setFollowDelay(500);
    this._repn.setFollowsCamera(this._followsCamera);
    this._repn.setClipToCamera(this._clipToCamera);

    const appList = this.getAppList();
    if (appList) this._repn.setAppList(appList);

    this._repn.setElementList(group.getElementList());

    if (viewer) {
      const contentRoot = this.getJSRViewer()?.getContentComponent();
      if (contentRoot) {
        const pathToWorld = new SceneGraphPath();
        pathToWorld.push(viewer.getSceneRoot());
        pathToWorld.push(contentRoot);
        this._repn.attachToViewer(viewer, pathToWorld);
      }
    }

    this._repn.setViewportConstraint(this._viewportConstraint);
    this._updateViewportConstraint();

    this._repn.update();
    this._rootSGC = this._repn.getRepresentationRoot();

    if (this._flyTool) this._flyTool.setMetric(group.getMetric());

    if (viewer) {
      SceneGraphUtility.setMetric(viewer.getSceneRoot(), group.getMetric());
    }

    this._setupCameraListener();
    this._fireGroupChanged();
  }

  /**
   * Returns the kaleidoscope SGC (the DGSGR representation root).
   */
  getRepresentationRoot() {
    return this._rootSGC;
  }

  getGroup() {
    return this._group;
  }

  getTheRepn() {
    return this._repn;
  }

  // ---- JSRApp lifecycle -----------------------------------------------------

  /**
   * Called by JSRApp.install().  Orchestrates content + kaleidoscope setup
   * and returns the node that will be mounted into the scene.
   */
  getContent() {
    this.setupFundamentalDomain();
    this.setGroup(this.createGroup());
    return this._rootSGC;
  }

  /**
   * Called after install() to set up lights, fly tool, etc.
   * Overrides JSRApp.display() — the base class adds its own FlyTool to the
   * camera node; we replace that with a FlyTool on the avatar node and add lights.
   * Subclasses should call super.display().
   */
  display() {
    const ap = this.getViewer()?.getSceneRoot()?.getAppearance();
    if (ap) {
      ap.setAttribute('backgroundColor', new Color(200, 175, 150));
    }
    this._instrumentSceneGraph();
  }

  _instrumentSceneGraph() {
    const jsrViewer = this.getJSRViewer();
    if (!jsrViewer) return;
    const avatarComponent = jsrViewer.getAvatarComponent();

    this._flyTool = new FlyTool();
    this._flyTool.setGain(this._flySpeed);
    if (this._group) {
      this._flyTool.setMetric(this._group.getMetric());
    }
    if (avatarComponent) {
      avatarComponent.addTool(this._flyTool);
    }

    this._setupLights();
    this._updateLights();
    if (avatarComponent) {
      if (this._euclideanLights) avatarComponent.addChild(this._euclideanLights);
      if (this._hyperbolicLights) avatarComponent.addChild(this._hyperbolicLights);
    }

    this.getToolSystem()?.rediscoverSceneTools?.();
  }

  // ---- Lights ---------------------------------------------------------------

  _setupLights() {
    if (!this._euclideanLights) {
      this._euclideanLights = new SceneGraphComponent('Euclidean Lights');
    } else {
      SceneGraphUtility.removeChildren(this._euclideanLights);
    }

    for (let i = 0; i < this._lightPositions.length; i++) {
      const lightNode = new SceneGraphComponent(`light${i}`);
      const light = new DirectionalLight();
      light.setIntensity(this._lightIntensity);
      lightNode.setLight(light);
      MatrixBuilder.euclidean()
        .rotateFromTo([0, 0, 1], this._lightPositions[i])
        .assignTo(lightNode);
      this._euclideanLights.addChild(lightNode);
    }

    if (!this._hyperbolicLights) {
      this._hyperbolicLights = new SceneGraphComponent('Hyperbolic lights');
    } else {
      SceneGraphUtility.removeChildren(this._hyperbolicLights);
    }

    const l1 = SceneGraphUtility.createFullSceneGraphComponent('l1');
    const pointLight1 = new PointLight();
    pointLight1.setColor(new Color(255, 255, 255));
    pointLight1.setIntensity(this._lightIntensity * 2);
    l1.setLight(pointLight1);
    this._hyperbolicLights.addChild(l1);

    const l2 = SceneGraphUtility.createFullSceneGraphComponent('l2');
    const pointLight2 = new PointLight();
    pointLight2.setColor(new Color(255, 255, 200));
    pointLight2.setIntensity(this._lightIntensity * 2);
    l2.setLight(pointLight2);
    MatrixBuilder.hyperbolic().translate(0.2, 0.2, 0.2).assignTo(l2);
    this._hyperbolicLights.addChild(l2);
  }

  _updateLights() {
    if (!this._group || !this._euclideanLights || !this._hyperbolicLights) return;
    const useEuclidean = this._group.getDimension?.() === 2 ||
                         this._group.getMetric() === Pn.EUCLIDEAN;
    this._euclideanLights.setVisible(useEuclidean);
    this._hyperbolicLights.setVisible(!useEuclidean);
  }

  setLightIntensity(intensity) {
    this._lightIntensity = intensity;
    this._setupLights();
    this._updateLights();
  }

  // ---- Camera listener for dynamic re-tessellation --------------------------

  _setupCameraListener() {
    if (!this._firstGroupSet) return;
    this._firstGroupSet = false;

    const viewer = this.getViewer();
    if (!viewer) return;
    const camera = CameraUtility.getCamera(viewer);
    if (!camera) return;

    const onCameraOrResize = () => {
      if (!this._clipToCamera) return;
      this._viewportConstraint.update();
      this._repn?.update();
    };

    camera.addCameraListener(onCameraOrResize);

    const canvas = viewer.getViewingComponent?.();
    if (canvas instanceof Element) {
      new ResizeObserver(onCameraOrResize).observe(canvas);
    }
  }

  // ---- Viewport constraint management ---------------------------------------

  _updateViewportConstraint() {
    if (this._repn) {
      this._repn.setViewportConstraint(this._viewportConstraint);
    }
  }

  getViewportConstraint() {
    return this._viewportConstraint;
  }

  setViewportConstraint(vc) {
    this._viewportConstraint = vc;
    if (this._repn) this._repn.setViewportConstraint(vc);
  }

  // ---- Clip / Follow camera -------------------------------------------------

  isClipToCamera() {
    return this._clipToCamera;
  }

  setClipToCamera(clip) {
    this._clipToCamera = clip;
    if (this._repn) this._repn.setClipToCamera(clip);
  }

  isFollowsCamera() {
    return this._followsCamera;
  }

  setFollowsCamera(follow) {
    this._followsCamera = follow;
    if (this._repn) this._repn.setFollowsCamera(follow);
  }

  // ---- FlyTool --------------------------------------------------------------

  getFlyTool() {
    return this._flyTool;
  }

  getFlySpeed() {
    return this._flySpeed;
  }

  setFlySpeed(speed) {
    this._flySpeed = speed;
    if (this._flyTool) this._flyTool.setGain(speed);
  }

  // ---- Constraint management ------------------------------------------------

  updateMasterConstraint() {
    if (!this._group || !this._repn) return;
    this._group.setConstraint(this._masterConstraint);
    this._group.update();
    this._repn.setElementList(this._group.getElementList());
    this._repn.update();
  }

  getMasterConstraint() {
    return this._masterConstraint;
  }

  // ---- Scale ----------------------------------------------------------------

  setScale(s) {
    this._scale = s;
    MatrixBuilder.euclidean().scale(s).assignTo(this._fundDomSGC);
  }

  // ---- GroupChangedListener -------------------------------------------------

  addGroupChangedListener(listener) {
    if (!this._groupChangedListeners.includes(listener)) {
      this._groupChangedListeners.push(listener);
    }
  }

  removeGroupChangedListener(listener) {
    this._groupChangedListeners = this._groupChangedListeners.filter(l => l !== listener);
  }

  _fireGroupChanged() {
    const event = { source: this, group: this._group };
    for (const l of this._groupChangedListeners) {
      if (typeof l === 'function') l(event);
      else if (l && typeof l.groupChanged === 'function') l.groupChanged(event);
    }
  }

  // ---- Descriptors (GUI) ----------------------------------------------------

  getInspectorDescriptors() {
    const baseDescriptors = [
      {type: DescriptorType.CONTAINER,
        containerLabel: 'Master constraint',
        items: [
      {
        type: DescriptorType.TEXT_SLIDER,
        valueType: 'int',
        label: 'Max word length',
        getValue: () => this._masterConstraint.getMaxWordLength(),
        setValue: (val) => {
          this._masterConstraint.setMaxWordLength(val);
          this.updateMasterConstraint();
        },
        min: 1,
        max: 30,
        step: 1,
      },
      {
        type: DescriptorType.TEXT_SLIDER,
        valueType: 'float',
        label: 'Max distance',
        getValue: () => this._masterConstraint.getMaxDistance(),
        setValue: (val) => {
          this._masterConstraint.setMaxDistance(val);
          this.updateMasterConstraint();
        },
        min: 0.1,
        max: 100,
      },
      {
        type: DescriptorType.TEXT_SLIDER,
        valueType: 'int',
        label: 'Max elements',
        getValue: () => this._masterConstraint.getMaxNumberElements(),
        setValue: (val) => {
          this._masterConstraint.setMaxNumberElements(val);
          this.updateMasterConstraint();
        },
        min: 1,
        max: 50000,
        step: 1,
      },
      {
        type: DescriptorType.TEXT_SLIDER,
        valueType: 'float',
        label: 'Scale',
        getValue: () => this._scale,
        setValue: (val) => { this.setScale(val); },
        min: 0.01,
        max: 2.0,
      },
    ]},
    {type: DescriptorType.CONTAINER,
      containerLabel: 'Camera / Navigation',
      items: [
      {
        type: DescriptorType.TOGGLE,
        label: 'Follow camera',
        getValue: () => this._followsCamera,
        setValue: (val) => { this.setFollowsCamera(val); },
      },
      {
        type: DescriptorType.TOGGLE,
        label: 'Clip to camera',
        getValue: () => this._clipToCamera,
        setValue: (val) => { this.setClipToCamera(val); },
      },
      {
        type: DescriptorType.TEXT_SLIDER,
        valueType: 'float',
        label: 'Fly speed',
        getValue: () => this._flySpeed,
        setValue: (val) => { this.setFlySpeed(val); },
        min: 0.01,
        max: 2.0,
      },
    ]},
    {type: DescriptorType.CONTAINER,
      containerLabel: 'Viewport constraint',
      items: [
      {
        type: DescriptorType.TEXT_SLIDER,
        valueType: 'float',
        label: 'Min distance',
        getValue: () => this._viewportConstraint.getMinDistance(),
        setValue: (val) => {
          this._viewportConstraint.setMinDistance(val);
          this._updateViewportConstraint();
        },
        min: 0.0,
        max: 20.0,
      },
      {
        type: DescriptorType.TEXT_SLIDER,
        valueType: 'int',
        label: 'Min word length',
        getValue: () => this._viewportConstraint.getMinWordLength(),
        setValue: (val) => {
          this._viewportConstraint.setMinWordLength(val);
          this._updateViewportConstraint();
        },
        min: 0,
        max: 20,
        step: 1,
      },
      {
        type: DescriptorType.TEXT_SLIDER,
        valueType: 'float',
        label: 'Max distance (viewport)',
        getValue: () => this._viewportConstraint.getMaxDistance(),
        setValue: (val) => {
          this._viewportConstraint.setMaxDistance(val);
          this._updateViewportConstraint();
        },
        min: 0.1,
        max: 50.0,
      },
      {
        type: DescriptorType.TEXT_SLIDER,
        valueType: 'float',
        label: 'Fudge factor',
        getValue: () => this._viewportConstraint.getFudge(),
        setValue: (val) => {
          this._viewportConstraint.setFudge(val);
          this._updateViewportConstraint();
        },
        min: 0.5,
        max: 3.0,
      },
    ]},
    ];

    const subDescriptors = this.getTessellatedDescriptors?.() ?? [];
    return [...baseDescriptors, ...subDescriptors];
  }

  /**
   * Subclasses can override to append additional descriptors.
   * @returns {Array}
   */
  getTessellatedDescriptors() {
    return [];
  }
}
