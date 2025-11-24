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
 * @fileoverview Tests for AnimationUtility FactoredMatrix interpolation methods.
 * @author Charles Gunn
 */

import { AnimationUtility } from '../AnimationUtility.js';
import { FactoredMatrix } from '../../../math/FactoredMatrix.js';

describe('AnimationUtility FactoredMatrix Interpolation', () => {
    let matrix1;
    let matrix2;

    beforeEach(() => {
        matrix1 = new FactoredMatrix();
        matrix2 = new FactoredMatrix();
    });

    describe('linearInterpolationFactoredMatrix', () => {
        test('should interpolate translation', () => {
            // Set up matrices with different translations
            matrix1.setTranslation(0, 0, 0);
            matrix2.setTranslation(10, 20, 30);

            // Interpolate at midpoint
            const result = AnimationUtility.linearInterpolationFactoredMatrix(null, 0.5, 0, 1, matrix1, matrix2);
            
            expect(result).toBeInstanceOf(FactoredMatrix);
            const translation = result.getTranslation();
            expect(translation[0]).toBeCloseTo(5);
            expect(translation[1]).toBeCloseTo(10);
            expect(translation[2]).toBeCloseTo(15);
        });

        test('should interpolate rotation', () => {
            // Set up matrices with different rotations
            matrix1.setRotation(0, [0, 0, 1]); // No rotation
            matrix2.setRotation(Math.PI / 2, [0, 0, 1]); // 90 degrees around Z

            // Interpolate at midpoint
            const result = AnimationUtility.linearInterpolationFactoredMatrix(null, 0.5, 0, 1, matrix1, matrix2);
            
            expect(result).toBeInstanceOf(FactoredMatrix);
            const quaternion = result.getRotationQuaternion();
            expect(quaternion).toBeDefined();
            expect(typeof quaternion.re).toBe('number');
            expect(typeof quaternion.x).toBe('number');
            expect(typeof quaternion.y).toBe('number');
            expect(typeof quaternion.z).toBe('number');
            
            // The interpolated rotation should be somewhere between identity and 90 degrees
            expect(Math.abs(quaternion.re)).toBeLessThan(1); // Not identity
            expect(Math.abs(quaternion.re)).toBeGreaterThan(0.5); // But not full rotation
        });

        test('should interpolate stretch/scale', () => {
            // Set up matrices with different scales
            matrix1.setStretchComponents(1, 1, 1);
            matrix2.setStretchComponents(2, 3, 4);

            // Interpolate at midpoint
            const result = AnimationUtility.linearInterpolationFactoredMatrix(null, 0.5, 0, 1, matrix1, matrix2);
            
            expect(result).toBeInstanceOf(FactoredMatrix);
            const stretch = result.getStretch();
            expect(stretch[0]).toBeCloseTo(1.5);
            expect(stretch[1]).toBeCloseTo(2);
            expect(stretch[2]).toBeCloseTo(2.5);
        });

        test('should handle boundary conditions', () => {
            matrix1.setTranslation(0, 0, 0);
            matrix2.setTranslation(10, 10, 10);

            // At start time
            let result = AnimationUtility.linearInterpolationFactoredMatrix(null, 0, 0, 1, matrix1, matrix2);
            expect(result).toBe(matrix1);

            // At end time
            result = AnimationUtility.linearInterpolationFactoredMatrix(null, 1, 0, 1, matrix1, matrix2);
            expect(result).toBe(matrix2);

            // Before start time
            result = AnimationUtility.linearInterpolationFactoredMatrix(null, -0.5, 0, 1, matrix1, matrix2);
            expect(result).toBe(matrix1);

            // After end time
            result = AnimationUtility.linearInterpolationFactoredMatrix(null, 1.5, 0, 1, matrix1, matrix2);
            expect(result).toBe(matrix2);
        });

        test('should use provided destination matrix', () => {
            const destination = new FactoredMatrix();
            matrix1.setTranslation(0, 0, 0);
            matrix2.setTranslation(10, 10, 10);

            const result = AnimationUtility.linearInterpolationFactoredMatrix(destination, 0.5, 0, 1, matrix1, matrix2);
            
            expect(result).toBe(destination);
            const translation = result.getTranslation();
            expect(translation[0]).toBeCloseTo(5);
            expect(translation[1]).toBeCloseTo(5);
            expect(translation[2]).toBeCloseTo(5);
        });

        test('should handle complex transformations', () => {
            // Matrix 1: Translation + rotation + scale
            matrix1.setTranslation(1, 2, 3);
            matrix1.setRotation(Math.PI / 4, [1, 0, 0]); // 45 degrees around X
            matrix1.setStretchComponents(0.5, 0.5, 0.5);

            // Matrix 2: Different translation + rotation + scale
            matrix2.setTranslation(5, 6, 7);
            matrix2.setRotation(Math.PI / 2, [0, 1, 0]); // 90 degrees around Y
            matrix2.setStretchComponents(2, 2, 2);

            // Interpolate at various points
            const result25 = AnimationUtility.linearInterpolationFactoredMatrix(null, 0.25, 0, 1, matrix1, matrix2);
            const result75 = AnimationUtility.linearInterpolationFactoredMatrix(null, 0.75, 0, 1, matrix1, matrix2);

            // Check that interpolation produces valid results
            expect(result25).toBeInstanceOf(FactoredMatrix);
            expect(result75).toBeInstanceOf(FactoredMatrix);

            const trans25 = result25.getTranslation();
            const trans75 = result75.getTranslation();

            // Translation should interpolate linearly
            expect(trans25[0]).toBeCloseTo(2); // 1 + 0.25 * (5-1) = 2
            expect(trans75[0]).toBeCloseTo(4); // 1 + 0.75 * (5-1) = 4

            // Scale should interpolate linearly
            const stretch25 = result25.getStretch();
            const stretch75 = result75.getStretch();
            expect(stretch25[0]).toBeCloseTo(0.875); // 0.5 + 0.25 * (2-0.5) = 0.875
            expect(stretch75[0]).toBeCloseTo(1.625); // 0.5 + 0.75 * (2-0.5) = 1.625
        });

        test('should handle different time ranges', () => {
            matrix1.setTranslation(0, 0, 0);
            matrix2.setTranslation(100, 100, 100);

            // Test with time range [10, 20]
            const result = AnimationUtility.linearInterpolationFactoredMatrix(null, 15, 10, 20, matrix1, matrix2);
            
            const translation = result.getTranslation();
            expect(translation[0]).toBeCloseTo(50); // Midpoint
            expect(translation[1]).toBeCloseTo(50);
            expect(translation[2]).toBeCloseTo(50);
        });

        test('should preserve matrix metric', () => {
            const hyperbolicMatrix1 = new FactoredMatrix(3); // Hyperbolic metric
            const hyperbolicMatrix2 = new FactoredMatrix(3);
            
            hyperbolicMatrix1.setTranslation(0, 0, 0);
            hyperbolicMatrix2.setTranslation(1, 1, 1);

            const result = AnimationUtility.linearInterpolationFactoredMatrix(null, 0.5, 0, 1, hyperbolicMatrix1, hyperbolicMatrix2);
            
            expect(result.getMetric()).toBe(3); // Should preserve hyperbolic metric
        });
    });
});
