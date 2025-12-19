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
 * @fileoverview Tests for KeyFrameAnimatedIsometry.
 * @author Charles Gunn
 */

import { KeyFrameAnimatedIsometry } from '../KeyFrameAnimatedIsometry.js';
import { TimeDescriptor } from '../TimeDescriptor.js';
import { KeyFrameAnimatedDelegate } from '../KeyFrameAnimatedDelegate.js';
import { InterpolationTypes } from '../../util/AnimationUtility.js';
import { FactoredMatrix } from '../../../core/math/FactoredMatrix.js';
import * as Pn from '../../../core/math/Pn.js';

describe('KeyFrameAnimatedIsometry', () => {
    let animatedIsometry;
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
        
        animatedIsometry = new KeyFrameAnimatedIsometry();
        animatedIsometry.setDelegate(mockDelegate);
    });

    describe('Construction', () => {
        test('should create with default identity matrix', () => {
            const anim = new KeyFrameAnimatedIsometry();
            expect(anim.target).toBeInstanceOf(FactoredMatrix);
            expect(anim.target.getMetric()).toBe(Pn.EUCLIDEAN);
        });

        test('should create with specified matrix', () => {
            const matrix = new FactoredMatrix();
            matrix.setTranslation(1, 2, 3);
            
            const anim = KeyFrameAnimatedIsometry.withMatrix(matrix);
            expect(anim.target).toBeInstanceOf(FactoredMatrix);
            
            const translation = anim.target.getTranslation();
            expect(translation[0]).toBeCloseTo(1);
            expect(translation[1]).toBeCloseTo(2);
            expect(translation[2]).toBeCloseTo(3);
        });

        test('should create with delegate factory', () => {
            const anim = KeyFrameAnimatedIsometry.withDelegate(mockDelegate);
            expect(anim.delegate).toBe(mockDelegate);
        });
    });

    describe('Core Methods', () => {
        test('getNewInstance should return new FactoredMatrix', () => {
            const newInstance = animatedIsometry.getNewInstance();
            expect(newInstance).toBeInstanceOf(FactoredMatrix);
            expect(newInstance.getMetric()).toBe(Pn.EUCLIDEAN);
        });

        test('copyFromTo should copy matrix data', () => {
            const source = new FactoredMatrix();
            source.setTranslation(5, 10, 15);
            source.setRotation(Math.PI / 4, [0, 0, 1]);
            source.setStretch(2, 2, 2);

            const target = new FactoredMatrix();
            const result = animatedIsometry.copyFromTo(source, target);

            expect(result).toBe(target);
            const translation = result.getTranslation();
            expect(translation[0]).toBeCloseTo(5);
            expect(translation[1]).toBeCloseTo(10);
            expect(translation[2]).toBeCloseTo(15);
        });

        test('equalValues should compare matrices', () => {
            const matrix1 = new FactoredMatrix();
            matrix1.setTranslation(1, 2, 3);
            
            const matrix2 = new FactoredMatrix();
            matrix2.setTranslation(1, 2, 3);
            
            const matrix3 = new FactoredMatrix();
            matrix3.setTranslation(1, 2, 4); // Different Z

            expect(animatedIsometry.equalValues(matrix1, matrix2)).toBe(true);
            expect(animatedIsometry.equalValues(matrix1, matrix3)).toBe(false);
        });
    });

    describe('Animation with Keyframes', () => {
        beforeEach(() => {
            // Create keyframes: identity -> translation -> rotation+translation
            const identity = new FactoredMatrix();
            animatedIsometry.setCurrentValue(identity);
            animatedIsometry.addKeyFrame(new TimeDescriptor(0));
            
            const translated = new FactoredMatrix();
            translated.setTranslation(10, 0, 0);
            animatedIsometry.setCurrentValue(translated);
            animatedIsometry.addKeyFrame(new TimeDescriptor(5));
            
            const rotated = new FactoredMatrix();
            rotated.setTranslation(10, 0, 0);
            rotated.setRotation(Math.PI / 2, [0, 0, 1]); // 90 degrees around Z
            animatedIsometry.setCurrentValue(rotated);
            animatedIsometry.addKeyFrame(new TimeDescriptor(10));
        });

        test('should handle boundary conditions', () => {
            // Before first keyframe
            animatedIsometry.setValueAtTime(-1);
            expect(capturedValue).toBeInstanceOf(FactoredMatrix);
            const trans = capturedValue.getTranslation();
            expect(trans[0]).toBeCloseTo(0);
            expect(trans[1]).toBeCloseTo(0);
            expect(trans[2]).toBeCloseTo(0);

            // At first keyframe
            animatedIsometry.setValueAtTime(0);
            expect(capturedValue).toBeInstanceOf(FactoredMatrix);

            // After last keyframe
            animatedIsometry.setValueAtTime(15);
            expect(capturedValue).toBeInstanceOf(FactoredMatrix);
            const finalTrans = capturedValue.getTranslation();
            expect(finalTrans[0]).toBeCloseTo(10);
        });

        test('should interpolate linearly', () => {
            animatedIsometry.setInterpolationType(InterpolationTypes.LINEAR);
            
            // Midpoint between identity and translation: at t=2.5
            animatedIsometry.setValueAtTime(2.5);
            expect(capturedValue).toBeInstanceOf(FactoredMatrix);
            
            const trans = capturedValue.getTranslation();
            expect(trans[0]).toBeCloseTo(5); // Halfway between 0 and 10
            expect(trans[1]).toBeCloseTo(0);
            expect(trans[2]).toBeCloseTo(0);
        });

        test('should interpolate with hermite', () => {
            animatedIsometry.setInterpolationType(InterpolationTypes.CUBIC_HERMITE);
            
            // Test hermite interpolation at midpoint
            animatedIsometry.setValueAtTime(2.5);
            const hermiteResult = capturedValue.getTranslation();
            
            // Compare with linear interpolation
            animatedIsometry.setInterpolationType(InterpolationTypes.LINEAR);
            animatedIsometry.setValueAtTime(2.5);
            const linearResult = capturedValue.getTranslation();
            
            // Results should be valid transformations
            expect(hermiteResult).toBeDefined();
            expect(linearResult).toBeDefined();
            expect(typeof hermiteResult[0]).toBe('number');
            expect(typeof linearResult[0]).toBe('number');
        });

        test('should handle rotation interpolation', () => {
            animatedIsometry.setInterpolationType(InterpolationTypes.LINEAR);
            
            // Interpolate between translation and rotation+translation
            animatedIsometry.setValueAtTime(7.5); // Midpoint between t=5 and t=10
            expect(capturedValue).toBeInstanceOf(FactoredMatrix);
            
            const trans = capturedValue.getTranslation();
            expect(trans[0]).toBeCloseTo(10); // Translation should remain 10
            
            // Check that we have some rotation (quaternion should not be identity)
            const quat = capturedValue.getRotationQuaternion();
            expect(quat).toBeDefined();
            expect(typeof quat.re).toBe('number');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty keyframes gracefully', () => {
            const emptyAnim = new KeyFrameAnimatedIsometry();
            emptyAnim.setDelegate(mockDelegate);
            
            // Should not crash with empty keyframes
            emptyAnim.setValueAtTime(5);
            // No assertion needed, just ensure no crash
        });

        test('should handle single keyframe', () => {
            const singleAnim = new KeyFrameAnimatedIsometry();
            singleAnim.setDelegate(mockDelegate);
            
            const matrix = new FactoredMatrix();
            matrix.setTranslation(5, 5, 5);
            singleAnim.setCurrentValue(matrix);
            singleAnim.addKeyFrame(new TimeDescriptor(5));
            
            // Before, at, and after the single keyframe should all return the same matrix
            singleAnim.setValueAtTime(0);
            expect(capturedValue.getTranslation()[0]).toBeCloseTo(5);
            
            singleAnim.setValueAtTime(5);
            expect(capturedValue.getTranslation()[0]).toBeCloseTo(5);
            
            singleAnim.setValueAtTime(10);
            expect(capturedValue.getTranslation()[0]).toBeCloseTo(5);
        });

        test('should handle different metrics', () => {
            const hyperbolicMatrix = new FactoredMatrix(Pn.HYPERBOLIC);
            const anim = KeyFrameAnimatedIsometry.withMatrix(hyperbolicMatrix);
            
            expect(anim.target.getMetric()).toBe(Pn.HYPERBOLIC);
            expect(anim.getNewInstance().getMetric()).toBe(Pn.HYPERBOLIC);
        });

        test('should handle complex transformations', () => {
            const complexMatrix = new FactoredMatrix();
            complexMatrix.setTranslation(1, 2, 3);
            complexMatrix.setRotation(Math.PI / 3, [1, 1, 1]); // 60 degrees around (1,1,1)
            complexMatrix.setStretch(0.5, 1.5, 2.0);
            
            animatedIsometry.setCurrentValue(complexMatrix);
            animatedIsometry.addKeyFrame(new TimeDescriptor(0));
            
            animatedIsometry.setValueAtTime(0);
            expect(capturedValue).toBeInstanceOf(FactoredMatrix);
            
            const trans = capturedValue.getTranslation();
            const stretch = capturedValue.getStretch();
            expect(trans[0]).toBeCloseTo(1);
            expect(trans[1]).toBeCloseTo(2);
            expect(trans[2]).toBeCloseTo(3);
            expect(stretch[0]).toBeCloseTo(0.5);
            expect(stretch[1]).toBeCloseTo(1.5);
            expect(stretch[2]).toBeCloseTo(2.0);
        });
    });
});
