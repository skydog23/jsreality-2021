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
        setModuleLevel('ToolSystem', Level.FINER);
        setModuleLevel('SlotManager', Level.FINER);
        setModuleLevel('DeviceManager', Level.FINE);
        setModuleLevel('ToolEventQueue', Level.FINE);
        setModuleLevel('AbstractDeviceMouse', Level.FINER);
        // TestTool already has FINE level enabled in TestTool.js
    }
    
    getShowPanels() {
        return [true, false, false, false];
    } 
    
    getContent() {
        const world = SceneGraphUtility.createFullSceneGraphComponent("world");
        world.setGeometry(Primitives.regularPolygon(13, .5));
        const tool = new TestTool();
        tool.setName("testTool");
        world.addTool(tool);

        return world;
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