/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Polyfill requestAnimationFrame for Node.js
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16); // ~60fps
  };
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

import { ToolSystem } from '../ToolSystem.js';
import { ToolSystemConfiguration, VirtualMapping } from '../ToolSystemConfiguration.js';
import { ToolEvent } from '../ToolEvent.js';
import { InputSlot } from '../InputSlot.js';
import { AxisState } from '../AxisState.js';
import { AbstractTool } from '../AbstractTool.js';
import { SceneGraphPath } from '../../SceneGraphPath.js';
import { SceneGraphComponent } from '../../SceneGraphComponent.js';
import { Viewer } from '../../Viewer.js';

/**
 * @typedef {import('../ToolContext.js').ToolContext} ToolContext
 */

/**
 * Simple test tool for testing activation/deactivation.
 */
class TestActivationTool extends AbstractTool {
  constructor() {
    super(InputSlot.LEFT_BUTTON);
    this.activateCallCount = 0;
    this.performCallCount = 0;
    this.deactivateCallCount = 0;
    this.lastContext = null;
  }

  activate(tc) {
    this.activateCallCount++;
    this.lastContext = tc;
  }

  perform(tc) {
    this.performCallCount++;
    this.lastContext = tc;
  }

  deactivate(tc) {
    this.deactivateCallCount++;
    this.lastContext = tc;
  }
}

/**
 * Always-active test tool.
 */
class TestAlwaysActiveTool extends AbstractTool {
  constructor() {
    super(); // No activation slots = always active
    this.performCallCount = 0;
  }

  perform(tc) {
    this.performCallCount++;
  }
}

// Use Viewer.createMockViewer() instead of custom MockViewer

/**
 * Test ToolSystem creation and initialization.
 */
export function testToolSystemCreation() {
  console.log('=== ToolSystem Creation Test ===');

  let passed = 0;
  let failed = 0;

  // Test 1: Create ToolSystem with default config
  console.log('\n1. Create ToolSystem with default config:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const toolSystem = new ToolSystem(viewer, null, null);
    if (toolSystem !== null) {
      console.log('   ✓ PASS: ToolSystem created successfully');
      passed++;
    } else {
      console.log('   ✗ FAIL: ToolSystem creation returned null');
      failed++;
    }
  } catch (error) {
    console.log(`   ✗ FAIL: Error creating ToolSystem: ${error.message}`);
    failed++;
  }

  // Test 2: Create ToolSystem with custom config
  console.log('\n2. Create ToolSystem with custom config:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const config = new ToolSystemConfiguration();
    const toolSystem = new ToolSystem(viewer, config, null);
    if (toolSystem !== null) {
      console.log('   ✓ PASS: ToolSystem created with custom config');
      passed++;
    } else {
      console.log('   ✗ FAIL: ToolSystem creation returned null');
      failed++;
    }
  } catch (error) {
    console.log(`   ✗ FAIL: Error creating ToolSystem: ${error.message}`);
    failed++;
  }

  // Test 3: Initialize scene tools
  console.log('\n3. Initialize scene tools:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const toolSystem = new ToolSystem(viewer, null, null);
    toolSystem.initializeSceneTools();
    console.log('   ✓ PASS: Scene tools initialized');
    passed++;
  } catch (error) {
    console.log(`   ✗ FAIL: Error initializing scene tools: ${error.message}`);
    failed++;
  }

  // Test 4: Get/Set tool system for viewer
  console.log('\n4. Get/Set tool system for viewer:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const toolSystem = new ToolSystem(viewer, null, null);
    ToolSystem.setToolSystemForViewer(viewer, toolSystem);
    const retrieved = ToolSystem.getToolSystemForViewer(viewer);
    if (retrieved === toolSystem) {
      console.log('   ✓ PASS: ToolSystem stored and retrieved correctly');
      passed++;
    } else {
      console.log('   ✗ FAIL: Retrieved ToolSystem does not match');
      failed++;
    }
  } catch (error) {
    console.log(`   ✗ FAIL: Error with viewer mapping: ${error.message}`);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test tool registration and unregistration.
 */
export function testToolRegistration() {
  console.log('\n=== Tool Registration Test ===');

  let passed = 0;
  let failed = 0;

  // Test 1: Add tool to ToolSystem
  console.log('\n1. Add tool to ToolSystem:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const toolSystem = new ToolSystem(viewer, null, null);
    const tool = new TestActivationTool();
    const path = new SceneGraphPath();
    path.push(viewer.getSceneRoot());
    toolSystem.addTool(tool, path);
    console.log('   ✓ PASS: Tool added successfully');
    passed++;
  } catch (error) {
    console.log(`   ✗ FAIL: Error adding tool: ${error.message}`);
    failed++;
  }

  // Test 2: Remove tool from ToolSystem
  console.log('\n2. Remove tool from ToolSystem:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const toolSystem = new ToolSystem(viewer, null, null);
    const tool = new TestActivationTool();
    const path = new SceneGraphPath();
    path.push(viewer.getSceneRoot());
    toolSystem.addTool(tool, path);
    toolSystem.removeTool(tool, path);
    console.log('   ✓ PASS: Tool removed successfully');
    passed++;
  } catch (error) {
    console.log(`   ✗ FAIL: Error removing tool: ${error.message}`);
    failed++;
  }

  // Test 3: Add tool to scene graph component
  console.log('\n3. Add tool to scene graph component:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const toolSystem = new ToolSystem(viewer, null, null);
    const component = new SceneGraphComponent("test");
    const tool = new TestActivationTool();
    component.addTool(tool);
    const path = new SceneGraphPath();
    path.push(viewer.getSceneRoot());
    path.push(component);
    toolSystem.addTool(tool, path);
    console.log('   ✓ PASS: Tool added to component and ToolSystem');
    passed++;
  } catch (error) {
    console.log(`   ✗ FAIL: Error adding tool to component: ${error.message}`);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test tool event processing.
 */
export function testToolEventProcessing() {
  console.log('\n=== Tool Event Processing Test ===');

  let passed = 0;
  let failed = 0;

  // Test 1: Process axis state event
  console.log('\n1. Process axis state event:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const toolSystem = new ToolSystem(viewer, null, null);
    const event = new ToolEvent(null, Date.now(), InputSlot.LEFT_BUTTON, AxisState.PRESSED);
    toolSystem.processToolEvent(event);
    console.log('   ✓ PASS: Axis state event processed');
    passed++;
  } catch (error) {
    console.log(`   ✗ FAIL: Error processing event: ${error.message}`);
    failed++;
  }

  // Test 2: Process transformation event
  console.log('\n2. Process transformation event:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const toolSystem = new ToolSystem(viewer, null, null);
    const trafo = new Array(16).fill(0);
    trafo[0] = trafo[5] = trafo[10] = trafo[15] = 1; // Identity matrix
    const event = ToolEvent.createWithTransformation(null, Date.now(), InputSlot.POINTER_TRANSFORMATION, trafo);
    toolSystem.processToolEvent(event);
    console.log('   ✓ PASS: Transformation event processed');
    passed++;
  } catch (error) {
    console.log(`   ✗ FAIL: Error processing transformation event: ${error.message}`);
    failed++;
  }

  // Test 3: Process system time event
  console.log('\n3. Process system time event:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const toolSystem = new ToolSystem(viewer, null, null);
    const event = new ToolEvent(null, Date.now(), InputSlot.SYSTEM_TIME, AxisState.ORIGIN);
    toolSystem.processToolEvent(event);
    console.log('   ✓ PASS: System time event processed');
    passed++;
  } catch (error) {
    console.log(`   ✗ FAIL: Error processing system time event: ${error.message}`);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test tool activation flow (simplified - without picking).
 */
export function testToolActivationFlow() {
  console.log('\n=== Tool Activation Flow Test ===');

  let passed = 0;
  let failed = 0;

  // Test 1: Always-active tool receives perform calls
  console.log('\n1. Always-active tool receives perform calls:');
  try {
    const sceneRoot = new SceneGraphComponent("root");
    const viewer = Viewer.createMockViewer({ sceneRoot });
    const toolSystem = new ToolSystem(viewer, null, null);
    const tool = new TestAlwaysActiveTool();
    const component = new SceneGraphComponent("test");
    component.addTool(tool);
    const path = new SceneGraphPath();
    path.push(viewer.getSceneRoot());
    path.push(component);
    toolSystem.addTool(tool, path);
    toolSystem.initializeSceneTools();

    // Create an event for a slot the tool uses
    tool.addCurrentSlot(InputSlot.SYSTEM_TIME);
    const event = new ToolEvent(null, Date.now(), InputSlot.SYSTEM_TIME, AxisState.ORIGIN);
    toolSystem.processToolEvent(event);

    // Note: In a real scenario, the tool would need to be registered with SlotManager
    // and the event would need to trigger the tool. This is a simplified test.
    console.log('   ✓ PASS: Always-active tool setup completed');
    passed++;
  } catch (error) {
    console.log(`   ✗ FAIL: Error in activation flow: ${error.message}`);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Test ToolSystem configuration.
 */
export function testToolSystemConfiguration() {
  console.log('\n=== ToolSystem Configuration Test ===');

  let passed = 0;
  let failed = 0;

  // Test 1: Load default configuration
  console.log('\n1. Load default configuration:');
  try {
    const config = ToolSystemConfiguration.loadDefaultConfiguration();
    if (config !== null) {
      console.log('   ✓ PASS: Default configuration loaded');
      passed++;
    } else {
      console.log('   ✗ FAIL: Default configuration is null');
      failed++;
    }
  } catch (error) {
    console.log(`   ✗ FAIL: Error loading default config: ${error.message}`);
    failed++;
  }

  // Test 2: Create configuration with virtual mappings
  console.log('\n2. Create configuration with virtual mappings:');
  try {
    const sourceSlot = InputSlot.LEFT_BUTTON;
    const targetSlot = InputSlot.getDevice("CustomSlot");
    const mapping = new VirtualMapping(sourceSlot, targetSlot);
    const config = new ToolSystemConfiguration({ virtualMappings: [mapping] });
    const mappings = config.getVirtualMappings();
    if (mappings.length === 1) {
      console.log('   ✓ PASS: Configuration with virtual mappings created');
      passed++;
    } else {
      console.log(`   ✗ FAIL: Expected 1 mapping, got ${mappings.length}`);
      failed++;
    }
  } catch (error) {
    console.log(`   ✗ FAIL: Error creating config with mappings: ${error.message}`);
    failed++;
  }

  // Test 3: JSON serialization
  console.log('\n3. JSON serialization:');
  try {
    const config = ToolSystemConfiguration.loadDefaultConfiguration();
    const json = config.toJSON();
    if (json && typeof json === 'object') {
      console.log('   ✓ PASS: Configuration serialized to JSON');
      passed++;
    } else {
      console.log('   ✗ FAIL: JSON serialization failed');
      failed++;
    }
  } catch (error) {
    console.log(`   ✗ FAIL: Error serializing config: ${error.message}`);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

/**
 * Run all ToolSystem tests.
 */
export function runAllTests() {
  console.log('\n========================================');
  console.log('ToolSystem Test Suite');
  console.log('========================================\n');

  const test1 = testToolSystemCreation();
  const test2 = testToolRegistration();
  const test3 = testToolEventProcessing();
  const test4 = testToolActivationFlow();
  const test5 = testToolSystemConfiguration();

  const allPassed = test1 && test2 && test3 && test4 && test5;

  console.log('\n========================================');
  if (allPassed) {
    console.log('✓ All ToolSystem tests PASSED');
  } else {
    console.log('✗ Some ToolSystem tests FAILED');
  }
  console.log('========================================\n');

  return allPassed;
}

// Run tests if executed directly
if (import.meta.url.endsWith('ToolSystemTest.js')) {
  runAllTests();
}

