/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

const LEGACY_INSPECTOR_CSS_URL = new URL(
  '../../../css/retrievedCSSStyles.css',
  import.meta.url
);

/**
 * Manages shared stylesheet injection for inspector-related UI.
 * Ensures the CSS is only inserted once and removed when no longer needed.
 */
export class InspectorStylesheetManager {
  static #instance;

  /** @type {HTMLStyleElement|null} */
  #styleElement = null;

  /** @type {number} */
  #refCount = 0;

  /** @type {string|null} */
  #legacyStyles = null;

  /** @type {Promise<string>|null} */
  #legacyStylesPromise = null;

  static getInstance() {
    if (!InspectorStylesheetManager.#instance) {
      InspectorStylesheetManager.#instance = new InspectorStylesheetManager();
    }
    return InspectorStylesheetManager.#instance;
  }

  acquire() {
    this.#refCount += 1;
    if (!this.#styleElement) {
      this.#injectStyles();
    }
  }

  release() {
    this.#refCount = Math.max(0, this.#refCount - 1);
    if (this.#refCount === 0) {
      this.#removeStyles();
    }
  }

  #injectStyles() {
    if (typeof document === 'undefined') {
      return;
    }
    const style = document.createElement('style');
    style.id = 'sg-inspector-styles';
    style.textContent = this.#getBaseStyles();
    document.head.appendChild(style);
    this.#styleElement = style;

    this.#loadLegacyStyles()
      .then((cssText) => {
        if (!cssText || !this.#styleElement) return;
        this.#styleElement.textContent += `\n${cssText}`;
      })
      .catch((error) => {
        console.warn(
          'InspectorStylesheetManager: failed to load legacy inspector CSS',
          error
        );
      });
  }

  #removeStyles() {
    if (this.#styleElement && this.#styleElement.parentNode) {
      this.#styleElement.parentNode.removeChild(this.#styleElement);
    }
    this.#styleElement = null;
  }

  async #loadLegacyStyles() {
    if (this.#legacyStyles) {
      return this.#legacyStyles;
    }
    if (this.#legacyStylesPromise) {
      return this.#legacyStylesPromise;
    }
    if (typeof fetch === 'undefined') {
      console.warn(
        'InspectorStylesheetManager: fetch is unavailable; legacy inspector CSS not loaded.'
      );
      this.#legacyStyles = '';
      return this.#legacyStyles;
    }

    this.#legacyStylesPromise = fetch(LEGACY_INSPECTOR_CSS_URL)
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        return resp.text();
      })
      .then((text) => {
        this.#legacyStyles = text;
        this.#legacyStylesPromise = null;
        return text;
      })
      .catch((err) => {
        console.warn(
          'InspectorStylesheetManager: unable to fetch legacy inspector CSS',
          err
        );
        this.#legacyStylesPromise = null;
        this.#legacyStyles = '';
        return '';
      });

    return this.#legacyStylesPromise;
  }

  #getBaseStyles() {
    return `
      .sg-inspector {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        color: #cccccc;
        background: #1e1e1e;
        overflow: hidden;
      }
      
      .sg-tree-panel {
        flex: 0 0 50%;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .sg-divider {
        height: 4px;
        background: #3e3e3e;
        cursor: ns-resize;
        flex-shrink: 0;
      }
      
      .sg-divider:hover {
        background: #007acc;
      }
      
      .sg-property-panel {
        flex: 1;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .sg-panel-header {
        padding: 8px 12px;
        background: #2d2d2d;
        border-bottom: 1px solid #3e3e3e;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .sg-tree-view {
        flex: 1;
        overflow-y: auto;
        padding: 4px;
        pointer-events: auto;
      }
      
      .sg-tree-node {
        user-select: none;
        cursor: pointer;
        pointer-events: auto;
      }
      
      .sg-tree-node-header {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 3px;
        transition: background 0.1s;
        pointer-events: auto;
        position: relative;
        z-index: 1;
      }
      
      .sg-tree-node-header:hover {
        background: #2d2d2d;
      }
      
      .sg-tree-node-header.selected {
        background: #094771;
      }
      
      .sg-tree-expand {
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-right: 4px;
        font-size: 10px;
      }
      
      .sg-tree-expand.empty {
        visibility: hidden;
      }
      
      .sg-tree-icon {
        width: 16px;
        height: 16px;
        margin-right: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      .sg-tree-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .sg-tree-children {
        margin-left: 20px;
      }
      
      .sg-tree-children.collapsed {
        display: none;
      }
      
      .sg-properties {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }
      
      .sg-no-selection {
        color: #858585;
        text-align: center;
        padding: 40px 20px;
        font-style: italic;
      }
      
      .sg-prop-group {
        margin-bottom: 16px;
      }
      
      .sg-prop-group-title {
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        color: #858585;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
      }
      
      .sg-prop-row {
        display: flex;
        padding: 6px 8px;
        border-radius: 3px;
        margin-bottom: 2px;
      }
      
      .sg-prop-row:hover {
        background: #2d2d2d;
      }
      
      .sg-prop-label {
        flex: 0 0 120px;
        color: #9cdcfe;
        font-size: 12px;
      }
      
      .sg-prop-value {
        flex: 1;
        color: #ce9178;
        font-size: 12px;
        word-break: break-word;
      }
      
      .sg-prop-value input[type="text"]:not(.sg-number-widget-input),
      .sg-prop-value input[type="number"]:not(.sg-number-widget-input) {
        width: 100%;
        background: #3c3c3c;
        border: 1px solid #555;
        color: #cccccc;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
      }

      /* Narrow numeric inputs (override the generic width:100% rule above). */
      .sg-prop-value input.inspector-input--number:not(.sg-number-widget-input) {
        width: 4rem;
        max-width: 4rem;
      }
      
      .sg-prop-value input[type="checkbox"] {
        margin: 0;
      }

      /* ------------------------------------------------------------------- */
      /* ContainerDescriptor titled border ("group box") styling               */
      /* ------------------------------------------------------------------- */

      .inspector-container-group {
        position: relative;
        padding: 5px;
        border: 1px solid #555;
        border-radius: 4px;
        /* subtle etched feel */
        box-shadow: inset 0 0 0 1px #2d2d2d;
      }

      .inspector-container-group--titled {
        /* Leave room for the title label sitting on the border */
        padding-top: 10px;
      }

      .inspector-container-group__label {
        position: absolute;
        top: -0.75em;
        left: 10px;
        padding: 0 6px;
        background: #252526; /* match inspector panel background */
        color: #9cdcfe;      /* match .sg-prop-label */
        font-weight: 600;
        font-size: 11px;
        letter-spacing: 0.2px;
        opacity: 0.95;
        pointer-events: none;
      }
      
      .sg-matrix-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 11px;
      }
      
      .sg-matrix-cell {
        background: #2d2d2d;
        padding: 4px;
        border-radius: 2px;
        text-align: right;
      }
      
      .sg-button {
        background: #0e639c;
        color: white;
        border: none;
        padding: 4px 12px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        margin-top: 4px;
      }
      
      .sg-button:hover {
        background: #1177bb;
      }

      .sg-button--secondary {
        background: #3c3c3c;
        color: #cccccc;
        border: 1px solid #555;
      }

      .sg-button--secondary:hover {
        background: #4a4a4a;
      }

      /* Primary uses default .sg-button styling (blue); this is a hook for future refinement. */
      .sg-button--primary {
      }
      
      .sg-rotation-container .sg-number-input,
      .sg-vector-widget .sg-number-input {
        width: 60px;
      }
      
      .sg-tabbed-inspector {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e1e1e;
        color: #cccccc;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      
      .sg-tab-bar {
        display: flex;
        border-bottom: 1px solid #3e3e3e;
        background: #2d2d2d;
      }
      
      .sg-tab {
        padding: 8px 16px;
        cursor: pointer;
        font-size: 12px;
        border-bottom: 2px solid transparent;
        transition: border 0.1s;
      }
      
      .sg-tab:hover {
        background: #3a3a3a;
      }
      
      .sg-tab-active {
        border-bottom: 2px solid #0e639c;
        font-weight: 600;
      }
      
      .sg-tab-content-area {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      
      .sg-tab-content {
        position: absolute;
        inset: 0;
        display: none;
      }
      
      .sg-tab-content-active {
        display: block;
      }

      .sg-statistics-panel {
        padding: 16px;
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

      .inspector-text-slider__range {
        width: 100%;
      }

      .inspector-text-slider__bound {
        padding: 2px 8px;
        margin-top: 0;
        font-size: 10px;
        line-height: 1.2;
      }
    `;
  }
}


