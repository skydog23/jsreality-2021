/**
 * PluginLayoutManager - centralized layout orchestration for plugin UI surfaces.
 * Creates common regions (top toolbar stack, left side panels, viewer host) so that
 * plugins and applications no longer need to manipulate DOM structure directly.
 *
 * Uses simple flexbox layout (no split panes) - panels are positioned with fixed widths.
 * Similar to jReality's approach.
 */

export class PluginLayoutManager {
  /** @type {HTMLElement} */
  #container;

  /** @type {HTMLElement} */
  #topRegion;

  /** @type {HTMLElement} */
  #bottomRegion;

  /** @type {HTMLElement} */
  #centerColumn; // Vertical flex container: top | viewer | bottom

  /** @type {HTMLElement} */
  #viewerHost;

  /** @type {HTMLElement|null} */
  #leftPanelWrapper = null;

  /** @type {HTMLElement|null} */
  #rightPanelWrapper = null;

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
    // Feature 1: Left - (top/center/bottom column) - Right
    this.#container.style.flexDirection = 'row';
    this.#container.style.width = '100%';
    this.#container.style.height = '100%';
    this.#container.style.minHeight = '0';
    this.#container.style.minWidth = '0';

    // Center column (always present): top | viewer | bottom
    this.#centerColumn = document.createElement('div');
    this.#centerColumn.className = 'jsr-layout-center-column';
    this.#centerColumn.style.display = 'flex';
    this.#centerColumn.style.flexDirection = 'column';
    this.#centerColumn.style.flex = '1 1 auto';
    this.#centerColumn.style.minHeight = '0';
    this.#centerColumn.style.minWidth = '0';

    // Top region for menubar/toolbars (center column only).
    this.#topRegion = document.createElement('div');
    this.#topRegion.className = 'jsr-layout-top';
    this.#topRegion.style.display = 'none';
    this.#topRegion.style.flex = '0 0 auto';
    this.#topRegion.style.width = '100%';
    this.#topRegion.style.flexDirection = 'column';
    this.#topRegion.style.background = '#252526';
    this.#topRegion.style.borderBottom = '1px solid #3e3e3e';

    // Bottom region for wide, short panels (center column only).
    this.#bottomRegion = document.createElement('div');
    this.#bottomRegion.className = 'jsr-layout-bottom';
    this.#bottomRegion.style.display = 'none';
    this.#bottomRegion.style.flex = '0 0 auto';
    this.#bottomRegion.style.width = '100%';
    this.#bottomRegion.style.background = '#1e1e1e';
    this.#bottomRegion.style.borderTop = '1px solid #3e3e3e';
    this.#bottomRegion.style.overflow = 'hidden';

    // Viewer host (center area; takes remaining space inside center column)
    this.#viewerHost = document.createElement('div');
    this.#viewerHost.className = 'jsr-layout-viewer-host';
    this.#viewerHost.style.flex = '1 1 auto';
    // In the center column (flex-direction: column), width is the cross-axis.
    // Keep it at 100% so the viewer fills the column.
    this.#viewerHost.style.width = '100%';
    this.#viewerHost.style.height = '100%';
    this.#viewerHost.style.position = 'relative';
    this.#viewerHost.style.minHeight = '0';
    this.#viewerHost.style.minWidth = '0';

    // Assemble center column, then mount it. Left/right columns are inserted lazily.
    this.#centerColumn.appendChild(this.#topRegion);
    this.#centerColumn.appendChild(this.#viewerHost);
    this.#centerColumn.appendChild(this.#bottomRegion);
    this.#container.appendChild(this.#centerColumn);
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
  #activateTopRegion() {
    if (this.#topRegion.style.display !== 'flex') {
      this.#topRegion.style.display = 'flex';
    }
  }

  /**
   * Makes the bottom region visible the first time something requests it.
   * @private
   */
  #activateBottomRegion(options = {}) {
    const initialSize = typeof options.initialSize === 'number' ? options.initialSize : 180;
    if (this.#bottomRegion.style.display !== 'flex') {
      this.#bottomRegion.style.display = 'flex';
    }
    this.#bottomRegion.style.height = `${initialSize}px`;
    this.#bottomRegion.style.flexShrink = '0';
  }

  /**
   * Ensure the left panel infrastructure exists.
   * @private
   */
  #ensureLeftPanel(options = {}) {
    if (!this.#leftPanelWrapper) {
      const initialSize = typeof options.initialSize === 'number' ? options.initialSize : 300;
      
      this.#leftPanelWrapper = document.createElement('div');
      this.#leftPanelWrapper.className = 'jsr-layout-left-panel';
      this.#leftPanelWrapper.style.display = 'flex';
      this.#leftPanelWrapper.style.flexDirection = 'column';
      this.#leftPanelWrapper.style.width = `${initialSize}px`;
      this.#leftPanelWrapper.style.flexShrink = '0'; // Fixed width
      this.#leftPanelWrapper.style.height = '100%';
      this.#leftPanelWrapper.style.minHeight = '0';
      this.#leftPanelWrapper.style.background = '#1e1e1e';
      this.#leftPanelWrapper.style.borderRight = '1px solid #3e3e3e';
      this.#leftPanelWrapper.style.overflow = 'hidden';

      // Insert before center column
      this.#container.insertBefore(this.#leftPanelWrapper, this.#centerColumn);
    }
    return this.#leftPanelWrapper;
  }

  /**
   * Ensure the right panel infrastructure exists.
   * @private
   */
  #ensureRightPanel(options = {}) {
    if (!this.#rightPanelWrapper) {
      const initialSize = typeof options.initialSize === 'number' ? options.initialSize : 300;
      
      this.#rightPanelWrapper = document.createElement('div');
      this.#rightPanelWrapper.className = 'jsr-layout-right-panel';
      this.#rightPanelWrapper.style.display = 'flex';
      this.#rightPanelWrapper.style.flexDirection = 'column';
      this.#rightPanelWrapper.style.width = `${initialSize}px`;
      this.#rightPanelWrapper.style.flexShrink = '0'; // Fixed width
      this.#rightPanelWrapper.style.height = '100%';
      this.#rightPanelWrapper.style.minHeight = '0';
      this.#rightPanelWrapper.style.background = '#1e1e1e';
      this.#rightPanelWrapper.style.borderLeft = '1px solid #3e3e3e';
      this.#rightPanelWrapper.style.overflow = 'hidden';

      // Append after center column
      this.#container.appendChild(this.#rightPanelWrapper);
    }
    return this.#rightPanelWrapper;
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
    if (this.#leftPanelWrapper !== null && visibility.left !== undefined) {
      this.#leftPanelWrapper.style.display = visibility.left ? 'flex' : 'none';
    }
    if (this.#rightPanelWrapper !== null && visibility.right !== undefined) {
      this.#rightPanelWrapper.style.display = visibility.right ? 'flex' : 'none';
    }
    if (this.#topRegion !== null && visibility.top !== undefined) {
      // Never hide the top region if it contains content (like menubar)
      // This prevents accidentally hiding the menubar which would make it impossible to restore
      const hasContent = this.#topRegion.children.length > 0;
      if (visibility.top === false && hasContent) {
        // Top region has content, don't hide it - just skip this update
        // Ensure it stays visible
        if (this.#topRegion.style.display === 'none') {
          this.#topRegion.style.display = 'flex';
        }
      } else {
        this.#topRegion.style.display = visibility.top ? 'flex' : 'none';
      }
    }

    if (this.#bottomRegion !== null && visibility.bottom !== undefined) {
      this.#bottomRegion.style.display = visibility.bottom ? 'flex' : 'none';
    }
    
    // Always ensure top region is visible if it has content, regardless of visibility settings
    // This is a safety check to prevent the menubar from disappearing
    if (this.#topRegion !== null && this.#topRegion.children.length > 0) {
      if (this.#topRegion.style.display === 'none') {
        this.#topRegion.style.display = 'flex';
      }
    }
  }
}
