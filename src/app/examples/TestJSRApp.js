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
import { toDataList } from '../../core/scene/data/DataUtility.js';
import { GeometryAttribute } from '../../core/scene/GeometryAttribute.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';

/**
 * Abstract base class for jsReality applications.
 * Subclasses must implement getContent() to provide the scene graph content.
 * 
 * @abstract
 */
export class TestJSRApp extends JSRApp {
  _sphereLevel = 3;
  _scale = 0.5;
  _world = SceneGraphUtility.createFullSceneGraphComponent("world");

  getContent() {
     const ifs = this.createSphere(this._sphereLevel);
    this._world.setGeometry(ifs);
  

    const ap = this._world.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0,128,255));
    ap.setAttribute("lineShader." + CommonAttributes.TUBE_RADIUS, 0.005);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0, 255, 0));
    ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.01);

    return this._world;
  }

  
  getInspectorDescriptors() {
    return [
      {
        key: 'sphere-level',
        type: DescriptorType.INT,
        label: 'Sphere Level',
        getValue: () => this._sphereLevel,
        setValue: (val) => {
          this._sphereLevel = val;
          this.updateSphere();
        },
        min: 0,
        max: 8,
        step: 1
      },
      {
        key: 'scale',
        type: DescriptorType.FLOAT,
        label: 'Scale',
        getValue: () => this._scale,
        setValue: (val) => {
          this._scale = val;
          console.log('scale', val);
        },
        min: 0.1,
        max: 2.0,
        step: 0.1
      }
    ];
  }
  
  updateSphere() {
    const ifs = this.createSphere(this._sphereLevel);
    this._world.setGeometry(ifs);
  }

  createSphere(level) {
    const ifs = SphereUtility.tessellatedIcosahedronSphere(level);
    const n = ifs.getNumFaces();
    // generate a random color for each face
    const colors = new Array(n).map(() => new Color(255*Math.random(), 255*Math.random(), 255*Math.random()));
    for (let i = 0; i < n; i++) {
      colors[i] = new Color(255*Math.random(), 255*Math.random(), 255*Math.random());
    }
    const data = toDataList(colors, null, 'float32');
    ifs.setFaceAttribute(GeometryAttribute.COLORS, data);
    return ifs;
  }

  /**
   * Called after initialization and before rendering to set up application
   * specific attributes.
   */
  display() {
    super.display();
    // Enable debug/perf logging on viewers (logs every N frames).
    // Note: JSRApp.getViewer() returns a ViewerSwitch; enable on all contained viewers
    // so whichever viewer is active will report stats.
    const viewerSwitch = this.getViewer();
    const viewers = (viewerSwitch && typeof viewerSwitch.getViewers === 'function')
      ? viewerSwitch.getViewers()
      : [viewerSwitch];
    for (const v of viewers) {
      if (v && typeof v.setDebugPerf === 'function') {
        v.setDebugPerf({ enabled: true, everyNFrames: 30 });
      }
    }

    this._animationPlugin.setAnimateSceneGraph(true);
    this._animationPlugin.setAnimateCamera(false);

    this.getViewer().render();
  }

  setValueAtTime(t) {
    console.log(t);
  }

}