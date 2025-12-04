/**
 * Widget catalog stores factory functions for descriptor types.
 * Each factory returns a DOM element implementing the widget.
 */

import { DescriptorType, normalizeDescriptor } from './DescriptorTypes.js';

/**
 * @typedef {(descriptor: import('./DescriptorTypes.js').InspectorDescriptor, context: WidgetContext) => HTMLElement} WidgetFactoryFn
 *
 * @typedef {Object} WidgetContext
 * @property {(callback: Function) => void} registerCleanup
 */

export class WidgetCatalog {
  constructor() {
    /** @type {Map<string, WidgetFactoryFn>} */
    this.#factories = new Map();
  }

  /** @type {Map<string, WidgetFactoryFn>} */
  #factories;

  /**
   * Register a widget factory for a descriptor type.
   * @param {string} type
   * @param {WidgetFactoryFn} factory
   */
  register(type, factory) {
    if (!type || typeof factory !== 'function') {
      throw new Error('WidgetCatalog.register requires a type and factory function');
    }
    this.#factories.set(type, factory);
  }

  /**
   * Create a widget element for a descriptor.
   * @param {import('./DescriptorTypes.js').InspectorDescriptor} descriptor
   * @param {WidgetContext} context
   */
  create(descriptor, context) {
    const normalized = normalizeDescriptor(descriptor);
    const factory = this.#factories.get(normalized.type);
    if (!factory) {
      const fallback = document.createElement('div');
      fallback.className = 'inspector-widget inspector-widget--unsupported';
      fallback.textContent = `Unsupported descriptor type: ${normalized.type}`;
      return fallback;
    }
    return factory(normalized, context);
  }

  /**
   * Create a catalog pre-populated with default widgets.
   * @returns {WidgetCatalog}
   */
  static createDefault() {
    const catalog = new WidgetCatalog();
    catalog.register(DescriptorType.FLOAT, numericInputFactory('number', { fractionDigits: 4 }));
    catalog.register(DescriptorType.INT, numericInputFactory('number', { step: 1, fractionDigits: 0 }));
    catalog.register(DescriptorType.TOGGLE, toggleFactory);
    catalog.register(DescriptorType.COLOR, colorFactory);
    catalog.register(DescriptorType.TEXT, textFactory);
    catalog.register(DescriptorType.BUTTON, buttonFactory);
    catalog.register(DescriptorType.LABEL, labelFactory);
    catalog.register(DescriptorType.ENUM, enumFactory);
    catalog.register(DescriptorType.VECTOR, vectorFactory);
    return catalog;
  }
}

function numericInputFactory(inputType, overrides = {}) {
  return (descriptor) => {
    const wrapper = createRow(descriptor);
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = 'inspector-input inspector-input--number';
    const fractionDigits = overrides.fractionDigits ?? 4;
    input.value = formatNumber(descriptor.getValue?.(), fractionDigits);
    if (descriptor.min !== undefined) input.min = descriptor.min;
    if (descriptor.max !== undefined) input.max = descriptor.max;
    if (descriptor.step !== undefined) input.step = descriptor.step;
    if (overrides.step) input.step = overrides.step;
    if (descriptor.readonly || descriptor.disabled || !descriptor.setValue) {
      input.disabled = true;
    }
    input.addEventListener('change', () => {
      if (!descriptor.setValue) return;
      const normalized = normalizeDecimalString(input.value);
      const rawValue = descriptor.type === DescriptorType.INT
        ? parseInt(normalized, 10)
        : parseFloat(normalized);
      if (Number.isNaN(rawValue)) {
        input.value = formatNumber(descriptor.getValue?.(), fractionDigits);
        return;
      }
      descriptor.setValue(rawValue);
      input.value = formatNumber(descriptor.getValue?.(), fractionDigits);
    });
    wrapper.value.appendChild(input);
    return wrapper.root;
  };
}

function toggleFactory(descriptor) {
  const wrapper = createRow(descriptor);
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = Boolean(descriptor.getValue?.());
  input.disabled = descriptor.readonly || descriptor.disabled || !descriptor.setValue;
  input.addEventListener('change', () => {
    if (!descriptor.setValue) return;
    descriptor.setValue(input.checked);
    input.checked = Boolean(descriptor.getValue?.());
  });
  wrapper.value.appendChild(input);
  return wrapper.root;
}

function colorFactory(descriptor) {
  const wrapper = createRow(descriptor);
  const input = document.createElement('input');
  input.type = 'color';
  input.value = descriptor.getValue?.() ?? '#ffffff';
  input.disabled = descriptor.readonly || descriptor.disabled || !descriptor.setValue;
  input.addEventListener('input', () => {
    if (!descriptor.setValue) return;
    descriptor.setValue(input.value);
  });
  wrapper.value.appendChild(input);
  return wrapper.root;
}

function textFactory(descriptor) {
  const wrapper = createRow(descriptor);
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inspector-input inspector-input--text';
  input.value = descriptor.getValue?.() ?? '';
  input.placeholder = descriptor.description || descriptor.label;
  input.disabled = descriptor.readonly || descriptor.disabled || !descriptor.setValue;
  input.addEventListener('change', () => {
    if (!descriptor.setValue) return;
    descriptor.setValue(input.value);
  });
  wrapper.value.appendChild(input);
  return wrapper.root;
}

function buttonFactory(descriptor) {
  const wrapper = createRow(descriptor);
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = descriptor.label || 'Action';
  button.disabled = descriptor.disabled || !descriptor.action;
  button.addEventListener('click', () => {
    descriptor.action?.();
  });
  wrapper.value.appendChild(button);
  return wrapper.root;
}

function labelFactory(descriptor) {
  const wrapper = createRow(descriptor);
  const span = document.createElement('span');
  span.textContent = descriptor.getValue?.() ?? '';
  wrapper.value.appendChild(span);
  return wrapper.root;
}

function enumFactory(descriptor) {
  const wrapper = createRow(descriptor);
  const select = document.createElement('select');
  select.className = 'inspector-input inspector-input--select';
  const value = descriptor.getValue?.();
  for (const option of descriptor.options || []) {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label ?? String(option.value);
    if (option.value === value) {
      opt.selected = true;
    }
    select.appendChild(opt);
  }
  select.disabled = descriptor.readonly || descriptor.disabled || !descriptor.setValue;
  select.addEventListener('change', () => {
    if (!descriptor.setValue) return;
    descriptor.setValue(select.value);
  });
  wrapper.value.appendChild(select);
  return wrapper.root;
}

function vectorFactory(descriptor) {
  const wrapper = createRow(descriptor);
  const getVector = () => {
    const result = descriptor.getValue?.();
    return Array.isArray(result) ? [...result] : [0, 0, 0];
  };
  const updateInputs = (inputs, values) => {
    inputs.forEach((input, idx) => {
      input.value = formatNumber(values[idx]);
    });
  };
  const initialValues = getVector();
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.gap = '6px';
  container.style.alignItems = 'center';
  const inputs = initialValues.map((val, index) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.value = formatNumber(val);
    input.style.width = '4rem';
    input.className = 'sg-number-widget-input';
    input.disabled = descriptor.readonly || descriptor.disabled || !descriptor.setValue;
    input.addEventListener('change', () => {
      if (!descriptor.setValue) return;
      const next = getVector();
      const normalized = normalizeDecimalString(input.value);
      const parsed = parseFloat(normalized);
      if (Number.isNaN(parsed)) {
        input.value = formatNumber(next[index]);
        return;
      }
      next[index] = parsed;
      descriptor.setValue(next);
      updateInputs(inputs, getVector());
    });
    container.appendChild(input);
    return input;
  });
  wrapper.value.appendChild(container);
  return wrapper.root;
}

function createRow(descriptor) {
  const root = document.createElement('div');
  root.className = 'sg-prop-row';
  if (descriptor.hidden) {
    root.style.display = 'none';
  }
  const label = document.createElement('label');
  label.className = 'sg-prop-label';
  label.textContent = descriptor.label || descriptor.key;
  if (descriptor.description) {
    label.title = descriptor.description;
  }
  const value = document.createElement('div');
  value.className = 'sg-prop-value';

  root.appendChild(label);
  root.appendChild(value);
  return { root, value };
}

function formatNumber(value, fractionDigits = 4) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) {
    return '0';
  }
  return num.toFixed(fractionDigits);
}

function normalizeDecimalString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/,/g, '.');
}

