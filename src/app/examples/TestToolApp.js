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
import { setModuleLevel, Level, Category } from '../../core/util/LoggingSystem.js';
import { Appearance } from '../../core/scene/Appearance.js';
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
        // setModuleLevel('ToolSystem', Level.FINER);
        // setModuleLevel('SlotManager', Level.FINER);
        // setModuleLevel('DeviceManager', Level.FINER);
        // setModuleLevel('ToolEventQueue', Level.FINE);
        // setModuleLevel('AbstractDeviceMouse', Level.FINER);
        // setModuleLevel('AABBPickSystem', Level.FINER);
        // TestTool already has FINE level enabled in TestTool.js
    }
    
    getShowPanels() {
        return [true, false, false, false];
    } 

    getContent() {
        const world = SceneGraphUtility.createFullSceneGraphComponent("world");
        world.setGeometry(Primitives.regularPolygon(4, .5));
        const ap = world.getAppearance();
        ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
        ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
         MatrixBuilder.euclidean().scale(1,1, 1).assignToSGC(world);
        const ptSGC = SceneGraphUtility.createFullSceneGraphComponent("pt");
        ptSGC.setGeometry(Primitives.point([0, 0, 0, 1]));
        ptSGC.getAppearance().setAttribute(CommonAttributes.VERTEX_DRAW, true);
        ptSGC.getAppearance().setAttribute("pointShader." + CommonAttributes.PICKABLE, false);
        ptSGC.getAppearance().setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, new Color(255, 0, 0));
        
        const toolSGC = SceneGraphUtility.createFullSceneGraphComponent("tool");
        const toolAp = toolSGC.getAppearance();
        toolAp.setAttribute(CommonAttributes.POINT_RADIUS, 0.04);
        toolAp.setAttribute(CommonAttributes.VERTEX_DRAW, true);
        toolAp.setAttribute("pointShader." + CommonAttributes.DIFFUSE_COLOR, new Color(255, 0, 0));
        toolAp.setAttribute("polygonShader." + CommonAttributes.DIFFUSE_COLOR, new Color(0 , 0, 255));
        const tool = new TestTool();
        tool.setName("testTool");
        toolSGC.addTool(tool);
        toolSGC.addChildren(world, ptSGC);
        MatrixBuilder.euclidean().translate(0, 0, -2).assignToSGC(toolSGC);
        return toolSGC;
  }
}