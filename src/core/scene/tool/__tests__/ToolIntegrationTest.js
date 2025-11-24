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
import { SceneGraphComponent } from '../../SceneGraphComponent.js';

/**
 * @typedef {import('../ToolContext.js').ToolContext} ToolContext
 */

/**
 * Simple test tool for integration testing
 */
class IntegrationTestTool extends AbstractTool {
  constructor(...activationSlots) {
    super(...activationSlots);
    this.activateCallCount = 0;
    this.performCallCount = 0;
    this.deactivateCallCount = 0;
  }
  
  activate(tc) {
    this.activateCallCount++;
  }
  
  perform(tc) {
    this.performCallCount++;
  }
  
  deactivate(tc) {
    this.deactivateCallCount++;
  }
}

/**
 * Test tool attachment to SceneGraphComponent
 */
export function testToolAttachment() {
  console.log('=== Tool Attachment to SceneGraphComponent Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Add tool to component
  console.log('\n1. Add tool to component:');
  const component = new SceneGraphComponent("test");
  const tool = new IntegrationTestTool();
  component.addTool(tool);
  const tools = component.getTools();
  if (tools.length === 1 && tools[0] === tool) {
    console.log('   ✓ PASS: Tool added correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Tool not added correctly (got ${tools.length} tools)`);
    failed++;
  }
  
  // Test 2: Prevent duplicate tools
  console.log('\n2. Prevent duplicate tools:');
  const component2 = new SceneGraphComponent("test2");
  const tool2 = new IntegrationTestTool();
  component2.addTool(tool2);
  component2.addTool(tool2); // Try to add same tool again
  const tools2 = component2.getTools();
  if (tools2.length === 1) {
    console.log('   ✓ PASS: Duplicate tools prevented');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Duplicate tools not prevented (got ${tools2.length} tools)`);
    failed++;
  }
  
  // Test 3: Remove tool from component
  console.log('\n3. Remove tool from component:');
  const component3 = new SceneGraphComponent("test3");
  const tool3 = new IntegrationTestTool();
  component3.addTool(tool3);
  const removed = component3.removeTool(tool3);
  const tools3 = component3.getTools();
  if (removed && tools3.length === 0) {
    console.log('   ✓ PASS: Tool removed correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Tool not removed correctly (removed=${removed}, tools=${tools3.length})`);
    failed++;
  }
  
  // Test 4: Remove non-existent tool
  console.log('\n4. Remove non-existent tool:');
  const component4 = new SceneGraphComponent("test4");
  const tool4 = new IntegrationTestTool();
  const removed4 = component4.removeTool(tool4);
  if (!removed4) {
    console.log('   ✓ PASS: Removing non-existent tool returns false');
    passed++;
  } else {
    console.log('   ✗ FAIL: Removing non-existent tool returned true');
    failed++;
  }
  
  // Test 5: Multiple tools on same component
  console.log('\n5. Multiple tools on same component:');
  const component5 = new SceneGraphComponent("test5");
  const tool5a = new IntegrationTestTool();
  const tool5b = new IntegrationTestTool();
  component5.addTool(tool5a);
  component5.addTool(tool5b);
  const tools5 = component5.getTools();
  if (tools5.length === 2 && tools5.includes(tool5a) && tools5.includes(tool5b)) {
    console.log('   ✓ PASS: Multiple tools added correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Multiple tools not added correctly (got ${tools5.length} tools)`);
    failed++;
  }
  
  // Test 6: getTools() returns copy
  console.log('\n6. getTools() returns copy:');
  const component6 = new SceneGraphComponent("test6");
  const tool6 = new IntegrationTestTool();
  component6.addTool(tool6);
  const tools6a = component6.getTools();
  const tools6b = component6.getTools();
  if (tools6a !== tools6b) {
    console.log('   ✓ PASS: getTools() returns copy');
    passed++;
  } else {
    console.log('   ✗ FAIL: getTools() returns same array reference');
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test tool lifecycle method calls (simulated)
 * Note: Actual lifecycle calls require ToolSystem implementation
 */
export function testToolLifecycle() {
  console.log('\n=== Tool Lifecycle Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Tool can be activated (method exists)
  console.log('\n1. Tool activate() method exists:');
  const tool1 = new IntegrationTestTool(InputSlot.LEFT_BUTTON);
  if (typeof tool1.activate === 'function') {
    console.log('   ✓ PASS: activate() method exists');
    passed++;
  } else {
    console.log('   ✗ FAIL: activate() method does not exist');
    failed++;
  }
  
  // Test 2: Tool can perform (method exists)
  console.log('\n2. Tool perform() method exists:');
  const tool2 = new IntegrationTestTool();
  if (typeof tool2.perform === 'function') {
    console.log('   ✓ PASS: perform() method exists');
    passed++;
  } else {
    console.log('   ✗ FAIL: perform() method does not exist');
    failed++;
  }
  
  // Test 3: Tool can be deactivated (method exists)
  console.log('\n3. Tool deactivate() method exists:');
  const tool3 = new IntegrationTestTool(InputSlot.LEFT_BUTTON);
  if (typeof tool3.deactivate === 'function') {
    console.log('   ✓ PASS: deactivate() method exists');
    passed++;
  } else {
    console.log('   ✗ FAIL: deactivate() method does not exist');
    failed++;
  }
  
  // Test 4: Tool tracks activation calls
  console.log('\n4. Tool tracks activation calls:');
  const tool4 = new IntegrationTestTool(InputSlot.LEFT_BUTTON);
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
  tool4.activate(mockContext);
  if (tool4.activateCallCount === 1) {
    console.log('   ✓ PASS: Tool tracks activation calls');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Tool activation tracking failed (got ${tool4.activateCallCount} calls)`);
    failed++;
  }
  
  // Test 5: Tool tracks perform calls
  console.log('\n5. Tool tracks perform calls:');
  const tool5 = new IntegrationTestTool();
  tool5.perform(mockContext);
  if (tool5.performCallCount === 1) {
    console.log('   ✓ PASS: Tool tracks perform calls');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Tool perform tracking failed (got ${tool5.performCallCount} calls)`);
    failed++;
  }
  
  // Test 6: Tool tracks deactivation calls
  console.log('\n6. Tool tracks deactivation calls:');
  const tool6 = new IntegrationTestTool(InputSlot.LEFT_BUTTON);
  tool6.deactivate(mockContext);
  if (tool6.deactivateCallCount === 1) {
    console.log('   ✓ PASS: Tool tracks deactivation calls');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Tool deactivation tracking failed (got ${tool6.deactivateCallCount} calls)`);
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test tool with different activation configurations
 */
export function testToolConfigurations() {
  console.log('\n=== Tool Configuration Test ===');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Tool with single activation slot
  console.log('\n1. Tool with single activation slot:');
  const tool1 = new IntegrationTestTool(InputSlot.LEFT_BUTTON);
  const slots1 = tool1.getActivationSlots();
  if (slots1.length === 1 && slots1[0] === InputSlot.LEFT_BUTTON) {
    console.log('   ✓ PASS: Single activation slot configured correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Single activation slot not configured correctly`);
    failed++;
  }
  
  // Test 2: Tool with multiple activation slots
  console.log('\n2. Tool with multiple activation slots:');
  const tool2 = new IntegrationTestTool(InputSlot.LEFT_BUTTON, InputSlot.MIDDLE_BUTTON);
  const slots2 = tool2.getActivationSlots();
  if (slots2.length === 2 && slots2.includes(InputSlot.LEFT_BUTTON) && slots2.includes(InputSlot.MIDDLE_BUTTON)) {
    console.log('   ✓ PASS: Multiple activation slots configured correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Multiple activation slots not configured correctly`);
    failed++;
  }
  
  // Test 3: Always-active tool (no activation slots)
  console.log('\n3. Always-active tool (no activation slots):');
  const tool3 = new IntegrationTestTool();
  const slots3 = tool3.getActivationSlots();
  if (slots3.length === 0) {
    console.log('   ✓ PASS: Always-active tool configured correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Always-active tool has ${slots3.length} activation slots`);
    failed++;
  }
  
  // Test 4: Tool with current slots
  console.log('\n4. Tool with current slots:');
  const tool4 = new IntegrationTestTool();
  tool4.addCurrentSlot(InputSlot.POINTER_TRANSFORMATION);
  tool4.addCurrentSlot(InputSlot.SYSTEM_TIME);
  const currentSlots = tool4.getCurrentSlots();
  if (currentSlots.length === 2) {
    console.log('   ✓ PASS: Current slots configured correctly');
    passed++;
  } else {
    console.log(`   ✗ FAIL: Current slots not configured correctly (got ${currentSlots.length})`);
    failed++;
  }
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Run all integration tests
 */
export function runAllTests() {
  console.log('\n========================================');
  console.log('Tool Integration Test Suite');
  console.log('========================================\n');
  
  const test1 = testToolAttachment();
  const test2 = testToolLifecycle();
  const test3 = testToolConfigurations();
  
  const allPassed = test1 && test2 && test3;
  
  console.log('\n========================================');
  if (allPassed) {
    console.log('✓ All Tool Integration tests PASSED');
  } else {
    console.log('✗ Some Tool Integration tests FAILED');
  }
  console.log('========================================\n');
  
  return allPassed;
}

// Run tests if executed directly
if (import.meta.url.endsWith('ToolIntegrationTest.js')) {
  runAllTests();
}

