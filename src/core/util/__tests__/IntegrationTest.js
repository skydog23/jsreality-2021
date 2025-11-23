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
 * Integration test for utility classes and shader constants
 */

import { Rectangle3D } from '../Rectangle3D.js';
import { Color } from '../Color.js';
import { Font } from '../Font.js';
import * as CommonAttributes from '../../shader/CommonAttributes.js';

console.log('Integration test for new utility classes...');

// Test 1: Create a bounding box and use with shader colors
const box = new Rectangle3D(4, 4, 4);
const diffuseColor = CommonAttributes.DIFFUSE_COLOR_DEFAULT;
console.log('Box center:', box.getCenter());
console.log('Default diffuse color:', diffuseColor.toCSSString());

// Test 2: Test Rectangle3D with CommonAttributes defaults
const pointRadius = CommonAttributes.getDefault(CommonAttributes.POINT_RADIUS, 0.1);
console.log('Point radius default:', pointRadius);

// Test 3: Test Color with transparency
const transparentColor = new Color(255, 0, 0, 128);
console.log('Transparent red:', transparentColor.toCSSString());

// Test 4: Test Font creation and CSS conversion
const textFont = CommonAttributes.getDefault(CommonAttributes.FONT, null);
console.log('Text font CSS:', textFont.toCSSString());

// Test 5: Test Rectangle3D static constants
console.log('Unit cube extent:', Rectangle3D.unitCube.getExtent());
console.log('Empty box is empty:', Rectangle3D.EMPTY_BOX.isEmpty());

// Test 6: Test attribute key constants
console.log('Diffuse color key:', CommonAttributes.DIFFUSE_COLOR);
console.log('Lighting enabled key:', CommonAttributes.LIGHTING_ENABLED);
console.log('Background color key:', CommonAttributes.BACKGROUND_COLOR);

console.log('Integration test completed successfully!');
