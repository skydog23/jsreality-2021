/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * Widget factory for the INHERITABLE descriptor type.
 *
 * Wraps another descriptor to add Appearance-attribute "inherited" semantics:
 *  - When the attribute value is the INHERITED symbol, shows an "Inherited"
 *    button that, on click, writes a schema-derived default and rebuilds.
 *  - When the attribute has an explicit value, shows the inner descriptor's
 *    widget plus a "Clear" button that resets the attribute to INHERITED.
 *
 * @typedef {import('../DescriptorTypes.js').InheritableDescriptor} InheritableDescriptor
 * @typedef {import('../WidgetCatalog.js').WidgetContext} WidgetContext
 */

import { INHERITED } from '../../../scene/Appearance.js';
import { Color } from '../../../util/Color.js';
import { DefaultGeometryShader } from '../../../shader/DefaultGeometryShader.js';
import * as CommonAttributes from '../../../shader/CommonAttributes.js';

/**
 * Resolve the default value for an attribute from the shader schema.
 *
 * Mirrors the logic previously in ShaderPropertyManager.#createInheritedButton.
 *
 * @param {string} attributeKey - Full attribute key (e.g. 'polygonShader.diffuseColor')
 * @param {Object} schema - Shader schema object
 * @returns {*} The default value, or undefined if none could be determined
 */
function resolveDefault(attributeKey, schema) {
  const attrName = attributeKey.split('.').pop();

  if (schema === DefaultGeometryShader) {
    if (attributeKey === CommonAttributes.VERTEX_DRAW) return CommonAttributes.VERTEX_DRAW_DEFAULT;
    if (attributeKey === CommonAttributes.EDGE_DRAW) return CommonAttributes.EDGE_DRAW_DEFAULT;
    if (attributeKey === CommonAttributes.FACE_DRAW) return CommonAttributes.FACE_DRAW_DEFAULT;
  }

  if (typeof schema.getAllDefaults === 'function') {
    const defaults = schema.getAllDefaults();
    if (defaults[attrName] !== undefined && defaults[attrName] !== null) {
      return defaults[attrName];
    }
  }

  const constantName = attrName.replace(/([A-Z])/g, '_$1').toUpperCase() + '_DEFAULT';
  if (schema[constantName] !== undefined && schema[constantName] !== null) {
    return schema[constantName];
  }

  // Heuristic fallbacks based on naming conventions
  if (attrName.includes('Color') || attrName.toLowerCase().endsWith('color')) return new Color(255, 255, 255);
  if (attrName.includes('Size') || attrName.includes('Radius') || attrName.includes('Width')) return 1.0;
  if (attrName.includes('Coefficient')) return 1.0;
  if (attrName.includes('Exponent')) return 60.0;
  if (attrName.includes('Draw') || attrName.includes('Enabled') || attrName.includes('Shading')) return true;

  return undefined;
}

/**
 * @param {InheritableDescriptor} descriptor
 * @param {WidgetContext} context
 * @param {(descriptor: any) => {root: HTMLElement, value: HTMLElement}} createRow
 * @returns {HTMLElement}
 */
export function inheritableWidgetFactory(descriptor, context, createRow) {
  const { attributeKey, appearance, schema, innerDescriptorFactory, onToggle } = descriptor;

  const wrapper = createRow(descriptor);
  const value = appearance.getAttribute(attributeKey);
  const isInherited = value === INHERITED;

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.gap = '5px';
  container.style.alignItems = 'center';

  if (isInherited) {
    const btn = document.createElement('button');
    btn.className = 'sg-inherited-button';
    btn.textContent = 'Inherited';
    btn.title = 'Click to set a default value';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const defaultValue = resolveDefault(attributeKey, schema);
      if (defaultValue === undefined) {
        console.warn(`No default value found for attribute: ${attributeKey}`);
        return;
      }
      appearance.setAttribute(attributeKey, defaultValue);
      onToggle?.();
    });
    container.appendChild(btn);
  } else {
    const innerDesc = innerDescriptorFactory();
    if (innerDesc.containerLabel) {
      const labelEl = wrapper.root.querySelector('.sg-prop-label');
      if (labelEl) labelEl.textContent = '';
    }
    const widgetCatalog = context.widgetCatalog;
    if (widgetCatalog) {
      const innerElement = widgetCatalog.create(innerDesc, context);
      container.appendChild(innerElement);
    }

    const clearBtn = document.createElement('button');
    clearBtn.className = 'sg-inherited-button explicit';
    clearBtn.textContent = 'Clear';
    clearBtn.title = 'Click to remove this attribute (set to inherited)';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      appearance.setAttribute(attributeKey, INHERITED);
      onToggle?.();
    });
    container.appendChild(clearBtn);
  }

  wrapper.value.appendChild(container);
  return wrapper.root;
}
