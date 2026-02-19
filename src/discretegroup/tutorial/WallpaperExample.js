/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { Appearance } from '../../core/scene/Appearance.js';
import { SceneGraphComponent } from '../../core/scene/SceneGraphComponent.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import Color from '../../core/util/Color.js';
import { MatrixBuilder } from '../../core/math/MatrixBuilder.js';
import { Primitives } from '../../core/geometry/Primitives.js';
import {
  DiscreteGroupColorPicker,
  DiscreteGroupSceneGraphRepresentation,
  DiscreteGroupSimpleConstraint,
} from '../core/index.js';
import { WallpaperGroup } from '../groups/WallpaperGroup.js';
import { TranslateTool } from '../util/TranslateTool.js';

/**
 * Port of tutorial/WallpaperExample.java without JRViewer bootstrap.
 */
export function createWallpaperExample() {
  const dg = WallpaperGroup.instanceOfGroup('333');
  dg.setConstraint(new DiscreteGroupSimpleConstraint(-1, -1, 50));
  dg.setColorPicker(new DiscreteGroupColorPicker.RotationColorPicker(3));
  dg.update();

  const dgsgr = new DiscreteGroupSceneGraphRepresentation(dg);
  const fundDomSGC = new SceneGraphComponent('fundDomSGC');
  fundDomSGC.setGeometry(Primitives.regularPolygon(4, 0.5));
  fundDomSGC.addTool(new TranslateTool());
  MatrixBuilder.euclidean().translate(0.5, 0.3, 0).scale(0.4).assignTo(fundDomSGC);
  dgsgr.setWorldNode(fundDomSGC);

  const red = new Appearance();
  red.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.RED);
  red.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.YELLOW);

  const blue = new Appearance();
  blue.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.BLUE);
  blue.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.GREEN);

  const green = new Appearance();
  green.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.GREEN);
  green.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.YELLOW);

  dgsgr.setAppList([red, blue, green]);
  dgsgr.update();

  return {
    group: dg,
    representation: dgsgr,
    root: dgsgr.getRepresentationRoot(),
  };
}

