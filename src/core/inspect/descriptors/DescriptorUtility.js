/**
 * DescriptorUtility - Utility functions for working with inspector descriptors.
 * 
 * Provides helper methods for creating inspector panels and working with
 * descriptor arrays.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { createCollapsiblePanel } from '../../../app/ui/CollapsiblePanel.js';
import { DescriptorRenderer } from './DescriptorRenderer.js';

/**
 * Utility functions for working with inspector descriptors.
 */
export class DescriptorUtility {
  /**
   * Create a default inspector panel from a flat array of descriptors.
   * 
   * This creates a collapsible panel with the specified title and renders
   * the provided descriptors inside it. The descriptors are automatically
   * wrapped in a single group. The panel can be registered with
   * ShrinkPanelAggregator or used standalone.
   * 
   * @param {string} title - Panel title
   * @param {Array<import('./DescriptorTypes.js').InspectorDescriptor>} descriptors - Flat array of descriptors to render
   * @param {Object} [options] - Configuration options
   * @param {string} [options.id] - Optional unique identifier for the panel (auto-generated if missing)
   * @param {string} [options.icon] - Optional icon/emoji for the title bar
   * @param {boolean} [options.collapsed=false] - Initial collapsed state
   * @param {Function} [options.onPropertyChange] - Optional callback when a property value changes.
   *   If provided, this callback will be called after each descriptor's `setValue` method completes.
   *   Use this to trigger a render or perform other side effects. If omitted, descriptors handle
   *   their own side effects (e.g., calling render() directly in their setValue methods).
   * @returns {HTMLElement} The collapsible panel element
   */
  static createDefaultInspectorPanel(title, descriptors, options = {}) {
    const {
      id = null,
      icon = '⚙️',
      collapsed = false,
      onPropertyChange = null
    } = options;

    if (!title) {
      throw new Error('DescriptorUtility.createDefaultInspectorPanel requires title');
    }

    if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
      throw new Error('DescriptorUtility.createDefaultInspectorPanel requires non-empty descriptors array');
    }

    // Create collapsible panel
    const panel = createCollapsiblePanel({
      title: title,
      icon: icon,
      collapsed: collapsed
    });

    // Create content container for descriptors
    const content = document.createElement('div');
    content.style.width = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';

    // Wrap descriptors with property change callback if provided
    const wrappedDescriptors = onPropertyChange
      ? descriptors.map(item => {
          const originalSetValue = item.setValue;
          if (originalSetValue) {
            return {
              ...item,
              setValue: (value) => {
                originalSetValue(value);
                onPropertyChange();
              }
            };
          }
          return item;
        })
      : descriptors;

    // Wrap descriptors in a single group (no title needed - panel already has title)
    const group = {
      key: id,
      title: '', // Empty title - panel title is sufficient
      items: wrappedDescriptors
    };

    // Render descriptors
    const descriptorRenderer = new DescriptorRenderer(content);
    descriptorRenderer.render([group]);
    panel.setContent(content);

    return panel;
  }
}

