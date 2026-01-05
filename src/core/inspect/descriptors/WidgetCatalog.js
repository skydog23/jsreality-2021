/**
 * Widget catalog stores factory functions for descriptor types.
 * Each factory returns a DOM element implementing the widget.
 */

import { DescriptorType, normalizeDescriptor } from './DescriptorTypes.js';
import { textSliderWidgetFactory } from './widgets/TextSliderWidget.js';

/**
 * @typedef {(descriptor: import('./DescriptorTypes.js').InspectorDescriptor, context: WidgetContext) => HTMLElement} WidgetFactoryFn
 *
 * @typedef {Object} WidgetContext
 * @property {(callback: Function) => void} registerCleanup
 * @property {WidgetCatalog} [widgetCatalog] - Optional reference to the catalog, for nested layouts
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
    catalog.register(DescriptorType.LIVE_LABEL, liveLabelFactory);
    catalog.register(DescriptorType.ENUM, enumFactory);
    catalog.register(DescriptorType.TEXT_SLIDER, (descriptor, context) =>
      textSliderWidgetFactory(descriptor, context, createRow, formatNumber, normalizeDecimalString)
    );
    catalog.register(DescriptorType.VECTOR, vectorFactory);
    catalog.register(DescriptorType.CONTAINER, containerFactory);
    return catalog;
  }
}

/**
 * Layout container factory - arranges child descriptors in a row or column.
 * Containers do not introduce new DOM structure outside the standard
 * label/value row; instead, they render a flex container in the value cell
 * and delegate rendering of children back to the WidgetCatalog.
 *
 * The container's label is optional: if the descriptor's label is the same
 * as its auto-generated key, it is treated as "no label" and the left label
 * cell is left blank.
 */
function containerFactory(descriptor, context) {
  // Use an empty label when it was not explicitly provided
  const effectiveLabel =
    descriptor.label && descriptor.label !== descriptor.key ? descriptor.label : '';

  const wrapper = createRow({
    ...descriptor,
    label: effectiveLabel
  });

  const container = document.createElement('div');
  container.className = 'inspector-container';
  container.style.display = 'flex';
  const direction = descriptor.direction === 'row' ? 'row' : 'column';
  container.style.flexDirection = direction;
  container.style.gap = '8px';
  // IMPORTANT: Column containers should stretch children horizontally.
  // If we center them, nested `.sg-prop-row` elements can become shrink-to-fit,
  // and the `.sg-prop-value` flex cell can collapse to ~0px (making inputs
  // appear blank / not retain typed text).
  container.style.alignItems = 'stretch';
  if (direction === 'row') {
    container.style.width = '100%';
    const justify =
      descriptor.justify === 'flex-end' ||
      descriptor.justify === 'center' ||
      descriptor.justify === 'space-between'
        ? descriptor.justify
        : 'flex-start';
    container.style.justifyContent = justify;
  }
  if (direction === 'row') {
    // Prefer keeping row layouts on a single line; children will shrink.
    // (Wrapping tends to turn "two per row" layouts into a long column.)
    container.style.flexWrap = 'nowrap';
  }

  const widgetCatalog = context.widgetCatalog || WidgetCatalog.createDefault();
  const items = Array.isArray(descriptor.items) ? descriptor.items : [];
  for (const child of items) {
    const childElement = widgetCatalog.create(child, context);
    if (direction === 'row') {
      // Make nested rows behave like "form fields" rather than full-width blocks.
      childElement.style.flex = '1 1 0';
      childElement.style.minWidth = '0';
      // If this is a standard inspector row, shrink its label column so that
      // two items can fit in a single line within dialogs.
      const labelEl = childElement.querySelector('.sg-prop-label');
      if (labelEl) {
        labelEl.style.flex = '0 0 80px';
      }
      const valueEl = childElement.querySelector('.sg-prop-value');
      if (valueEl) {
        valueEl.style.minWidth = '0';
      }
    }
    container.appendChild(childElement);
  }

  // Optional "group box" styling (Swing-like titled border).
  // This simulates:
  //   new CompoundBorder(new EmptyBorder(5,5,5,5),
  //     BorderFactory.createTitledBorder(BorderFactory.createEtchedBorder(), "Groups"))
  const wantsBorder = Boolean(descriptor.border) || Boolean(descriptor.containerLabel);
  if (wantsBorder) {
    const group = document.createElement('div');
    group.className = 'inspector-container-group';
    // Styling is provided by InspectorStylesheetManager (dark theme) and can be
    // overridden by page-level CSS in standalone tests.

    const title = (descriptor.containerLabel ?? '').trim();
    if (title) {
      const legend = document.createElement('div');
      legend.className = 'inspector-container-group__label';
      legend.textContent = title;
      group.appendChild(legend);
      group.classList.add('inspector-container-group--titled');
    }

    group.appendChild(container);
    wrapper.value.appendChild(group);
  } else {
    wrapper.value.appendChild(container);
  }
  return wrapper.root;
}

function numericInputFactory(inputType, overrides = {}) {
  return (descriptor) => {
    const wrapper = createRow(descriptor);
    const input = document.createElement('input');
    // Respect the requested input type (WidgetCatalog registers INT/FLOAT with 'number').
    // This also makes min/max/step work as expected.
    input.type = inputType || 'text';
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
  // Buttons generally don't need a separate left-hand label because the button
  // caption already communicates the action ("Cancel", "Export", ...).
  // If a label is desired, callers can add a DescriptorType.LABEL above it.
  const wrapper = createRow({
    ...descriptor,
    label: ''
  });
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sg-button';
  if (descriptor.variant === 'secondary') {
    button.classList.add('sg-button--secondary');
  } else if (descriptor.variant === 'primary') {
    button.classList.add('sg-button--primary');
  }
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

function liveLabelFactory(descriptor, context) {
  const wrapper = createRow(descriptor);
  const span = document.createElement('span');
  wrapper.value.appendChild(span);

  let lastText = null;
  const readText = () => {
    try {
      return descriptor.getValue?.() ?? '';
    } catch (e) {
      // Avoid throwing from a polling loop; show a stable fallback.
      return '';
    }
  };

  const update = () => {
    const nextText = String(readText());
    if (nextText !== lastText) {
      span.textContent = nextText;
      lastText = nextText;
    }
  };

  update();

  const intervalMs =
    typeof descriptor.updateIntervalMs === 'number' && descriptor.updateIntervalMs > 0
      ? descriptor.updateIntervalMs
      : 200;
  const intervalId = setInterval(update, intervalMs);

  if (context?.registerCleanup) {
    context.registerCleanup(() => clearInterval(intervalId));
  }

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
  // IMPORTANT: allow an explicitly empty label ('') to mean "no label".
  // Do not fall back to the auto-generated key in that case.
  const labelText = descriptor.label !== undefined ? descriptor.label : descriptor.key;
  label.textContent = labelText ?? '';
  if (label.textContent === '') {
    // Remove label from layout entirely so the value cell can use full width.
    label.style.display = 'none';
  }
  if (descriptor.description && label.textContent !== '') {
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

