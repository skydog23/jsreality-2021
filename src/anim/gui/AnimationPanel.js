/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { KeyFrame } from '../core/KeyFrame.js';
import { SortedKeyFrameList } from '../core/SortedKeyFrameList.js';
import { TimeDescriptor } from '../core/TimeDescriptor.js';
import { PlaybackModes } from '../util/AnimationUtility.js';
import { AnimationPanelEvent, EventType } from './AnimationPanelEvent.js';
import { getLogger, Category } from '../../core/util/LoggingSystem.js';

const logger = getLogger('jsreality.anim.gui.AnimationPanel');

/**
 * DOM-free port of charlesgunn.anim.gui.AnimationPanel.
 *
 * In Phase 1 this is a pure model/controller:
 * - maintains keyframes and playback state
 * - emits AnimationPanelEvents to registered listeners
 *
 * Recording/export is intentionally postponed (fields exist for parity).
 */
export class AnimationPanel {
  /** @type {SortedKeyFrameList<any>} */
  #keyFrames = new SortedKeyFrameList();

  /** @type {number} */
  #inspectedKeyFrame = 0;

  /** @type {KeyFrame<any>|null} */
  #currentKeyFrame = null;

  /** @type {number} */
  #currentTime = 0.0;

  /** @type {number} */
  #totalTicks = 0;

  /** @type {number} */
  #totalSeconds = 0;

  /** @type {number} */
  #playbackFactor = 1.0;

  /** @type {boolean} */
  #isPaused = true;

  /** @type {PlaybackModes} */
  #playbackMode = PlaybackModes.NORMAL;

  /** @type {boolean} */
  #recording = false;

  /** @type {any} Recording/export settings (state-only; UI/environment-specific). */
  #recordPrefs = null;

  /** @type {number} */
  #fps = 30;

  /** @type {number} */
  #frameCount = 0;

  /** @type {number} */
  #reversed = 1;

  /** @type {number} */
  #dcurrentTick = 0.0;

  /** @type {number} */
  #systemTime = 0;

  /** @type {number|null} */
  #timerId = null;

  /** @type {Array<import('./AnimationPanelListener.js').AnimationPanelListener>} */
  #listeners = [];

  /** dummy value used for keyframes (Java uses a shared Object instance) */
  static dummyObject = {};

  #debugState(label) {
    return {
      label,
      keyFramesSize: this.#keyFrames?.size?.() ?? 0,
      inspectedKeyFrame: this.#inspectedKeyFrame,
      currentTime: this.#currentTime,
      currentKeyFrameTime: this.#currentKeyFrame?.getTime?.() ?? null,
      tmin: this.#keyFrames?.getTmin?.() ?? null,
      tmax: this.#keyFrames?.getTmax?.() ?? null,
      isPaused: this.#isPaused,
      playbackMode: this.#playbackMode,
      playbackFactor: this.#playbackFactor
    };
  }

  // ---------------------------------------------------------------------------
  // Listener management
  // ---------------------------------------------------------------------------

  /**
   * @param {import('./AnimationPanelListener.js').AnimationPanelListener} listener
   */
  addAnimationPanelListener(listener) {
    if (!listener) return;
    this.#listeners.push(listener);
  }

  /**
   * @param {import('./AnimationPanelListener.js').AnimationPanelListener} listener
   */
  removeAnimationPanelListener(listener) {
    this.#listeners = this.#listeners.filter((l) => l !== listener);
  }

  /**
   * @param {AnimationPanelEvent} e
   */
  #fireEvent(e) {
    for (const l of this.#listeners) {
      try {
        l?.actionPerformed?.(e);
      } catch (err) {
        // Listener errors should not crash playback.
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Keyframe model
  // ---------------------------------------------------------------------------

  getKeyFrames() {
    return this.#keyFrames;
  }

  setKeyFrames(keyFrames) {
    this.#keyFrames = keyFrames || new SortedKeyFrameList();
  }

  getInspectedKeyFrame() {
    return this.#inspectedKeyFrame;
  }

  setInspectedKeyFrame(index) {
    this.#inspectedKeyFrame = Number.isFinite(index) ? index : 0;
    this.inspectKeyFrame();
  }

  getCurrentKeyFrame() {
    return this.#currentKeyFrame;
  }

  getCurrentTime() {
    return this.#currentTime;
  }

  setCurrentTime(t) {
    this.#currentTime = Number.isFinite(t) ? t : 0.0;
  }

  /**
   * Equivalent to Swing panel stepping forward.
   */
  advanceKeyFrame() {
    if (this.#keyFrames.size() === 0) return;
    this.#inspectedKeyFrame++;
    this.#inspectedKeyFrame = this.#inspectedKeyFrame % this.#keyFrames.size();
    this.inspectKeyFrame();
  }

  /**
   * Equivalent to Swing panel stepping backward.
   */
  retreatKeyFrame() {
    if (this.#keyFrames.size() === 0) return;
    this.#inspectedKeyFrame--;
    if (this.#inspectedKeyFrame < 0) this.#inspectedKeyFrame += this.#keyFrames.size();
    this.inspectKeyFrame();
  }

  /**
   * Select current keyframe by index, update current time, and emit SET_VALUE_AT_TIME.
   */
  inspectKeyFrame() {
    if (this.#keyFrames.size() === 0) {
      this.#currentKeyFrame = null;
      this.setCurrentTime(0.0);
      return;
    }
    if (this.#inspectedKeyFrame < 0) this.#inspectedKeyFrame = 0;
    if (this.#inspectedKeyFrame >= this.#keyFrames.size()) {
      this.#inspectedKeyFrame = this.#keyFrames.size() - 1;
    }
    this.#currentKeyFrame = this.#keyFrames.get(this.#inspectedKeyFrame);
    this.setCurrentTime(this.#currentKeyFrame.getTime());
    this.#dcurrentTick = this.tickFromTime(this.#currentTime);
    this.#fireSetValueAtTime();
  }

  /**
   * Port of InsertKeyAction / insertKeyFrame().
   */
  insertKeyFrame() {
    logger.fine(Category.ALL, 'insertKeyFrame: begin', this.#debugState('before'));
    /** @type {KeyFrame<any>} */
    let kf;
    let branch = 'between';
    if (this.#keyFrames.size() === 0) {
      kf = new KeyFrame(new TimeDescriptor(0.0), AnimationPanel.dummyObject);
      branch = 'empty';
    } else if (this.#keyFrames.size() - 1 === this.#inspectedKeyFrame) {
      kf = new KeyFrame(new TimeDescriptor(this.#keyFrames.getTmax() + 1), AnimationPanel.dummyObject);
      branch = 'append';
    } else {
      const tm =
        (this.#keyFrames.get(this.#inspectedKeyFrame).getTime() +
          this.#keyFrames.get(this.#inspectedKeyFrame + 1).getTime()) *
        0.5;
      kf = new KeyFrame(new TimeDescriptor(tm), AnimationPanel.dummyObject);
    }
    logger.fine(Category.ALL, 'insertKeyFrame: computed time', {
      branch,
      newTime: kf.getTime?.(),
      inspectedKeyFrame: this.#inspectedKeyFrame
    });
    this.#keyFrames.sortedInsert(kf);
    this.#inspectedKeyFrame = this.#keyFrames.indexOf(kf);
    this.#currentKeyFrame = kf;
    this.setCurrentTime(kf.getTime());
    logger.fine(Category.ALL, 'insertKeyFrame: inserted', this.#debugState('after-insert'));
    this.#fireEvent(new AnimationPanelEvent(EventType.KEY_FRAME_ADDED, this, kf.getTimeDescriptor(), kf));
    this.inspectKeyFrame();
    logger.fine(Category.ALL, 'insertKeyFrame: end', this.#debugState('after-inspect'));
  }

  /**
   * Port of SaveKeyAction: update current keyframe time and emit KEY_FRAME_CHANGED.
   * (Listeners use this to overwrite values at this keyframe.)
   */
  saveKeyFrame() {
    logger.fine(Category.ALL, 'saveKeyFrame: begin', this.#debugState('before'));
    if (this.#keyFrames.size() === 0 || !this.#currentKeyFrame) {
      logger.fine(
        Category.ALL,
        'saveKeyFrame: no current keyframe; delegating to insertKeyFrame()',
        this.#debugState('delegating')
      );
      this.insertKeyFrame();
      return;
    }
    const oldTime = this.#currentKeyFrame.getTime?.();
    this.#currentKeyFrame.setTime(this.#currentTime);
    logger.fine(Category.ALL, 'saveKeyFrame: updated keyframe time', {
      oldTime,
      newTime: this.#currentTime,
      inspectedKeyFrame: this.#inspectedKeyFrame,
      keyFramesSize: this.#keyFrames.size()
    });
    this.#fireEvent(
      new AnimationPanelEvent(
        EventType.KEY_FRAME_CHANGED,
        this,
        this.#currentKeyFrame.getTimeDescriptor(),
        this.#currentKeyFrame
      )
    );
    this.inspectKeyFrame();
    logger.fine(Category.ALL, 'saveKeyFrame: end', this.#debugState('after'));
  }

  /**
   * Port of DeleteKeyAction.
   */
  deleteKeyFrame() {
    if (!this.#currentKeyFrame || this.#keyFrames.size() === 0) return;
    this.#fireEvent(
      new AnimationPanelEvent(
        EventType.KEY_FRAME_DELETED,
        this,
        this.#currentKeyFrame.getTimeDescriptor(),
        this.#currentKeyFrame
      )
    );
    this.#keyFrames.removeIndex(this.#inspectedKeyFrame);
    this.inspectKeyFrame();
  }

  /**
   * Update current time while paused (scrubbing).
   * This mirrors the Swing time slider listener guard `if (!isPaused) return`.
   * @param {number} t
   */
  scrubTime(t) {
    if (!this.#isPaused) return;
    this.setCurrentTime(t);
    this.updateTime();
  }

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------

  getPlaybackMode() {
    return this.#playbackMode;
  }

  setPlaybackMode(mode) {
    this.#playbackMode = mode;
  }

  getPlaybackFactor() {
    return this.#playbackFactor;
  }

  setPlaybackFactor(f) {
    this.#playbackFactor = Number.isFinite(f) ? f : 1.0;
  }

  isPaused() {
    return this.#isPaused;
  }

  setPaused(paused) {
    this.#isPaused = Boolean(paused);
    this.#updatePlayState();
  }

  isRecording() {
    return this.#recording;
  }

  setRecording(recording) {
    this.#recording = Boolean(recording);
  }

  /**
   * Parity hook for Java AnimationPanelRecordListener.
   * @returns {any}
   */
  getRecordPrefs() {
    return this.#recordPrefs;
  }

  /**
   * Parity hook for Java AnimationPanelRecordListener.
   * @param {any} prefs
   */
  setRecordPrefs(prefs) {
    this.#recordPrefs = prefs ?? null;
  }

  getCurrentFrame() {
    return this.#frameCount;
  }

  reset() {
    this.#dcurrentTick = 0.0;
    this.#frameCount = 0;
    this.#stopTimer();
    this.#reversed = 1;
    this.setCurrentTime(0.0);
    this.updateTime();
  }

  togglePlay() {
    if (this.#keyFrames.size() === 0) return;
    this.#isPaused = !this.#isPaused;
    this.#updatePlayState();
  }

  startPlayback() {
    if (this.#keyFrames.size() === 0) return;
    this.#totalSeconds = this.#keyFrames.getTmax() - this.#keyFrames.getTmin();
    this.#totalTicks = Math.max(1, Math.floor(this.#totalSeconds * this.#fps));
    this.#systemTime = Date.now();
    this.#fireEvent(new AnimationPanelEvent(EventType.PLAYBACK_STARTED, this, new TimeDescriptor(this.#currentTime), this.#currentKeyFrame));
    this.#startTimer();
  }

  tickFromTime(t) {
    const denom = this.#keyFrames.getTmax() - this.#keyFrames.getTmin();
    if (denom === 0) return 0;
    return Math.floor((this.#totalTicks * (t - this.#keyFrames.getTmin())) / denom);
  }

  /**
   * Playback tick (called by timer).
   */
  tick() {
    if (this.#keyFrames.size() === 0) return;

    if (this.#dcurrentTick > this.#totalTicks) this.#dcurrentTick = this.#totalTicks;
    const absoluteTime = this.#dcurrentTick / this.#totalTicks;
    const totalTime = this.#keyFrames.getTmax() - this.#keyFrames.getTmin();
    this.setCurrentTime(this.#keyFrames.getTmin() + absoluteTime * totalTime);
    this.updateTime();

    if (this.#dcurrentTick >= this.#totalTicks || this.#dcurrentTick < 0) {
      switch (this.#playbackMode) {
        case PlaybackModes.NORMAL:
          this.#frameCount = this.#dcurrentTick = 0;
          if (this.#recording) this.#recording = false;
          this.#isPaused = true;
          this.#reversed = 1;
          break;
        case PlaybackModes.CYCLE:
          this.#frameCount = this.#dcurrentTick = 0;
          this.#reversed = 1;
          break;
        case PlaybackModes.SHUTTLE:
          this.#reversed = -this.#reversed;
          this.#dcurrentTick = this.#dcurrentTick >= this.#totalTicks ? this.#totalTicks - this.#playbackFactor : 0;
          break;
        default:
          break;
      }
      this.#fireEvent(new AnimationPanelEvent(EventType.PLAYBACK_COMPLETED, this, new TimeDescriptor(this.#currentTime), this.#currentKeyFrame));
      this.#updatePlayState();
    }

    // Advance ticks (Phase 1: wall-clock stepping like Java's non-recording branch)
    const newTime = Date.now();
    const dt = newTime - this.#systemTime;
    this.#systemTime = newTime;
    const dticks = (dt / 1000.0) * this.#fps * this.#playbackFactor * this.#reversed;
    this.#dcurrentTick += dticks;

    this.#frameCount++;
  }

  /**
   * Update the current time -> choose keyframe segment -> emit SET_VALUE_AT_TIME.
   * Matches Java updateTime() behavior.
   */
  updateTime() {
    const which = this.#keyFrames.getSegmentAtTime(this.#currentTime);
    if (which !== this.#inspectedKeyFrame) {
      this.#inspectedKeyFrame = which;
      // Update currentKeyFrame reference if possible.
      if (which >= 0 && which < this.#keyFrames.size()) {
        this.#currentKeyFrame = this.#keyFrames.get(which);
      }
    }
    this.#fireSetValueAtTime();
  }

  #fireSetValueAtTime() {
    this.#fireEvent(new AnimationPanelEvent(EventType.SET_VALUE_AT_TIME, this, new TimeDescriptor(this.#currentTime), this.#currentKeyFrame));
  }

  #updatePlayState() {
    if (this.#isPaused) {
      this.#stopTimer();
    } else {
      this.startPlayback();
    }
  }

  #startTimer() {
    this.#stopTimer();
    // Use a coarse timer; time integration uses wall-clock.
    const delayMs = Math.max(5, Math.floor(1000 / this.#fps));
    this.#timerId = setInterval(() => this.tick(), delayMs);
  }

  #stopTimer() {
    if (this.#timerId != null) {
      clearInterval(this.#timerId);
      this.#timerId = null;
    }
  }
}

