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
    style.textContent = this.#getStyles();
    document.head.appendChild(style);
    this.#styleElement = style;
  }

  #removeStyles() {
    if (this.#styleElement && this.#styleElement.parentNode) {
      this.#styleElement.parentNode.removeChild(this.#styleElement);
    }
    this.#styleElement = null;
  }

  #getStyles() {
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
      
      .sg-tree-type {
        font-size: 10px;
        color: #858585;
        margin-left: 8px;
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
      
      .sg-prop-value input[type="checkbox"] {
        margin: 0;
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
    `;
  }
}


