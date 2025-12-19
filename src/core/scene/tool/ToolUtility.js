/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's ToolUtility class (from ToolUtility.java)
// Static utility methods for coordinate transformations in tool contexts
// and for attaching timer-like objects.

import { Matrix } from '../../math/Matrix.js';
import { SceneGraphPath } from '../SceneGraphPath.js';
import { SceneGraphComponent } from '../SceneGraphComponent.js';
import { InputSlot } from './InputSlot.js';

/** @typedef {import('./ToolContext.js').ToolContext} ToolContext */

/**
 * Static utility methods for tool-related coordinate conversions and helpers.
 */
export class ToolUtility {
  // ---------------------------------------------------------------------------
  // Avatar/world conversions
  // ---------------------------------------------------------------------------

  /**
   * Convert a matrix or vector from world coordinates to avatar coordinates.
   * Mirrors ToolUtility.worldToAvatar(ToolContext, Matrix/double[]) from Java.
   *
   * @param {ToolContext} tc - Tool context providing avatar transformation
   * @param {Matrix|number[]} world - World matrix (Matrix) or world vector (number[4])
   * @returns {Matrix|number[]} Avatar-space matrix or vector
   */
  static worldToAvatar(tc, world) {
    const avatarTrafo = tc.getTransformationMatrix(InputSlot.getDevice('AvatarTransformation'));
    if (!avatarTrafo) {
      throw new Error('AvatarTransformation matrix not available in ToolContext');
    }

    const world2avatar = new Matrix(avatarTrafo);
    world2avatar.invert();

    if (world instanceof Matrix) {
      // Matrix version: world2avatar * worldMatrix
      world2avatar.multiplyOnRight(world);
      return world2avatar;
    }

    if (Array.isArray(world)) {
      // Vector version: world2avatar * worldVector
      return world2avatar.multiplyVector(world);
    }

    throw new Error('worldToAvatar expects Matrix or number[] as second argument');
  }

  /**
   * Convert a matrix or vector from avatar coordinates to world coordinates.
   * Mirrors ToolUtility.avatarToWorld(ToolContext, Matrix/double[]) from Java.
   *
   * @param {ToolContext} tc - Tool context providing avatar transformation
   * @param {Matrix|number[]} local - Avatar-space matrix or vector
   * @returns {Matrix|number[]} World-space matrix or vector
   */
  static avatarToWorld(tc, local) {
    const avatarTrafo = tc.getTransformationMatrix(InputSlot.getDevice('AvatarTransformation'));
    if (!avatarTrafo) {
      throw new Error('AvatarTransformation matrix not available in ToolContext');
    }

    const avatar2world = new Matrix(avatarTrafo);

    if (local instanceof Matrix) {
      // Matrix version: avatar2world * localMatrix
      avatar2world.multiplyOnRight(local);
      return avatar2world;
    }

    if (Array.isArray(local)) {
      // Vector version: avatar2world * localVector
      return avatar2world.multiplyVector(local);
    }

    throw new Error('avatarToWorld expects Matrix or number[] as second argument');
  }

  // ---------------------------------------------------------------------------
  // World/local/tool conversions via SceneGraphPath / ToolContext
  // ---------------------------------------------------------------------------

  /**
   * Convert from world to local coordinates.
   * Overloads the Java variants:
   * - worldToLocal(ToolContext tc, Matrix worldMatrix)
   * - worldToLocal(ToolContext tc, double[] worldVector)
   * - worldToLocal(SceneGraphPath rootToLocal, Matrix worldMatrix)
   * - worldToLocal(SceneGraphPath rootToLocal, double[] worldVector)
   *
   * @param {ToolContext|SceneGraphPath} ctxOrPath - Tool context or root-to-local path
   * @param {Matrix|number[]} world - World matrix or vector
   * @returns {Matrix|number[]} Local matrix or vector
   */
  static worldToLocal(ctxOrPath, world) {
    const path = ctxOrPath instanceof SceneGraphPath
      ? ctxOrPath
      : ctxOrPath.getRootToLocal();

    if (!path) {
      throw new Error('worldToLocal: no SceneGraphPath available');
    }

    const world2local = new Matrix();
    path.getInverseMatrix(world2local.getArray());

    if (world instanceof Matrix) {
      world2local.multiplyOnRight(world);
      return world2local;
    }

    if (Array.isArray(world)) {
      return world2local.multiplyVector(world);
    }

    throw new Error('worldToLocal expects Matrix or number[] as second argument');
  }

  /**
   * Convert from world to tool coordinates (using root-to-tool-component path).
   * Mirrors worldToTool(ToolContext, Matrix/double[]) from Java.
   *
   * @param {ToolContext} tc - Tool context
   * @param {Matrix|number[]} world - World matrix or vector
   * @returns {Matrix|number[]} Tool-space matrix or vector
   */
  static worldToTool(tc, world) {
    const path = tc.getRootToToolComponent();
    if (!path) {
      throw new Error('worldToTool: ToolContext has no root-to-tool path');
    }
    return ToolUtility.worldToLocal(path, world);
  }

  /**
   * Convert from local to world coordinates.
   * Overloads the Java variants:
   * - localToWorld(ToolContext tc, Matrix localMatrix)
   * - localToWorld(ToolContext tc, double[] localVector)
   * - localToWorld(SceneGraphPath rootToLocal, Matrix localMatrix)
   * - localToWorld(SceneGraphPath rootToLocal, double[] localVector)
   *
   * @param {ToolContext|SceneGraphPath} ctxOrPath - Tool context or root-to-local path
   * @param {Matrix|number[]} local - Local matrix or vector
   * @returns {Matrix|number[]} World matrix or vector
   */
  static localToWorld(ctxOrPath, local) {
    const path = ctxOrPath instanceof SceneGraphPath
      ? ctxOrPath
      : ctxOrPath.getRootToLocal();

    if (!path) {
      throw new Error('localToWorld: no SceneGraphPath available');
    }

    const local2world = new Matrix();
    path.getMatrix(local2world.getArray());

    if (local instanceof Matrix) {
      local2world.multiplyOnRight(local);
      return local2world;
    }

    if (Array.isArray(local)) {
      return local2world.multiplyVector(local);
    }

    throw new Error('localToWorld expects Matrix or number[] as second argument');
  }

  /**
   * Convert from tool to world coordinates (using root-to-tool-component path).
   * Mirrors toolToWorld(ToolContext, Matrix/double[]) from Java.
   *
   * @param {ToolContext} tc - Tool context
   * @param {Matrix|number[]} tool - Tool-space matrix or vector
   * @returns {Matrix|number[]} World-space matrix or vector
   */
  static toolToWorld(tc, tool) {
    const path = tc.getRootToToolComponent();
    if (!path) {
      throw new Error('toolToWorld: ToolContext has no root-to-tool path');
    }
    return ToolUtility.localToWorld(path, tool);
  }

  // ---------------------------------------------------------------------------
  // Timer attachment helper
  // ---------------------------------------------------------------------------

  /**
   * Attach a timer-like object to a tool context or scene graph component.
   *
   * In the original Java version this only handled instances of
   * de.jreality.tools.Timer (a javax.swing.Timer subclass) and called
   * tt.attach(tc/component).
   *
   * In JavaScript we simply check for an attach() method on the timer
   * and call it with the given target.
   *
   * @param {{attach: Function}|any} timer - Timer-like object with attach() method
   * @param {ToolContext|SceneGraphComponent} target - Tool context or scene component
   */
  static attachTimer(timer, target) {
    if (!timer || typeof timer.attach !== 'function') {
      return;
    }
    // We do not distinguish between ToolContext and SceneGraphComponent here;
    // the timer implementation is responsible for handling the target type.
    timer.attach(target);
  }
}


