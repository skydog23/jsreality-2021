/**
 * TessellatedApp — Base class for discrete-group tessellation applications.
 *
 * Translates the core lifecycle of TessellatedContent.java into the jsreality
 * JSRApp / descriptor framework.  Subclasses provide a DiscreteGroup and a
 * fundamental-domain scene-graph node; TessellatedApp manages the DGSGR,
 * constraint editing, and element regeneration.
 *
 * Phase 1: master constraint descriptors, scale slider, instanced rendering toggle.
 *
 * Copyright (c) 2008-2026, Charles Gunn
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 */

import { JSRApp } from './JSRApp.js';
import { DescriptorType } from '../core/inspect/descriptors/DescriptorTypes.js';
import { SceneGraphUtility } from '../core/util/SceneGraphUtility.js';
import { MatrixBuilder } from '../core/math/MatrixBuilder.js';
import { RotateTool } from '../core/tools/RotateTool.js';
import {
  DiscreteGroupSceneGraphRepresentation,
  DiscreteGroupSimpleConstraint,
  DiscreteGroupUtility,
} from '../discretegroup/core/index.js';

export class TessellatedApp extends JSRApp {
  _group = null;
  _repn = null;
  _fundDomSGC = SceneGraphUtility.createFullSceneGraphComponent('fundDomSGC');

  _copycat = true;
  _scale = 1.0;

  _masterConstraint = new DiscreteGroupSimpleConstraint(18.0, 16, 5000);
  _pickCopies = 100;

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
   * Called after createGroup().
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

  // ---- JSRApp lifecycle -----------------------------------------------------

  getContent() {
    this._group = this.createGroup();

    if (!this._group.getConstraint()) {
      this._group.setConstraint(this._masterConstraint);
    } else if (this._group.getConstraint() instanceof DiscreteGroupSimpleConstraint) {
      this._masterConstraint = this._group.getConstraint();
    }
    this._group.update();

    this.setupFundamentalDomain();

    this._repn = new DiscreteGroupSceneGraphRepresentation(
      this._group, this._copycat, this.constructor.name
    );

    if (this._copycat) {
      const pickConstraint = new DiscreteGroupSimpleConstraint(-1, -1, this._pickCopies);
      this._repn.setOfficialElementList(
        DiscreteGroupUtility.generateElements(this._group, pickConstraint)
      );
    }

    this._repn.setWorldNode(this._fundDomSGC);

    const appList = this.getAppList();
    if (appList) this._repn.setAppList(appList);

    this._repn.update();

    const root = this._repn.getRepresentationRoot();
    root.addTool(new RotateTool());
    return root;
  }

  // ---- Constraint management ------------------------------------------------

  updateMasterConstraint() {
    if (!this._group || !this._repn) return;
    this._group.setConstraint(this._masterConstraint);
    this._group.update();
    this._repn.setElementList(this._group.getElementList());

    if (this._copycat) {
      const pickConstraint = new DiscreteGroupSimpleConstraint(-1, -1, this._pickCopies);
      this._repn.setOfficialElementList(
        DiscreteGroupUtility.generateElements(this._group, pickConstraint)
      );
    }

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
