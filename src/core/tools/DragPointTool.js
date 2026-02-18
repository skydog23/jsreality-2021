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
/**
 * @typedef {import('../scene/tool/ToolContext.js').ToolContext} ToolContext
 */

const logger = getLogger('jsreality.app.examples.DragPointTool');

// Configure logging for TestTool: enable FINER level but not FINEST
// This will print logger.finer() calls but not logger.finest() calls
setModuleLevel(logger.getModuleName(), Level.FINE);

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
    logger.fine(Category.ALL, `activate() called: ${this.getName()}`);
    logger.finer(Category.ALL, `tool context: ${tc.toString()}`);
    logger.finer(Category.ALL, `pick result: ${tc.getCurrentPick()}`);
    if (tc.getCurrentPick() == null) return;
    this._goodHit = false;
    this._hit = tc.getCurrentPick();
    if (this._hit == null || this._hit.getPickType() !== PickResult.PICK_TYPE_POINT) return;
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
    logger.finer(Category.ALL, `perform() called, tc: ${tc.toString()}, pick: ${tc.getCurrentPick()}`);
    this._scn2obj = Rn.times(null, tc.getRootToLocal().getMatrix(null), tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION));
    this._scn2obj = Rn.conjugateByMatrix(null, tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION), tc.getRootToLocal().getInverseMatrix(null));
    this._verts[this._index][0] = this._scn2obj[3];
    this._verts[this._index][1] = this._scn2obj[7];
    this._pointset.setVertexAttribute(GeometryAttribute.COORDINATES, toDataList(this._verts));
    //this._pointset.update();
    tc.getViewer().renderAsync();
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

