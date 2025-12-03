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

  getContent() {
    const world = SceneGraphUtility.createFullSceneGraphComponent("world");
    const ifs = this.createSphere(this._sphereLevel);
    world.setGeometry(ifs);
  

    const ap = world.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0,128,255));
    ap.setAttribute("lineShader." + CommonAttributes.TUBE_RADIUS, 0.005);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0, 255, 0));
    ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.01);

    return world;
  }

  
  getInspectorDescriptors() {
    return [
      {
        id: 'app-params',
        title: 'Animation Parameters',
        items: [
          {
            id: 'sphere-level',
            type: DescriptorType.INT,
            label: 'Sphere Level',
            getValue: () => this._sphereLevel,
            setValue: (val) => {
              this._sphereLevel = val;
              this.onParameterChanged('sphere-level');
            },
            min: 0,
            max: 8,
            step: 1
          },
          {
            id: 'scale',
            type: DescriptorType.FLOAT,
            label: 'Scale',
            getValue: () => this._scale,
            setValue: (val) => {
              this._scale = val;
              this.onParameterChanged('scale');
            },
            min: 0.1,
            max: 2.0,
            step: 0.1
          }
        ]
      }
    ];
  }
  
  onParameterChanged(paramId) {
    // Update scene based on parameter change
    if (paramId === 'sphere-level') {
      const world = this.getViewer().getSceneRoot();
      if (world) {
        const ifs = this.createSphere(this._sphereLevel);
        world.setGeometry(ifs);
      }
    }
    this.getViewer().render();
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
    
    this.getViewer().render();
  }

  setValueAtTime(t) {
    console.log(t);
  }

}