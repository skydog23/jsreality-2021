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
   * Create a default inspector panel from descriptor groups.
   * 
   * This creates a collapsible panel with the specified title and renders
   * the provided descriptor groups inside it. The panel can be registered
   * with ShrinkPanelAggregator or used standalone.
   * 
   * @param {string} id - Unique identifier for the panel
   * @param {string} title - Panel title
   * @param {Array<import('./DescriptorTypes.js').DescriptorGroup>} items - Array of descriptor groups to render
   * @param {Object} [options] - Configuration options
   * @param {string} [options.icon] - Optional icon/emoji for the title bar
   * @param {boolean} [options.collapsed=false] - Initial collapsed state
   * @param {Function} [options.onPropertyChange] - Callback when a property value changes (for render triggers)
   * @returns {HTMLElement} The collapsible panel element
   */
  static createDefaultInspectorPanel(id, title, items, options = {}) {
    const {
      icon = '⚙️',
      collapsed = false,
      onPropertyChange = null
    } = options;

    if (!id || !title) {
      throw new Error('DescriptorUtility.createDefaultInspectorPanel requires id and title');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('DescriptorUtility.createDefaultInspectorPanel requires non-empty items array');
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

    // Render descriptors
    const descriptorRenderer = new DescriptorRenderer(content);

    // Wrap descriptors with property change callback if provided
    const wrappedItems = onPropertyChange
      ? items.map(group => ({
          ...group,
          items: group.items.map(item => {
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
        }))
      : items;

    descriptorRenderer.render(wrappedItems);
    panel.setContent(content);

    return panel;
  }
}

