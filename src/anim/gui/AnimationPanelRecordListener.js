/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { EventType } from './AnimationPanelEvent.js';
import { RecordingPreferences } from './RecordingPreferences.js';
import { BrowserRecorderBackend } from './recording/BrowserRecorderBackend.js';

/**
 * State-only port of `charlesgunn.anim.gui.AnimationPanelRecordListener`.
 *
 * Differences vs Java (intentional, per porting guidelines):
 * - No `BufferedImage`, no direct filesystem writes.
 * - No JOGL-only offscreen rendering assumption.
 * - No `Runtime.exec` / ffmpeg invocation; instead we expose hook callbacks.
 *
 * Typical usage in jsReality:
 * - Provide a `viewer` with a `renderOffscreen(width,height,options)` or similar API.
 * - Set `listener.onFrame = ({ canvas, filename, frame, time, prefs }) => { ... }`
 *   to handle saving/downloading/encoding in an environment-specific way.
 */
export class AnimationPanelRecordListener {
  /** @type {string} */
  #name = 'recorder';

  /** @type {any} */
  #viewer = null;

  /** @type {{ width: number, height: number }|null} */
  #currentDim = null;

  /** @type {boolean} */
  #recording = false;

  /** @type {boolean} */
  #testVideo = true;

  /**
   * Recorder backend (environment-specific). Defaults to a simple browser backend.
   * @type {import('./recording/RecorderBackend.js').RecorderBackend}
   */
  recorderBackend;

  constructor(viewer = null, name = 'recorder') {
    this.#viewer = viewer;
    this.#name = String(name ?? 'recorder');
    // Default to browser backend; Node backend can be injected by caller at runtime.
    this.recorderBackend = new BrowserRecorderBackend();
  }

  // ---------------------------------------------------------------------------
  // AnimationPanelListener contract
  // ---------------------------------------------------------------------------

  getName() {
    return this.#name;
  }

  printState() {
    // state-only; no-op
  }

  getState() {
    return {
      name: this.#name,
      recording: this.#recording,
      currentDim: this.#currentDim ? { ...this.#currentDim } : null,
      testVideo: this.#testVideo
    };
  }

  setState(o) {
    // Best-effort state restore
    if (!o || typeof o !== 'object') return;
    if (typeof o.name === 'string') this.#name = o.name;
    if (typeof o.recording === 'boolean') this.#recording = o.recording;
    if (o.currentDim && typeof o.currentDim === 'object') {
      const w = Number(o.currentDim.width);
      const h = Number(o.currentDim.height);
      if (Number.isFinite(w) && Number.isFinite(h)) {
        this.#currentDim = { width: w | 0, height: h | 0 };
      }
    }
    if (typeof o.testVideo === 'boolean') this.#testVideo = o.testVideo;
  }

  /**
   * @param {import('./AnimationPanelEvent.js').AnimationPanelEvent} e
   */
  actionPerformed(e) {
    const src = e?.source;
    switch (e?.type) {
      case EventType.PLAYBACK_STARTED: {
        if (src?.isRecording?.()) {
          this.#recording = true;
          const prefs = this.#getPrefsFromSource(src);
          this.#currentDim = prefs.getDimension();
          // Stereo doubling is a viewer/camera concern; only apply if viewer exposes it.
          try {
            const cam = this.#viewer?.getCamera?.() ?? null;
            const isStereo = Boolean(cam?.isStereo?.());
            if (isStereo && this.#currentDim) {
              this.#currentDim = { width: this.#currentDim.width * 2, height: this.#currentDim.height };
            }
          } catch {
            // ignore
          }
        }
        break;
      }

      case EventType.SET_VALUE_AT_TIME: {
        if (!src?.isRecording?.()) return;
        const prefs = this.#getPrefsFromSource(src);
        const time = Number(src?.getCurrentTime?.() ?? 0);
        const start = prefs.getStartTime();
        const end = prefs.getEndTime();
        if ((start >= 0 && start > time) || (end >= 0 && end < time)) return;

        const tick = Number(src?.getCurrentFrame?.() ?? 0) | 0;
        const num = this.#formatCount(tick + (prefs.getStartCount() | 0));
        const filename = this.#buildFilename(prefs, num);

        // If the viewer can render offscreen, do it; otherwise save metadata-only.
        const aa = prefs.getAntialiasing();
        const dim = this.#currentDim ?? prefs.getDimension();

        /** @param {any} canvas */
        const emit = (canvas) => {
          try {
            this.recorderBackend?.saveFrame?.({ frame: tick, time, filename, prefs, canvas, viewer: this.#viewer });
          } catch {
            // ignore backend errors
          }
        };

        try {
          // Standardize on renderOffscreen() (browser-safe). Screenshot variants are intentionally ignored.
          if (this.#viewer?.renderOffscreen) {
            const maybe = this.#viewer.renderOffscreen(dim.width, dim.height, { antialias: aa });
            // Support async renderOffscreen() (WebGL2DViewer.renderOffscreen is async).
            if (maybe && typeof maybe.then === 'function') {
              maybe.then((canvas) => emit(canvas)).catch(() => emit(undefined));
            } else {
              emit(maybe);
            }
          } else emit(undefined);
        } catch {
          emit(undefined);
        }
        break;
      }

      case EventType.PLAYBACK_COMPLETED: {
        if (this.#testVideo && this.#recording) {
          const prefs = this.#getPrefsFromSource(src);
          const stem = prefs.getStemName();
          const outputFile = `${stem}-ffmpeg.mp4`;
          try {
            this.recorderBackend?.finalize?.({ prefs, suggestedOutputFile: outputFile });
          } catch {
            // ignore backend errors
          }
          this.#recording = false;
        }
        break;
      }

      default:
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  #getPrefsFromSource(src) {
    // Prefer AnimationPanel parity method if present.
    const p = src?.getRecordPrefs?.();
    return p instanceof RecordingPreferences ? p : new RecordingPreferences();
  }

  #formatCount(n) {
    // Java uses String.format("%04d", ...)
    const v = Math.max(0, Number(n) | 0);
    return String(v).padStart(4, '0');
  }

  #buildFilename(prefs, numStr) {
    const dir = prefs.getCurrentDirectoryPath();
    const stem = prefs.getStemName();
    const suffix = prefs.getFileFormatSuffix();
    const sep = dir && !dir.endsWith('/') ? '/' : '';
    return `${dir}${sep}${stem}${numStr}.${suffix}`;
  }
}


