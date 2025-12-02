/**
 * PluginLayoutManager - centralized layout orchestration for plugin UI surfaces.
 * Creates common regions (top toolbar stack, left side panels, viewer host) so that
 * plugins and applications no longer need to manipulate DOM structure directly.
 *
 * Day-1 goals:
 *   - Provide a stable host element for ViewerSwitch.
 *   - Expose a stacked "top" region for items like the menubar.
 *   - Expose a resizable left side panel for inspectors or similar plugins.
 *
 * Future enhancements (collapsible panels, floating popovers, etc.) can layer on top
 * of this manager without changing the consumer APIs.
 */

import { SplitPane } from '../ui/SplitPane.js';

export class PluginLayoutManager {
  /** @type {HTMLElement} */
  #container;

  /** @type {HTMLElement} */
  #topRegion;

  /** @type {HTMLElement} */
  #mainRegion;

  /** @type {HTMLElement} */
  #splitContainer;

  /** @type {HTMLElement} */
  #viewerHost;

  /** @type {HTMLElement|null} */
  #leftPanelWrapper = null;

  /** @type {SplitPane|null} */
  #splitPane = null;

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
   * Currently supported regions: 'top', 'left'.
   *
   * @param {string} regionName
   * @param {Object} [options]
   * @param {string} [options.id] - Optional stable identifier to reuse a slot.
   * @param {number} [options.initialSize] - Initial pixel size for resizable regions.
   * @param {number} [options.minSize] - Minimum pixel size for resizable regions.
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
      case 'top':
        slot = this.#createTopSlot(options);
        break;
      case 'left':
        slot = this.#createLeftSlot(options);
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
    this.#container.style.flexDirection = 'column';
    this.#container.style.width = '100%';
    this.#container.style.height = '100%';
    this.#container.style.minHeight = '0';
    this.#container.style.minWidth = '0';

    this.#topRegion = document.createElement('div');
    this.#topRegion.className = 'jsr-layout-top';
    this.#topRegion.style.display = 'none';
    this.#topRegion.style.flex = '0 0 auto';
    this.#topRegion.style.width = '100%';
    this.#topRegion.style.flexDirection = 'column';
    this.#topRegion.style.background = '#252526';
    this.#topRegion.style.borderBottom = '1px solid #3e3e3e';

    this.#mainRegion = document.createElement('div');
    this.#mainRegion.className = 'jsr-layout-main';
    this.#mainRegion.style.flex = '1 1 auto';
    this.#mainRegion.style.minHeight = '0';
    this.#mainRegion.style.display = 'flex';
    this.#mainRegion.style.flexDirection = 'column';
    this.#mainRegion.style.position = 'relative';

    this.#splitContainer = document.createElement('div');
    this.#splitContainer.className = 'jsr-layout-main-content';
    this.#splitContainer.style.flex = '1 1 auto';
    this.#splitContainer.style.display = 'flex';
    this.#splitContainer.style.flexDirection = 'column';
    this.#splitContainer.style.minHeight = '0';
    this.#splitContainer.style.width = '100%';
    this.#splitContainer.style.height = '100%';

    this.#viewerHost = document.createElement('div');
    this.#viewerHost.className = 'jsr-layout-viewer-host';
    this.#viewerHost.style.flex = '1 1 auto';
    this.#viewerHost.style.width = '100%';
    this.#viewerHost.style.height = '100%';
    this.#viewerHost.style.position = 'relative';
    this.#viewerHost.style.minHeight = '0';
    this.#viewerHost.style.minWidth = '0';

    this.#splitContainer.appendChild(this.#viewerHost);

    this.#container.appendChild(this.#topRegion);
    this.#container.appendChild(this.#mainRegion);
    this.#mainRegion.appendChild(this.#splitContainer);
  }

  /**
   * Ensure the top stack is visible and return a dedicated slot.
   * @private
   */
  #createTopSlot(options) {
    this.#activateTopRegion();

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
   * Creates/returns a left side slot, activating the SplitPane when needed.
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
   * Makes the top region visible the first time something requests it.
   * @private
   */
  #activateTopRegion() {
    if (this.#topRegion.style.display !== 'flex') {
      this.#topRegion.style.display = 'flex';
    }
  }

  /**
   * Ensure the left panel infrastructure exists and is wired to the SplitPane.
   * @private
   */
  #ensureLeftPanel(options = {}) {
    if (!this.#leftPanelWrapper) {
      this.#leftPanelWrapper = document.createElement('div');
      this.#leftPanelWrapper.className = 'jsr-layout-left-panel';
      this.#leftPanelWrapper.style.display = 'flex';
      this.#leftPanelWrapper.style.flexDirection = 'column';
      this.#leftPanelWrapper.style.width = '100%';
      this.#leftPanelWrapper.style.height = '100%';
      this.#leftPanelWrapper.style.minHeight = '0';
      this.#leftPanelWrapper.style.background = '#1e1e1e';
      this.#leftPanelWrapper.style.borderRight = '1px solid #3e3e3e';
    }

    this.#activateSplitPane(options);
    return this.#leftPanelWrapper;
  }

  /**
   * Instantiate the SplitPane (viewer + left panel) if it hasn't been created yet.
   * @private
   */
  #activateSplitPane(options = {}) {
    if (this.#splitPane) {
      if (typeof options.initialSize === 'number') {
        this.#splitPane.setLeftPanelSize(options.initialSize);
      }
      return;
    }

    const initialSize = typeof options.initialSize === 'number' ? options.initialSize : 320;
    const minSize = typeof options.minSize === 'number' ? options.minSize : 180;

    // Clear existing children (viewer host) before SplitPane re-inserts them.
    if (this.#viewerHost.parentElement === this.#splitContainer) {
      this.#splitContainer.removeChild(this.#viewerHost);
    }
    this.#splitContainer.innerHTML = '';

    this.#splitPane = new SplitPane(this.#splitContainer, {
      leftPanel: this.#leftPanelWrapper,
      rightPanel: this.#viewerHost,
      orientation: 'horizontal',
      initialSize,
      minSize,
      splitterWidth: 4
    });
  }
}

