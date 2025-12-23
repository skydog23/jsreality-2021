/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Render Statistics Panel - Displays global rendering statistics

/** @typedef {import('../scene/Viewer.js').Viewer} Viewer */

import { InspectorStylesheetManager } from './InspectorStylesheetManager.js';
import { DescriptorRenderer } from './descriptors/DescriptorRenderer.js';
import { DescriptorType } from './descriptors/DescriptorTypes.js';

/**
 * Panel component for displaying rendering statistics
 * Shows frame rate, points/edges/faces rendered per frame, etc.
 */
export class RenderStatisticsPanel {
  /**
   * @type {HTMLElement}
   */
  #container;

  /**
   * @type {Viewer|null}
   */
  #viewer = null;

  /**
   * @type {HTMLElement}
   */
  #statsContainer;

  /**
   * @type {number|null}
   */
  #animationFrameId = null;

  /**
   * @type {boolean}
   */
  #isUpdating = false;

  /**
   * Frame rate tracking
   * @type {number[]}
   */
  #frameTimes = [];

  /**
   * @type {number}
   */
  #lastFrameTime = 0;

  /**
   * @type {number}
   */
  #updateInterval = 100; // Update display every 100ms

  /**
   * @type {number}
   */
  #lastUpdateTime = 0;

  /** @type {InspectorStylesheetManager} */
  #stylesheetManager = InspectorStylesheetManager.getInstance();

  /** @type {DescriptorRenderer|null} */
  #descriptorRenderer = null;

  /**
   * Cached snapshot of viewer statistics (updated on a throttle).
   * @type {{pointsRendered: number, edgesRendered: number, facesRendered: number, totalPrimitives: number, renderCallCount: number}}
   */
  #stats = {
    pointsRendered: 0,
    edgesRendered: 0,
    facesRendered: 0,
    totalPrimitives: 0,
    renderCallCount: 0
  };

  /**
   * Create a new RenderStatisticsPanel
   * @param {HTMLElement} container - The container element
   * @param {Viewer} [viewer] - Optional viewer reference for statistics
   */
  constructor(container, viewer = null) {
    this.#container = container;
    this.#viewer = viewer;
    this.#stylesheetManager.acquire();
    this.#initializeUI();
  }

  /**
   * Initialize the UI
   * @private
   */
  #initializeUI() {
    // Clear container
    this.#container.innerHTML = '';

    // Create stats container
    this.#statsContainer = document.createElement('div');
    this.#statsContainer.className = 'sg-statistics-panel';
    this.#container.appendChild(this.#statsContainer);

    // Render descriptor-based UI once. Individual fields update via LIVE_LABEL widgets.
    this.#descriptorRenderer = new DescriptorRenderer(this.#statsContainer);
    this.#descriptorRenderer.render([
      {
        key: 'render-stats',
        title: '',
        items: [
          {
            type: DescriptorType.LIVE_LABEL,
            label: 'Frame Rate',
            updateIntervalMs: 200,
            getValue: () => `${this.#calculateFrameRate().toFixed(1)} FPS`
          },
          {
            type: DescriptorType.LIVE_LABEL,
            label: 'Points',
            updateIntervalMs: 200,
            getValue: () => this.#formatInt(this.#stats.pointsRendered)
          },
          {
            type: DescriptorType.LIVE_LABEL,
            label: 'Edges',
            updateIntervalMs: 200,
            getValue: () => this.#formatInt(this.#stats.edgesRendered)
          },
          {
            type: DescriptorType.LIVE_LABEL,
            label: 'Faces',
            updateIntervalMs: 200,
            getValue: () => this.#formatInt(this.#stats.facesRendered)
          },
          {
            type: DescriptorType.LIVE_LABEL,
            label: 'Total Primitives',
            updateIntervalMs: 200,
            getValue: () => this.#formatInt(this.#stats.totalPrimitives)
          },
          {
            type: DescriptorType.LIVE_LABEL,
            label: 'Render Calls',
            updateIntervalMs: 200,
            getValue: () => this.#formatInt(this.#stats.renderCallCount)
          }
        ]
      }
    ]);
  }

  /**
   * Set the viewer reference
   * @param {Viewer} viewer - The viewer instance
   */
  setViewer(viewer) {
    this.#viewer = viewer;
  }

  #formatInt(value) {
    const num = Number(value ?? 0);
    if (Number.isNaN(num)) return '0';
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  /**
   * Start updating statistics display
   */
  start() {
    if (this.#isUpdating) return;
    this.#isUpdating = true;
    this.#lastFrameTime = performance.now();
    this.#updateLoop();
  }

  /**
   * Stop updating statistics display
   */
  stop() {
    this.#isUpdating = false;
    if (this.#animationFrameId !== null) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
  }

  /**
   * Update loop for frame rate tracking and display updates
   * @private
   */
  #updateLoop() {
    if (!this.#isUpdating) return;

    const currentTime = performance.now();
    const frameTime = currentTime - this.#lastFrameTime;
    
    // Track frame times (keep last 20 frames)
    this.#frameTimes.push(frameTime);
    if (this.#frameTimes.length > 20) {
      this.#frameTimes.shift();
    }
    
    this.#lastFrameTime = currentTime;

    // Update display at throttled rate
    if (currentTime - this.#lastUpdateTime >= this.#updateInterval) {
      this.#updateStats();
      this.#lastUpdateTime = currentTime;
    }

    this.#animationFrameId = requestAnimationFrame(() => this.#updateLoop());
  }

  /**
   * Calculate average frame rate
   * @private
   * @returns {number} Frames per second
   */
  #calculateFrameRate() {
    if (this.#frameTimes.length === 0) return 0;
    const avgFrameTime = this.#frameTimes.reduce((a, b) => a + b, 0) / this.#frameTimes.length;
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }

  /**
   * Update the display with current statistics
   * @private
   */
  #updateStats() {
    // Get statistics from viewer if available
    if (this.#viewer && typeof this.#viewer.getRenderStatistics === 'function') {
      const viewerStats = this.#viewer.getRenderStatistics();
      this.#stats.pointsRendered = viewerStats.pointsRendered || 0;
      this.#stats.edgesRendered = viewerStats.edgesRendered || 0;
      this.#stats.facesRendered = viewerStats.facesRendered || 0;
      this.#stats.renderCallCount = viewerStats.renderCallCount || 0;
      this.#stats.totalPrimitives =
        this.#stats.pointsRendered + this.#stats.edgesRendered + this.#stats.facesRendered;
    } else {
      this.#stats.pointsRendered = 0;
      this.#stats.edgesRendered = 0;
      this.#stats.facesRendered = 0;
      this.#stats.totalPrimitives = 0;
      this.#stats.renderCallCount = 0;
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();
    this.#descriptorRenderer?.dispose();
    this.#descriptorRenderer = null;
    if (this.#statsContainer) {
      this.#statsContainer.innerHTML = '';
    }
    this.#stylesheetManager.release();
  }
}

