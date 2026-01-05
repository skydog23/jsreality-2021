/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * State-only port of `charlesgunn.anim.gui.RecordingPreferences`.
 *
 * Notes for jsReality:
 * - This file intentionally does NOT port Swing UI (`JPanel`, `JFileChooser`, etc.).
 * - Directory selection / writing files is environment-dependent (browser vs Node/Electron).
 * - Use Inspector Descriptor/Widget utilities to expose these settings in UI.
 */
export class RecordingPreferences {
  /** @type {string[]} */
  static fileSuffixes = ['tiff', 'jpg', 'png'];

  /** @type {string} */
  #stemName = 'test';

  /** @type {string} */
  #currentDirectoryPath = '';

  /** @type {string} */
  #fileFormatSuffix = RecordingPreferences.fileSuffixes[2];

  /** @type {string} */
  #frameCountFormatString = '%04d';

  /** @type {number} */
  #antialiasing = 4;

  /** @type {number} */
  #fps = 30;

  /** @type {number} */
  #startCount = 0;

  /** @type {boolean} */
  #saveAlpha = true;

  /** @type {boolean} */
  #saveScreenshot = false;

  /** @type {number} */
  #startTime = -1;

  /** @type {number} */
  #endTime = -1;

  /** @type {{ width: number, height: number }} */
  #dimension = { width: 1920, height: 1080 };

  constructor() {
    // In Java: defaults from Secure.getProperty("charlesgunn.anim.writedir", user.home)
    // In JS: keep empty by default; caller/UI can set explicitly.
  }

  // ---------------------------------------------------------------------------
  // Basic getters/setters (1:1 with Java intent)
  // ---------------------------------------------------------------------------

  getStemName() {
    return this.#stemName;
  }

  setStemName(stemName) {
    this.#stemName = String(stemName ?? '');
  }

  getCurrentDirectoryPath() {
    return this.#currentDirectoryPath;
  }

  setCurrentDirectoryPath(path) {
    this.#currentDirectoryPath = String(path ?? '');
  }

  getFileFormatSuffix() {
    return this.#fileFormatSuffix;
  }

  setFileFormatSuffix(suffix) {
    const s = String(suffix ?? '');
    this.#fileFormatSuffix = s || RecordingPreferences.fileSuffixes[2];
  }

  getFrameCountFormatString() {
    return this.#frameCountFormatString;
  }

  setFrameCountFormatString(fmt) {
    this.#frameCountFormatString = String(fmt ?? '%04d');
  }

  getAntialiasing() {
    return this.#antialiasing;
  }

  setAntialiasing(a) {
    const n = Number(a);
    // Mirror Java’s radio-button choices (1,2,4) with a safe fallback.
    if (n === 1 || n === 2 || n === 4) this.#antialiasing = n;
    else this.#antialiasing = 4;
  }

  getFps() {
    return this.#fps;
  }

  setFps(fps) {
    const n = Number(fps);
    this.#fps = Number.isFinite(n) && n > 0 ? (n | 0) : 30;
  }

  getStartCount() {
    return this.#startCount;
  }

  setStartCount(startCount) {
    const n = Number(startCount);
    this.#startCount = Number.isFinite(n) ? (n | 0) : 0;
  }

  isSaveAlpha() {
    return this.#saveAlpha;
  }

  setSaveAlpha(saveAlpha) {
    this.#saveAlpha = Boolean(saveAlpha);
  }

  isSaveScreenshot() {
    return this.#saveScreenshot;
  }

  setSaveScreenshot(saveScreenshot) {
    this.#saveScreenshot = Boolean(saveScreenshot);
  }

  getStartTime() {
    return this.#startTime;
  }

  setStartTime(startTime) {
    const n = Number(startTime);
    this.#startTime = Number.isFinite(n) ? n : -1;
  }

  getEndTime() {
    return this.#endTime;
  }

  setEndTime(endTime) {
    const n = Number(endTime);
    this.#endTime = Number.isFinite(n) ? n : -1;
  }

  /**
   * @returns {{ width: number, height: number }}
   */
  getDimension() {
    // Return a defensive copy.
    return { width: this.#dimension.width, height: this.#dimension.height };
  }

  /**
   * @param {{ width: number, height: number }} dim
   */
  setDimension(dim) {
    const w = Number(dim?.width);
    const h = Number(dim?.height);
    this.#dimension = {
      width: Number.isFinite(w) ? (w | 0) : this.#dimension.width,
      height: Number.isFinite(h) ? (h | 0) : this.#dimension.height
    };
  }
}


