/**
 * @fileoverview Tests for KeyFrameAnimatedColor.
 * @author Charles Gunn
 */

import { KeyFrameAnimatedColor } from '../KeyFrameAnimatedColor.js';
import { KeyFrame } from '../KeyFrame.js';
import { TimeDescriptor } from '../TimeDescriptor.js';
import { KeyFrameAnimatedDelegate } from '../KeyFrameAnimatedDelegate.js';
import { InterpolationTypes } from '../../util/AnimationUtility.js';
import { Color } from '../../../util/Color.js';

describe('KeyFrameAnimatedColor', () => {
    let animatedColor;
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
        
        animatedColor = new KeyFrameAnimatedColor(new Color(128, 128, 128));
        animatedColor.setDelegate(mockDelegate);
    });

    describe('Construction', () => {
        test('should create with default white color', () => {
            const anim = new KeyFrameAnimatedColor();
            expect(anim.target.r).toBe(255);
            expect(anim.target.g).toBe(255);
            expect(anim.target.b).toBe(255);
            expect(anim.target.a).toBe(255);
        });

        test('should create with specified color', () => {
            const red = new Color(255, 0, 0);
            const anim = new KeyFrameAnimatedColor(red);
            expect(anim.target).toBe(red);
        });

        test('should create with delegate factory', () => {
            const anim = KeyFrameAnimatedColor.withDelegate(mockDelegate);
            expect(anim.delegate).toBe(mockDelegate);
        });
    });

    describe('Core Methods', () => {
        test('getNewInstance should return white color', () => {
            const newColor = animatedColor.getNewInstance();
            expect(newColor).toBeInstanceOf(Color);
            expect(newColor.r).toBe(255);
            expect(newColor.g).toBe(255);
            expect(newColor.b).toBe(255);
            expect(newColor.a).toBe(255);
        });

        test('copyFromTo should return the source color', () => {
            const source = new Color(100, 150, 200);
            const target = new Color(0, 0, 0);
            const result = animatedColor.copyFromTo(source, target);
            expect(result).toBe(source);
        });

        test('equalValues should compare RGBA components', () => {
            const color1 = new Color(255, 128, 64, 200);
            const color2 = new Color(255, 128, 64, 200);
            const color3 = new Color(255, 128, 64, 201); // Different alpha
            const color4 = new Color(254, 128, 64, 200); // Different red
            
            expect(animatedColor.equalValues(color1, color2)).toBe(true);
            expect(animatedColor.equalValues(color1, color3)).toBe(false);
            expect(animatedColor.equalValues(color1, color4)).toBe(false);
        });
    });

    describe('Animation with Keyframes', () => {
        beforeEach(() => {
            // Add keyframes: Red -> Green -> Blue
            animatedColor.setCurrentValue(new Color(255, 0, 0)); // Red
            animatedColor.addKeyFrame(new TimeDescriptor(0));
            
            animatedColor.setCurrentValue(new Color(0, 255, 0)); // Green
            animatedColor.addKeyFrame(new TimeDescriptor(5));
            
            animatedColor.setCurrentValue(new Color(0, 0, 255)); // Blue
            animatedColor.addKeyFrame(new TimeDescriptor(10));
        });

        test('should handle boundary conditions', () => {
            // Before first keyframe
            animatedColor.setValueAtTime(-1);
            expect(capturedValue.r).toBe(255);
            expect(capturedValue.g).toBe(0);
            expect(capturedValue.b).toBe(0);

            // At first keyframe
            animatedColor.setValueAtTime(0);
            expect(capturedValue.r).toBe(255);
            expect(capturedValue.g).toBe(0);
            expect(capturedValue.b).toBe(0);

            // At last keyframe
            animatedColor.setValueAtTime(10);
            expect(capturedValue.r).toBe(0);
            expect(capturedValue.g).toBe(0);
            expect(capturedValue.b).toBe(255);

            // After last keyframe
            animatedColor.setValueAtTime(15);
            expect(capturedValue.r).toBe(0);
            expect(capturedValue.g).toBe(0);
            expect(capturedValue.b).toBe(255);
        });

        test('should interpolate colors linearly', () => {
            animatedColor.setInterpolationType(InterpolationTypes.LINEAR);
            
            // Midpoint between red and green: at t=2.5
            animatedColor.setValueAtTime(2.5);
            expect(capturedValue).toBeInstanceOf(Color);
            
            // Should be halfway between red (255,0,0) and green (0,255,0)
            // Linear interpolation at t=0.5: (255*0.5 + 0*0.5, 0*0.5 + 255*0.5, 0*0.5 + 0*0.5)
            expect(capturedValue.r).toBeCloseTo(128, 1); // Math.round(127.5) = 128
            expect(capturedValue.g).toBeCloseTo(128, 1); // Math.round(127.5) = 128
            expect(capturedValue.b).toBeCloseTo(0, 1);
            expect(capturedValue.a).toBeCloseTo(255, 1);
        });

        test('should interpolate colors with hermite', () => {
            animatedColor.setInterpolationType(InterpolationTypes.CUBIC_HERMITE);
            
            // Test hermite interpolation at midpoint
            animatedColor.setValueAtTime(2.5);
            const hermiteResult = {
                r: capturedValue.r,
                g: capturedValue.g,
                b: capturedValue.b,
                a: capturedValue.a
            };
            
            // Compare with linear interpolation
            animatedColor.setInterpolationType(InterpolationTypes.LINEAR);
            animatedColor.setValueAtTime(2.5);
            const linearResult = {
                r: capturedValue.r,
                g: capturedValue.g,
                b: capturedValue.b,
                a: capturedValue.a
            };
            
            // Results should be valid colors but potentially different
            expect(hermiteResult.r).toBeGreaterThanOrEqual(0);
            expect(hermiteResult.r).toBeLessThanOrEqual(255);
            expect(hermiteResult.g).toBeGreaterThanOrEqual(0);
            expect(hermiteResult.g).toBeLessThanOrEqual(255);
            expect(hermiteResult.b).toBeCloseTo(0, 1); // Blue should remain 0 in this interpolation
            expect(hermiteResult.a).toBeCloseTo(255, 1); // Alpha should remain 255
        });

        test('should handle colors with alpha channel', () => {
            // Clear existing keyframes and add new ones with alpha
            animatedColor.keyFrames.clear();
            animatedColor.setCurrentValue(new Color(255, 0, 0, 100)); // Semi-transparent red
            animatedColor.addKeyFrame(new TimeDescriptor(0));
            
            animatedColor.setCurrentValue(new Color(0, 0, 255, 200)); // More opaque blue
            animatedColor.addKeyFrame(new TimeDescriptor(10));
            
            animatedColor.setInterpolationType(InterpolationTypes.LINEAR);
            animatedColor.setValueAtTime(5); // Midpoint
            
            expect(capturedValue.r).toBeCloseTo(128, 1); // Math.round(127.5) = 128
            expect(capturedValue.g).toBeCloseTo(0, 1);
            expect(capturedValue.b).toBeCloseTo(128, 1); // Math.round(127.5) = 128
            expect(capturedValue.a).toBeCloseTo(150, 1); // Halfway between 100 and 200
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty keyframes gracefully', () => {
            const emptyAnim = new KeyFrameAnimatedColor();
            emptyAnim.setDelegate(mockDelegate);
            
            // Should not crash with empty keyframes
            emptyAnim.setValueAtTime(5);
            // No assertion needed, just ensure no crash
        });

        test('should handle single keyframe', () => {
            const singleAnim = new KeyFrameAnimatedColor();
            singleAnim.setDelegate(mockDelegate);
            const purple = new Color(128, 0, 128);
            singleAnim.setCurrentValue(purple);
            singleAnim.addKeyFrame(new TimeDescriptor(5));
            
            // Before, at, and after the single keyframe should all return purple
            singleAnim.setValueAtTime(0);
            expect(capturedValue.r).toBe(128);
            expect(capturedValue.g).toBe(0);
            expect(capturedValue.b).toBe(128);
            
            singleAnim.setValueAtTime(5);
            expect(capturedValue.r).toBe(128);
            expect(capturedValue.g).toBe(0);
            expect(capturedValue.b).toBe(128);
            
            singleAnim.setValueAtTime(10);
            expect(capturedValue.r).toBe(128);
            expect(capturedValue.g).toBe(0);
            expect(capturedValue.b).toBe(128);
        });

        test('should handle grayscale interpolation', () => {
            animatedColor.keyFrames.clear();
            animatedColor.setCurrentValue(new Color(0, 0, 0)); // Black
            animatedColor.addKeyFrame(new TimeDescriptor(0));
            
            animatedColor.setCurrentValue(new Color(255, 255, 255)); // White
            animatedColor.addKeyFrame(new TimeDescriptor(10));
            
            animatedColor.setInterpolationType(InterpolationTypes.LINEAR);
            animatedColor.setValueAtTime(5); // Midpoint should be gray
            
            expect(capturedValue.r).toBeCloseTo(128, 1); // Math.round(127.5) = 128
            expect(capturedValue.g).toBeCloseTo(128, 1); // Math.round(127.5) = 128
            expect(capturedValue.b).toBeCloseTo(128, 1); // Math.round(127.5) = 128
            expect(capturedValue.a).toBeCloseTo(255, 1);
        });

        test('should handle identical colors', () => {
            const sameColor = new Color(100, 150, 200);
            animatedColor.keyFrames.clear();
            animatedColor.setCurrentValue(sameColor);
            animatedColor.addKeyFrame(new TimeDescriptor(0));
            
            animatedColor.setCurrentValue(new Color(100, 150, 200)); // Same color, different instance
            animatedColor.addKeyFrame(new TimeDescriptor(10));
            
            // Interpolation between identical colors should yield the same color
            animatedColor.setValueAtTime(5);
            expect(capturedValue.r).toBe(100);
            expect(capturedValue.g).toBe(150);
            expect(capturedValue.b).toBe(200);
            expect(capturedValue.a).toBe(255);
        });
    });
});
