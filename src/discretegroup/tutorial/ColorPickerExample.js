/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { Appearance } from '../../core/scene/Appearance.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import Color from '../../core/util/Color.js';
import { DiscreteGroupColorPicker } from '../core/DiscreteGroupColorPicker.js';
import { createSimpleExample2D } from './SimpleExample2D.js';
import { DirichletDomain, DiscreteGroupSceneGraphRepresentation } from '../core/index.js';
import { SceneGraphComponent } from '../../core/scene/SceneGraphComponent.js';
import { TranslateTool } from '../util/TranslateTool.js';

/**
 * Port of tutorial/ColorPickerExample.java.
 */
export function createColorPickerExample({ skewit = false, maxElements = 50 } = {}) {
  const { group: dg } = createSimpleExample2D({ skewit, maxElements });
  dg.setColorPicker(new DiscreteGroupColorPicker.ReflectionColorPicker());
  dg.update();

  const dgsgr = new DiscreteGroupSceneGraphRepresentation(dg);
  const fundDomSGC = new SceneGraphComponent('fundDomSGC');
  const fundDom2SGC = new SceneGraphComponent('fundDom2SGC');
  fundDomSGC.addChild(fundDom2SGC);
  dg.setCenterPoint([0.5, 0.5, 0, 1]);
  const dd = new DirichletDomain(dg);
  dd.update();
  fundDom2SGC.setGeometry(dd.getDirichletDomain());
  fundDomSGC.addTool(new TranslateTool());
  dgsgr.setWorldNode(fundDomSGC);

  const red = new Appearance();
  red.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.RED);
  red.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.YELLOW);
  const blue = new Appearance();
  blue.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.BLUE);
  blue.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, Color.GREEN);
  dgsgr.setAppList([red, blue]);
  dgsgr.update();

  return {
    group: dg,
    representation: dgsgr,
    root: dgsgr.getRepresentationRoot(),
  };
}

