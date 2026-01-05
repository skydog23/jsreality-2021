/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

/**
 * @fileoverview Tests for FramedCurve and ControlPoint classes.
 */

import { FramedCurve, ControlPoint } from '../FramedCurve.js';
import { InterpolationTypes } from '../../util/AnimationUtility.js';
import { jest } from '@jest/globals';

/**
 * Test ControlPoint basic functionality
 */
export function testControlPointBasic() {
    console.log('Testing ControlPoint basic functionality...');
    
    const matrix = [
        [1, 0, 0, 5],
        [0, 1, 0, 10],
        [0, 0, 1, 15],
        [0, 0, 0, 1]
    ];
    
    const cp = new ControlPoint(matrix, 2.5);
    
    console.assert(cp.getTime() === 2.5, 'Time should be 2.5');
    console.assert(cp.getTransformation() === matrix, 'Should return same matrix');
    
    const translation = cp.getTranslation();
    console.assert(translation[0] === 5, 'X translation should be 5');
    console.assert(translation[1] === 10, 'Y translation should be 10');
    console.assert(translation[2] === 15, 'Z translation should be 15');
    
    console.log('✓ ControlPoint basic tests passed');
}

/**
 * Test ControlPoint scale extraction
 */
export function testControlPointScale() {
    console.log('Testing ControlPoint scale extraction...');
    
    // Matrix with scale factors 2, 3, 4
    const matrix = [
        [2, 0, 0, 0],
        [0, 3, 0, 0],
        [0, 0, 4, 0],
        [0, 0, 0, 1]
    ];
    
    const cp = new ControlPoint(matrix, 0);
    const scale = cp.getScale();
    
    console.assert(Math.abs(scale[0] - 2) < 0.001, `X scale should be 2, got ${scale[0]}`);
    console.assert(Math.abs(scale[1] - 3) < 0.001, `Y scale should be 3, got ${scale[1]}`);
    console.assert(Math.abs(scale[2] - 4) < 0.001, `Z scale should be 4, got ${scale[2]}`);
    
    console.log('✓ ControlPoint scale tests passed');
}

/**
 * Test ControlPoint comparison
 */
export function testControlPointComparison() {
    console.log('Testing ControlPoint comparison...');
    
    const matrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
    const cp1 = new ControlPoint(matrix, 1.0);
    const cp2 = new ControlPoint(matrix, 2.0);
    const cp3 = new ControlPoint(matrix, 1.0);
    
    console.assert(cp1.compareTo(cp2) < 0, 'cp1 should be less than cp2');
    console.assert(cp2.compareTo(cp1) > 0, 'cp2 should be greater than cp1');
    console.assert(cp1.compareTo(cp3) === 0, 'cp1 should equal cp3');
    
    console.log('✓ ControlPoint comparison tests passed');
}

/**
 * Test FramedCurve basic functionality
 */
export function testFramedCurveBasic() {
    console.log('Testing FramedCurve basic functionality...');
    
    const curve = new FramedCurve();
    
    console.assert(curve.getNumberControlPoints() === 0, 'Should start with 0 control points');
    console.assert(curve.isUseBSpline() === true, 'Should use B-spline by default');
    console.assert(curve.isInterpolateScale() === false, 'Should not interpolate scale by default');
    
    const matrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
    const cp = new ControlPoint(matrix, 1.0);
    curve.addControlPoint(cp);
    
    console.assert(curve.getNumberControlPoints() === 1, 'Should have 1 control point after adding');
    console.assert(curve.getControlPoint(0) === cp, 'Should return the same control point');
    
    console.log('✓ FramedCurve basic tests passed');
}

/**
 * Test FramedCurve time bounds
 */
export function testFramedCurveTimeBounds() {
    console.log('Testing FramedCurve time bounds...');
    
    const curve = new FramedCurve();
    const matrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
    
    // Add control points out of order
    curve.addControlPoint(new ControlPoint(matrix, 2.0));
    curve.addControlPoint(new ControlPoint(matrix, 0.5));
    curve.addControlPoint(new ControlPoint(matrix, 1.5));
    
    console.assert(curve.getTmin() === 0.5, `Min time should be 0.5, got ${curve.getTmin()}`);
    console.assert(curve.getTmax() === 2.0, `Max time should be 2.0, got ${curve.getTmax()}`);
    
    // Check that control points are sorted
    console.assert(curve.getControlPoint(0).getTime() === 0.5, 'First control point should have time 0.5');
    console.assert(curve.getControlPoint(1).getTime() === 1.5, 'Second control point should have time 1.5');
    console.assert(curve.getControlPoint(2).getTime() === 2.0, 'Third control point should have time 2.0');
    
    console.log('✓ FramedCurve time bounds tests passed');
}

/**
 * Test FramedCurve interpolation
 */
export function testFramedCurveInterpolation() {
    console.log('Testing FramedCurve interpolation...');
    
    const curve = new FramedCurve();
    curve.setInterpolationType(InterpolationTypes.LINEAR);
    
    // Create matrices with different translations
    const matrix1 = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ];
    const matrix2 = [
        [1, 0, 0, 10],
        [0, 1, 0, 20],
        [0, 0, 1, 30],
        [0, 0, 0, 1]
    ];
    
    curve.addControlPoint(new ControlPoint(matrix1, 0.0));
    curve.addControlPoint(new ControlPoint(matrix2, 2.0));
    
    // Test interpolation at midpoint
    const result = curve.getValueAtTime(1.0);
    console.assert(result[0][3] === 5, `X translation should be 5, got ${result[0][3]}`);
    console.assert(result[1][3] === 10, `Y translation should be 10, got ${result[1][3]}`);
    console.assert(result[2][3] === 15, `Z translation should be 15, got ${result[2][3]}`);
    
    // Test position extraction
    const position = curve.getPositionAtTime(1.0);
    console.assert(position[0] === 5, 'Position X should be 5');
    console.assert(position[1] === 10, 'Position Y should be 10');
    console.assert(position[2] === 15, 'Position Z should be 15');
    
    console.log('✓ FramedCurve interpolation tests passed');
}

/**
 * Test FramedCurve boundary conditions
 */
export function testFramedCurveBoundaryConditions() {
    console.log('Testing FramedCurve boundary conditions...');
    
    const curve = new FramedCurve();
    const matrix1 = [[1,0,0,1],[0,1,0,2],[0,0,1,3],[0,0,0,1]];
    const matrix2 = [[1,0,0,4],[0,1,0,5],[0,0,1,6],[0,0,0,1]];
    
    curve.addControlPoint(new ControlPoint(matrix1, 1.0));
    curve.addControlPoint(new ControlPoint(matrix2, 3.0));
    
    // Test before first control point (should clamp)
    const beforeResult = curve.getValueAtTime(0.5);
    console.assert(beforeResult[0][3] === 1, 'Should clamp to first control point before start');
    
    // Test after last control point (should clamp)
    const afterResult = curve.getValueAtTime(4.0);
    console.assert(afterResult[0][3] === 4, 'Should clamp to last control point after end');
    
    console.log('✓ FramedCurve boundary condition tests passed');
}

/**
 * Test FramedCurve scaling
 */
export function testFramedCurveScaling() {
    console.log('Testing FramedCurve scaling...');
    
    const curve = new FramedCurve();
    const matrix = [[1,0,0,2],[0,1,0,4],[0,0,1,6],[0,0,0,1]];
    curve.addControlPoint(new ControlPoint(matrix, 0.0));
    
    curve.scaleBy(2.0);
    
    const scaledMatrix = curve.getValueAtTime(0.0);
    console.assert(scaledMatrix[0][3] === 4, 'X translation should be scaled to 4');
    console.assert(scaledMatrix[1][3] === 8, 'Y translation should be scaled to 8');
    console.assert(scaledMatrix[2][3] === 12, 'Z translation should be scaled to 12');
    
    console.log('✓ FramedCurve scaling tests passed');
}

/**
 * Test FramedCurve factory method
 */
export function testFramedCurveFactory() {
    console.log('Testing FramedCurve factory method...');
    
    const matrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
    const controlPoints = [
        new ControlPoint(matrix, 0.0),
        new ControlPoint(matrix, 1.0),
        new ControlPoint(matrix, 2.0)
    ];
    
    const curve = FramedCurve.frameCurveFactory(controlPoints);
    
    console.assert(curve.getNumberControlPoints() === 3, 'Factory curve should have 3 control points');
    console.assert(curve.getTmin() === 0.0, 'Factory curve should have correct min time');
    console.assert(curve.getTmax() === 2.0, 'Factory curve should have correct max time');
    
    console.log('✓ FramedCurve factory tests passed');
}

// Jest runner (turn legacy console.assert checks into test failures)
describe('FramedCurve (legacy assertions)', () => {
  /** @type {import('@jest/globals').SpyInstance} */
  let logSpy;
  /** @type {import('@jest/globals').SpyInstance} */
  let assertSpy;

  beforeAll(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    assertSpy = jest.spyOn(console, 'assert').mockImplementation((condition, ...args) => {
      if (!condition) {
        throw new Error(args.join(' ') || 'console.assert failed');
      }
    });
  });

  afterAll(() => {
    logSpy?.mockRestore();
    assertSpy?.mockRestore();
  });

  test('ControlPoint basic', () => testControlPointBasic());
  test('ControlPoint scale', () => testControlPointScale());
  test('ControlPoint comparison', () => testControlPointComparison());
  test('FramedCurve basic', () => testFramedCurveBasic());
  test('FramedCurve time bounds', () => testFramedCurveTimeBounds());
  test('FramedCurve interpolation', () => testFramedCurveInterpolation());
  test('FramedCurve boundary conditions', () => testFramedCurveBoundaryConditions());
  test('FramedCurve scaling', () => testFramedCurveScaling());
  test('FramedCurve factory', () => testFramedCurveFactory());
});
