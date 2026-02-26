/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * Widget factory for the MATRIX descriptor type.
 *
 * Decomposes a 4x4 homogeneous matrix into Translation, Rotation (angle + axis),
 * and Scale via FactoredMatrix, and renders editable sub-fields.  Supports
 * non-destructive in-place refresh via context.registerRefresh().
 *
 * When the metric is PROJECTIVE the decomposition is not meaningful, so the
 * widget falls back to displaying the raw 4x4 matrix grid.
 *
 * @typedef {import('../DescriptorTypes.js').MatrixDescriptor} MatrixDescriptor
 * @typedef {import('../WidgetCatalog.js').WidgetContext} WidgetContext
 */

import { FactoredMatrix } from '../../../math/FactoredMatrix.js';
import * as Pn from '../../../math/Pn.js';
import * as Rn from '../../../math/Rn.js';

const EPS = 1e-8;
const DEFAULT_AXIS = [0, 0, 1];

const METRIC_LABELS = {
  [Pn.EUCLIDEAN]: 'Euclidean',
  [Pn.ELLIPTIC]: 'Elliptic',
  [Pn.HYPERBOLIC]: 'Hyperbolic',
  [Pn.PROJECTIVE]: 'Projective'
};

function fmt(v, digits = 4) {
  const n = Number(v ?? 0);
  return Number.isNaN(n) ? '0' : n.toFixed(digits);
}

function normalizeAxis(axis) {
  const [x = 0, y = 0, z = 0] = axis || [];
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len < EPS) return null;
  return [x / len, y / len, z / len];
}

/**
 * @param {MatrixDescriptor} descriptor
 * @param {WidgetContext} context
 * @param {(descriptor: any) => {root: HTMLElement, value: HTMLElement}} createRow
 * @param {(value: any, fractionDigits?: number) => string} formatNumber
 * @param {(value: any) => string} normalizeDecimalString
 * @returns {HTMLElement}
 */
export function matrixWidgetFactory(descriptor, context, createRow, formatNumber, normalizeDecimalString) {
  const wrapper = createRow(descriptor);

  const resolveMetric = () => {
    const raw = descriptor.metric;
    const m = typeof raw === 'function' ? raw() : raw;
    return (typeof m === 'number') ? m : Pn.EUCLIDEAN;
  };

  const metric = resolveMetric();
  const isProjective = metric === Pn.PROJECTIVE;

  // ── Outer container ──────────────────────────────────────────────────

  const container = document.createElement('div');
  container.className = 'inspector-matrix-widget';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '4px';

  // ── Metric row (read-only) ───────────────────────────────────────────

  const metricRow = document.createElement('div');
  metricRow.className = 'sg-prop-row';
  const metricLabel = document.createElement('label');
  metricLabel.className = 'sg-prop-label';
  metricLabel.textContent = 'Metric';
  metricRow.appendChild(metricLabel);
  const metricValue = document.createElement('div');
  metricValue.className = 'sg-prop-value';
  const metricSpan = document.createElement('span');
  metricSpan.className = 'sg-label-text';
  metricSpan.textContent = METRIC_LABELS[metric] ?? `Unknown (${metric})`;
  metricValue.appendChild(metricSpan);
  metricRow.appendChild(metricValue);
  container.appendChild(metricRow);

  // ── Mode-specific content ────────────────────────────────────────────

  /** @type {() => void} */
  let refresh;

  if (isProjective) {
    const result = buildRawMatrixView(descriptor, container, normalizeDecimalString);
    refresh = result.refresh;
  } else {
    const result = buildFactoredView(descriptor, container, resolveMetric, normalizeDecimalString);
    refresh = result.refresh;
  }

  // ── Bordered container (optional) ────────────────────────────────────

  const wantsBorder = Boolean(descriptor.border) || Boolean(descriptor.containerLabel);
  if (wantsBorder) {
    const group = document.createElement('div');
    group.className = 'inspector-container-group';
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

  // ── In-place refresh ─────────────────────────────────────────────────

  const fullRefresh = () => {
    const currentMetric = resolveMetric();
    metricSpan.textContent = METRIC_LABELS[currentMetric] ?? `Unknown (${currentMetric})`;
    refresh();
  };

  if (typeof context.registerRefresh === 'function') {
    context.registerRefresh(fullRefresh);
  }

  return wrapper.root;
}

// ════════════════════════════════════════════════════════════════════════
// Factored (T-R-S) view  --  Euclidean / Elliptic / Hyperbolic
// ════════════════════════════════════════════════════════════════════════

function buildFactoredView(descriptor, container, resolveMetric, normalizeDecimalString) {
  let preferredAxis = [...DEFAULT_AXIS];

  const decompose = () => {
    const raw = descriptor.getValue?.() ?? Rn.identityMatrix(4);
    return new FactoredMatrix(raw, resolveMetric());
  };

  const recompose = (fm) => {
    if (descriptor.setValue) {
      descriptor.setValue(fm.getArray().slice());
    }
  };

  const makeVectorRow = (labelText, getVec, setVec) => {
    const row = document.createElement('div');
    row.className = 'sg-prop-row';
    const lbl = document.createElement('label');
    lbl.className = 'sg-prop-label';
    lbl.textContent = labelText;
    row.appendChild(lbl);

    const valueDiv = document.createElement('div');
    valueDiv.className = 'sg-prop-value';
    const box = document.createElement('div');
    box.style.display = 'flex';
    box.style.gap = '6px';
    box.style.alignItems = 'center';

    const initial = getVec();
    const inputs = initial.map((val, idx) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.value = fmt(val);
      input.style.width = '4rem';
      input.className = 'sg-number-widget-input';
      input.disabled = descriptor.readonly || descriptor.disabled || !descriptor.setValue;
      input.addEventListener('change', () => {
        if (!descriptor.setValue) return;
        const cur = getVec();
        const norm = normalizeDecimalString(input.value);
        const parsed = parseFloat(norm);
        if (Number.isNaN(parsed)) {
          input.value = fmt(cur[idx]);
          return;
        }
        cur[idx] = parsed;
        setVec(cur);
      });
      box.appendChild(input);
      return input;
    });

    valueDiv.appendChild(box);
    row.appendChild(valueDiv);
    return { row, inputs };
  };

  const makeScalarRow = (labelText, getVal, setVal, opts = {}) => {
    const row = document.createElement('div');
    row.className = 'sg-prop-row';
    const lbl = document.createElement('label');
    lbl.className = 'sg-prop-label';
    lbl.textContent = labelText;
    row.appendChild(lbl);

    const valueDiv = document.createElement('div');
    valueDiv.className = 'sg-prop-value';
    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'decimal';
    input.className = 'inspector-input inspector-input--number';
    input.value = fmt(getVal(), opts.digits ?? 4);
    if (opts.min !== undefined) input.min = opts.min;
    if (opts.max !== undefined) input.max = opts.max;
    if (opts.step !== undefined) input.step = opts.step;
    input.disabled = descriptor.readonly || descriptor.disabled || !descriptor.setValue;
    input.addEventListener('change', () => {
      if (!descriptor.setValue) return;
      const norm = normalizeDecimalString(input.value);
      const parsed = parseFloat(norm);
      if (Number.isNaN(parsed)) {
        input.value = fmt(getVal(), opts.digits ?? 4);
        return;
      }
      setVal(parsed);
    });
    valueDiv.appendChild(input);
    row.appendChild(valueDiv);
    return { row, input };
  };

  // --- Translation (Position) ---
  const translationField = makeVectorRow('Position', () => {
    const fm = decompose();
    const t = fm.getTranslation();
    return [t[0], t[1], t[2]];
  }, (vec) => {
    const fm = decompose();
    fm.setTranslation(vec[0], vec[1], vec[2]);
    recompose(fm);
  });
  container.appendChild(translationField.row);

  // --- Rotation Angle ---
  const angleField = makeScalarRow('Rot. Angle', () => {
    const fm = decompose();
    return (fm.getRotationAngle() * 180) / Math.PI;
  }, (degrees) => {
    const radians = degrees * Math.PI / 180;
    const fm = decompose();
    let axis = fm.getRotationAxis();
    const normalized = normalizeAxis(axis);
    if (!normalized) {
      axis = preferredAxis;
    } else {
      preferredAxis = [...normalized];
    }
    fm.setRotation(radians, axis);
    recompose(fm);
  }, { min: -360, max: 360, step: 1 });
  container.appendChild(angleField.row);

  // --- Rotation Axis ---
  const axisField = makeVectorRow('Rot. Axis', () => {
    const fm = decompose();
    return normalizeAxis(fm.getRotationAxis()) || [...preferredAxis];
  }, (axis) => {
    const norm = normalizeAxis(axis) || [...DEFAULT_AXIS];
    preferredAxis = norm;
    const fm = decompose();
    const angle = fm.getRotationAngle();
    if (Math.abs(angle) < EPS) return;
    fm.setRotation(angle, norm);
    recompose(fm);
  });
  container.appendChild(axisField.row);

  // --- Scale ---
  const scaleField = makeVectorRow('Scale', () => {
    const fm = decompose();
    const s = fm.getStretch();
    return [s[0], s[1], s[2]];
  }, (scale) => {
    const fm = decompose();
    fm.setStretchComponents(scale[0], scale[1], scale[2]);
    recompose(fm);
  });
  container.appendChild(scaleField.row);

  const refresh = () => {
    const fm = decompose();
    const t = fm.getTranslation();
    translationField.inputs[0].value = fmt(t[0]);
    translationField.inputs[1].value = fmt(t[1]);
    translationField.inputs[2].value = fmt(t[2]);

    angleField.input.value = fmt((fm.getRotationAngle() * 180) / Math.PI);

    const axis = normalizeAxis(fm.getRotationAxis()) || preferredAxis;
    axisField.inputs[0].value = fmt(axis[0]);
    axisField.inputs[1].value = fmt(axis[1]);
    axisField.inputs[2].value = fmt(axis[2]);

    const s = fm.getStretch();
    scaleField.inputs[0].value = fmt(s[0]);
    scaleField.inputs[1].value = fmt(s[1]);
    scaleField.inputs[2].value = fmt(s[2]);
  };

  return { refresh };
}

// ════════════════════════════════════════════════════════════════════════
// Raw 4x4 matrix view  --  Projective metric
// ════════════════════════════════════════════════════════════════════════

function buildRawMatrixView(descriptor, container, normalizeDecimalString) {
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  grid.style.gap = '4px';

  /** @type {HTMLInputElement[]} */
  const cells = [];

  for (let i = 0; i < 16; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = 'sg-number-widget-input';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.disabled = descriptor.readonly || descriptor.disabled || !descriptor.setValue;

    const idx = i;
    input.addEventListener('change', () => {
      if (!descriptor.setValue) return;
      const raw = descriptor.getValue?.() ?? Rn.identityMatrix(4);
      const norm = normalizeDecimalString(input.value);
      const parsed = parseFloat(norm);
      if (Number.isNaN(parsed)) {
        input.value = fmt(raw[idx]);
        return;
      }
      raw[idx] = parsed;
      descriptor.setValue(raw);
    });

    cells.push(input);
    grid.appendChild(input);
  }

  const readMatrix = () => descriptor.getValue?.() ?? Rn.identityMatrix(4);

  const syncCells = (m) => {
    for (let i = 0; i < 16; i++) {
      cells[i].value = fmt(m[i]);
    }
  };

  syncCells(readMatrix());
  container.appendChild(grid);

  const refresh = () => syncCells(readMatrix());

  return { refresh };
}
