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
import { getLogger, Category } from '../../core/util/LoggingSystem.js';

const logger = getLogger('jsreality.anim.gui.AnimationPanelRecordListener');

// Rate-limit noisy logs: always log first few frames, then every N frames.
// Visibility/verbosity is controlled by LoggingSystem module level (e.g. set this module to FINE).
const LOG_EVERY_N_FRAMES = 60;

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

  /** @type {number} */
  #debugLastTickLogged = -1;

  /** @type {boolean} */
  #debugWarnedNoOffscreen = false;

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

  #resolveOffscreenViewer() {
    const v = this.#viewer;
    if (v && typeof v.renderOffscreen === 'function') {
      return { viewer: v, via: 'viewer.renderOffscreen' };
    }
    // Common case: app passes JSRViewer (application wrapper). Its ViewerSwitch is returned by getViewer().
    if (v && typeof v.getViewer === 'function') {
      const vs = v.getViewer?.();
      if (vs && typeof vs.renderOffscreen === 'function') {
        return { viewer: vs, via: 'viewer.getViewer().renderOffscreen' };
      }
      if (vs && typeof vs.getCurrentViewer === 'function') {
        const cv = vs.getCurrentViewer?.();
        if (cv && typeof cv.renderOffscreen === 'function') {
          return { viewer: cv, via: 'viewer.getViewer().getCurrentViewer().renderOffscreen' };
        }
        return { viewer: cv ?? null, via: 'viewer.getViewer().getCurrentViewer()' };
      }
      return { viewer: vs ?? null, via: 'viewer.getViewer()' };
    }
    // Common case: app passes ViewerSwitch, whose current viewer holds renderOffscreen().
    if (v && typeof v.getCurrentViewer === 'function') {
      const cv = v.getCurrentViewer?.();
      if (cv && typeof cv.renderOffscreen === 'function') {
        return { viewer: cv, via: 'viewer.getCurrentViewer().renderOffscreen' };
      }
      return { viewer: cv ?? null, via: 'viewer.getCurrentViewer()' };
    }
    return { viewer: null, via: 'none' };
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

          const { viewer, via } = this.#resolveOffscreenViewer();
          logger.fine(Category.ALL, 'PLAYBACK_STARTED (recording enabled)', {
            via,
            viewerType: viewer?.constructor?.name ?? null,
            hasRenderOffscreen: Boolean(viewer && typeof viewer.renderOffscreen === 'function'),
            backendType: this.recorderBackend?.constructor?.name ?? null,
            prefs: {
              dim: this.#currentDim,
              aa: prefs.getAntialiasing?.(),
              suffix: prefs.getFileFormatSuffix?.(),
              dir: prefs.getCurrentDirectoryPath?.(),
              stem: prefs.getStemName?.(),
              startCount: prefs.getStartCount?.(),
              startTime: prefs.getStartTime?.(),
              endTime: prefs.getEndTime?.()
            }
          });

          // Stereo doubling is a viewer/camera concern; only apply if viewer exposes it.
          try {
            const cam = viewer?.getCamera?.() ?? this.#viewer?.getCamera?.() ?? null;
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

        const every = LOG_EVERY_N_FRAMES;
        if (tick !== this.#debugLastTickLogged && (tick % every === 0 || tick < 3)) {
          this.#debugLastTickLogged = tick;
          const { viewer, via } = this.#resolveOffscreenViewer();
          logger.finer(Category.ALL, 'SET_VALUE_AT_TIME', {
            tick,
            time,
            via,
            viewerType: viewer?.constructor?.name ?? null,
            hasRenderOffscreen: Boolean(viewer && typeof viewer.renderOffscreen === 'function'),
            dim,
            aa,
            filename,
            backendType: this.recorderBackend?.constructor?.name ?? null
          });
        }

        /** @param {any} canvas */
        const emit = (canvas) => {
          try {
            if (tick % every === 0 || tick < 3) {
              logger.finest(Category.ALL, 'saveFrame()', {
                tick,
                hasCanvas: Boolean(canvas),
                canvasType: canvas?.constructor?.name ?? null,
                hasToBlob: Boolean(canvas && typeof canvas.toBlob === 'function'),
                filename
              });
            }
            this.recorderBackend?.saveFrame?.({ frame: tick, time, filename, prefs, canvas, viewer: this.#viewer });
          } catch {
            // ignore backend errors
          }
        };

        try {
          // Standardize on renderOffscreen() (browser-safe). Screenshot variants are intentionally ignored.
          const { viewer, via } = this.#resolveOffscreenViewer();
          if (viewer?.renderOffscreen) {
            const maybe = viewer.renderOffscreen(dim.width, dim.height, { antialias: aa });
            // Support async renderOffscreen() (WebGL2Viewer.renderOffscreen is async).
            if (maybe && typeof maybe.then === 'function') {
              maybe
                .then((canvas) => {
                  if (tick % every === 0 || tick < 3) {
                    logger.finest(Category.ALL, 'renderOffscreen resolved', {
                      tick,
                      via,
                      canvasType: canvas?.constructor?.name ?? null,
                      canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
                      hasToBlob: Boolean(canvas && typeof canvas.toBlob === 'function')
                    });
                  }
                  emit(canvas);
                })
                .catch((err) => {
                  if (tick % every === 0 || tick < 3) {
                    logger.warn(Category.ALL, 'renderOffscreen rejected', {
                      tick,
                      via,
                      err: err?.message ?? String(err)
                    });
                  }
                  emit(undefined);
                });
            } else {
              emit(maybe);
            }
          } else {
            if (!this.#debugWarnedNoOffscreen) {
              this.#debugWarnedNoOffscreen = true;
              logger.warn(Category.ALL, 'No renderOffscreen() available on viewer; recorder will not produce files', {
                via,
                viewerType: viewer?.constructor?.name ?? null,
                wrapperViewerType: this.#viewer?.constructor?.name ?? null
              });
            }
            emit(undefined);
          }
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
            logger.fine(Category.ALL, 'PLAYBACK_COMPLETED finalize()', {
              backendType: this.recorderBackend?.constructor?.name ?? null,
              suggestedOutputFile: outputFile
            });
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


