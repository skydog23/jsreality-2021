/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * Descriptor type definitions for inspector widgets.
 *
 * These descriptors do not interact with the DOM directly. They describe
 * what should be rendered (type, value accessors, metadata) so that a renderer
 * can build UI using a widget catalog.
 */

export const DescriptorType = Object.freeze({
  FLOAT: 'float',
  INT: 'int',
  VECTOR: 'vector',
  COLOR: 'color',
  TOGGLE: 'toggle',
  ENUM: 'enum',
  /**
   * Placeholder for a combined "text + slider" numeric widget.
   * Phase 1: rendered as a numeric text field.
   * Phase 2: rendered as slider + text input (and optional min/max buttons).
   */
  TEXT_SLIDER: 'text_slider',
  TEXT: 'text',
  BUTTON: 'button',
  LABEL: 'label',
  /**
   * Like LABEL, but the renderer keeps the displayed text in sync by polling
   * `getValue()` (without re-rendering the whole descriptor group).
   */
  LIVE_LABEL: 'live_label',
  /**
   * Layout-only container for nested descriptors.
   * Renderers can use this to arrange child descriptors in rows/columns.
   */
  CONTAINER: 'container',
  /**
   * Composite widget for editing a 4x4 homogeneous matrix through its
   * FactoredMatrix decomposition (Translation, Rotation angle+axis, Scale).
   * The widget manages decomposition/recomposition internally; callers
   * supply only getValue/setValue for the raw 16-element matrix array and
   * a metric (static or dynamic).
   */
  MATRIX: 'matrix',
  /**
   * Wraps another descriptor to add appearance-attribute "inherited" semantics.
   * When the attribute value is INHERITED, the widget shows an "Inherited" button
   * that sets a default value. When explicit, the inner descriptor's widget is
   * shown alongside a "Clear" button that resets to INHERITED.
   */
  INHERITABLE: 'inheritable'
});

/**
 * @typedef {Object} DescriptorCommon
 * @property {string} [key] - Optional stable identifier (auto-generated if missing)
 * @property {string} type - DescriptorType enum value
 * @property {string} [label] - Display label
 * @property {string} [description] - Optional helper text/tooltip
 * @property {boolean} [readonly=false]
 * @property {boolean} [disabled=false]
 * @property {boolean} [hidden=false]
 */

/**
 * @typedef {DescriptorCommon & {
 *   getValue: () => any,
 *   setValue?: (value: any) => void,
 *   min?: number,
 *   max?: number,
 *   step?: number
 * }} NumericDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   getValue: () => string,
 *   setValue?: (value: string) => void
 * }} TextDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   type: typeof DescriptorType.COLOR,
 *   getValue: () => { hex: string, alpha: number },
 *   setValue?: (value: { hex: string, alpha: number }) => void
 * }} ColorDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   type: typeof DescriptorType.LIVE_LABEL,
 *   getValue: () => string,
 *   // Poll interval for updating the label text (ms). Defaults to 200ms.
 *   // Set to 0 to disable polling.
 *   updateIntervalMs?: number
 * }} LiveLabelDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   options: Array<{ value: string|number, label: string }>,
 *   getValue: () => string|number,
 *   setValue?: (value: string|number) => void
 * }} EnumDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   type: typeof DescriptorType.TEXT_SLIDER,
 *   getValue: () => number,
 *   setValue?: (value: number) => void,
 *   // Bounds can be static numbers or computed lazily.
 *   // (Useful for animation time sliders where tmax depends on keyframes.)
 *   min?: number | (() => number),
 *   max?: number | (() => number),
 *   step?: number,
 *   // For future UI: log vs linear slider mapping.
 *   scale?: 'linear' | 'log',
 *   // For future UI: show min/max buttons like Java TextSlider.
 *   showMinMaxButtons?: boolean,
 *   // For future UI: decimal formatting control.
 *   fractionDigits?: number,
 *   // Optional polling interval (ms) for keeping UI in sync with external updates.
 *   // Defaults to 200ms when omitted. Set to 0 to disable polling.
 *   updateIntervalMs?: number
 * }} TextSliderDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   action: () => void,
 *   // Optional icon URL for image-only or image+text buttons.
 *   iconSrc?: string,
 *   // Optional alt text for the icon (defaults to label).
 *   iconAlt?: string,
 *   // Optional visual hint for rendering this as primary/secondary action.
 *   variant?: 'primary' | 'secondary' | 'default'
 * }} ButtonDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   items: InspectorDescriptor[]
 * }} DescriptorGroup
 */

/**
 * @typedef {DescriptorCommon & {
 *   type: typeof DescriptorType.CONTAINER,
 *   // Layout direction for child descriptors. 'column' stacks children
 *   // vertically, 'row' arranges them horizontally. Defaults to 'column'
 *   // when not specified.
 *   direction?: 'row' | 'column',
 *   // Optional visual grouping for this container.
 *   // When enabled, the renderer should draw a border around the container.
 *   // This is intended to simulate Swing's titled borders/group boxes.
 *   border?: boolean,
 *   // Optional label to render on the container's border (like Swing's TitledBorder title).
 *   // If set, renderers should display it even if `label` is empty (the left label cell).
 *   containerLabel?: string,
 *   // Optional flexbox justify-content setting for the children.
 *   justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between',
 *   // Child descriptors contained within this layout node.
 *   items: InspectorDescriptor[]
 * }} ContainerDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   type: typeof DescriptorType.MATRIX,
 *   getValue: () => number[],
 *   setValue?: (matrix: number[]) => void,
 *   // Metric constant (Pn.EUCLIDEAN etc.) or a getter for dynamic metric.
 *   // When PROJECTIVE, the widget shows a raw 4x4 grid instead of T-R-S decomposition.
 *   metric?: number | (() => number),
 *   // Optional titled border around the widget (same convention as ContainerDescriptor).
 *   border?: boolean,
 *   containerLabel?: string
 * }} MatrixDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   type: typeof DescriptorType.INHERITABLE,
 *   // The attribute key in the Appearance (e.g. 'polygonShader.diffuseColor').
 *   attributeKey: string,
 *   // The Appearance instance that owns this attribute.
 *   appearance: import('../../scene/Appearance.js').Appearance,
 *   // The shader schema object (e.g. DefaultPolygonShader) for default-value lookup.
 *   schema: Object,
 *   // Factory that returns the inner descriptor for the *current* explicit value.
 *   // Called each time the widget needs to (re-)render the value editor.
 *   innerDescriptorFactory: () => InspectorDescriptor,
 *   // Called after toggling between inherited and explicit so the panel can rebuild.
 *   onToggle?: () => void
 * }} InheritableDescriptor
 */

/**
 * @typedef {NumericDescriptor | TextDescriptor | EnumDescriptor | TextSliderDescriptor | ButtonDescriptor | LiveLabelDescriptor | ContainerDescriptor | MatrixDescriptor | InheritableDescriptor | DescriptorCommon} InspectorDescriptor
 */

/**
 * Create a normalized descriptor with sensible defaults. This enables callers
 * to omit optional metadata without worrying about downstream consumers.
 *
 * @param {InspectorDescriptor} descriptor
 * @returns {InspectorDescriptor}
 */
export function normalizeDescriptor(descriptor) {
  if (!descriptor || typeof descriptor !== 'object') {
    throw new Error('normalizeDescriptor requires a descriptor object');
  }
  if (!descriptor.type) {
    console.error('Descriptor is missing type', descriptor);
    throw new Error(`Descriptor is missing type`);
  }
  
  // Auto-generate key if missing
  if (typeof normalizeDescriptor.__jsrCounter !== 'number') {
    normalizeDescriptor.__jsrCounter = 0;
  }
  const key = descriptor.key || `descriptor-${++normalizeDescriptor.__jsrCounter}`;
  
  const normalized = {
    key,
    label: descriptor.label ?? key,
    description: descriptor.description ?? '',
    readonly: Boolean(descriptor.readonly),
    disabled: Boolean(descriptor.disabled),
    hidden: Boolean(descriptor.hidden),
    ...descriptor
  };
  return normalized;
}

/**
 * Normalize a descriptor group definition.
 *
 * @param {DescriptorGroup} group
 * @returns {DescriptorGroup}
 */
export function normalizeGroup(group) {
  if (!group || typeof group !== 'object') {
    throw new Error('normalizeGroup requires a group definition');
  }
  if (!Array.isArray(group.items)) {
    throw new Error(`Descriptor group is missing items array`);
  }
  const items = group.items.map((item) => normalizeDescriptor(item));
  
  // Auto-generate key if missing
  if (typeof normalizeGroup.__jsrCounter !== 'number') {
    normalizeGroup.__jsrCounter = 0;
  }
  const key = group.key || `group-${++normalizeGroup.__jsrCounter}`;
  
  return {
    key,
    title: group.title !== undefined && group.title !== null ? group.title : key,
    items
  };
}

