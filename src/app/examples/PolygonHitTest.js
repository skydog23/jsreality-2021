/**
* 
 * Copyright (c) 2025-2026, jsReality Contributors
 
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { IndexedLineSetFactory } from '../../core/geometry/IndexedLineSetFactory.js';
import { AbstractTool } from '../../core/scene/tool/AbstractTool.js';
import { InputSlot } from '../../core/scene/tool/InputSlot.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { getLogger } from '../../core/util/LoggingSystem.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { Appearance } from '../../core/scene/Appearance.js';
import { SceneGraphComponent } from '../../core/scene/SceneGraphComponent.js';
import { ToolContext } from '../../core/scene/tool/ToolContext.js';
import { JSRApp } from '../JSRApp.js';

/**
 * @typedef {import('../../core/scene/tool/ToolContext.js').ToolContext} ToolContext
 */

const logger = getLogger('jsreality.app.examples.AddPointsExample');

/**
 * JSRApp-based example that installs AddPointsTool on a line component.
 * Left-click with Shift held down to add points along the view ray.
 */
export class PolygonHitTest extends JSRApp {
  /**
   * @type {number[][]}
   */
  #points = [];

  /**
   * @type {IndexedLineSetFactory}
   */
  #lsf = new IndexedLineSetFactory();

  isDraft() {
    return true;
  }
  /**
   * Create the scene graph content: a single component whose geometry is driven
   * by AddPointsTool.
   */
  getContent() {
    const worldSGC = SceneGraphUtility.createFullSceneGraphComponent('world');

    worldSGC.setGeometry(Primitives.regularPolygon(5, .5));

    // Basic appearance: blue polyline with visible points
    const ap = worldSGC.getAppearance();
    const offCl = new Color(0, 0, 255);
     ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
     ap.setAttribute(CommonAttributes.FACE_DRAW, true);
     ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
     ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
     ap.setAttribute('PolygonShader.' + CommonAttributes.DIFFUSE_COLOR, offCl);


    class MouseOverTool extends AbstractTool {
      #hcl = null;
      #oldCl = null;
      #sgc = null;
       constructor( highLightColor = new Color(255, 0, 0)) {
        super(InputSlot.LEFT_BUTTON );
        this.#hcl=highLightColor;
      }
      
     activate(tc) {
      console.log('activate');
      this.#sgc = tc.getRootToLocal().getLastComponent();
      this.#oldCl = this.#sgc.getAppearance().getAttribute(CommonAttributes.POLYGON_SHADER+"."+CommonAttributes.DIFFUSE_COLOR);
     this.#sgc.getAppearance().setAttribute(CommonAttributes.POLYGON_SHADER+"."+CommonAttributes.DIFFUSE_COLOR, this.#hcl);
       tc.getViewer().renderAsync();
      }
      perform(tc) {
        console.log('perform');
       
      }
      deactivate(tc) {
        console.log('deactivate');
        this.#sgc.getAppearance().setAttribute(CommonAttributes.POLYGON_SHADER+"."+CommonAttributes.DIFFUSE_COLOR, this.#oldCl);
        tc.getViewer().renderAsync();
        }
     
    }
    const tool = new MouseOverTool();
  worldSGC.addTool(tool);
  return worldSGC;
  }
  
}

