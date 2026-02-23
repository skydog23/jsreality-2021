/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { AbstractTool } from '../scene/tool/AbstractTool.js';
import { InputSlot } from '../scene/tool/InputSlot.js';
import { ToolUtility } from '../scene/tool/ToolUtility.js';
import { EffectiveAppearance } from '../shader/EffectiveAppearance.js';
import { Matrix } from '../math/Matrix.js';
import { MatrixBuilder } from '../math/MatrixBuilder.js';
import * as Pn from '../math/Pn.js';
import * as P3 from '../math/P3.js';
import * as Rn from '../math/Rn.js';

/**
 * Port of de.jtem.discretegroup.util.FlyTool.
 *
 * This tool is designed to sit above the camera/avatar node and fly in the
 * direction determined by PointerTransformation in tool coordinates.
 */
export class FlyTool extends AbstractTool {
  forwardBackwardSlot = InputSlot.getDevice('ForwardBackwardAxis');
  shiftForwardBackwardSlot = InputSlot.getDevice('ShiftForwardBackwardAxis');
  altForwardBackwardSlot = InputSlot.getDevice('AltForwardBackwardAxis');
  leftRightSlot = InputSlot.getDevice('LeftRightAxis');
  shiftLeftRightSlot = InputSlot.getDevice('ShiftLeftRightAxis');
  altLeftRightSlot = InputSlot.getDevice('AltLeftRightAxis');
  timerSlot = InputSlot.getDevice('SystemTime');
  pointerTransformationSlot = InputSlot.getDevice('PointerTransformation');

  currentKeySlot = null;
  velocity = 0.0;
  flying = false;
  released = false;
  olddir = [0, 0, 1, 0];
  gain = 1.0;
  rotateGain = 0.25;
  lastStep = new Matrix();

  metric = Pn.EUCLIDEAN;
  readFromAp = true;
  eap = null;
  shiftIsRotate = true;

  pointerMatrix = null;
  localPointer = null;
  forwardVal = 0.0;
  shipMatrix = null;
  shipSGC = null;

  listeners = [];

  constructor() {
    super();
    this.addCurrentSlot(this.forwardBackwardSlot);
    this.addCurrentSlot(this.shiftForwardBackwardSlot);
    this.addCurrentSlot(this.altForwardBackwardSlot);
    this.addCurrentSlot(this.leftRightSlot);
    this.addCurrentSlot(this.shiftLeftRightSlot);
    this.addCurrentSlot(this.altLeftRightSlot);
  }

  perform(tc) {
    const source = tc.getSource();
    if (source === this.forwardBackwardSlot) this.currentKeySlot = this.forwardBackwardSlot;
    else if (source === this.shiftForwardBackwardSlot) this.currentKeySlot = this.shiftForwardBackwardSlot;
    else if (source === this.altForwardBackwardSlot) this.currentKeySlot = this.altForwardBackwardSlot;
    else if (source === this.leftRightSlot) this.currentKeySlot = this.leftRightSlot;
    else if (source === this.shiftLeftRightSlot) this.currentKeySlot = this.shiftLeftRightSlot;
    else if (source === this.altLeftRightSlot) this.currentKeySlot = this.altLeftRightSlot;

    if (this.currentKeySlot !== null) {
      const keyAxis = tc.getAxisState(this.currentKeySlot);
      this.released = keyAxis ? keyAxis.isReleased() : true;
      if (this.released) {
        this.flying = false;
        this.removeCurrentSlot(this.timerSlot);
        tc.getViewer()?.getSceneRoot?.()?.setPickable?.(true);
        return;
      }
      this.flying = true;
      this.velocity = keyAxis ? keyAxis.doubleValue() : 0.0;
      this.velocity = this.velocity * this.velocity * this.velocity;
      this.addCurrentSlot(this.timerSlot);
      tc.getViewer()?.getSceneRoot?.()?.setPickable?.(false);
    }

    if (!this.flying) return;

    if (this.readFromAp) {
      const rootToTool = tc.getRootToToolComponent();
      if (rootToTool && (this.eap === null || !EffectiveAppearance.matches(this.eap, rootToTool))) {
        this.eap = EffectiveAppearance.createFromPath(rootToTool);
      }
      if (this.eap) {
        this.metric = this.eap.getAttribute('metric', Pn.EUCLIDEAN);
      }
    }

    const rootToTool = tc.getRootToToolComponent();
    this.shipSGC = rootToTool?.getLastComponent?.() ?? null;
    if (!this.shipSGC) return;

    this.shipMatrix = new Matrix();
    const shipTrafo = this.shipSGC.getTransformation?.();
    if (shipTrafo) {
      this.shipMatrix.assignFrom(shipTrafo.getMatrix());
    }

    const val = this.#extractTimerDeltaMillis(tc);
    this.forwardVal = val * this.velocity * 0.001;

    const pointerTrafo = tc.getTransformationMatrix(this.pointerTransformationSlot);
    if (!pointerTrafo) return;
    this.pointerMatrix = new Matrix(pointerTrafo);
    this.localPointer = ToolUtility.worldToTool(tc, this.pointerMatrix);

    if (this.currentKeySlot === this.forwardBackwardSlot) {
      this.#moveShipInDirection(2);
    } else if (this.currentKeySlot === this.shiftForwardBackwardSlot) {
      if (this.shiftIsRotate) {
        MatrixBuilder.init(this.shipMatrix, this.metric)
          .rotateX(this.rotateGain * this.forwardVal)
          .assignTo(this.shipSGC);
      } else {
        this.#moveShipInDirection(1);
      }
    } else if (this.currentKeySlot === this.altForwardBackwardSlot) {
      this.#moveShipInDirection(1);
    } else if (this.currentKeySlot === this.leftRightSlot) {
      MatrixBuilder.init(this.shipMatrix, this.metric)
        .rotateY(this.rotateGain * this.forwardVal)
        .assignTo(this.shipSGC);
    } else if (this.currentKeySlot === this.shiftLeftRightSlot) {
      if (this.shiftIsRotate) {
        MatrixBuilder.init(this.shipMatrix, this.metric)
          .rotateZ(this.rotateGain * this.forwardVal)
          .assignTo(this.shipSGC);
      } else {
        this.#moveShipInDirection(0);
      }
    } else if (this.currentKeySlot === this.altLeftRightSlot) {
      this.#moveShipInDirection(0);
    }
    this.broadcastChange();
  }

  #moveShipInDirection(direction) {
    const dir = this.localPointer.getColumn(direction);
    if (this.metric !== Pn.EUCLIDEAN && Rn.innerProduct(dir, this.olddir, 4) < 0) {
      for (let i = 0; i < 4; i++) dir[i] = -dir[i];
    }

    let shipPosition = this.localPointer.getColumn(3);
    dir[3] = 0.0;
    shipPosition = [0, 0, 0, 1];

    const newShipPosition = Pn.dragTowards(null, shipPosition, dir, this.gain * this.forwardVal, this.metric);
    MatrixBuilder.init(null, this.metric).translateFromTo(shipPosition, newShipPosition).assignTo(this.lastStep);
    MatrixBuilder.init(this.shipMatrix, this.metric).times(this.lastStep).assignTo(this.shipSGC);

    if (this.metric !== Pn.EUCLIDEAN) {
      const t = this.shipSGC.getTransformation?.();
      if (t) {
        t.setMatrix(P3.orthonormalizeMatrix(null, t.getMatrix(), 10e-10, this.metric));
      }
    }

    for (let i = 0; i < 4; i++) this.olddir[i] = dir[i];
  }

  #extractTimerDeltaMillis(tc) {
    const axis = tc.getAxisState(this.timerSlot);
    if (!axis) return 0.0;
    const intVal = axis.intValue();
    if (Number.isFinite(intVal) && Math.abs(intVal) <= 10000) {
      return intVal;
    }
    return axis.doubleValue() * 1000.0;
  }

  getGain() {
    return this.gain;
  }

  setGain(gain) {
    this.gain = gain;
  }

  setMetric(sig) {
    if (sig < -1) {
      this.readFromAp = true;
      return;
    }
    this.metric = sig;
    this.readFromAp = false;
  }

  addChangeListener(listener) {
    if (!this.listeners.includes(listener)) this.listeners.push(listener);
  }

  removeChangeListener(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  broadcastChange() {
    if (!this.listeners || this.listeners.length === 0) return;
    const event = { source: this };
    for (const listener of this.listeners) {
      if (typeof listener === 'function') listener(event);
      else if (listener && typeof listener.actionPerformed === 'function') listener.actionPerformed(event);
    }
  }

  isShiftIsRotate() {
    return this.shiftIsRotate;
  }

  setShiftIsRotate(shiftIsRotate) {
    this.shiftIsRotate = !!shiftIsRotate;
  }
}

