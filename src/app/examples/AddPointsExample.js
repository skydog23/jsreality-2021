/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// JSRApp-based port of the Java tutorial:
// de.jreality.tutorial.tool.AddPointsExample

import { JSRApp } from '../JSRApp.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { IndexedLineSetFactory } from '../../core/geometry/IndexedLineSetFactory.js';
import { AbstractTool } from '../../core/scene/tool/AbstractTool.js';
import { InputSlot } from '../../core/scene/tool/InputSlot.js';
import { ToolUtility } from '../../core/scene/tool/ToolUtility.js';
import { Matrix } from '../../core/math/Matrix.js';
import * as Rn from '../../core/math/Rn.js';
import { getLogger, Category } from '../../core/util/LoggingSystem.js';

/**
 * @typedef {import('../../core/scene/tool/ToolContext.js').ToolContext} ToolContext
 */

const logger = getLogger('jsreality.app.examples.AddPointsExample');

/**
 * Tool that adds points along the mouse ray when SHIFT_LEFT_BUTTON is pressed,
 * mirroring the behaviour of the Java tutorial AddPointsExample.
 */
class AddPointsTool extends AbstractTool {
  /** @type {number[][]} */
  #points;

  /** @type {IndexedLineSetFactory} */
  #lsf;

  /**
   * @param {number[][]} points - Mutable array holding tool-local 4D points
   * @param {IndexedLineSetFactory} lsf - Line set factory used to build the polyline
   */
  constructor(points, lsf) {
    super(InputSlot.SHIFT_LEFT_BUTTON);
    this.setDescription('Add a new point along the view ray while Shift is pressed');
    this.#points = points;
    this.#lsf = lsf;

    // We need the pointer ray (POINTER_TRANSFORMATION) as a current slot
    this.addCurrentSlot(InputSlot.POINTER_TRANSFORMATION, 'Mouse pointer ray');
  }

  /**
   * Called whenever the tool performs; adds a point when SHIFT_LEFT_BUTTON is pressed.
   * @param {ToolContext} tc
   */
  perform(tc) {
    const shiftAxis = tc.getAxisState(InputSlot.SHIFT_LEFT_BUTTON);
    if (!shiftAxis || !shiftAxis.isPressed()) {
      return;
    }

    const pointerTrafo = tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION);
    if (!pointerTrafo) {
      logger.finer(Category.ALL, '[AddPointsTool] POINTER_TRANSFORMATION is null');
      return;
    }

    // Java version:
    // Matrix m = new Matrix(tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION));
    // double[] foot = m.getColumn(3);
    // double[] dir  = m.getColumn(2);
    // double[] offset = Rn.times(null, -5, dir);
    // double[] newPoint = Rn.add(null, foot, offset);
    //
    // Here we use the same logic with the JS Matrix / Rn helpers.
    const m = new Matrix(pointerTrafo);
    const foot = m.getColumn(3); // mouse on near plane (in whatever space POINTER_TRANSFORMATION is expressed)
    const dir = m.getColumn(2);  // view ray direction

    const offset = Rn.times(null, -5, dir);
    const newPointWorld = Rn.add(null, foot, offset);

    // Transform world coordinates into the coordinate system of the tool component
    const newPointLocal = ToolUtility.worldToLocal(tc, newPointWorld);
    this.#points.push(newPointLocal);

    this.#updateGeometry();
  }

  /**
   * Rebuild the polyline geometry from the accumulated points.
   * Mirrors the Java updateGeometry() method.
   * @private
   */
  #updateGeometry() {
    const n = this.#points.length;

    // Set new vertices
    this.#lsf.setVertexCount(n);
    if (n > 0) {
      this.#lsf.setVertexCoordinates(this.#points);
    }

    // Set edges connecting consecutive points
    if (n > 1) {
      const edgeCount = n - 1;
      const indices = new Array(edgeCount);
      for (let i = 1; i < n; i++) {
        indices[i - 1] = [i - 1, i];
      }
      this.#lsf.setEdgeCount(edgeCount);
      this.#lsf.setEdgeIndices(indices);
    } else {
      // No edges if fewer than two points
      this.#lsf.setEdgeCount(0);
      this.#lsf.setEdgeIndices([]);
    }

    this.#lsf.update();
  }
}

/**
 * JSRApp-based example that installs AddPointsTool on a line component.
 * Left-click with Shift held down to add points along the view ray.
 */
export class AddPointsExample extends JSRApp {
  /**
   * @type {number[][]}
   */
  #points = [];

  /**
   * @type {IndexedLineSetFactory}
   */
  #lsf = new IndexedLineSetFactory();

  /**
   * Create the scene graph content: a single component whose geometry is driven
   * by AddPointsTool.
   */
  getContent() {
    const worldSGC = SceneGraphUtility.createFullSceneGraphComponent('world');

    // Attach the line set geometry from the factory
    const lineSet = this.#lsf.getIndexedLineSet();
    worldSGC.setGeometry(lineSet);

    // Basic appearance: blue polyline with visible points
    const ap = worldSGC.getAppearance();
    ap.setAttribute(CommonAttributes.EDGE_DRAW, true);
    ap.setAttribute('lineShader.' + CommonAttributes.DIFFUSE_COLOR, new Color(0, 0, 255));
    ap.setAttribute('lineShader.' + CommonAttributes.TUBE_RADIUS, 0.02);
    ap.setAttribute(CommonAttributes.VERTEX_DRAW, true);
    ap.setAttribute('pointShader.' + CommonAttributes.DIFFUSE_COLOR, new Color(255, 0, 0));
    ap.setAttribute('pointShader.' + CommonAttributes.SPHERES_DRAW, true);
    ap.setAttribute('pointShader.' + CommonAttributes.POINT_RADIUS, 0.05);

    // Install the tool that adds points
    const tool = new AddPointsTool(this.#points, this.#lsf);
    tool.setName('AddPointsTool');
    worldSGC.addTool(tool);

    return worldSGC;
  }
}

