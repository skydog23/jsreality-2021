/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * DescriptorRenderer turns descriptor groups into DOM using a widget catalog.
 * This module is intentionally decoupled from SceneGraphInspector so it can
 * be unit-tested or embedded in custom panels independently.
 */

import { normalizeGroup } from './DescriptorTypes.js';
import { WidgetCatalog } from './WidgetCatalog.js';

export class DescriptorRenderer {
  /**
   * @param {HTMLElement} container
   * @param {{ widgetCatalog?: WidgetCatalog }} [options]
   */
  constructor(container, options = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new Error('DescriptorRenderer requires a container element');
    }
    this.#container = container;
    this.#widgetCatalog = options.widgetCatalog || WidgetCatalog.createDefault();
    this.#cleanupCallbacks = new Set();
  }

  /** @type {HTMLElement} */
  #container;

  /** @type {WidgetCatalog} */
  #widgetCatalog;

  /** @type {Set<Function>} */
  #cleanupCallbacks;

  /** @type {Set<Function>} */
  #refreshCallbacks = new Set();

  /**
   * Replace the renderer contents with the provided descriptor groups.
   * @param {import('./DescriptorTypes.js').DescriptorGroup[]} groups
   */
  render(groups) {
    this.#runCleanup();
    this.#refreshCallbacks.clear();
    this.#container.innerHTML = '';
    if (!Array.isArray(groups) || groups.length === 0) {
      return;
    }
    for (const group of groups) {
      this.#container.appendChild(this.#renderGroup(group));
    }
  }

  /**
   * In-place refresh: ask all widgets that support it to re-read their
   * getValue() and update their displayed values without rebuilding the DOM.
   * This is the lightweight alternative to render() for high-frequency
   * external updates (e.g. TransformationChanged during tool drag).
   */
  update() {
    for (const fn of this.#refreshCallbacks) {
      try { fn(); } catch (e) { /* widget refresh should not break others */ }
    }
  }

  /**
   * Register a cleanup callback that will be invoked prior to future renders.
   * @param {Function} callback
   */
  registerCleanup(callback) {
    if (typeof callback === 'function') {
      this.#cleanupCallbacks.add(callback);
    }
  }

  /**
   * Register a refresh callback for in-place widget updates.
   * Called by widget factories that support non-destructive value refresh.
   * @param {Function} callback
   */
  registerRefresh(callback) {
    if (typeof callback === 'function') {
      this.#refreshCallbacks.add(callback);
    }
  }

  /**
   * Destroy the renderer and release DOM references.
   */
  dispose() {
    this.#runCleanup();
    this.#cleanupCallbacks.clear();
    this.#refreshCallbacks.clear();
    this.#container.innerHTML = '';
  }

  #runCleanup() {
    for (const callback of this.#cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.warn('DescriptorRenderer cleanup callback threw', error);
      }
    }
    this.#cleanupCallbacks.clear();
  }

  #renderGroup(groupDef) {
    const group = normalizeGroup(groupDef);
    const section = document.createElement('div');
    section.className = 'sg-prop-group';
    section.dataset.groupKey = group.key;

    // Only create header if title is provided
    if (group.title) {
      const header = document.createElement('div');
      header.className = 'sg-prop-group-title';
      header.textContent = group.title;
      section.appendChild(header);
    }

    const body = document.createElement('div');
    body.className = 'sg-prop-group-body';
    section.appendChild(body);

    for (const descriptor of group.items) {
      const element = this.#widgetCatalog.create(descriptor, {
        registerCleanup: (callback) => this.registerCleanup(callback),
        registerRefresh: (callback) => this.registerRefresh(callback),
        widgetCatalog: this.#widgetCatalog
      });
      body.appendChild(element);
    }

    return section;
  }
}

