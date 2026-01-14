import { DefaultImmersion, ParametricSurfaceFactory } from '../../core/geometry/ParametricSurfaceFactory.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';
import { RotateTool } from '../../core/tools/RotateTool.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';

class TorusImmersion extends DefaultImmersion {
  evaluateUV(u, v) {
    // u,v in [0,1] -> angles
    const U = 2 * Math.PI * u;
    const V = 2 * Math.PI * v;

    const R = 1.0;   // major radius
    const r = 0.35;  // minor radius

    this.x = (R + r * Math.cos(V)) * Math.cos(U);
    this.y = (R + r * Math.cos(V)) * Math.sin(U);
    this.z = r * Math.sin(V);
  }
}

// ... inside your JSRApp subclass init / makeScene / buildSceneGraph ...




export class ParametricSurfaceFactoryDemo extends JSRApp {
    _ucount = 15;
    _vcount = 15;
    _psf = null;
    getContent() {
        const surfaceSGC = SceneGraphUtility.createFullSceneGraphComponent('surface');

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

        surfaceSGC.setGeometry(this._psf.getIndexedFaceSet());
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