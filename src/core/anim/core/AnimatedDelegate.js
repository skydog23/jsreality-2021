/**
 * @fileoverview AnimatedDelegate interface for managing animated objects.
 * @author Charles Gunn
 */

/**
 * For managing classes which implement Animated, this
 * returns the current value of the object being animated.
 * @interface AnimatedDelegate
 * @template T The type of the object being animated
 */
export class AnimatedDelegate {
    /**
     * Propagates the current animated value to the target object.
     * @param {T} t - The current animated value to propagate
     */
    propagateCurrentValue(t) {
        throw new Error('AnimatedDelegate.propagateCurrentValue() must be implemented by subclass');
    }
}
