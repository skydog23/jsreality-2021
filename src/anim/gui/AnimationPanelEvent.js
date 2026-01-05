/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { TimeDescriptor } from '../core/TimeDescriptor.js';

/**
 * Port of charlesgunn.anim.gui.AnimationPanelEvent.EventType.
 * @readonly
 * @enum {string}
 */
export const EventType = Object.freeze({
  KEY_FRAME_ADDED: 'KEY_FRAME_ADDED',
  KEY_FRAME_CHANGED: 'KEY_FRAME_CHANGED',
  KEY_FRAME_DELETED: 'KEY_FRAME_DELETED',
  SET_VALUE_AT_TIME: 'SET_VALUE_AT_TIME',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  PLAYBACK_STARTED: 'PLAYBACK_STARTED',
  PLAYBACK_COMPLETED: 'PLAYBACK_COMPLETED'
});

/**
 * Event structure used by AnimationPanel to communicate with listeners.
 * Mirrors the Java fields closely.
 */
export class AnimationPanelEvent {
  /**
   * @param {EventType} type
   * @param {import('./AnimationPanel.js').AnimationPanel} source
   * @param {TimeDescriptor} time
   * @param {import('../core/KeyFrame.js').KeyFrame<any>|null} [keyFrame=null]
   */
  constructor(type, source, time, keyFrame = null) {
    this.type = type;
    this.source = source;
    this.time = time;
    this.timeStamp = Date.now();
    this.keyFrame = keyFrame;
  }
}

