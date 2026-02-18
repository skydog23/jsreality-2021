/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Appearance } from '../../core/scene/Appearance.js';
import { SceneGraphComponent } from '../../core/scene/SceneGraphComponent.js';
import { Transformation } from '../../core/scene/Transformation.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { AbstractDGSGR } from './AbstractDGSGR.js';
import { DiscreteGroupElement } from './DiscreteGroupElement.js';

/**
 * Port of de.jtem.discretegroup.core.DiscreteGroupSceneGraphRepresentation.
 *
 * This first JS version focuses on rendering-critical behavior:
 * - replicating a fundamental region by group elements
 * - app/color assignment
 * - constraint-based visibility
 * - world-node swapping
 *
 * Advanced Java-only features (camera follow, clip-to-camera, copycat/dropbox)
 * are intentionally left for a later pass.
 */
export class DiscreteGroupSceneGraphRepresentation extends AbstractDGSGR {
  constructor(group, copyCat = false, name = '') {
    super();
    this.theGroup = group;
    this.name = name;
    this.copyCat = !!copyCat;

    this.followCameraNode = SceneGraphUtility.createFullSceneGraphComponent(`${name} DG Follow Camera`);
    this.changeOfBasisNode = SceneGraphUtility.createFullSceneGraphComponent(`${name} DG Change of Basis`);
    this.changeOfBasisNode.setAppearance(null);
    this.followCameraNode.addChild(this.changeOfBasisNode);

    this.theSceneGraphRepn = SceneGraphUtility.createFullSceneGraphComponent(`${name} DG Parent`);
    this.changeOfBasisNode.addChild(this.theSceneGraphRepn);

    this.flatSceneGraphRepn = null;
    this.fundamentalRegion = new SceneGraphComponent(`${name} DG fundamental Domain`);
    this.fundamentalRegion.setAppearance(new Appearance());

    this.worldNode = null;
    this.oldWorldNode = null;
    this.cameraRepn = null;

    this.elementList = null;
    this.officialElementList = null;
    this.appList = null;
    this.constraint = null;

    this.newElementList = true;
    this.newAppList = true;
    this.newWorldNode = false;
    this.newCameraRepn = false;
    this.flatten = false;
    this.active = true;
  }

  setConstraint(c) {
    this.constraint = c;
    if (this.constraint != null) {
      AbstractDGSGR.applyConstraint(this, this.constraint);
    } else {
      const n = this.theSceneGraphRepn.getChildComponentCount();
      for (let i = 0; i < n; ++i) this.theSceneGraphRepn.getChildComponent(i).setVisible(true);
    }
  }

  getConstraint() {
    return this.constraint;
  }

  update() {
    if (this.newAppList || this.newElementList || this.elementList == null) {
      if (this.elementList == null) {
        this.theGroup.generateElements();
        this.elementList = this.theGroup.getElementList();
      }
      const cp = this.theGroup.getColorPicker?.();
      if (cp && this.elementList?.[0] != null && typeof cp.assignColorIndices === 'function') {
        cp.assignColorIndices(this.elementList);
      }

      const theNewSGR = SceneGraphUtility.createFullSceneGraphComponent(`${this.name} DG Parent`);
      const showTheWorld = this.officialElementList == null ? this.elementList : this.officialElementList;
      const n = showTheWorld?.length ?? 0;
      for (let i = 0; i < n; ++i) {
        const dge = showTheWorld[i];
        const tmp = new SceneGraphComponent();
        const newTrans = new Transformation(dge.getArray());
        newTrans.setName(dge.getWord());
        tmp.setName(`dge ${dge.getWord()}`);
        tmp.setTransformation(newTrans);
        if (this.appList != null && this.appList.length > 0) {
          const index = ((dge.getColorIndex() % this.appList.length) + this.appList.length) % this.appList.length;
          tmp.setAppearance(this.appList[index]);
        }
        tmp.addChild(this.fundamentalRegion);
        theNewSGR.addChild(tmp);
      }

      this.newAppList = false;
      const old = this.theSceneGraphRepn;
      this.theSceneGraphRepn = theNewSGR;
      this.changeOfBasisNode.addChild(this.theSceneGraphRepn);
      this.changeOfBasisNode.removeChild(old);
      this.newElementList = false;
    }

    if (this.newWorldNode || this.newCameraRepn) {
      if (this.oldWorldNode != null && this.fundamentalRegion.isDirectAncestor(this.oldWorldNode)) {
        this.fundamentalRegion.removeChild(this.oldWorldNode);
      }
      if (this.worldNode != null && !this.fundamentalRegion.isDirectAncestor(this.worldNode)) {
        this.fundamentalRegion.addChild(this.worldNode);
      }
      if (this.cameraRepn != null && !this.fundamentalRegion.isDirectAncestor(this.cameraRepn)) {
        this.fundamentalRegion.addChild(this.cameraRepn);
      }
      this.newWorldNode = false;
      this.newCameraRepn = false;
    }

    this.#updateFlatten();
    SceneGraphUtility.setMetric(this.followCameraNode, this.theGroup.getMetric());
    if (this.constraint != null) AbstractDGSGR.applyConstraint(this, this.constraint);
  }

  #updateFlatten() {
    // SceneGraphUtility.flatten() is not fully ported yet.
    this.theSceneGraphRepn.setVisible(!this.flatten);
    if (this.flatSceneGraphRepn != null) this.flatSceneGraphRepn.setVisible(this.flatten);
  }

  getRepresentationRoot() {
    return this.followCameraNode;
  }

  getChangeOfBasisNode() {
    return this.changeOfBasisNode;
  }

  getElementList() {
    return this.elementList;
  }

  setElementList(tlist) {
    this.elementList = tlist;
    this.newElementList = true;
  }

  addElement(dge) {
    const tmp = new SceneGraphComponent();
    const newTrans = new Transformation(dge.getArray());
    newTrans.setName(dge.getWord());
    tmp.setName(`dge ${dge.getWord()}`);
    tmp.setTransformation(newTrans);
    tmp.addChild(this.fundamentalRegion);
    this.theSceneGraphRepn.addChild(tmp);
    return tmp;
  }

  /**
   * Remove a rendered element either by SceneGraphPath-like object or component.
   * @param {{getLastComponent?: Function}|SceneGraphComponent} pathOrComponent
   */
  removeElement(pathOrComponent) {
    let lastComp = pathOrComponent;
    if (pathOrComponent && typeof pathOrComponent.getLastComponent === 'function') {
      lastComp = pathOrComponent.getLastComponent();
    }
    if (lastComp instanceof SceneGraphComponent && this.theSceneGraphRepn.isDirectAncestor(lastComp)) {
      this.theSceneGraphRepn.removeChild(lastComp);
    }
  }

  getOfficialElementList() {
    return this.officialElementList;
  }

  setOfficialElementList(officialElementList) {
    this.officialElementList = officialElementList;
    this.newElementList = true;
  }

  getElementListFromSGC() {
    const n = this.theSceneGraphRepn.getChildComponentCount();
    const ret = new Array(n);
    for (let k = 0; k < n; ++k) {
      const transf = this.theSceneGraphRepn.getChildComponent(k).getTransformation();
      ret[k] = new DiscreteGroupElement(this.theGroup.getMetric(), transf.getMatrix(), transf.getName());
    }
    return ret;
  }

  getCameraRepn() {
    return this.cameraRepn;
  }

  setCameraRepn(cr) {
    if (cr === this.cameraRepn) return;
    this.cameraRepn = cr;
    this.newCameraRepn = true;
  }

  getWorldNode() {
    return this.worldNode;
  }

  getFundamentalRegion() {
    return this.fundamentalRegion;
  }

  setWorldNode(w) {
    if (w === this.worldNode) return;
    this.oldWorldNode = this.worldNode;
    this.worldNode = w;
    this.newWorldNode = true;
    if (this.worldNode && this.worldNode.getAppearance() == null) {
      this.worldNode.setAppearance(new Appearance());
    }
  }

  getSceneGraphRepn() {
    return this.theSceneGraphRepn;
  }

  getAppList() {
    return this.appList;
  }

  setAppList(appList) {
    this.appList = appList;
    this.newAppList = true;
  }

  setActive(b) {
    this.active = !!b;
  }

  isActive() {
    return this.active;
  }

  isFlatten() {
    return this.flatten;
  }

  setFlatten(flatten) {
    this.flatten = !!flatten;
    this.#updateFlatten();
  }

  /**
   * Optional helper for compatibility.
   */
  attachToViewer(_viewer, _path = null) {
    // No-op in this first pass; users can add getRepresentationRoot() directly to scene root.
  }

  detachFromViewer() {
    // No-op for now.
  }

  dispose() {
    this.setActive(false);
  }
}

