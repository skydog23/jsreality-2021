/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { InputSlot } from '../InputSlot.js';

/**
 * Test InputSlot singleton behavior
 */
export function testSingletonBehavior() {
  console.log('=== InputSlot Singleton Behavior Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Same name returns same instance
  console.log('\n1. Same name returns same instance:');
  const slot1 = InputSlot.getDevice("TestSlot");
  const slot2 = InputSlot.getDevice("TestSlot");
  if (slot1 === slot2) {
    console.log('   ✓ PASS: Same instance returned');
    passed++;
  } else {
    console.log('   ✗ FAIL: Different instances returned');
    failed++;
  }
  
  // Test 2: Different names return different instances
  console.log('\n2. Different names return different instances:');
  const slot3 = InputSlot.getDevice("TestSlot1");
  const slot4 = InputSlot.getDevice("TestSlot2");
  if (slot3 !== slot4) {
    console.log('   ✓ PASS: Different instances returned');
    passed++;
  } else {
    console.log('   ✗ FAIL: Same instance returned for different names');
    failed++;
  }
  
  // Test 3: getName() returns correct name
  console.log('\n3. getName() returns correct name:');
  const slot5 = InputSlot.getDevice("MySlot");
  if (slot5.getName() === "MySlot") {
    console.log('   ✓ PASS: getName() returns correct name');
    passed++;
  } else {
    console.log(`   ✗ FAIL: getName() returned "${slot5.getName()}" instead of "MySlot"`);
    failed++;
  }
  
  // Test 4: Predefined slots exist and are singletons
  console.log('\n4. Predefined slots exist and are singletons:');
  const left1 = InputSlot.LEFT_BUTTON;
  const left2 = InputSlot.getDevice("PrimaryAction");
  if (left1 === left2 && left1.getName() === "PrimaryAction") {
    console.log('   ✓ PASS: Predefined slots work correctly');
    passed++;
  } else {
    console.log('   ✗ FAIL: Predefined slots not working correctly');
    failed++;
  }
  
  // Test 5: toString() returns name
  console.log('\n5. toString() returns name:');
  const slot6 = InputSlot.getDevice("TestToString");
  if (slot6.toString() === "TestToString") {
    console.log('   ✓ PASS: toString() returns name');
    passed++;
  } else {
    console.log(`   ✗ FAIL: toString() returned "${slot6.toString()}" instead of "TestToString"`);
    failed++;
  }
  
  // Test 6: equals() works correctly
  console.log('\n6. equals() works correctly:');
  const slot7 = InputSlot.getDevice("TestEquals");
  const slot8 = InputSlot.getDevice("TestEquals");
  const slot9 = InputSlot.getDevice("TestEqualsDifferent");
  if (slot7.equals(slot8) && !slot7.equals(slot9) && slot7.equals(slot7)) {
    console.log('   ✓ PASS: equals() works correctly');
    passed++;
  } else {
    console.log('   ✗ FAIL: equals() not working correctly');
    failed++;
  }
  
  // Test 7: hashCode() is consistent
  console.log('\n7. hashCode() is consistent:');
  const slot10 = InputSlot.getDevice("TestHash");
  const slot11 = InputSlot.getDevice("TestHash");
  if (slot10.hashCode() === slot11.hashCode()) {
    console.log('   ✓ PASS: hashCode() is consistent');
    passed++;
  } else {
    console.log('   ✗ FAIL: hashCode() not consistent');
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test all predefined slots
 */
export function testPredefinedSlots() {
  console.log('\n=== Predefined Slots Test ===');
  
  let passed = 0;
  let failed = 0;
  
  const predefinedSlots = [
    { name: 'POINTER_HIT', slot: InputSlot.POINTER_HIT, expectedName: 'PointerHit' },
    { name: 'POINTER_TRANSFORMATION', slot: InputSlot.POINTER_TRANSFORMATION, expectedName: 'PointerTransformation' },
    { name: 'SYSTEM_TIME', slot: InputSlot.SYSTEM_TIME, expectedName: 'SystemTime' },
    { name: 'LEFT_BUTTON', slot: InputSlot.LEFT_BUTTON, expectedName: 'PrimaryAction' },
    { name: 'MIDDLE_BUTTON', slot: InputSlot.MIDDLE_BUTTON, expectedName: 'PrimaryMenu' },
    { name: 'RIGHT_BUTTON', slot: InputSlot.RIGHT_BUTTON, expectedName: 'PrimarySelection' },
    { name: 'SHIFT_LEFT_BUTTON', slot: InputSlot.SHIFT_LEFT_BUTTON, expectedName: 'SecondaryAction' },
    { name: 'SHIFT_MIDDLE_BUTTON', slot: InputSlot.SHIFT_MIDDLE_BUTTON, expectedName: 'SecondaryMenu' },
    { name: 'SHIFT_RIGHT_BUTTON', slot: InputSlot.SHIFT_RIGHT_BUTTON, expectedName: 'SecondarySelection' },
    { name: 'META_LEFT_BUTTON', slot: InputSlot.META_LEFT_BUTTON, expectedName: 'TertiaryAction' },
    { name: 'META_MIDDLE_BUTTON', slot: InputSlot.META_MIDDLE_BUTTON, expectedName: 'TertiaryMenu' },
    { name: 'META_RIGHT_BUTTON', slot: InputSlot.META_RIGHT_BUTTON, expectedName: 'TertiarySelection' }
  ];
  
  for (const { name, slot, expectedName } of predefinedSlots) {
    if (slot && slot.getName() === expectedName) {
      console.log(`   ✓ ${name}: ${expectedName}`);
      passed++;
    } else {
      console.log(`   ✗ ${name}: FAILED`);
      failed++;
    }
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Run all InputSlot tests
 */
export function runAllTests() {
  console.log('\n========================================');
  console.log('InputSlot Test Suite');
  console.log('========================================\n');
  
  const test1 = testSingletonBehavior();
  const test2 = testPredefinedSlots();
  
  const allPassed = test1 && test2;
  
  console.log('\n========================================');
  if (allPassed) {
    console.log('✓ All InputSlot tests PASSED');
  } else {
    console.log('✗ Some InputSlot tests FAILED');
  }
  console.log('========================================\n');
  
  return allPassed;
}

// Run tests if executed directly
if (import.meta.url.endsWith('InputSlotTest.js')) {
  runAllTests();
}

