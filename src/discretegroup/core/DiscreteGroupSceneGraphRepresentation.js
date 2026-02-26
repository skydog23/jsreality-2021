/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { Appearance, INHERITED} from '../../core/scene/Appearance.js';
import { SceneGraphComponent } from '../../core/scene/SceneGraphComponent.js';
import { Transformation } from '../../core/scene/Transformation.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { getLogger } from '../../core/util/LoggingSystem.js';
import { AbstractDGSGR } from './AbstractDGSGR.js';
import { DiscreteGroupElement } from './DiscreteGroupElement.js';
import { DiscreteGroupViewportConstraint } from './DiscreteGroupViewportConstraint.js';
import { DiscreteGroupUtility } from './DiscreteGroupUtility.js';
import { DiscreteGroupSimpleConstraint } from './DiscreteGroupSimpleConstraint.js';
const logger = getLogger('discretegroup.DGSGR');

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
    this.appList = null;
    this.constraint = null;
    this.pickConstraint = null;

    this.newElementList = true;
    this.newAppList = true;
    this.newWorldNode = false;
    this.newCameraRepn = false;
    this.flatten = false;
    this.active = true;

    this.clipToCamera = false;
    this.followsCamera = false;
    this.clipDelay = 500;
    this.followDelay = 500;
    this.viewportConstraint = null;
    this._viewer = null;
    this._pathToWorld = null;
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

  /**
   * Set a constraint that controls which group elements get a SceneGraphComponent
   * allocated (and are therefore pickable).  When copyCat is true, all elements
   * are still rendered via instancing regardless of this constraint; only the SGC
   * allocation is affected.  When copyCat is false, all elements get SGCs but the
   * pickable flag is set according to this constraint.
   *
   * NOTE: instance-buffer indices and SGC child indices will not be 1:1 aligned
   * when a pickConstraint is active in copyCat mode.  The element's word (stored
   * in the SGC/Transformation name) can be used to identify the group element.
   *
   * Using a DiscreteGroupViewportConstraint as pickConstraint is discouraged
   * because the pick set should be small and stable, not viewport-dependent.
   * A warning is logged if one is supplied.
   *
   * @param {import('./DiscreteGroupConstraint.js').DiscreteGroupConstraint|null} c
   */
  setPickConstraint(c) {
    if (c instanceof DiscreteGroupViewportConstraint) {
      logger.warning?.('setPickConstraint: using a viewport constraint as pick constraint '
        + 'is discouraged; the pick set should be small and viewport-independent.');
    }
    this.pickConstraint = c;
  }

  getPickConstraint() {
    return this.pickConstraint;
  }

  #pickcount=0;
  update() {
    if (this.newAppList || this.newElementList || this.elementList == null) {
      if (this.elementList == null) {
        this.theGroup.update();
        this.elementList = this.theGroup.getElementList();
      }
      console.log('DiscreteGroupSceneGraphRepresentation.update elementList', this.elementList.length);
      console.log('DiscreteGroupSceneGraphRepresentation.update constraint', this.theGroup.getConstraint());
      const cp = this.theGroup.getColorPicker?.();
      if (cp && this.elementList?.length > 0) {
        cp.assignColorIndices(this.elementList);
      }

      const theNewSGR = SceneGraphUtility.createFullSceneGraphComponent(`${this.name} DG Parent`);
      const n = this.elementList?.length ?? 0;
      const hasAppList = this.appList != null && this.appList.length > 0;
     
      const instanceTransforms = new Float32Array(n * 16);
      const instanceColors = hasAppList ? new Float32Array(n * 4) : null;

      // prepare the instanced buffers for the copyCat mode
      if (this.copyCat) {
     
        for (let i = 0; i < n; ++i) {
          const dge = this.elementList[i];

          // Instance buffers always include every element (rendering is complete).
          instanceTransforms.set(dge.getArray(), i * 16);
          if (hasAppList) {
            const index = ((dge.getColorIndex() % this.appList.length) + this.appList.length) % this.appList.length;
            const app = this.appList[index];
            const dc = app?.getAttribute?.('polygonShader.diffuseColor');
            if (dc && typeof dc.getRed === 'function') {
              instanceColors[i * 4] = dc.getRed();
              instanceColors[i * 4 + 1] = dc.getGreen();
              instanceColors[i * 4 + 2] = dc.getBlue();
              instanceColors[i * 4 + 3] = dc.getAlpha();
            } else if (Array.isArray(dc)) {
              instanceColors[i * 4] = dc[0] ?? 1;
              instanceColors[i * 4 + 1] = dc[1] ?? 1;
              instanceColors[i * 4 + 2] = dc[2] ?? 1;
              instanceColors[i * 4 + 3] = dc[3] ?? 1;
            } else {
              instanceColors[i * 4] = instanceColors[i * 4 + 1] = instanceColors[i * 4 + 2] = instanceColors[i * 4 + 3] = 1;
            }
          }
        }
      }

      const pc = !this.copyCat ?  null : 
           (this.pickConstraint ? this.pickConstraint : new DiscreteGroupSimpleConstraint(-1, -1, 50)) ;
      console.log('DGSGR.update pickConstraint', pc);
      console.log('DGSGR.update copyCat', this.copyCat);

      // now process the visible elements.
      // It either comes from the full group, or when copyCat is true, from the pick constraint
      const ellist= this.copyCat ? DiscreteGroupUtility.generateElements(this.theGroup, pc) : this.theGroup.getElementList();
      console.log('DGSGR.update ellist.length', ellist.length);
      for (let i = 0; i < ellist.length; ++i) {
        const dge = ellist[i];
      
        const tmp = new SceneGraphComponent(`dge ${dge.getWord()}`);
        const newTrans = new Transformation(dge.getArray());
        newTrans.setName(dge.getWord());
        tmp.setTransformation(newTrans);
        if (hasAppList) {
          const index = ((dge.getColorIndex() % this.appList.length) + this.appList.length) % this.appList.length;
          tmp.setAppearance(this.appList[index]);
        }
        tmp.addChild(this.fundamentalRegion);

        theNewSGR.addChild(tmp);
      }

      const parentApp = theNewSGR.getAppearance() || new Appearance();
      // write out the instanced geometry attributes if copyCat is true
      parentApp.setAttribute('instancedGeometry', this.copyCat);
      if (this.copyCat) {
        parentApp.setAttribute('instanceTransforms', instanceTransforms);
        if (hasAppList) parentApp.setAttribute('instanceColors', instanceColors);
        parentApp.setAttribute('instanceCount', n);
        parentApp.setAttribute('instanceFundamentalRegion', this.fundamentalRegion);
      }
      if (!theNewSGR.getAppearance()) theNewSGR.setAppearance(parentApp);

      this.newAppList = false;
      const old = this.theSceneGraphRepn;
      this.theSceneGraphRepn = theNewSGR;
      this.changeOfBasisNode.removeChild(old);
      this.changeOfBasisNode.addChild(this.theSceneGraphRepn);
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

  setClipToCamera(b) {
    this.clipToCamera = !!b;
  }

  isClipToCamera() {
    return this.clipToCamera;
  }

  setFollowsCamera(b) {
    this.followsCamera = !!b;
  }

  isFollowsCamera() {
    return this.followsCamera;
  }

  setClipDelay(ms) {
    this.clipDelay = ms;
  }

  getClipDelay() {
    return this.clipDelay;
  }

  setFollowDelay(ms) {
    this.followDelay = ms;
  }

  getFollowDelay() {
    return this.followDelay;
  }

  setViewportConstraint(vc) {
    this.viewportConstraint = vc;
  }

  getViewportConstraint() {
    return this.viewportConstraint;
  }

  getCopyCatCount() {
    return this.theSceneGraphRepn?.getChildComponentCount() ?? 0;
  }

  /**
   * Store the viewer and path-to-world for viewport constraint updates.
   */
  attachToViewer(viewer, path = null) {
    this._viewer = viewer;
    this._pathToWorld = path;
  }

  detachFromViewer() {
    this._viewer = null;
    this._pathToWorld = null;
  }

  dispose() {
    this.setActive(false);
  }
}

