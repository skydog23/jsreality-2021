/**
 * Test application for JSRApp.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRApp } from '../JSRApp.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { SphereUtility } from '../../core/geometry/SphereUtility.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';

/**
 * Abstract base class for jsReality applications.
 * Subclasses must implement getContent() to provide the scene graph content.
 * 
 * @abstract
 */
export class TestJSRApp extends JSRApp {

  getContent() {
    const world = SceneGraphUtility.createFullSceneGraphComponent("world");
    world.setGeometry(SphereUtility.tessellatedIcosahedronSphere(3));
    const ap = world.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0, 0, 0));
    ap.setAttribute("lineShader." + CommonAttributes.TUBE_RADIUS, 0.005);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0, 1, 0));
    ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.01);

    return world;
  }

  /**
   * Called after initialization and before rendering to set up application
   * specific attributes.
   */
  display() {
    super.display();
    this.enableInspector();
  
    this._viewer.render();
  }

  setValueAtTime(t) {
    console.log(t);
  }

}