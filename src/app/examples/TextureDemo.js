import { JSRApp } from '../JSRApp.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import { Texture2D, WrapMode } from '../../core/shader/Texture2D.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { SimpleTextureFactory } from '../../core/util/SimpleTextureFactory.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';


export class TextureDemo extends JSRApp {

  _stf;
  _tex;
  _ap;
  _sgc;

  getContent() {
    this._sgc = SceneGraphUtility.createFullSceneGraphComponent("world");
    this._sgc.setGeometry(Primitives.texturedQuadrilateral());
    MatrixBuilder.euclidean().scale(5, 5, 1).translate(-.5, -.5, 0).assignTo(this._sgc);

    this._ap = this._sgc.getAppearance();
    this._ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    this._ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
    this._ap.setAttribute(CommonAttributes.TRANSPARENCY_ENABLED, true);
    this._ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
    this._ap.setAttribute(
      CommonAttributes.POLYGON_SHADER + '.' + CommonAttributes.DIFFUSE_COLOR,
      new Color(255, 255, 255),
    );

    this._stf = new SimpleTextureFactory();
    this._stf.setColor(0, new Color(0, 0, 0, 0));
    this._stf.setColor(1, new Color(255, 0, 100));
    this._stf.setColor(2, new Color(255, 255, 0));
    this._stf.update();

    this._tex = new Texture2D();
    this._tex.setImage(this._stf.getImageData());
    this._tex.setTextureMatrix(MatrixBuilder.euclidean().scale(10, 10, 1).getArray());
    this._tex.setRepeatS(WrapMode.REPEAT);
    this._tex.setRepeatT(WrapMode.REPEAT);
    this._tex.setMipmapMode(true);

    this._ap.setAttribute(
      CommonAttributes.POLYGON_SHADER + '.' + CommonAttributes.TEXTURE_2D,
      this._tex,
    );

    return this._sgc;
  }

  #regenerate() {
    this._stf.update();
    this._tex.setImage(this._stf.getImageData());
    this.getViewer()?.renderAsync();
  }

  getInspectorDescriptors() {
    return [
      ...this._stf.getInspectorDescriptors(() => this.#regenerate()),
      ...this._tex.getInspectorDescriptors(() => this.getViewer()?.renderAsync()),
    ];
  }
}
