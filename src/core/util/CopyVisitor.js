/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { SceneGraphNode } from '../scene/SceneGraphNode.js';
import { Appearance } from '../scene/Appearance.js';
import { Camera } from '../scene/Camera.js';
import { ClippingPlane } from '../scene/ClippingPlane.js';
import { Cylinder } from '../scene/Cylinder.js';
import { Geometry } from '../scene/Geometry.js';
import { IndexedFaceSet } from '../scene/IndexedFaceSet.js';
import { IndexedLineSet } from '../scene/IndexedLineSet.js';
import { PointSet } from '../scene/PointSet.js';
import { Sphere } from '../scene/Sphere.js';
import { Transformation } from '../scene/Transformation.js';
import { getLogger, Category } from './LoggingSystem.js';

const logger = getLogger('jsreality.core.util.CopyVisitor');

/**
 * Creates a copy of the visited SceneGraphNode. The copy may be accessed via getCopy().
 * Note: for SceneGraphComponent, copied attributes do not include children.
 */
export class CopyVisitor extends SceneGraphVisitor {
  /** @type {SceneGraphNode|null} */
  #created = null;

  /**
   * @returns {SceneGraphNode|null}
   */
  getCopy() {
    return this.#created;
  }

  /**
   * Copy common SceneGraphNode attributes.
   * @param {SceneGraphNode} src
   * @param {SceneGraphNode} dst
   */
  copySceneGraphNode(src, dst) {
    dst.setName(src.getName());
  }

  /**
   * @param {SceneGraphComponent} src
   * @param {SceneGraphComponent} dst
   */
  copySceneGraphComponent(src, dst) {
    this.copySceneGraphNode(src, dst);
    dst.setVisible(src.isVisible());
    dst.setPickable(src.isPickable());
    dst.setOwner(src.getOwner());
  }

  /**
   * @param {Appearance} src
   * @param {Appearance} dst
   */
  copyAppearance(src, dst) {
    const attrs = src.getStoredAttributes();
    for (const key of attrs) {
      dst.setAttribute(key, src.getAttribute(key));
    }
    this.copySceneGraphNode(src, dst);
  }

  /**
   * @param {Transformation} src
   * @param {Transformation} dst
   */
  copyTransformation(src, dst) {
    dst.setMatrix(src.getMatrix());
    this.copySceneGraphNode(src, dst);
  }

  /**
   * @param {Geometry} src
   * @param {Geometry} dst
   */
  copyGeometry(src, dst) {
    dst.setGeometryAttributes(src.getGeometryAttributes());
    this.copySceneGraphNode(src, dst);
  }

  /**
   * @param {Sphere} src
   * @param {Sphere} dst
   */
  copySphere(src, dst) {
    this.copyGeometry(src, dst);
  }

  /**
   * @param {Cylinder} src
   * @param {Cylinder} dst
   */
  copyCylinder(src, dst) {
    this.copyGeometry(src, dst);
  }

  /**
   * @param {PointSet} src
   * @param {PointSet} dst
   */
  copyPointSet(src, dst) {
    dst.setVertexCountAndAttributes(src.getVertexAttributes());
    this.copyGeometry(src, dst);
  }

  /**
   * @param {IndexedLineSet} src
   * @param {IndexedLineSet} dst
   */
  copyIndexedLineSet(src, dst) {
    dst.setEdgeCountAndAttributes(src.getEdgeAttributes());
    this.copyPointSet(src, dst);
  }

  /**
   * @param {IndexedFaceSet} src
   * @param {IndexedFaceSet} dst
   */
  copyIndexedFaceSet(src, dst) {
    dst.setFaceCountAndAttributes(src.getFaceAttributes());
    this.copyIndexedLineSet(src, dst);
  }

  /**
   * @param {Camera} src
   * @param {Camera} dst
   */
  copyCamera(src, dst) {
    dst.setEyeSeparation(src.getEyeSeparation());
    dst.setFar(src.getFar());
    dst.setFieldOfView(src.getFieldOfView());
    dst.setFocus(src.getFocus());
    dst.setNear(src.getNear());
    dst.setOnAxis(src.isOnAxis());
    dst.setOrientationMatrix(src.getOrientationMatrix());
    dst.setPerspective(src.isPerspective());
    dst.setStereo(src.isStereo());
    if (!src.isOnAxis()) dst.setViewPort(src.getViewPort());
    this.copySceneGraphNode(src, dst);
  }

  /**
   * jsReality currently does not provide concrete Light subclasses matching
   * jReality's DirectionalLight/PointLight/SpotLight API.
   * Keep a dedicated method to make this limitation explicit.
   * @param {*} src
   * @param {*} dst
   */
  copyLight(src, dst) {
    logger.warn(
      Category.ALL,
      '[CopyVisitor] copyLight() invoked, but full Light subclass parity is not available yet.'
    );
    if (dst && typeof dst.setColor === 'function' && typeof src?.getColor === 'function') {
      dst.setColor(src.getColor());
    }
    if (dst && typeof dst.setIntensity === 'function' && typeof src?.getIntensity === 'function') {
      dst.setIntensity(src.getIntensity());
    }
    if (src instanceof SceneGraphNode && dst instanceof SceneGraphNode) {
      this.copySceneGraphNode(src, dst);
    }
  }

  /**
   * @param {Appearance} a
   */
  visitAppearance(a) {
    const created = new Appearance();
    this.copyAppearance(a, created);
    this.#created = created;
  }

  /**
   * @param {Camera} c
   */
  visitCamera(c) {
    const created = new Camera();
    this.copyCamera(c, created);
    this.#created = created;
  }

  /**
   * @param {Cylinder} c
   */
  visitCylinder(c) {
    const created = new Cylinder();
    this.copyCylinder(c, created);
    this.#created = created;
  }

  /**
   * @param {IndexedFaceSet} i
   */
  visitIndexedFaceSet(i) {
    const created = new IndexedFaceSet();
    this.copyIndexedFaceSet(i, created);
    this.#created = created;
  }

  /**
   * @param {IndexedLineSet} i
   */
  visitIndexedLineSet(i) {
    const created = new IndexedLineSet();
    this.copyIndexedLineSet(i, created);
    this.#created = created;
  }

  /**
   * @param {PointSet} p
   */
  visitPointSet(p) {
    const created = new PointSet();
    this.copyPointSet(p, created);
    this.#created = created;
  }

  /**
   * @param {SceneGraphComponent} c
   */
  visitComponent(c) {
    const created = new SceneGraphComponent();
    this.copySceneGraphComponent(c, created); // Note: attributes do not include children
    this.#created = created;
  }

  /**
   * @param {Sphere} s
   */
  visitSphere(s) {
    const created = new Sphere();
    this.copySphere(s, created);
    this.#created = created;
  }

  /**
   * @param {ClippingPlane} c
   */
  visitClippingPlane(c) {
    const created = new ClippingPlane();
    this.copyGeometry(c, created);
    this.#created = created;
  }

  /**
   * @param {Transformation} t
   */
  visitTransformation(t) {
    const created = new Transformation();
    this.copyTransformation(t, created);
    this.#created = created;
  }

  /**
   * Fallback handler for unrecognized nodes.
   * Tries best-effort light copy first (with explicit warning).
   * @param {SceneGraphNode} node
   */
  visit(node) {
    if (node && /Light$/.test(node.constructor?.name || '')) {
      const created = new node.constructor();
      this.copyLight(node, created);
      this.#created = created;
      return;
    }
    throw new Error(`${node?.constructor} not handled by ${this.constructor.name}`);
  }
}

