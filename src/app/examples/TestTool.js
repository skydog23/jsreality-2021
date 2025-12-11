/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { AbstractTool } from '../../core/scene/tool/AbstractTool.js';
import { InputSlot } from '../../core/scene/tool/InputSlot.js';
import { getLogger, setModuleLevel, Level, Category } from '../../core/util/LoggingSystem.js';

/**
 * @typedef {import('../../core/scene/tool/ToolContext.js').ToolContext} ToolContext
 */

const logger = getLogger('TestTool');

// Configure logging for TestTool: enable FINER level but not FINEST
// This will print logger.finer() calls but not logger.finest() calls
setModuleLevel('TestTool', Level.INFO);

/**
 * Test tool that prints mouse coordinates.
 * Always active (no activation slots required).
 */
export class TestTool extends AbstractTool {
  _mousePosition = [0, 0,0,1];
  /**
   * Create a new TestTool.
   */
  constructor() {
    super(InputSlot.LEFT_BUTTON); 
    this.setDescription('Test tool that prints mouse coordinates');
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
  }

   /**
   * Called when the tool performs (always active, so called on every mouse move).
   * @param {ToolContext} tc - The tool context
   */
  perform(tc) {
    logger.finer(Category.ALL, `perform() called, tc: ${tc.toString()}, pick: ${tc.getCurrentPick()}`);
    // Get mouse position from POINTER_TRANSFORMATION slot
    const pointerTrafo = tc.getTransformationMatrix(InputSlot.POINTER_TRANSFORMATION);
    
    if (pointerTrafo !== null) {
      // Extract NDC coordinates from transformation matrix
      // Matrix is column-major: [m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33]
      // Position is in entries (0,3) = index 3 and (1,3) = index 7
      const xndc = pointerTrafo[3];  // Entry (0,3) - X coordinate in NDC space [-1, 1]
      const yndc = pointerTrafo[7];  // Entry (1,3) - Y coordinate in NDC space [-1, 1]
      this._mousePosition[0] = xndc;
      this._mousePosition[1] = yndc;
      // logger.finest(Category.ALL, `Mouse coordinates (NDC): x=${xndc.toFixed(3)}, y=${yndc.toFixed(3)}`);
      logger.fine(Category.ALL, `x y: ${xndc.toFixed(3)}, ${yndc.toFixed(3)}`);
    } else {
      logger.finer(Category.ALL, 'POINTER_TRANSFORMATION matrix is null');
    }
  }

  /**
   * Called when the tool is deactivated (not used for always-active tools).
   * @param {ToolContext} tc - The tool context
   */
  deactivate(tc) {
    // Remove POINTER_TRANSFORMATION from current slots
    this.removeCurrentSlot(InputSlot.POINTER_TRANSFORMATION);
    logger.fine(Category.ALL, `deactivate() called: ${this.getName()}, tc: ${tc.toString()}`);
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

