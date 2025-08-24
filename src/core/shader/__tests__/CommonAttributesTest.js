/**
 * Tests for CommonAttributes
 */

import * as CommonAttributes from '../CommonAttributes.js';
import { Color } from '../../util/Color.js';
import { Font } from '../../util/Font.js';

console.log('Testing CommonAttributes...');

// Test 1: Color constants
console.log('Background color default:', CommonAttributes.BACKGROUND_COLOR_DEFAULT.toString());
console.log('Diffuse color default:', CommonAttributes.DIFFUSE_COLOR_DEFAULT.toString());

// Test 2: Numeric constants
console.log('Point radius default:', CommonAttributes.POINT_RADIUS_DEFAULT);
console.log('Line width default:', CommonAttributes.LINE_WIDTH_DEFAULT);
console.log('Transparency default:', CommonAttributes.TRANSPARENCY_DEFAULT);

// Test 3: Boolean constants
console.log('Lighting enabled default:', CommonAttributes.LIGHTING_ENABLED_DEFAULT);
console.log('Spheres draw default:', CommonAttributes.SPHERES_DRAW_DEFAULT);

// Test 4: String constants
console.log('Diffuse color key:', CommonAttributes.DIFFUSE_COLOR);
console.log('Point shader key:', CommonAttributes.POINT_SHADER);

// Test 5: getDefault function
console.log('getDefault tests:');
console.log('  ambientColor:', CommonAttributes.getDefault('ambientColor', null).toString());
console.log('  pointSize:', CommonAttributes.getDefault('pointSize', null));
console.log('  unknown key:', CommonAttributes.getDefault('unknownKey', 'fallback'));

// Test 6: Font default
const defaultFont = CommonAttributes.getDefault(CommonAttributes.FONT, null);
console.log('Default font:', defaultFont.toString());
console.log('Font CSS string:', defaultFont.toCSSString());

// Test 7: Test with various color constants
console.log('Red color:', CommonAttributes.POINT_DIFFUSE_COLOR_DEFAULT.toCSSString());
console.log('Blue color:', CommonAttributes.DIFFUSE_COLOR_DEFAULT.toCSSString());

console.log('CommonAttributes tests completed successfully!');
