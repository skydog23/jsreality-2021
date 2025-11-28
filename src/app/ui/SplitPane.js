/**
 * SplitPane - A resizable split pane component for dividing space between two panels.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Creates a resizable split pane with two panels.
 * @param {HTMLElement} container - Container element for the split pane
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.leftPanel - Left/top panel element
 * @param {HTMLElement} options.rightPanel - Right/bottom panel element
 * @param {string} [options.orientation='horizontal'] - 'horizontal' (left/right) or 'vertical' (top/bottom)
 * @param {number} [options.initialSize=300] - Initial size of the first panel in pixels
 * @param {number} [options.minSize=100] - Minimum size of either panel in pixels
 * @param {number} [options.splitterWidth=4] - Width of the splitter bar in pixels
 */
export class SplitPane {
  /** @type {HTMLElement} */
  #container;

  /** @type {HTMLElement} */
  #leftPanel;

  /** @type {HTMLElement} */
  #rightPanel;

  /** @type {HTMLElement} */
  #splitter;

  /** @type {string} */
  #orientation;

  /** @type {number} */
  #initialSize;

  /** @type {number} */
  #minSize;

  /** @type {number} */
  #splitterWidth;

  /** @type {boolean} */
  #isResizing = false;

  /** @type {number} */
  #startPos = 0;

  /** @type {number} */
  #startSize = 0;

  /**
   * Create a new SplitPane.
   */
  constructor(container, options) {
    const {
      leftPanel,
      rightPanel,
      orientation = 'horizontal',
      initialSize = 300,
      minSize = 100,
      splitterWidth = 4
    } = options;

    if (!container || !leftPanel || !rightPanel) {
      throw new Error('SplitPane requires container, leftPanel, and rightPanel');
    }

    this.#container = container;
    this.#leftPanel = leftPanel;
    this.#rightPanel = rightPanel;
    this.#orientation = orientation;
    this.#initialSize = initialSize;
    this.#minSize = minSize;
    this.#splitterWidth = splitterWidth;

    this.#setupLayout();
    this.#createSplitter();
    this.#attachEventListeners();
  }

  /**
   * Set up the layout structure.
   * @private
   */
  #setupLayout() {
    // Set container to flex layout
    this.#container.style.display = 'flex';
    this.#container.style.flexDirection = this.#orientation === 'horizontal' ? 'row' : 'column';
    this.#container.style.width = '100%';
    this.#container.style.height = '100%';
    this.#container.style.overflow = 'hidden';

    // Style left panel
    this.#leftPanel.style.flex = '0 0 auto';
    this.#leftPanel.style.overflow = 'auto'; // Allow scrolling
    if (this.#orientation === 'horizontal') {
      this.#leftPanel.style.width = `${this.#initialSize}px`;
      this.#leftPanel.style.height = '100%';
    } else {
      this.#leftPanel.style.width = '100%';
      this.#leftPanel.style.height = `${this.#initialSize}px`;
    }

    // Style right panel
    this.#rightPanel.style.flex = '1 1 auto';
    this.#rightPanel.style.overflow = 'auto'; // Allow scrolling
    this.#rightPanel.style.minWidth = '0'; // Allow flexbox to shrink below content size
    this.#rightPanel.style.minHeight = '0';
    if (this.#orientation === 'horizontal') {
      this.#rightPanel.style.width = '0'; // Flexbox will handle sizing
      this.#rightPanel.style.height = '100%';
    } else {
      this.#rightPanel.style.width = '100%';
      this.#rightPanel.style.height = '0'; // Flexbox will handle sizing
    }

    // Insert panels into container
    this.#container.appendChild(this.#leftPanel);
    this.#container.appendChild(this.#rightPanel);
  }

  /**
   * Create the splitter bar.
   * @private
   */
  #createSplitter() {
    this.#splitter = document.createElement('div');
    this.#splitter.className = 'jsr-splitter';
    this.#splitter.style.flex = '0 0 auto';
    this.#splitter.style.backgroundColor = '#3e3e3e';
    this.#splitter.style.cursor = this.#orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    this.#splitter.style.userSelect = 'none';
    
    if (this.#orientation === 'horizontal') {
      this.#splitter.style.width = `${this.#splitterWidth}px`;
      this.#splitter.style.height = '100%';
    } else {
      this.#splitter.style.width = '100%';
      this.#splitter.style.height = `${this.#splitterWidth}px`;
    }

    // Hover effect
    this.#splitter.addEventListener('mouseenter', () => {
      this.#splitter.style.backgroundColor = '#007acc';
    });
    this.#splitter.addEventListener('mouseleave', () => {
      if (!this.#isResizing) {
        this.#splitter.style.backgroundColor = '#3e3e3e';
      }
    });

    // Insert splitter between panels
    this.#container.insertBefore(this.#splitter, this.#rightPanel);
  }

  /**
   * Attach event listeners for resizing.
   * @private
   */
  #attachEventListeners() {
    this.#splitter.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.#startResize(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.#isResizing) {
        this.#handleResize(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.#isResizing) {
        this.#endResize();
      }
    });
  }

  /**
   * Start resizing.
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  #startResize(e) {
    this.#isResizing = true;
    this.#splitter.style.backgroundColor = '#007acc';
    document.body.style.cursor = this.#orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    if (this.#orientation === 'horizontal') {
      this.#startPos = e.clientX;
      this.#startSize = this.#leftPanel.offsetWidth;
    } else {
      this.#startPos = e.clientY;
      this.#startSize = this.#leftPanel.offsetHeight;
    }
  }

  /**
   * Handle resizing.
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  #handleResize(e) {
    if (!this.#isResizing) return;

    const containerSize = this.#orientation === 'horizontal' 
      ? this.#container.offsetWidth 
      : this.#container.offsetHeight;
    
    let delta;
    if (this.#orientation === 'horizontal') {
      delta = e.clientX - this.#startPos;
    } else {
      delta = e.clientY - this.#startPos;
    }

    const newSize = this.#startSize + delta;
    const maxSize = containerSize - this.#splitterWidth - this.#minSize;

    // Clamp to min/max sizes
    const clampedSize = Math.max(this.#minSize, Math.min(newSize, maxSize));

    if (this.#orientation === 'horizontal') {
      this.#leftPanel.style.width = `${clampedSize}px`;
    } else {
      this.#leftPanel.style.height = `${clampedSize}px`;
    }
  }

  /**
   * End resizing.
   * @private
   */
  #endResize() {
    if (!this.#isResizing) return;

    this.#isResizing = false;
    this.#splitter.style.backgroundColor = '#3e3e3e';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  /**
   * Get the current size of the left panel.
   * @returns {number} Size in pixels
   */
  getLeftPanelSize() {
    return this.#orientation === 'horizontal' 
      ? this.#leftPanel.offsetWidth 
      : this.#leftPanel.offsetHeight;
  }

  /**
   * Set the size of the left panel.
   * @param {number} size - Size in pixels
   */
  setLeftPanelSize(size) {
    const containerSize = this.#orientation === 'horizontal' 
      ? this.#container.offsetWidth 
      : this.#container.offsetHeight;
    const maxSize = containerSize - this.#splitterWidth - this.#minSize;
    const clampedSize = Math.max(this.#minSize, Math.min(size, maxSize));

    if (this.#orientation === 'horizontal') {
      this.#leftPanel.style.width = `${clampedSize}px`;
    } else {
      this.#leftPanel.style.height = `${clampedSize}px`;
    }
  }
}

