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
import { TestTool } from './TestTool.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import { Appearance } from '../../core/scene/Appearance.js';
import { AbstractTool } from '../../core/scene/tool/AbstractTool.js';
import { ToolUtility } from '../../core/scene/tool/ToolUtility.js';
import { getLogger, setModuleLevel, Level, Category } from '../../core/util/LoggingSystem.js';
import * as CameraUtility from '../../core/util/CameraUtility.js';
const logger = getLogger('jsreality.app.examples.TestToolApp');
setModuleLevel('jsreality.app.examples.TestToolApp', Level.FINER);
/**
 * Abstract base class for jsReality applications.
 * Subclasses must implement getContent() to provide the scene graph content.
 * 
 * @abstract
 */
export class TestToolApp extends JSRApp {
    constructor(options = {}) {
        super(options);
        // Enable detailed logging for tool system debugging
        // This will help debug why TestTool's perform() method isn't being called
        // setModuleLevel('ToolSystem', Level.FINE);
        // setModuleLevel('SlotManager', Level.FINER);
        // setModuleLevel('DeviceManager', Level.FINER);
        // setModuleLevel('ToolEventQueue', Level.FINE);
        // setModuleLevel('AbstractDeviceMouse', Level.FINER);
        // setModuleLevel('AABBPickSystem', Level.FINER);
     }

    getShowPanels() {
        return [true, false, false, false];
    }

    getContent() {
        const squareSGC = SceneGraphUtility.createFullSceneGraphComponent("world");
        squareSGC.setGeometry(Primitives.regularPolygon(4, 0));
        let ap = squareSGC.getAppearance();
        ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
        ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
        ap.setAttribute("polygonShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0, 0, 255));
       MatrixBuilder.euclidean().scale(1, 1, 1).assignToSGC(squareSGC);
        const ptSGC = SceneGraphUtility.createFullSceneGraphComponent("pt");
        ptSGC.setGeometry(Primitives.point([1,0, 0, 1]));
        ap = ptSGC.getAppearance();
        ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
        ap.setAttribute("pointShader." + CommonAttributes.PICKABLE, false);
        ap.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, new Color(255, 0, 0));
        ap.setAttribute("pointShader." + CommonAttributes.POINT_RADIUS, 0.04);
 
        const worldSGC = SceneGraphUtility.createFullSceneGraphComponent("tool");
        MatrixBuilder.euclidean().translate(0,0,-2).assignToSGC(worldSGC);
        
         // Define a local tool class that has closure access to ptSGC
         class MyTestTool extends TestTool {
            perform(tc) {
              super.perform(tc);
              const objMousePosition = ToolUtility.worldToLocal(tc, this._mousePosition);
            logger.fine(Category.ALL, 'objMousePosition:', objMousePosition);
              ptSGC.setGeometry(Primitives.point(objMousePosition));
              tc.getViewer().renderAsync();   // <-- use the context’s viewer
            }
            deactivate(tc) {
              this.perform(tc);
              super.deactivate(tc);
             
            }
          }
        const tool = new MyTestTool();
        tool.setName("testTool");
        worldSGC.addTool(tool);
        worldSGC.addChildren(squareSGC, ptSGC);
        return worldSGC;
    }
}