/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * Recorder backend interface.
 *
 * This abstracts away environment-specific recording concerns:
 * - Browser: downloading frames, File System Access API, etc.
 * - Node/Electron: writing to disk, invoking ffmpeg, etc.
 *
 * The animation model/controller remains DOM-free; only the backend touches platform APIs.
 *
 * @typedef {Object} RecorderBackend
 * @property {(info: { frame: number, time: number, filename: string, prefs: any, canvas?: any, viewer?: any }) => (void|Promise<void>)} saveFrame
 * @property {(info: { prefs: any, suggestedOutputFile?: string }) => (void|Promise<void>)} finalize
 */

export {};


