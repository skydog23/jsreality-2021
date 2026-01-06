/**
 * SplitPane - A resizable split pane component for dividing space between two panels.
 *
 * Notes:
 * - Orientation 'horizontal' means left/right split.
 * - Orientation 'vertical' means top/bottom split.
 * - `primary` controls which pane is explicitly sized (and thus which side "feels fixed").
 * - Uses pointer events with pointer capture (mouse/touch/pen).
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

  /** @type {'horizontal'|'vertical'} */
  #orientation;

  /** @type {number} */
  #minSizeFirst;

  /** @type {number} */
  #minSizeSecond;

  /** @type {number} */
  #splitterWidth;

  /** @type {'first'|'second'} */
  #primary;

  /** @type {boolean} */
  #isResizing = false;

  /** @type {number} */
  #startPos = 0;

  /** @type {number} */
  #startFirst = 0;

  /** @type {number} */
  #startSecond = 0;

  /** @type {boolean} */
  #splitterVisible = true;

  /** @type {number} */
  #collapseThreshold = 0;

  /**
   * @param {HTMLElement} container
   * @param {{
   *  leftPanel: HTMLElement,
   *  rightPanel: HTMLElement,
   *  orientation?: 'horizontal'|'vertical',
   *  primary?: 'first'|'second',
   *  initialSize?: number,
   *  minSize?: number,
   *  minSizeFirst?: number,
   *  minSizeSecond?: number,
   *  splitterWidth?: number,
   *  splitterVisible?: boolean
   * }} options
   */
  constructor(container, options) {
    const {
      leftPanel,
      rightPanel,
      orientation = 'horizontal',
      primary = 'first',
      initialSize = 300,
      minSize = 100,
      minSizeFirst = undefined,
      minSizeSecond = undefined,
      splitterWidth = 4,
      splitterVisible = true,
      collapseThreshold = 0
    } = options ?? {};

    if (!container || !leftPanel || !rightPanel) {
      throw new Error('SplitPane requires container, leftPanel, and rightPanel');
    }

    this.#container = container;
    this.#leftPanel = leftPanel;
    this.#rightPanel = rightPanel;
    this.#orientation = orientation === 'vertical' ? 'vertical' : 'horizontal';
    this.#primary = primary === 'second' ? 'second' : 'first';
    this.#minSizeFirst = typeof minSizeFirst === 'number' ? Math.max(0, minSizeFirst) : Math.max(0, minSize);
    this.#minSizeSecond = typeof minSizeSecond === 'number' ? Math.max(0, minSizeSecond) : Math.max(0, minSize);
    this.#splitterWidth = Math.max(1, splitterWidth | 0);
    this.#collapseThreshold = Math.max(0, Number(collapseThreshold) || 0);

    this.#setupLayout();
    this.#createSplitter();
    this.#attachEventListeners();

    this.setPrimarySize(initialSize);
    this.setSplitterVisible(Boolean(splitterVisible));
  }

  #setupLayout() {
    this.#container.style.display = 'flex';
    this.#container.style.flexDirection = this.#orientation === 'horizontal' ? 'row' : 'column';
    this.#container.style.width = '100%';
    this.#container.style.height = '100%';
    this.#container.style.overflow = 'hidden';
    this.#container.style.minWidth = '0';
    this.#container.style.minHeight = '0';

    // Ensure panes can shrink inside nested flex containers.
    this.#leftPanel.style.minWidth = '0';
    this.#leftPanel.style.minHeight = '0';
    this.#rightPanel.style.minWidth = '0';
    this.#rightPanel.style.minHeight = '0';

    if (this.#primary === 'first') {
      this.#leftPanel.style.flex = '0 0 auto';
      this.#rightPanel.style.flex = '1 1 auto';
    } else {
      this.#leftPanel.style.flex = '1 1 auto';
      this.#rightPanel.style.flex = '0 0 auto';
    }

    this.#container.appendChild(this.#leftPanel);
    this.#container.appendChild(this.#rightPanel);
  }

  #createSplitter() {
    this.#splitter = document.createElement('div');
    this.#splitter.className = 'jsr-splitter';
    this.#splitter.style.flex = '0 0 auto';
    this.#splitter.style.backgroundColor = '#3e3e3e';
    this.#splitter.style.cursor = this.#orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    this.#splitter.style.userSelect = 'none';
    this.#splitter.style.touchAction = 'none';

    if (this.#orientation === 'horizontal') {
      this.#splitter.style.width = `${this.#splitterWidth}px`;
      this.#splitter.style.height = '100%';
    } else {
      this.#splitter.style.width = '100%';
      this.#splitter.style.height = `${this.#splitterWidth}px`;
    }

    this.#splitter.addEventListener('mouseenter', () => {
      this.#splitter.style.backgroundColor = '#007acc';
    });
    this.#splitter.addEventListener('mouseleave', () => {
      if (!this.#isResizing) this.#splitter.style.backgroundColor = '#3e3e3e';
    });

    // Insert splitter between panels
    this.#container.insertBefore(this.#splitter, this.#rightPanel);
  }

  #attachEventListeners() {
    this.#splitter.addEventListener('pointerdown', (e) => {
      if (!this.#splitterVisible) return;
      e.preventDefault();
      this.#splitter.setPointerCapture?.(e.pointerId);
      this.#startResize(e);
    });
    this.#splitter.addEventListener('pointermove', (e) => {
      if (!this.#isResizing) return;
      this.#handleResize(e);
    });
    const end = (e) => {
      if (!this.#isResizing) return;
      try {
        this.#splitter.releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      this.#endResize();
    };
    this.#splitter.addEventListener('pointerup', end);
    this.#splitter.addEventListener('pointercancel', end);
  }

  #startResize(e) {
    this.#isResizing = true;
    this.#splitter.style.backgroundColor = '#007acc';
    document.body.style.cursor = this.#orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    const a = this.#leftPanel.getBoundingClientRect();
    const b = this.#rightPanel.getBoundingClientRect();
    if (this.#orientation === 'horizontal') {
      this.#startPos = e.clientX;
      this.#startFirst = a.width;
      this.#startSecond = b.width;
    } else {
      this.#startPos = e.clientY;
      this.#startFirst = a.height;
      this.#startSecond = b.height;
    }
  }

  #handleResize(e) {
    const containerSize =
      this.#orientation === 'horizontal' ? this.#container.offsetWidth : this.#container.offsetHeight;
    const delta = (this.#orientation === 'horizontal' ? e.clientX : e.clientY) - this.#startPos;

    if (this.#primary === 'first') {
      const max = containerSize - this.#splitterWidth - this.#minSizeSecond;
      const raw = this.#startFirst + delta;
      if (this.#collapseThreshold > 0 && raw <= this.#collapseThreshold) {
        this.#applyPrimarySize(0);
        return;
      }
      const next = Math.max(this.#minSizeFirst, Math.min(raw, max));
      this.#applyPrimarySize(next);
    } else {
      const max = containerSize - this.#splitterWidth - this.#minSizeFirst;
      const raw = this.#startSecond - delta;
      if (this.#collapseThreshold > 0 && raw <= this.#collapseThreshold) {
        this.#applyPrimarySize(0);
        return;
      }
      const next = Math.max(this.#minSizeSecond, Math.min(raw, max));
      this.#applyPrimarySize(next);
    }
  }

  #endResize() {
    this.#isResizing = false;
    this.#splitter.style.backgroundColor = '#3e3e3e';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  #applyPrimarySize(px) {
    const pane = this.#primary === 'first' ? this.#leftPanel : this.#rightPanel;
    if (this.#orientation === 'horizontal') {
      pane.style.width = `${px}px`;
      pane.style.height = '100%';
    } else {
      pane.style.height = `${px}px`;
      pane.style.width = '100%';
    }
  }

  setMinSizes(minFirst, minSecond) {
    if (Number.isFinite(minFirst)) this.#minSizeFirst = Math.max(0, minFirst);
    if (Number.isFinite(minSecond)) this.#minSizeSecond = Math.max(0, minSecond);
  }

  setCollapseThreshold(px) {
    this.#collapseThreshold = Math.max(0, Number(px) || 0);
  }

  setSplitterVisible(visible) {
    this.#splitterVisible = Boolean(visible);
    this.#splitter.style.display = this.#splitterVisible ? 'block' : 'none';
    this.#splitter.style.pointerEvents = this.#splitterVisible ? 'auto' : 'none';
  }

  getPrimarySize() {
    const pane = this.#primary === 'first' ? this.#leftPanel : this.#rightPanel;
    const r = pane.getBoundingClientRect();
    return this.#orientation === 'horizontal' ? r.width : r.height;
  }

  setPrimarySize(sizePx) {
    const containerSize =
      this.#orientation === 'horizontal' ? this.#container.offsetWidth : this.#container.offsetHeight;
    const min = this.#primary === 'first' ? this.#minSizeFirst : this.#minSizeSecond;

    // When SplitPane is configured before layout (e.g., during initial app bootstrap),
    // `containerSize` can be 0. In that case, clamping against a negative `max` would
    // collapse panes to 0 even if the caller requested a non-zero initial size.
    if (containerSize <= 0) {
      const next = Math.max(min, Number(sizePx) || 0);
      this.#applyPrimarySize(next);
      return;
    }

    const max =
      containerSize -
      this.#splitterWidth -
      (this.#primary === 'first' ? this.#minSizeSecond : this.#minSizeFirst);
    const next = Math.max(min, Math.min(Number(sizePx) || 0, max));
    this.#applyPrimarySize(next);
  }

  // Back-compat helpers
  getLeftPanelSize() {
    const r = this.#leftPanel.getBoundingClientRect();
    return this.#orientation === 'horizontal' ? r.width : r.height;
  }
  setLeftPanelSize(size) {
    this.#primary = 'first';
    this.setPrimarySize(size);
  }
}

