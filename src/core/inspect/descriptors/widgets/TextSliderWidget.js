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
 * @typedef {import('../DescriptorTypes.js').TextSliderDescriptor} TextSliderDescriptor
 * @typedef {import('../WidgetCatalog.js').WidgetContext} WidgetContext
 */

/**
 * Full TextSlider widget factory.
 *
 * Renders:
 * - optional min/max buttons
 * - a range slider (when bounds available)
 * - a numeric text field
 *
 * Keeps itself synced with external model changes by polling descriptor.getValue()
 * (and optional min/max functions) on an interval.
 *
 * @param {TextSliderDescriptor} descriptor
 * @param {WidgetContext} context
 * @param {(descriptor: any) => { root: HTMLElement, value: HTMLElement }} createRow
 * @param {(value: any, fractionDigits?: number) => string} formatNumber
 * @param {(value: any) => string} normalizeDecimalString
 * @returns {HTMLElement}
 */
export function textSliderWidgetFactory(descriptor, context, createRow, formatNumber, normalizeDecimalString) {
  const wrapper = createRow(descriptor);

  const fractionDigits = descriptor.fractionDigits ?? 4;
  const scale = descriptor.scale === 'log' ? 'log' : 'linear';

  const readNumber = (fn, fallback) => {
    try {
      const value = typeof fn === 'function' ? fn() : fn;
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    } catch {
      return fallback;
    }
  };

  // ---------------------------------------------------------------------------
  // Java parity notes:
  // - TextSlider stores mutable min/max internally (and can expand/shrink them).
  // - Typing a value outside the range expands the range to include it.
  // - The "min"/"max" buttons set the min/max to the current value (not to bounds).
  //
  // In this descriptor-based port, `descriptor.min/max` are treated as initial
  // bounds, but the widget maintains its own internal min/max thereafter.
  // If the descriptor supplies min/max as functions (dynamic bounds), we will
  // adopt changes *only if the user hasn't manually adjusted that bound*.
  // ---------------------------------------------------------------------------

  let internalMin = readNumber(descriptor.min, 0);
  let internalMax = readNumber(descriptor.max, Number.NaN);
  if (!Number.isFinite(internalMax)) {
    internalMax = internalMin + 1;
  }

  let lastPolledMin = internalMin;
  let lastPolledMax = internalMax;
  let minTouched = false;
  let maxTouched = false;

  const getBounds = () => {
    const current = readNumber(descriptor.getValue, 0);
    let min = internalMin;
    let max = internalMax;

    // Ensure ordering
    if (max < min) {
      const tmp = max;
      max = min;
      min = tmp;
    }

    const hasSlider = Number.isFinite(min) && Number.isFinite(max) && max > min;
    return { hasSlider, min, max, current };
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const roundToStep = (value, step) => {
    if (!Number.isFinite(step) || step <= 0) return value;
    return Math.round(value / step) * step;
  };

  const sliderSteps = 1000; // internal resolution for smooth scrubbing

  const valueToSlider = (value, min, max) => {
    const v = clamp(value, min, max);
    if (scale === 'log' && min > 0 && max > 0) {
      const lo = Math.log(min);
      const hi = Math.log(max);
      const t = hi === lo ? 0 : (Math.log(v) - lo) / (hi - lo);
      return Math.round(clamp(t, 0, 1) * sliderSteps);
    }
    const t = max === min ? 0 : (v - min) / (max - min);
    return Math.round(clamp(t, 0, 1) * sliderSteps);
  };

  const sliderToValue = (sliderValue, min, max) => {
    const t = clamp(Number(sliderValue) / sliderSteps, 0, 1);
    if (scale === 'log' && min > 0 && max > 0) {
      const lo = Math.log(min);
      const hi = Math.log(max);
      return Math.exp(lo + t * (hi - lo));
    }
    return min + t * (max - min);
  };

  const root = document.createElement('div');
  root.className = 'inspector-text-slider';
  root.style.display = 'flex';
  root.style.alignItems = 'center';
  root.style.gap = '8px';
  root.style.width = '100%';

  const minButton = document.createElement('button');
  minButton.type = 'button';
  minButton.className = 'sg-button sg-button--secondary inspector-text-slider__bound';
  minButton.textContent = 'min';

  const maxButton = document.createElement('button');
  maxButton.type = 'button';
  maxButton.className = 'sg-button sg-button--secondary inspector-text-slider__bound';
  maxButton.textContent = 'max';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'inspector-text-slider__range';
  slider.min = '0';
  slider.max = String(sliderSteps);
  slider.step = '1';
  slider.style.flex = '1 1 auto';
  slider.style.minWidth = '0';

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.className = 'inspector-input inspector-input--number inspector-text-slider__input';
  input.style.width = '6rem';

  const disabled = descriptor.readonly || descriptor.disabled || !descriptor.setValue;
  input.disabled = disabled;
  slider.disabled = disabled;
  minButton.disabled = disabled;
  maxButton.disabled = disabled;

  let isDragging = false;
  let isEditing = false;
  let committedText = null;

  const applyValueToUI = (value, bounds) => {
    if (!isEditing) {
      input.value = formatNumber(value, fractionDigits);
    }
    if (bounds.hasSlider && !isDragging) {
      slider.value = String(valueToSlider(value, bounds.min, bounds.max));
    }
  };

  const setValueClamped = (rawValue, bounds) => {
    if (!descriptor.setValue) return;
    const step = Number(descriptor.step);
    const clamped = clamp(rawValue, bounds.min, bounds.max);
    const stepped = roundToStep(clamped, step);
    descriptor.setValue(stepped);
    return stepped;
  };

  // Build initial UI
  const initial = getBounds();
  input.value = formatNumber(initial.current, fractionDigits);
  committedText = input.value;

  const showMinMaxButtons = Boolean(descriptor.showMinMaxButtons);
  if (showMinMaxButtons) root.appendChild(minButton);
  if (initial.hasSlider) root.appendChild(slider);
  root.appendChild(input);
  if (showMinMaxButtons) root.appendChild(maxButton);

  if (!initial.hasSlider) {
    // If we don't have bounds, keep the slider hidden; the text field still works.
    slider.style.display = 'none';
  } else {
    slider.value = String(valueToSlider(initial.current, initial.min, initial.max));
  }

  // Events: slider → value
  slider.addEventListener('pointerdown', () => {
    isDragging = true;
  });
  slider.addEventListener('pointerup', () => {
    isDragging = false;
  });
  slider.addEventListener('change', () => {
    isDragging = false;
  });

  slider.addEventListener('input', () => {
    if (!descriptor.setValue) return;
    const bounds = getBounds();
    if (!bounds.hasSlider) return;
    const next = sliderToValue(slider.value, bounds.min, bounds.max);
    const applied = setValueClamped(next, bounds);
    if (typeof applied === 'number') {
      applyValueToUI(applied, bounds);
    }
  });

  // Events: text → value
  input.addEventListener('focus', () => {
    isEditing = true;
  });
  input.addEventListener('blur', () => {
    isEditing = false;
    // Reset caret coloring on blur if user abandons edit.
    input.style.color = '';
  });

  // Java caret listener: mark red when edited but not committed.
  input.addEventListener('input', () => {
    if (committedText === null) committedText = input.value;
    const normalized = input.value.replace(/,/g, '.');
    const normalizedCommitted = String(committedText).replace(/,/g, '.');
    if (normalized !== normalizedCommitted) {
      input.style.color = 'red';
    } else {
      input.style.color = '';
    }
  });

  input.addEventListener('change', () => {
    if (!descriptor.setValue) return;
    const normalized = normalizeDecimalString(input.value);
    const parsed = parseFloat(normalized);
    if (Number.isNaN(parsed)) {
      const bounds = getBounds();
      applyValueToUI(bounds.current, bounds);
      return;
    }

    // Java behavior: if typed value is outside bounds, expand bounds first.
    if (parsed < internalMin) {
      internalMin = parsed;
      minTouched = true;
    }
    if (parsed > internalMax) {
      internalMax = parsed;
      maxTouched = true;
    }

    const bounds = getBounds();
    // Do NOT clamp typed values (Java expands bounds instead of clamping).
    const step = Number(descriptor.step);
    const stepped = roundToStep(parsed, step);
    descriptor.setValue(stepped);
    committedText = formatNumber(stepped, fractionDigits);
    input.style.color = '';
    applyValueToUI(stepped, bounds);
  });

  // Min/max buttons
  minButton.addEventListener('click', () => {
    if (!descriptor.setValue) return;
    const bounds = getBounds();
    // Java: setMin(getValue()) (i.e., min becomes current value)
    internalMin = bounds.current;
    minTouched = true;
    if (internalMin > internalMax) {
      internalMax = internalMin;
      maxTouched = true;
    }
    applyValueToUI(bounds.current, getBounds());
  });

  maxButton.addEventListener('click', () => {
    if (!descriptor.setValue) return;
    const bounds = getBounds();
    // Java: setMax(getValue()) (i.e., max becomes current value)
    internalMax = bounds.current;
    maxTouched = true;
    if (internalMax < internalMin) {
      internalMin = internalMax;
      minTouched = true;
    }
    applyValueToUI(bounds.current, getBounds());
  });

  // Poll for external updates (playback, programmatic changes)
  const intervalMs =
    typeof descriptor.updateIntervalMs === 'number' && descriptor.updateIntervalMs > 0
      ? descriptor.updateIntervalMs
      : 200;

  let lastSignature = null;
  const poll = () => {
    // If descriptor provides dynamic bounds, adopt them unless the user has
    // manually adjusted that bound (Java allows programmatic setMin/setMax too).
    const polledMin = readNumber(descriptor.min, internalMin);
    const polledMax = readNumber(descriptor.max, internalMax);

    if (typeof descriptor.min === 'function' && polledMin !== lastPolledMin) {
      if (!minTouched || internalMin === lastPolledMin) {
        internalMin = polledMin;
      }
      lastPolledMin = polledMin;
    }
    if (typeof descriptor.max === 'function' && polledMax !== lastPolledMax) {
      if (!maxTouched || internalMax === lastPolledMax) {
        internalMax = polledMax;
      }
      lastPolledMax = polledMax;
    }

    const b = getBounds();
    const signature = `${b.hasSlider}|${b.min}|${b.max}|${b.current}`;
    if (signature === lastSignature) return;
    lastSignature = signature;

    // (Re)show slider if bounds become available later.
    if (b.hasSlider) {
      slider.style.display = '';
      if (!root.contains(slider)) {
        // Insert slider before input (and after min button if present)
        const inputIndex = Array.from(root.children).indexOf(input);
        root.insertBefore(slider, root.children[inputIndex] || input);
      }
    } else {
      slider.style.display = 'none';
    }

    applyValueToUI(b.current, b);
  };

  poll();
  const intervalId = setInterval(poll, intervalMs);
  context?.registerCleanup?.(() => clearInterval(intervalId));

  wrapper.value.appendChild(root);
  return wrapper.root;
}

