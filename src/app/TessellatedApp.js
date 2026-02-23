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
import {
  DiscreteGroupSceneGraphRepresentation,
  DiscreteGroupSimpleConstraint,
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

    if (!group.getConstraint()) {
      group.setConstraint(this._masterConstraint);
    } else if (group.getConstraint() instanceof DiscreteGroupSimpleConstraint) {
      this._masterConstraint = group.getConstraint();
    }
    group.update();

    this._repn = new DiscreteGroupSceneGraphRepresentation(
      group, this._copycat, this.constructor.name
    );
    this._repn.setWorldNode(this._contentNode ?? this._fundDomSGC);

    const appList = this.getAppList();
    if (appList) this._repn.setAppList(appList);

    this._repn.update();
    this._rootSGC = this._repn.getRepresentationRoot();
  }

  /**
   * Returns the kaleidoscope SGC (the DGSGR representation root).
   */
  getRepresentationRoot() {
    return this._rootSGC;
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

  // ---- Constraint management ------------------------------------------------

  updateMasterConstraint() {
    if (!this._group || !this._repn) return;
    this._group.setConstraint(this._masterConstraint);
    this._group.update();
    this._repn.setElementList(this._group.getElementList());
    this._repn.update();
  }

  // ---- Scale ----------------------------------------------------------------

  setScale(s) {
    this._scale = s;
    MatrixBuilder.euclidean().scale(s).assignTo(this._fundDomSGC);
  }

  // ---- Descriptors (Phase 1 GUI) --------------------------------------------

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
    ]}];

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
