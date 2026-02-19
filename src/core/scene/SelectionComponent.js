/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SceneGraphComponent } from './SceneGraphComponent.js';

/**
 * Port of `charlesgunn.jreality.SelectionComponent`.
 * Tracks one selected child and toggles visibility accordingly.
 */
export class SelectionComponent extends SceneGraphComponent {
  selectedChild = 0;

  getSelectedChild() {
    return this.selectedChild;
  }

  getSelectedChildAsSGC() {
    return this.getChildComponent(this.selectedChild);
  }

  setSelectedChild(sc) {
    const n = this.getChildComponentCount();
    if (n <= 0) {
      this.selectedChild = 0;
      return;
    }
    this.selectedChild = ((sc % n) + n) % n;
    for (let i = 0; i < n; i += 1) {
      const child = this.getChildComponent(i);
      if (child) child.setVisible(i === this.selectedChild);
    }
  }
}

