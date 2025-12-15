/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { InputSlot } from './InputSlot.js';
import { getLogger } from '../../util/LoggingSystem.js';
import { Level, Category } from '../../util/LoggingSystem.js';

/**
 * @typedef {import('./Tool.js').Tool} Tool
 * @typedef {import('./ToolSystemConfiguration.js').ToolSystemConfiguration} ToolSystemConfiguration
 * @typedef {import('./ToolSystemConfiguration.js').VirtualMapping} VirtualMapping
 */

const logger = getLogger('jsreality.core.scene.tool.SlotManager');

/**
 * SlotManager maps input slots to tools and handles virtual device mappings.
 * It maintains up-to-date maps of:
 * - Slots to activatable tools
 * - Slots to active tools
 * - Tools to current slots
 * - Slots to deactivation tools
 */
export class SlotManager {
  /** @type {Map<InputSlot, Set<Tool>>} Map from slot to activatable tools */
  #slot2activation = new Map();

  /** @type {Map<InputSlot, Set<Tool>>} Map from slot to active tools */
  #slot2active = new Map();

  /** @type {Map<Tool, Set<InputSlot>>} Map from tool to current slots */
  #tool2currentSlots = new Map();

  /** @type {Map<InputSlot, Set<Tool>>} Map from slot to deactivation tools */
  #slot2deactivation = new Map();

  /** @type {Map<InputSlot, Set<InputSlot>>} Virtual mappings: source -> targets */
  #virtualMappings = new Map();

  /** @type {Map<InputSlot, Set<InputSlot>>} Inverse virtual mappings: target -> sources */
  #virtualMappingsInv = new Map();

  /** @type {Map<Tool, Map<InputSlot, InputSlot>>} Map from tool to slot mappings */
  #slotsToMappingsForTool = new Map();

  /** @type {Map<Tool, Set<InputSlot>>} Virtual slots for each tool */
  #virtualSlotsForTool = new Map();

  /**
   * Create a new SlotManager with configuration.
   * @param {ToolSystemConfiguration} config - The tool system configuration
   */
  constructor(config) {
    const virtualMappings = config.getVirtualMappings();
    for (const vm of virtualMappings) {
      this.#getMappingsSourceToTargets(vm.getSourceSlot()).add(vm.getTargetSlot());
      this.#getMappingsTargetToSources(vm.getTargetSlot()).add(vm.getSourceSlot());
    }
  }

  /**
   * Get mappings from source to targets.
   * @param {InputSlot} slot - The source slot
   * @returns {Set<InputSlot>} Set of target slots
   * @private
   */
  #getMappingsSourceToTargets(slot) {
    if (!this.#virtualMappings.has(slot)) {
      this.#virtualMappings.set(slot, new Set());
    }
    return this.#virtualMappings.get(slot);
  }

  /**
   * Get mappings from target to sources.
   * @param {InputSlot} slot - The target slot
   * @returns {Set<InputSlot>} Set of source slots
   * @private
   */
  #getMappingsTargetToSources(slot) {
    if (!this.#virtualMappingsInv.has(slot)) {
      this.#virtualMappingsInv.set(slot, new Set());
    }
    return this.#virtualMappingsInv.get(slot);
  }

  /**
   * Get mappings for a tool.
   * @param {Tool} tool - The tool
   * @returns {Map<InputSlot, InputSlot>} Map from raw slot to slot name for tool
   * @private
   */
  #getMappingsForTool(tool) {
    if (!this.#slotsToMappingsForTool.has(tool)) {
      this.#slotsToMappingsForTool.set(tool, new Map());
    }
    return this.#slotsToMappingsForTool.get(tool);
  }

  /**
   * Get tools activated by a slot.
   * @param {InputSlot} slot - The slot
   * @returns {Set<Tool>} Set of tools
   */
  getToolsActivatedBySlot(slot) {
    return new Set(this.#getSlot2activation(slot));
  }

  /**
   * Get slot-to-activation map entry.
   * @param {InputSlot} slot - The slot
   * @returns {Set<Tool>} Set of tools
   * @private
   */
  #getSlot2activation(slot) {
    if (!this.#slot2activation.has(slot)) {
      this.#slot2activation.set(slot, new Set());
    }
    return this.#slot2activation.get(slot);
  }

  /**
   * Get tools deactivated by a slot.
   * @param {InputSlot} slot - The slot
   * @returns {Set<Tool>} Set of tools
   */
  getToolsDeactivatedBySlot(slot) {
    return new Set(this.#getSlot2deactivation(slot));
  }

  /**
   * Get slot-to-deactivation map entry.
   * @param {InputSlot} slot - The slot
   * @returns {Set<Tool>} Set of tools
   * @private
   */
  #getSlot2deactivation(slot) {
    if (!this.#slot2deactivation.has(slot)) {
      this.#slot2deactivation.set(slot, new Set());
    }
    return this.#slot2deactivation.get(slot);
  }

  /**
   * Get active tools for a slot.
   * @param {InputSlot} slot - The slot
   * @returns {Set<Tool>} Set of tools
   */
  getActiveToolsForSlot(slot) {
    return new Set(this.#getSlot2active(slot));
  }

  /**
   * Get slot-to-active map entry.
   * @param {InputSlot} slot - The slot
   * @returns {Set<Tool>} Set of tools
   * @private
   */
  #getSlot2active(slot) {
    if (!this.#slot2active.has(slot)) {
      this.#slot2active.set(slot, new Set());
    }
    return this.#slot2active.get(slot);
  }

  /**
   * Get current slots for a tool.
   * @param {Tool} tool - The tool
   * @returns {Set<InputSlot>} Set of slots
   * @private
   */
  #getTool2currentSlots(tool) {
    if (!this.#tool2currentSlots.has(tool)) {
      this.#tool2currentSlots.set(tool, new Set());
    }
    return this.#tool2currentSlots.get(tool);
  }

  /**
   * Check if a slot is active.
   * @param {InputSlot} slot - The slot
   * @returns {boolean} True if active
   */
  isActiveSlot(slot) {
    return this.#slot2active.has(slot);
  }

  /**
   * Check if a slot is an activation slot.
   * @param {InputSlot} slot - The slot
   * @returns {boolean} True if activation slot
   */
  isActivationSlot(slot) {
    return this.#slot2activation.has(slot);
  }

  /**
   * Get virtual slots for a tool.
   * @param {Tool} tool - The tool
   * @returns {Set<InputSlot>} Set of slots
   * @private
   */
  #getVirtualSlotsForTool(tool) {
    if (!this.#virtualSlotsForTool.has(tool)) {
      this.#virtualSlotsForTool.set(tool, new Set());
    }
    return this.#virtualSlotsForTool.get(tool);
  }

  /**
   * Resolve a slot to its trigger slots (recursively following virtual mappings).
   * @param {InputSlot} slot - The slot to resolve
   * @returns {Set<InputSlot>} Set of trigger slots
   */
  resolveSlot(slot) {
    const ret = new Set();
    this.#findTriggerSlots(ret, slot);
    return ret;
  }

  /**
   * Recursively find trigger slots for a slot.
   * @param {Set<InputSlot>} result - Set to add results to
   * @param {InputSlot} slot - The slot to resolve
   * @private
   */
  #findTriggerSlots(result, slot) {
    const sources = this.#getMappingsTargetToSources(slot);
    if (slot.getName() === 'PointerTransformation') {
      logger.finest(Category.ALL, `#findTriggerSlots(PointerTransformation): sources.size=${sources.size}`);
    }
    if (sources.size === 0) {
      result.add(slot);
      return;
    }
    for (const sl of sources) {
      this.#findTriggerSlots(result, sl);
    }
  }

  /**
   * Resolve multiple slots to their trigger slots.
   * @param {InputSlot[]} slotSet - Array of slots
   * @returns {Set<InputSlot>} Set of trigger slots
   * @private
   */
  #resolveSlots(slotSet) {
    const ret = new Set();
    for (const slot of slotSet) {
      this.#findTriggerSlots(ret, slot);
    }
    return ret;
  }

  /**
   * Update maps for the current tool system state.
   * @param {Set<Tool>} activeTools - Tools that are still active
   * @param {Set<Tool>} activatedTools - Tools activated recently
   * @param {Set<Tool>} deactivatedTools - Tools deactivated recently
   */
  updateMaps(activeTools, activatedTools, deactivatedTools) {
    // Handle newly activated tools
    for (const tool of activatedTools) {
      for (const tool of activatedTools) {
        logger.finer(
          Category.ALL,
          `updateMaps(activated): tool=${tool.getName()}, currentSlots=` +
            tool.getCurrentSlots().map(s => s.getName()).join(', ')
        );
        // existing code …
      }
      // Update slot2active
      for (const slot of tool.getCurrentSlots()) {
        for (const resolvedSlot of this.resolveSlot(slot)) {
          this.#getSlot2active(resolvedSlot).add(tool);
          this.#getMappingsForTool(tool).set(resolvedSlot, slot);
        }
      }

      // Remember all currently used slots for activated tool
      const currentSlots = this.#resolveSlots(tool.getCurrentSlots());
      for (const slot of currentSlots) {
        this.#getTool2currentSlots(tool).add(slot);
      }
      for (const slot of tool.getCurrentSlots()) {
        this.#getVirtualSlotsForTool(tool).add(slot);
      }

      // Update slot2activation
      for (const slot of tool.getActivationSlots()) {
        for (const resolvedSlot of this.resolveSlot(slot)) {
          this.#getSlot2activation(resolvedSlot).delete(tool);
          this.#getSlot2deactivation(resolvedSlot).add(tool);
        }
      }
    }

    // Handle newly deactivated tools
    for (const tool of deactivatedTools) {
      // Update slot2active
      for (const slot of tool.getCurrentSlots()) {
        for (const resolvedSlot of this.resolveSlot(slot)) {
          this.#getSlot2active(resolvedSlot).delete(tool);
          this.#getMappingsForTool(tool).delete(resolvedSlot);
        }
      }

      // Update slot2activation
      for (const slot of tool.getActivationSlots()) {
        for (const resolvedSlot of this.resolveSlot(slot)) {
          this.#getSlot2activation(resolvedSlot).add(tool);
          this.#getSlot2deactivation(resolvedSlot).delete(tool);
        }
      }

      this.#getVirtualSlotsForTool(tool).clear();
      for (const slot of tool.getActivationSlots()) {
        this.#getVirtualSlotsForTool(tool).add(slot);
      }
    }

    // Update used slots for still active tools
    for (const tool of activeTools) {
      const newUsed = this.#resolveSlots(tool.getCurrentSlots());
      const oldUsed = this.#getTool2currentSlots(tool);

      // Find added and removed slots
      const added = new Set(newUsed);
      for (const slot of oldUsed) {
        added.delete(slot);
      }

      const removed = new Set(oldUsed);
      for (const slot of newUsed) {
        removed.delete(slot);
      }

      // Update slot2active
      for (const slot of added) {
        this.#getSlot2active(slot).add(tool);
      }
      for (const slot of removed) {
        this.#getSlot2active(slot).delete(tool);
      }

      // Update tool2currentSlots
      for (const slot of removed) {
        this.#getTool2currentSlots(tool).delete(slot);
      }
      for (const slot of added) {
        this.#getTool2currentSlots(tool).add(slot);
      }

      // Update virtual slots
      const oldUsedVirtual = new Set(this.#getVirtualSlotsForTool(tool));
      const newUsedVirtual = new Set();
      for (const slot of tool.getActivationSlots()) {
        newUsedVirtual.add(slot);
      }
      for (const slot of tool.getCurrentSlots()) {
        newUsedVirtual.add(slot);
      }

      const oldUsedVirtualRemoved = new Set(oldUsedVirtual);
      for (const slot of newUsedVirtual) {
        oldUsedVirtualRemoved.delete(slot);
      }

      const newUsedVirtualAdded = new Set(newUsedVirtual);
      for (const slot of oldUsedVirtual) {
        newUsedVirtualAdded.delete(slot);
      }

      // Update the map
      for (const slot of oldUsedVirtualRemoved) {
        this.#getVirtualSlotsForTool(tool).delete(slot);
      }
      for (const slot of newUsedVirtualAdded) {
        this.#getVirtualSlotsForTool(tool).add(slot);
      }

      // Update mappings
      for (const slot of oldUsedVirtualRemoved) {
        this.#getMappingsForTool(tool).delete(slot);
      }

      for (const newSlot of newUsedVirtualAdded) {
        for (const virtualSlot of this.resolveSlot(newSlot)) {
          this.#getMappingsForTool(tool).set(virtualSlot, newSlot);
        }
      }
    }
  }

  /**
   * Register a tool with the slot manager.
   * @param {Tool} tool - The tool to register
   */
  registerTool(tool) {
    if (tool.getActivationSlots().length === 0) {
      // Permanently active tool
      logger.finer(Category.ALL, `Registering always-active tool ${tool.constructor.name} with ${tool.getCurrentSlots().length} current slots`);
      for (const slot of tool.getCurrentSlots()) {
        logger.finest(Category.ALL, `Processing current slot: ${slot.getName()}`);
        this.#getVirtualSlotsForTool(tool).add(slot);
        const resolvedSlots = this.resolveSlot(slot);
        logger.finest(Category.ALL, `Resolved ${slot.getName()} to ${resolvedSlots.size} slots:`, Array.from(resolvedSlots).map(s => s.getName()));
        for (const resolvedSlot of resolvedSlots) {
          this.#getTool2currentSlots(tool).add(resolvedSlot);
          this.#getMappingsForTool(tool).set(resolvedSlot, slot);
          this.#getSlot2active(resolvedSlot).add(tool);
          logger.finest(Category.ALL, `Added tool to active slot: ${resolvedSlot.getName()}`);
        }
      }
    } else {
      for (const slot of tool.getActivationSlots()) {
        this.#getVirtualSlotsForTool(tool).add(slot);
        const resolvedSlots = this.resolveSlot(slot);
        for (const resolvedSlot of resolvedSlots) {
          this.#getMappingsForTool(tool).set(resolvedSlot, slot);
          this.#getSlot2activation(resolvedSlot).add(tool);
        }
      }
    }
  }

  /**
   * Unregister a tool from the slot manager.
   * @param {Tool} tool - The tool to unregister
   */
  unregisterTool(tool) {
    if (tool.getActivationSlots().length === 0) {
      // Permanently active tool
      for (const slot of tool.getCurrentSlots()) {
        const resolvedSlots = this.resolveSlot(slot);
        for (const resolvedSlot of resolvedSlots) {
          this.#getSlot2active(resolvedSlot).delete(tool);
        }
      }
    } else {
      for (const slot of tool.getActivationSlots()) {
        const resolvedSlots = this.resolveSlot(slot);
        for (const resolvedSlot of resolvedSlots) {
          this.#getSlot2activation(resolvedSlot).delete(tool);
        }
      }
    }
    this.#getMappingsForTool(tool).clear();
    this.#getTool2currentSlots(tool).clear();
    this.#getVirtualSlotsForTool(tool).clear();
  }

  /**
   * Resolve a slot for a tool (returns the mapped slot name expected by the tool).
   * @param {Tool} tool - The tool
   * @param {InputSlot} sourceSlot - The source slot
   * @returns {InputSlot} The resolved slot (or sourceSlot if no mapping)
   */
  resolveSlotForTool(tool, sourceSlot) {
    const ret = this.#getMappingsForTool(tool).get(sourceSlot);
    return ret !== undefined ? ret : sourceSlot;
  }
}

