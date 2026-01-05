/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * Browser recorder backend using the File System Access API (Chromium).
 *
 * Workflow:
 * - Caller triggers a user gesture and obtains a directory handle via:
 *     const dir = await window.showDirectoryPicker();
 * - Caller sets it on this backend via `setDirectoryHandle(dir)`.
 * - Each `saveFrame()` writes an image file into that directory.
 *
 * Fallback:
 * - If File System Access isn’t supported, use BrowserRecorderBackend instead.
 *
 * @implements {import('./RecorderBackend.js').RecorderBackend}
 */

import { getLogger, Category } from '../../../core/util/LoggingSystem.js';

const logger = getLogger('jsreality.anim.gui.recording.FileSystemAccessRecorderBackend');

export class FileSystemAccessRecorderBackend {
  /** @type {FileSystemDirectoryHandle|null} */
  #dirHandle = null;

  /**
   * @param {{ dirHandle?: FileSystemDirectoryHandle, mimeType?: string, quality?: number }} [options]
   */
  constructor(options = {}) {
    this.mimeType = options.mimeType || 'image/png';
    this.quality = options.quality;
    this.#dirHandle = options.dirHandle ?? null;
  }

  static isSupported() {
    return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
  }

  /**
   * @param {FileSystemDirectoryHandle|null} dirHandle
   */
  setDirectoryHandle(dirHandle) {
    this.#dirHandle = dirHandle ?? null;
  }

  getDirectoryHandle() {
    return this.#dirHandle;
  }

  /**
   * @param {{ frame: number, time: number, filename: string, prefs: any, canvas?: any }} info
   * @returns {Promise<void>}
   */
  async saveFrame(info) {
    const dir = this.#dirHandle;
    if (!dir) {
      logger.finer(Category.ALL, 'saveFrame: no directory handle (nothing will be written)');
      return;
    }

    // Ensure we have readwrite permission (may prompt).
    try {
      if (typeof dir.queryPermission === 'function') {
        const status = await dir.queryPermission({ mode: 'readwrite' });
        logger.finest(Category.ALL, 'permission status', status);
        if (status !== 'granted' && typeof dir.requestPermission === 'function') {
          const req = await dir.requestPermission({ mode: 'readwrite' });
          logger.finest(Category.ALL, 'permission request result', req);
          if (req !== 'granted') return;
        }
      }
    } catch {
      // If permission APIs throw, just attempt the write and let it fail gracefully.
    }

    const canvas = info?.canvas;
    if (!canvas || typeof canvas.toBlob !== 'function') {
      logger.finer(Category.ALL, 'saveFrame: no canvas/toBlob (did renderOffscreen fail or wrong viewer?)', {
        hasCanvas: Boolean(canvas),
        canvasType: canvas?.constructor?.name ?? null,
        hasToBlob: Boolean(canvas && typeof canvas.toBlob === 'function')
      });
      return;
    }

    const blob = await new Promise((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), this.mimeType, this.quality);
      } catch {
        resolve(null);
      }
    });
    if (!blob) {
      logger.warn(Category.ALL, 'saveFrame: toBlob returned null/failed');
      return;
    }

    // Use basename only; directory is chosen by handle.
    const full = String(info?.filename ?? `frame-${info?.frame ?? 0}.png`);
    const base = full.split('/').pop() || full;
    logger.fine(Category.ALL, 'writing file', { base, mimeType: this.mimeType, size: blob.size });

    try {
      const fileHandle = await dir.getFileHandle(base, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      logger.fine(Category.ALL, 'write ok', { base });
    } catch {
      // ignore write errors (permission revoked, quota, etc.)
      logger.warn(Category.ALL, 'write failed', { base });
    }
  }

  /**
   * @param {{ prefs: any, suggestedOutputFile?: string }} _info
   * @returns {void}
   */
  finalize(_info) {
    // No-op in browser: encoding is not handled here.
  }
}


