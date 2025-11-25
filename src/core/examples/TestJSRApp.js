/**
 * Test application for JSRApp.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRApp } from '../viewers/JSRApp.js';
import { SceneGraphUtility } from '../util/SceneGraphUtility.js';
import { SphereUtility } from '../geometry/SphereUtility.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { Color } from '../util/Color.js';
import { TestTool } from './TestTool.js';
import { Primitives } from '../geometry/Primitives.js';
import { MatrixBuilder } from '../math/MatrixBuilder.js';

/**
 * Abstract base class for jsReality applications.
 * Subclasses must implement getContent() to provide the scene graph content.
 * 
 * @abstract
 */
export class TestJSRApp extends JSRApp {
    
    getContent() {
        const world = SceneGraphUtility.createFullSceneGraphComponent("world");
        // world.setGeometry(SphereUtility.tessellatedIcosahedronSphere(3));
        const ap = world.getAppearance();
        ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
        ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0,0,0));
        ap.setAttribute("lineShader." + CommonAttributes.TUBE_RADIUS, 0.005);
        ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
        ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0,1,0));
         ap.setAttribute("pointShader." + CommonAttributes.SPHERES_DRAW, true);
        ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.005);
        const geo = Primitives.regularPolygon(13, .5);
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
              const sgc = SceneGraphUtility.createFullSceneGraphComponent("sgc"+i+","+j);
              sgc.setGeometry(geo);
              sgc.getTransformation().setMatrix(MatrixBuilder.euclidean().translate(i-1,j-1,0).scale(0.5).getArray());
              world.addChild(sgc);
              const tool = new TestTool();
              tool.setName("testTool"+i+","+j);
              sgc.addTool(tool);
          }
        }
        
        return world;
      }
  
    /**
     * Called after initialization and before rendering to set up application
     * specific attributes.
     */
    display() { 
        super.display();
        this._toolSystem.addTool(new TestTool());
        
        const ap = this._viewer.getSceneRoot().getAppearance();
        ap.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(200,150,100));
     
        this._viewer.render();
    }

    setValueAtTime(t) {
        console.log(t);
    }

  }