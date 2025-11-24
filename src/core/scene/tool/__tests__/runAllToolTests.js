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
 * Test runner for all tool system tests
 * Run with: node src/core/scene/tool/__tests__/runAllToolTests.js
 */

// Polyfill requestAnimationFrame for Node.js
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16);
  };
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

import { runAllTests as runInputSlotTests } from './InputSlotTest.js';
import { runAllTests as runAxisStateTests } from './AxisStateTest.js';
import { runAllTests as runAbstractToolTests } from './AbstractToolTest.js';
import { runAllTests as runIntegrationTests } from './ToolIntegrationTest.js';
import { runAllTests as runToolSystemTests } from './ToolSystemTest.js';

/**
 * Run all tool system tests
 */
export function runAllToolTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          Tool System Test Suite - All Tests              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const results = {
    inputSlot: false,
    axisState: false,
    abstractTool: false,
    integration: false,
    toolSystem: false
  };
  
  try {
    console.log('Running InputSlot tests...');
    results.inputSlot = runInputSlotTests();
  } catch (error) {
    console.error('Error running InputSlot tests:', error);
    results.inputSlot = false;
  }
  
  try {
    console.log('\nRunning AxisState tests...');
    results.axisState = runAxisStateTests();
  } catch (error) {
    console.error('Error running AxisState tests:', error);
    results.axisState = false;
  }
  
  try {
    console.log('\nRunning AbstractTool tests...');
    results.abstractTool = runAbstractToolTests();
  } catch (error) {
    console.error('Error running AbstractTool tests:', error);
    results.abstractTool = false;
  }
  
  try {
    console.log('\nRunning Integration tests...');
    results.integration = runIntegrationTests();
  } catch (error) {
    console.error('Error running Integration tests:', error);
    results.integration = false;
  }

  try {
    console.log('\nRunning ToolSystem tests...');
    results.toolSystem = runToolSystemTests();
  } catch (error) {
    console.error('Error running ToolSystem tests:', error);
    results.toolSystem = false;
  }
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const allPassed = Object.values(results).every(r => r === true);
  
  console.log(`InputSlot Tests:      ${results.inputSlot ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`AxisState Tests:      ${results.axisState ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`AbstractTool Tests:   ${results.abstractTool ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`Integration Tests:    ${results.integration ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`ToolSystem Tests:     ${results.toolSystem ? '✓ PASSED' : '✗ FAILED'}`);
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║              ✓ All Tool System Tests PASSED              ║');
  } else {
    console.log('║              ✗ Some Tool System Tests FAILED             ║');
  }
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  return allPassed;
}

// Run tests if executed directly
if (import.meta.url.endsWith('runAllToolTests.js')) {
  const success = runAllToolTests();
  process.exit(success ? 0 : 1);
}

