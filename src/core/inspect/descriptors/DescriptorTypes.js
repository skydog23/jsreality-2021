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
  TEXT: 'text',
  BUTTON: 'button',
  LABEL: 'label'
});

/**
 * @typedef {Object} DescriptorCommon
 * @property {string} id - Stable identifier
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
 *   options: Array<{ value: string|number, label: string }>,
 *   getValue: () => string|number,
 *   setValue?: (value: string|number) => void
 * }} EnumDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   action: () => void
 * }} ButtonDescriptor
 */

/**
 * @typedef {DescriptorCommon & {
 *   items: InspectorDescriptor[]
 * }} DescriptorGroup
 */

/**
 * @typedef {NumericDescriptor | TextDescriptor | EnumDescriptor | ButtonDescriptor | DescriptorCommon} InspectorDescriptor
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
  if (!descriptor.id) {
    throw new Error('Inspector descriptor is missing id');
  }
  if (!descriptor.type) {
    throw new Error(`Descriptor "${descriptor.id}" is missing type`);
  }
  const normalized = {
    label: descriptor.label ?? descriptor.id,
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
    throw new Error(`Descriptor group "${group.id || 'unknown'}" is missing items array`);
  }
  const items = group.items.map((item) => normalizeDescriptor(item));
  return {
    id: group.id || `group-${Math.random().toString(36).slice(2)}`,
    title: group.title || group.id || 'Properties',
    items
  };
}

