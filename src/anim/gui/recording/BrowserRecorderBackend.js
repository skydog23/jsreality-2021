/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * Simple browser recorder backend:
 * - If a canvas is provided, it converts it to a Blob and triggers a download per frame.
 * - If no canvas is provided, it does nothing (still keeps the hook point consistent).
 *
 * This is intentionally minimal and safe: no File System Access API, no zip bundling.
 *
 * @implements {import('./RecorderBackend.js').RecorderBackend}
 */
import { getLogger, Category } from '../../../core/util/LoggingSystem.js';

const logger = getLogger('jsreality.anim.gui.recording.BrowserRecorderBackend');

export class BrowserRecorderBackend {
  /**
   * @param {{ mimeType?: string, quality?: number }} [options]
   */
  constructor(options = {}) {
    this.mimeType = options.mimeType || 'image/png';
    this.quality = options.quality;
  }

  /**
   * @param {{ frame: number, time: number, filename: string, prefs: any, canvas?: any }} info
   * @returns {Promise<void>}
   */
  async saveFrame(info) {
    const canvas = info?.canvas;
    const filename = String(info?.filename ?? `frame-${info?.frame ?? 0}.png`);
    if (!canvas || typeof canvas.toBlob !== 'function') {
      logger.finer(Category.ALL, 'saveFrame: no canvas/toBlob (nothing to download)', {
        hasCanvas: Boolean(canvas),
        canvasType: canvas?.constructor?.name ?? null
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
      logger.warn(Category.ALL, 'saveFrame: toBlob returned null/failed', { filename });
      return;
    }

    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.split('/').pop() || filename;
      // Don’t attach to DOM; most browsers accept programmatic click.
      a.click();
      logger.fine(Category.ALL, 'download triggered', { filename: a.download, size: blob.size });
    } finally {
      // Revoke in a microtask to avoid revoking before navigation/click completes.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }

  /**
   * @param {{ prefs: any, suggestedOutputFile?: string }} _info
   * @returns {void}
   */
  finalize(_info) {
    // In browser we intentionally do not build videos (ffmpeg unavailable).
    // Future option: integrate server-side encoding or ffmpeg.wasm.
  }
}


