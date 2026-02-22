/**
* 
 * Copyright (c) 2025-2026, jsReality Contributors
 
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRApp } from '../../JSRApp.js';
import { SceneGraphUtility } from '../../../core/util/SceneGraphUtility.js';
import * as CommonAttributes from '../../../core/shader/CommonAttributes.js';
import Color from '../../../core/util/Color.js';
import { RotateTool } from '../../../core/tools/RotateTool.js';
import { FlyTool } from '../../../core/tools/FlyTool.js';
import * as Pn from '../../../core/math/Pn.js';
import {
  DirichletDomain,
  DiscreteGroupSceneGraphRepresentation,
  DiscreteGroupSimpleConstraint,
  ImportGroup,
} from '../../../discretegroup/core/index.js';

/**
 * JSRApp wrapper for the `.gens`-based Cell120 tutorial.
 *
 * Loading is asynchronous (resource fetch), so `getContent()` returns a stable
 * placeholder node immediately and populates it when ready.
 */
export class Cell120Demo extends JSRApp {
  _root = null;
  _loaded = false;

  getContent() {
    this._root = SceneGraphUtility.createFullSceneGraphComponent('cell120Root');
    const ap = this._root.getAppearance();
    ap.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(20, 20, 40));
    this.#loadContent();
    this._root.addTool(new RotateTool());
    this._root.addTool(new FlyTool());
    return this._root;
  }

  async #loadContent() {
    if (this._loaded || !this._root) return;
    this._loaded = true;
    try {
      const dg = await ImportGroup.initFromResource('resources/groups/120cell.gens', Pn.ELLIPTIC);
      dg.setFinite(true);
      dg.setName('120 cell');
      dg.setDimension(3);
      dg.setMetric(Pn.ELLIPTIC);
      dg.setConstraint(new DiscreteGroupSimpleConstraint(-1, -1, 13));
      dg.update();

      const dirdom = new DirichletDomain(dg);
      dirdom.update();

      const world = SceneGraphUtility.createFullSceneGraphComponent('cell120-fundamental-domain');
      world.setGeometry(dirdom.getDirichletDomain());
      const worldAp = world.getAppearance();
      worldAp.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.WHITE);
      worldAp.setAttribute(CommonAttributes.METRIC, Pn.ELLIPTIC);
      worldAp.setAttribute(CommonAttributes.USE_GLSL, true);
      worldAp.setAttribute(CommonAttributes.EDGE_DRAW, false);
      worldAp.setAttribute(CommonAttributes.VERTEX_DRAW, false);
      worldAp.setAttribute(CommonAttributes.TEXT_SCALE, 0.01);

      const dgsgr = new DiscreteGroupSceneGraphRepresentation(dg);
      dgsgr.setWorldNode(world);
      dgsgr.update();
      const root = dgsgr.getRepresentationRoot();
      this._root.addChild(root);
      this.getViewer()?.render();
    } catch (err) {
      this._loaded = false;
      console.error('Failed to load Cell120 example', err);
    }
  }

  display() {
    super.display();
    this.setup3DCamera();
    this.getViewer().render();
  }

  getHelpTitle() {
    return '120-Cell';
  }

  getHelpSummary() {
    return 'Elliptic 120-cell tessellation from a .gens resource file.';
  }
}

