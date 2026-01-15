/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * DisposableCollection - manages cleanup callbacks and disposable objects.
 * Similar to VS Code's Disposable pattern: add() returns a function to remove
 * the disposable, and dispose() cleans up everything.
 */
export class DisposableCollection {
  #disposables = new Set();

  /**
   * Add a disposable to the collection.
   * Accepts either a cleanup function or an object with dispose().
   * Returns a function that removes the entry without disposing it.
   * @param {Function|{dispose:Function}} disposable
   * @returns {Function} Removal function
   */
  add(disposable) {
    if (!disposable) {
      return () => {};
    }

    const entry = typeof disposable === 'function'
      ? disposable
      : () => {
          if (typeof disposable.dispose === 'function') {
            disposable.dispose();
          }
        };

    this.#disposables.add(entry);
    return () => {
      this.#disposables.delete(entry);
    };
  }

  /**
   * Dispose all registered disposables.
   */
  dispose() {
    for (const entry of Array.from(this.#disposables)) {
      this.#disposables.delete(entry);
      try {
        entry();
      } catch (error) {
        console.error('Error disposing resource:', error);
      }
    }
  }
}


