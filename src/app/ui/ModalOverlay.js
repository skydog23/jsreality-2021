/**
 * ModalOverlay - Simple reusable modal overlay component.
 *
 * Provides a centered dialog card on top of a semi-transparent backdrop.
 * Callers can inject arbitrary content (for example, descriptor-driven
 * panels) into the dialog and configure basic close behaviors.
 */

export class ModalOverlay {
  /** @type {HTMLElement} */
  #overlay;

  /** @type {HTMLElement} */
  #dialog;

  /** @type {boolean} */
  #closeOnBackdrop;

  /** @type {boolean} */
  #isOpen = true;

  /** @type {((event?: KeyboardEvent) => void)|null} */
  #keyDownListener = null;

  /** @type {Function[]} */
  #onCloseCallbacks = [];

  /**
   * @param {Object} [options]
   * @param {number} [options.minWidth=320] - Minimum dialog width in CSS pixels
   * @param {number} [options.maxWidth=520] - Maximum dialog width in CSS pixels
   * @param {boolean} [options.closeOnBackdrop=true] - Close when clicking outside the dialog
   * @param {boolean} [options.closeOnEscape=true] - Close when pressing Escape
   * @param {string} [options.backgroundColor='rgba(0, 0, 0, 0.35)'] - Backdrop color
   */
  constructor(options = {}) {
    const {
      minWidth = 320,
      maxWidth = 520,
      closeOnBackdrop = true,
      closeOnEscape = true,
      backgroundColor = 'rgba(0, 0, 0, 0.35)'
    } = options;

    this.#closeOnBackdrop = closeOnBackdrop !== false;

    // Backdrop
    const overlay = document.createElement('div');
    overlay.className = 'jsr-modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = backgroundColor;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '1000';

    // Dialog card
    const dialog = document.createElement('div');
    dialog.className = 'jsr-modal-dialog';
    dialog.style.minWidth = `${minWidth}px`;
    dialog.style.maxWidth = `${maxWidth}px`;
    dialog.style.backgroundColor = '#ffffff';
    dialog.style.borderRadius = '6px';
    dialog.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)';
    dialog.style.padding = '8px 8px 12px 8px';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    this.#overlay = overlay;
    this.#dialog = dialog;

    // Backdrop click to close
    if (this.#closeOnBackdrop) {
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          this.close();
        }
      });
    }

    // Escape key to close
    if (closeOnEscape) {
      this.#keyDownListener = (event) => {
        if (event.key === 'Escape') {
          this.close();
        }
      };
      window.addEventListener('keydown', this.#keyDownListener);
    }
  }

  /**
   * Get the dialog element where content should be inserted.
   * Callers can append their own DOM tree here.
   *
   * @returns {HTMLElement}
   */
  getDialogElement() {
    return this.#dialog;
  }

  /**
   * Replace dialog contents with the given element.
   *
   * @param {HTMLElement} element
   */
  setContent(element) {
    if (!this.#dialog) return;
    this.#dialog.innerHTML = '';
    if (element) {
      this.#dialog.appendChild(element);
    }
  }

  /**
   * Register a callback to be invoked when the modal closes.
   *
   * @param {Function} callback
   */
  onClose(callback) {
    if (typeof callback === 'function') {
      this.#onCloseCallbacks.push(callback);
    }
  }

  /**
   * Close the modal overlay and clean up listeners.
   */
  close() {
    if (!this.#isOpen) return;
    this.#isOpen = false;

    if (this.#keyDownListener) {
      window.removeEventListener('keydown', /** @type {EventListener} */ (this.#keyDownListener));
      this.#keyDownListener = null;
    }

    if (this.#overlay && this.#overlay.parentNode) {
      this.#overlay.parentNode.removeChild(this.#overlay);
    }

    const callbacks = this.#onCloseCallbacks.slice();
    this.#onCloseCallbacks.length = 0;
    for (const cb of callbacks) {
      try {
        cb();
      } catch (error) {
        // Swallow to avoid breaking caller code paths
        // eslint-disable-next-line no-console
        console.warn('ModalOverlay onClose callback threw', error);
      }
    }
  }
}
