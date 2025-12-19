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
 * @fileoverview KeyFrameAnimated implementation for scene graph Transformation objects.
 * @author Charles Gunn
 */

import { KeyFrameAnimatedIsometry } from './KeyFrameAnimatedIsometry.js';
import { KeyFrameAnimatedDelegate } from './KeyFrameAnimatedDelegate.js';
import { FactoredMatrix } from '../../core/math/FactoredMatrix.js';
import { Transformation } from '../../core/scene/Transformation.js';
import * as Pn from '../../core/math/Pn.js';
import * as Rn from '../../core/math/Rn.js';

/**
 * Animate an instance of {@link Transformation} by providing a delegate to
 * an instance of {@link KeyFrameAnimatedIsometry} that copies the 4x4 matrix
 * from one place to another, i.e, from target to and from tform.
 * 
 * @extends KeyFrameAnimatedIsometry
 */
export class KeyFrameAnimatedTransformation extends KeyFrameAnimatedIsometry {
    /** @type {Transformation|null} */
    #tform = null;

    /**
     * Constructs a new KeyFrameAnimatedTransformation with default delegate.
     */
    constructor() {
        super();
        // The delegate will be set when we have a transformation
    }

    /**
     * Constructs a new KeyFrameAnimatedTransformation with the specified Transformation.
     * @param {Transformation} t - The transformation to animate.
     * @param {number} [metric=Pn.EUCLIDEAN] - The metric to use (default: Euclidean).
     */
    static withTransformation(t, metric = Pn.EUCLIDEAN) {
        const instance = new KeyFrameAnimatedTransformation();
        instance.#tform = t;
        
        // Initialize with the transformation's current matrix
        instance.target = new FactoredMatrix(metric, t.getMatrix());
        instance.currentValue = new FactoredMatrix(metric);
        instance.currentValue.assignFrom(t.getMatrix());
        
        // Set up the default delegate
        instance.setDelegate(instance.#createDefaultDelegate());
        
        return instance;
    }

    /**
     * Constructs a new KeyFrameAnimatedTransformation with a custom delegate.
     * @param {KeyFrameAnimatedDelegate<FactoredMatrix>} animatedDelegate - The delegate to use.
     */
    static withDelegate(animatedDelegate) {
        const instance = new KeyFrameAnimatedTransformation();
        instance.setDelegate(animatedDelegate);
        return instance;
    }

    /**
     * Gets the transformation being animated.
     * @returns {Transformation|null} The transformation, or null if not set.
     */
    getTransformation() {
        return this.#tform;
    }

    /**
     * Sets the transformation to animate.
     * @param {Transformation} tform - The transformation to animate.
     * @param {number} [metric=Pn.EUCLIDEAN] - The metric to use.
     */
    setTransformation(tform, metric = Pn.EUCLIDEAN) {
        this.#tform = tform;
        
        if (tform) {
            // Update target and current value
            if (!this.target) {
                this.target = new FactoredMatrix(metric);
            }
            this.target.assignFrom(tform.getMatrix());
            
            if (!this.currentValue) {
                this.currentValue = new FactoredMatrix(metric);
            }
            this.currentValue.assignFrom(tform.getMatrix());
            
            // Set up the default delegate if none exists
            if (!this.delegate) {
                this.setDelegate(this.#createDefaultDelegate());
            }
        }
    }

    /**
     * Creates the default delegate for propagating values to/from the transformation.
     * @returns {KeyFrameAnimatedDelegate<FactoredMatrix>} The default delegate.
     * @private
     */
    #createDefaultDelegate() {
        const tform = this.#tform;
        
        return new (class extends KeyFrameAnimatedDelegate {
            /**
             * Propagates the current FactoredMatrix value to the transformation.
             * @param {FactoredMatrix} fm - The FactoredMatrix to propagate.
             */
            propagateCurrentValue(fm) {
                if (tform && !tform.isReadOnly()) {
                    tform.setMatrix(fm.getArray());
                }
            }

            /**
             * Gathers the current value from the transformation into a FactoredMatrix.
             * @param {FactoredMatrix} fm - The FactoredMatrix to update.
             * @returns {FactoredMatrix} The updated FactoredMatrix.
             */
            gatherCurrentValue(fm) {
                if (tform) {
                    fm.assignFrom(tform.getMatrix());
                }
                return fm;
            }
        })();
    }

    /**
     * Prints the current state of the animated transformation for debugging.
     */
    printState() {
        console.log(`KeyFrameAnimatedTransformation: ${this.keyFrames.size()} keyframes`);
        let i = 0;
        for (const kf of this.keyFrames) {
            const m = kf.getValue().getArray();
            console.log(`Time = ${kf.getTime()}\tKey frame ${i} = ${Rn.matrixToString(m)}`);
            i++;
        }
    }
}
