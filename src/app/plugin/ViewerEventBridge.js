/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { DisposableCollection } from '../../core/util/Disposable.js';

/**
 * ViewerEventBridge wires JSRViewer's internal event system to the plugin
 * EventBus. It listens for viewer-level events (content/camera/viewer changes)
 * and re-emits them as semantic plugin events.
 */
export class ViewerEventBridge {
  /** @type {JSRViewer} */
  #viewer;

  /** @type {import('./EventBus.js').EventBus} */
  #eventBus;

  /** @type {DisposableCollection} */
  #disposables = new DisposableCollection();

  /**
   * @param {import('../JSRViewer.js').JSRViewer} viewer
   * @param {import('./EventBus.js').EventBus} eventBus
   */
  constructor(viewer, eventBus) {
    this.#viewer = viewer;
    this.#eventBus = eventBus;
    this.#setup();
  }

  dispose() {
    this.#disposables.dispose();
  }

  #setup() {
    this.#forward('contentChanged', 'scene:changed', (payload = {}) => ({
      reason: payload.reason || 'contentChanged',
      content: payload.node || null,
      strategy: payload.strategy
    }));

    this.#forward('viewerChanged', 'viewer:changed', (payload = {}) => payload);
    this.#forward('cameraChanged', 'camera:changed', (payload = {}) => payload);
  }

  #forward(viewerEvent, pluginEvent, mapper = (value) => value) {
    const handler = (data) => {
      const payload = mapper(data || {});
      this.#eventBus.emit(pluginEvent, payload);
    };
    this.#viewer.on(viewerEvent, handler);
    this.#disposables.add(() => this.#viewer.off(viewerEvent, handler));
  }
}


