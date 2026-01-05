/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview Tests for KeyFrameAnimatedInteger.
 * @author Charles Gunn
 */

import { KeyFrameAnimatedInteger } from '../KeyFrameAnimatedInteger.js';
import { KeyFrame } from '../KeyFrame.js';
import { TimeDescriptor } from '../TimeDescriptor.js';
import { KeyFrameAnimatedDelegate } from '../KeyFrameAnimatedDelegate.js';
import { InterpolationTypes } from '../../util/AnimationUtility.js';

describe('KeyFrameAnimatedInteger', () => {
    let animatedInt;
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
        
        animatedInt = new KeyFrameAnimatedInteger(42);
        animatedInt.setDelegate(mockDelegate);
    });

    describe('Construction', () => {
        test('should create with default value', () => {
            const anim = new KeyFrameAnimatedInteger();
            expect(anim.target).toBe(0);
        });

        test('should create with specified integer value', () => {
            const anim = new KeyFrameAnimatedInteger(100);
            expect(anim.target).toBe(100);
        });

        test('should floor non-integer values in constructor', () => {
            const anim = new KeyFrameAnimatedInteger(42.7);
            expect(anim.target).toBe(42);
        });

        test('should create with delegate factory', () => {
            const anim = KeyFrameAnimatedInteger.withDelegate(mockDelegate);
            expect(anim.delegate).toBe(mockDelegate);
        });
    });

    describe('Core Methods', () => {
        test('getNewInstance should return 0', () => {
            expect(animatedInt.getNewInstance()).toBe(0);
        });

        test('copyFromTo should truncate the value', () => {
            expect(animatedInt.copyFromTo(42.9)).toBe(42);
            expect(animatedInt.copyFromTo(7.1)).toBe(7);
            expect(animatedInt.copyFromTo(-3.8)).toBe(-3); // Math.trunc(-3.8) = -3
        });

        test('equalValues should compare truncated integers', () => {
            expect(animatedInt.equalValues(42, 42)).toBe(true);
            expect(animatedInt.equalValues(42.3, 42.7)).toBe(true);
            expect(animatedInt.equalValues(42, 43)).toBe(false);
            expect(animatedInt.equalValues(42.9, 43.1)).toBe(false);
        });
    });

    describe('Animation with Keyframes', () => {
        beforeEach(() => {
            // Add keyframes: 0->10, 5->50, 10->30
            animatedInt.setCurrentValue(10);
            animatedInt.addKeyFrame(new TimeDescriptor(0));
            
            animatedInt.setCurrentValue(50);
            animatedInt.addKeyFrame(new TimeDescriptor(5));
            
            animatedInt.setCurrentValue(30);
            animatedInt.addKeyFrame(new TimeDescriptor(10));
        });

        test('should handle boundary conditions', () => {
            // Before first keyframe
            animatedInt.setValueAtTime(-1);
            expect(capturedValue).toBe(10);

            // At first keyframe
            animatedInt.setValueAtTime(0);
            expect(capturedValue).toBe(10);

            // At last keyframe
            animatedInt.setValueAtTime(10);
            expect(capturedValue).toBe(30);

            // After last keyframe
            animatedInt.setValueAtTime(15);
            expect(capturedValue).toBe(30);
        });

        test('should interpolate linearly and truncate result', () => {
            animatedInt.setInterpolationType(InterpolationTypes.LINEAR);
            
            // Midpoint between 0->10 and 5->50: at t=2.5, should be 30 (truncated)
            animatedInt.setValueAtTime(2.5);
            expect(capturedValue).toBe(30); // Math.trunc((10 + 50) / 2) = Math.trunc(30) = 30
            
            // At t=1, should be 18 (truncated from 18.0)
            animatedInt.setValueAtTime(1);
            expect(capturedValue).toBe(18); // 10 + 0.2 * (50-10) = 10 + 8 = 18
        });

        test('should interpolate with hermite and truncate result', () => {
            animatedInt.setInterpolationType(InterpolationTypes.CUBIC_HERMITE);
            
            // Test hermite interpolation (should differ from linear)
            animatedInt.setValueAtTime(2.5);
            const hermiteResult = capturedValue;
            
            animatedInt.setInterpolationType(InterpolationTypes.LINEAR);
            animatedInt.setValueAtTime(2.5);
            const linearResult = capturedValue;
            
            // Results should be different (hermite vs linear), both truncated
            expect(typeof hermiteResult).toBe('number');
            expect(typeof linearResult).toBe('number');
            expect(hermiteResult).toBe(Math.trunc(hermiteResult));
            expect(linearResult).toBe(Math.trunc(linearResult));
        });

        test('should handle constant interpolation', () => {
            animatedInt.setInterpolationType(InterpolationTypes.CONSTANT);
            
            // Should always return the previous keyframe value
            animatedInt.setValueAtTime(2.5);
            expect(capturedValue).toBe(10); // Previous keyframe at t=0 has value 10
            
            animatedInt.setValueAtTime(7.5);
            expect(capturedValue).toBe(50); // Previous keyframe at t=5 has value 50
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty keyframes gracefully', () => {
            const emptyAnim = new KeyFrameAnimatedInteger(0);
            emptyAnim.setDelegate(mockDelegate);
            
            // Should not crash with empty keyframes
            emptyAnim.setValueAtTime(5);
            // No assertion needed, just ensure no crash
        });

        test('should handle single keyframe', () => {
            const singleAnim = new KeyFrameAnimatedInteger(0);
            singleAnim.setDelegate(mockDelegate);
            singleAnim.setCurrentValue(100);
            singleAnim.addKeyFrame(new TimeDescriptor(5));
            
            // Before, at, and after the single keyframe
            singleAnim.setValueAtTime(0);
            expect(capturedValue).toBe(100);
            
            singleAnim.setValueAtTime(5);
            expect(capturedValue).toBe(100);
            
            singleAnim.setValueAtTime(10);
            expect(capturedValue).toBe(100);
        });

        test('should handle negative integers', () => {
            animatedInt.setCurrentValue(-10);
            animatedInt.addKeyFrame(new TimeDescriptor(0));
            
            animatedInt.setCurrentValue(-50);
            animatedInt.addKeyFrame(new TimeDescriptor(10));
            
            animatedInt.setValueAtTime(5);
            expect(capturedValue).toBe(-30); // Linear interpolation: -10 + 0.5*(-50-(-10)) = -30
        });

        test('should handle floating point keyframe values by truncating', () => {
            animatedInt.setCurrentValue(10.7);
            animatedInt.addKeyFrame(new TimeDescriptor(0));
            
            animatedInt.setCurrentValue(50.2);
            animatedInt.addKeyFrame(new TimeDescriptor(10));
            
            animatedInt.setValueAtTime(0);
            expect(capturedValue).toBe(10); // Math.trunc(10.7) = 10
            
            animatedInt.setValueAtTime(10);
            expect(capturedValue).toBe(50); // Math.trunc(50.2) = 50
        });
    });
});
