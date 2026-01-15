import { PolygonalTubeFactory } from '../../core/geometry/PolygonalTubeFactory.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { RotateTool } from '../../core/tools/RotateTool.js';
import { Color } from '../../core/util/Color.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js'

import { FrameFieldType } from '../../core/geometry/TubeUtility.js';
import { TubeFactory } from '../../core/geometry/TubeFactory.js';

export class TubeDemo extends JSRApp {
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

    getGeometry(sgc) {
      // const polygon = Primitives.regularPolygon(4); //Vertices(10);
      console.log('getting geometry');
      const torus1 = Primitives.discreteTorusKnot(1,.25, 2, 9, this.segments);
      const ptf = new PolygonalTubeFactory(torus1, 0);
		   ptf.setClosed(true);
		   ptf.setRadius(this.radius);
		   ptf.setGenerateEdges(true);
       ptf.setFrameFieldType(FrameFieldType.PARALLEL);
		   ptf.update();
		   sgc.setGeometry(ptf.getTube());
      if (this.showFrames) {
        const framesSGC = ptf.getFramesSceneGraphRepresentation(.2);
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
          }
        ];
      }
    

}