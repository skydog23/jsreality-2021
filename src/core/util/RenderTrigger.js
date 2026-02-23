/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Transformation } from '../scene/Transformation.js';
import { Appearance } from '../scene/Appearance.js';
import { Camera } from '../scene/Camera.js';
import { Geometry } from '../scene/Geometry.js';
import { Light } from '../scene/Light.js';
import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';

/**
 * Watches a scene graph subtree for any change and triggers rendering on
 * registered viewers.
 *
 * Uses `renderAsync()` (backed by requestAnimationFrame) so multiple changes
 * within a single frame coalesce into one render.
 *
 * Port of de.jreality.util.RenderTrigger.
 */
export class RenderTrigger {

  #viewers = [];
  #collecting = false;
  #needsRender = false;
  #async = true;

  /** Bound once so add/removeEventListener see the same function reference. */
  #handler = () => this.#fireRender();

  // ---- viewer management --------------------------------------------------

  addViewer(v) {
    if (!this.#viewers.includes(v)) this.#viewers.push(v);
  }

  removeViewer(v) {
    this.#viewers = this.#viewers.filter(x => x !== v);
  }

  // ---- scene graph registration -------------------------------------------

  addSceneGraphComponent(sgc) {
    this.#registerNode(sgc);
  }

  removeSceneGraphComponent(sgc) {
    this.#unregisterNode(sgc);
  }

  // ---- batching -----------------------------------------------------------

  startCollect() {
    this.#collecting = true;
    this.#needsRender = false;
  }

  finishCollect() {
    this.#collecting = false;
    if (this.#needsRender) {
      this.#needsRender = false;
      this.#fireRender();
    }
  }

  forceRender() {
    this.#fireRender();
  }

  isAsync() { return this.#async; }
  setAsync(b) { this.#async = b; }

  // ---- internal -----------------------------------------------------------

  #fireRender() {
    if (this.#collecting) {
      this.#needsRender = true;
      return;
    }
    for (const v of this.#viewers) {
      if (this.#async && v.canRenderAsync?.()) {
        v.renderAsync();
      } else {
        v.render();
      }
    }
  }

  /**
   * Recursively register on every node in the subtree rooted at `node`.
   * When children are later added/removed the trigger dynamically
   * registers/unregisters on the new/old subtrees.
   */
  #registerNode(node) {
    const handler = this.#handler;
    const self = this;

    const visitor = new class extends SceneGraphVisitor {
      visitComponent(c) {
        c.addSceneGraphComponentListener(self.#onComponentEvent);
        c.childrenAccept(this);
      }
      visitTransformation(t) {
        t.addTransformationListener(handler);
      }
      visitAppearance(a) {
        a.addAppearanceListener(handler);
      }
      visitCamera(cam) {
        cam.addCameraListener(handler);
      }
      visitGeometry(g) {
        g.addGeometryListener(handler);
      }
      visitLight(l) {
        l.addEventListener?.('lightChanged', handler);
      }
    }();

    node.accept(visitor);
  }

  #unregisterNode(node) {
    const handler = this.#handler;
    const self = this;

    const visitor = new class extends SceneGraphVisitor {
      visitComponent(c) {
        c.removeSceneGraphComponentListener(self.#onComponentEvent);
        c.childrenAccept(this);
      }
      visitTransformation(t) {
        t.removeTransformationListener(handler);
      }
      visitAppearance(a) {
        a.removeAppearanceListener(handler);
      }
      visitCamera(cam) {
        cam.removeCameraListener(handler);
      }
      visitGeometry(g) {
        g.removeGeometryListener(handler);
      }
      visitLight(l) {
        l.removeEventListener?.('lightChanged', handler);
      }
    }();

    node.accept(visitor);
  }

  /**
   * Bound handler for SceneGraphComponent child events.
   * Dynamically registers/unregisters listeners on added/removed subtrees.
   */
  #onComponentEvent = (ev) => {
    if (ev.newChild) this.#registerNode(ev.newChild);
    if (ev.oldChild) this.#unregisterNode(ev.oldChild);
    this.#fireRender();
  };
}
