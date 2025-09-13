/**
 * @fileoverview Interface for time remapping in animations.
 * @author Charles Gunn
 */

/**
 * Interface for remapping time values in animations.
 * This allows for non-linear time progression, such as easing functions,
 * time warping, or other temporal transformations.
 * @interface
 */
export class TimeMapper {
    /**
     * Remaps a time value from one range to another, potentially with non-linear transformation.
     * @param {number} t - The current time value to be remapped.
     * @param {number} t0 - The start time of the original range.
     * @param {number} t1 - The end time of the original range.
     * @returns {number} The remapped time value.
     */
    remapTime(t, t0, t1) {
        throw new Error('Method "remapTime()" must be implemented.');
    }
}
