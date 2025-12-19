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
 * @fileoverview Tests for KeyFrameAnimatedTransformation.
 * @author Charles Gunn
 */

import { KeyFrameAnimatedTransformation } from './KeyFrameAnimatedTransformation.js';
import { TimeDescriptor } from '../core/TimeDescriptor.js';
import { KeyFrameAnimatedDelegate } from '../core/KeyFrameAnimatedDelegate.js';
import { InterpolationTypes } from '../../util/AnimationUtility.js';
import { FactoredMatrix } from '../../../core/math/FactoredMatrix.js';
import { Transformation } from '../../../core/scene/Transformation.js';
import * as Pn from '../../../core/math/Pn.js';
import * as Rn from '../../../core/math/Rn.js';

describe('KeyFrameAnimatedTransformation', () => {
    let animatedTransform;
    let transformation;
    let capturedValue;
    let mockDelegate;

    beforeEach(() => {
        capturedValue = null;
        mockDelegate = new (class extends KeyFrameAnimatedDelegate {
            propagateCurrentValue(value) {
                capturedValue = value;
            }
            gatherCurrentValue(target) {
                return target;
            }
        })();
        
        // Create a test transformation
        transformation = new Transformation();
        const identityMatrix = Rn.identityMatrix(4);
        transformation.setMatrix(identityMatrix);
        
        animatedTransform = new KeyFrameAnimatedTransformation();
        animatedTransform.setDelegate(mockDelegate);
    });

    describe('Construction', () => {
        test('should create with default constructor', () => {
            const anim = new KeyFrameAnimatedTransformation();
            expect(anim).toBeInstanceOf(KeyFrameAnimatedTransformation);
            expect(anim.getTransformation()).toBeNull();
        });

        test('should create with transformation', () => {
            const anim = KeyFrameAnimatedTransformation.withTransformation(transformation);
            expect(anim.getTransformation()).toBe(transformation);
            expect(anim.target).toBeInstanceOf(FactoredMatrix);
        });

        test('should create with delegate factory', () => {
            const anim = KeyFrameAnimatedTransformation.withDelegate(mockDelegate);
            expect(anim.delegate).toBe(mockDelegate);
        });
    });

    describe('Transformation Integration', () => {
        beforeEach(() => {
            animatedTransform.setTransformation(transformation);
        });

        test('should set and get transformation', () => {
            expect(animatedTransform.getTransformation()).toBe(transformation);
        });

        test('should initialize with transformation matrix', () => {
            const translationMatrix = Rn.identityMatrix(4);
            translationMatrix[3] = 5; // Set X translation
            translationMatrix[7] = 10; // Set Y translation
            translationMatrix[11] = 15; // Set Z translation
            
            transformation.setMatrix(translationMatrix);
            
            const anim = KeyFrameAnimatedTransformation.withTransformation(transformation);
            expect(anim.target).toBeInstanceOf(FactoredMatrix);
            
            const translation = anim.target.getTranslation();
            expect(translation[0]).toBeCloseTo(5);
            expect(translation[1]).toBeCloseTo(10);
            expect(translation[2]).toBeCloseTo(15);
        });

        test('should propagate values to transformation', () => {
            // Set up keyframes
            const identityMatrix = new FactoredMatrix();
            animatedTransform.setCurrentValue(identityMatrix);
            animatedTransform.addKeyFrame(new TimeDescriptor(0));
            
            const translatedMatrix = new FactoredMatrix();
            translatedMatrix.setTranslation(20, 30, 40);
            animatedTransform.setCurrentValue(translatedMatrix);
            animatedTransform.addKeyFrame(new TimeDescriptor(10));
            
            // Animate to the translated position
            animatedTransform.setValueAtTime(10);
            
            // Check that the transformation was updated
            const resultMatrix = transformation.getMatrix();
            expect(resultMatrix[3]).toBeCloseTo(20); // X translation
            expect(resultMatrix[7]).toBeCloseTo(30); // Y translation
            expect(resultMatrix[11]).toBeCloseTo(40); // Z translation
        });
    });

    describe('Animation with Keyframes', () => {
        beforeEach(() => {
            animatedTransform.setTransformation(transformation);
            
            // Create keyframes: identity -> translation -> rotation+translation
            const identity = new FactoredMatrix();
            animatedTransform.setCurrentValue(identity);
            animatedTransform.addKeyFrame(new TimeDescriptor(0));
            
            const translated = new FactoredMatrix();
            translated.setTranslation(10, 0, 0);
            animatedTransform.setCurrentValue(translated);
            animatedTransform.addKeyFrame(new TimeDescriptor(5));
            
            const rotated = new FactoredMatrix();
            rotated.setTranslation(10, 0, 0);
            rotated.setRotation(Math.PI / 2, [0, 0, 1]); // 90 degrees around Z
            animatedTransform.setCurrentValue(rotated);
            animatedTransform.addKeyFrame(new TimeDescriptor(10));
        });

        test('should animate transformation matrix', () => {
            // Test at midpoint between identity and translation
            animatedTransform.setValueAtTime(2.5);
            
            const matrix = transformation.getMatrix();
            expect(matrix[3]).toBeCloseTo(5); // X translation should be halfway
            expect(matrix[7]).toBeCloseTo(0); // Y translation should be 0
            expect(matrix[11]).toBeCloseTo(0); // Z translation should be 0
        });

        test('should handle rotation animation', () => {
            // Test rotation interpolation between t=5 and t=10
            animatedTransform.setValueAtTime(7.5);
            
            const matrix = transformation.getMatrix();
            expect(matrix[3]).toBeCloseTo(10); // X translation should remain 10
            
            // Check that rotation has been applied (matrix should not be identity in rotation part)
            const hasRotation = Math.abs(matrix[0] - 1) > 0.01 || Math.abs(matrix[1]) > 0.01;
            expect(hasRotation).toBe(true);
        });

        test('should respect read-only transformations', () => {
            // Mock a read-only transformation
            const readOnlyTransform = new Transformation();
            readOnlyTransform.isReadOnly = () => true; // Override to return true
            
            const originalMatrix = Rn.identityMatrix(4);
            readOnlyTransform.setMatrix = jest.fn(); // Mock setMatrix
            
            const anim = KeyFrameAnimatedTransformation.withTransformation(readOnlyTransform);
            
            // Set up a keyframe that would change the matrix
            const translated = new FactoredMatrix();
            translated.setTranslation(100, 100, 100);
            anim.setCurrentValue(translated);
            anim.addKeyFrame(new TimeDescriptor(0));
            
            // Animate - this should not call setMatrix on read-only transformation
            anim.setValueAtTime(0);
            
            expect(readOnlyTransform.setMatrix).not.toHaveBeenCalled();
        });
    });

    describe('Delegate Functionality', () => {
        test('should gather current value from transformation', () => {
            const translationMatrix = Rn.identityMatrix(4);
            translationMatrix[3] = 7; // X translation
            translationMatrix[7] = 8; // Y translation
            translationMatrix[11] = 9; // Z translation
            transformation.setMatrix(translationMatrix);
            
            const anim = KeyFrameAnimatedTransformation.withTransformation(transformation);
            
            // The delegate should be able to gather the current value
            const gatheredMatrix = new FactoredMatrix();
            anim.delegate.gatherCurrentValue(gatheredMatrix);
            
            const gatheredTranslation = gatheredMatrix.getTranslation();
            expect(gatheredTranslation[0]).toBeCloseTo(7);
            expect(gatheredTranslation[1]).toBeCloseTo(8);
            expect(gatheredTranslation[2]).toBeCloseTo(9);
        });

        test('should work with custom delegates', () => {
            let customPropagateCallCount = 0;
            let customGatherCallCount = 0;
            
            const customDelegate = new (class extends KeyFrameAnimatedDelegate {
                propagateCurrentValue(value) {
                    customPropagateCallCount++;
                    capturedValue = value;
                }
                gatherCurrentValue(target) {
                    customGatherCallCount++;
                    return target;
                }
            })();
            
            const anim = KeyFrameAnimatedTransformation.withDelegate(customDelegate);
            
            // Set up a simple keyframe
            const matrix = new FactoredMatrix();
            matrix.setTranslation(1, 2, 3);
            anim.setCurrentValue(matrix);
            anim.addKeyFrame(new TimeDescriptor(0));
            
            // Animate - should call custom delegate
            anim.setValueAtTime(0);
            
            expect(customPropagateCallCount).toBeGreaterThan(0);
            expect(capturedValue).toBeInstanceOf(FactoredMatrix);
        });
    });

    describe('Edge Cases', () => {
        test('should handle transformation without initial setup', () => {
            const anim = new KeyFrameAnimatedTransformation();
            
            // Should not crash when no transformation is set
            anim.setValueAtTime(0);
            // No assertion needed, just ensure no crash
        });

        test('should handle metric changes', () => {
            const anim = KeyFrameAnimatedTransformation.withTransformation(transformation, Pn.HYPERBOLIC);
            expect(anim.target.getMetric()).toBe(Pn.HYPERBOLIC);
        });

        test('should print state for debugging', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            animatedTransform.setTransformation(transformation);
            const matrix = new FactoredMatrix();
            matrix.setTranslation(1, 2, 3);
            animatedTransform.setCurrentValue(matrix);
            animatedTransform.addKeyFrame(new TimeDescriptor(0));
            
            animatedTransform.printState();
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
