/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { MatrixBuilder } from '../math/MatrixBuilder.js';
import { Primitives } from './Primitives.js';

/**
 * Compatibility-first port of `OneArmedTinManFactory`.
 * Builds a simple articulated "tin man" hierarchy.
 */
export class OneArmedTinManFactory {
  root = new SceneGraphComponent('oneArmedTinMan');
  torsoNode = new SceneGraphComponent('torso');
  headNode = new SceneGraphComponent('head');
  armNode = new SceneGraphComponent('arm');
  forearmNode = new SceneGraphComponent('forearm');

  torsoScale = [0.5, 0.8, 0.25];
  headScale = [0.22, 0.22, 0.22];
  armScale = [0.12, 0.45, 0.12];
  forearmScale = [0.1, 0.35, 0.1];
  shoulderAngle = 0;
  elbowAngle = 0;

  constructor() {
    this.torsoNode.setGeometry(Primitives.box(...this.torsoScale, false));
    this.headNode.setGeometry(Primitives.sphere(1.0, 0, 0, 0));
    this.armNode.setGeometry(Primitives.box(...this.armScale, false));
    this.forearmNode.setGeometry(Primitives.box(...this.forearmScale, false));

    this.root.addChild(this.torsoNode);
    this.torsoNode.addChild(this.headNode);
    this.torsoNode.addChild(this.armNode);
    this.armNode.addChild(this.forearmNode);
    this.update();
  }

  update() {
    MatrixBuilder.euclidean().translate(0, 0.72, 0).scale(...this.headScale).assignTo(this.headNode);
    MatrixBuilder.euclidean()
      .translate(0.36, 0.35, 0)
      .rotateZ(this.shoulderAngle)
      .translate(0, -0.225, 0)
      .assignTo(this.armNode);
    MatrixBuilder.euclidean()
      .translate(0, -0.45, 0)
      .rotateZ(this.elbowAngle)
      .translate(0, -0.175, 0)
      .assignTo(this.forearmNode);
  }

  getSceneGraphComponent() { return this.root; }
  setShoulderAngle(a) { this.shoulderAngle = a; this.update(); }
  setElbowAngle(a) { this.elbowAngle = a; this.update(); }
  getShoulderAngle() { return this.shoulderAngle; }
  getElbowAngle() { return this.elbowAngle; }
}

