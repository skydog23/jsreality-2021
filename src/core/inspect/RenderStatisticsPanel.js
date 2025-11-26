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

  /**
   * Create a new RenderStatisticsPanel
   * @param {HTMLElement} container - The container element
   * @param {Viewer} [viewer] - Optional viewer reference for statistics
   */
  constructor(container, viewer = null) {
    this.#container = container;
    this.#viewer = viewer;
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

    // Inject styles if not already present
    this.#injectStyles();

    // Initial render
    this.#updateDisplay();
  }

  /**
   * Set the viewer reference
   * @param {Viewer} viewer - The viewer instance
   */
  setViewer(viewer) {
    this.#viewer = viewer;
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
      this.#updateDisplay();
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
  #updateDisplay() {
    const frameRate = this.#calculateFrameRate();
    
    let stats = {
      frameRate: frameRate,
      pointsRendered: 0,
      edgesRendered: 0,
      facesRendered: 0,
      totalPrimitives: 0,
      renderCallCount: 0
    };

    // Get statistics from viewer if available
    if (this.#viewer && typeof this.#viewer.getRenderStatistics === 'function') {
      const viewerStats = this.#viewer.getRenderStatistics();
      stats.pointsRendered = viewerStats.pointsRendered || 0;
      stats.edgesRendered = viewerStats.edgesRendered || 0;
      stats.facesRendered = viewerStats.facesRendered || 0;
      stats.renderCallCount = viewerStats.renderCallCount || 0;
      stats.totalPrimitives = stats.pointsRendered + stats.edgesRendered + stats.facesRendered;
    }

    // Format numbers with commas
    const formatNumber = (num) => {
      return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
    };

    // Update HTML
    this.#statsContainer.innerHTML = `
      <div class="sg-statistics-header">Rendering Statistics</div>
      <div class="sg-statistics-content">
        <div class="sg-stat-row">
          <span class="sg-stat-label">Frame Rate:</span>
          <span class="sg-stat-value">${frameRate.toFixed(1)} FPS</span>
        </div>
        <div class="sg-stat-row">
          <span class="sg-stat-label">Points:</span>
          <span class="sg-stat-value">${formatNumber(stats.pointsRendered)}</span>
        </div>
        <div class="sg-stat-row">
          <span class="sg-stat-label">Edges:</span>
          <span class="sg-stat-value">${formatNumber(stats.edgesRendered)}</span>
        </div>
        <div class="sg-stat-row">
          <span class="sg-stat-label">Faces:</span>
          <span class="sg-stat-value">${formatNumber(stats.facesRendered)}</span>
        </div>
        <div class="sg-stat-row">
          <span class="sg-stat-label">Total Primitives:</span>
          <span class="sg-stat-value">${formatNumber(stats.totalPrimitives)}</span>
        </div>
        <div class="sg-stat-row">
          <span class="sg-stat-label">Render Calls:</span>
          <span class="sg-stat-value">${formatNumber(stats.renderCallCount)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Inject CSS styles
   * @private
   */
  #injectStyles() {
    if (document.getElementById('sg-statistics-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'sg-statistics-styles';
    style.textContent = `
      .sg-statistics-panel {
        padding: 16px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 13px;
        color: #cccccc;
        background: #1e1e1e;
        height: 100%;
        overflow-y: auto;
      }
      
      .sg-statistics-header {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #3e3e3e;
        color: #ffffff;
      }
      
      .sg-statistics-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .sg-stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
      }
      
      .sg-stat-label {
        color: #858585;
        font-weight: 500;
      }
      
      .sg-stat-value {
        color: #ffffff;
        font-weight: 600;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();
    if (this.#statsContainer) {
      this.#statsContainer.innerHTML = '';
    }
  }
}

