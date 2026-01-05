/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * Node/Electron recorder backend (stub).
 *
 * This will eventually:
 * - write frames to disk using `fs`
 * - optionally encode via `child_process` + ffmpeg
 *
 * For now, it throws if used.
 *
 * @implements {import('./RecorderBackend.js').RecorderBackend}
 */
export class NodeRecorderBackend {
  saveFrame() {
    throw new Error('NodeRecorderBackend is a stub (not implemented yet).');
  }

  finalize() {
    throw new Error('NodeRecorderBackend is a stub (not implemented yet).');
  }
}


