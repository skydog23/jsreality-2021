/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { AxisState } from '../AxisState.js';

/**
 * Test AxisState value conversion
 */
export function testValueConversion() {
  console.log('=== AxisState Value Conversion Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Double value in range [-1, 1]
  console.log('\n1. Double value in range [-1, 1]:');
  const state1 = new AxisState(0.5);
  const doubleVal = state1.doubleValue();
  if (Math.abs(doubleVal - 0.5) < 0.01) {
    console.log(`   ✓ PASS: doubleValue() returns ${doubleVal.toFixed(3)} (expected ~0.5)`);
    passed++;
  } else {
    console.log(`   ✗ FAIL: doubleValue() returned ${doubleVal} instead of ~0.5`);
    failed++;
  }
  
  // Test 2: Integer value (outside [-1, 1] range)
  console.log('\n2. Integer value (outside [-1, 1] range):');
  const state2 = new AxisState(1000);
  const intVal = state2.intValue();
  // When value is outside [-1, 1], it's treated as an integer and stored directly
  if (intVal === 1000) {
    console.log(`   ✓ PASS: intValue() returns ${intVal}`);
    passed++;
  } else {
    console.log(`   ✗ FAIL: intValue() returned ${intVal} instead of 1000`);
    failed++;
  }
  
  // Test 3: Value clamping (values > 1)
  console.log('\n3. Value clamping (values > 1):');
  const state3 = new AxisState(2.0);
  const clampedVal = state3.doubleValue();
  if (Math.abs(clampedVal - 1.0) < 0.01) {
    console.log(`   ✓ PASS: Value clamped to ${clampedVal.toFixed(3)} (expected ~1.0)`);
    passed++;
  } else {
    console.log(`   ✗ FAIL: Value not clamped correctly: ${clampedVal}`);
    failed++;
  }
  
  // Test 4: Value clamping (values < -1)
  console.log('\n4. Value clamping (values < -1):');
  const state4 = new AxisState(-2.0);
  const clampedNegVal = state4.doubleValue();
  if (Math.abs(clampedNegVal - (-1.0)) < 0.01) {
    console.log(`   ✓ PASS: Value clamped to ${clampedNegVal.toFixed(3)} (expected ~-1.0)`);
    passed++;
  } else {
    console.log(`   ✗ FAIL: Value not clamped correctly: ${clampedNegVal}`);
    failed++;
  }
  
  // Test 5: Round-trip conversion
  console.log('\n5. Round-trip conversion:');
  const originalDouble = 0.75;
  const state5 = new AxisState(originalDouble);
  const roundTrip = state5.doubleValue();
  if (Math.abs(roundTrip - originalDouble) < 0.01) {
    console.log(`   ✓ PASS: Round-trip conversion works (${originalDouble} → ${roundTrip.toFixed(3)})`);
    passed++;
  } else {
    console.log(`   ✗ FAIL: Round-trip conversion failed (${originalDouble} → ${roundTrip})`);
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test AxisState constants and state checks
 */
export function testStateChecks() {
  console.log('\n=== AxisState State Checks Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: PRESSED constant
  console.log('\n1. PRESSED constant:');
  if (AxisState.PRESSED.isPressed() && !AxisState.PRESSED.isReleased()) {
    console.log('   ✓ PASS: PRESSED constant works correctly');
    passed++;
  } else {
    console.log('   ✗ FAIL: PRESSED constant not working correctly');
    failed++;
  }
  
  // Test 2: ORIGIN constant
  console.log('\n2. ORIGIN constant:');
  if (AxisState.ORIGIN.isReleased() && !AxisState.ORIGIN.isPressed()) {
    console.log('   ✓ PASS: ORIGIN constant works correctly');
    passed++;
  } else {
    console.log('   ✗ FAIL: ORIGIN constant not working correctly');
    failed++;
  }
  
  // Test 3: isPressed() for pressed state
  console.log('\n3. isPressed() for pressed state:');
  const pressedState = new AxisState(1.0);
  if (pressedState.isPressed()) {
    console.log('   ✓ PASS: isPressed() returns true for pressed state');
    passed++;
  } else {
    console.log('   ✗ FAIL: isPressed() returns false for pressed state');
    failed++;
  }
  
  // Test 4: isPressed() for negative pressed state
  console.log('\n4. isPressed() for negative pressed state:');
  const negPressedState = new AxisState(-1.0);
  if (negPressedState.isPressed()) {
    console.log('   ✓ PASS: isPressed() returns true for negative pressed state');
    passed++;
  } else {
    console.log('   ✗ FAIL: isPressed() returns false for negative pressed state');
    failed++;
  }
  
  // Test 5: isReleased() for zero state
  console.log('\n5. isReleased() for zero state:');
  const zeroState = new AxisState(0.0);
  if (zeroState.isReleased() && !zeroState.isPressed()) {
    console.log('   ✓ PASS: isReleased() returns true for zero state');
    passed++;
  } else {
    console.log('   ✗ FAIL: isReleased() not working correctly for zero state');
    failed++;
  }
  
  // Test 6: isPressed() for intermediate values
  console.log('\n6. isPressed() for intermediate values:');
  const intermediateState = new AxisState(0.5);
  if (!intermediateState.isPressed() && !intermediateState.isReleased()) {
    console.log('   ✓ PASS: Intermediate values are neither pressed nor released');
    passed++;
  } else {
    console.log('   ✗ FAIL: Intermediate values incorrectly classified');
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test AxisState toString()
 */
export function testToString() {
  console.log('\n=== AxisState toString() Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: PRESSED toString()
  console.log('\n1. PRESSED toString():');
  const pressedStr = AxisState.PRESSED.toString();
  if (pressedStr.includes('PRESSED')) {
    console.log(`   ✓ PASS: toString() returns "${pressedStr}"`);
    passed++;
  } else {
    console.log(`   ✗ FAIL: toString() returned "${pressedStr}"`);
    failed++;
  }
  
  // Test 2: ORIGIN toString()
  console.log('\n2. ORIGIN toString():');
  const originStr = AxisState.ORIGIN.toString();
  if (originStr.includes('ORIGIN')) {
    console.log(`   ✓ PASS: toString() returns "${originStr}"`);
    passed++;
  } else {
    console.log(`   ✗ FAIL: toString() returned "${originStr}"`);
    failed++;
  }
  
  // Test 3: Intermediate value toString()
  console.log('\n3. Intermediate value toString():');
  const intermediateState = new AxisState(0.75);
  const intermediateStr = intermediateState.toString();
  if (intermediateStr.includes('AxisState=') && intermediateStr.includes('[')) {
    console.log(`   ✓ PASS: toString() returns "${intermediateStr}"`);
    passed++;
  } else {
    console.log(`   ✗ FAIL: toString() returned "${intermediateStr}"`);
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Run all AxisState tests
 */
export function runAllTests() {
  console.log('\n========================================');
  console.log('AxisState Test Suite');
  console.log('========================================\n');
  
  const test1 = testValueConversion();
  const test2 = testStateChecks();
  const test3 = testToString();
  
  const allPassed = test1 && test2 && test3;
  
  console.log('\n========================================');
  if (allPassed) {
    console.log('✓ All AxisState tests PASSED');
  } else {
    console.log('✗ Some AxisState tests FAILED');
  }
  console.log('========================================\n');
  
  return allPassed;
}

// Run tests if executed directly
if (import.meta.url.endsWith('AxisStateTest.js')) {
  runAllTests();
}

