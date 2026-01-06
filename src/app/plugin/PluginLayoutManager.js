/**
 * PluginLayoutManager - centralized layout orchestration for plugin UI surfaces.
 * Creates common regions (top toolbar stack, left side panels, viewer host) so that
 * plugins and applications no longer need to manipulate DOM structure directly.
 *
 * Uses simple flexbox layout (no split panes) - panels are positioned with fixed widths.
 * Similar to jReality's approach.
 */

import { SplitPane } from '../ui/SplitPane.js';

export class PluginLayoutManager {
  /** @type {HTMLElement} */
  #container;

  /** @type {HTMLElement} */
  #menubarRegion;

  /** @type {HTMLElement} */
  #mainRow;

  /** @type {HTMLElement} */
  #topRegion;

  /** @type {HTMLElement} */
  #bottomRegion;

  /** @type {HTMLElement} */
  #centerColumn; // Vertical flex container: top | viewer | bottom

  /** @type {HTMLElement} */
  #viewerHost;

  /** @type {HTMLElement} */
  #leftPanelWrapper;

  /** @type {HTMLElement} */
  #rightPanelWrapper;

  /** @type {SplitPane} */
  #splitLM;

  /** @type {SplitPane} */
  #splitMR;

  /** @type {SplitPane} */
  #splitTC;

  /** @type {SplitPane} */
  #splitCB;

  // Track requested min sizes so we can temporarily drop them to allow full hiding.
  #minLeft = 180;
  #minRight = 200;
  #minTop = 24;
  #minBottom = 80;

  // Track requested visibility + preferred sizes so we can re-apply after first layout.
  #requested = {
    left: { visible: false, size: 300, min: 180 },
    right: { visible: false, size: 300, min: 200 },
    top: { visible: false, size: 44, min: 24 },
    bottom: { visible: false, size: 180, min: 80 }
  };

  /** @type {number|null} */
  #relayoutRaf = null;

  /** @type {ResizeObserver|null} */
  #resizeObserver = null;

  /** @type {Map<string, HTMLElement>} */
  #regionSlots = new Map();

  /**
   * @param {HTMLElement} container - Root container supplied by JSRViewer.
   */
  constructor(container) {
    if (!container) {
      throw new Error('PluginLayoutManager requires a container element');
    }
    this.#container = container;
    this.#setupBaseLayout();

    // In some embedding contexts (notably the gallery runner), initial layout can report
    // transient 0 sizes while the DOM is still settling. Observe the container and
    // re-apply requested sizes on the next frame whenever it changes.
    if (typeof ResizeObserver !== 'undefined') {
      this.#resizeObserver = new ResizeObserver(() => {
        this.#scheduleRelayout();
      });
      this.#resizeObserver.observe(this.#container);
    }
  }

  /**
   * Returns the element where ViewerSwitch should insert its DOM.
   * @returns {HTMLElement}
   */
  getViewerHostElement() {
    return this.#viewerHost;
  }

  /**
   * Request a layout region for a plugin or system component.
   * Currently supported regions: 'top', 'bottom', 'left', 'right'.
   *
   * @param {string} regionName
   * @param {Object} [options]
   * @param {string} [options.id] - Optional stable identifier to reuse a slot.
   * @param {number} [options.initialSize] - Initial pixel size for panels (fixed width).
   * @param {number} [options.minSize] - Minimum pixel size (not used, kept for API compatibility).
   * @param {boolean} [options.fill=true] - Whether the slot should take remaining space.
   * @param {string} [options.overflow='auto'] - Overflow policy inside the slot.
   * @returns {HTMLElement} The DOM node dedicated to the requested region.
   */
  requestRegion(regionName, options = {}) {
    const regionId = options.id ? `${regionName}:${options.id}` : null;
    if (regionId && this.#regionSlots.has(regionId)) {
      return this.#regionSlots.get(regionId);
    }

    let slot;
    switch (regionName) {
      case 'menubar':
        slot = this.#createMenubarSlot(options);
        break;
      case 'top':
        slot = this.#createTopSlot(options);
        break;
      case 'bottom':
        slot = this.#createBottomSlot(options);
        break;
      case 'left':
        slot = this.#createLeftSlot(options);
        break;
      case 'right':
        slot = this.#createRightSlot(options);
        break;
      default:
        throw new Error(`Unknown plugin layout region: ${regionName}`);
    }

    if (regionId) {
      this.#regionSlots.set(regionId, slot);
    }
    return slot;
  }

  /**
   * Set up the root flex layout (top stack + main content area).
   * @private
   */
  #setupBaseLayout() {
    this.#container.innerHTML = '';
    this.#container.style.display = 'flex';
    // Option A: Global menubar row above the whole split layout.
    // Layout:
    //   [menubar]  (fixed height, always visible)
    //   [mainRow]  (flex: 1) containing the 5-panel split layout
    this.#container.style.flexDirection = 'column';
    this.#container.style.width = '100%';
    this.#container.style.height = '100%';
    this.#container.style.minHeight = '0';
    this.#container.style.minWidth = '0';

    // Global menubar region (always present; plugins can add items/menus here).
    this.#menubarRegion = document.createElement('div');
    this.#menubarRegion.className = 'jsr-layout-menubar';
    this.#menubarRegion.style.display = 'flex';
    this.#menubarRegion.style.flexDirection = 'row';
    this.#menubarRegion.style.flex = '0 0 auto';
    this.#menubarRegion.style.width = '100%';
    this.#menubarRegion.style.minWidth = '0';
    this.#menubarRegion.style.background = '#2d2d2d';
    this.#menubarRegion.style.borderBottom = '1px solid #3e3e3e';
    this.#menubarRegion.style.overflow = 'visible';

    // Main row that holds the split panes.
    this.#mainRow = document.createElement('div');
    this.#mainRow.className = 'jsr-layout-main-row';
    this.#mainRow.style.display = 'flex';
    this.#mainRow.style.flexDirection = 'row';
    this.#mainRow.style.flex = '1 1 auto';
    this.#mainRow.style.minWidth = '0';
    this.#mainRow.style.minHeight = '0';
    this.#mainRow.style.overflow = 'hidden';

    // Left panel wrapper (exists always; starts collapsed)
    this.#leftPanelWrapper = document.createElement('div');
    this.#leftPanelWrapper.className = 'jsr-layout-left-panel';
    this.#leftPanelWrapper.style.display = 'flex';
    this.#leftPanelWrapper.style.flexDirection = 'column';
    this.#leftPanelWrapper.style.width = '0px';
    this.#leftPanelWrapper.style.height = '100%';
    this.#leftPanelWrapper.style.minHeight = '0';
    this.#leftPanelWrapper.style.minWidth = '0';
    this.#leftPanelWrapper.style.background = '#1e1e1e';
    this.#leftPanelWrapper.style.borderRight = 'none';
    this.#leftPanelWrapper.style.overflow = 'hidden';

    // Right panel wrapper (exists always; starts collapsed)
    this.#rightPanelWrapper = document.createElement('div');
    this.#rightPanelWrapper.className = 'jsr-layout-right-panel';
    this.#rightPanelWrapper.style.display = 'flex';
    this.#rightPanelWrapper.style.flexDirection = 'column';
    this.#rightPanelWrapper.style.width = '0px';
    this.#rightPanelWrapper.style.height = '100%';
    this.#rightPanelWrapper.style.minHeight = '0';
    this.#rightPanelWrapper.style.minWidth = '0';
    this.#rightPanelWrapper.style.background = '#1e1e1e';
    this.#rightPanelWrapper.style.borderLeft = 'none';
    this.#rightPanelWrapper.style.overflow = 'hidden';

    // Center column container (host for top/center/bottom split panes)
    this.#centerColumn = document.createElement('div');
    this.#centerColumn.className = 'jsr-layout-center-column';
    this.#centerColumn.style.minHeight = '0';
    this.#centerColumn.style.minWidth = '0';

    // Top region for menubar/toolbars (center column only).
    this.#topRegion = document.createElement('div');
    this.#topRegion.className = 'jsr-layout-top';
    this.#topRegion.style.display = 'flex';
    this.#topRegion.style.width = '100%';
    this.#topRegion.style.flexDirection = 'column';
    this.#topRegion.style.background = '#252526';
    this.#topRegion.style.borderBottom = 'none';
    this.#topRegion.style.overflow = 'hidden';

    // Bottom region for wide, short panels (center column only).
    this.#bottomRegion = document.createElement('div');
    this.#bottomRegion.className = 'jsr-layout-bottom';
    this.#bottomRegion.style.display = 'flex';
    this.#bottomRegion.style.width = '100%';
    this.#bottomRegion.style.background = '#1e1e1e';
    this.#bottomRegion.style.borderTop = 'none';
    this.#bottomRegion.style.overflow = 'hidden';

    // Viewer host (center area; takes remaining space inside center column)
    this.#viewerHost = document.createElement('div');
    this.#viewerHost.className = 'jsr-layout-viewer-host';
    this.#viewerHost.style.width = '100%';
    this.#viewerHost.style.height = '100%';
    this.#viewerHost.style.position = 'relative';
    this.#viewerHost.style.minHeight = '0';
    this.#viewerHost.style.minWidth = '0';

    // Build nested split panes:
    // - Left | (Center | Right)
    // - Center | Right
    // - Top | (Viewer | Bottom)
    // - Viewer | Bottom
    const centerBottomContainer = document.createElement('div');
    centerBottomContainer.style.width = '100%';
    centerBottomContainer.style.height = '100%';
    centerBottomContainer.style.minWidth = '0';
    centerBottomContainer.style.minHeight = '0';

    this.#splitCB = new SplitPane(centerBottomContainer, {
      leftPanel: this.#viewerHost,
      rightPanel: this.#bottomRegion,
      orientation: 'vertical',
      primary: 'second',
      initialSize: 0,
      minSizeFirst: 0,
      minSizeSecond: 0,
      splitterVisible: true,
      collapseThreshold: 24
    });

    this.#splitTC = new SplitPane(this.#centerColumn, {
      leftPanel: this.#topRegion,
      rightPanel: centerBottomContainer,
      orientation: 'vertical',
      primary: 'first',
      initialSize: 0,
      minSizeFirst: 0,
      minSizeSecond: 0,
      splitterVisible: true,
      collapseThreshold: 16
    });

    const centerRightContainer = document.createElement('div');
    centerRightContainer.style.width = '100%';
    centerRightContainer.style.height = '100%';
    centerRightContainer.style.minWidth = '0';
    centerRightContainer.style.minHeight = '0';

    this.#splitMR = new SplitPane(centerRightContainer, {
      leftPanel: this.#centerColumn,
      rightPanel: this.#rightPanelWrapper,
      orientation: 'horizontal',
      primary: 'second',
      initialSize: 0,
      minSizeFirst: 0,
      minSizeSecond: 0,
      splitterVisible: true,
      collapseThreshold: 24
    });

    // L | (Center|Right) lives inside mainRow, not the global container.
    this.#splitLM = new SplitPane(this.#mainRow, {
      leftPanel: this.#leftPanelWrapper,
      rightPanel: centerRightContainer,
      orientation: 'horizontal',
      primary: 'first',
      initialSize: 0,
      minSizeFirst: 0,
      minSizeSecond: 0,
      splitterVisible: true,
      collapseThreshold: 24
    });

    // Startup defaults: keep splitters visible and allow dragging panels open even before
    // any plugin requests a region. Top/left start collapsed, but will expand as soon as
    // their regions are requested (and SplitPane will no longer clamp to 0 before layout).
    this.#splitLM.setMinSizes(0, 0);
    this.#splitMR.setMinSizes(0, 0);
    this.#splitTC.setMinSizes(0, 0);
    this.#splitCB.setMinSizes(0, 0);

    // Initial pass after base layout creation.
    this.#scheduleRelayout();

    // Mount rows into container.
    this.#container.appendChild(this.#menubarRegion);
    this.#container.appendChild(this.#mainRow);
  }

  /**
   * Global menubar strip (always visible) slot.
   * @private
   */
  #createMenubarSlot(options) {
    const slot = document.createElement('div');
    slot.className = 'jsr-layout-menubar-slot';
    slot.style.display = 'flex';
    slot.style.flexDirection = 'row';
    slot.style.alignItems = 'stretch';
    slot.style.flex = '1 1 auto';
    slot.style.minWidth = '0';
    slot.style.padding = options.padding ?? '0';
    slot.style.boxSizing = 'border-box';
    this.#menubarRegion.appendChild(slot);
    return slot;
  }

  /**
   * Ensure the top stack is visible and return a dedicated slot.
   * @private
   */
  #createTopSlot(options) {
    this.#activateTopRegion(options);

    const slot = document.createElement('div');
    slot.className = 'jsr-layout-top-slot';
    slot.style.width = '100%';
    slot.style.flex = '0 0 auto';
    slot.style.display = 'flex';
    slot.style.flexDirection = 'column';
    slot.style.padding = options.padding ?? '0';
    slot.style.boxSizing = 'border-box';

    this.#topRegion.appendChild(slot);
    return slot;
  }

  /**
   * Ensure the bottom region is visible and return a dedicated slot.
   * @private
   */
  #createBottomSlot(options) {
    this.#activateBottomRegion(options);

    const slot = document.createElement('div');
    slot.className = 'jsr-layout-bottom-slot';
    slot.style.width = '100%';
    slot.style.height = '100%';
    slot.style.display = 'flex';
    slot.style.flexDirection = 'column';
    slot.style.boxSizing = 'border-box';
    slot.style.overflow = options.overflow || 'auto';
    slot.style.padding = options.padding ?? '8px';

    this.#bottomRegion.appendChild(slot);
    return slot;
  }

  /**
   * Creates/returns a left side slot.
   * @private
   */
  #createLeftSlot(options) {
    const leftPanel = this.#ensureLeftPanel(options);
    const slot = document.createElement('div');
    slot.className = 'jsr-layout-left-slot';
    slot.style.width = '100%';
    slot.style.flex = options.fill === false ? '0 0 auto' : '1 1 auto';
    slot.style.minHeight = options.fill === false ? 'auto' : '0';
    slot.style.display = 'flex';
    slot.style.flexDirection = 'column';
    slot.style.overflow = options.overflow || 'auto';
    slot.style.boxSizing = 'border-box';
    leftPanel.appendChild(slot);
    return slot;
  }

  /**
   * Creates/returns a right side slot.
   * @private
   */
  #createRightSlot(options) {
    const rightPanel = this.#ensureRightPanel(options);
    const slot = document.createElement('div');
    slot.className = 'jsr-layout-right-slot';
    slot.style.width = '100%';
    slot.style.flex = options.fill === false ? '0 0 auto' : '1 1 auto';
    slot.style.minHeight = options.fill === false ? 'auto' : '0';
    slot.style.display = 'flex';
    slot.style.flexDirection = 'column';
    slot.style.overflow = options.overflow || 'auto';
    slot.style.boxSizing = 'border-box';
    rightPanel.appendChild(slot);
    return slot;
  }

  /**
   * Makes the top region visible the first time something requests it.
   * @private
   */
  #activateTopRegion(options = {}) {
    const initialSize = typeof options.initialSize === 'number' ? options.initialSize : 44;
    const minSize = typeof options.minSize === 'number' ? options.minSize : 24;
    this.#minTop = minSize;
    this.#requested.top.visible = true;
    this.#requested.top.size = initialSize;
    this.#requested.top.min = minSize;
    this.#topRegion.style.borderBottom = '1px solid #3e3e3e';
    this.#splitTC.setMinSizes(minSize, 0);
    this.#splitTC.setPrimarySize(initialSize);
    this.#splitTC.setSplitterVisible(true);
  }

  /**
   * Makes the bottom region visible the first time something requests it.
   * @private
   */
  #activateBottomRegion(options = {}) {
    const initialSize = typeof options.initialSize === 'number' ? options.initialSize : 180;
    const minSize = typeof options.minSize === 'number' ? options.minSize : 80;
    this.#minBottom = minSize;
    this.#requested.bottom.visible = true;
    this.#requested.bottom.size = initialSize;
    this.#requested.bottom.min = minSize;
    this.#bottomRegion.style.borderTop = '1px solid #3e3e3e';
    this.#splitCB.setMinSizes(0, minSize);
    this.#splitCB.setPrimarySize(initialSize);
    this.#splitCB.setSplitterVisible(true);
  }

  /**
   * Ensure the left panel infrastructure exists.
   * @private
   */
  #ensureLeftPanel(options = {}) {
    const initialSize = typeof options.initialSize === 'number' ? options.initialSize : 300;
    const minSize = typeof options.minSize === 'number' ? options.minSize : 180;
    this.#minLeft = minSize;
    this.#requested.left.visible = true;
    this.#requested.left.size = initialSize;
    this.#requested.left.min = minSize;
    this.#leftPanelWrapper.style.borderRight = '1px solid #3e3e3e';
    this.#splitLM.setMinSizes(minSize, 0);
    if (this.#splitLM.getPrimarySize() < 1) {
      this.#splitLM.setPrimarySize(initialSize);
    }
    this.#splitLM.setSplitterVisible(true);
    return this.#leftPanelWrapper;
  }

  /**
   * Ensure the right panel infrastructure exists.
   * @private
   */
  #ensureRightPanel(options = {}) {
    const initialSize = typeof options.initialSize === 'number' ? options.initialSize : 300;
    const minSize = typeof options.minSize === 'number' ? options.minSize : 200;
    this.#minRight = minSize;
    this.#requested.right.visible = true;
    this.#requested.right.size = initialSize;
    this.#requested.right.min = minSize;
    this.#rightPanelWrapper.style.borderLeft = '1px solid #3e3e3e';
    this.#splitMR.setMinSizes(0, minSize);
    if (this.#splitMR.getPrimarySize() < 1) {
      this.#splitMR.setPrimarySize(initialSize);
    }
    this.#splitMR.setSplitterVisible(true);
    return this.#rightPanelWrapper;
  }

  #scheduleRelayout() {
    if (this.#relayoutRaf !== null) return;
    this.#relayoutRaf = requestAnimationFrame(() => {
      this.#relayoutRaf = null;
      this.#applyRequestedLayout();
    });
  }

  #applyRequestedLayout() {
    // LEFT
    if (this.#requested.left.visible) {
      this.#leftPanelWrapper.style.borderRight = '1px solid #3e3e3e';
      this.#splitLM.setSplitterVisible(true);
      this.#splitLM.setMinSizes(this.#requested.left.min, 0);
      this.#splitLM.setPrimarySize(this.#requested.left.size);
    }

    // RIGHT
    if (this.#requested.right.visible) {
      this.#rightPanelWrapper.style.borderLeft = '1px solid #3e3e3e';
      this.#splitMR.setSplitterVisible(true);
      this.#splitMR.setMinSizes(0, this.#requested.right.min);
      this.#splitMR.setPrimarySize(this.#requested.right.size);
    }

    // TOP
    if (this.#requested.top.visible) {
      this.#topRegion.style.borderBottom = '1px solid #3e3e3e';
      this.#splitTC.setSplitterVisible(true);
      this.#splitTC.setMinSizes(this.#requested.top.min, 0);
      this.#splitTC.setPrimarySize(this.#requested.top.size);
    }

    // BOTTOM
    if (this.#requested.bottom.visible) {
      this.#bottomRegion.style.borderTop = '1px solid #3e3e3e';
      this.#splitCB.setSplitterVisible(true);
      this.#splitCB.setMinSizes(0, this.#requested.bottom.min);
      this.#splitCB.setPrimarySize(this.#requested.bottom.size);
    }
  }

  /**
   * Set visibility of panel slots.
   * 
   * @param {Object} visibility - Visibility settings
   * @param {boolean} [visibility.left] - Show left panel
   * @param {boolean} [visibility.right] - Show right panel
   * @param {boolean} [visibility.top] - Show top panel
   */
  setPanelVisibility(visibility) {
    if (visibility.left !== undefined) {
      if (visibility.left) {
        this.#requested.left.visible = true;
        this.#leftPanelWrapper.style.borderRight = '1px solid #3e3e3e';
        this.#splitLM.setSplitterVisible(true);
        this.#splitLM.setMinSizes(this.#minLeft, 0);
        this.#requested.left.size = this.#requested.left.size || 300;
        this.#splitLM.setPrimarySize(this.#requested.left.size);
      } else {
        this.#requested.left.visible = false;
        this.#splitLM.setMinSizes(0, 0);
        this.#splitLM.setPrimarySize(0);
        this.#splitLM.setSplitterVisible(false);
        this.#leftPanelWrapper.style.borderRight = 'none';
      }
    }

    if (visibility.right !== undefined) {
      if (visibility.right) {
        this.#requested.right.visible = true;
        this.#rightPanelWrapper.style.borderLeft = '1px solid #3e3e3e';
        this.#splitMR.setSplitterVisible(true);
        this.#splitMR.setMinSizes(0, this.#minRight);
        this.#requested.right.size = this.#requested.right.size || 300;
        this.#splitMR.setPrimarySize(this.#requested.right.size);
      } else {
        this.#requested.right.visible = false;
        this.#splitMR.setMinSizes(0, 0);
        this.#splitMR.setPrimarySize(0);
        this.#splitMR.setSplitterVisible(false);
        this.#rightPanelWrapper.style.borderLeft = 'none';
      }
    }

    if (visibility.top !== undefined) {
      // Never hide the top region if it contains content (like menubar)
      // This prevents accidentally hiding the menubar which would make it impossible to restore
      const hasContent = this.#topRegion.children.length > 0;
      if (visibility.top === false && hasContent) {
        // Top region has content, don't hide it - just skip this update
        // Ensure it stays visible
        this.#requested.top.visible = true;
        this.#topRegion.style.borderBottom = '1px solid #3e3e3e';
        this.#splitTC.setSplitterVisible(true);
        this.#splitTC.setMinSizes(this.#minTop, 0);
        this.#requested.top.size = this.#requested.top.size || 44;
        this.#splitTC.setPrimarySize(this.#requested.top.size);
      } else if (visibility.top) {
        this.#requested.top.visible = true;
        this.#topRegion.style.borderBottom = '1px solid #3e3e3e';
        this.#splitTC.setSplitterVisible(true);
        this.#splitTC.setMinSizes(this.#minTop, 0);
        this.#requested.top.size = this.#requested.top.size || 44;
        this.#splitTC.setPrimarySize(this.#requested.top.size);
      } else {
        this.#requested.top.visible = false;
        this.#splitTC.setMinSizes(0, 0);
        this.#splitTC.setPrimarySize(0);
        this.#splitTC.setSplitterVisible(false);
        this.#topRegion.style.borderBottom = 'none';
      }
    }

    if (visibility.bottom !== undefined) {
      if (visibility.bottom) {
        this.#requested.bottom.visible = true;
        this.#bottomRegion.style.borderTop = '1px solid #3e3e3e';
        this.#splitCB.setSplitterVisible(true);
        this.#splitCB.setMinSizes(0, this.#minBottom);
        this.#requested.bottom.size = this.#requested.bottom.size || 180;
        this.#splitCB.setPrimarySize(this.#requested.bottom.size);
      } else {
        this.#requested.bottom.visible = false;
        this.#splitCB.setMinSizes(0, 0);
        this.#splitCB.setPrimarySize(0);
        this.#splitCB.setSplitterVisible(false);
        this.#bottomRegion.style.borderTop = 'none';
      }
    }
    
    // Always ensure top region is visible if it has content, regardless of visibility settings
    // This is a safety check to prevent the menubar from disappearing
    if (this.#topRegion.children.length > 0) {
      if (this.#splitTC.getPrimarySize() < 1) {
        this.#requested.top.visible = true;
        this.#topRegion.style.borderBottom = '1px solid #3e3e3e';
        this.#splitTC.setSplitterVisible(true);
        this.#requested.top.size = this.#requested.top.size || 44;
        this.#splitTC.setPrimarySize(this.#requested.top.size);
      }
    }

    // One more pass after layout, to handle startup ordering in environments like the gallery runner.
    this.#scheduleRelayout();
  }
}
