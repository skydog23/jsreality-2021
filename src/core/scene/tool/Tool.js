/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * @typedef {import('./InputSlot.js').InputSlot} InputSlot
 * @typedef {import('./ToolContext.js').ToolContext} ToolContext
 * @typedef {import('../SceneGraphNode.js').SceneGraphNode} SceneGraphNode
 */

/**
 * Tools are attached to a SceneGraphComponent and are intended to
 * perform interactive changes to the scene - usually driven by user input.
 * 
 * The corresponding methods are activate(ToolContext), perform(ToolContext)
 * and deactivate(ToolContext).
 * 
 * User input is passed to the Tool either as an AxisState, which represents
 * a double value (i.e. a mouse button position) or a number[] of length 16,
 * which represents a 4 by 4 matrix. This matrix typically represents a euclidean
 * isometry that represents the original user input converted into a suitable
 * coordinate system.
 * 
 * These inputs are called virtual devices, since they are usually hardware
 * independent and "live in the scene". These virtual devices are mapped to
 * InputSlots, which should represent them under a meaningful name.
 * 
 * Tools may be always active or activated by some virtual device.
 * A Tool which is not always active (getActivationSlots() returns non-empty)
 * will be activated as soon as one of its activation slots reaches the state
 * AxisState.PRESSED. Warning: If the activation slot does not represent an
 * AxisState, the tool will never become active.
 * 
 * A single Tool instance can be attached to different scene graph components.
 * A tool attached to a scene graph component that appears at multiple positions
 * in the scene graph will also, implicitly, be instanced multiple times; each
 * instance will have its own local state not shared with other instances.
 * The current path is always available via the ToolContext:
 * getRootToLocal() and getRootToToolComponent() return the paths for the
 * current activate()/perform()/deactivate() call.
 * 
 * @interface
 */
export class Tool  {
 
  /**
   * Get the list of InputSlots for activating the tool.
   * 
   * If the result is empty, then the tool is always active.
   * 
   * If the result is not empty, then the tool becomes active as soon as the
   * axis of one activation slot is pressed. This implies that the InputSlots
   * must be associated to AxisStates, otherwise the Tool will never become active.
   * 
   * The tool gets deactivated as soon as the InputSlot that caused activation
   * changes its state to AxisState.RELEASED.
   * 
   * When the tool is active, other activation axes are ignored and passed to
   * other Tools down the path.
   * 
   * The result must remain constant.
   * 
   * @returns {InputSlot[]} List of InputSlots for activating the tool
   */
  getActivationSlots() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get the list of currently relevant input slots.
   * This method will only be called for active tools. The currentSlots may
   * change after each call of activate() or perform().
   * 
   * @returns {InputSlot[]} List of currently relevant input slots
   */
  getCurrentSlots() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Called when the tool gets activated.
   * Note that it will never be called if the tool is always active.
   * 
   * @param {ToolContext} tc - The current tool context
   */
  activate(tc) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Called when the tool is activated and any AxisState or TransformationMatrix
   * of the current slots changes.
   * 
   * @param {ToolContext} tc - The current tool context
   */
  perform(tc) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Called when the tool was activated and the AxisState of the activation slot
   * changes to AxisState.RELEASED (to zero).
   * Note that it will never be called for always active tools.
   * 
   * @param {ToolContext} tc - The current tool context
   */
  deactivate(tc) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Gives a description of the meaning of the given InputSlot.
   * This may depend on the current state of the Tool.
   * 
   * @param {InputSlot} slot - Slot to describe
   * @returns {string} A description of the current meaning of the given InputSlot
   */
  getDescription(slot) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Gives an overall description of this Tool.
   * 
   * @returns {string} A description of the Tool including information about
   * activation and overall behaviour
   */
  getDescription() {
    throw new Error('Method not implemented');
  }
}
