/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { AbstractTool } from '../scene/tool/AbstractTool.js';
import { InputSlot } from '../scene/tool/InputSlot.js';
import { getLogger, setModuleLevel, Level, Category } from '../util/LoggingSystem.js';
import { PickResult } from '../scene/pick/PickResult.js';
import { PointSet } from '../scene/PointSet.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { DataUtility, toDataList, fromDataList } from '../scene/data/DataUtility.js'; 
import * as Rn from '../math/Rn.js';
import * as Pn from '../math/Pn.js';
import { Matrix } from '../math/Matrix.js';
/**
 * @typedef {import('../scene/tool/ToolContext.js').ToolContext} ToolContext
 */

const logger = getLogger('jsreality.app.examples.DragPointTool');

// Configure logging for TestTool: enable FINER level but not FINEST
// This will print logger.finer() calls but not logger.finest() calls
setModuleLevel(logger.getModuleName(), Level.INFO);

/**
 * Test tool that prints mouse coordinates.
 * Always active (no activation slots required).
 */
export class DragPointTool extends AbstractTool {
  _mousePosition = [0, 0,0,1];
  _pointSGC = null;
  _pointset = null;
  _verts = null;
  _index = -1;
  _hit = null;
  _pickpoint = null
  _startPointerTransform = null;
  _scn2obj = null;
  _goodHit = false;
  /**
   * Create a new TestTool.
   */
  constructor() {
    super(InputSlot.LEFT_BUTTON); 
    this.setDescription('Drag a point in a point set tool');
    //  this.addCurrentSlot(InputSlot.POINTER_TRANSFORMATION, 'Mouse pointer position');
  }

  /**
   * Called when the tool is activated (not used for always-active tools).
   * @param {ToolContext} tc - The tool context
   */
  activate(tc) {
    // Add POINTER_TRANSFORMATION as a current slot to receive mouse position updates
    this.addCurrentSlot(InputSlot.POINTER_TRANSFORMATION, 'Mouse pointer position');
    // logger.fine(Category.ALL, `activate() called: ${this.getName()}`);
    // logger.fine(Category.ALL, 'w2l matrix:\n', Rn.matrixToString(tc.getRootToLocal().getMatrix(null)));
    // logger.fine(Category.ALL, 'l2w matrix:\n', Rn.matrixToString(Rn.inverse(null, tc.getRootToLocal().getMatrix(null))));
    // logger.finer(Category.ALL, `tool context: ${tc.toString()}`);
    // logger.finer(Category.ALL, `pick result: ${tc.getCurrentPick()}`);
    if (tc.getCurrentPick() == null) return;
    this._goodHit = false;
    this._hit = tc.getCurrentPick();
    if (this._hit == null || this._hit.getPickType() !== PickResult.PICK_TYPE_POINT) return;
    this._pickpoint = this._hit.getObjectCoordinates();
    Pn.dehomogenize(this._pickpoint, this._pickpoint);
    logger.fine(-1, 'pickpoint:', this._pickpoint);
    this._startPointerTransform = tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION);
    this._pointset = this._hit.getPickPath().getLastElement();
    if ( this._pointset == null || ! (this._pointset instanceof PointSet)) return;
    this._verts = DataUtility.fromDataList(this._pointset.getVertexAttribute(GeometryAttribute.COORDINATES));
    this._index = this._hit.getIndex();
    if (this._verts == null || this._index == -1) return;
    this._goodHit = true;
    
  }

   /**
   * Called when the tool performs (always active, so called on every mouse move).
   * @param {ToolContext} tc - The tool context
   */
  perform(tc) {
    if (!this._goodHit) return;
    logger.finer(Category.ALL, `perform() called, tc:`, tc, `pick: ${tc.getCurrentPick()}`);
    logger.fine(-1,'pointer trafo:\n', Rn.matrixToString(tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION)));
    const diff = Rn.times(null, Rn.inverse(null, this._startPointerTransform), tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION));
    logger.fine(-1, 'diff:\n', Rn.matrixToString(diff));
  
    this._scn2obj = Rn.conjugateByMatrix(null, diff, tc.getRootToLocal().getInverseMatrix(null));
    const newpoint =new Matrix(this._scn2obj).getColumn(3);
    logger.fine(-1, 'newpoint:', newpoint);
    this._verts[this._index][0] = this._pickpoint[0] + newpoint[0];
    this._verts[this._index][1] = this._pickpoint[1] + newpoint[1];
    this._pointset.setVertexAttribute(GeometryAttribute.COORDINATES, toDataList(this._verts));
  }

  /**
   * Called when the tool is deactivated (not used for always-active tools).
   * @param {ToolContext} tc - The tool context
   */
  deactivate(tc) {
    // Remove POINTER_TRANSFORMATION from current slots
    this.removeCurrentSlot(InputSlot.POINTER_TRANSFORMATION);
    logger.fine(Category.ALL, `deactivate() called: ${this.getName()}, tc: ${tc.toString()}`);
    tc.getViewer().renderAsync();
  }

  /**
   * Get description for a slot.
   * @param {InputSlot} slot - The slot
   * @returns {string} Description
   */
  getDescription(slot) {
    if (slot === InputSlot.POINTER_TRANSFORMATION) {
      return 'Mouse pointer position';
    }
    return super.getDescription(slot);
  }
}

