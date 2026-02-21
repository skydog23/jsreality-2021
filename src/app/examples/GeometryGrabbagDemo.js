/**
* 
 * Copyright (c) 2025-2026, jsReality Contributors
 
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { DefaultImmersion, ParametricSurfaceFactory } from '../../core/geometry/ParametricSurfaceFactory.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';
import { RotateTool } from '../../core/tools/RotateTool.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { PolygonalTubeFactory } from '../../core/geometry/PolygonalTubeFactory.js';
import { BallAndStickFactory } from '../../core/geometry/BallAndStickFactory.js';
import { SelectionComponent } from '../../core/scene/SelectionComponent.js';
class TorusImmersion extends DefaultImmersion {
  evaluateUV(u, v) {
    // u,v in [0,1] -> angles
    const U = -2 * Math.PI * u;
    const V = 2 * Math.PI * v;

    const R = 1.0;   // major radius
    const r = 0.35;  // minor radius

    this.x = (R + r * Math.cos(V)) * Math.cos(U);
    this.y = (R + r * Math.cos(V)) * Math.sin(U);
    this.z = r * Math.sin(V);
  }
}

export class GeometryGrabbagDemo extends JSRApp {
    _ucount = 15;
    _vcount = 15;
    _psf = null;
    _type = 1;
    _selectionSGC = null;

    getContent() {
        const surfaceSGC = SceneGraphUtility.createFullSceneGraphComponent('surface');
        this._selectionSGC = new SelectionComponent();
        this._selectionSGC.setName("selection");
        this._selectionSGC.setSelectedChild(this._type);
        surfaceSGC.addChild(this._selectionSGC);
        for (let i = 0; i < 3; i++) {
          const geometrySGC = SceneGraphUtility.createFullSceneGraphComponent('geometry');
          this.getGeometry(geometrySGC, i);
          geometrySGC.setVisible(i === this._type);
          this._selectionSGC.addChild(geometrySGC);
        }
        const ap = surfaceSGC.getAppearance();
        ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, true);
        ap.setAttribute(CommonAttributes.TRANSPARENCY_ENABLED, false);
        ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
        ap.setAttribute(CommonAttributes.TUBES_DRAW, true);
        ap.setAttribute(CommonAttributes.SMOOTH_SHADING, false);
        ap.setAttribute(CommonAttributes.TUBE_RADIUS, 0.01);
        ap.setAttribute("lineShader." + CommonAttributes.DIFFUSE_COLOR, new Color(100,150,244));
        ap.setAttribute("polygonShader." + CommonAttributes.DIFFUSE_COLOR, new Color(150,244,100));
        
        const rotateTool = new RotateTool();
        rotateTool.setName("rotateTool");
        surfaceSGC.addTool(rotateTool);

        return surfaceSGC;
    }

    getGeometry(sgc, type = 0) {
        if (type === 0) {
          const torus1 = Primitives.discreteTorusKnot(1,.25, 2, 3, 50);
           const ptf = new PolygonalTubeFactory(torus1, 0);
		   ptf.setClosed(true);
		   ptf.setRadius(.1);
		   ptf.setGenerateEdges(true);
		   ptf.update();
		   sgc.setGeometry(ptf.getTube());
        } else if (type === 1){
         // Build parametric surface
         this._psf = new ParametricSurfaceFactory(new TorusImmersion());
         this._psf.setUMin(0);
         this._psf.setUMax(1);
         this._psf.setVMin(0);
         this._psf.setVMax(1);
 
         // sampling resolution (quad mesh size)
         this._psf.setULineCount(this._ucount);
         this._psf.setVLineCount(this._vcount);
 
         // optional: normals/texcoords
         this._psf.setGenerateFaceNormals(true);
         this._psf.setGenerateVertexNormals(true);
         this._psf.setGenerateTextureCoordinates(true);
 
         // build geometry
         this._psf.update();
         sgc.setGeometry(this._psf.getIndexedFaceSet());
        } else if (type === 2){
           const ils = Primitives.icosahedron(4);
           const basf = new BallAndStickFactory(ils);
            basf.setBallRadius(.04);
            basf.setStickRadius(.02);
            basf.setShowArrows(true);
            basf.setArrowScale(.1);
            basf.setArrowSlope(3);
            basf.setArrowPosition(.6);
            basf.update();
            const tubedIcosa = basf.getSceneGraphComponent();
            sgc.addChild(tubedIcosa);
        }
    }


    display() {
        super.display();
        this.setup3DCamera();

      const vc = this.getViewer().getViewingComponent();
      if (!vc) return;
      if (vc.tabIndex < 0) vc.tabIndex = 0;
      vc.focus?.();
      if (this._keyHandler == null) {
        this._keyHandler = (e) => {
          if (e.repeat) return;
          switch (e.code) {
            case 'KeyH':
              console.log('  1: cycle selection');
              break;
            case 'Digit1':
              this._type = (this._type + 1) % 3;
              this._selectionSGC.setSelectedChild(this._type);
              console.log('type', this._type);
              this.getViewer().renderAsync();
              break;
            default:
              break;
          }
        };
        vc.addEventListener('keydown', this._keyHandler);
      }
        this.getViewer().renderAsync();
    }

    getInspectorDescriptors() {
        return [
          {
             type: DescriptorType.TEXT_SLIDER,
            valueType: 'int',
            label: 'ucount',
            getValue: () => this._ucount,
            setValue: (val) => {
                this._ucount = Math.round(val);
              // sampling resolution (quad mesh size)
              this._psf.setULineCount(this._ucount);
               this._psf.update();

            },
            min: 2,
            max: 100
          },
          {
             type: DescriptorType.TEXT_SLIDER,
            valueType: 'int',
            label: 'vcount',
            getValue: () => this._vcount,
            setValue: (val) => {
              this._vcount = Math.round(val);
              this._psf.setVLineCount(this._vcount);
              this._psf.update();
            },
            min: 2,
            max: 100,
          }
        ];
      }
    

}