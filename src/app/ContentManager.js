/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * ContentManager - Manages content node in the scene graph with different strategies.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { SceneGraphComponent } from '../core/scene/SceneGraphComponent.js';
import { SceneGraphNode } from '../core/scene/SceneGraphNode.js';
import { Transformation } from '../core/scene/Transformation.js';
import { BoundingBoxUtility } from '../core/geometry/BoundingBoxUtility.js';
import { Rectangle3D } from '../core/util/Rectangle3D.js';
import { MatrixBuilder } from '../core/math/MatrixBuilder.js';
import { SceneGraphUtility } from '../core/util/SceneGraphUtility.js';
import { getLogger } from '../core/util/LoggingSystem.js';

const logger = getLogger('jsreality.app.ContentManager');

/**
 * ContentManager manages the content node in the scene graph with different strategies:
 * - 'direct': Direct content injection
 * - 'centeredAndScaled': Content with auto-centering/scaling
 * - 'terrainAligned': VR terrain alignment (not yet implemented)
 */
export class ContentManager {

  /** @type {SceneGraphComponent} */
  #contentRoot;

  /** @type {SceneGraphNode|null} */
  #contentNode = null;

  /** @type {string} */
  #strategy = 'direct';

  /** @type {Function[]} */
  #listeners = [];

  /** @type {number} */
  #size = 5.0;

  /** @type {number[]} */
  #center = [0, 0, 0];

  /** @type {number} */
  #objectSize = 1.0;

  /**
   * Create a new ContentManager.
   * @param {SceneGraphComponent} contentRoot - The root component where content will be added
   */
  constructor(contentRoot) {
    if (!contentRoot) {
      throw new Error('ContentManager requires a content root component');
    }
    this.#contentRoot = contentRoot;
  }

  /**
   * Set the content node.
   * @param {SceneGraphNode} node - The content node
   * @param {Object} [options] - Content options
   * @param {string} [options.strategy='direct'] - Content strategy
   * @param {boolean} [options.encompass=true] - Whether to encompass content (for centeredAndScaled)
   */
  setContent(node, options = {}) {
    const strategy = options.strategy || 'direct';
    const encompass = options.encompass !== false;

    // Remove old content
    if (this.#contentNode) {
      this.#removeContent();
    }

    // Set new content
    this.#contentNode = node;
    this.#strategy = strategy;

    // Apply strategy
    if (strategy === 'direct') {
      this.#addContentDirect(node);
    } else if (strategy === 'centeredAndScaled') {
      this.#addContentCenteredAndScaled(node, encompass);
    } else if (strategy === 'terrainAligned') {
      // TODO: Implement terrain alignment
      logger.warn('Terrain alignment strategy not yet implemented, using direct');
      this.#addContentDirect(node);
    } else {
      logger.warn(`Unknown content strategy: ${strategy}, using direct`);
      this.#addContentDirect(node);
    }

    // Fire event
    this.#emit('contentChanged', { node, strategy: this.#strategy });
  }

  /**
   * Get the current content node.
   * @returns {SceneGraphNode|null} The content node
   */
  getContent() {
    return this.#contentNode;
  }

  /**
   * Get the current content strategy.
   * @returns {string} The strategy name
   */
  getStrategy() {
    return this.#strategy;
  }

  /**
   * Set the size for centeredAndScaled strategy.
   * @param {number} size - The size
   */
  setSize(size) {
    this.#size = size;
    if (this.#strategy === 'centeredAndScaled' && this.#contentNode) {
      this.#updateCenteredAndScaledMatrix();
    }
  }

  /**
   * Get the size for centeredAndScaled strategy.
   * @returns {number} The size
   */
  getSize() {
    return this.#size;
  }

  /**
   * Register a content changed listener.
   * @param {Function} callback - Callback function
   */
  onContentChanged(callback) {
    this.#listeners.push(callback);
  }

  /**
   * Remove a content changed listener.
   * @param {Function} callback - Callback function to remove
   */
  removeContentChangedListener(callback) {
    const index = this.#listeners.indexOf(callback);
    if (index !== -1) {
      this.#listeners.splice(index, 1);
    }
  }

  /**
   * Add content using direct strategy.
   * @param {SceneGraphNode} node - The content node
   * @private
   */
  #addContentDirect(node) {
    if (node instanceof SceneGraphComponent) {
      this.#contentRoot.addChild(node);
    } else {
      // Wrap geometry in a component
      const wrapper = new SceneGraphComponent('contentWrapper');
      wrapper.setGeometry(node);
      this.#contentRoot.addChild(wrapper);
    }
  }

  /**
   * Add content using centeredAndScaled strategy.
   * @param {SceneGraphNode} node - The content node
   * @param {boolean} encompass - Whether to encompass content
   * @private
   */
  #addContentCenteredAndScaled(node, encompass) {
    // Ensure content root has no geometry
    this.#contentRoot.setGeometry(null);

    // Wrap node if needed
    let contentComponent;
    if (node instanceof SceneGraphComponent) {
      contentComponent = node;
    } else {
      contentComponent = new SceneGraphComponent('contentWrapper');
      contentComponent.setGeometry(node);
    }

    // Calculate bounding box
    let bbox;
    try {
      bbox = BoundingBoxUtility.calculateBoundingBox(contentComponent);
    } catch (error) {
      logger.warn(`Could not calculate bounding box: ${error.message}, using defaults`);
      bbox = new Rectangle3D([0, 0, 0], [1, 1, 1]);
    }

    const extent = bbox.getExtent();
    this.#objectSize = Math.max(Math.max(extent[0], extent[1]), extent[2]);
    this.#center = bbox.getCenter();

    if (this.#objectSize === 0) {
      this.#objectSize = 1.0;
      this.#center = [0, 0, 0];
    }

    // Add content
    this.#contentRoot.addChild(contentComponent);

    // Update transformation matrix
    this.#updateCenteredAndScaledMatrix();
  }

  /**
   * Update the transformation matrix for centeredAndScaled strategy.
   * @private
   */
  #updateCenteredAndScaledMatrix() {
    if (!this.#contentRoot) {
      return;
    }

    const mb = MatrixBuilder.euclidean();
    mb.scale(this.#size / this.#objectSize);
    mb.translate(-this.#center[0], -this.#center[1], -this.#center[2]);
    
    const transform = new Transformation();
    transform.setMatrix(mb.getArray());
    this.#contentRoot.setTransformation(transform);
  }

  /**
   * Remove current content.
   * @private
   */
  #removeContent() {
    if (!this.#contentNode) {
      return;
    }

    if (this.#contentNode instanceof SceneGraphComponent) {
      if (this.#contentNode.getParent() === this.#contentRoot) {
        this.#contentRoot.removeChild(this.#contentNode);
      }
    } else {
      // Find wrapper component
      const children = this.#contentRoot.getChildren();
      for (const child of children) {
        if (child.getGeometry() === this.#contentNode) {
          this.#contentRoot.removeChild(child);
          break;
        }
      }
    }

    this.#contentNode = null;
  }

  /**
   * Emit an event to listeners.
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   * @private
   */
  #emit(eventName, data) {
    this.#listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error(`Error in ContentManager listener: ${error.message}`);
      }
    });
  }
}

