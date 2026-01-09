/**
 * JavaScript port/translation of jReality.
 *
 * This file provides a stable import location for Decimal across the codebase.
 * We intentionally avoid hardcoded relative paths into node_modules from
 * feature modules (like geometry) because those paths are brittle.
 */

// Use the ESM build shipped by decimal.js.
export { Decimal } from '../../../node_modules/decimal.js/decimal.mjs';


