/**
 * @fileoverview SortedKeyFrameList - A sorted list of KeyFrame instances.
 * @author Charles Gunn
 */

import { KeyFrame } from './KeyFrame.js';

/**
 * This is basically a sorted list of instances of KeyFrame, sorted by the 
 * value of TimeDescriptor.getTime().
 * 
 * TODO: check to make sure something reasonable is done if a TimeDescriptor is attempted 
 * to be added that has the same time value as an existing one.
 * 
 * @template T The type of values stored in the keyframes
 */
export class SortedKeyFrameList {
    /**
     * Creates a new SortedKeyFrameList.
     */
    constructor() {
        /** @type {Array<KeyFrame<T>>} */
        this.keyframes = [];
    }

    /**
     * Gets the number of keyframes in the list.
     * @returns {number} The size of the list
     */
    size() {
        return this.keyframes.length;
    }

    /**
     * Gets the keyframe at the specified index.
     * @param {number} index - The index of the keyframe to get
     * @returns {KeyFrame<T>} The keyframe at the specified index
     */
    get(index) {
        return this.keyframes[index];
    }

    /**
     * Gets the minimum time value in the list.
     * @returns {number} The minimum time, or 0.0 if empty
     */
    getTmin() {
        if (this.size() === 0) return 0.0;
        return this.get(0).getTime();
    }

    /**
     * Gets the maximum time value in the list.
     * @returns {number} The maximum time, or 0.0 if empty
     */
    getTmax() {
        if (this.size() === 0) return 0.0;
        return this.get(this.size() - 1).getTime();
    }

    /**
     * Finds an existing keyframe with the specified TimeDescriptor.
     * @param {import('./TimeDescriptor.js').TimeDescriptor} td - The time descriptor to search for
     * @returns {KeyFrame<T>|null} The existing keyframe, or null if not found
     */
    existingKeyFrameAt(td) {
        for (const kf of this.keyframes) {
            if (kf.getTimeDescriptor() === td) return kf;
        }
        return null;
    }

    /**
     * Inserts a keyframe in sorted order.
     * @param {KeyFrame<T>} kf - The keyframe to insert
     */
    sortedInsert(kf) {
        const n = this.size();
        let i = 0;
        for (i = 0; i < n; ++i) {
            if (this.get(i).getTime() > kf.getTime()) break;
        }
        this.keyframes.splice(i, 0, kf);
    }

    /**
     * Adds a keyframe to the list, maintaining sorted order.
     * @param {KeyFrame<T>} k - The keyframe to add
     * @returns {boolean} Always returns true
     */
    add(k) {
        const n = this.size();
        let i = 0;
        for (i = 0; i < n; ++i) {
            if (this.get(i).getTime() > k.getTime()) break;
        }
        this.keyframes.splice(i, 0, k);
        return true;
    }

    /**
     * Removes a keyframe from the list.
     * @param {KeyFrame<T>} kf - The keyframe to remove
     * @returns {boolean} True if the keyframe was removed, false if not found
     */
    remove(kf) {
        const index = this.keyframes.indexOf(kf);
        if (index >= 0) {
            this.keyframes.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Removes the keyframe at the specified index.
     * @param {number} index - The index of the keyframe to remove
     * @returns {KeyFrame<T>} The removed keyframe
     */
    removeAt(index) {
        return this.keyframes.splice(index, 1)[0];
    }

    /**
     * Clears all keyframes from the list.
     */
    clear() {
        this.keyframes.length = 0;
    }

    /**
     * Gets the segment index for the specified time.
     * Returns the index of the keyframe segment that contains the given time.
     * @param {number} t - The time to find the segment for
     * @returns {number} The segment index
     */
    getSegmentAtTime(t) {
        const n = this.size();
        for (let i = 0; i < n; ++i) {
            if (t < this.get(i).getTime()) return i - 1;
        }
        return n - 1;
    }

    /**
     * Returns an iterator for the keyframes.
     * @returns {Iterator<KeyFrame<T>>} An iterator over the keyframes
     */
    [Symbol.iterator]() {
        return this.keyframes[Symbol.iterator]();
    }

    /**
     * Converts the list to an array.
     * @returns {Array<KeyFrame<T>>} Array of keyframes
     */
    toArray() {
        return [...this.keyframes];
    }

    /**
     * Creates a string representation of the list.
     * @returns {string} String representation
     */
    toString() {
        return `SortedKeyFrameList(${this.size()} keyframes)`;
    }
}
