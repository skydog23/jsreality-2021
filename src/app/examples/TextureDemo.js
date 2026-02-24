import { JSRApp } from '../JSRApp.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { Texture2D } from '../../core/shader/Texture2D.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { SimpleTextureFactory } from '../../core/util/SimpleTextureFactory.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';


export class TextureDemo extends JSRApp {
  getContent() {
    const sgc = SceneGraphUtility.createFullSceneGraphComponent("world");
    sgc.setGeometry(Primitives.texturedQuadrilateral());
    MatrixBuilder.euclidean().scale(5,5,1).translate(-.5,-.5,0).assignTo(sgc);
    const ap = sgc.getAppearance();
    const tex = new Texture2D();
    tex.setExternalSource('../src/assets/textures/red.jpg');
    const stf = new SimpleTextureFactory();
			stf.setColor(0, new Color(0,0,0,0));	// gap color in weave pattern is totally transparent
			stf.setColor(1, new Color(255,0,100));
			stf.setColor(2, new Color(255,255,0));
			stf.update();
			const id = stf.getImageData();
    tex.setImage(id);
    tex.setTextureMatrix(MatrixBuilder.euclidean().scale(10,10,1).getArray());
    tex.setRepeatS(Texture2D.GL_REPEAT);
    tex.setRepeatT(Texture2D.GL_REPEAT);
   
    tex.setMipmapMode(true);
    ap.setAttribute(CommonAttributes.POLYGON_SHADER + '.' + CommonAttributes.TEXTURE_2D, tex);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
    ap.setAttribute(CommonAttributes.TRANSPARENCY_ENABLED, true);
    ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
    ap.setAttribute(CommonAttributes.POLYGON_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR, new Color(255,255,255));
    return sgc;
  }
}