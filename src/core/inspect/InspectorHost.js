/**
 * InspectorHost - thin lifecycle wrapper around SceneGraphInspector.
 *
 * Keeps plugin code simple by centralising mounting, root updates, and disposal.
 */

import { SceneGraphInspector } from './SceneGraphInspector.js';

/**
 * @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent
 *
 * @typedef {Object} InspectorHostOptions
 * @property {HTMLElement} container
 * @property {SceneGraphComponent|null} [root]
 * @property {Function|null} [renderCallback]
 * @property {Object} [inspectorOptions]
 */

export class InspectorHost {
  /** @type {HTMLElement} */
  #container;

  /** @type {SceneGraphComponent|null} */
  #root;

  /** @type {SceneGraphInspector|null} */
  #inspector = null;

  /** @type {Function|null} */
  #renderCallback;

  /** @type {Object} */
  #inspectorOptions;

  /**
   * @param {InspectorHostOptions} options
   */
  constructor({ container, root = null, renderCallback = null, inspectorOptions = {} }) {
    if (!(container instanceof HTMLElement)) {
      throw new Error('InspectorHost requires a valid container element');
    }
    this.#container = container;
    this.#root = root;
    this.#renderCallback = renderCallback;
    this.#inspectorOptions = inspectorOptions;
  }

  /**
   * Lazily create and mount the inspector.
   * @returns {SceneGraphInspector}
   */
  mount() {
    if (!this.#inspector) {
      this.#inspector = new SceneGraphInspector(this.#container, this.#root, {
        onRender: this.#renderCallback,
        ...this.#inspectorOptions
      });
    }
    return this.#inspector;
  }

  /**
   * Get the underlying inspector instance (if mounted).
   * @returns {SceneGraphInspector|null}
   */
  getInspector() {
    return this.#inspector;
  }

  /**
   * Update the scene graph root (propagated if inspector already exists).
   * @param {SceneGraphComponent|null} root
   */
  setRoot(root) {
    this.#root = root;
    if (this.#inspector) {
      this.#inspector.setRoot(root);
    }
  }

  /**
   * Explicitly trigger a refresh if mounted.
   */
  refresh() {
    this.#inspector?.refresh();
  }

  /**
   * Clean up inspector UI and release references.
   */
  dispose() {
    if (this.#inspector?.dispose) {
      try {
        this.#inspector.dispose();
      } catch (error) {
        console.warn('InspectorHost.dispose: inspector threw during dispose()', error);
      }
    }
    this.#inspector = null;
    if (this.#container) {
      this.#container.innerHTML = '';
    }
  }
}

