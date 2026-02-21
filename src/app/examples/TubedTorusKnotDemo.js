/**
* 
 * Copyright (c) 2025-2026, jsReality Contributors
 
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { PolygonalTubeFactory } from '../../core/geometry/PolygonalTubeFactory.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { RotateTool } from '../../core/tools/RotateTool.js';
import { Color } from '../../core/util/Color.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js'
import { IndexedLineSetFactory } from '../../core/geometry/IndexedLineSetFactory.js';

import { FrameFieldType } from '../../core/geometry/TubeUtility.js';
import { TubeFactory } from '../../core/geometry/TubeFactory.js';

export class TubedTorusKnotDemo extends JSRApp {
    segments = 40;
    radius = .1;
    showFrames = false;
    surfaceSGC = SceneGraphUtility.createFullSceneGraphComponent('surface');
    getContent() {
        const geometrySGC = SceneGraphUtility.createFullSceneGraphComponent('geometry');
        this.getGeometry(this.surfaceSGC);
        const ap = this.surfaceSGC.getAppearance();
        ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, true);
        ap.setAttribute(CommonAttributes.TRANSPARENCY_ENABLED, false);
        ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
        ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
        ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
        ap.setAttribute(CommonAttributes.SMOOTH_SHADING, false);
        ap.setAttribute(CommonAttributes.TUBE_RADIUS, 0.01);
        ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, new Color(100,150,244));
        ap.setAttribute("polygonShader." + CommonAttributes.DIFFUSE_COLOR, new Color(150,244,100));
        
        const rotateTool = new RotateTool();
        rotateTool.setName("rotateTool");
        this.surfaceSGC.addTool(rotateTool);
        return this.surfaceSGC;
    }
  ptf = null;
  isParallelFrame = false;
  width = 2;
  height = 1;
    vertices = [
      [-this.width/2, -this.height/2, 0, 1 ],
      [this.width/2, -this.height/2, 0, 1 ],
      [this.width/2, this.height/2 , 0, 1 ],
      [-this.width/2, this.height/2, 0, 1 ],
      [-this.width/2, -this.height/2, 0, 1 ]
    ];
    
    getGeometry(sgc) {
      // const polygon = Primitives.regularPolygon(4); //Vertices(10);
      const torus1 = Primitives.discreteTorusKnot(1,.25, 2, 9, this.segments);
      this.ptf = new PolygonalTubeFactory(torus1, 0);
		   this.ptf.setClosed(true);
		   this.ptf.setRadius(this.radius);
       this.ptf.setCrossSection(this.vertices);
		   this.ptf.setGenerateEdges(true);
       this.ptf.setFrameFieldType(this.isParallelFrame ?  FrameFieldType.PARALLEL : FrameFieldType.FRENET);
		   this.ptf.update();
		   sgc.setGeometry(this.ptf.getTube());
      if (this.showFrames) {
        const framesSGC = this.ptf.getFramesSceneGraphRepresentation(.2);
        sgc.removeChildren(sgc.getChildComponents());
        sgc.addChild(framesSGC);
      }
    }

    display() {
        super.display();
        this.setup3DCamera();
        this.getViewer().render();
    }

    getInspectorDescriptors() {
        return [
          {
             type: DescriptorType.TEXT_SLIDER,
            valueType: 'int',
            label: 'segments',
            getValue: () => this.segments,
            setValue: (val) => {
                this.segments = Math.round(val);
              this.getGeometry(this.surfaceSGC);
              this.getViewer().render();
            },
            min: 10,
            max: 200
          },
          {
             type: DescriptorType.TEXT_SLIDER,
            valueType: 'float',
            label: 'radius',
            getValue: () => this.radius,
            setValue: (val) => {
              this.radius = val;
              this.getGeometry(this.surfaceSGC);
              this.getViewer().render();
            },
            min: 0.01,
            max: 1.0,
          },
          {
            type: DescriptorType.TOGGLE,
            label: 'frame Parallel',
            getValue: () => this.isParallelFrame,
            setValue: (v) => {
               this.isParallelFrame = v;
              this.ptf.setFrameFieldType(this.isParallelFrame ? FrameFieldType.PARALLEL : FrameFieldType.FRENET );
              this.ptf.update();
              this.surfaceSGC.setGeometry(this.ptf.getTube());
              this.getViewer().renderAsync();
            }
          }
        ];
      }
    

}