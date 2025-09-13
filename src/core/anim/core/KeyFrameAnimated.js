/**
 * @fileoverview KeyFrameAnimated interface for objects that support keyframe animation.
 * @author Charles Gunn
 */

import { Animated } from './Animated.js';

/**
 * Key framing requires the ability to add and delete key frames
 * (editing is done by adding keyframe at an existing TimeDescriptor).
 * Also, need to be able to set the current value in advance of
 * setting a key frame. (For manual setting of key frames, for example).
 * 
 * @interface KeyFrameAnimated
 * @template T The type of the instance which is being animated, e.g., Number.
 * @extends Animated
 */
export class KeyFrameAnimated extends Animated {
    /**
     * Deletes a keyframe at the specified time.
     * @param {import('./TimeDescriptor.js').TimeDescriptor} time - The time descriptor to delete
     */
    deleteKeyFrame(time) {
        throw new Error('KeyFrameAnimated.deleteKeyFrame() must be implemented by subclass');
    }

    /**
     * Adds a keyframe at the specified time descriptor.
     * This allows key frames to be set when the value has been set via another route.
     * @param {import('./TimeDescriptor.js').TimeDescriptor} td - The time descriptor for the new keyframe
     */
    addKeyFrame(td) {
        throw new Error('KeyFrameAnimated.addKeyFrame() must be implemented by subclass');
    }

    /**
     * Sets the current value directly.
     * Warning: this only works for immutable classes.
     * If mutable, then write the new value into the target instance before adding key frame.
     * @param {T} value - The value to set as current
     */
    setCurrentValue(value) {
        throw new Error('KeyFrameAnimated.setCurrentValue() must be implemented by subclass');
    }

    /**
     * Checks if this animated object is writable.
     * There may be key frame animated values that are only active on playback, but not for
     * setting key frames.
     * @returns {boolean} True if writable, false otherwise
     */
    isWritable() {
        throw new Error('KeyFrameAnimated.isWritable() must be implemented by subclass');
    }

    /**
     * Sets whether this animated object is writable.
     * @param {boolean} b - True to make writable, false otherwise
     */
    setWritable(b) {
        throw new Error('KeyFrameAnimated.setWritable() must be implemented by subclass');
    }

    /**
     * Gets the "gives way" flag.
     * A flag which says whether setting a key frame at time t with old value v automatically
     * overwrites all key frames "to the right" with the same value v.
     * @returns {boolean} True if gives way, false otherwise
     */
    isGivesWay() {
        throw new Error('KeyFrameAnimated.isGivesWay() must be implemented by subclass');
    }

    /**
     * Sets the "gives way" flag.
     * @param {boolean} b - True to enable gives way behavior, false otherwise
     */
    setGivesWay(b) {
        throw new Error('KeyFrameAnimated.setGivesWay() must be implemented by subclass');
    }

    /**
     * Sets the state from an archived KeyFrameAnimated instance.
     * This method supports saving/restoring animation state.
     * @param {KeyFrameAnimated<T>} archived - The archived instance to restore from
     */
    setFromArchive(archived) {
        throw new Error('KeyFrameAnimated.setFromArchive() must be implemented by subclass');
    }
}
