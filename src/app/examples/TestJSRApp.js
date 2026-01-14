/**
 * Test application for JSRApp.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SphereUtility } from '../../core/geometry/SphereUtility.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import { toDataList } from '../../core/scene/data/DataUtility.js';
import { GeometryAttribute } from '../../core/scene/GeometryAttribute.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { RotateTool } from '../../core/tools/RotateTool.js';
import { TranslateTool } from '../../core/tools/TranslateTool.js';
import { DraggingTool } from '../../core/tools/DraggingTool.js';
import * as CameraUtility from '../../core/util/CameraUtility.js';
import { Color } from '../../core/util/Color.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';
/**
 * Abstract base class for jsReality applications.
 * Subclasses must implement getContent() to provide the scene graph content.
 * 
 * @abstract
 */
export class TestJSRApp extends JSRApp {
  _sphereLevel = 1;
  _saturate = 1.0;
  _ifs = null;
  _origFaceColors = null;
  _world = SceneGraphUtility.createFullSceneGraphComponent("world");

  getContent() {
     this.updateSphere();
  

    const ap = this._world.getAppearance();
    ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, true);
    ap.setAttribute(CommonAttributes.TRANSPARENCY_ENABLED, false);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute("polygonShader." + CommonAttributes.DIFFUSE_COLOR, new Color(128,0,255));
    ap.setAttribute("polygonShader." + CommonAttributes.SMOOTH_SHADING, false);
    ap.setAttribute("polygonShader." + CommonAttributes.TRANSPARENCY, 0.5);
    ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0,128,255));
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0, 255, 0));
    ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, true);
     const rotTool = new RotateTool();
    rotTool.setName("rotateTool");
    // rotTool.debugInertia = true;
    this._world.addTool(rotTool);
    const transTool = new TranslateTool();
    transTool.setName("translateTool");
    this._world.addTool(transTool);
    return this._world;
  }

  getShowPanels() {
    return [true, true, true, true];
  }

  getInspectorDescriptors() {
    return [
      {
         type: DescriptorType.TEXT_SLIDER,
        valueType: 'int',
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
         type: DescriptorType.TEXT_SLIDER,
        valueType: 'float',
        label: 'Saturate',
        getValue: () => this._saturate,
        setValue: (val) => {
          this._saturate = val;
          this.updateSaturate();
        },
        min: 0.0,
        max: 1.0,
      }
    ];
  }


  updateSphere() {
    this._ifs = SphereUtility.tessellatedIcosahedronSphere(this._sphereLevel);
    const ap = this._world.getAppearance();
    const factor = Math.pow(2, 4-this._sphereLevel )  ;
    ap.setAttribute("lineShader." + CommonAttributes.TUBE_RADIUS, 0.005 * factor);
    ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.01 * factor);
    this.updateSaturate();
    this._world.setGeometry(this._ifs);
    //MatrixBuilder.euclidean().scale(this._scale).assignTo(this._world);

  }

  updateSaturate() {
    // generate a random color for each face
    const n = this._ifs.getNumFaces();
    if (this._origFaceColors == null || this._origFaceColors.length != n) {
      this._origFaceColors = new Array(n);
      for (let i = 0; i < n; i++) {
        this._origFaceColors[i] = [Math.random(), Math.random(), Math.random(), Math.random()];
      }
    }
  
    const satColors = new Array(n);
     const white = [1,1,1,1];
    for (let i = 0; i < n; i++) {
      let c = this._origFaceColors[i];
      let max = Math.max(c[0], c[1], c[2]);
      let min = Math.min(c[0], c[1], c[2]);
      min = 0;
      let cs = null;
      if (max == min) {
        cs = white;
      } else {
      let t = (max-min)/max;
      cs = c.map(x => (1-this._saturate)*x + this._saturate*(x-min)/(max-min));
      }
      satColors[i] = cs;
    }
    const data = toDataList(satColors, null, 'float32');
    this._ifs.setFaceAttribute(GeometryAttribute.COLORS, data);
  }

  /**
   * Called after initialization and before rendering to set up application
   * specific attributes.
   */
  display() {
    super.display();
    this.setup3DCamera();

    this._animationPlugin.setAnimateSceneGraph(true);
    this._animationPlugin.setAnimateCamera(false);

    this.getViewer().render();
  }

  

  setValueAtTime(t) {
    console.log(t);
  }

}