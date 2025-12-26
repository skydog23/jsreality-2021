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
   * Render rate tracking (based on backend renderCallCount deltas).
   * This is more meaningful than requestAnimationFrame cadence, which mostly
   * reflects the display refresh rate (often 60/120Hz).
   *
   * @type {number[]}
   */
  #renderFpsSamples = [];

  /** @type {number} */
  #lastRenderSampleTime = 0;

  /** @type {number} */
  #lastRenderCallCount = 0;

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

  /** @type {boolean} */
  #continuousRendering = false;

  /** @type {number|null} */
  #continuousRenderRafId = null;

  /**
   * Cached snapshot of viewer statistics (updated on a throttle).
   * @type {{pointsRendered: number, edgesRendered: number, facesRendered: number, totalPrimitives: number, renderCallCount: number}}
   */
  #stats = {
    pointsRendered: 0,
    edgesRendered: 0,
    facesRendered: 0,
    totalPrimitives: 0,
    renderCallCount: 0,
    renderDurationMs: 0,
    avgRenderDurationMs: 0
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
            type: DescriptorType.TOGGLE,
            label: 'Continuous rendering',
            description:
              'When enabled, triggers continuous renders (vsync) so timing averages are meaningful. May use more CPU/GPU.',
            getValue: () => this.#continuousRendering,
            setValue: (v) => this.#setContinuousRendering(Boolean(v))
          },
          {
            type: DescriptorType.LIVE_LABEL,
            label: 'Frame Rate',
            updateIntervalMs: 200,
            getValue: () => `${this.#calculateRenderRate().toFixed(1)} FPS`
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
          // {
          //   type: DescriptorType.LIVE_LABEL,
          //   label: 'Total Primitives',
          //   updateIntervalMs: 200,
          //   getValue: () => this.#formatInt(this.#stats.totalPrimitives)
          // },
          // {
          //   type: DescriptorType.LIVE_LABEL,
          //   label: 'Render Calls',
          //   updateIntervalMs: 200,
          //   getValue: () => this.#formatInt(this.#stats.renderCallCount)
          // }
          // ,
          {
            type: DescriptorType.LIVE_LABEL,
            label: 'Avg Render Time',
            updateIntervalMs: 200,
            getValue: () => `${(this.#stats.avgRenderDurationMs ?? 0).toFixed(2)} ms`
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

  #setContinuousRendering(enabled) {
    this.#continuousRendering = Boolean(enabled);
    if (this.#continuousRendering) {
      this.#startContinuousRenderLoop();
    } else {
      this.#stopContinuousRenderLoop();
    }
  }

  #startContinuousRenderLoop() {
    this.#stopContinuousRenderLoop();
    const loop = () => {
      if (!this.#continuousRendering) return;
      try {
        // Prefer direct render() so renderCallCount increments immediately.
        if (this.#viewer && typeof this.#viewer.render === 'function') {
          this.#viewer.render();
        } else if (this.#viewer && typeof this.#viewer.renderAsync === 'function') {
          this.#viewer.renderAsync();
        }
      } catch {
        // Ignore render exceptions in stats loop.
      }
      this.#continuousRenderRafId = requestAnimationFrame(loop);
    };
    this.#continuousRenderRafId = requestAnimationFrame(loop);
  }

  #stopContinuousRenderLoop() {
    if (this.#continuousRenderRafId !== null) {
      cancelAnimationFrame(this.#continuousRenderRafId);
      this.#continuousRenderRafId = null;
    }
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
    const now = performance.now();
    this.#lastRenderSampleTime = now;
    // Seed the call count so the first delta is stable.
    this.#lastRenderCallCount = this.#viewer?.getRenderStatistics?.()?.renderCallCount ?? 0;
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
    this.#stopContinuousRenderLoop();
  }

  /**
   * Update loop for frame rate tracking and display updates
   * @private
   */
  #updateLoop() {
    if (!this.#isUpdating) return;

    const currentTime = performance.now();

    // Update display at throttled rate
    if (currentTime - this.#lastUpdateTime >= this.#updateInterval) {
      this.#updateStats();
      this.#lastUpdateTime = currentTime;
    }

    this.#animationFrameId = requestAnimationFrame(() => this.#updateLoop());
  }

  /**
   * Calculate average render rate (renders per second).
   * @private
   * @returns {number} Frames per second
   */
  #calculateRenderRate() {
    // if (this.#renderFpsSamples.length === 0) return 0;
    // const avg = this.#renderFpsSamples.reduce((a, b) => a + b, 0) / this.#renderFpsSamples.length;
   
return 1000 / (this.#stats.avgRenderDurationMs ?? 0);
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
      this.#stats.renderDurationMs = viewerStats.renderDurationMs || 0;
      this.#stats.avgRenderDurationMs = viewerStats.avgRenderDurationMs || 0;

      // Update render FPS samples based on renderCallCount delta.
      const now = performance.now();
      const dt = now - this.#lastRenderSampleTime;
      const currentCount = this.#stats.renderCallCount;
      const deltaCalls = currentCount - this.#lastRenderCallCount;
      if (dt > 0 && deltaCalls >= 0) {
        const fps = (deltaCalls * 1000) / dt;
        if (Number.isFinite(fps)) {
          this.#renderFpsSamples.push(fps);
          if (this.#renderFpsSamples.length > 20) {
            this.#renderFpsSamples.shift();
          }
        }
      } else if (deltaCalls < 0) {
        // Defensive: if counter resets, clear samples.
        this.#renderFpsSamples.length = 0;
      }
      this.#lastRenderSampleTime = now;
      this.#lastRenderCallCount = currentCount;
    } else {
      this.#stats.pointsRendered = 0;
      this.#stats.edgesRendered = 0;
      this.#stats.facesRendered = 0;
      this.#stats.totalPrimitives = 0;
      this.#stats.renderCallCount = 0;
      this.#stats.renderDurationMs = 0;
      this.#stats.avgRenderDurationMs = 0;
      this.#renderFpsSamples.length = 0;
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();
    this.#continuousRendering = false;
    this.#descriptorRenderer?.dispose();
    this.#descriptorRenderer = null;
    if (this.#statsContainer) {
      this.#statsContainer.innerHTML = '';
    }
    this.#stylesheetManager.release();
  }
}

