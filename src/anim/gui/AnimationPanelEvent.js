/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
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

