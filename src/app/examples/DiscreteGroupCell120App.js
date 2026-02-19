/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRApp } from '../JSRApp.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import Color from '../../core/util/Color.js';
import { RotateTool } from '../../core/tools/RotateTool.js';
import { FlyTool } from '../../core/tools/FlyTool.js';
import { createCell120Example } from '../../discretegroup/tutorial/Cell120Example.js';

/**
 * JSRApp wrapper for the `.gens`-based Cell120 tutorial.
 *
 * Loading is asynchronous (resource fetch), so `getContent()` returns a stable
 * placeholder node immediately and populates it when ready.
 */
export class DiscreteGroupCell120App extends JSRApp {
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
      const { root } = await createCell120Example();
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
}

