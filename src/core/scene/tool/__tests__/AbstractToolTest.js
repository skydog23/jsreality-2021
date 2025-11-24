/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { AbstractTool } from '../AbstractTool.js';
import { InputSlot } from '../InputSlot.js';
import { AxisState } from '../AxisState.js';

/**
 * @typedef {import('../ToolContext.js').ToolContext} ToolContext
 */

/**
 * Simple test tool implementation
 */
class TestTool extends AbstractTool {
  constructor(...activationSlots) {
    super(...activationSlots);
    this.activateCalled = false;
    this.performCalled = false;
    this.deactivateCalled = false;
    this.activateContext = null;
    this.performContext = null;
    this.deactivateContext = null;
  }
  
  activate(tc) {
    this.activateCalled = true;
    this.activateContext = tc;
  }
  
  perform(tc) {
    this.performCalled = true;
    this.performContext = tc;
  }
  
  deactivate(tc) {
    this.deactivateCalled = true;
    this.deactivateContext = tc;
  }
}

/**
 * Test AbstractTool slot management
 */
export function testSlotManagement() {
  console.log('=== AbstractTool Slot Management Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Tool with activation slots
  console.log('\n1. Tool with activation slots:');
  const slot1 = InputSlot.LEFT_BUTTON;
  const tool1 = new TestTool(slot1);
  const activationSlots = tool1.getActivationSlots();
  if (activationSlots.length === 1 && activationSlots[0] === slot1) {
    console.log('   ✓ PASS: Activation slots set correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Activation slots incorrect (expected 1, got ${activationSlots.length})`);
    failed++;
  }
  
  // Test 2: Tool without activation slots (always active)
  console.log('\n2. Tool without activation slots (always active):');
  const tool2 = new TestTool();
  const activationSlots2 = tool2.getActivationSlots();
  if (activationSlots2.length === 0) {
    console.log('   ✓ PASS: Always-active tool has no activation slots');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Always-active tool has ${activationSlots2.length} activation slots`);
    failed++;
  }
  
  // Test 3: Add current slot
  console.log('\n3. Add current slot:');
  const tool3 = new TestTool();
  const currentSlot = InputSlot.POINTER_TRANSFORMATION;
  tool3.addCurrentSlot(currentSlot);
  const currentSlots = tool3.getCurrentSlots();
  if (currentSlots.length === 1 && currentSlots[0] === currentSlot) {
    console.log('   ✓ PASS: Current slot added correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Current slot not added correctly (expected 1, got ${currentSlots.length})`);
    failed++;
  }
  
  // Test 4: Add multiple current slots
  console.log('\n4. Add multiple current slots:');
  const tool4 = new TestTool();
  const slotA = InputSlot.POINTER_TRANSFORMATION;
  const slotB = InputSlot.SYSTEM_TIME;
  tool4.addCurrentSlot(slotA);
  tool4.addCurrentSlot(slotB);
  const currentSlots4 = tool4.getCurrentSlots();
  if (currentSlots4.length === 2 && currentSlots4.includes(slotA) && currentSlots4.includes(slotB)) {
    console.log('   ✓ PASS: Multiple current slots added correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Multiple current slots not added correctly`);
    failed++;
  }
  
  // Test 5: Prevent duplicate current slots
  console.log('\n5. Prevent duplicate current slots:');
  const tool5 = new TestTool();
  const slotC = InputSlot.LEFT_BUTTON;
  tool5.addCurrentSlot(slotC);
  tool5.addCurrentSlot(slotC); // Try to add same slot again
  const currentSlots5 = tool5.getCurrentSlots();
  if (currentSlots5.length === 1 && currentSlots5[0] === slotC) {
    console.log('   ✓ PASS: Duplicate slots prevented');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Duplicate slots not prevented (got ${currentSlots5.length} slots)`);
    failed++;
  }
  
  // Test 6: Remove current slot
  console.log('\n6. Remove current slot:');
  const tool6 = new TestTool();
  const slotD = InputSlot.MIDDLE_BUTTON;
  tool6.addCurrentSlot(slotD);
  tool6.removeCurrentSlot(slotD);
  const currentSlots6 = tool6.getCurrentSlots();
  if (currentSlots6.length === 0) {
    console.log('   ✓ PASS: Current slot removed correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Current slot not removed (got ${currentSlots6.length} slots)`);
    failed++;
  }
  
  // Test 7: getCurrentSlots() returns copy
  console.log('\n7. getCurrentSlots() returns copy:');
  const tool7 = new TestTool();
  const slotE = InputSlot.RIGHT_BUTTON;
  tool7.addCurrentSlot(slotE);
  const slots1 = tool7.getCurrentSlots();
  const slots2 = tool7.getCurrentSlots();
  if (slots1 !== slots2) {
    console.log('   ✓ PASS: getCurrentSlots() returns copy');
    passed++;
  } else {
    console.log('   ✗ FAIL: getCurrentSlots() returns same array reference');
    failed++;
  }
  
  // Test 8: getActivationSlots() returns copy
  console.log('\n8. getActivationSlots() returns copy:');
  const slotF = InputSlot.LEFT_BUTTON;
  const tool8 = new TestTool(slotF);
  const actSlots1 = tool8.getActivationSlots();
  const actSlots2 = tool8.getActivationSlots();
  if (actSlots1 !== actSlots2) {
    console.log('   ✓ PASS: getActivationSlots() returns copy');
    passed++;
  } else {
    console.log('   ✗ FAIL: getActivationSlots() returns same array reference');
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test AbstractTool descriptions
 */
export function testDescriptions() {
  console.log('\n=== AbstractTool Descriptions Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Default description
  console.log('\n1. Default description:');
  const tool1 = new TestTool();
  const desc1 = tool1.getDescription();
  if (desc1 === "none") {
    console.log('   ✓ PASS: Default description is "none"');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Default description is "${desc1}" instead of "none"`);
    failed++;
  }
  
  // Test 2: Set description
  console.log('\n2. Set description:');
  const tool2 = new TestTool();
  tool2.setDescription("Test tool description");
  const desc2 = tool2.getDescription();
  if (desc2 === "Test tool description") {
    console.log('   ✓ PASS: Description set correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Description not set correctly ("${desc2}")`);
    failed++;
  }
  
  // Test 3: Slot description default
  console.log('\n3. Slot description default:');
  const tool3 = new TestTool();
  const slot = InputSlot.POINTER_TRANSFORMATION;
  tool3.addCurrentSlot(slot);
  const slotDesc = tool3.getDescription(slot);
  if (slotDesc === "<no description>") {
    console.log('   ✓ PASS: Default slot description is "<no description>"');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Default slot description is "${slotDesc}"`);
    failed++;
  }
  
  // Test 4: Slot description with custom description
  console.log('\n4. Slot description with custom description:');
  const tool4 = new TestTool();
  const slot2 = InputSlot.SYSTEM_TIME;
  tool4.addCurrentSlot(slot2, "Time slot for animation");
  const slotDesc2 = tool4.getDescription(slot2);
  if (slotDesc2 === "Time slot for animation") {
    console.log('   ✓ PASS: Custom slot description set correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Custom slot description not set correctly ("${slotDesc2}")`);
    failed++;
  }
  
  // Test 5: fullDescription()
  console.log('\n5. fullDescription():');
  const tool5 = new TestTool(InputSlot.LEFT_BUTTON);
  tool5.setDescription("Test tool");
  tool5.addCurrentSlot(InputSlot.POINTER_TRANSFORMATION, "Pointer");
  const fullDesc = tool5.fullDescription();
  if (fullDesc.includes("TestTool") && fullDesc.includes("Test tool") && fullDesc.includes("Pointer")) {
    console.log('   ✓ PASS: fullDescription() includes expected information');
    passed++;
  } else {
    console.log('   ✗ FAIL: fullDescription() missing expected information');
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test AbstractTool lifecycle methods
 */
export function testLifecycleMethods() {
  console.log('\n=== AbstractTool Lifecycle Methods Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Create a mock ToolContext
  const mockContext = {
    getViewer: () => null,
    getSource: () => InputSlot.LEFT_BUTTON,
    getTransformationMatrix: () => null,
    getAxisState: () => null,
    getTime: () => Date.now(),
    getRootToLocal: () => null,
    getRootToToolComponent: () => null,
    getCurrentPick: () => null,
    getCurrentPicks: () => [],
    getAvatarPath: () => null,
    getPickSystem: () => null,
    reject: () => {},
    getKey: () => ({})
  };
  
  // Test 1: activate() called
  console.log('\n1. activate() called:');
  const tool1 = new TestTool(InputSlot.LEFT_BUTTON);
  tool1.activate(mockContext);
  if (tool1.activateCalled && tool1.activateContext === mockContext) {
    console.log('   ✓ PASS: activate() called correctly');
    passed++;
  } else {
    console.log('   ✗ FAIL: activate() not called correctly');
    failed++;
  }
  
  // Test 2: perform() called
  console.log('\n2. perform() called:');
  const tool2 = new TestTool();
  tool2.perform(mockContext);
  if (tool2.performCalled && tool2.performContext === mockContext) {
    console.log('   ✓ PASS: perform() called correctly');
    passed++;
  } else {
    console.log('   ✗ FAIL: perform() not called correctly');
    failed++;
  }
  
  // Test 3: deactivate() called
  console.log('\n3. deactivate() called:');
  const tool3 = new TestTool(InputSlot.LEFT_BUTTON);
  tool3.deactivate(mockContext);
  if (tool3.deactivateCalled && tool3.deactivateContext === mockContext) {
    console.log('   ✓ PASS: deactivate() called correctly');
    passed++;
  } else {
    console.log('   ✗ FAIL: deactivate() not called correctly');
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test AbstractTool hashCode and equals
 */
export function testHashCodeAndEquals() {
  console.log('\n=== AbstractTool hashCode() and equals() Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: hashCode() is consistent
  console.log('\n1. hashCode() is consistent:');
  const tool1 = new TestTool();
  const hash1 = tool1.hashCode();
  const hash2 = tool1.hashCode();
  if (hash1 === hash2) {
    console.log(`   ✓ PASS: hashCode() is consistent (${hash1})`);
    passed++;
  } else {
    console.log(`   ✗ FAIL: hashCode() not consistent (${hash1} vs ${hash2})`);
    failed++;
  }
  
  // Test 2: Different tools have different hash codes
  console.log('\n2. Different tools have different hash codes:');
  const tool2 = new TestTool();
  const tool3 = new TestTool();
  if (tool2.hashCode() !== tool3.hashCode()) {
    console.log('   ✓ PASS: Different tools have different hash codes');
    passed++;
  } else {
    console.log('   ✗ FAIL: Different tools have same hash code');
    failed++;
  }
  
  // Test 3: equals() with same instance
  console.log('\n3. equals() with same instance:');
  const tool4 = new TestTool();
  if (tool4.equals(tool4)) {
    console.log('   ✓ PASS: equals() returns true for same instance');
    passed++;
  } else {
    console.log('   ✗ FAIL: equals() returns false for same instance');
    failed++;
  }
  
  // Test 4: equals() with different instances
  console.log('\n4. equals() with different instances:');
  const tool5 = new TestTool();
  const tool6 = new TestTool();
  if (!tool5.equals(tool6)) {
    console.log('   ✓ PASS: equals() returns false for different instances');
    passed++;
  } else {
    console.log('   ✗ FAIL: equals() returns true for different instances');
    failed++;
  }
  
  // Test 5: equals() with null
  console.log('\n5. equals() with null:');
  const tool7 = new TestTool();
  if (!tool7.equals(null)) {
    console.log('   ✓ PASS: equals() returns false for null');
    passed++;
  } else {
    console.log('   ✗ FAIL: equals() returns true for null');
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Run all AbstractTool tests
 */
export function runAllTests() {
  console.log('\n========================================');
  console.log('AbstractTool Test Suite');
  console.log('========================================\n');
  
  const test1 = testSlotManagement();
  const test2 = testDescriptions();
  const test3 = testLifecycleMethods();
  const test4 = testHashCodeAndEquals();
  
  const allPassed = test1 && test2 && test3 && test4;
  
  console.log('\n========================================');
  if (allPassed) {
    console.log('✓ All AbstractTool tests PASSED');
  } else {
    console.log('✗ Some AbstractTool tests FAILED');
  }
  console.log('========================================\n');
  
  return allPassed;
}

// Run tests if executed directly
if (import.meta.url.endsWith('AbstractToolTest.js')) {
  runAllTests();
}

