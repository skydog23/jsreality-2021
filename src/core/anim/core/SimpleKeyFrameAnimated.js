/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * @fileoverview SimpleKeyFrameAnimated - Abstract base class implementing KeyFrameAnimated.
 * @author Charles Gunn
 */

import { KeyFrameAnimated } from './KeyFrameAnimated.js';
import { KeyFrameAnimatedDelegate } from './KeyFrameAnimatedDelegate.js';
import { SortedKeyFrameList } from './SortedKeyFrameList.js';
import { KeyFrame } from './KeyFrame.js';
import { TimeDescriptor } from './TimeDescriptor.js';
import { InterpolationTypes, BoundaryModes } from '../util/AnimationUtility.js';

/**
 * This class implements KeyFrameAnimated. It handles generic bookkeeping
 * like managing a sorted list of key frames. It comes with two constructors corresponding
 * to the two main usage patterns: for a mutable type, give an instance of the type
 * which will then be used for reading (setting key frames) and writing (playback).
 * For immutable types, there is a constructor requiring an instance of 
 * KeyFrameAnimatedDelegate which takes care of this reading and writing.
 * (All instances have delegates, but in the first case the delegate is created automatically.)
 * 
 * In order to be able to construct key-value pairs, this class requires that
 * subclasses implement a copy method (copyFromTo()) and provide fresh
 * instances (getNewInstance()).
 * 
 * @template T The class of the underlying class which is being animated
 * @abstract
 */
export class SimpleKeyFrameAnimated extends KeyFrameAnimated {
    /**
     * Counter for generating unique names.
     * @type {number}
     * @static
     */
    static count = 0;

    /**
     * Creates a new SimpleKeyFrameAnimated.
     * @param {KeyFrameAnimatedDelegate<T>|T} [delegateOrTarget] - Either a delegate or target object
     */
    constructor(delegateOrTarget) {
        super();
        
        /** @type {string} */
        this.name = `keyFrameAnimated${SimpleKeyFrameAnimated.count++}`;
        
        /** @type {SortedKeyFrameList<T>} */
        this.keyFrames = new SortedKeyFrameList();
        
        /** @type {InterpolationTypes} */
        this.interp = InterpolationTypes.LINEAR;
        
        /** @type {BoundaryModes} */
        this.boundaryMode = BoundaryModes.CLAMP;
        
        /** @type {boolean} */
        this.onlyAddChanges = true;
        
        /** @type {boolean} */
        this.givesWay = false;
        
        /** @type {boolean} */
        this.writable = true;
        
        /** @type {boolean} */
        this.debug = false;
        
        // Transient properties
        /** @type {TimeMapper|null} */
        this.timeMapper = null;
        
        /** @type {number} */
        this.remappedTime = 0;
        
        /** @type {T|null} */
        this.target = null;
        
        /** @type {T|null} */
        this.currentValue = null;
        
        /** @type {KeyFrameAnimatedDelegate<T>|null} */
        this.delegate = null;
        
        /** @type {boolean} */
        this.keyFramesChanged = true;
        
        /** @type {number} */
        this.lastModified = 0;
        
        /** @type {boolean} */
        this.valueIsSet = false;
        
        /** @type {KeyFrame<T>|null} */
        this.previous = null;
        
        /** @type {KeyFrame<T>|null} */
        this.next = null;

        // Handle constructor overloads
        if (delegateOrTarget instanceof KeyFrameAnimatedDelegate) {
            // Constructor with delegate
            this.setDelegate(delegateOrTarget);
            this.target = this.currentValue = this.getNewInstance();
        } else if (delegateOrTarget != null) {
            // Constructor with target object
            this.target = delegateOrTarget;
            this.currentValue = this.copyFromTo(delegateOrTarget, this.getNewInstance());
            this.setDelegate(this.getDefaultDelegate());
        } else {
            // Default constructor
            this.currentValue = this.getNewInstance();
        }
    }

    /**
     * Copy from one instance to another.
     * @param {T} from - Source object
     * @param {T} to - Destination object
     * @returns {T} The destination object with copied values
     * @abstract
     */
    copyFromTo(from, to) {
        throw new Error('SimpleKeyFrameAnimated.copyFromTo() must be implemented by subclass');
    }

    /**
     * Create a new instance of type T.
     * @returns {T} A new instance
     * @abstract
     */
    getNewInstance() {
        throw new Error('SimpleKeyFrameAnimated.getNewInstance() must be implemented by subclass');
    }

    /**
     * Check if two values are equal.
     * @param {T} t1 - First value
     * @param {T} t2 - Second value
     * @returns {boolean} True if equal
     * @abstract
     */
    equalValues(t1, t2) {
        throw new Error('SimpleKeyFrameAnimated.equalValues() must be implemented by subclass');
    }

    /**
     * Gets the delegate.
     * @returns {KeyFrameAnimatedDelegate<T>|null} The current delegate
     */
    getDelegate() {
        return this.delegate;
    }

    /**
     * Sets the delegate.
     * @param {KeyFrameAnimatedDelegate<T>} delegate - The delegate to set
     */
    setDelegate(delegate) {
        this.delegate = delegate;
    }

    /**
     * In the case of mutable objects, we can provide a standard delegate
     * as long as we were given a target instance in the constructor.
     * @returns {KeyFrameAnimatedDelegate<T>|null} The default delegate
     */
    getDefaultDelegate() {
        if (this.target == null) return null;
        
        const self = this;
        return new (class extends KeyFrameAnimatedDelegate {
            gatherCurrentValue(t) {
                return self.copyFromTo(self.target, t);
            }

            propagateCurrentValue(t) {
                self.copyFromTo(t, self.target);
            }
        })();
    }

    /**
     * Gets the sorted keyframe list.
     * @returns {SortedKeyFrameList<T>} The keyframe list
     */
    getKeyFrames() {
        return this.keyFrames;
    }

    // KeyFrameAnimated interface implementation

    /**
     * Deletes a keyframe at the specified time.
     * @param {TimeDescriptor} time - The time descriptor to delete
     */
    deleteKeyFrame(time) {
        const existingKF = this.keyFrames.existingKeyFrameAt(time);
        if (existingKF) {
            this.keyFrames.remove(existingKF);
            this.keyFramesChanged = true;
        }
    }

    /**
     * Adds a keyframe at the specified time descriptor.
     * @param {TimeDescriptor} td - The time descriptor for the new keyframe
     */
    addKeyFrame(td) {
        if (!this.writable) return;
        
        const existingKF = this.keyFrames.existingKeyFrameAt(td);
        if (existingKF) {
            // Update existing keyframe
            existingKF.setValue(this.copyFromTo(this.currentValue, this.getNewInstance()));
        } else {
            // Create new keyframe
            const newKF = new KeyFrame(td, this.copyFromTo(this.currentValue, this.getNewInstance()));
            this.keyFrames.add(newKF);
        }
        this.keyFramesChanged = true;
    }

    /**
     * Sets the current value directly.
     * @param {T} value - The value to set as current
     */
    setCurrentValue(value) {
        this.currentValue = value;
    }

    /**
     * Checks if this animated object is writable.
     * @returns {boolean} True if writable
     */
    isWritable() {
        return this.writable;
    }

    /**
     * Sets whether this animated object is writable.
     * @param {boolean} b - True to make writable
     */
    setWritable(b) {
        this.writable = b;
    }

    /**
     * Gets the "gives way" flag.
     * @returns {boolean} True if gives way
     */
    isGivesWay() {
        return this.givesWay;
    }

    /**
     * Sets the "gives way" flag.
     * @param {boolean} b - True to enable gives way behavior
     */
    setGivesWay(b) {
        this.givesWay = b;
    }

    /**
     * Sets the state from an archived KeyFrameAnimated instance.
     * @param {KeyFrameAnimated<T>} archived - The archived instance
     */
    setFromArchive(archived) {
        // Implementation would copy state from archived instance
        console.warn('SimpleKeyFrameAnimated.setFromArchive() not fully implemented');
    }

    // Animated interface implementation

    /**
     * Sets the value at the specified time.
     * @param {number} t - The time
     */
    setValueAtTime(t) {
        if (this.keyFrames.size() === 0) return;

        this.valueIsSet = false;
        
        // Handle boundary conditions
        if (t <= this.keyFrames.getTmin()) {
            this.currentValue = this.copyFromTo(this.keyFrames.get(0).getValue(), this.getNewInstance());
            this.valueIsSet = true;
        } else if (t >= this.keyFrames.getTmax()) {
            this.currentValue = this.copyFromTo(this.keyFrames.get(this.keyFrames.size() - 1).getValue(), this.getNewInstance());
            this.valueIsSet = true;
        } else {
            // Find surrounding keyframes for interpolation
            const segmentIndex = this.keyFrames.getSegmentAtTime(t);
            if (segmentIndex >= 0 && segmentIndex < this.keyFrames.size() - 1) {
                this.previous = this.keyFrames.get(segmentIndex);
                this.next = this.keyFrames.get(segmentIndex + 1);
            }
        }
        
        // Subclasses will handle interpolation if valueIsSet is false
    }

    /**
     * Called when animation starts.
     */
    startAnimation() {
        // Default implementation - subclasses can override
    }

    /**
     * Called when animation ends.
     */
    endAnimation() {
        // Default implementation - subclasses can override
    }

    /**
     * Prints the current state.
     */
    printState() {
        console.log(`${this.name}: ${this.keyFrames.size()} keyframes, current value: ${this.currentValue}`);
    }

    // Named interface implementation

    /**
     * Sets the name.
     * @param {string} name - The name to set
     */
    setName(name) {
        this.name = name;
    }

    /**
     * Gets the name.
     * @returns {string} The current name
     */
    getName() {
        return this.name;
    }

    /**
     * Gets the interpolation type.
     * @returns {InterpolationTypes} The interpolation type
     */
    getInterpolationType() {
        return this.interp;
    }

    /**
     * Sets the interpolation type.
     * @param {InterpolationTypes} interp - The interpolation type
     */
    setInterpolationType(interp) {
        this.interp = interp;
    }

    /**
     * Gets the boundary mode.
     * @returns {BoundaryModes} The boundary mode
     */
    getBoundaryMode() {
        return this.boundaryMode;
    }

    /**
     * Sets the boundary mode.
     * @param {BoundaryModes} boundaryMode - The boundary mode
     */
    setBoundaryMode(boundaryMode) {
        this.boundaryMode = boundaryMode;
    }
}
